import { useState, type FormEvent } from "react";
import { Check, Database, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import type { GitHubSettings } from "../../storage/settingsRepository";

interface ConnectionInput {
  owner: string;
  repository: string;
  token: string;
}

interface SettingsPageProps {
  initialSettings?: GitHubSettings;
  pendingOperations: number;
  onConnect: (input: ConnectionInput) => Promise<{ branch: string; message: string }>;
  onSync: () => Promise<string>;
  onDisconnect: () => Promise<void>;
}

export const SettingsPage = ({
  initialSettings,
  pendingOperations,
  onConnect,
  onSync,
  onDisconnect,
}: SettingsPageProps) => {
  const [owner, setOwner] = useState(initialSettings?.owner ?? "antroc");
  const [repository, setRepository] = useState(initialSettings?.repository ?? "fuerza-data");
  const [token, setToken] = useState(initialSettings?.token ?? "");
  const [branch, setBranch] = useState(initialSettings?.branch ?? "Se detectará automáticamente");
  const [status, setStatus] = useState(
    initialSettings ? "Conexión guardada" : "GitHub no está conectado",
  );
  const [busy, setBusy] = useState(false);

  const connect = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus("Comprobando lectura y escritura…");
    try {
      const result = await onConnect({ owner, repository, token });
      setBranch(result.branch);
      setStatus(result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo conectar con GitHub");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page settings-page">
      <header className="page-title">
        <div>
          <p>Datos y sincronización</p>
          <h1>Ajustes</h1>
        </div>
        <Database aria-hidden="true" />
      </header>
      <section className="settings-section" aria-labelledby="github-title">
        <div className="section-heading">
          <div>
            <h2 id="github-title">Repositorio privado</h2>
            <p>Los entrenamientos finalizados se guardan como Markdown.</p>
          </div>
          <ShieldCheck aria-hidden="true" />
        </div>
        <form onSubmit={connect}>
          <div className="field-row">
            <label>
              <span>Propietario</span>
              <input
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label>
              <span>Repositorio</span>
              <input
                value={repository}
                onChange={(event) => setRepository(event.target.value)}
                required
              />
            </label>
          </div>
          <label>
            <span>Token de acceso personal</span>
            <input
              aria-label="Token de acceso personal"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              autoComplete="current-password"
            />
            <small>Fine-grained · solo este repositorio · Contents: read and write</small>
          </label>
          <label>
            <span>Rama de datos</span>
            <input value={branch} readOnly />
          </label>
          <button className="button button-primary" disabled={busy}>
            {busy ? <RefreshCw className="is-spinning" /> : <Check />}Probar y guardar conexión
          </button>
        </form>
        <div className="connection-status" role="status">
          <span className="status-dot" />
          {status}
        </div>
      </section>

      <section className="settings-section sync-controls" aria-labelledby="sync-title">
        <div>
          <h2 id="sync-title">Sincronización</h2>
          <p>
            {pendingOperations === 0
              ? "No hay operaciones pendientes."
              : `${pendingOperations} operaciones pendientes.`}
          </p>
        </div>
        <button
          className="button button-secondary"
          onClick={async () => {
            setBusy(true);
            setStatus(await onSync());
            setBusy(false);
          }}
          disabled={busy || !initialSettings}
        >
          <RefreshCw /> Sincronizar ahora
        </button>
      </section>

      {initialSettings && (
        <section className="disconnect-section">
          <div>
            <h2>Desconectar GitHub</h2>
            <p>
              El token se borrará del dispositivo. Tus entrenamientos locales permanecerán intactos.
            </p>
          </div>
          <button
            className="button button-danger"
            onClick={async () => {
              await onDisconnect();
              setToken("");
              setStatus("GitHub desconectado");
            }}
          >
            <Unplug /> Desconectar GitHub
          </button>
        </section>
      )}
    </main>
  );
};
