import { AlertTriangle, Check } from "lucide-react";
import type { Workout } from "../../domain/types";
import { calculateWorkoutSummary } from "../../domain/workout";

export const FinishDialog = ({
  workout,
  onConfirm,
  onCancel,
}: {
  workout: Workout;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const summary = calculateWorkoutSummary(workout);
  const incomplete = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => !set.completed).length,
    0,
  );
  return (
    <div className="dialog-backdrop">
      <section
        className="finish-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-title"
      >
        <div className="dialog-icon">
          <Check aria-hidden="true" />
        </div>
        <h2 id="finish-title">Finalizar entrenamiento</h2>
        <p>La sesión quedará bloqueada y se guardará en este dispositivo.</p>
        <dl className="finish-summary">
          <div>
            <dt>Ejercicios</dt>
            <dd>{summary.totalExercises}</dd>
          </div>
          <div>
            <dt>Series</dt>
            <dd>{summary.totalSets}</dd>
          </div>
          <div>
            <dt>Volumen</dt>
            <dd>{summary.totalVolumeKg.toLocaleString("es-ES")} kg</dd>
          </div>
        </dl>
        {incomplete > 0 && (
          <div className="dialog-warning" role="alert">
            <AlertTriangle aria-hidden="true" />
            <span>
              {incomplete}{" "}
              {incomplete === 1
                ? "serie incompleta no se exportará"
                : "series incompletas no se exportarán"}
              .
            </span>
          </div>
        )}
        <div className="dialog-actions">
          <button className="button button-secondary" onClick={onCancel}>
            Seguir entrenando
          </button>
          <button
            className="button button-primary"
            onClick={onConfirm}
            aria-label="Confirmar finalización"
          >
            Finalizar sesión
          </button>
        </div>
      </section>
    </div>
  );
};
