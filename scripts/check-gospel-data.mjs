#!/usr/bin/env node
/**
 * Valida el conjunto de datos del Evangelio generado por `generate:gospel`.
 *
 * Comprueba el esquema de cada mes, la integridad de los días, la coherencia
 * del manifest y que todas las omisiones estén documentadas en
 * data/evangelio/exceptions.json.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(projectRoot, 'data', 'evangelio');
const dictionariesPath = path.join(projectRoot, 'src', 'i18n', 'dictionaries.json');

const errors = [];
const fail = (message) => errors.push(message);

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function hasEntity(value) {
  return typeof value === 'string' && /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(value);
}

const dictionaries = await readJson(dictionariesPath);
const seasons = new Set(Object.keys(dictionaries.seasons.es));
const ranks = new Set(Object.keys(dictionaries.ranks.es));
const files = await readdir(dataDir);
const monthFiles = files.filter((name) => /^\d{4}-\d{2}\.json$/.test(name)).sort();
const manifest = await readJson(path.join(dataDir, 'manifest.json'));
const exceptionsFile = await readJson(path.join(dataDir, 'exceptions.json'));
const exceptionDates = new Set((exceptionsFile.entries || []).map((entry) => entry.date));

if (!monthFiles.length) fail('No hay archivos YYYY-MM.json.');

const declared = new Set(manifest.months || []);
for (const name of monthFiles) {
  if (!declared.has(name.replace('.json', ''))) fail(`El manifest no declara ${name}.`);
}
for (const monthKey of declared) {
  if (!monthFiles.includes(`${monthKey}.json`)) fail(`El manifest declara ${monthKey} pero el archivo no existe.`);
}

const daysByMonth = {};
for (const name of monthFiles) {
  const monthKey = name.replace('.json', '');
  const [year, month] = monthKey.split('-').map(Number);
  const data = await readJson(path.join(dataDir, name));

  if (data.month !== monthKey) fail(`${name}: month=${JSON.stringify(data.month)}.`);
  if (data.source !== 'Breviarium Core (breviarium.es)') fail(`${name}: source inesperado.`);
  if (!data.days || typeof data.days !== 'object' || Array.isArray(data.days)) {
    fail(`${name}: falta el objeto days.`);
    continue;
  }

  const dates = Object.keys(data.days);
  daysByMonth[monthKey] = dates.length;
  const expected = daysInMonth(year, month);
  const allowed = [...exceptionDates].filter((date) => date.startsWith(`${monthKey}-`)).length;
  if (dates.length + allowed !== expected) {
    fail(`${name}: ${dates.length} días + ${allowed} excepciones != ${expected}.`);
  }

  for (const date of dates) {
    const day = data.days[date];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !date.startsWith(`${monthKey}-`)) {
      fail(`${name}: clave de día inválida ${date}.`);
    }
    if (day.date !== date) fail(`${name}: ${date} tiene date=${JSON.stringify(day.date)}.`);
    if (!day.celebration) fail(`${name}: ${date} sin celebration.`);
    if (!ranks.has(day.rank)) fail(`${name}: ${date} rank desconocido ${JSON.stringify(day.rank)}.`);
    if (!seasons.has(day.season)) fail(`${name}: ${date} season desconocida ${JSON.stringify(day.season)}.`);
    if (!day.color) fail(`${name}: ${date} sin color.`);
    if (!day.gospel?.ref || !day.gospel?.text) fail(`${name}: ${date} sin Evangelio.`);
    for (const [field, value] of [
      ['gospel.text', day.gospel?.text],
      ['gospel.title', day.gospel?.title],
      ['acclamation.text', day.acclamation?.text],
      ['comment.text', day.comment?.text]
    ]) {
      if (hasEntity(value)) fail(`${name}: ${date} ${field} contiene una entidad HTML.`);
    }
  }
}

const declaredCounts = manifest.daysByMonth || {};
for (const monthKey of Object.keys(daysByMonth)) {
  if (declaredCounts[monthKey] !== daysByMonth[monthKey]) {
    fail(`El manifest declara ${declaredCounts[monthKey]} días para ${monthKey}, hay ${daysByMonth[monthKey]}.`);
  }
}
const total = Object.values(daysByMonth).reduce((sum, count) => sum + count, 0);
if (manifest.daysTotal !== total) fail(`El manifest declara ${manifest.daysTotal} días, hay ${total}.`);
if (manifest.from !== Number(Object.keys(daysByMonth)[0]?.slice(0, 4))) fail('manifest.from no coincide con los meses.');
if (manifest.to !== Number(Object.keys(daysByMonth).at(-1)?.slice(0, 4))) fail('manifest.to no coincide con los meses.');

for (const entry of manifest.exceptions || []) {
  if (!exceptionDates.has(entry.date)) fail(`El manifest registra una excepción no documentada: ${entry.date}.`);
  const [year, month, day] = entry.date.split('-').map(Number);
  if (daysByMonth[`${year}-${String(month).padStart(2, '0')}`] === undefined) {
    fail(`La excepción ${entry.date} está fuera del rango generado.`);
  }
  if (!entry.celebration || !entry.cause || !entry.origin || !entry.solution) {
    fail(`La excepción ${entry.date} está incompleta.`);
  }
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day) {
    fail(`La excepción ${entry.date} no es una fecha válida.`);
  }
}
for (const date of exceptionDates) {
  const monthKey = date.slice(0, 7);
  if (daysByMonth[monthKey] === undefined) continue;
  if (!(manifest.exceptions || []).some((entry) => entry.date === date)) {
    fail(`${date} figura en exceptions.json pero no en el manifest.`);
  }
}

// Aviso de caducidad (issue #2): el sitio pasa a depender de la API de respaldo
// cuando se agota el rango local, así que conviene ampliarlo con antelación.
const currentYear = new Date().getUTCFullYear();
const remainingYears = manifest.to - currentYear;
if (remainingYears <= 1) {
  console.warn(`AVISO: solo quedan ${remainingYears} años de cobertura local (hasta ${manifest.to}). Amplía el rango con bun run generate:gospel -- --from=${manifest.to + 1} --to=${manifest.to + 5}.`);
}

if (errors.length) {
  console.error(`Datos del Evangelio inválidos (${errors.length} errores):`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Datos del Evangelio válidos: ${monthFiles.length} meses, ${total} días, ${exceptionDates.size} excepciones.`);
}
