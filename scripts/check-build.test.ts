import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("check-build", () => {
  it("rejects a production bundle that targets the E2E GitHub mock", async () => {
    const buildDirectory = await mkdtemp(join(tmpdir(), "fuerza-build-"));
    temporaryDirectories.push(buildDirectory);
    await mkdir(join(buildDirectory, "assets"));
    await writeFile(
      join(buildDirectory, "index.html"),
      '<script type="module" src="/fuerza-app/assets/index.js"></script>',
    );
    await writeFile(
      join(buildDirectory, "assets/index.js"),
      'const githubApi = "/fuerza-app/__github";',
    );

    const result = spawnSync(
      process.execPath,
      [resolve("scripts/check-build.mjs"), buildDirectory],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("API simulada de GitHub");
  });
});
