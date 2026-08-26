import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConflictDialog } from "./ConflictDialog";

describe("ConflictDialog", () => {
  it("requires a second confirmation before replacing GitHub", async () => {
    const replace = vi.fn();
    render(
      <ConflictDialog
        localContent="local"
        remoteContent="remote"
        onCancel={vi.fn()}
        onKeepGitHub={vi.fn()}
        onReplaceGitHub={replace}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Usar versión local" }));
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sí, reemplazar GitHub" }));
    expect(replace).toHaveBeenCalledOnce();
  });
});
