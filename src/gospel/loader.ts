import { GOSPEL_DATA_PATH, SCRIPT_TIMEOUT_MS } from '../config';
import { readCachedDay, writeCachedDay } from './cache';
import { loadDayFromApi } from './api';
import type { GospelDay, GospelMonth } from './types';

const monthRequests = new Map<string, Promise<GospelMonth>>();

function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/**
 * Los archivos generados siguen siendo scripts de la versión estática. Se
 * descargan como texto y se parsea el objeto JSON que contienen: ni etiquetas
 * <script> huérfanas ni window.PARISH_GOSPEL_MONTHS (#63). F4 los convertirá a
 * JSON y bastará con cambiar la extensión en GOSPEL_DATA_PATH.
 */
async function parseMonthFile(monthKey: string, text: string): Promise<GospelMonth> {
  const marker = `window.PARISH_GOSPEL_MONTHS["${monthKey}"] =`;
  const assignment = text.indexOf(marker);
  if (assignment < 0) throw new Error(`El archivo ${monthKey} no tiene el formato esperado.`);

  const start = text.indexOf('{', assignment + marker.length);
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`El archivo ${monthKey} no contiene un objeto JSON.`);

  const month = JSON.parse(text.slice(start, end + 1)) as GospelMonth;
  if (!month.days) throw new Error(`El archivo ${monthKey} no contiene días.`);
  return month;
}

function loadMonth(monthKey: string): Promise<GospelMonth> {
  const cached = monthRequests.get(monthKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SCRIPT_TIMEOUT_MS);
  const request = fetch(`${GOSPEL_DATA_PATH}/${monthKey}.js`, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((text) => parseMonthFile(monthKey, text))
    .finally(() => window.clearTimeout(timeout))
    .catch((error: unknown) => {
      monthRequests.delete(monthKey);
      throw error;
    });

  monthRequests.set(monthKey, request);
  return request;
}

function withSpanishSource(day: GospelDay): GospelDay {
  return { ...day, sourceLanguage: 'es' };
}

/** Prioriza los archivos locales; la API y la caché son solo respaldos. */
export async function loadDay(isoDate: string): Promise<GospelDay> {
  try {
    const month = await loadMonth(monthKeyOf(isoDate));
    const day = month.days?.[isoDate];
    if (!day?.gospel?.text) throw new Error(`No hay datos locales para ${isoDate}.`);
    // Los datos locales se recargan gratis: no se escriben en localStorage (#60).
    return withSpanishSource(day);
  } catch (localError) {
    try {
      const day = await loadDayFromApi(isoDate);
      writeCachedDay(isoDate, day);
      return day;
    } catch (apiError) {
      const cached = readCachedDay(isoDate);
      if (cached) return cached;
      const detail = (error: unknown) => (error instanceof Error ? error.message : String(error));
      throw new Error(`No se pudo cargar ${isoDate}. Local: ${detail(localError)}. API: ${detail(apiError)}`);
    }
  }
}
