import type { LanguageCode } from '../data/site';
import { PARISH_TIME_ZONE } from '../config';
import { publicPath } from '../paths';
import { getLocale } from '../i18n/translate';
import { cleanInline } from './api';
import {
  gospelBook,
  gospelCitationTemplate,
  meditation,
  rankLabel,
  seasonLabel,
  t,
} from '../i18n/translate';
import type { GospelDay } from './types';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

function withBreaks(value: unknown): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

export function formatGospelCitation(ref: string, lang: LanguageCode): string {
  const value = cleanInline(ref);
  const match = value.match(/^(\S+)\s+(.+)$/);
  if (!match) return t('Santo Evangelio del Día', lang);

  const bookKey = match[1].replace(/\.$/, '');
  return gospelCitationTemplate(lang)
    .replace('{book}', gospelBook(bookKey, lang))
    .replace('{ref}', match[2]);
}

export function getGospelCitation(data: GospelDay, lang: LanguageCode): string {
  if (lang !== 'es') {
    const longTitle = cleanInline(data.gospel?.longTitle).replace(/[\s.]+$/, '');
    if (longTitle) return longTitle;
    const ref = cleanInline(data.gospel?.ref);
    if (ref && !/^\d/.test(ref)) return formatGospelCitation(ref, lang);
  }
  return formatGospelCitation(data.gospel?.ref || '', lang);
}

export function getLiturgicalTitle(data: GospelDay, lang: LanguageCode): string {
  if (lang !== 'es' && data.liturgicalTitle) return cleanInline(data.liturgicalTitle);

  const season = seasonLabel(data.season, lang);
  let celebration = cleanInline(data.celebration);

  if (!celebration) {
    celebration = season
      ? `${rankLabel('WEEKDAY', lang)} · ${season}` // #51: usa la rango traducida
      : t('Calendario Litúrgico', lang);
  } else if (/^\d{1,2} de [a-záéíóúñ]+$/i.test(celebration)) {
    celebration = season
      ? `${rankLabel('WEEKDAY', lang)} · ${season}`
      : t('Tiempo Litúrgico', lang);
  }

  const label = data.rankLabel || rankLabel(data.rank, lang);
  const includeRank = data.rankLabel
    ? !/^feria$/i.test(label)
    : ['MEMORIAL', 'OPTIONAL_MEMORIAL', 'FEAST', 'SOLEMNITY'].includes(data.rank);

  return [celebration, includeRank ? label : ''].filter(Boolean).join(' · ') || t('Calendario Litúrgico', lang);
}

export function renderGospelText(text: string, lang: LanguageCode): string {
  const value = String(text ?? '').trim();
  if (!value) return escapeHtml(t('El texto del Evangelio no está disponible.', lang));
  return withBreaks(value);
}

export function renderReadings(data: GospelDay, lang: LanguageCode): string {
  if (!Array.isArray(data.readings) || !data.readings.length) return '';

  return data.readings.map((reading) => {
    const label = escapeHtml(t(reading.label, lang));
    const ref = cleanInline(reading.ref);
    const refHtml = ref ? ` <span class="gospel-reading-ref">${escapeHtml(ref)}</span>` : '';
    return `<details class="gospel-reading">
      <summary><span class="gospel-reading-label">${label}</span>${refHtml}</summary>
      <div class="gospel-reading-text">${withBreaks(reading.text)}</div>
    </details>`;
  }).join('');
}

export function renderAcclamation(data: GospelDay, lang: LanguageCode): string {
  const parts: string[] = [];

  if (data.acclamation?.text) {
    parts.push(`<span class="gospel-acclamation-text">&laquo;${withBreaks(data.acclamation.text)}&raquo;</span>`);
  }

  if (!Array.isArray(data.readings) || !data.readings.length) {
    const references: string[] = [];
    if (data.firstReading) references.push(`${t('Primera lectura', lang)}: ${escapeHtml(data.firstReading)}`);
    if (data.psalm) references.push(`${t('Salmo', lang)}: ${escapeHtml(data.psalm)}`);
    if (data.secondReading) references.push(`${t('Segunda lectura', lang)}: ${escapeHtml(data.secondReading)}`);
    if (references.length) {
      parts.push(`<span class="gospel-readings-refs">${references.join(' &middot; ')}</span>`);
    }
  }

  return parts.join('');
}

export function renderReflection(data: GospelDay, lang: LanguageCode): string {
  const word = escapeHtml(t('Palabra del Señor.', lang));

  if (data.comment?.text) {
    const source = [data.comment.source, data.comment.title].filter(Boolean).join(': ');
    const attribution = source
      ? ` <span class="gospel-reflection-source">&mdash; ${escapeHtml(source)}</span>`
      : '';
    return `<strong>${word} &bull; ${escapeHtml(t('Comentario de la Tradición', lang))}:</strong> ${withBreaks(data.comment.text)}${attribution}`;
  }

  return `<strong>${word} &bull; ${escapeHtml(t('Meditación Parroquial', lang))}:</strong> ${escapeHtml(meditation(data.season, lang))}`;
}

export function renderDateLabel(isoDate: string, isToday: boolean, lang: LanguageCode): string {
  const dateText = escapeHtml(formatLongDate(isoDate, lang));
  if (!isToday) {
    return `<svg aria-hidden="true"><use href="${publicPath('/icons/sprite.svg')}#far-calendar-alt"></use></svg> ${dateText}`;
  }
  return `<svg aria-hidden="true" style="color:var(--color-gold)"><use href="${publicPath('/icons/sprite.svg')}#far-calendar-check"></use></svg> ${dateText} (${escapeHtml(t('Hoy', lang))})`;
}

const WEEKDAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function formatLongDate(isoDate: string, lang: LanguageCode): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const locale = getLocale(lang);

  try {
    const formatted = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      numberingSystem: 'latn',
    }).format(date);
    return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
  } catch {
    return `${WEEKDAYS_ES[date.getUTCDay()]}, ${day} de ${MONTHS_ES[month - 1]} de ${year}`;
  }
}

export function dateInParishTimeZone(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: PARISH_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}
