import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const maximumEntryBytes = 550 * 1024;
const buildDirectory = resolve(process.argv[2] ?? "dist");
const indexPath = resolve(buildDirectory, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const entryMatch = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+\.js)"/);

if (!entryMatch) {
  throw new Error("No se encontró el JavaScript de entrada en dist/index.html");
}

const assetPath = entryMatch[1].match(/assets\/[^/]+\.js$/)?.[0];
if (!assetPath) {
  throw new Error(`Ruta de entrada inesperada: ${entryMatch[1]}`);
}
const entryPath = resolve(buildDirectory, assetPath);
const serviceWorkerPath = resolve(buildDirectory, "sw.js");
const { size } = await stat(entryPath);
const entryJavaScript = await readFile(entryPath, "utf8");

if (entryJavaScript.includes("/fuerza-app/__github")) {
  throw new Error("El bundle de producción apunta a la API simulada de GitHub");
}

if (size > maximumEntryBytes) {
  throw new Error(
    `El JavaScript inicial pesa ${Math.ceil(size / 1024)} KiB; el máximo es ${maximumEntryBytes / 1024} KiB`,
  );
}

const serviceWorker = await readFile(serviceWorkerPath, "utf8");
const requiredOfflineAssets = ["exercises/plank.png", "exercises/lever-horizontal-leg-press.png"];
const missingOfflineAsset = requiredOfflineAssets.find((asset) => !serviceWorker.includes(asset));
if (missingOfflineAsset) {
  throw new Error(`Falta un ejercicio manual en la precaché offline: ${missingOfflineAsset}`);
}

console.log(`JavaScript inicial: ${Math.ceil(size / 1024)} KiB`);
