import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResetWorkoutDialog } from "./ResetWorkoutDialog";

const DialogHarness = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir reinicio</button>
      {open && <ResetWorkoutDialog onConfirm={() => undefined} onCancel={() => setOpen(false)} />}
    </>
  );
};

describe("ResetWorkoutDialog", () => {
  it("explains the destructive action and requires explicit confirmation", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ResetWorkoutDialog onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByRole("dialog", { name: "Reiniciar sesión" })).toBeVisible();
    expect(screen.getByText(/ejercicios, series, pesos y repeticiones/i)).toBeVisible();
    expect(screen.getByText("Esta acción no se puede deshacer.")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Confirmar reinicio" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("allows keeping the current workout", async () => {
    const onCancel = vi.fn();
    render(<ResetWorkoutDialog onConfirm={() => undefined} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: "Seguir entrenando" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("announces persistence errors inside the modal and locks actions while retrying", () => {
    render(
      <ResetWorkoutDialog
        error="No se pudo guardar el reinicio"
        pending
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Reiniciar sesión" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar el reinicio");
    expect(screen.getByRole("button", { name: "Seguir entrenando" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirmar reinicio" })).toBeDisabled();
  });

  it("moves focus into the modal, handles Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Abrir reinicio" });

    await user.click(trigger);

    expect(screen.getByRole("button", { name: "Seguir entrenando" })).toHaveFocus();
    fireEvent(
      screen.getByRole("dialog", { name: "Reiniciar sesión" }),
      new Event("cancel", { cancelable: true }),
    );
    expect(screen.queryByRole("dialog", { name: "Reiniciar sesión" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
