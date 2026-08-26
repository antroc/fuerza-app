import { parseWorkoutMarkdown } from "../export/markdown";
import type { FuerzaDatabase, SyncQueueItem } from "../storage/db";
import type { GitHubPort, SyncTarget } from "./types";

const conflictItem = async (
  database: FuerzaDatabase,
  workoutId: string,
): Promise<SyncQueueItem> => {
  const item = await database.syncQueue
    .filter((candidate) => candidate.workoutId === workoutId && candidate.status === "conflict")
    .first();
  if (!item?.queueId) throw new Error("No se encontró el conflicto pendiente");
  return item;
};

export const readConflict = async (
  database: FuerzaDatabase,
  client: GitHubPort,
  target: SyncTarget,
  workoutId: string,
) => {
  const item = await conflictItem(database, workoutId);
  const remote = await client.getContent(target.owner, target.repository, item.path, target.branch);
  if (!remote) throw new Error("La versión de GitHub ya no existe");
  return { item, localContent: item.content, remote };
};

export const keepGitHubVersion = async (
  database: FuerzaDatabase,
  client: GitHubPort,
  target: SyncTarget,
  workoutId: string,
): Promise<void> => {
  const { item, remote } = await readConflict(database, client, target, workoutId);
  const parsed = parseWorkoutMarkdown(remote.content, remote.sha);
  if (parsed.kind !== "imported") {
    throw new Error("La versión de GitHub no contiene un entrenamiento válido");
  }
  await database.transaction("rw", [database.workouts, database.syncQueue], async () => {
    await database.workouts.put(parsed.workout);
    await database.syncQueue.delete(item.queueId!);
  });
};

export const replaceWithLocalVersion = async (
  database: FuerzaDatabase,
  client: GitHubPort,
  target: SyncTarget,
  workoutId: string,
): Promise<void> => {
  const { item, remote } = await readConflict(database, client, target, workoutId);
  const result = await client.putContent(
    target.owner,
    target.repository,
    item.path,
    target.branch,
    item.content,
    `data: resolve Fuerza_${workoutId} with local version`,
    remote.sha,
  );
  await database.transaction("rw", [database.workouts, database.syncQueue], async () => {
    await database.workouts.update(workoutId, {
      syncStatus: "synced",
      githubContentSha: result.contentSha,
      githubCommitSha: result.commitSha,
    });
    await database.syncQueue.delete(item.queueId!);
  });
};
