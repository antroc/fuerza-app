import { describe, expect, it } from "vitest";
import type { Workout } from "../domain/types";
import { parseWorkoutMarkdown, renderWorkoutMarkdown } from "./markdown";

const workout: Workout = {
  id: "20260818",
  date: "2026-08-18",
  startedAt: "2026-08-18T18:30:00+02:00",
  finishedAt: "2026-08-18T19:35:00+02:00",
  durationMinutes: 65,
  timezone: "Europe/Madrid",
  status: "finalized",
  syncStatus: "pending",
  githubCommitSha: null,
  githubContentSha: null,
  updatedAt: "2026-08-18T19:35:00+02:00",
  exercises: [
    {
      id: "performed-1",
      catalogExerciseId: "0025",
      nameSnapshot: "barbell bench press",
      categorySnapshot: "Pecho",
      equipmentSnapshot: "barbell",
      position: 1,
      sets: [
        { id: "s1", position: 1, weightGrams: 60_000, repetitions: 10, completed: true },
        { id: "s2", position: 2, weightGrams: 62_500, repetitions: 8, completed: true },
        { id: "s3", position: 3, weightGrams: 65_000, repetitions: null, completed: false },
      ],
    },
    {
      id: "performed-2",
      catalogExerciseId: "0412",
      nameSnapshot: "cable pushdown",
      categorySnapshot: "Brazos",
      equipmentSnapshot: "cable",
      position: 2,
      sets: [{ id: "s4", position: 1, weightGrams: 25_000, repetitions: 12, completed: true }],
    },
  ],
};

describe("Markdown v1", () => {
  it("renders stable front matter, exact totals and only completed sets", () => {
    const markdown = renderWorkoutMarkdown(workout);

    expect(markdown).toContain("schema_version: 1\ntype: strength_workout");
    expect(markdown).toContain("duration_minutes: 65");
    expect(markdown).toContain("total_exercises: 2");
    expect(markdown).toContain("total_sets: 3");
    expect(markdown).toContain("total_volume_kg: 1400");
    expect(markdown).toContain("| 2 | 62.5 | 8 |");
    expect(markdown).not.toContain("| 3 | 65");
    expect(markdown.match(/schema_version:/g)).toHaveLength(1);
  });

  it("round trips generated content into a finalized local workout", () => {
    const result = parseWorkoutMarkdown(renderWorkoutMarkdown(workout), "content-sha");

    expect(result.kind).toBe("imported");
    if (result.kind !== "imported") return;
    expect(result.workout).toMatchObject({
      id: "20260818",
      status: "finalized",
      syncStatus: "synced",
      githubContentSha: "content-sha",
      durationMinutes: 65,
    });
    expect(result.workout.exercises[0].sets[1]).toMatchObject({
      position: 2,
      weightGrams: 62_500,
      repetitions: 8,
      completed: true,
    });
  });

  it("reports unknown schema versions without modifying content", () => {
    const source = renderWorkoutMarkdown(workout).replace("schema_version: 1", "schema_version: 2");

    expect(parseWorkoutMarkdown(source, "sha-2")).toEqual({
      kind: "incompatible",
      schemaVersion: 2,
      source,
    });
  });

  it("reports malformed documents instead of importing partial history", () => {
    expect(parseWorkoutMarkdown("---\nschema_version: 1\n---\n# roto", "sha")).toMatchObject({
      kind: "invalid",
      source: "---\nschema_version: 1\n---\n# roto",
    });
  });
});
