import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { normalizeDataset } from "./catalog-core.mjs";

const DEFAULT_REVISION = "7455efae41b3";
const revision = process.argv[2] ?? DEFAULT_REVISION;
if (!/^[0-9a-f]{12,40}$/.test(revision)) {
  throw new Error("La revisión debe ser un SHA Git de 12 a 40 caracteres");
}

const base = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${revision}/data/`;
const [dataResponse, schemaResponse] = await Promise.all([
  fetch(`${base}exercises.json`),
  fetch(`${base}exercises.schema.json`),
]);
if (!dataResponse.ok || !schemaResponse.ok) {
  throw new Error(`No se pudo descargar la revisión ${revision}`);
}
const [records, schema] = await Promise.all([dataResponse.json(), schemaResponse.json()]);
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
if (!ajv.validate(schema, records)) {
  throw new Error(`El dataset no cumple su esquema: ${ajv.errorsText()}`);
}
const exercises = normalizeDataset(records, revision);
const output = {
  schemaVersion: 1,
  source: "hasaneyldrm/exercises-dataset",
  revision,
  generatedAt: new Date().toISOString(),
  exercises,
};
await writeFile(
  resolve("src/catalog/exercises.json"),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`Catálogo generado: ${exercises.length} ejercicios (${revision})\n`);
