import { expect, test, type Page } from "@playwright/test";

const fillSet = async (
  page: Page,
  exerciseName: string,
  index: number,
  weight: string,
  repetitions: string,
) => {
  const exercise = page.getByRole("region", { name: exerciseName, exact: true });
  const weightInput = exercise.getByLabel(/Peso de la serie .* en kilogramos/).nth(index);
  const repetitionsInput = exercise.getByLabel(/Repeticiones de la serie/).nth(index);
  await weightInput.fill(weight);
  await weightInput.blur();
  await repetitionsInput.fill(repetitions);
  await repetitionsInput.blur();
  await exercise.getByRole("button", { name: `Marcar serie ${index + 1} como completada` }).click();
};

const activeWorkoutInStorage = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ date: string | null; completedSets: number }>((resolve, reject) => {
        const openRequest = indexedDB.open("fuerza-app");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const getRequest = database
            .transaction("workouts", "readonly")
            .objectStore("workouts")
            .getAll();
          getRequest.onerror = () => reject(getRequest.error);
          getRequest.onsuccess = () => {
            const workouts = getRequest.result as Array<{
              date: string;
              status: string;
              exercises: Array<{ sets: Array<{ completed: boolean }> }>;
            }>;
            const active = workouts.find((workout) => workout.status === "draft");
            database.close();
            resolve({
              date: active?.date ?? null,
              completedSets:
                active?.exercises.reduce(
                  (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
                  0,
                ) ?? 0,
            });
          };
        };
      }),
  );

test("conserva una sesión offline y sincroniza el Markdown al recuperar la red", async ({
  page,
  context,
}, testInfo) => {
  const token = `token-${testInfo.project.name}`;

  await page.goto("./");
  await page.getByRole("link", { name: "Ajustes" }).click();
  await page.getByLabel("Token de acceso personal").fill(token);
  await page.getByRole("button", { name: "Probar y guardar conexión" }).click();
  await expect(page.getByText("Conexión verificada y guardada")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar aviso" }).click();
  await page.getByRole("link", { name: "Inicio" }).click();
  await page.getByLabel("Fecha del entrenamiento").fill("2026-08-20");
  await page.getByRole("button", { name: "Comenzar entrenamiento" }).click();
  await expect(page.getByRole("heading", { name: "Entrenamiento", exact: true })).toBeVisible();
  await expect(page.getByLabel("Fecha del entrenamiento")).toHaveValue("2026-08-20");
  await page.getByLabel("Fecha del entrenamiento").fill("2026-08-19");
  await expect(page.getByLabel("Fecha del entrenamiento")).toHaveValue("2026-08-19");
  await expect.poll(async () => (await activeWorkoutInStorage(page)).date).toBe("2026-08-19");

  for (const [name, weight] of [
    ["3/4 sit-up", "20"],
    ["alternate lateral pulldown", "45"],
  ] as const) {
    await page.getByRole("button", { name: "Añadir ejercicio" }).click();
    await page.getByRole("searchbox", { name: "Buscar ejercicio" }).fill(name);
    await page.getByRole("button", { name: `Añadir ${name}`, exact: true }).click();
    await page.getByRole("button", { name: `Añadir serie a ${name}` }).click();
    await page.getByRole("button", { name: `Añadir serie a ${name}` }).click();
    await fillSet(page, name, 0, weight, "10");
    await fillSet(page, name, 1, weight, "8");
    await fillSet(page, name, 2, weight, "6");
  }

  await expect.poll(async () => (await activeWorkoutInStorage(page)).completedSets).toBe(6);
  await expect.poll(async () => (await activeWorkoutInStorage(page)).date).toBe("2026-08-19");
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await context.setOffline(true);
  await page.evaluate(() => window.location.reload());
  await expect(page.getByRole("heading", { name: "Entrenamiento", exact: true })).toBeVisible();
  await expect(page.getByLabel("Fecha del entrenamiento")).toHaveValue("2026-08-19");
  await expect(page.getByText("alternate lateral pulldown")).toBeVisible();
  await page.getByRole("button", { name: "Finalizar entrenamiento" }).click();
  await page.getByRole("button", { name: "Confirmar finalización" }).click();
  await expect(page.getByText("Entrenamiento guardado en este dispositivo")).toBeVisible();

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  const readUploadedMarkdown = () =>
    page.evaluate(async (currentToken) => {
      const response = await fetch(
        `/fuerza-app/__github/__state?token=${encodeURIComponent(currentToken)}`,
      );
      const state = (await response.json()) as { uploadedMarkdown: string };
      return state.uploadedMarkdown;
    }, token);
  await expect.poll(readUploadedMarkdown).toContain("total_sets: 6");
  const uploadedMarkdown = await readUploadedMarkdown();
  expect(uploadedMarkdown).toContain("## 3/4 sit-up");
  expect(uploadedMarkdown).toContain("## alternate lateral pulldown");
});
