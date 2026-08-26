import { describe, expect, it } from "vitest";
import type { Workout } from "./types";
import { findLastValues } from "./lastValues";

const workout = (date: string, weightGrams: number, repetitions: number): Workout => ({
  id: date.replaceAll("-", ""),
  date,
  startedAt: `${date}T18:00:00+02:00`,
  finishedAt: `${date}T19:00:00+02:00`,
  durationMinutes: 60,
  timezone: "Europe/Madrid",
  status: "finalized",
  syncStatus: "synced",
  githubCommitSha: null,
  githubContentSha: null,
  updatedAt: `${date}T19:00:00+02:00`,
  exercises: [
    {
      id: crypto.randomUUID(),
      catalogExerciseId: "0025",
      nameSnapshot: "press",
      categorySnapshot: "Pecho",
      equipmentSnapshot: "barbell",
      position: 1,
      sets: [{ id: crypto.randomUUID(), position: 1, weightGrams, repetitions, completed: true }],
    },
  ],
});

describe("findLastValues", () => {
  it("uses the final completed set from the most recent workout", () => {
    expect(
      findLastValues([workout("2026-08-17", 60_000, 10), workout("2026-08-18", 65_000, 8)], "0025"),
    ).toEqual({ weightGrams: 65_000, repetitions: 8 });
  });
});
