import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Ellipsis, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { Workout, WorkoutSet } from "../../domain/types";
import {
  addSet,
  completeSet,
  duplicateSet,
  kgToGrams,
  moveExercise,
  moveSet,
  removeExercise,
  removeSet,
  uncompleteSet,
  updateSet,
} from "../../domain/workout";

interface ActiveWorkoutPageProps {
  workout: Workout;
  elapsedMinutes: number;
  onWorkoutChange: (workout: Workout) => void;
  onDateChange: (selectedDate: string) => Promise<void>;
  onAddExercise: () => void;
  onRequestReset: () => void;
  onRequestFinish: (workout: Workout) => void;
}

const kgValue = (grams: number | null): string => (grams === null ? "" : (grams / 1000).toString());

interface SetInputProps {
  label: string;
  value: string;
  inputMode: "decimal" | "numeric";
  onCommit: (value: string) => void;
}

const SetInput = ({ label, value, inputMode, onCommit }: SetInputProps) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      className="set-input"
      aria-label={label}
      inputMode={inputMode}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      autoComplete="off"
    />
  );
};

export const ActiveWorkoutPage = ({
  workout,
  elapsedMinutes,
  onWorkoutChange,
  onDateChange,
  onAddExercise,
  onRequestReset,
  onRequestFinish,
}: ActiveWorkoutPageProps) => {
  const [error, setError] = useState<string | null>(null);
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [dateDraft, setDateDraft] = useState(workout.date);
  useEffect(() => setDateDraft(workout.date), [workout.date]);
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  const elapsed = hours > 0 ? `${hours}:${minutes.toString().padStart(2, "0")}` : `${minutes} min`;

  const changeSet = (
    exerciseId: string,
    set: WorkoutSet,
    patch: Partial<Pick<WorkoutSet, "weightGrams" | "repetitions">>,
  ) => {
    try {
      onWorkoutChange(
        updateSet(workout, exerciseId, set.id, {
          weightGrams: patch.weightGrams ?? set.weightGrams,
          repetitions: patch.repetitions ?? set.repetitions,
        }),
      );
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar la serie");
    }
  };

  return (
    <main className="workout-page" aria-labelledby="workout-title">
      <header className="workout-header">
        <div>
          <label className="workout-date-field">
            <span>Fecha del entrenamiento</span>
            <input
              type="date"
              value={dateDraft}
              onChange={(event) => {
                const selectedDate = event.target.value;
                setDateDraft(selectedDate);
                if (!selectedDate) return;
                void onDateChange(selectedDate)
                  .then(() => setError(null))
                  .catch((reason) => {
                    setDateDraft(workout.date);
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "No se pudo cambiar la fecha del entrenamiento",
                    );
                  });
              }}
              required
            />
          </label>
          <h1 id="workout-title">Entrenamiento</h1>
        </div>
        <div className="workout-header-actions">
          <div className="workout-clock" aria-label={`Duración ${elapsed}`}>
            {elapsed}
          </div>
          <button className="text-button reset-workout-button" onClick={onRequestReset}>
            <RotateCcw size={17} aria-hidden="true" /> Reiniciar sesión
          </button>
        </div>
      </header>

      <div className="local-status" role="status">
        <Check aria-hidden="true" size={18} />
        Guardado localmente
      </div>

      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}

      <div className="exercise-ledger">
        {workout.exercises.map((exercise, exerciseIndex) => (
          <section
            className="performed-exercise"
            key={exercise.id}
            aria-labelledby={`exercise-${exercise.id}`}
          >
            <header className="exercise-heading">
              <div>
                <span className="exercise-order">{exerciseIndex + 1}</span>
                <div>
                  <h2 id={`exercise-${exercise.id}`}>{exercise.nameSnapshot}</h2>
                  <p>
                    {exercise.equipmentSnapshot} · {exercise.categorySnapshot}
                  </p>
                </div>
              </div>
              <div className="exercise-actions">
                <button
                  className="text-button"
                  onClick={() => onWorkoutChange(addSet(workout, exercise.id))}
                  aria-label={`Añadir serie a ${exercise.nameSnapshot}`}
                >
                  <Plus size={18} aria-hidden="true" /> Serie
                </button>
                <button
                  className="icon-button"
                  aria-label={`Acciones para ${exercise.nameSnapshot}`}
                  aria-expanded={openActions === exercise.id}
                  onClick={() => setOpenActions(openActions === exercise.id ? null : exercise.id)}
                >
                  <Ellipsis aria-hidden="true" />
                </button>
              </div>
            </header>

            {openActions === exercise.id && (
              <div
                className="action-strip"
                aria-label={`Ordenar o eliminar ${exercise.nameSnapshot}`}
              >
                <button
                  disabled={exerciseIndex === 0}
                  onClick={() =>
                    onWorkoutChange(moveExercise(workout, exercise.id, exercise.position - 1))
                  }
                >
                  <ArrowUp size={17} /> Subir
                </button>
                <button
                  disabled={exerciseIndex === workout.exercises.length - 1}
                  onClick={() =>
                    onWorkoutChange(moveExercise(workout, exercise.id, exercise.position + 1))
                  }
                >
                  <ArrowDown size={17} /> Bajar
                </button>
                <button onClick={() => onWorkoutChange(removeExercise(workout, exercise.id))}>
                  <Trash2 size={17} /> Eliminar
                </button>
              </div>
            )}

            <div className="set-column-labels" aria-hidden="true">
              <span>Serie</span>
              <span>kg</span>
              <span>reps</span>
              <span>Estado</span>
              <span />
            </div>
            <div className="set-list">
              {exercise.sets.map((set, setIndex) => (
                <div className={`set-row${set.completed ? " is-complete" : ""}`} key={set.id}>
                  <span className="set-position">{set.position}</span>
                  <SetInput
                    label={`Peso de la serie ${set.position} en kilogramos`}
                    value={kgValue(set.weightGrams)}
                    inputMode="decimal"
                    onCommit={(value) =>
                      changeSet(exercise.id, set, { weightGrams: kgToGrams(value) })
                    }
                  />
                  <SetInput
                    label={`Repeticiones de la serie ${set.position}`}
                    value={set.repetitions?.toString() ?? ""}
                    inputMode="numeric"
                    onCommit={(value) =>
                      changeSet(exercise.id, set, {
                        repetitions: value === "" ? null : Number(value),
                      })
                    }
                  />
                  <button
                    className="completion-button"
                    aria-label={`${set.completed ? "Desmarcar" : "Marcar"} serie ${set.position} como completada`}
                    onClick={() => {
                      try {
                        onWorkoutChange(
                          set.completed
                            ? uncompleteSet(workout, exercise.id, set.id)
                            : completeSet(workout, exercise.id, set.id),
                        );
                        setError(null);
                      } catch (reason) {
                        setError(
                          reason instanceof Error
                            ? reason.message
                            : "No se pudo completar la serie",
                        );
                      }
                    }}
                  >
                    <span className="completion-mark" aria-hidden="true">
                      {set.completed && <Check size={18} />}
                    </span>
                    <span>{set.completed ? "Completada" : "Pendiente"}</span>
                  </button>
                  <details className="set-actions">
                    <summary aria-label={`Acciones de la serie ${set.position}`}>
                      <Ellipsis aria-hidden="true" />
                    </summary>
                    <div>
                      <button
                        onClick={() => onWorkoutChange(duplicateSet(workout, exercise.id, set.id))}
                      >
                        <Copy size={16} /> Duplicar
                      </button>
                      <button
                        disabled={setIndex === 0}
                        onClick={() =>
                          onWorkoutChange(moveSet(workout, exercise.id, set.id, set.position - 1))
                        }
                      >
                        <ArrowUp size={16} /> Subir
                      </button>
                      <button
                        disabled={setIndex === exercise.sets.length - 1}
                        onClick={() =>
                          onWorkoutChange(moveSet(workout, exercise.id, set.id, set.position + 1))
                        }
                      >
                        <ArrowDown size={16} /> Bajar
                      </button>
                      <button
                        onClick={() => onWorkoutChange(removeSet(workout, exercise.id, set.id))}
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="workout-commands">
        <button className="button button-secondary" onClick={onAddExercise}>
          <Plus aria-hidden="true" /> Añadir ejercicio
        </button>
        <button
          className="button button-primary"
          onClick={() => onRequestFinish(workout)}
          aria-label="Finalizar entrenamiento"
        >
          <Check aria-hidden="true" /> Finalizar
        </button>
      </div>
    </main>
  );
};
