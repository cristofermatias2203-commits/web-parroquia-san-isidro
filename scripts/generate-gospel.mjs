#!/usr/bin/env node
/**
 * Genera los datos diarios del Evangelio que consume el sitio.
 *
 * Fuente: Breviarium Core (https://breviarium.es), que incluye las lecturas
 * de la Misa en español y el calendario litúrgico.
 *
 * Uso:
 *   bun run generate:gospel -- --from=2026 --to=2040
 *   bun run generate:gospel -- --from 2041 --to 2045
 *
 * Los archivos se escriben en data/evangelio/YYYY-MM.json como JSON válido.
 * El rango se fusiona con el manifest existente: ampliar el calendario no
 * borra los meses ya generados. Los días sin datos en la fuente están
 * documentados en data/evangelio/exceptions.json; cualquier omisión nueva
 * hace fallar la generación antes de escribir nada.
 */

import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import he from 'he';
import { Breviarium } from 'breviarium';

// Breviarium resuelve el día con toLocaleDateString, que depende de la zona
// horaria del proceso. Fijar UTC garantiza una salida idéntica en cualquier
// equipo (#11); las fechas también se construyen con Date.UTC.
process.env.TZ = 'UTC';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'data', 'evangelio');
const manifestPath = path.join(outputDir, 'manifest.json');
const exceptionsPath = path.join(outputDir, 'exceptions.json');
const source = 'Breviarium Core (breviarium.es)';

const HELP = `Uso: bun run generate:gospel -- [opciones]

Opciones:
  --from AÑO    Primer año a generar (1000-9999, por defecto 2026).
  --to AÑO      Último año a generar (1000-9999, por defecto 2040).
  -h, --help    Muestra esta ayuda.

Se aceptan tanto --from=2027 como --from 2027. El rango se fusiona con el
manifest existente. Los días sin Evangelio en Breviarium deben figurar en
data/evangelio/exceptions.json; cualquier otra omisión aborta la generación.

Ejemplos:
  bun run generate:gospel -- --from=2026 --to=2040
  bun run generate:gospel -- --from 2041 --to 2045
`;

class DayError extends Error {
  constructor(call, date, detail) {
    super(`${date} [${call}] ${detail}`);
    this.name = 'DayError';
    this.call = call;
    this.date = date;
  }
}

function parseArgs(argv) {
  const values = { from: '2026', to: '2040' };
  const known = new Set(['from', 'to']);

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') return { help: true, values };
    const match = argument.match(/^--([a-z]+)(?:=(.*))?$/);
    const key = match?.[1];
    if (!key || !known.has(key)) {
      throw new Error(`Argumento desconocido: ${argument}`);
    }
    const inline = match[2];
    if (inline !== undefined) {
      values[key] = inline;
    } else {
      const next = argv[++index];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`Falta el valor de --${key}`);
      }
      values[key] = next;
    }
  }
  return { help: false, values };
}

function yearOf(raw, flag) {
  const value = Number(raw);
  if (!/^\d+$/.test(String(raw)) || !Number.isInteger(value) || value < 1000 || value > 9999) {
    throw new Error(`${flag} debe ser un año de cuatro dígitos (1000-9999); se recibió ${JSON.stringify(raw)}.`);
  }
  return value;
}

function cleanInline(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function stripHtml(value) {
  const decoded = he.decode(
    String(value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div)>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n/g, '\n')
  );

  const text = decoded
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(text)) {
    throw new Error(`Queda una entidad HTML sin decodificar: ${text.slice(0, 120)}`);
  }
  return text;
}

/** Separa "Jn 17, 20-26: _Título_" en referencia y título. */
function splitReference(rawValue) {
  const value = cleanInline(rawValue);
  const match = value.match(/^(.*?):\s*_(.*?)_\s*$/);
  if (match) {
    return { ref: cleanInline(match[1]), title: cleanInline(match[2]) };
  }
  return { ref: value.replace(/^_+|_+$/g, '').trim(), title: '' };
}

/** Separa la referencia de un comentario patrístico en autor/obra y título. */
function splitCommentReference(rawValue) {
  const value = cleanInline(rawValue);
  const separator = value.indexOf(':');
  if (separator > 0 && separator < value.length - 1) {
    return {
      source: cleanInline(value.slice(0, separator)),
      title: cleanInline(value.slice(separator + 1))
    };
  }
  return { source: value, title: '' };
}

/**
 * Elige la lectura principal de un tipo, dando prioridad a las lecturas
 * propias de la celebración. Solo exige texto para los tipos que se muestran
 * íntegros; de los demás se conserva únicamente la referencia (#14).
 */
function pickReading(readings, suffix, needsText = false) {
  const withText = (reading) => !needsText || Boolean(cleanInline(reading?.texto));
  const candidates = (readings || []).filter(
    (reading) => reading && cleanInline(reading.ref) && withText(reading) && String(reading.type).endsWith(suffix)
  );
  return (
    candidates.find((reading) => reading.type === `CELEBRATION_${suffix}`) ||
    candidates.find((reading) => reading.type === suffix) ||
    candidates[0] ||
    null
  );
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function normalizeSeason(season) {
  return season === 'PASCHAL_TRIDUUM' ? 'EASTER_TRIDUUM' : season;
}

function normalizeColor(color, celebration) {
  if (cleanInline(color)) return cleanInline(color);
  // Breviarium no devuelve color en el Triduo: rojo el Viernes Santo y blanco
  // la Vigilia Pascual del Sábado Santo (#12).
  if (/^Viernes Santo\b/i.test(cleanInline(celebration))) return 'RED';
  if (/^Sábado Santo\b/i.test(cleanInline(celebration))) return 'WHITE';
  return '';
}

async function callLabelled(label, fn, isoDate) {
  try {
    return await fn();
  } catch (error) {
    const detail = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    throw new DayError(label, isoDate, detail);
  }
}

function describe(exceptionEntry, extra = {}) {
  return {
    date: exceptionEntry.date,
    celebration: exceptionEntry.celebration,
    cause: exceptionEntry.cause,
    diagnostic: exceptionEntry.diagnostic,
    origin: exceptionEntry.origin,
    solution: exceptionEntry.solution,
    ...extra
  };
}

async function generateMonth(year, month, expectedExceptions, previousExceptions) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const days = {};
  const foundExceptions = [];
  const breviarium = new Breviarium(new Date(Date.UTC(year, month - 1, 1, 12)));
  const total = daysInMonth(year, month);

  for (let day = 1; day <= total; day++) {
    const isoDate = `${monthKey}-${String(day).padStart(2, '0')}`;

    if (expectedExceptions.has(isoDate)) {
      const known = previousExceptions.find((entry) => entry.date === isoDate);
      foundExceptions.push(describe(known || { date: isoDate }, { known: true }));
      continue;
    }

    const date = new Date(Date.UTC(year, month - 1, day, 12));
    breviarium.setDate(date);

    const info = await callLabelled('getLiturgyInformation', () => breviarium.getLiturgyInformation(), isoDate);
    const evangelium = await callLabelled('getEvangelium', () => breviarium.getEvangelium(), isoDate);
    const lectureSets = await callLabelled('getLectures', () => breviarium.getLectures(), isoDate);

    const gospelEntry = pickReading(evangelium?.evangelium_lectiones, 'GOSPEL', true);
    if (!gospelEntry) throw new DayError('evangelium', isoDate, 'No hay lectura GOSPEL con referencia y texto.');

    const matchingSet = (lectureSets || []).find(
      (set) => set.id === evangelium?.id && set.cycle === evangelium?.cycle
    );
    if (!matchingSet) {
      throw new DayError(
        'getLectures',
        isoDate,
        `Ningún conjunto coincide con id=${JSON.stringify(evangelium?.id)} y cycle=${JSON.stringify(evangelium?.cycle)}.`
      );
    }

    const readings = matchingSet.lecturas || [];
    const firstReading = pickReading(readings, 'FIRSTLECTURE');
    const psalm = pickReading(readings, 'PSALM');
    const secondReading = pickReading(readings, 'SECONDLECTURE');
    const acclamation = pickReading(readings, 'ACCLAMATION', true);
    const comment = pickReading(readings, 'COMMENT', true);

    const gospelReference = splitReference(gospelEntry.ref);
    const commentReference = splitCommentReference(comment?.ref);
    const celebration = cleanInline(info?.celebration);

    days[isoDate] = {
      date: isoDate,
      celebration,
      rank: cleanInline(info?.rank),
      season: normalizeSeason(cleanInline((info?.seasons || [])[0])),
      color: normalizeColor(info?.color, celebration),
      cycle: cleanInline(info?.cycle || evangelium?.cycle),
      gospel: {
        ref: gospelReference.ref,
        title: gospelReference.title,
        text: stripHtml(gospelEntry.texto)
      },
      firstReading: firstReading ? splitReference(firstReading.ref).ref : '',
      psalm: psalm ? splitReference(psalm.ref).ref : '',
      secondReading: secondReading ? splitReference(secondReading.ref).ref : '',
      acclamation: acclamation
        ? { text: stripHtml(acclamation.texto), response: splitReference(acclamation.ref).ref }
        : null,
      comment: comment
        ? {
            source: commentReference.source,
            title: commentReference.title,
            text: stripHtml(comment.texto)
          }
        : null
    };
  }

  if (Object.keys(days).length + foundExceptions.length !== total) {
    throw new Error(`${monthKey}: el número de días no cuadra con el calendario.`);
  }

  return {
    monthKey,
    payload: { month: monthKey, source, days },
    exceptions: foundExceptions
  };
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJsonAtomic(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, value, 'utf8');
  await rename(temp, file);
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.message}\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }
  if (parsed.help) {
    console.log(HELP);
    return;
  }

  let fromYear;
  let toYear;
  try {
    fromYear = yearOf(parsed.values.from, '--from');
    toYear = yearOf(parsed.values.to, '--to');
    if (fromYear > toYear) throw new Error('--from no puede ser mayor que --to.');
  } catch (error) {
    console.error(`${error.message}\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }

  await mkdir(outputDir, { recursive: true });
  const exceptionsFile = await readJson(exceptionsPath, { entries: [] });
  const previousExceptions = exceptionsFile.entries || [];
  const expectedExceptions = new Set(previousExceptions.map((entry) => entry.date));
  const previousManifest = await readJson(manifestPath, { months: [] });

  console.log(`Generando Evangelios de ${fromYear} a ${toYear}...`);
  const generated = [];
  const unexpected = [];

  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      try {
        generated.push(await generateMonth(year, month, expectedExceptions, previousExceptions));
      } catch (error) {
        unexpected.push(error);
      }
    }
  }

  if (unexpected.length) {
    console.error(`\nSe abortó la generación: ${unexpected.length} día(s) sin datos inesperados.`);
    for (const error of unexpected) console.error(`  ${error.stack || error.message}`);
    process.exitCode = 1;
    return;
  }

  // El manifest se fusiona con el existente para que un rango parcial no
  // elimine los meses ya publicados (#8).
  const monthKeys = [...new Set([...(previousManifest.months || []), ...generated.map((m) => m.monthKey)])].sort();
  const exceptions = new Map(previousExceptions.map((entry) => [entry.date, entry]));
  for (const month of generated) {
    for (const entry of month.exceptions) exceptions.set(entry.date, entry);
  }
  for (const date of exceptions.keys()) {
    if (!monthKeys.includes(date.slice(0, 7))) exceptions.delete(date);
  }

  for (const month of generated) {
    const file = path.join(outputDir, `${month.monthKey}.json`);
    await writeJsonAtomic(file, `${JSON.stringify(month.payload, null, 2)}\n`);
    console.log(`  ${month.monthKey}: ${Object.keys(month.payload.days).length} días`);
  }

  const filesOnDisk = await readdir(outputDir);
  for (const name of filesOnDisk) {
    const match = name.match(/^(\d{4}-\d{2})\.(js|json)$/);
    if (!match) continue;
    const keep = match[2] === 'json' && monthKeys.includes(match[1]);
    if (!keep) await unlink(path.join(outputDir, name));
  }

  // Verificación final: todos los meses anunciados existen, son JSON válido
  // y tienen exactamente los días de su calendario o una excepción documentada.
  const daysByMonth = {};
  for (const monthKey of monthKeys) {
    const data = await readJson(path.join(outputDir, `${monthKey}.json`), null);
    if (!data || data.month !== monthKey || !data.days) {
      throw new Error(`${monthKey}: archivo ausente o inválido tras la generación.`);
    }
    const [year, month] = monthKey.split('-').map(Number);
    const expected = daysInMonth(year, month);
    const actual = Object.keys(data.days).length;
    const allowed = [...exceptions.keys()].filter((date) => date.startsWith(`${monthKey}-`)).length;
    if (actual + allowed !== expected) {
      throw new Error(`${monthKey}: ${actual} días + ${allowed} excepciones != ${expected}.`);
    }
    daysByMonth[monthKey] = actual;
  }

  const manifest = {
    schemaVersion: 1,
    from: Number(monthKeys[0]?.slice(0, 4)),
    to: Number(monthKeys[monthKeys.length - 1]?.slice(0, 4)),
    source,
    generatedAt: new Date().toISOString(),
    months: monthKeys,
    daysByMonth,
    daysTotal: Object.values(daysByMonth).reduce((sum, count) => sum + count, 0),
    exceptions: [...exceptions.values()].sort((a, b) => a.date.localeCompare(b.date))
  };
  await writeJsonAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const skipped = manifest.exceptions.filter((entry) => monthKeys.includes(entry.date.slice(0, 7)));
  console.log(
    `Listo: ${monthKeys.length} meses, ${manifest.daysTotal} días, ${skipped.length} excepciones documentadas.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
