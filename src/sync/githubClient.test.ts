import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient, decodeBase64Utf8, encodeBase64Utf8 } from "./githubClient";

const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

describe("GitHubClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("encodes and decodes UTF-8 Markdown without corrupting accents", () => {
    const content = "# Entrenamiento — Pecho\n62,5 kg";
    expect(decodeBase64Utf8(encodeBase64Utf8(content))).toBe(content);
  });

  it("verifies a private repository by updating config/app.json", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith("/repos/antroc/fuerza-data")) {
        return jsonResponse({ private: true, default_branch: "main", name: "fuerza-data" });
      }
      if (!init?.method) {
        return jsonResponse({
          type: "file",
          path: "config/app.json",
          encoding: "base64",
          sha: "old-content-sha",
          content: encodeBase64Utf8('{"schema_version":1}'),
        });
      }
      return jsonResponse({
        content: { sha: "new-content-sha" },
        commit: { sha: "commit-sha" },
      });
    });
    const client = new GitHubClient("token-secret", fetcher as typeof fetch);

    const result = await client.verifyAndWriteConfig(
      "antroc",
      "fuerza-data",
      "2026-08-19T12:00:00+02:00",
    );
    const putBody = JSON.parse(String(requests.at(-1)?.init?.body)) as Record<string, unknown>;

    expect(result).toEqual({
      branch: "main",
      contentSha: "new-content-sha",
      commitSha: "commit-sha",
    });
    expect(putBody).toMatchObject({ branch: "main", sha: "old-content-sha" });
    expect(decodeBase64Utf8(String(putBody.content))).toContain(
      '"last_verified_at": "2026-08-19T12:00:00+02:00"',
    );
    expect(
      JSON.stringify(requests.map(({ url, init }) => ({ url, body: init?.body }))),
    ).not.toContain("token-secret");
  });

  it("uses the browser fetch without rebinding it to the client instance", async () => {
    const browserFetch = vi.fn(function (this: unknown) {
      if (this instanceof GitHubClient) throw new TypeError("Illegal invocation");
      return Promise.resolve(
        jsonResponse({ private: true, default_branch: "main", name: "fuerza-data" }),
      );
    });
    vi.stubGlobal("fetch", browserFetch);
    const client = new GitHubClient("token");

    await expect(client.getRepository("antroc", "fuerza-data")).resolves.toEqual({
      private: true,
      default_branch: "main",
      name: "fuerza-data",
    });
  });

  it("rejects a public data repository before attempting a write", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ private: false, default_branch: "main", name: "fuerza-data" }),
    );
    const client = new GitHubClient("token", fetcher as typeof fetch);

    await expect(
      client.verifyAndWriteConfig("antroc", "fuerza-data", "2026-08-19T12:00:00+02:00"),
    ).rejects.toThrow("El repositorio de datos debe ser privado");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sanitizes authentication failures and never includes the token", async () => {
    const client = new GitHubClient(
      "super-secret",
      vi.fn(async () =>
        jsonResponse({ message: "Bad credentials super-secret" }, 401),
      ) as typeof fetch,
    );

    await expect(client.getRepository("antroc", "fuerza-data")).rejects.toMatchObject({
      status: 401,
      message: "GitHub rechazó la autenticación",
    });
  });
});
