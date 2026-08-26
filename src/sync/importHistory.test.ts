import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWorkout } from "../domain/workout";
import { renderWorkoutMarkdown } from "../export/markdown";
import { FuerzaDatabase } from "../storage/db";
import type { GitHubContent, PutContentResult } from "./types";
import { importRemoteHistory, type HistoryImportPort } from "./importHistory";

let db: FuerzaDatabase;

const finalized = {
  ...createWorkout("2026-08-18T18:30:00+02:00"),
  status: "finalized" as const,
  syncStatus: "synced" as const,
  finishedAt: "2026-08-18T19:00:00+02:00",
  durationMinutes: 30,
  exercises: [
    {
      id: "exercise",
      catalogExerciseId: "0025",
      nameSnapshot: "barbell bench press",
      categorySnapshot: "Pecho" as const,
      equipmentSnapshot: "barbell",
      position: 1,
      sets: [{ id: "set", position: 1, weightGrams: 60_000, repetitions: 10, completed: true }],
    },
  ],
};

class FakeImportClient implements HistoryImportPort {
  content = renderWorkoutMarkdown(finalized);
  async listDirectory() {
    return [
      {
        name: "Fuerza_20260818.md",
        path: "entrenamientos/Fuerza_20260818.md",
        sha: "sha-1",
        type: "file",
      },
    ];
  }
  async getContent(): Promise<GitHubContent | null> {
    return { sha: "sha-1", path: "entrenamientos/Fuerza_20260818.md", content: this.content };
  }
  async putContent(): Promise<PutContentResult> {
    throw new Error("unused");
  }
}

beforeEach(() => {
  db = new FuerzaDatabase(`import-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("importRemoteHistory", () => {
  it("imports valid remote Markdown into local history", async () => {
    const result = await importRemoteHistory(
      new FakeImportClient(),
      { owner: "antroc", repository: "fuerza-data", branch: "main" },
      db,
    );

    expect(result).toEqual({ imported: 1, skipped: 0, conflicts: [], invalid: [] });
    expect(await db.workouts.get("20260818")).toMatchObject({
      status: "finalized",
      githubContentSha: "sha-1",
    });
  });

  it("preserves a local draft and reports a date conflict", async () => {
    await db.workouts.put(createWorkout("2026-08-18T08:00:00+02:00"));

    const result = await importRemoteHistory(
      new FakeImportClient(),
      { owner: "antroc", repository: "fuerza-data", branch: "main" },
      db,
    );

    expect(result.conflicts).toEqual(["Fuerza_20260818.md"]);
    expect((await db.workouts.get("20260818"))?.status).toBe("draft");
  });

  it("reports invalid remote documents without modifying them", async () => {
    const client = new FakeImportClient();
    client.content = "---\nschema_version: 1\n---\n# roto";

    const result = await importRemoteHistory(
      client,
      { owner: "antroc", repository: "fuerza-data", branch: "main" },
      db,
    );

    expect(result.invalid).toEqual(["Fuerza_20260818.md"]);
    expect(await db.workouts.count()).toBe(0);
  });
});
