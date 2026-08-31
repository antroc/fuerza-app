import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createWorkout } from "../domain/workout";
import { HomePage } from "./home/HomePage";
import { HistoryPage } from "./history/HistoryPage";
import { SettingsPage } from "./settings/SettingsPage";

const finalized = {
  ...createWorkout("2026-08-18T18:30:00+02:00"),
  status: "finalized" as const,
  syncStatus: "pending" as const,
  finishedAt: "2026-08-18T19:30:00+02:00",
  durationMinutes: 60,
  exercises: [
    {
      id: "e1",
      catalogExerciseId: "0025",
      nameSnapshot: "barbell bench press",
      categorySnapshot: "Pecho" as const,
      equipmentSnapshot: "barbell",
      position: 1,
      sets: [
        { id: "s1", position: 1, weightGrams: 60_000, repetitions: 10, completed: true },
        {
          id: "s2",
          position: 2,
          weightGrams: 0,
          repetitions: null,
          durationSeconds: 90,
          completed: true,
        },
      ],
    },
  ],
};

describe("application pages", () => {
  it("starts a workout on the date selected on the home page", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(
      <HomePage
        recentWorkouts={[]}
        onStart={onStart}
        onSync={async () => "Sincronización completada"}
      />,
    );

    const dateInput = screen.getByLabelText("Fecha del entrenamiento");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-08-20");
    await user.click(screen.getByRole("button", { name: "Comenzar entrenamiento" }));

    expect(onStart).toHaveBeenCalledWith("2026-08-20");
  });

  it("requires a date before starting a workout", async () => {
    const user = userEvent.setup();
    render(
      <HomePage
        recentWorkouts={[]}
        onStart={() => undefined}
        onSync={async () => "Sincronización completada"}
      />,
    );

    await user.clear(screen.getByLabelText("Fecha del entrenamiento"));

    expect(screen.getByRole("button", { name: "Comenzar entrenamiento" })).toBeDisabled();
  });

  it("offers to continue an active workout instead of creating another", async () => {
    const onStart = vi.fn();
    render(
      <HomePage
        activeWorkout={createWorkout("2026-08-19T18:00:00+02:00")}
        recentWorkouts={[]}
        onStart={onStart}
        onSync={async () => "Sincronización completada"}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Continuar entrenamiento" }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("offers synchronization next to recent workouts and reports the result", async () => {
    const onSync = vi.fn(async () => "Sincronización completada");
    render(<HomePage recentWorkouts={[finalized]} onStart={() => undefined} onSync={onSync} />);

    await userEvent.click(screen.getByRole("button", { name: "Sincronizar entrenamientos ahora" }));

    expect(onSync).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent("Sincronización completada");
  });

  it("shows history totals and a readable sync state", () => {
    render(<HistoryPage workouts={[finalized]} />);
    expect(screen.getByText("600 kg")).toBeVisible();
    expect(screen.getByText("Pendiente de sincronización")).toBeVisible();
    expect(screen.getByText("barbell bench press")).toBeVisible();
    expect(screen.getByText("1:30")).toBeVisible();
  });

  it("tests the GitHub connection before reporting it as saved", async () => {
    const onConnect = vi.fn(async () => ({ branch: "main", message: "Conexión verificada" }));
    render(
      <SettingsPage
        initialSettings={undefined}
        pendingOperations={0}
        onConnect={onConnect}
        onSync={async () => "Sincronización completada"}
        onDisconnect={async () => undefined}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Token de acceso personal"), "github-token");
    await user.click(screen.getByRole("button", { name: "Probar y guardar conexión" }));

    expect(onConnect).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "antroc",
        repository: "fuerza-data",
        token: "github-token",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Conexión verificada");
  });
});
