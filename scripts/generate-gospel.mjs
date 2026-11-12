#!/usr/bin/env node
/**
 * Genera los datos diarios del Evangelio que consume el sitio.
 *
 * Fuente: Breviarium Core (https://breviarium.es), que incluye las lecturas
 * de la Misa en español y el calendario litúrgico.
 *
 * Uso:
 *   npm run generate:gospel -- --from=2026 --to=2040
 *
 * Los archivos se escriben en data/evangelio/YYYY-MM.json y contienen un
 * objeto "days" con la información de cada día del mes.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Breviarium } from 'breviarium';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'data', 'evangelio');

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value] = argument.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const fromYear = Number(args.get('from') || 2026);
const toYear = Number(args.get('to') || 2040);

if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear > toYear) {
  console.error('Rango de años inválido. Ejemplo: npm run generate:gospel -- --from=2026 --to=2040');
  process.exit(1);
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function cleanInline(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Separa una referencia con el formato "Jn 17, 20-26: _Título breve._"
 * en referencia y título.
 */
function splitReference(rawValue) {
  const value = cleanInline(rawValue);
  const match = value.match(/^(.*?):\s*_(.*?)_\s*$/);
  if (match) {
    return {
      ref: cleanInline(match[1]),
      title: cleanInline(match[2])
    };
  }
  return {
    ref: value.replace(/^_+|_+$/g, '').trim(),
    title: ''
  };
}

/**
 * Separa la referencia de un comentario patrístico en autor/obra y título.
 */
function splitCommentReference(rawValue) {
  const value = cleanInline(rawValue);
  const separator = value.indexOf(':');
  if (separator > 0 && separator < value.length - 1) {
    return {
      source: cleanInline(value.slice(0, separator)),
      title: cleanInline(value.slice(separator + 1))
    };
  }
  return {
    source: value,
    title: ''
  };
}

/**
 * Elige la lectura principal de un tipo, dando prioridad a las lecturas
 * propias de la celebración sobre las de la feria.
 */
function pickReading(readings, suffix) {
  const candidates = (readings || []).filter(
    (reading) => reading && reading.texto && reading.ref && String(reading.type).endsWith(suffix)
  );
  return (
    candidates.find((reading) => reading.type === `CELEBRATION_${suffix}`) ||
    candidates.find((reading) => reading.type === suffix) ||
    candidates[0] ||
    null
  );
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

async function generateMonth(year, month, skipped) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const days = {};
  const breviarium = new Breviarium(new Date(year, month - 1, 1, 12));

  for (let day = 1; day <= getDaysInMonth(year, month); day++) {
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(year, month - 1, day, 12);

    breviarium.setDate(date);

    try {
      const [info, evangelium, lectureSets] = await Promise.all([
        breviarium.getLiturgyInformation(),
        breviarium.getEvangelium(),
        breviarium.getLectures()
      ]);

      const gospelEntry = pickReading(evangelium?.evangelium_lectiones, 'GOSPEL');
      if (!gospelEntry) {
        skipped.push({ date: isoDate, reason: 'Sin Evangelio en la fuente local' });
        continue;
      }

      const matchingSet =
        (lectureSets || []).find(
          (set) => set.id === evangelium?.id && set.cycle === evangelium?.cycle
        ) ||
        (lectureSets || []).find((set) => set.id === evangelium?.id) ||
        (lectureSets || [])[0];

      const readings = matchingSet?.lecturas || [];
      const firstReading = pickReading(readings, 'FIRSTLECTURE');
      const psalm = pickReading(readings, 'PSALM');
      const secondReading = pickReading(readings, 'SECONDLECTURE');
      const acclamation = pickReading(readings, 'ACCLAMATION');
      const comment = pickReading(readings, 'COMMENT');

      const gospelReference = splitReference(gospelEntry.ref);
      const commentReference = splitCommentReference(comment?.ref);

      days[isoDate] = {
        date: isoDate,
        celebration: cleanInline(info.celebration),
        rank: cleanInline(info.rank),
        season: cleanInline((info.seasons || [])[0]),
        color: cleanInline(info.color),
        cycle: cleanInline(info.cycle || evangelium?.cycle),
        gospel: {
          ref: gospelReference.ref,
          title: gospelReference.title,
          text: stripHtml(gospelEntry.texto)
        },
        firstReading: firstReading ? splitReference(firstReading.ref).ref : '',
        psalm: psalm ? splitReference(psalm.ref).ref : '',
        secondReading: secondReading ? splitReference(secondReading.ref).ref : '',
        acclamation: acclamation
          ? {
              text: stripHtml(acclamation.texto),
              response: splitReference(acclamation.ref).ref
            }
          : null,
        comment: comment
          ? {
              source: commentReference.source,
              title: commentReference.title,
              text: stripHtml(comment.texto)
            }
          : null
      };
    } catch (error) {
      skipped.push({ date: isoDate, reason: String(error).slice(0, 180) });
    }
  }

  const payload = {
    month: monthKey,
    source: 'Breviarium Core (breviarium.es)',
    days
  };

  const fileName = `${monthKey}.json`;
  const json = JSON.stringify(payload);
  await writeFile(path.join(outputDir, fileName), json, 'utf8');

  return {
    monthKey,
    days: Object.keys(days).length,
    bytes: Buffer.byteLength(json)
  };
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  console.log(`Generando Evangelios de ${fromYear} a ${toYear}...`);
  const months = [];
  const skipped = [];
  let totalBytes = 0;

  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const result = await generateMonth(year, month, skipped);
      months.push(result.monthKey);
      totalBytes += result.bytes;
      console.log(
        `  ${result.monthKey}: ${result.days} días, ${(result.bytes / 1024).toFixed(1)} KB`
      );
    }
  }

  if (skipped.length) {
    console.warn(`\nDías sin datos locales (${skipped.length}); el sitio los pedirá a la API de respaldo:`);
    skipped.forEach((item) => console.warn(`  ${item.date}: ${item.reason}`));
  }

  const manifest = {
    from: fromYear,
    to: toYear,
    source: 'Breviarium Core (breviarium.es)',
    generatedAt: new Date().toISOString(),
    months,
    skipped
  };

  await writeFile(
    path.join(outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );

  console.log(
    `Listo: ${months.length} meses, ${(totalBytes / 1024 / 1024).toFixed(2)} MB en data/evangelio/.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
