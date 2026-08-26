import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addExercise, completeSet, createWorkout, updateSet } from "../domain/workout";
import { renderWorkoutMarkdown } from "../export/markdown";
import { FuerzaDatabase } from "../storage/db";
import { keepGitHubVersion, replaceWithLocalVersion } from "./conflictResolution";
import type { GitHubContent, GitHubPort, PutContentResult, SyncTarget } from "./types";

let db: FuerzaDatabase;
const target: SyncTarget = { owner: "antroc", repository: "fuerza-data", branch: "main" };

const finalizedWorkout = (weightGrams: number) => {
  let workout = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), {
    id: "0025",
    name: "barbell bench press",
    category: "Pecho",
    equipment: "barbell",
  });
  const exercise = workout.exercises[0];
  workout = updateSet(workout, exercise.id, exercise.sets[0].id, { weightGrams, repetitions: 10 });
  workout = completeSet(workout, exercise.id, exercise.sets[0].id);
  return {
    ...workout,
    status: "finalized" as const,
    syncStatus: "conflict" as const,
    finishedAt: "2026-08-18T19:30:00+02:00",
    durationMinutes: 60,
  };
};

class FakeGitHub implements GitHubPort {
  currentSha: string | undefined;
  remote: GitHubContent = {
    sha: "remote-sha",
    path: "entrenamientos/Fuerza_20260818.md",
    content: renderWorkoutMarkdown(finalizedWorkout(70_000)),
  };
  async getContent() {
    return this.remote;
  }
  async putContent(
    _o: string,
    _r: string,
    _p: string,
    _b: string,
    _c: string,
    _m: string,
    sha?: string,
  ): Promise<PutContentResult> {
    this.currentSha = sha;
    return { contentSha: "new-sha", commitSha: "commit-sha" };
  }
}

beforeEach(async () => {
  db = new FuerzaDatabase(`conflict-${crypto.randomUUID()}`);
  const local = finalizedWorkout(60_000);
  await db.workouts.put(local);
  await db.syncQueue.add({
    operationKey: "create-workout:20260818",
    status: "conflict",
    workoutId: local.id,
    path: "entrenamientos/Fuerza_20260818.md",
    content: renderWorkoutMarkdown(local),
    createdAt: local.finishedAt!,
    retryAt: null,
    errorMessage: "Conflicto",
  });
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("conflict resolution", () => {
  it("keeps the valid GitHub document without writing it", async () => {
    const client = new FakeGitHub();
    await keepGitHubVersion(db, client, target, "20260818");
    expect((await db.workouts.get("20260818"))?.exercises[0].sets[0].weightGrams).toBe(70_000);
    expect(await db.syncQueue.count()).toBe(0);
  });

  it("replaces GitHub only with its current SHA and records the new commit", async () => {
    const client = new FakeGitHub();
    await replaceWithLocalVersion(db, client, target, "20260818");
    expect(client.currentSha).toBe("remote-sha");
    expect(await db.workouts.get("20260818")).toMatchObject({
      syncStatus: "synced",
      githubCommitSha: "commit-sha",
      githubContentSha: "new-sha",
    });
    expect(await db.syncQueue.count()).toBe(0);
  });
});
