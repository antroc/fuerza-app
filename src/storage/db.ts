import Dexie, { type EntityTable } from "dexie";
import type { Workout } from "../domain/types";

export interface FavoriteRecord {
  exerciseId: string;
  isFavorite: boolean;
  updatedAt: string;
}

export interface SyncQueueItem {
  queueId?: number;
  operationKey: string;
  status: "pending" | "syncing" | "error" | "conflict";
  workoutId: string;
  path: string;
  content: string;
  createdAt: string;
  retryAt: string | null;
  errorMessage: string | null;
}

export interface SettingRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: string;
}

export class FuerzaDatabase extends Dexie {
  workouts!: EntityTable<Workout, "id">;
  favorites!: EntityTable<FavoriteRecord, "exerciseId">;
  syncQueue!: EntityTable<SyncQueueItem, "queueId">;
  settings!: EntityTable<SettingRecord, "key">;

  constructor(name = "fuerza-app") {
    super(name);
    this.version(1).stores({
      workouts: "&id,date,status,syncStatus,updatedAt",
      favorites: "&exerciseId,updatedAt",
      syncQueue: "++queueId,&operationKey,status,createdAt",
      settings: "&key",
    });
  }
}

export const db = new FuerzaDatabase();
