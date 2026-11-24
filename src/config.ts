/** Constantes compartidas por la lógica de cliente (issue #61). */

export const MOBILE_BREAKPOINT = 768;
export const SCRIPT_TIMEOUT_MS = 8_000;
export const FETCH_TIMEOUT_MS = 9_000;
export const FADE_MS = 220;
export const STATUS_DELAY_MS = 1_500;
export const DAY_CHECK_MS = 60_000;
export const MAX_NEXT_DAYS = 7;

export const PARISH_TIME_ZONE = 'America/Santo_Domingo';
export const CACHE_TTL_MS = 60 * 24 * 60 * 60 * 1_000;

export const LANGUAGE_STORAGE_KEY = 'parroquia:idioma';
export const GOSPEL_CACHE_PREFIX = 'parroquia:evangelio:v1:';
export const TRANSLATED_CACHE_PREFIX = 'parroquia:evangelio:v2:';

export const GOSPEL_API_URL = 'https://categpt.chat/api/v1/feast';
export const EVANGELIZO_URL = 'https://feed.evangelizo.org/v2/reader.php';
// F4 sustituirá estos archivos por JSON; la ruta se calcula en un único sitio.
export const GOSPEL_DATA_PATH = `${import.meta.env.BASE_URL}data/evangelio`;
