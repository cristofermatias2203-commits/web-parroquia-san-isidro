#!/usr/bin/env node
/**
 * Publica los meses del Evangelio generados por `generate:gospel` en `public/`.
 * F3 los lee como texto y extrae el objeto JSON; F4 cambiará la extensión a
 * .json sin tocar la lógica de carga.
 */

import { mkdir, readdir, rm, stat, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'data', 'evangelio');
const targetDir = path.join(projectRoot, 'public', 'data', 'evangelio');

const sourceFiles = (await readdir(sourceDir)).filter((name) => /^\d{4}-\d{2}\.js$/.test(name));
if (!sourceFiles.length) throw new Error(`No hay archivos de Evangelio en ${sourceDir}`);

await mkdir(targetDir, { recursive: true });

// Se retiran los meses que ya no existen en la fuente.
const targetFiles = await readdir(targetDir);
await Promise.all(
  targetFiles
    .filter((name) => name.endsWith('.js') && !sourceFiles.includes(name))
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
