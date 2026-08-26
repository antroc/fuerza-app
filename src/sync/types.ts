export interface GitHubContent {
  sha: string;
  path: string;
  content: string;
}

export interface PutContentResult {
  contentSha: string;
  commitSha: string;
}

export interface GitHubPort {
  getContent(
    owner: string,
    repository: string,
    path: string,
    branch: string,
  ): Promise<GitHubContent | null>;
  putContent(
    owner: string,
    repository: string,
    path: string,
    branch: string,
    content: string,
    message: string,
    currentSha?: string,
  ): Promise<PutContentResult>;
}

export interface SyncTarget {
  owner: string;
  repository: string;
  branch: string;
}

export type ProcessResult = "idle" | "synced" | "conflict" | "auth-error" | "retry-later" | "error";
