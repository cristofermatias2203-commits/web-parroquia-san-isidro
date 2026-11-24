import type { LanguageCode } from '../data/site';

export interface GospelText {
  ref: string;
  title?: string;
  longTitle?: string;
  text: string;
}

export interface Reading {
  key: 'first' | 'psalm' | 'second';
  label: string;
  ref: string;
  title?: string;
  text: string;
}

export interface Comment {
  text: string;
  title?: string;
  source?: string;
}

export interface Acclamation {
  text: string;
  response?: string;
}

export interface GospelDay {
  date: string;
  celebration: string;
  rank: string;
  rankLabel: string;
  season: string;
  liturgicalTitle?: string;
  color?: string;
  cycle?: string;
  gospel: GospelText;
  firstReading?: string;
  psalm?: string;
  secondReading?: string;
  acclamation?: Acclamation | null;
  comment?: Comment | null;
  readings?: Reading[];
  /** Idioma del texto recibido; permite avisar cuando viene de la API en español. */
  sourceLanguage: LanguageCode;
}

export interface GospelMonth {
  month: string;
  source?: string;
  days: Record<string, GospelDay>;
}

export interface TranslatedDay {
  date: string;
  celebration: string;
  liturgicalTitle?: string;
  gospel: GospelText;
  readings?: Reading[];
  acclamation?: Acclamation | null;
  comment?: Comment | null;
}
