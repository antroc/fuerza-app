import type { CatalogExercise, CatalogFilter } from "./types";

export const normalizeSearchText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();

export const filterExercises = (
  exercises: CatalogExercise[],
  filter: CatalogFilter,
): CatalogExercise[] => {
  const query = normalizeSearchText(filter.query);
  return exercises
    .filter(
      (exercise) =>
        (!filter.category || exercise.category === filter.category) &&
        (!query || normalizeSearchText(exercise.name).includes(query)),
    )
    .sort((a, b) => Number(filter.favorites.has(b.id)) - Number(filter.favorites.has(a.id)))
    .slice(0, Math.max(0, filter.limit));
};
