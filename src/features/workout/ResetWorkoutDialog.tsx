import { useEffect, useRef } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export const ResetWorkoutDialog = ({
  error,
  pending = false,
  onConfirm,
  onCancel,
}: {
  error?: string | null;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    cancelRef.current?.focus();
    return () => {
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="finish-dialog reset-dialog"
      aria-labelledby="reset-title"
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <div className="dialog-icon">
        <RotateCcw aria-hidden="true" />
      </div>
      <h2 id="reset-title">Reiniciar sesión</h2>
      <p>Se eliminarán todos los ejercicios, series, pesos y repeticiones de la sesión actual.</p>
      <div className="dialog-warning">
        <AlertTriangle aria-hidden="true" />
        <span>Esta acción no se puede deshacer.</span>
      </div>
      {error && (
        <div className="dialog-error" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <div className="dialog-actions">
        <button
          ref={cancelRef}
          className="button button-secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Seguir entrenando
        </button>
        <button
          className="button button-danger"
          disabled={pending}
          onClick={onConfirm}
          aria-label="Confirmar reinicio"
        >
          {pending ? "Reiniciando…" : "Reiniciar sesión"}
        </button>
      </div>
    </dialog>
  );
};
