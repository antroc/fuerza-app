import { describe, expect, it, vi } from "vitest";
import { createCatalogLoader } from "./loadCatalog";
import type { CatalogExercise } from "./types";

describe("createCatalogLoader", () => {
  it("carga el catálogo una sola vez y reutiliza el resultado", async () => {
    const exercises = [{ id: "sentadilla" }];
    const importer = vi.fn().mockResolvedValue({ default: { exercises } });
    const loadCatalog = createCatalogLoader(importer);

    await expect(Promise.all([loadCatalog(), loadCatalog()])).resolves.toEqual([
      exercises,
      exercises,
    ]);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("combina ejercicios manuales sin duplicar identificadores", async () => {
    const generated = [{ id: "generated" }, { id: "shared" }];
    const manual = [{ id: "manual" }, { id: "shared" }];
    const importer = vi.fn().mockResolvedValue({ default: { exercises: generated } });
    const loadCatalog = createCatalogLoader(importer, manual as unknown as CatalogExercise[]);

    await expect(loadCatalog()).resolves.toEqual([
      { id: "manual" },
      { id: "shared" },
      { id: "generated" },
    ]);
  });
});
