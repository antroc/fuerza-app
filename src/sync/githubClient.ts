import type { GitHubContent, GitHubPort, PutContentResult } from "./types";

const API_BASE = import.meta.env.VITE_GITHUB_API_BASE || "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAt: Date | null = null,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export const encodeBase64Utf8 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const decodeBase64Utf8 = (value: string): string => {
  const binary = atob(value.replaceAll("\n", ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const pathUrl = (owner: string, repository: string, suffix = ""): string =>
  `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}${suffix}`;

const retryDate = (response: Response): Date | null => {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) {
    return new Date(Date.now() + Number(retryAfter) * 1000);
  }
  const reset = response.headers.get("x-ratelimit-reset");
  return reset && /^\d+$/.test(reset) ? new Date(Number(reset) * 1000) : null;
};

export class GitHubClient implements GitHubPort {
  constructor(
    private readonly token: string,
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        ...init,
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw new GitHubApiError("No se pudo conectar con GitHub", 0);
    }
    if (!response.ok) {
      if (response.status === 401) {
        throw new GitHubApiError("GitHub rechazó la autenticación", 401);
      }
      if (
        response.status === 429 ||
        (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")
      ) {
        throw new GitHubApiError(
          "GitHub ha limitado temporalmente las solicitudes",
          response.status,
          retryDate(response),
        );
      }
      if (response.status === 403) {
        throw new GitHubApiError("El token no tiene permisos suficientes", 403);
      }
      throw new GitHubApiError(
        response.status === 404
          ? "El recurso de GitHub no existe o no es accesible"
          : "GitHub no pudo completar la operación",
        response.status,
      );
    }
    return (await response.json()) as T;
  }

  async getRepository(owner: string, repository: string) {
    return this.request<{ private: boolean; default_branch: string; name: string }>(
      pathUrl(owner, repository),
    );
  }

  async getContent(
    owner: string,
    repository: string,
    path: string,
    branch: string,
  ): Promise<GitHubContent | null> {
    try {
      const item = await this.request<{
        type: string;
        sha: string;
        path: string;
        content: string;
        encoding: string;
      }>(
        `${pathUrl(owner, repository, `/contents/${path.split("/").map(encodeURIComponent).join("/")}`)}?ref=${encodeURIComponent(branch)}`,
      );
      if (item.type !== "file" || item.encoding !== "base64") {
        throw new GitHubApiError("La ruta remota no contiene un archivo compatible", 422);
      }
      return { sha: item.sha, path: item.path, content: decodeBase64Utf8(item.content) };
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) return null;
      throw error;
    }
  }

  async listDirectory(
    owner: string,
    repository: string,
    path: string,
    branch: string,
  ): Promise<Array<{ name: string; path: string; sha: string; type: string }>> {
    try {
      return await this.request(
        `${pathUrl(owner, repository, `/contents/${path.split("/").map(encodeURIComponent).join("/")}`)}?ref=${encodeURIComponent(branch)}`,
      );
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) return [];
      throw error;
    }
  }

  async putContent(
    owner: string,
    repository: string,
    path: string,
    branch: string,
    content: string,
    message: string,
    currentSha?: string,
  ): Promise<PutContentResult> {
    const body = {
      message,
      content: encodeBase64Utf8(content),
      branch,
      ...(currentSha ? { sha: currentSha } : {}),
    };
    const result = await this.request<{
      content: { sha: string };
      commit: { sha: string };
    }>(
      pathUrl(owner, repository, `/contents/${path.split("/").map(encodeURIComponent).join("/")}`),
      { method: "PUT", body: JSON.stringify(body) },
    );
    return { contentSha: result.content.sha, commitSha: result.commit.sha };
  }

  async verifyAndWriteConfig(
    owner: string,
    repository: string,
    verifiedAt: string,
  ): Promise<{ branch: string; contentSha: string; commitSha: string }> {
    const metadata = await this.getRepository(owner, repository);
    if (!metadata.private) throw new Error("El repositorio de datos debe ser privado");
    const path = "config/app.json";
    const current = await this.getContent(owner, repository, path, metadata.default_branch);
    const content = `${JSON.stringify(
      {
        schema_version: 1,
        type: "fuerza_data_repository",
        last_verified_at: verifiedAt,
      },
      null,
      2,
    )}\n`;
    const result = await this.putContent(
      owner,
      repository,
      path,
      metadata.default_branch,
      content,
      current
        ? "config: verify fuerza app connection"
        : "config: initialize fuerza data repository",
      current?.sha,
    );
    return { branch: metadata.default_branch, ...result };
  }
}
