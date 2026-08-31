import { Check, ChevronDown, CloudOff, History } from "lucide-react";
import type { Workout } from "../../domain/types";
import { calculateWorkoutSummary } from "../../domain/workout";

const syncLabels: Record<Workout["syncStatus"], string> = {
  local: "Guardado localmente",
  pending: "Pendiente de sincronización",
  syncing: "Sincronizando",
  synced: "Sincronizado",
  conflict: "Conflicto: requiere revisión",
  error: "Error de sincronización",
};

const formatDuration = (durationSeconds: number): string =>
  `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`;

export const HistoryPage = ({
  workouts,
  onResolveConflict,
}: {
  workouts: Workout[];
  onResolveConflict?: (workoutId: string) => void;
}) => (
  <main className="page history-page">
    <header className="page-title">
      <div>
        <p>Sesiones finalizadas</p>
        <h1>Historial</h1>
      </div>
      <History aria-hidden="true" />
    </header>
    {workouts.length === 0 ? (
      <div className="empty-state">
        <History aria-hidden="true" />
        <h2>Tu historial está vacío</h2>
        <p>Finaliza un entrenamiento para conservar aquí todos sus detalles.</p>
      </div>
    ) : (
      <div className="history-list">
        {workouts.map((workout, index) => {
          const summary = calculateWorkoutSummary(workout);
          return (
            <details key={workout.id} open={index === 0}>
              <summary>
                <div className="history-date">
                  <strong>
                    {new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long" }).format(
                      new Date(`${workout.date}T12:00:00`),
                    )}
                  </strong>
                  <span>{workout.durationMinutes ?? 0} min</span>
                </div>
                <div className="history-stats">
                  <span>{summary.totalExercises} ejercicios</span>
                  <span>{summary.totalSets} series</span>
                  <strong>{summary.totalVolumeKg.toLocaleString("es-ES")} kg</strong>
                </div>
                <span className={`sync-label sync-${workout.syncStatus}`}>
                  {workout.syncStatus === "synced" ? <Check /> : <CloudOff />}
                  {syncLabels[workout.syncStatus]}
                </span>
                <ChevronDown aria-hidden="true" />
              </summary>
              <div className="history-detail">
                {workout.syncStatus === "conflict" && (
                  <button
                    className="button button-danger resolve-conflict"
                    onClick={() => onResolveConflict?.(workout.id)}
                  >
                    Comparar y resolver conflicto
                  </button>
                )}
                {workout.exercises.map((exercise) => {
                  const sets = exercise.sets.filter((set) => set.completed);
                  if (!sets.length) return null;
                  return (
                    <section key={exercise.id}>
                      <header>
                        <h2>{exercise.nameSnapshot}</h2>
                        <span>{exercise.categorySnapshot}</span>
                      </header>
                      <table>
                        <thead>
                          <tr>
                            <th>Serie</th>
                            <th>Peso</th>
                            <th>Repeticiones</th>
                            <th>Duración</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sets.map((set, setIndex) => (
                            <tr key={set.id}>
                              <td>{setIndex + 1}</td>
                              <td>{((set.weightGrams ?? 0) / 1000).toLocaleString("es-ES")} kg</td>
                              <td>{set.repetitions ?? "—"}</td>
                              <td>
                                {set.durationSeconds == null
                                  ? "—"
                                  : formatDuration(set.durationSeconds)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    )}
  </main>
);
