#!/usr/bin/env node
/**
 * Construye un sprite SVG con únicamente los iconos que usa el sitio y
 * genera el tipo IconName a partir de la misma lista.
 *
 * Fuente: Font Awesome Free 6.4.0 (instalado como dependencia de desarrollo).
 * Salida: public/icons/sprite.svg y src/icons/generated.ts
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(
  projectRoot,
  'node_modules',
  '@fortawesome',
  'fontawesome-free',
  'svgs'
);
const spritePath = path.join(projectRoot, 'public', 'icons', 'sprite.svg');
const typesPath = path.join(projectRoot, 'src', 'icons', 'generated.ts');

// En Font Awesome 6.4.0 algunos nombres antiguos son alias: fa-calendar-alt
// apunta a calendar-days. Se conserva el id original para no tocar el JS legado.
const aliases = new Map([
  ['far/calendar-alt', 'calendar-days'],
  ['fas/bible', 'book-bible'],
  ['fas/external-link-alt', 'up-right-from-square'],
]);

// Equivalencia directa con las clases de la versión estática: fas = solid, far = regular.
const icons = [
  ['far', 'calendar'],
  ['far', 'calendar-alt'],
  ['fas', 'angle-right'],
  ['fas', 'arrow-right'],
  ['fas', 'arrows-rotate'],
  ['fas', 'bars'],
  ['fas', 'bell'],
  ['fas', 'bible'],
  ['fas', 'book-bible'],
  ['fas', 'bookmark'],
  ['fas', 'bullhorn'],
  ['fas', 'calendar-day'],
  ['fas', 'calendar-days'],
  ['fas', 'camera-retro'],
  ['fas', 'chevron-left'],
  ['fas', 'chevron-right'],
  ['fas', 'church'],
  ['fas', 'clock'],
  ['fas', 'cross'],
  ['fas', 'crosshairs'],
  ['fas', 'dove'],
  ['fas', 'envelope'],
  ['fas', 'envelope-open-text'],
  ['fas', 'expand'],
  ['fas', 'external-link-alt'],
  ['fas', 'feather-pointed'],
  ['fas', 'globe'],
  ['fas', 'hand-holding-heart'],
  ['fas', 'hands-holding-circle'],
  ['fas', 'hands-praying'],
  ['fas', 'images'],
  ['fas', 'key'],
  ['fas', 'landmark'],
  ['fas', 'location-dot'],
  ['fas', 'newspaper'],
  ['fas', 'paper-plane'],
  ['fas', 'scroll'],
  ['fas', 'seedling'],
  ['fas', 'sun'],
  ['fas', 'water'],
  ['fas', 'wheat-awn'],
];

const symbols = [];
const names = [];

for (const [style, name] of icons) {
  const id = `${style}-${name}`;
  const directory = style === 'fas' ? 'solid' : 'regular';
  const sourceName = aliases.get(`${style}/${name}`) ?? name;
  const svg = await readFile(path.join(sourceDir, directory, `${sourceName}.svg`), 'utf8');
  const match = svg.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*?)<\/svg>/);

  if (!match) {
    throw new Error(`No se pudo leer el SVG de ${id}`);
  }

  const [, viewBox, rawContent] = match;
  const content = rawContent.replace(/<!--[\s\S]*?-->/g, '').trim();
  symbols.push(`  <symbol id="${id}" viewBox="${viewBox}">${content}</symbol>`);
  names.push(id);
}

const sprite = [
  '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">',
  '  <!-- Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com',
  '       Licencia: https://fontawesome.com/license/free (Icons: CC BY 4.0) -->',
  ...symbols,
  '</svg>',
  '',
].join('\n');

const types = [
  '// Generado por scripts/build-icon-sprite.mjs. No editar a mano.',
  'export const iconNames = [',
  ...names.map((name) => `  '${name}',`),
  '] as const;',
  '',
  'export type IconName = (typeof iconNames)[number];',
  '',
].join('\n');

await mkdir(path.dirname(spritePath), { recursive: true });
await mkdir(path.dirname(typesPath), { recursive: true });
await writeFile(spritePath, sprite);
await writeFile(typesPath, types);

console.log(`Sprite generado: ${symbols.length} iconos`);
