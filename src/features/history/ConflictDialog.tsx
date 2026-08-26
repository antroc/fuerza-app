import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface ConflictDialogProps {
  localContent: string;
  remoteContent: string;
  onCancel: () => void;
  onKeepGitHub: () => void;
  onReplaceGitHub: () => void;
}

export const ConflictDialog = ({
  localContent,
  remoteContent,
  onCancel,
  onKeepGitHub,
  onReplaceGitHub,
}: ConflictDialogProps) => {
  const [confirmReplace, setConfirmReplace] = useState(false);
  return (
    <div className="dialog-backdrop">
      <section
        className="conflict-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
      >
        <header>
          <AlertTriangle aria-hidden="true" />
          <div>
            <h1 id="conflict-title">El entrenamiento tiene dos versiones</h1>
            <p>Ninguna se ha sobrescrito. Compara ambas antes de decidir.</p>
          </div>
        </header>
        <div className="conflict-versions">
          <section>
            <h2>Este dispositivo</h2>
            <pre>{localContent}</pre>
          </section>
          <section>
            <h2>GitHub</h2>
            <pre>{remoteContent}</pre>
          </section>
        </div>
        {confirmReplace && (
          <p className="dialog-warning" role="alert">
            <AlertTriangle />
            Esta acción creará un commit que reemplaza el archivo actual. La versión anterior
            seguirá en el historial de Git.
          </p>
        )}
        <div className="conflict-actions">
          <button className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="button button-secondary" onClick={onKeepGitHub}>
            Conservar GitHub
          </button>
          {confirmReplace ? (
            <button className="button button-danger" onClick={onReplaceGitHub}>
              Sí, reemplazar GitHub
            </button>
          ) : (
            <button className="button button-danger" onClick={() => setConfirmReplace(true)}>
              Usar versión local
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
