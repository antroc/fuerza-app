import { describe, expect, it } from "vitest";
import { MediaLoadQueue } from "./mediaQueue";

describe("MediaLoadQueue", () => {
  it("allows at most six concurrent loads", async () => {
    const queue = new MediaLoadQueue(6);
    const releases = await Promise.all(Array.from({ length: 6 }, () => queue.acquire()));
    let seventhStarted = false;
    const seventh = queue.acquire().then((release) => {
      seventhStarted = true;
      return release;
    });

    await Promise.resolve();
    expect(seventhStarted).toBe(false);
    releases[0]();
    const releaseSeventh = await seventh;
    expect(seventhStarted).toBe(true);
    releaseSeventh();
  });
});
