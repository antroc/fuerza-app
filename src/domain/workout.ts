import type {
  CatalogExerciseSnapshot,
  PerformedExercise,
  Workout,
  WorkoutSet,
  WorkoutSummary,
} from "./types";

const uuid = () => crypto.randomUUID();

const touch = (workout: Workout): Workout => ({
  ...workout,
  updatedAt: new Date().toISOString(),
});

const renumberSets = (sets: WorkoutSet[]): WorkoutSet[] =>
  sets.map((set, index) => ({ ...set, position: index + 1 }));

const renumberExercises = (exercises: PerformedExercise[]): PerformedExercise[] =>
  exercises.map((exercise, index) => ({ ...exercise, position: index + 1 }));

const replaceExercise = (
  workout: Workout,
  exerciseId: string,
  change: (exercise: PerformedExercise) => PerformedExercise,
): Workout => {
  let found = false;
  const exercises = workout.exercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;
    found = true;
    return change(exercise);
  });
  if (!found) throw new Error("Ejercicio no encontrado");
  return touch({ ...workout, exercises });
};

export const kgToGrams = (value: string): number | null => {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  if (!/^\d+(?:\.\d{0,3})?$/.test(normalized)) {
    throw new Error("Introduce un peso válido");
  }
  const grams = Math.round(Number(normalized) * 1000);
  if (!Number.isSafeInteger(grams) || grams < 0) {
    throw new Error("Introduce un peso válido");
  }
  return grams;
};

export const createWorkout = (startedAt: string): Workout => {
  const date = startedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(startedAt))) {
    throw new Error("Fecha de inicio no válida");
  }
  return {
    id: date.replaceAll("-", ""),
    date,
    startedAt,
    finishedAt: null,
    durationMinutes: null,
    timezone: "Europe/Madrid",
    status: "draft",
    syncStatus: "local",
    exercises: [],
    githubCommitSha: null,
    githubContentSha: null,
    updatedAt: startedAt,
  };
};

const emptySet = (
  position: number,
  previous?: Pick<WorkoutSet, "weightGrams" | "repetitions">,
): WorkoutSet => ({
  id: uuid(),
  position,
  weightGrams: previous?.weightGrams ?? null,
  repetitions: previous?.repetitions ?? null,
  completed: false,
});

export const addExercise = (
  workout: Workout,
  catalog: CatalogExerciseSnapshot,
  lastValues?: Pick<WorkoutSet, "weightGrams" | "repetitions">,
): Workout => {
  if (workout.status !== "draft") throw new Error("La sesión ya está finalizada");
  const exercise: PerformedExercise = {
    id: uuid(),
    catalogExerciseId: catalog.id,
    nameSnapshot: catalog.name,
    categorySnapshot: catalog.category,
    equipmentSnapshot: catalog.equipment,
    position: workout.exercises.length + 1,
    sets: [emptySet(1, lastValues)],
  };
  return touch({ ...workout, exercises: [...workout.exercises, exercise] });
};

export const removeExercise = (workout: Workout, exerciseId: string): Workout =>
  touch({
    ...workout,
    exercises: renumberExercises(
      workout.exercises.filter((exercise) => exercise.id !== exerciseId),
    ),
  });

export const moveExercise = (workout: Workout, exerciseId: string, position: number): Workout => {
  const exercises = [...workout.exercises];
  const from = exercises.findIndex((exercise) => exercise.id === exerciseId);
  if (from < 0) throw new Error("Ejercicio no encontrado");
  const [exercise] = exercises.splice(from, 1);
  const target = Math.max(0, Math.min(position - 1, exercises.length));
  exercises.splice(target, 0, exercise);
  return touch({ ...workout, exercises: renumberExercises(exercises) });
};

export const addSet = (workout: Workout, exerciseId: string): Workout =>
  replaceExercise(workout, exerciseId, (exercise) => ({
    ...exercise,
    sets: [...exercise.sets, emptySet(exercise.sets.length + 1, exercise.sets.at(-1))],
  }));

export const updateSet = (
  workout: Workout,
  exerciseId: string,
  setId: string,
  patch: Pick<WorkoutSet, "weightGrams" | "repetitions">,
): Workout => {
  if (
    patch.weightGrams !== null &&
    (!Number.isInteger(patch.weightGrams) || patch.weightGrams < 0)
  ) {
    throw new Error("Introduce un peso válido");
  }
  if (
    patch.repetitions !== null &&
    (!Number.isInteger(patch.repetitions) || patch.repetitions <= 0)
  ) {
    throw new Error("Introduce repeticiones válidas");
  }
  return replaceExercise(workout, exerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) =>
      set.id === setId
        ? {
            ...set,
            ...patch,
            completed: set.completed && patch.weightGrams !== null && patch.repetitions !== null,
          }
        : set,
    ),
  }));
};

export const completeSet = (workout: Workout, exerciseId: string, setId: string): Workout =>
  replaceExercise(workout, exerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => {
      if (set.id !== setId) return set;
      if (
        set.weightGrams === null ||
        set.weightGrams < 0 ||
        set.repetitions === null ||
        set.repetitions <= 0
      ) {
        throw new Error("Introduce un peso y repeticiones válidos");
      }
      return { ...set, completed: true };
    }),
  }));

export const uncompleteSet = (workout: Workout, exerciseId: string, setId: string): Workout =>
  replaceExercise(workout, exerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => (set.id === setId ? { ...set, completed: false } : set)),
  }));

export const duplicateSet = (workout: Workout, exerciseId: string, setId: string): Workout =>
  replaceExercise(workout, exerciseId, (exercise) => {
    const index = exercise.sets.findIndex((set) => set.id === setId);
    if (index < 0) throw new Error("Serie no encontrada");
    const source = exercise.sets[index];
    const copy = { ...source, id: uuid(), completed: false };
    const sets = [...exercise.sets];
    sets.splice(index + 1, 0, copy);
    return { ...exercise, sets: renumberSets(sets) };
  });

export const removeSet = (workout: Workout, exerciseId: string, setId: string): Workout =>
  replaceExercise(workout, exerciseId, (exercise) => ({
    ...exercise,
    sets: renumberSets(exercise.sets.filter((set) => set.id !== setId)),
  }));

export const moveSet = (
  workout: Workout,
  exerciseId: string,
  setId: string,
  position: number,
): Workout =>
  replaceExercise(workout, exerciseId, (exercise) => {
    const sets = [...exercise.sets];
    const from = sets.findIndex((set) => set.id === setId);
    if (from < 0) throw new Error("Serie no encontrada");
    const [set] = sets.splice(from, 1);
    const target = Math.max(0, Math.min(position - 1, sets.length));
    sets.splice(target, 0, set);
    return { ...exercise, sets: renumberSets(sets) };
  });

export const calculateWorkoutSummary = (workout: Workout): WorkoutSummary => {
  const completedExercises = workout.exercises
    .map((exercise) => ({
      ...exercise,
      sets: exercise.sets.filter((set) => set.completed),
    }))
    .filter((exercise) => exercise.sets.length > 0);
  const totalVolumeGrams = completedExercises.reduce(
    (workoutTotal, exercise) =>
      workoutTotal +
      exercise.sets.reduce(
        (exerciseTotal, set) => exerciseTotal + (set.weightGrams ?? 0) * (set.repetitions ?? 0),
        0,
      ),
    0,
  );
  return {
    totalExercises: completedExercises.length,
    totalSets: completedExercises.reduce((total, exercise) => total + exercise.sets.length, 0),
    totalVolumeGrams,
    totalVolumeKg: totalVolumeGrams / 1000,
  };
};

export const finalizeWorkout = (workout: Workout, finishedAt: string): Workout => {
  if (workout.status !== "draft") throw new Error("La sesión ya está finalizada");
  if (calculateWorkoutSummary(workout).totalSets === 0) {
    throw new Error("Completa al menos una serie válida");
  }
  const durationMinutes = Math.round(
    (Date.parse(finishedAt) - Date.parse(workout.startedAt)) / 60_000,
  );
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new Error("Hora de finalización no válida");
  }
  return {
    ...workout,
    finishedAt,
    durationMinutes,
    status: "finalized",
    syncStatus: "pending",
    updatedAt: finishedAt,
  };
};
