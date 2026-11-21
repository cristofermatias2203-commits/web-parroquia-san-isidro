#!/usr/bin/env node
/**
 * Copia a public/fonts solo las variantes de fuente que usa el sitio.
 *
 * Se usan fuentes variables: un único archivo por familia/estilo/subset
 * sustituye a los 16 pesos estáticos que cargaba la versión anterior.
 * Los subconjuntos latin y latin-ext cubren los nueve idiomas del sitio;
 * árabe y chino usan fuentes del sistema como fallback.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'node_modules', '@fontsource-variable');
const targetDir = path.join(projectRoot, 'public', 'fonts');

const files = [
  ['cinzel', 'latin', 'normal', 'cinzel-latin.woff2'],
  ['cinzel', 'latin-ext', 'normal', 'cinzel-latin-ext.woff2'],
  ['cormorant-garamond', 'latin', 'normal', 'cormorant-garamond-latin.woff2'],
  ['cormorant-garamond', 'latin-ext', 'normal', 'cormorant-garamond-latin-ext.woff2'],
  ['cormorant-garamond', 'latin', 'italic', 'cormorant-garamond-latin-italic.woff2'],
  ['cormorant-garamond', 'latin-ext', 'italic', 'cormorant-garamond-latin-ext-italic.woff2'],
  ['montserrat', 'latin', 'normal', 'montserrat-latin.woff2'],
  ['montserrat', 'latin-ext', 'normal', 'montserrat-latin-ext.woff2'],
];

await mkdir(targetDir, { recursive: true });

for (const [family, subset, style, outputName] of files) {
  const sourceName = `${family}-${subset}-wght-${style}.woff2`;
  await copyFile(
    path.join(sourceDir, family, 'files', sourceName),
    path.join(targetDir, outputName)
  );
}

console.log(`Fuentes copiadas: ${files.length} archivos en public/fonts`);
