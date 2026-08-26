import { describe, expect, it } from "vitest";
import type { CatalogExercise } from "./types";
import { filterExercises, normalizeSearchText } from "./search";

const exercises: CatalogExercise[] = [
  {
    id: "1",
    name: "Press de banca",
    category: "Pecho",
    equipment: "barbell",
    target: "pectorals",
    imageUrl: "i1",
    gifUrl: "g1",
    attribution: "©",
  },
  {
    id: "2",
    name: "Jalón al pecho",
    category: "Espalda",
    equipment: "cable",
    target: "lats",
    imageUrl: "i2",
    gifUrl: "g2",
    attribution: "©",
  },
  {
    id: "3",
    name: "Elevación lateral",
    category: "Hombros",
    equipment: "dumbbell",
    target: "delts",
    imageUrl: "i3",
    gifUrl: "g3",
    attribution: "©",
  },
];

describe("catalog search", () => {
  it("matches without accents or letter case", () => {
    expect(normalizeSearchText("JALÓN")).toBe("jalon");
    expect(
      filterExercises(exercises, {
        query: "jalon",
        category: null,
        favorites: new Set(),
        limit: 10,
      }).map((item) => item.id),
    ).toEqual(["2"]);
  });

  it("filters by category and places favorites first", () => {
    expect(
      filterExercises(exercises, {
        query: "",
        category: null,
        favorites: new Set(["3"]),
        limit: 2,
      }).map((item) => item.id),
    ).toEqual(["3", "1"]);
    expect(
      filterExercises(exercises, {
        query: "",
        category: "Pecho",
        favorites: new Set(),
        limit: 10,
      }).map((item) => item.id),
    ).toEqual(["1"]);
  });
});
