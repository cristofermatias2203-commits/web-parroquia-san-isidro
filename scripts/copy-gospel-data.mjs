#!/usr/bin/env node
/**
 * Publica los meses del Evangelio generados por `generate:gospel` en `public/`.
 * Los archivos son JSON válido; también se publican el manifest y el listado
 * de excepciones para que la cobertura sea auditable desde el sitio.
 */

import { mkdir, readdir, rm, stat, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'data', 'evangelio');
const targetDir = path.join(projectRoot, 'public', 'data', 'evangelio');

const monthPattern = /^\d{4}-\d{2}\.json$/;
const extraFiles = ['manifest.json', 'exceptions.json'];
const sourceFiles = (await readdir(sourceDir)).filter(
  (name) => monthPattern.test(name) || extraFiles.includes(name)
);
if (!sourceFiles.some((name) => monthPattern.test(name))) {
  throw new Error(`No hay archivos de Evangelio en ${sourceDir}`);
}

await mkdir(targetDir, { recursive: true });

// Se retiran los meses y archivos de apoyo que ya no existen en la fuente,
// incluidos los .js heredados de la versión estática.
const targetFiles = await readdir(targetDir);
await Promise.all(
  targetFiles
    .filter((name) => (monthPattern.test(name) || extraFiles.includes(name) || /^\d{4}-\d{2}\.js$/.test(name)) && !sourceFiles.includes(name))
    .map((name) => rm(path.join(targetDir, name)))
);

let copied = 0;
for (const name of sourceFiles) {
  const source = path.join(sourceDir, name);
  const target = path.join(targetDir, name);
  const [from, to] = await Promise.all([
    stat(source),
    stat(target).catch(() => null),
  ]);
  if (to && to.mtimeMs >= from.mtimeMs && to.size === from.size) continue;
  await copyFile(source, target);
  copied += 1;
}

console.log(`Evangelio publicado: ${sourceFiles.length} meses (${copied} copiados)`);
