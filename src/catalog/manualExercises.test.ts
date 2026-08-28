import { describe, expect, it } from "vitest";
import { filterExercises } from "./search";
import { manualExercises } from "./manualExercises";

describe("manual exercise catalog", () => {
  it("includes a searchable standard plank in Core", () => {
    expect(
      filterExercises(manualExercises, {
        query: "plank",
        category: "Core",
        favorites: new Set(),
        limit: 10,
      }),
    ).toEqual([
      expect.objectContaining({
        id: "manual-standard-plank",
        name: "plank",
        category: "Core",
        equipment: "body weight",
        imageUrl: "/fuerza-app/exercises/plank.png",
      }),
    ]);
  });

  it("includes the searchable bilateral lever horizontal leg press in Legs", () => {
    expect(
      filterExercises(manualExercises, {
        query: "lever horizontal leg press",
        category: "Piernas",
        favorites: new Set(),
        limit: 10,
      }),
    ).toEqual([
      expect.objectContaining({
        id: "manual-lever-horizontal-leg-press",
        name: "lever horizontal leg press",
        category: "Piernas",
        equipment: "leverage machine",
        target: "quads",
        imageUrl: "/fuerza-app/exercises/lever-horizontal-leg-press.png",
        gifUrl: "",
      }),
    ]);
  });
});
