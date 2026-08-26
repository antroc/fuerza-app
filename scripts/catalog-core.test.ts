import { describe, expect, it } from "vitest";
import { normalizeDataset } from "./catalog-core.mjs";

describe("catalog generator", () => {
  it("maps accepted categories, discards cardio and pins media URLs", () => {
    const result = normalizeDataset(
      [
        {
          id: "0025",
          name: "barbell bench press",
          category: "chest",
          equipment: "barbell",
          target: "pectorals",
          image: "images/0025.jpg",
          gif_url: "videos/0025.gif",
          attribution: "© Gym visual",
        },
        {
          id: "9000",
          name: "running",
          category: "cardio",
          equipment: "body weight",
          target: "cardio",
          image: "images/9000.jpg",
          gif_url: "videos/9000.gif",
          attribution: "© Gym visual",
        },
        {
          id: "0412",
          name: "cable pushdown",
          category: "upper arms",
          equipment: "cable",
          target: "triceps",
          image: "images/0412.jpg",
          gif_url: "videos/0412.gif",
          attribution: "© Gym visual",
        },
      ],
      "abc123def456",
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: "0025",
        category: "Pecho",
        imageUrl:
          "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/abc123def456/images/0025.jpg",
      }),
      expect.objectContaining({ id: "0412", category: "Brazos" }),
    ]);
  });

  it("rejects malformed source records", () => {
    expect(() => normalizeDataset([{ id: "broken", category: "chest" }], "abc123def456")).toThrow(
      "Registro 1 no válido",
    );
  });
});
