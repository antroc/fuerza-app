import type { FuerzaDatabase, SyncQueueItem } from "../storage/db";
import { GitHubApiError } from "./githubClient";
import type { GitHubPort, ProcessResult, SyncTarget } from "./types";

export class SyncEngine {
  private cancelled = false;

  constructor(
    private readonly database: FuerzaDatabase,
    private readonly client: GitHubPort,
    private readonly target: SyncTarget,
  ) {}

  cancel(): void {
    this.cancelled = true;
  }

  private async nextItem(): Promise<SyncQueueItem | undefined> {
    const items = await this.database.syncQueue
      .filter((item) => item.status === "pending" || item.status === "error")
      .sortBy("createdAt");
    const now = Date.now();
    return items.find((item) => !item.retryAt || Date.parse(item.retryAt) <= now);
  }

  async processNext(): Promise<ProcessResult> {
    if (this.cancelled) return "idle";
    const item = await this.nextItem();
    if (!item?.queueId) return "idle";
    await this.database.syncQueue.update(item.queueId, {
      status: "syncing",
      errorMessage: null,
    });
    await this.database.workouts.update(item.workoutId, { syncStatus: "syncing" });
    try {
      const remote = await this.client.getContent(
        this.target.owner,
        this.target.repository,
        item.path,
        this.target.branch,
      );
      if (remote && remote.content !== item.content) {
        await this.database.syncQueue.update(item.queueId, {
          status: "conflict",
          errorMessage: "El documento de GitHub contiene datos diferentes",
        });
        await this.database.workouts.update(item.workoutId, {
          syncStatus: "conflict",
          githubContentSha: remote.sha,
        });
        return "conflict";
      }
      const result = remote
        ? { contentSha: remote.sha, commitSha: null }
        : await this.client.putContent(
            this.target.owner,
            this.target.repository,
            item.path,
            this.target.branch,
            item.content,
            `data: add Fuerza_${item.workoutId}.md`,
          );
      await this.database.transaction(
        "rw",
        [this.database.workouts, this.database.syncQueue],
        async () => {
          await this.database.workouts.update(item.workoutId, {
            syncStatus: "synced",
            githubContentSha: result.contentSha,
            ...(result.commitSha ? { githubCommitSha: result.commitSha } : {}),
          });
          await this.database.syncQueue.delete(item.queueId!);
        },
      );
      return "synced";
    } catch (error) {
      const authError =
        error instanceof GitHubApiError && [401, 403].includes(error.status) && !error.retryAt;
      const retryAt = error instanceof GitHubApiError ? error.retryAt : null;
      await this.database.syncQueue.update(item.queueId, {
        status: "error",
        retryAt: retryAt?.toISOString() ?? null,
        errorMessage: error instanceof Error ? error.message : "Error de sincronización",
      });
      await this.database.workouts.update(item.workoutId, { syncStatus: "error" });
      if (authError) return "auth-error";
      if (retryAt) return "retry-later";
      return "error";
    }
  }

  async syncNow(): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];
    while (!this.cancelled) {
      const result = await this.processNext();
      if (result === "idle") break;
      results.push(result);
      if (["conflict", "auth-error", "retry-later", "error"].includes(result)) break;
    }
    return results;
  }
}
