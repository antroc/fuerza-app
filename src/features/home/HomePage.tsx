import { useState } from "react";
import { ArrowRight, Check, CloudOff, Dumbbell, RefreshCw } from "lucide-react";
import type { Workout } from "../../domain/types";
import { calculateWorkoutSummary } from "../../domain/workout";

interface HomePageProps {
  activeWorkout?: Workout;
  recentWorkouts: Workout[];
  onStart: () => void;
  onSync: () => Promise<string>;
}

const syncCopy = (workout: Workout) => {
  if (workout.syncStatus === "synced") return "Sincronizado";
  if (workout.syncStatus === "conflict") return "Requiere revisión";
  if (workout.syncStatus === "error") return "No se pudo sincronizar";
  return "Pendiente de sincronización";
};

export const HomePage = ({ activeWorkout, recentWorkouts, onStart, onSync }: HomePageProps) => {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const allSynced =
    recentWorkouts.length > 0 && recentWorkouts.every((workout) => workout.syncStatus === "synced");

  const synchronize = async () => {
    setSyncing(true);
    try {
      setSyncMessage(await onSync());
    } catch {
      setSyncMessage("No se pudo sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="page home-page">
      <header className="page-header">
        <div className="brand-mark" aria-hidden="true">
          <Dumbbell />
        </div>
        <div>
          <p>Registro personal</p>
          <h1>Fuerza</h1>
        </div>
      </header>

      <section className="start-panel" aria-labelledby="start-title">
        <div>
          <p className="start-kicker">
            {activeWorkout ? "Sesión en curso" : "Listo cuando tú lo estés"}
          </p>
          <h2 id="start-title">
            {activeWorkout ? "Continúa donde lo dejaste" : "Registra tu próximo entrenamiento"}
          </h2>
          <p>
            {activeWorkout
              ? "Todos los cambios están guardados en este dispositivo."
              : "Peso, repeticiones y series disponibles incluso sin conexión."}
          </p>
        </div>
        <button className="button button-primary button-large" onClick={onStart}>
          {activeWorkout ? "Continuar entrenamiento" : "Comenzar entrenamiento"}
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      <section className="recent-section" aria-labelledby="recent-title">
        <div className="section-heading">
          <div>
            <h2 id="recent-title">Entrenamientos recientes</h2>
            <p>Tu actividad guardada en el dispositivo</p>
          </div>
          <button
            className={`button button-secondary sync-shortcut${allSynced ? " is-synced" : ""}`}
            onClick={() => void synchronize()}
            disabled={syncing}
            aria-label="Sincronizar entrenamientos ahora"
          >
            {allSynced ? (
              <Check aria-hidden="true" />
            ) : (
              <RefreshCw className={syncing ? "is-spinning" : ""} aria-hidden="true" />
            )}
            {syncing ? "Sincronizando…" : allSynced ? "Sincronizado" : "Sincronizar"}
          </button>
        </div>
        {syncMessage && (
          <p className="sync-feedback" role="status">
            {syncMessage}
          </p>
        )}
        {recentWorkouts.length === 0 ? (
          <div className="empty-state compact">
            <Dumbbell aria-hidden="true" />
            <h3>Aún no hay sesiones</h3>
            <p>Cuando finalices la primera aparecerá aquí.</p>
          </div>
        ) : (
          <div className="recent-list">
            {recentWorkouts.slice(0, 4).map((workout) => {
              const summary = calculateWorkoutSummary(workout);
              return (
                <article key={workout.id}>
                  <div className="date-tile">
                    <strong>{workout.date.slice(8, 10)}</strong>
                    <span>
                      {new Intl.DateTimeFormat("es-ES", { month: "short" }).format(
                        new Date(`${workout.date}T12:00:00`),
                      )}
                    </span>
                  </div>
                  <div className="recent-copy">
                    <h3>
                      {summary.totalExercises}{" "}
                      {summary.totalExercises === 1 ? "ejercicio" : "ejercicios"}
                    </h3>
                    <p>
                      {summary.totalSets} series · {workout.durationMinutes ?? 0} min ·{" "}
                      {summary.totalVolumeKg.toLocaleString("es-ES")} kg
                    </p>
                  </div>
                  <span className={`sync-label sync-${workout.syncStatus}`}>
                    {workout.syncStatus === "synced" ? <Check /> : <CloudOff />}
                    {syncCopy(workout)}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
