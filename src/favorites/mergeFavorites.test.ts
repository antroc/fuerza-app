import { describe, expect, it } from "vitest";
import { mergeFavorites } from "./mergeFavorites";

describe("mergeFavorites", () => {
  it("keeps the newest record independently for each exercise", () => {
    const merged = mergeFavorites(
      [
        { exerciseId: "0025", isFavorite: true, updatedAt: "2026-08-18T10:00:00+02:00" },
        { exerciseId: "0412", isFavorite: true, updatedAt: "2026-08-18T12:00:00+02:00" },
      ],
      [
        { exerciseId: "0025", isFavorite: false, updatedAt: "2026-08-18T11:00:00+02:00" },
        { exerciseId: "0100", isFavorite: true, updatedAt: "2026-08-18T09:00:00+02:00" },
      ],
    );

    expect(merged).toEqual([
      { exerciseId: "0025", isFavorite: false, updatedAt: "2026-08-18T11:00:00+02:00" },
      { exerciseId: "0100", isFavorite: true, updatedAt: "2026-08-18T09:00:00+02:00" },
      { exerciseId: "0412", isFavorite: true, updatedAt: "2026-08-18T12:00:00+02:00" },
    ]);
  });

  it("lets a deletion tombstone win an exact timestamp tie", () => {
    expect(
      mergeFavorites(
        [{ exerciseId: "0025", isFavorite: true, updatedAt: "2026-08-18T10:00:00+02:00" }],
        [{ exerciseId: "0025", isFavorite: false, updatedAt: "2026-08-18T10:00:00+02:00" }],
      ),
    ).toEqual([{ exerciseId: "0025", isFavorite: false, updatedAt: "2026-08-18T10:00:00+02:00" }]);
  });
});
