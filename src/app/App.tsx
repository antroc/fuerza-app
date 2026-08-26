import { useCallback, useEffect, useMemo, useState } from "react";
import { HashRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { loadCatalog } from "../catalog/loadCatalog";
import type { CatalogExercise } from "../catalog/types";
import type { Workout } from "../domain/types";
import { addExercise, createWorkout } from "../domain/workout";
import { toMadridIso } from "../domain/time";
import { findLastValues } from "../domain/lastValues";
import { ExercisePicker } from "../features/catalog/ExercisePicker";
import { HistoryPage } from "../features/history/HistoryPage";
import { ConflictDialog } from "../features/history/ConflictDialog";
import { HomePage } from "../features/home/HomePage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { ActiveWorkoutPage } from "../features/workout/ActiveWorkoutPage";
import { FinishDialog } from "../features/workout/FinishDialog";
import { FavoritesRepository, syncFavorites } from "../favorites/mergeFavorites";
import { db } from "../storage/db";
import { SettingsRepository, type GitHubSettings } from "../storage/settingsRepository";
import { DexieWorkoutRepository } from "../storage/workoutRepository";
import { GitHubClient } from "../sync/githubClient";
import { importRemoteHistory } from "../sync/importHistory";
import {
  keepGitHubVersion,
  readConflict,
  replaceWithLocalVersion,
} from "../sync/conflictResolution";
import { SyncEngine } from "../sync/syncEngine";
import { AppShell } from "./AppShell";

const workoutRepository = new DexieWorkoutRepository(db);
const favoritesRepository = new FavoritesRepository(db);
const settingsRepository = new SettingsRepository(db);

const minutesSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));

const AppRoutes = () => {
  const navigate = useNavigate();
  const [activeWorkout, setActiveWorkout] = useState<Workout>();
  const [history, setHistory] = useState<Workout[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [settings, setSettings] = useState<GitHubSettings>();
  const [pendingOperations, setPendingOperations] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [conflict, setConflict] = useState<{
    workoutId: string;
    localContent: string;
    remoteContent: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const reducedMotion = useMemo(
    () =>
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const refreshLocalState = useCallback(async () => {
    const [active, finalized, favorites, github, pending] = await Promise.all([
      workoutRepository.getActive(),
      workoutRepository.listFinalized(),
      favoritesRepository.activeIds(),
      settingsRepository.getGitHub(),
      db.syncQueue.count(),
    ]);
    setActiveWorkout(active);
    setHistory(finalized);
    setFavoriteIds(favorites);
    setSettings(github);
    setPendingOperations(pending);
    setElapsedMinutes(active ? minutesSince(active.startedAt) : 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshLocalState();
  }, [refreshLocalState]);

  useEffect(() => {
    if (!activeWorkout) return;
    const update = () => setElapsedMinutes(minutesSince(activeWorkout.startedAt));
    update();
    const interval = window.setInterval(update, 30_000);
    return () => window.clearInterval(interval);
  }, [activeWorkout]);

  const runSync = useCallback(async (): Promise<string> => {
    const currentSettings = await settingsRepository.getGitHub();
    if (!currentSettings) return "Configura GitHub antes de sincronizar";
    try {
      const client = new GitHubClient(currentSettings.token);
      const target = {
        owner: currentSettings.owner,
        repository: currentSettings.repository,
        branch: currentSettings.branch,
      };
      const engine = new SyncEngine(db, client, target);
      const results = await engine.syncNow();
      await syncFavorites(db, client, target);
      const imported = await importRemoteHistory(client, target, db);
      await refreshLocalState();
      if (results.includes("conflict") || imported.conflicts.length) {
        return "Hay un conflicto que requiere revisión";
      }
      if (results.includes("auth-error")) return "Vuelve a conectar GitHub";
      if (results.includes("error") || results.includes("retry-later")) {
        return "La sincronización se reintentará más tarde";
      }
      return "Sincronización completada";
    } catch (error) {
      await refreshLocalState();
      return error instanceof Error ? error.message : "No se pudo sincronizar";
    }
  }, [refreshLocalState]);

  useEffect(() => {
    const attempt = () => void runSync();
    const visible = () => document.visibilityState === "visible" && attempt();
    window.addEventListener("online", attempt);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", attempt);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [runSync]);

  const startWorkout = async () => {
    if (activeWorkout) {
      navigate("/entrenamiento");
      return;
    }
    const now = toMadridIso();
    const workout = createWorkout(now);
    const existing = await workoutRepository.getById(workout.id);
    if (existing?.status === "finalized") {
      setToast("Ya existe un entrenamiento finalizado para hoy");
      return;
    }
    await workoutRepository.saveDraft(workout);
    setActiveWorkout(workout);
    navigate("/entrenamiento");
  };

  const saveWorkout = (workout: Workout) => {
    setActiveWorkout(workout);
    void workoutRepository
      .saveDraft(workout)
      .catch(() => setToast("No se pudo guardar el último cambio"));
  };

  const openExercisePicker = async () => {
    try {
      if (catalog.length === 0) setCatalog(await loadCatalog());
      setPickerOpen(true);
    } catch {
      setToast("No se pudo cargar el catálogo de ejercicios");
    }
  };

  const confirmFinish = async () => {
    if (!activeWorkout) return;
    try {
      await workoutRepository.finalizeAndEnqueue(activeWorkout.id, toMadridIso());
      setFinishOpen(false);
      setActiveWorkout(undefined);
      await refreshLocalState();
      navigate("/");
      setToast("Entrenamiento guardado en este dispositivo");
      void runSync();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo finalizar");
    }
  };

  const connect = async (input: { owner: string; repository: string; token: string }) => {
    const verifiedAt = toMadridIso();
    const client = new GitHubClient(input.token);
    const result = await client.verifyAndWriteConfig(input.owner, input.repository, verifiedAt);
    const nextSettings: GitHubSettings = {
      ...input,
      branch: result.branch,
      lastVerifiedAt: verifiedAt,
    };
    await settingsRepository.saveGitHub(nextSettings);
    setSettings(nextSettings);
    setToast("Conexión verificada");
    return { branch: result.branch, message: "Conexión verificada y guardada" };
  };

  const githubContext = async () => {
    const current = await settingsRepository.getGitHub();
    if (!current) throw new Error("Configura GitHub para resolver el conflicto");
    return {
      client: new GitHubClient(current.token),
      target: { owner: current.owner, repository: current.repository, branch: current.branch },
    };
  };

  const openConflict = async (workoutId: string) => {
    try {
      const { client, target } = await githubContext();
      const result = await readConflict(db, client, target, workoutId);
      setConflict({
        workoutId,
        localContent: result.localContent,
        remoteContent: result.remote.content,
      });
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo abrir el conflicto");
    }
  };

  const resolveConflict = async (choice: "github" | "local") => {
    if (!conflict) return;
    try {
      const { client, target } = await githubContext();
      if (choice === "github") await keepGitHubVersion(db, client, target, conflict.workoutId);
      else await replaceWithLocalVersion(db, client, target, conflict.workoutId);
      setConflict(undefined);
      await refreshLocalState();
      setToast(
        choice === "github"
          ? "Se ha conservado la versión de GitHub"
          : "GitHub se ha reemplazado con la versión local",
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo resolver el conflicto");
    }
  };

  if (loading) {
    return (
      <div className="app-loading" role="status">
        <span />
        Cargando tus entrenamientos…
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              activeWorkout={activeWorkout}
              recentWorkouts={history}
              onStart={() => void startWorkout()}
              onSync={runSync}
            />
          }
        />
        <Route
          path="/entrenamiento"
          element={
            activeWorkout ? (
              <ActiveWorkoutPage
                workout={activeWorkout}
                elapsedMinutes={elapsedMinutes}
                onWorkoutChange={saveWorkout}
                onAddExercise={() => void openExercisePicker()}
                onRequestFinish={() => setFinishOpen(true)}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/historial"
          element={
            <HistoryPage workouts={history} onResolveConflict={(id) => void openConflict(id)} />
          }
        />
        <Route
          path="/ajustes"
          element={
            <SettingsPage
              initialSettings={settings}
              pendingOperations={pendingOperations}
              onConnect={connect}
              onSync={runSync}
              onDisconnect={async () => {
                await settingsRepository.disconnectGitHub();
                setSettings(undefined);
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {pickerOpen && activeWorkout && (
        <ExercisePicker
          exercises={catalog}
          favorites={favoriteIds}
          reducedMotion={reducedMotion}
          onClose={() => setPickerOpen(false)}
          onSelect={(exercise) => {
            saveWorkout(addExercise(activeWorkout, exercise, findLastValues(history, exercise.id)));
            setPickerOpen(false);
          }}
          onToggleFavorite={(exerciseId, favorite) => {
            const next = new Set(favoriteIds);
            if (favorite) next.add(exerciseId);
            else next.delete(exerciseId);
            setFavoriteIds(next);
            void favoritesRepository.setFavorite(exerciseId, favorite, toMadridIso());
          }}
        />
      )}
      {finishOpen && activeWorkout && (
        <FinishDialog
          workout={activeWorkout}
          onCancel={() => setFinishOpen(false)}
          onConfirm={() => void confirmFinish()}
        />
      )}
      {conflict && (
        <ConflictDialog
          localContent={conflict.localContent}
          remoteContent={conflict.remoteContent}
          onCancel={() => setConflict(undefined)}
          onKeepGitHub={() => void resolveConflict("github")}
          onReplaceGitHub={() => void resolveConflict("local")}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      )}
    </AppShell>
  );
};

export const App = () => (
  <HashRouter>
    <AppRoutes />
  </HashRouter>
);
