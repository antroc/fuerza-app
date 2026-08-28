import { describe, expect, it } from "vitest";
import { toMadridIso } from "./time";

describe("toMadridIso", () => {
  it("uses the winter offset for Europe/Madrid", () => {
    expect(toMadridIso(new Date("2026-01-15T12:30:00Z"))).toBe("2026-01-15T13:30:00.000+01:00");
  });

  it("uses the summer offset for Europe/Madrid", () => {
    expect(toMadridIso(new Date("2026-08-18T16:30:00Z"))).toBe("2026-08-18T18:30:00.000+02:00");
  });

  it("preserves milliseconds so immediate session resets remain ordered", () => {
    expect(toMadridIso(new Date("2026-08-18T16:30:00.742Z"))).toBe("2026-08-18T18:30:00.742+02:00");
  });
});
