import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("provides the three primary navigation destinations", () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenido</div>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Historial" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ajustes" })).toBeVisible();
  });
});
