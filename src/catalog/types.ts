import type { ExerciseCategory } from "../domain/types";

export interface CatalogExercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: string;
  target: string;
  imageUrl: string;
  gifUrl: string;
  attribution: string;
}

export interface CatalogFilter {
  query: string;
  category: ExerciseCategory | null;
  favorites: Set<string>;
  limit: number;
}
