import dictionariesJson from './dictionaries.json';
import type { LanguageCode } from '../data/site';

export type UiKey = keyof typeof dictionariesJson.ui.es;
export type MetaKey = keyof typeof dictionariesJson.meta.es;
export type SeasonCode = keyof typeof dictionariesJson.seasons.es;
export type RankCode = keyof typeof dictionariesJson.ranks.es;
export type MeditationCode = keyof typeof dictionariesJson.meditations.es;
export type GospelBookKey = keyof typeof dictionariesJson.gospelBooks.es;

export type UiDictionary = Record<UiKey, string>;
export type MetaDictionary = Record<MetaKey, string>;
export type SeasonDictionary = Record<SeasonCode, string>;
export type RankDictionary = Record<RankCode, string>;
export type MeditationDictionary = Record<MeditationCode, string>;
export type GospelBookDictionary = Record<GospelBookKey, string>;

export interface LanguageDefinition {
  code: LanguageCode;
  label: string;
  locale: string;
  evangelizo: string;
  dir: 'ltr' | 'rtl';
}

interface I18nData {
  defaultLanguage: LanguageCode;
  languages: LanguageDefinition[];
  meta: Record<LanguageCode, MetaDictionary>;
  seasons: Record<LanguageCode, SeasonDictionary>;
  ranks: Record<LanguageCode, RankDictionary>;
  meditations: Record<LanguageCode, MeditationDictionary>;
  gospelBooks: Record<LanguageCode, GospelBookDictionary>;
  ui: Record<LanguageCode, UiDictionary>;
}

// TypeScript infiere `string` en lugar de uniones literales al importar JSON;
// el cast recupera los tipos derivados de la clave `es`. La paridad real se
// comprueba con `bun run check:i18n` (incluido en `bun run check`).
export const dictionaries = dictionariesJson as I18nData;

export const languageDefinitions = dictionaries.languages;
export const defaultLanguage = dictionaries.defaultLanguage;
