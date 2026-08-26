import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const maximumEntryBytes = 550 * 1024;
const indexPath = resolve("dist/index.html");
const indexHtml = await readFile(indexPath, "utf8");
const entryMatch = indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+\.js)"/);

if (!entryMatch) {
  throw new Error("No se encontró el JavaScript de entrada en dist/index.html");
}

const assetPath = entryMatch[1].match(/assets\/[^/]+\.js$/)?.[0];
if (!assetPath) {
  throw new Error(`Ruta de entrada inesperada: ${entryMatch[1]}`);
}
const entryPath = resolve("dist", assetPath);
const { size } = await stat(entryPath);

if (size > maximumEntryBytes) {
  throw new Error(
    `El JavaScript inicial pesa ${Math.ceil(size / 1024)} KiB; el máximo es ${maximumEntryBytes / 1024} KiB`,
  );
}

console.log(`JavaScript inicial: ${Math.ceil(size / 1024)} KiB`);
