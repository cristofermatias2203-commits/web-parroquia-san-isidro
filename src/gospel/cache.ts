import { CACHE_TTL_MS, GOSPEL_CACHE_PREFIX, TRANSLATED_CACHE_PREFIX } from '../config';
import type { GospelDay, TranslatedDay } from './types';

interface CacheEntry<T> {
  savedAt: number;
  data: T;
}

// La poda se ejecuta una sola vez por sesión, no en cada escritura (#60).
let prunedThisSession = false;

function prefixes(): string[] {
  return [GOSPEL_CACHE_PREFIX, TRANSLATED_CACHE_PREFIX];
}

export function pruneGospelCache(force = false): void {
  if (prunedThisSession && !force) return;
  prunedThisSession = true;

  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && prefixes().some((prefix) => key.startsWith(prefix))) keys.push(key);
    }

    const now = Date.now();
    keys.forEach((key) => {
      try {
        const entry = JSON.parse(localStorage.getItem(key) || 'null') as CacheEntry<unknown> | null;
        if (!entry || now - Number(entry.savedAt || 0) > CACHE_TTL_MS) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignorar errores de almacenamiento.
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T> | null;
    if (!entry?.data) return null;
    if (Date.now() - Number(entry.savedAt || 0) > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data } satisfies CacheEntry<T>));
  } catch {
    // Cuota agotada: podar una vez y volver a intentarlo.
    pruneGospelCache(true);
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data } satisfies CacheEntry<T>));
    } catch {
      // Sin caché disponible; el contenido sigue siendo utilizable en memoria.
    }
  }
}

/** Solo se usa para respuestas de red; los datos locales no se duplican (#60). */
export function readCachedDay(isoDate: string): GospelDay | null {
  return read<GospelDay>(`${GOSPEL_CACHE_PREFIX}${isoDate}`);
}

export function writeCachedDay(isoDate: string, data: GospelDay): void {
  write(`${GOSPEL_CACHE_PREFIX}${isoDate}`, data);
}

export function readTranslatedDay(isoDate: string, lang: string): TranslatedDay | null {
  return read<TranslatedDay>(`${TRANSLATED_CACHE_PREFIX}${lang}:${isoDate}`);
}

export function writeTranslatedDay(isoDate: string, lang: string, data: TranslatedDay): void {
  write(`${TRANSLATED_CACHE_PREFIX}${lang}:${isoDate}`, data);
}
