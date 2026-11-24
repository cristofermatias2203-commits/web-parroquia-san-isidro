import { languageCodes, type LanguageCode } from '../data/site';
import { LANGUAGE_STORAGE_KEY } from '../config';
import {
  defaultLanguage,
  dictionaries,
  languageDefinitions,
  type GospelBookKey,
  type MeditationCode,
  type RankCode,
  type SeasonCode,
} from './dictionaries';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (languageCodes as readonly string[]).includes(value);
}

export function getLanguageDefinition(code: LanguageCode) {
  return languageDefinitions.find((language) => language.code === code)!;
}

export function getLocale(code: LanguageCode): string {
  return getLanguageDefinition(code).locale;
}

export function getDirection(code: LanguageCode): 'ltr' | 'rtl' {
  return getLanguageDefinition(code).dir;
}

/** Idioma guardado o, en su defecto, el primero compatible del navegador. */
export function detectInitialLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguageCode(stored)) return stored;
  } catch {
    // localStorage puede estar deshabilitado.
  }

  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language || defaultLanguage];

  for (const candidate of candidates) {
    const base = String(candidate).toLowerCase().split('-')[0];
    if (isLanguageCode(base)) return base;
  }
  return defaultLanguage;
}

export function persistLanguage(code: LanguageCode): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Ignorar almacenamiento deshabilitado.
  }
}

let currentLanguage: LanguageCode = defaultLanguage;

export function getLanguage(): LanguageCode {
  return currentLanguage;
}

export function setLanguage(code: LanguageCode): void {
  currentLanguage = isLanguageCode(code) ? code : defaultLanguage;
}

/** Traduce una cadena fuente en español al idioma activo (o al indicado). */
export function t(source: string, lang: LanguageCode = currentLanguage): string {
  if (lang === defaultLanguage) return source;
  const dictionary = dictionaries.ui[lang] as Record<string, string | undefined>;
  if (dictionary[source]) return dictionary[source];

  // Algunas entidades HTML del origen no llegan al DOM como texto literal.
  const alias = source.replace(/©/g, '&copy;').replace(/•/g, '&bull;');
  return dictionary[alias] || source;
}

type InterpolationValues = Record<string, string | Node>;

function appendInterpolated(target: Node, template: string, values: InterpolationValues): void {
  const pattern = /\{(\w+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(template))) {
    if (match.index > lastIndex) {
      target.appendChild(document.createTextNode(template.slice(lastIndex, match.index)));
    }
    const value = values[match[1]];
    if (value instanceof Node) target.appendChild(value.cloneNode(true));
    else target.appendChild(document.createTextNode(String(value ?? match[0])));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    target.appendChild(document.createTextNode(template.slice(lastIndex)));
  }
}

/** Formatea una clave i18n con variables. Devuelve texto o un fragmento si hay nodos. */
export function translateWith(source: string, values: InterpolationValues = {}, lang = currentLanguage): string | DocumentFragment {
  const message = t(source, lang);
  if (!Object.keys(values).length) return message;
  if (!Object.values(values).some((value) => value instanceof Node)) {
    return message.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(values[key] ?? placeholder));
  }
  const fragment = document.createDocumentFragment();
  appendInterpolated(fragment, message, values);
  return fragment;
}

export function getMeta(lang = currentLanguage) {
  return dictionaries.meta[lang];
}

export function seasonLabel(season: string, lang = currentLanguage): string {
  const seasons = dictionaries.seasons[lang] as Record<string, string | undefined>;
  return seasons[season] || t('Tiempo Litúrgico', lang);
}

export function rankLabel(rank: string, lang = currentLanguage): string {
  if (!rank) return '';
  const ranks = dictionaries.ranks[lang] as Record<string, string | undefined>;
  return ranks[rank] || '';
}

export function meditation(season: string, lang = currentLanguage): string {
  const meditations = dictionaries.meditations[lang] as Record<string, string | undefined>;
  return meditations[season]
    || meditations.ORDINARY_TIME
    || dictionaries.meditations.es.ORDINARY_TIME;
}

export function gospelBook(key: string, lang = currentLanguage): string {
  const books = dictionaries.gospelBooks[lang] as Record<string, string | undefined>;
  return books[key] || key;
}

export function gospelCitationTemplate(lang = currentLanguage): string {
  return t('Santo Evangelio según {book} ({ref})', lang);
}

export const defaultLanguageCode = defaultLanguage;
export type { GospelBookKey, MeditationCode, RankCode, SeasonCode };
