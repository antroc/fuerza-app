import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { ExerciseCategory, PerformedExercise, Workout, WorkoutSet } from "../domain/types";
import { calculateWorkoutSummary } from "../domain/workout";

const categorySchema = z.enum(["Pecho", "Espalda", "Hombros", "Brazos", "Piernas", "Core"]);

const frontMatterSchema = z.object({
  schema_version: z.number().int(),
  type: z.literal("strength_workout"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  started_at: z.string().datetime({ offset: true }),
  finished_at: z.string().datetime({ offset: true }),
  timezone: z.literal("Europe/Madrid"),
  duration_minutes: z.number().int().nonnegative(),
  total_exercises: z.number().int().nonnegative(),
  total_sets: z.number().int().nonnegative(),
  total_volume_kg: z.number().nonnegative(),
  categories: z.array(categorySchema),
});

export type ImportedWorkoutResult =
  | { kind: "imported"; workout: Workout }
  | { kind: "incompatible"; schemaVersion: number; source: string }
  | { kind: "invalid"; message: string; source: string };

const formatKg = (grams: number): string => (grams / 1000).toString();

export const formatSetDuration = (durationSeconds: number): string =>
  `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`;

const escapeMarkdown = (value: string): string => value.replaceAll("|", "\\|");

export const workoutFileName = (workout: Pick<Workout, "id">): string => `Fuerza_${workout.id}.md`;

export const renderWorkoutMarkdown = (workout: Workout): string => {
  if (
    workout.status !== "finalized" ||
    workout.finishedAt === null ||
    workout.durationMinutes === null
  ) {
    throw new Error("Solo se pueden exportar sesiones finalizadas");
  }
  const summary = calculateWorkoutSummary(workout);
  const exercises = [...workout.exercises]
    .sort((a, b) => a.position - b.position)
    .map((exercise) => ({
      ...exercise,
      sets: exercise.sets
        .filter(
          (set) =>
            set.completed &&
            set.weightGrams !== null &&
            (set.repetitions !== null || set.durationSeconds != null),
        )
        .sort((a, b) => a.position - b.position),
    }))
    .filter((exercise) => exercise.sets.length > 0);
  const categories = [...new Set(exercises.map((exercise) => exercise.categorySnapshot))];
  const [year, month, day] = workout.date.split("-");

  const frontMatter = [
    "---",
    "schema_version: 2",
    "type: strength_workout",
    `date: ${workout.date}`,
    `started_at: ${workout.startedAt}`,
    `finished_at: ${workout.finishedAt}`,
    `timezone: ${workout.timezone}`,
    `duration_minutes: ${workout.durationMinutes}`,
    `total_exercises: ${summary.totalExercises}`,
    `total_sets: ${summary.totalSets}`,
    `total_volume_kg: ${summary.totalVolumeKg}`,
    "categories:",
    ...categories.map((category) => `  - ${category}`),
    "---",
  ];

  const body = exercises.flatMap((exercise) => [
    `## ${escapeMarkdown(exercise.nameSnapshot)}`,
    "",
    `- Exercise ID: \`${exercise.catalogExerciseId}\``,
    `- Categoría: ${exercise.categorySnapshot}`,
    `- Equipamiento: ${escapeMarkdown(exercise.equipmentSnapshot)}`,
    "",
    "| Serie | Peso (kg) | Repeticiones | Duración |",
    "|---:|---:|---:|---:|",
    ...exercise.sets.map(
      (set, index) =>
        `| ${index + 1} | ${formatKg(set.weightGrams!)} | ${set.repetitions ?? ""} | ${set.durationSeconds == null ? "" : formatSetDuration(set.durationSeconds)} |`,
    ),
    "",
  ]);

  return [
    ...frontMatter,
    "",
    `# Entrenamiento de fuerza — ${day}/${month}/${year}`,
    "",
    ...body,
  ].join("\n");
};

const parseExercise = (
  section: string,
  position: number,
  schemaVersion: number,
): PerformedExercise => {
  const lines = section.split("\n");
  const nameSnapshot = lines[0].trim().replaceAll("\\|", "|");
  const catalogExerciseId = section.match(/- Exercise ID: `([^`]+)`/)?.[1];
  const category = section.match(/- Categoría: ([^\n]+)/)?.[1]?.trim();
  const equipmentSnapshot = section
    .match(/- Equipamiento: ([^\n]+)/)?.[1]
    ?.trim()
    .replaceAll("\\|", "|");
  const categoryResult = categorySchema.safeParse(category);
  if (!catalogExerciseId || !equipmentSnapshot || !categoryResult.success) {
    throw new Error(`Metadatos inválidos en el ejercicio ${position}`);
  }
  const tableRows = lines.filter((line) => /^\|\s*\d+\s*\|/.test(line));
  if (tableRows.length === 0) throw new Error("Ejercicio sin series válidas");
  const sets: WorkoutSet[] = tableRows.map((row, index) => {
    const cells = row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const expectedCellCount = schemaVersion >= 2 ? 4 : 3;
    if (cells.length !== expectedCellCount) {
      throw new Error(`Serie inválida en el ejercicio ${position}`);
    }
    const weight = Number(cells[1]);
    const repetitions = cells[2] === "" ? null : Number(cells[2]);
    const durationCell = schemaVersion >= 2 ? cells[3] : "";
    const durationMatch = durationCell === "" ? null : durationCell.match(/^(\d+):([0-5]\d)$/);
    if (durationCell !== "" && durationMatch === null) {
      throw new Error(`Serie inválida en el ejercicio ${position}`);
    }
    const durationSeconds = durationMatch
      ? Number(durationMatch[1]) * 60 + Number(durationMatch[2])
      : null;
    if (
      !Number.isFinite(weight) ||
      weight < 0 ||
      (repetitions !== null && (!Number.isInteger(repetitions) || repetitions <= 0)) ||
      (repetitions === null && (durationSeconds === null || durationSeconds <= 0))
    ) {
      throw new Error(`Serie inválida en el ejercicio ${position}`);
    }
    return {
      id: crypto.randomUUID(),
      position: index + 1,
      weightGrams: Math.round(weight * 1000),
      repetitions,
      durationSeconds,
      completed: true,
    };
  });
  return {
    id: crypto.randomUUID(),
    catalogExerciseId,
    nameSnapshot,
    categorySnapshot: categoryResult.data as ExerciseCategory,
    equipmentSnapshot,
    position,
    sets,
  };
};

export const parseWorkoutMarkdown = (
  source: string,
  remoteContentSha: string,
): ImportedWorkoutResult => {
  try {
    const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/);
    if (!match) throw new Error("Falta el front matter");
    const rawFrontMatter = parseYaml(match[1]) as unknown;
    const schemaVersion =
      typeof rawFrontMatter === "object" && rawFrontMatter !== null
        ? Reflect.get(rawFrontMatter, "schema_version")
        : undefined;
    if (typeof schemaVersion === "number" && ![1, 2].includes(schemaVersion)) {
      return { kind: "incompatible", schemaVersion, source };
    }
    const frontMatter = frontMatterSchema.parse(rawFrontMatter);
    const sections = match[2].split(/^## /m).slice(1);
    const exercises = sections.map((section, index) =>
      parseExercise(section, index + 1, frontMatter.schema_version),
    );
    if (exercises.length !== frontMatter.total_exercises) {
      throw new Error("El total de ejercicios no coincide");
    }
    const workout: Workout = {
      id: frontMatter.date.replaceAll("-", ""),
      date: frontMatter.date,
      startedAt: frontMatter.started_at,
      finishedAt: frontMatter.finished_at,
      durationMinutes: frontMatter.duration_minutes,
      timezone: frontMatter.timezone,
      status: "finalized",
      syncStatus: "synced",
      exercises,
      githubCommitSha: null,
      githubContentSha: remoteContentSha,
      updatedAt: frontMatter.finished_at,
    };
    const summary = calculateWorkoutSummary(workout);
    if (
      summary.totalSets !== frontMatter.total_sets ||
      summary.totalVolumeKg !== frontMatter.total_volume_kg
    ) {
      throw new Error("Los totales del documento no coinciden");
    }
    return { kind: "imported", workout };
  } catch (error) {
    return {
      kind: "invalid",
      message: error instanceof Error ? error.message : "Documento no válido",
      source,
    };
  }
};
