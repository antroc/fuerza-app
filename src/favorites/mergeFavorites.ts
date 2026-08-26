import { z } from "zod";
import type { FavoriteRecord, FuerzaDatabase } from "../storage/db";
import type { GitHubPort, SyncTarget } from "../sync/types";

const remoteSchema = z.object({
  schema_version: z.literal(1),
  updated_at: z.string(),
  items: z.array(
    z.object({
      exercise_id: z.string(),
      is_favorite: z.boolean(),
      updated_at: z.string(),
    }),
  ),
});

export const mergeFavorites = (
  local: FavoriteRecord[],
  remote: FavoriteRecord[],
): FavoriteRecord[] => {
  const merged = new Map<string, FavoriteRecord>();
  for (const item of [...local, ...remote]) {
    const current = merged.get(item.exerciseId);
    if (
      !current ||
      item.updatedAt > current.updatedAt ||
      (item.updatedAt === current.updatedAt && !item.isFavorite)
    ) {
      merged.set(item.exerciseId, item);
    }
  }
  return [...merged.values()].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
};

export const parseFavoritesFile = (source: string): FavoriteRecord[] => {
  const data = remoteSchema.parse(JSON.parse(source));
  return data.items.map((item) => ({
    exerciseId: item.exercise_id,
    isFavorite: item.is_favorite,
    updatedAt: item.updated_at,
  }));
};

export const renderFavoritesFile = (items: FavoriteRecord[]): string => {
  const updatedAt = items.reduce(
    (latest, item) => (item.updatedAt > latest ? item.updatedAt : latest),
    "1970-01-01T00:00:00.000Z",
  );
  return `${JSON.stringify(
    {
      schema_version: 1,
      updated_at: updatedAt,
      items: items.map((item) => ({
        exercise_id: item.exerciseId,
        is_favorite: item.isFavorite,
        updated_at: item.updatedAt,
      })),
    },
    null,
    2,
  )}\n`;
};

export class FavoritesRepository {
  constructor(private readonly database: FuerzaDatabase) {}

  async setFavorite(exerciseId: string, isFavorite: boolean, updatedAt: string): Promise<void> {
    await this.database.favorites.put({ exerciseId, isFavorite, updatedAt });
  }

  async list(): Promise<FavoriteRecord[]> {
    return this.database.favorites.orderBy("exerciseId").toArray();
  }

  async activeIds(): Promise<Set<string>> {
    return new Set(
      (await this.database.favorites.filter((item) => item.isFavorite).toArray()).map(
        (item) => item.exerciseId,
      ),
    );
  }
}

export const syncFavorites = async (
  database: FuerzaDatabase,
  client: GitHubPort,
  target: SyncTarget,
): Promise<void> => {
  const path = "config/favoritos.json";
  const remote = await client.getContent(target.owner, target.repository, path, target.branch);
  const remoteItems = remote ? parseFavoritesFile(remote.content) : [];
  const localItems = await database.favorites.toArray();
  const merged = mergeFavorites(localItems, remoteItems);
  await client.putContent(
    target.owner,
    target.repository,
    path,
    target.branch,
    renderFavoritesFile(merged),
    remote ? "config: merge favorites" : "config: add favorites",
    remote?.sha,
  );
  await database.favorites.bulkPut(merged);
};
