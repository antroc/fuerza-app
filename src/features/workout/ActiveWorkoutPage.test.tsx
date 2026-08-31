import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { addExercise, createWorkout } from "../../domain/workout";
import type { Workout } from "../../domain/types";
import { ActiveWorkoutPage } from "./ActiveWorkoutPage";

const draft = addExercise(createWorkout("2026-08-18T18:30:00+02:00"), {
  id: "0025",
  name: "barbell bench press",
  category: "Pecho",
  equipment: "barbell",
});

const Harness = ({
  onFinish = vi.fn(),
  onReset = vi.fn(),
  onDateChange = async () => undefined,
}: {
  onFinish?: (workout: Workout) => void;
  onReset?: () => void;
  onDateChange?: (selectedDate: string) => Promise<void>;
}) => {
  const [workout, setWorkout] = useState(draft);
  return (
    <ActiveWorkoutPage
      workout={workout}
      elapsedMinutes={42}
      onWorkoutChange={setWorkout}
      onDateChange={onDateChange}
      onAddExercise={() => undefined}
      onRequestFinish={onFinish}
      onRequestReset={onReset}
    />
  );
};

describe("ActiveWorkoutPage", () => {
  it("allows changing the workout date without altering the elapsed time", async () => {
    const onDateChange = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(<Harness onDateChange={onDateChange} />);

    const dateInput = screen.getByLabelText("Fecha del entrenamiento");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-08-20");

    expect(onDateChange).toHaveBeenCalledWith("2026-08-20");
    expect(screen.getByText("42 min")).toBeVisible();
  });

  it("keeps each set editable and copies previous values into a new set", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Peso de la serie 1 en kilogramos"), "62,5");
    await user.type(screen.getByLabelText("Repeticiones de la serie 1"), "8");
    await user.click(screen.getByRole("button", { name: "Añadir serie a barbell bench press" }));

    expect(screen.getByLabelText("Peso de la serie 2 en kilogramos")).toHaveValue("62.5");
    await user.clear(screen.getByLabelText("Repeticiones de la serie 2"));
    await user.type(screen.getByLabelText("Repeticiones de la serie 2"), "6");
    expect(screen.getByLabelText("Repeticiones de la serie 1")).toHaveValue("8");
    expect(screen.getByLabelText("Repeticiones de la serie 2")).toHaveValue("6");
  });

  it("shows a useful validation message before completing an empty set", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Marcar serie 1 como completada" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Introduce un peso y repeticiones o duración válidos",
    );
  });

  it("records minutes and seconds for a timed set without repetitions", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Peso de la serie 1 en kilogramos"), "0");
    await user.type(screen.getByLabelText("Minutos de la serie 1"), "1");
    await user.type(screen.getByLabelText("Segundos de la serie 1"), "30");
    await user.click(screen.getByRole("button", { name: "Marcar serie 1 como completada" }));

    expect(screen.getByText("Completada")).toBeVisible();
  });

  it("clears inherited repetitions when switching a set to duration", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<Harness onFinish={onFinish} />);

    await user.type(screen.getByLabelText("Peso de la serie 1 en kilogramos"), "0");
    const repetitions = screen.getByLabelText("Repeticiones de la serie 1");
    await user.type(repetitions, "8");
    await user.click(screen.getByLabelText("Peso de la serie 1 en kilogramos"));
    await user.clear(repetitions);
    await user.type(screen.getByLabelText("Segundos de la serie 1"), "30");
    await user.click(screen.getByRole("button", { name: "Marcar serie 1 como completada" }));
    await user.click(screen.getByRole("button", { name: "Finalizar entrenamiento" }));

    const requestedWorkout = onFinish.mock.calls[0][0] as Workout;
    expect(requestedWorkout.exercises[0].sets[0]).toMatchObject({
      repetitions: null,
      durationSeconds: 30,
    });
  });

  it("exposes textual completion and requests a final summary", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<Harness onFinish={onFinish} />);
    await user.type(screen.getByLabelText("Peso de la serie 1 en kilogramos"), "60");
    await user.type(screen.getByLabelText("Repeticiones de la serie 1"), "10");
    await user.click(screen.getByRole("button", { name: "Marcar serie 1 como completada" }));

    expect(screen.getByText("Completada")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Finalizar entrenamiento" }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it("requests confirmation before resetting the active workout", async () => {
    const onReset = vi.fn();
    render(<Harness onReset={onReset} />);

    await userEvent.click(screen.getByRole("button", { name: "Reiniciar sesión" }));

    expect(onReset).toHaveBeenCalledOnce();
  });
});
