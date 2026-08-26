import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addExercise, completeSet, createWorkout, updateSet } from "../domain/workout";
import { FuerzaDatabase } from "../storage/db";
import { DexieWorkoutRepository } from "../storage/workoutRepository";
import { SyncEngine } from "./syncEngine";
import type { GitHubContent, GitHubPort, PutContentResult } from "./types";

let db: FuerzaDatabase;

const queuedWorkout = async () => {
  const repository = new DexieWorkoutRepository(db);
  let workout = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), {
    id: "0025",
    name: "barbell bench press",
    category: "Pecho",
    equipment: "barbell",
  });
  const exercise = workout.exercises[0];
  workout = updateSet(workout, exercise.id, exercise.sets[0].id, {
    weightGrams: 60_000,
    repetitions: 10,
  });
  workout = completeSet(workout, exercise.id, exercise.sets[0].id);
  await repository.saveDraft(workout);
  await repository.finalizeAndEnqueue(workout.id, "2026-08-18T19:30:00+02:00");
};

class FakeGitHub implements GitHubPort {
  remote: GitHubContent | null = null;
  putResult: PutContentResult = { contentSha: "content-new", commitSha: "commit-new" };
  async getContent(): Promise<GitHubContent | null> {
    return this.remote;
  }
  async putContent(): Promise<PutContentResult> {
    return this.putResult;
  }
}

beforeEach(async () => {
  db = new FuerzaDatabase(`sync-test-${crypto.randomUUID()}`);
  await queuedWorkout();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("SyncEngine", () => {
  it("creates a missing workout and clears the queue", async () => {
    const client = new FakeGitHub();
    const engine = new SyncEngine(db, client, {
      owner: "antroc",
      repository: "fuerza-data",
      branch: "main",
    });

    expect(await engine.processNext()).toBe("synced");
    expect(await db.syncQueue.count()).toBe(0);
    expect(await db.workouts.get("20260818")).toMatchObject({
      syncStatus: "synced",
      githubCommitSha: "commit-new",
      githubContentSha: "content-new",
    });
  });

  it("accepts identical remote content without writing", async () => {
    const client = new FakeGitHub();
    const queue = await db.syncQueue.toCollection().first();
    client.remote = { sha: "remote-sha", content: queue!.content, path: queue!.path };
    client.putContent = async () => {
      throw new Error("No debe escribir");
    };
    const engine = new SyncEngine(db, client, {
      owner: "antroc",
      repository: "fuerza-data",
      branch: "main",
    });

    expect(await engine.processNext()).toBe("synced");
    expect(await db.workouts.get("20260818")).toMatchObject({
      syncStatus: "synced",
      githubContentSha: "remote-sha",
    });
  });

  it("preserves both versions when remote content differs", async () => {
    const client = new FakeGitHub();
    client.remote = {
      sha: "remote-sha",
      content: "contenido diferente",
      path: "entrenamientos/Fuerza_20260818.md",
    };
    const engine = new SyncEngine(db, client, {
      owner: "antroc",
      repository: "fuerza-data",
      branch: "main",
    });

    expect(await engine.processNext()).toBe("conflict");
    expect(await db.syncQueue.toCollection().first()).toMatchObject({ status: "conflict" });
    expect(await db.workouts.get("20260818")).toMatchObject({ syncStatus: "conflict" });
  });
});
