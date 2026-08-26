# Fuerza MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar una PWA móvil instalable que registra entrenamientos offline y sincroniza Markdown con `antroc/fuerza-data`.

**Architecture:** Una SPA React separa dominio puro, persistencia Dexie, exportación Markdown, catálogo y adaptador GitHub. La UI consume servicios tipados; IndexedDB es la fuente local y la cola serializa las escrituras remotas.

**Tech Stack:** React, TypeScript, Vite, Dexie, React Router, vite-plugin-pwa, Vitest, Testing Library, Playwright y GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-19-fuerza-mvp-design.md`

## Global Constraints

- Interfaz en español y zona horaria `Europe/Madrid`.
- Despliegue estático bajo `/fuerza-app/`; repositorio de datos privado `antroc/fuerza-data`.
- Un entrenamiento por fecha, un borrador activo y exactamente un Markdown por día.
- La aplicación debe iniciar, editar y finalizar sin conexión sin perder datos.
- El token no aparece en código, build, cachés, URL ni logs.
- Accesibilidad AA, ancho mínimo 360 px y objetivos táctiles de 44 × 44 px.
- TDD: cada comportamiento se prueba y falla por la razón esperada antes de implementar.

---

### Task 1: Foundation and domain contracts

**Files:** `package.json`, Vite/TypeScript/Vitest configs, `src/domain/types.ts`, `src/domain/workout.ts`, `src/domain/workout.test.ts`, `src/test/setup.ts`.

**Interfaces:** Produce `Workout`, `PerformedExercise`, `WorkoutSet`, `createWorkout`, `addSet`, `duplicateSet`, `removeSet`, `moveSet`, `completeSet`, `finalizeWorkout`, `calculateWorkoutSummary`.

- [ ] Escribir tests con fixtures literales para peso 22,5 kg → 22500 g, rechazo de repeticiones cero, clonación de valores, renumeración y volumen exacto.
- [ ] Ejecutar `npm test -- src/domain/workout.test.ts` y confirmar fallos por módulos inexistentes.
- [ ] Implementar funciones puras e invariantes sin acceso a navegador.
- [ ] Repetir pruebas hasta verde y ejecutar `npm run typecheck`.

### Task 2: Deterministic Markdown v1

**Files:** `src/export/markdown.ts`, `src/export/markdown.test.ts`, `src/export/fixtures/workout-v1.md`.

**Interfaces:** Produce `renderWorkoutMarkdown(workout): string` y `parseWorkoutMarkdown(source, remoteSha): ImportedWorkoutResult`.

- [ ] Probar literalmente nombre, front matter, punto decimal, exclusión de filas incompletas, totales y rechazo de `schema_version: 2`.
- [ ] Confirmar RED con `npm test -- src/export/markdown.test.ts`.
- [ ] Implementar serializador ordenado y parser validado sin ejecutar YAML arbitrario.
- [ ] Confirmar GREEN y snapshot determinista en distintas zonas del sistema.

### Task 3: IndexedDB repository and atomic finalization

**Files:** `src/storage/db.ts`, `src/storage/workoutRepository.ts`, `src/storage/workoutRepository.test.ts`, `src/storage/settingsRepository.ts`.

**Interfaces:** Produce `WorkoutRepository` con `getActive`, `saveDraft`, `finalizeAndEnqueue`, `listFinalized`, `getById`; produce `SyncQueueItem` idempotente por `operationKey`.

- [ ] Probar recuperación del borrador, autosave, una sola sesión activa y transacción finalización+cola usando `fake-indexeddb`.
- [ ] Confirmar RED, implementar esquema Dexie y transacciones, confirmar GREEN.
- [ ] Probar que repetir finalización no duplica `create-workout:YYYYMMDD`.

### Task 4: GitHub adapter and sync engine

**Files:** `src/sync/githubClient.ts`, `src/sync/githubClient.test.ts`, `src/sync/syncEngine.ts`, `src/sync/syncEngine.test.ts`, `src/sync/types.ts`.

**Interfaces:** `GitHubClient.getRepository`, `getContent`, `putContent`, `listDirectory`; `SyncEngine.processNext`, `syncNow`, `cancel`; resultados `synced | conflict | auth-error | retry-later`.

- [ ] Probar payload base64 UTF-8, ramas, SHA de contenido, configuración privada y escritura verificable de `config/app.json`.
- [ ] Probar create, contenido idéntico, conflicto sin PUT, 401 que pausa y 429/403 que respeta espera.
- [ ] Implementar fetch inyectable, errores sanitizados y procesamiento secuencial; confirmar todas las ramas en verde.

### Task 5: Favorites and remote import

**Files:** `src/favorites/mergeFavorites.ts`, tests, `src/sync/importHistory.ts`, tests.

**Interfaces:** `mergeFavorites(local, remote)` por ejercicio/fecha; `importRemoteWorkouts(entries, repository)` con conflictos explícitos.

- [ ] Probar favoritos, tombstones, fechas empatadas deterministas, Markdown inválido y borrador local de igual fecha.
- [ ] Confirmar RED, implementar fusión/importación y confirmar GREEN.

### Task 6: Responsive app shell and active workout

**Files:** `src/App.tsx`, `src/styles.css`, `src/components/AppShell.tsx`, `src/features/workout/ActiveWorkoutPage.tsx`, componentes y tests.

**Interfaces:** Rutas `/`, `/entrenamiento`, `/historial`, `/ajustes`; componentes controlados por repositorios/hooks.

- [ ] Probar Inicio vacío/continuar, filas independientes, añadir/duplicar/eliminar/reordenar, completado accesible y confirmación con series incompletas.
- [ ] Confirmar RED; implementar dirección B con HTML semántico, etiquetas visibles, inputs `inputMode`, números tabulares y acciones persistentes.
- [ ] Confirmar GREEN en Testing Library y verificar foco/teclado.

### Task 7: Exercise catalog and selector

**Files:** `scripts/update-catalog.mjs`, `src/catalog/types.ts`, `src/catalog/search.ts`, tests, `src/catalog/exercises.json`, `src/features/catalog/ExercisePicker.tsx`, tests.

**Interfaces:** `normalizeDataset`, `filterExercises`, paginación local y `LazyExerciseMedia` con límite de seis solicitudes.

- [ ] Probar mapeo de ocho categorías, descarte cardio/cuello, búsqueda sin acentos, favoritos primero y fallback de medios.
- [ ] Confirmar RED, implementar catálogo reproducible fijado por revisión y selector visible, confirmar GREEN.

### Task 8: History and settings flows

**Files:** páginas/componentes bajo `src/features/history` y `src/features/settings`, tests.

**Interfaces:** Historial consume sesiones finalizadas y últimos valores; Ajustes consume `GitHubClient`, settings y `SyncEngine`.

- [ ] Probar orden descendente, totales/detalle, últimos valores, prueba y guardado solo tras escritura, sincronización manual y desconexión que conserva workouts.
- [ ] Confirmar RED, implementar estados vacío/carga/error/éxito y confirmar GREEN.

### Task 9: PWA, offline behavior and caching

**Files:** `vite.config.ts`, `src/pwa/register.ts`, `src/pwa/gifCache.ts`, tests, `public/manifest.webmanifest`, iconos.

**Interfaces:** app shell precacheado, API GitHub `NetworkOnly`, catálogo versionado y GIF runtime cache con límite/antigüedad.

- [ ] Probar política de GIF y exclusión absoluta de `api.github.com` del caché.
- [ ] Confirmar RED, configurar service worker/manifiesto y confirmar build instalable.

### Task 10: End-to-end workflow and delivery

**Files:** `playwright.config.ts`, `e2e/workout-offline.spec.ts`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `README.md`.

**Interfaces:** Recorrido crítico en Chromium y WebKit; Actions valida antes de Pages.

- [ ] Escribir E2E para dos ejercicios, tres series, cierre offline, reapertura, finalización y sincronización simulada.
- [ ] Confirmar que el test falla antes de completar cableado; implementar fixtures/red simulada hasta verde.
- [ ] Ejecutar formato, lint, typecheck, unit/component/integration, build y E2E.
- [ ] Inspeccionar visualmente 360 px, móvil amplio y escritorio; ejecutar detectores de diseño y corregir hallazgos.
