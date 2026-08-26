import type { FuerzaDatabase } from "./db";

export interface GitHubSettings {
  owner: string;
  repository: string;
  branch: string;
  token: string;
  lastVerifiedAt: string;
}

export class SettingsRepository {
  constructor(private readonly database: FuerzaDatabase) {}

  async getGitHub(): Promise<GitHubSettings | undefined> {
    const record = await this.database.settings.get("github");
    return record?.value as GitHubSettings | undefined;
  }

  async saveGitHub(value: GitHubSettings): Promise<void> {
    await this.database.settings.put({
      key: "github",
      value,
      updatedAt: new Date().toISOString(),
    });
  }

  async disconnectGitHub(): Promise<void> {
    await this.database.settings.delete("github");
  }
}
