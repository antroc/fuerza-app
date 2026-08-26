import type { FuerzaDatabase } from "../storage/db";
import { parseWorkoutMarkdown } from "../export/markdown";
import type { GitHubContent, SyncTarget } from "./types";

export interface HistoryImportPort {
  listDirectory(
    owner: string,
    repository: string,
    path: string,
    branch: string,
  ): Promise<Array<{ name: string; path: string; sha: string; type: string }>>;
  getContent(
    owner: string,
    repository: string,
    path: string,
    branch: string,
  ): Promise<GitHubContent | null>;
}

export interface HistoryImportResult {
  imported: number;
  skipped: number;
  conflicts: string[];
  invalid: string[];
}

export const importRemoteHistory = async (
  client: HistoryImportPort,
  target: SyncTarget,
  database: FuerzaDatabase,
): Promise<HistoryImportResult> => {
  const result: HistoryImportResult = {
    imported: 0,
    skipped: 0,
    conflicts: [],
    invalid: [],
  };
  const entries = await client.listDirectory(
    target.owner,
    target.repository,
    "entrenamientos",
    target.branch,
  );
  const files = entries.filter(
    (entry) => entry.type === "file" && /^Fuerza_\d{8}\.md$/.test(entry.name),
  );
  for (const entry of files) {
    const id = entry.name.slice(7, 15);
    const local = await database.workouts.get(id);
    if (local?.githubContentSha === entry.sha) {
      result.skipped += 1;
      continue;
    }
    if (
      local?.status === "draft" ||
      (local && ["local", "pending", "syncing"].includes(local.syncStatus))
    ) {
      result.conflicts.push(entry.name);
      continue;
    }
    const remote = await client.getContent(
      target.owner,
      target.repository,
      entry.path,
      target.branch,
    );
    if (!remote) {
      result.skipped += 1;
      continue;
    }
    const parsed = parseWorkoutMarkdown(remote.content, remote.sha);
    if (parsed.kind !== "imported") {
      result.invalid.push(entry.name);
      continue;
    }
    await database.workouts.put(parsed.workout);
    result.imported += 1;
  }
  return result;
};
