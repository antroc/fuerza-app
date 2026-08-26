import type { Workout, WorkoutSet } from "./types";

export const findLastValues = (
  workouts: Workout[],
  catalogExerciseId: string,
): Pick<WorkoutSet, "weightGrams" | "repetitions"> | undefined => {
  const ordered = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  for (const workout of ordered) {
    const exercise = workout.exercises.find((item) => item.catalogExerciseId === catalogExerciseId);
    const set = exercise?.sets.filter((item) => item.completed).at(-1);
    if (set) return { weightGrams: set.weightGrams, repetitions: set.repetitions };
  }
  return undefined;
};
