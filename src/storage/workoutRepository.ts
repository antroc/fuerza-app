import type { Workout } from "../domain/types";
import { finalizeWorkout, resetWorkout } from "../domain/workout";
import { renderWorkoutMarkdown, workoutFileName } from "../export/markdown";
import type { FuerzaDatabase, SyncQueueItem } from "./db";

export interface WorkoutRepository {
  getActive(): Promise<Workout | undefined>;
  getById(id: string): Promise<Workout | undefined>;
  saveDraft(workout: Workout): Promise<void>;
  replaceDraft(previousId: string, workout: Workout): Promise<void>;
  resetDraft(id: string, restartedAt: string): Promise<Workout>;
  finalizeAndEnqueue(id: string, finishedAt: string): Promise<Workout>;
  listFinalized(): Promise<Workout[]>;
  putImported(workout: Workout): Promise<void>;
}

export class DexieWorkoutRepository implements WorkoutRepository {
  constructor(private readonly database: FuerzaDatabase) {}

  async getActive(): Promise<Workout | undefined> {
    return this.database.workouts.where("status").equals("draft").first();
  }

  async getById(id: string): Promise<Workout | undefined> {
    return this.database.workouts.get(id);
  }

  async saveDraft(workout: Workout): Promise<void> {
    if (workout.status !== "draft") throw new Error("La sesión no es un borrador");
    await this.database.transaction("rw", this.database.workouts, async () => {
      const active = await this.getActive();
      if (active && active.id !== workout.id) {
        throw new Error("Ya existe un entrenamiento activo");
      }
      if (active && Date.parse(active.startedAt) > Date.parse(workout.startedAt)) return;
      await this.database.workouts.put(workout);
    });
  }

  async replaceDraft(previousId: string, workout: Workout): Promise<void> {
    if (workout.status !== "draft") throw new Error("La sesión no es un borrador");
    await this.database.transaction("rw", this.database.workouts, async () => {
      const current = await this.database.workouts.get(previousId);
      if (!current || current.status !== "draft") {
        throw new Error("Entrenamiento activo no encontrado");
      }
      if (workout.id !== previousId && (await this.database.workouts.get(workout.id))) {
        throw new Error("Ya existe un entrenamiento para esta fecha");
      }
      await this.database.workouts.put(workout);
      if (workout.id !== previousId) await this.database.workouts.delete(previousId);
    });
  }

  async resetDraft(id: string, restartedAt: string): Promise<Workout> {
    return this.database.transaction("rw", this.database.workouts, async () => {
      const current = await this.database.workouts.get(id);
      if (!current || current.status !== "draft") {
        throw new Error("Entrenamiento activo no encontrado");
      }
      const reset = resetWorkout(current, restartedAt);
      await this.database.workouts.put(reset);
      return reset;
    });
  }

  async finalizeAndEnqueue(id: string, finishedAt: string): Promise<Workout> {
    return this.database.transaction(
      "rw",
      [this.database.workouts, this.database.syncQueue],
      async () => {
        const current = await this.database.workouts.get(id);
        if (!current) throw new Error("Entrenamiento no encontrado");
        const finalized =
          current.status === "finalized" ? current : finalizeWorkout(current, finishedAt);
        const content = renderWorkoutMarkdown(finalized);
        const operationKey = `create-workout:${finalized.id}`;
        const existingOperation = await this.database.syncQueue
          .where("operationKey")
          .equals(operationKey)
          .first();
        await this.database.workouts.put(finalized);
        if (!existingOperation) {
          const item: SyncQueueItem = {
            operationKey,
            status: "pending",
            workoutId: finalized.id,
            path: `entrenamientos/${workoutFileName(finalized)}`,
            content,
            createdAt: finalized.finishedAt!,
            retryAt: null,
            errorMessage: null,
          };
          await this.database.syncQueue.add(item);
        }
        return finalized;
      },
    );
  }

  async listFinalized(): Promise<Workout[]> {
    const workouts = await this.database.workouts.where("status").equals("finalized").toArray();
    return workouts.sort((a, b) => b.date.localeCompare(a.date));
  }

  async putImported(workout: Workout): Promise<void> {
    if (workout.status !== "finalized") {
      throw new Error("Solo se puede importar una sesión finalizada");
    }
    await this.database.workouts.put(workout);
  }
}
