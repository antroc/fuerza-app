import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CatalogExercise } from "../../catalog/types";
import { ExercisePicker } from "./ExercisePicker";

const exercises: CatalogExercise[] = [
  {
    id: "1",
    name: "press de banca",
    category: "Pecho",
    equipment: "barbell",
    target: "pectorals",
    imageUrl: "https://example.com/1.jpg",
    gifUrl: "https://example.com/1.gif",
    attribution: "© Gym visual",
  },
  {
    id: "2",
    name: "jalón al pecho",
    category: "Espalda",
    equipment: "cable",
    target: "lats",
    imageUrl: "https://example.com/2.jpg",
    gifUrl: "https://example.com/2.gif",
    attribution: "© Gym visual",
  },
  {
    id: "3",
    name: "press militar",
    category: "Hombros",
    equipment: "barbell",
    target: "delts",
    imageUrl: "https://example.com/3.jpg",
    gifUrl: "https://example.com/3.gif",
    attribution: "© Gym visual",
  },
];

describe("ExercisePicker", () => {
  it("searches without accents and selects an exercise even when media fails", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ExercisePicker
        exercises={exercises}
        favorites={new Set()}
        reducedMotion
        onSelect={onSelect}
        onToggleFavorite={() => undefined}
        onClose={() => undefined}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "Buscar ejercicio" }), "jalon");
    expect(screen.getByText("jalón al pecho")).toBeVisible();
    expect(screen.queryByText("press de banca")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Añadir jalón al pecho" }));
    expect(onSelect).toHaveBeenCalledWith(exercises[1]);
  });

  it("filters favorites and keeps the favorite control separate from selection", async () => {
    const user = userEvent.setup();
    const onToggleFavorite = vi.fn();
    render(
      <ExercisePicker
        exercises={exercises}
        favorites={new Set(["1"])}
        reducedMotion
        onSelect={() => undefined}
        onToggleFavorite={onToggleFavorite}
        onClose={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Favoritos" }));
    expect(screen.getByText("press de banca")).toBeVisible();
    expect(screen.queryByText("jalón al pecho")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar press de banca de favoritos" }));
    expect(onToggleFavorite).toHaveBeenCalledWith("1", false);
  });

  it("groups favorite exercises by muscle group in the defined order", async () => {
    const user = userEvent.setup();
    render(
      <ExercisePicker
        exercises={exercises}
        favorites={new Set(["1", "3"])}
        reducedMotion
        onSelect={() => undefined}
        onToggleFavorite={() => undefined}
        onClose={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Favoritos" }));

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["Pecho1", "Hombros1"]);
    expect(screen.getByText("press de banca")).toBeVisible();
    expect(screen.getByText("press militar")).toBeVisible();
  });

  it("shows the static image and keeps a manual exercise selectable without a GIF", async () => {
    const onSelect = vi.fn();
    const plank: CatalogExercise = {
      id: "manual-standard-plank",
      name: "plank",
      category: "Core",
      equipment: "body weight",
      target: "abs",
      imageUrl: "/fuerza-app/exercises/plank.png",
      gifUrl: "",
      attribution: "Ejercicio manual de Fuerza",
    };
    render(
      <ExercisePicker
        exercises={[plank]}
        favorites={new Set()}
        reducedMotion={false}
        onSelect={onSelect}
        onToggleFavorite={() => undefined}
        onClose={() => undefined}
      />,
    );

    const image = await screen.findByRole("img", { name: "Demostración de plank" });
    expect(image).toHaveAttribute("src", "/fuerza-app/exercises/plank.png");
    expect(screen.queryByText("Vista no disponible")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Añadir plank" }));
    expect(onSelect).toHaveBeenCalledWith(plank);
  });
});
