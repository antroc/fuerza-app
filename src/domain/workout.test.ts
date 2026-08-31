import { describe, expect, it } from "vitest";
import {
  addExercise,
  addSet,
  calculateWorkoutSummary,
  changeWorkoutDate,
  completeSet,
  createWorkout,
  duplicateSet,
  finalizeWorkout,
  kgToGrams,
  moveSet,
  moveExercise,
  removeExercise,
  removeSet,
  resetWorkout,
  updateSet,
} from "./workout";

const catalogExercise = {
  id: "0025",
  name: "barbell bench press",
  category: "Pecho" as const,
  equipment: "barbell",
};

describe("workout domain", () => {
  it("creates a workout for a selected date without changing its real start time", () => {
    expect(createWorkout("2026-08-26T18:30:00+02:00", "2026-08-20")).toMatchObject({
      id: "20260820",
      date: "2026-08-20",
      startedAt: "2026-08-26T18:30:00+02:00",
    });
  });

  it("changes the logical date of an active workout", () => {
    expect(
      changeWorkoutDate(createWorkout("2026-08-26T18:30:00+02:00"), "2026-08-20"),
    ).toMatchObject({
      id: "20260820",
      date: "2026-08-20",
      startedAt: "2026-08-26T18:30:00+02:00",
    });
  });

  it("resets every value in the active workout while preserving its selected date", () => {
    const workout = addExercise(
      createWorkout("2026-08-26T18:30:00+02:00", "2026-08-20"),
      catalogExercise,
    );

    expect(resetWorkout(workout, "2026-08-26T19:15:00+02:00")).toEqual({
      id: "20260820",
      date: "2026-08-20",
      startedAt: "2026-08-26T19:15:00+02:00",
      finishedAt: null,
      durationMinutes: null,
      timezone: "Europe/Madrid",
      status: "draft",
      syncStatus: "local",
      exercises: [],
      githubCommitSha: null,
      githubContentSha: null,
      updatedAt: "2026-08-26T19:15:00+02:00",
    });
  });

  it("stores decimal kilograms as exact integer grams", () => {
    expect(kgToGrams("22,5")).toBe(22_500);
    expect(kgToGrams("0")).toBe(0);
    expect(kgToGrams("")).toBeNull();
  });

  it("copies the previous values when adding a set", () => {
    let workout = createWorkout("2026-08-18T18:30:00+02:00");
    workout = addExercise(workout, catalogExercise);
    const exerciseId = workout.exercises[0].id;
    const firstSetId = workout.exercises[0].sets[0].id;
    workout = updateSet(workout, exerciseId, firstSetId, {
      weightGrams: 60_000,
      repetitions: 10,
      durationSeconds: 75,
    });
    workout = addSet(workout, exerciseId);

    expect(workout.exercises[0].sets[1]).toMatchObject({
      position: 2,
      weightGrams: 60_000,
      repetitions: 10,
      durationSeconds: 75,
      completed: false,
    });
  });

  it("starts an exercise with the last known values when provided", () => {
    const workout = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), catalogExercise, {
      weightGrams: 72_500,
      repetitions: 6,
      durationSeconds: 45,
    });

    expect(workout.exercises[0].sets[0]).toMatchObject({
      weightGrams: 72_500,
      repetitions: 6,
      durationSeconds: 45,
      completed: false,
    });
  });

  it("rejects completion until weight and repetitions or duration are valid", () => {
    const workout = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), catalogExercise);
    const exercise = workout.exercises[0];

    expect(() => completeSet(workout, exercise.id, exercise.sets[0].id)).toThrow(
      "Introduce un peso y repeticiones o duración válidos",
    );
  });

  it("completes a timed set without repetitions", () => {
    let workout = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), catalogExercise);
    const exercise = workout.exercises[0];
    workout = updateSet(workout, exercise.id, exercise.sets[0].id, {
      weightGrams: 0,
      repetitions: null,
      durationSeconds: 90,
    });

    workout = completeSet(workout, exercise.id, exercise.sets[0].id);

    expect(workout.exercises[0].sets[0]).toMatchObject({
      repetitions: null,
      durationSeconds: 90,
      completed: true,
    });
  });

  it("duplicates, moves and removes sets while renumbering positions", () => {
    let workout = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), catalogExercise);
    const exerciseId = workout.exercises[0].id;
    const firstSetId = workout.exercises[0].sets[0].id;
    workout = updateSet(workout, exerciseId, firstSetId, {
      weightGrams: 62_500,
      repetitions: 8,
      durationSeconds: 60,
    });
    workout = duplicateSet(workout, exerciseId, firstSetId);
    workout = addSet(workout, exerciseId);
    const thirdSetId = workout.exercises[0].sets[2].id;
    workout = moveSet(workout, exerciseId, thirdSetId, 1);
    workout = removeSet(workout, exerciseId, firstSetId);

    expect(workout.exercises[0].sets.map((set) => set.position)).toEqual([1, 2]);
    expect(workout.exercises[0].sets[1]).toMatchObject({
      weightGrams: 62_500,
      repetitions: 8,
      durationSeconds: 60,
    });
  });

  it("calculates exact volume from completed sets only", () => {
    let workout = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), catalogExercise);
    const exerciseId = workout.exercises[0].id;
    const firstSetId = workout.exercises[0].sets[0].id;
    workout = updateSet(workout, exerciseId, firstSetId, {
      weightGrams: 62_500,
      repetitions: 8,
    });
    workout = completeSet(workout, exerciseId, firstSetId);
    workout = duplicateSet(workout, exerciseId, firstSetId);
    workout = completeSet(workout, exerciseId, workout.exercises[0].sets[1].id);

    expect(calculateWorkoutSummary(workout)).toEqual({
      totalExercises: 1,
      totalSets: 2,
      totalVolumeGrams: 1_000_000,
      totalVolumeKg: 1000,
    });
  });

  it("finalizes using the start date and rounds duration to the nearest minute", () => {
    let workout = addExercise(createWorkout("2026-08-18T23:50:00+02:00"), catalogExercise);
    const exercise = workout.exercises[0];
    workout = updateSet(workout, exercise.id, exercise.sets[0].id, {
      weightGrams: 0,
      repetitions: 12,
    });
    workout = completeSet(workout, exercise.id, exercise.sets[0].id);
    workout = finalizeWorkout(workout, "2026-08-19T00:10:29+02:00");

    expect(workout).toMatchObject({
      id: "20260818",
      date: "2026-08-18",
      status: "finalized",
      finishedAt: "2026-08-19T00:10:29+02:00",
    });
    expect(workout.durationMinutes).toBe(20);
  });

  it("removes and reorders exercises with consecutive positions", () => {
    let workout = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), catalogExercise);
    workout = addExercise(workout, {
      id: "0412",
      name: "cable pushdown",
      category: "Brazos",
      equipment: "cable",
    });
    workout = addExercise(workout, {
      id: "0100",
      name: "lat pulldown",
      category: "Espalda",
      equipment: "cable",
    });
    const lastId = workout.exercises[2].id;
    workout = moveExercise(workout, lastId, 1);
    workout = removeExercise(workout, workout.exercises[2].id);

    expect(workout.exercises.map((exercise) => [exercise.position, exercise.nameSnapshot])).toEqual(
      [
        [1, "lat pulldown"],
        [2, "barbell bench press"],
      ],
    );
  });
});
