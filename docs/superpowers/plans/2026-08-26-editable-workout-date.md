# Editable Workout Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir elegir la fecha al iniciar un entrenamiento y modificarla de forma segura mientras la sesión siga activa.

**Architecture:** La fecha lógica del entrenamiento se separará del instante real de inicio: `date` e `id` reflejan la fecha elegida, mientras `startedAt` conserva el momento real para el cronómetro. Un cambio de fecha se persistirá en una transacción que valida colisiones, inserta la nueva clave y elimina la antigua.

**Tech Stack:** React 19, TypeScript, Dexie/IndexedDB, Vitest, Testing Library, Vite.

**Spec:** Diseño aprobado en esta conversación el 2026-08-26.

## Global Constraints

- Mantener una sola sesión activa por dispositivo.
- Mantener una sola sesión por fecha y no sobrescribir sesiones finalizadas.
- La zona horaria continúa siendo `Europe/Madrid`.
- El cronómetro se calcula desde el instante real de inicio, no desde la fecha lógica elegida.
- Los controles serán inline, accesibles y coherentes con el diseño minimalista existente.

---

### Task 1: Modelo de dominio para una fecha elegida

**Files:**

- Modify: `src/domain/workout.ts`
- Test: `src/domain/workout.test.ts`

**Interfaces:**

- Consumes: `createWorkout(startedAt: string)` existente.
- Produces: `createWorkout(startedAt: string, selectedDate?: string): Workout` y `changeWorkoutDate(workout: Workout, selectedDate: string): Workout`.

- [ ] **Step 1: Write the failing tests**

```ts
it("creates a workout for a selected date without changing its real start time", () => {
  expect(createWorkout("2026-08-26T18:30:00+02:00", "2026-08-20")).toMatchObject({
    id: "20260820",
    date: "2026-08-20",
    startedAt: "2026-08-26T18:30:00+02:00",
  });
});

it("changes the logical date of an active workout", () => {
  expect(changeWorkoutDate(createWorkout("2026-08-26T18:30:00+02:00"), "2026-08-20")).toMatchObject(
    { id: "20260820", date: "2026-08-20" },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/workout.test.ts`
Expected: FAIL because the optional date and `changeWorkoutDate` do not exist.

- [ ] **Step 3: Write minimal implementation**

Validate `YYYY-MM-DD`, derive `id` from the selected date, preserve `startedAt`, and reject date changes on finalized sessions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/domain/workout.test.ts`
Expected: PASS.

### Task 2: Persistencia atómica del cambio de fecha

**Files:**

- Modify: `src/storage/workoutRepository.ts`
- Test: `src/storage/workoutRepository.test.ts`

**Interfaces:**

- Consumes: `Workout` con clave antigua y nueva.
- Produces: `replaceDraft(previousId: string, workout: Workout): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Probar que la operación elimina la clave anterior, conserva una única sesión activa y rechaza una fecha cuyo identificador ya pertenezca a una sesión finalizada.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/storage/workoutRepository.test.ts`
Expected: FAIL because `replaceDraft` does not exist.

- [ ] **Step 3: Write minimal implementation**

Usar una transacción Dexie sobre `workouts`, validar la sesión activa y la colisión de destino, guardar la nueva clave y borrar la anterior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/storage/workoutRepository.test.ts`
Expected: PASS.

### Task 3: Selector de fecha al comenzar

**Files:**

- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles.css`
- Test: `src/features/pages.test.tsx`

**Interfaces:**

- Consumes: fecha inicial local de Madrid.
- Produces: `onStart(selectedDate: string): void`.

- [ ] **Step 1: Write the failing test**

Renderizar Inicio sin sesión activa, cambiar el campo `Fecha del entrenamiento`, pulsar comenzar y comprobar que `onStart` recibe el valor literal elegido.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/pages.test.tsx`
Expected: FAIL because no date input exists and `onStart` receives no value.

- [ ] **Step 3: Write minimal implementation**

Añadir un `input type="date"` inline con hoy como valor inicial; ocultarlo cuando exista una sesión activa; pasar la fecha a `createWorkout` y presentar un aviso si ya existe.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/pages.test.tsx`
Expected: PASS.

### Task 4: Fecha editable durante la sesión

**Files:**

- Modify: `src/features/workout/ActiveWorkoutPage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles.css`
- Test: `src/features/workout/ActiveWorkoutPage.test.tsx`

**Interfaces:**

- Consumes: `workout.date`.
- Produces: `onDateChange(selectedDate: string): Promise<void>` con error visible cuando la persistencia rechaza la fecha.

- [ ] **Step 1: Write the failing test**

Cambiar `Fecha del entrenamiento` en una sesión activa y comprobar que el callback recibe la nueva fecha, sin alterar el valor del cronómetro mostrado.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/workout/ActiveWorkoutPage.test.tsx`
Expected: FAIL because the editable date control does not exist.

- [ ] **Step 3: Write minimal implementation**

Sustituir la fecha de solo lectura por un campo de fecha accesible, cambiar el título a `Entrenamiento` y conectar el callback con `changeWorkoutDate` y `replaceDraft`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/workout/ActiveWorkoutPage.test.tsx`
Expected: PASS.

### Task 5: Verificación integral

**Files:**

- Modify only if verification exposes a defect.

**Interfaces:**

- Consumes: feature complete.
- Produces: build production-ready.

- [ ] **Step 1: Run all automated checks**

Run: `npm test && npm run format:check && npm run lint && npm run typecheck && npm run build && npm run check:build`
Expected: all commands exit 0.

- [ ] **Step 2: Run the browser flow**

Run the applicable Playwright test suite and verify date selection before start, date editing while active, and duplicate-date feedback.

- [ ] **Step 3: Review the working tree**

Run: `git diff --check && git status --short`
Expected: no whitespace errors and only intended files changed.
