import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { addExercise, completeSet, createWorkout, updateSet } from "../../domain/workout";
import { FinishDialog } from "./FinishDialog";

describe("FinishDialog", () => {
  it("warns about incomplete sets and confirms only completed rows", async () => {
    let workout = addExercise(createWorkout("2026-08-18T18:00:00+02:00"), {
      id: "1",
      name: "press de banca",
      category: "Pecho",
      equipment: "barbell",
    });
    const exercise = workout.exercises[0];
    workout = updateSet(workout, exercise.id, exercise.sets[0].id, {
      weightGrams: 60_000,
      repetitions: 10,
    });
    workout = completeSet(workout, exercise.id, exercise.sets[0].id);
    workout = {
      ...workout,
      exercises: [
        {
          ...workout.exercises[0],
          sets: [
            ...workout.exercises[0].sets,
            { id: "empty", position: 2, weightGrams: null, repetitions: null, completed: false },
          ],
        },
      ],
    };
    const onConfirm = vi.fn();
    render(<FinishDialog workout={workout} onConfirm={onConfirm} onCancel={() => undefined} />);

    expect(screen.getByRole("alert")).toHaveTextContent("1 serie incompleta no se exportará");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar finalización" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
