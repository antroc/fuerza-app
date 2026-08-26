import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addExercise, completeSet, createWorkout, updateSet } from "../domain/workout";
import { FuerzaDatabase } from "./db";
import { DexieWorkoutRepository } from "./workoutRepository";

let db: FuerzaDatabase;
let repository: DexieWorkoutRepository;

const validDraft = (startedAt = "2026-08-18T18:30:00+02:00") => {
  let workout = addExercise(createWorkout(startedAt), {
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
  return completeSet(workout, exercise.id, exercise.sets[0].id);
};

beforeEach(() => {
  db = new FuerzaDatabase(`fuerza-test-${crypto.randomUUID()}`);
  repository = new DexieWorkoutRepository(db);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("DexieWorkoutRepository", () => {
  it("autosaves and recovers the only active draft", async () => {
    const draft = validDraft();
    await repository.saveDraft(draft);

    expect(await repository.getActive()).toEqual(draft);
  });

  it("rejects a second active draft on the same device", async () => {
    await repository.saveDraft(validDraft());

    await expect(repository.saveDraft(validDraft("2026-08-19T18:30:00+02:00"))).rejects.toThrow(
      "Ya existe un entrenamiento activo",
    );
  });

  it("finalizes the workout and enqueues its Markdown atomically", async () => {
    const draft = validDraft();
    await repository.saveDraft(draft);

    const finalized = await repository.finalizeAndEnqueue(draft.id, "2026-08-18T19:30:00+02:00");
    const queue = await db.syncQueue.toArray();

    expect(finalized.status).toBe("finalized");
    expect(await repository.getActive()).toBeUndefined();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      operationKey: "create-workout:20260818",
      status: "pending",
      workoutId: "20260818",
      path: "entrenamientos/Fuerza_20260818.md",
    });
    expect(queue[0].content).toContain("schema_version: 1");
  });

  it("does not duplicate an idempotent queue operation", async () => {
    const draft = validDraft();
    await repository.saveDraft(draft);
    await repository.finalizeAndEnqueue(draft.id, "2026-08-18T19:30:00+02:00");
    await repository.finalizeAndEnqueue(draft.id, "2026-08-18T19:30:00+02:00");

    expect(await db.syncQueue.count()).toBe(1);
  });

  it("lists finalized workouts newest first", async () => {
    const older = {
      ...validDraft(),
      status: "finalized" as const,
      finishedAt: "2026-08-18T19:00:00+02:00",
    };
    const newer = {
      ...validDraft("2026-08-19T18:00:00+02:00"),
      status: "finalized" as const,
      finishedAt: "2026-08-19T19:00:00+02:00",
    };
    await db.workouts.bulkPut([older, newer]);

    expect((await repository.listFinalized()).map((item) => item.id)).toEqual([
      "20260819",
      "20260818",
    ]);
  });
});
