import { GOSPEL_DATA_PATH, SCRIPT_TIMEOUT_MS } from '../config';
import { readCachedDay, writeCachedDay } from './cache';
import { loadDayFromApi } from './api';
import type { GospelDay, GospelMonth } from './types';

const monthRequests = new Map<string, Promise<GospelMonth>>();

function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/**
 * Los archivos generados son JSON válido (F4): se descargan y se parsean
 * directamente, sin wrapper de script ni window.PARISH_GOSPEL_MONTHS (#63).
 */
async function parseMonthFile(monthKey: string, response: Response): Promise<GospelMonth> {
  const month = (await response.json()) as GospelMonth;
  if (month?.month !== monthKey || !month.days) {
    throw new Error(`El archivo ${monthKey} no contiene los datos esperados.`);
  }
  return month;
}

function loadMonth(monthKey: string): Promise<GospelMonth> {
  const cached = monthRequests.get(monthKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SCRIPT_TIMEOUT_MS);
  const request = fetch(`${GOSPEL_DATA_PATH}/${monthKey}.json`, { signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseMonthFile(monthKey, response);
    })
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
