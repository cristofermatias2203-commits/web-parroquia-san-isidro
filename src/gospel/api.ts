import type { LanguageCode } from '../data/site';
import { EVANGELIZO_URL, FETCH_TIMEOUT_MS, GOSPEL_API_URL } from '../config';
import { getLanguageDefinition } from '../i18n/translate';
import { readTranslatedDay, writeTranslatedDay } from './cache';
import type { RankCode } from '../i18n/dictionaries';
import type { GospelDay, TranslatedDay } from './types';

async function fetchWithTimeout(url: string, accept: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: accept } });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function cleanInline(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function rankFromText(value: string): RankCode | '' {
  const text = value.toLowerCase();
  if (/solemnidad/.test(text)) return 'SOLEMNITY';
  if (/\bfiesta\b/.test(text)) return 'FEAST';
  if (/memoria libre|memoria facultativa|memoria opcional/.test(text)) return 'OPTIONAL_MEMORIAL';
  if (/memoria/.test(text)) return 'MEMORIAL';
  if (/\bferia\b/.test(text)) return 'WEEKDAY';
  if (/domingo/.test(text)) return 'SUNDAY';
  return '';
}

function seasonFromText(text: string): string {
  const value = text.toLowerCase();
  if (/adviento/.test(value)) return 'ADVENT';
  if (/cuaresma|semana santa|miércoles de ceniza|domingo de ramos/.test(value)) return 'LENT';
  if (/triduo pascual|jueves santo|viernes santo|vigilia pascual/.test(value)) return 'EASTER_TRIDUUM';
  if (/pascua|pentecostés|ascensión/.test(value)) return 'EASTER_TIME';
  if (/navidad|epifanía|bautismo del señor/.test(value)) return 'CHRISTMAS_TIME';
  if (/tiempo ordinario|semana del tiempo ordinario/.test(value)) return 'ORDINARY_TIME';
  return '';
}

function apiHtmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  doc.querySelectorAll('script,style').forEach((element) => element.remove());

  const paragraphs = Array.from(doc.querySelectorAll('p'))
    .map((paragraph) => {
      const clone = paragraph.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
      return (clone.textContent || '')
        .replace(/\u00a0/g, ' ')
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
    })
    .filter(Boolean);

  if (!paragraphs.length) {
    return (doc.body?.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const cleaned: string[] = [];
  for (const paragraph of paragraphs) {
    if (/^(?:o\s+)?lectura breve\b/i.test(paragraph)) break;
    if (/^(?:[–—-]\s*)?(?:Palabra del Señor|¡?Aclamemos la Palabra de Dios!?)/i.test(paragraph)) break;
    cleaned.push(paragraph);
  }
  return cleaned.join('\n\n').trim();
}

interface ApiMassItem {
  key?: string;
  ref?: string;
  text?: string;
}

interface ApiResponse {
  nom?: {
    name?: string;
    rank?: string;
    line?: string;
    mass?: ApiMassItem[];
  };
}

/** Respaldo cuando falta el archivo local. Siempre viene en español (#55). */
export function normalizeApiDay(json: ApiResponse, isoDate: string): GospelDay {
  const nom = json?.nom;
  if (!nom) throw new Error('La API no devolvió datos litúrgicos.');

  const mass = Array.isArray(nom.mass) ? nom.mass : [];
  const gospel = mass.find((item) => item?.key === 'gospel' && item.text);
  if (!gospel) throw new Error('La API no devolvió el Evangelio.');

  const text = apiHtmlToText(gospel.text!);
  if (!text) throw new Error('El texto del Evangelio está vacío.');

  const first = mass.find((item) => (item?.key === 'reading' || item?.key === 'first_reading') && item.ref);
  const psalm = mass.find((item) => item?.key === 'psalm' && item.ref);
  const second = mass.find((item) => item?.key === 'second_reading' && item.ref);
  const rankText = cleanInline(nom.rank);
  const mappedRank = rankFromText(rankText);

  return {
    date: isoDate,
    celebration: cleanInline(nom.name) || 'Calendario Litúrgico',
    rank: mappedRank,
    // Sin mapeo se conserva la etiqueta original, avisando de que es española.
    rankLabel: mappedRank ? '' : rankText,
    season: seasonFromText(`${nom.name || ''} ${nom.line || ''}`),
    liturgicalTitle: '',
    color: '',
    cycle: '',
    gospel: { ref: cleanInline(gospel.ref), title: '', text },
    firstReading: cleanInline(first?.ref),
    psalm: cleanInline(psalm?.ref),
    secondReading: cleanInline(second?.ref),
    acclamation: null,
    comment: null,
    sourceLanguage: 'es',
  };
}

export async function loadDayFromApi(isoDate: string): Promise<GospelDay> {
  const response = await fetchWithTimeout(
    `${GOSPEL_API_URL}?date=${encodeURIComponent(isoDate)}&locale=es`,
    'application/json'
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return normalizeApiDay((await response.json()) as ApiResponse, isoDate);
}

function xmlField(doc: Document, tag: string): string {
  const node = doc.querySelector(tag);
  if (!node) return '';
  return String(node.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Lecturas completas y comentario en el idioma activo (Evangelizo Feed v2). */
export async function loadEvangelizoDay(isoDate: string, lang: LanguageCode): Promise<TranslatedDay> {
  const evangelizoCode = getLanguageDefinition(lang).evangelizo;
  if (!evangelizoCode) throw new Error('No hay fuente bíblica para este idioma.');

  const cached = readTranslatedDay(isoDate, lang);
  if (cached) return cached;

  const compactDate = isoDate.replace(/-/g, '');
  const response = await fetchWithTimeout(
    `${EVANGELIZO_URL}?date=${compactDate}&type=xml&lang=${evangelizoCode}`,
    'application/xml, text/xml'
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('La respuesta XML no es válida.');

  const field = (tag: string) => xmlField(doc, tag);
  const gospelText = field('reading_gospel');
  if (!gospelText) throw new Error('Evangelizo no devolvió el Evangelio.');

  const readings = [
    { key: 'first' as const, label: 'Primera lectura', ref: field('reading_text1_st'), title: field('reading_text1_lt'), text: field('reading_text1') },
    { key: 'psalm' as const, label: 'Salmo', ref: field('reading_text2_st'), title: field('reading_text2_lt'), text: field('reading_text2') },
    { key: 'second' as const, label: 'Segunda lectura', ref: field('reading_text3_st'), title: field('reading_text3_lt'), text: field('reading_text3') },
  ].filter((reading) => reading.text);

  const commentText = field('comment');
  const day: TranslatedDay = {
    date: isoDate,
    celebration: field('saint'),
    liturgicalTitle: field('litugic_t'),
    gospel: {
      ref: field('reading_gospel_st'),
      title: '',
      longTitle: field('reading_gospel_lt'),
      text: gospelText,
    },
    readings,
    acclamation: null,
    comment: commentText
      ? { text: commentText, title: field('comment_t'), source: field('comment_s') }
      : null,
  };

  writeTranslatedDay(isoDate, lang, day);
  return day;
}
