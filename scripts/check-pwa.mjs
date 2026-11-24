#!/usr/bin/env node
/**
 * Valida la configuración PWA de F5: manifiesto, iconos y service worker.
 * Si dist/sw.js existe, comprueba que sus caches y precaché sean coherentes
 * con la salida de `astro build`.
 */

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(projectRoot, 'public');
const distDir = path.join(projectRoot, 'dist');
const errors = [];
const fail = (message) => errors.push(message);

function readJson(file) {
  return readFile(file, 'utf8').then(JSON.parse);
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/** Lee las dimensiones y el tipo de un PNG desde su cabecera, sin dependencias. */
function pngSize(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return null;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const manifestPath = path.join(publicDir, 'manifest.webmanifest');
if (!(await exists(manifestPath))) {
  fail('Falta public/manifest.webmanifest.');
} else {
  const manifest = await readJson(manifestPath);
  if (manifest.dir !== 'auto') fail(`manifest.dir debe ser "auto" (tiene ${JSON.stringify(manifest.dir)}).`);
  if (!manifest.id) fail('Falta manifest.id (identificador estable de la aplicación).');
  if (manifest.start_url !== './index.html') fail('manifest.start_url debe ser "./index.html".');
  if (manifest.scope !== './') fail('manifest.scope debe ser "./".');
  if (manifest.display !== 'standalone') fail('manifest.display debe ser "standalone".');
  if (!Array.isArray(manifest.categories) || manifest.categories.length < 2) {
    fail('El manifest debe declarar al menos dos categories.');
  }
  if (!manifest.background_color || !manifest.theme_color) fail('Faltan colores del tema.');

  const icons = manifest.icons || [];
  const maskable = icons.find((icon) => (icon.purpose || '').split(/\s+/).includes('maskable'));
  if (!maskable) {
    fail('Falta un icono con purpose "maskable".');
  } else {
    const iconPath = path.join(publicDir, maskable.src);
    if (!(await exists(iconPath))) {
      fail(`El icono maskable ${maskable.src} no existe.`);
    } else {
      const size = pngSize(await readFile(iconPath));
      if (!size || size.width !== 512 || size.height !== 512) {
        fail(`El icono maskable debe ser PNG de 512x512 (tiene ${JSON.stringify(size)}).`);
      }
    }
  }
  for (const icon of icons) {
    if (!(await exists(path.join(publicDir, icon.src)))) fail(`El icono ${icon.src} del manifest no existe.`);
  }
}

const swPath = path.join(distDir, 'sw.js');
if (await exists(swPath)) {
  const source = await readFile(swPath, 'utf8');
  const expectation = [
    ['const SHELL_CACHE', 'caché del shell'],
    ['const DATA_CACHE', 'caché de datos'],
    ['const API_CACHE', 'caché de APIs'],
    [' PRECACHE', 'lista de precaché'],
    [/["']\.\/index\.html["']/, 'precache de index.html'],
    [/["']\.\/manifest\.webmanifest["']/, 'precache del manifest'],
    ['cache.addAll(PRECACHE)', 'instalación del precaché'],
    ["self.addEventListener('fetch'", 'interceptor de fetch'],
    ["self.addEventListener('activate'", 'limpieza de cachés antiguas']
  ];
  for (const [needle, label] of expectation) {
    const found = needle instanceof RegExp ? needle.test(source) : source.includes(needle);
    if (!found) fail(`dist/sw.js no contiene ${label} (${needle}).`);
  }
  for (const marker of [/\/data\/evangelio\//, /feed\.evangelizo\.org/, /categpt\.chat/]) {
    if (!marker.test(source)) fail(`dist/sw.js no contiene la ruta ${marker}.`);
  }
}

if (errors.length) {
  console.error(`PWA inválida (${errors.length} errores):`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exitCode = 1;
} else {
  const swNote = (await exists(swPath)) ? ' y service worker generado' : ' (sin dist/sw.js todavía)';
  console.log(`PWA válida: manifiesto, iconos${swNote}.`);
}
