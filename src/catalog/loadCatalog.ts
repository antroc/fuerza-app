import type { CatalogExercise } from "./types";
import { manualExercises } from "./manualExercises";

type CatalogModule = { default: { exercises: CatalogExercise[] } };
type CatalogImporter = () => Promise<CatalogModule>;

export const createCatalogLoader = (
  importer: CatalogImporter,
  additionalExercises: CatalogExercise[] = [],
) => {
  let pending: Promise<CatalogExercise[]> | undefined;
  return () => {
    pending ??= importer().then((module) => {
      const additionalIds = new Set(additionalExercises.map((exercise) => exercise.id));
      return [
        ...additionalExercises,
        ...module.default.exercises.filter((exercise) => !additionalIds.has(exercise.id)),
      ];
    });
    return pending;
  };
};

export const loadCatalog = createCatalogLoader(
  () => import("./exercises.json").then((module) => module as unknown as CatalogModule),
  manualExercises,
);
