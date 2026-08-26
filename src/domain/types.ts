export type ExerciseCategory = "Pecho" | "Espalda" | "Hombros" | "Brazos" | "Piernas" | "Core";

export interface CatalogExerciseSnapshot {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: string;
}

export interface WorkoutSet {
  id: string;
  position: number;
  weightGrams: number | null;
  repetitions: number | null;
  completed: boolean;
}

export interface PerformedExercise {
  id: string;
  catalogExerciseId: string;
  nameSnapshot: string;
  categorySnapshot: ExerciseCategory;
  equipmentSnapshot: string;
  position: number;
  sets: WorkoutSet[];
}

export type WorkoutStatus = "draft" | "finalized";
export type SyncStatus = "local" | "pending" | "syncing" | "synced" | "conflict" | "error";

export interface Workout {
  id: string;
  date: string;
  startedAt: string;
  finishedAt: string | null;
  durationMinutes: number | null;
  timezone: "Europe/Madrid";
  status: WorkoutStatus;
  syncStatus: SyncStatus;
  exercises: PerformedExercise[];
  githubCommitSha: string | null;
  githubContentSha: string | null;
  updatedAt: string;
}

export interface WorkoutSummary {
  totalExercises: number;
  totalSets: number;
  totalVolumeGrams: number;
  totalVolumeKg: number;
}
