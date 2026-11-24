import { DAY_CHECK_MS, FADE_MS, MAX_NEXT_DAYS } from '../config';
import type { LanguageCode } from '../data/site';
import { getLanguage, seasonLabel, t } from '../i18n/translate';
import type { StatusController } from '../ui/status';
import { loadEvangelizoDay } from './api';
import { loadDay } from './loader';
import {
  addDays,
  dateInParishTimeZone,
  formatLongDate,
  getGospelCitation,
  getLiturgicalTitle,
  renderAcclamation,
  renderDateLabel,
  renderGospelText,
  renderReadings,
  renderReflection,
} from './render';
import type { GospelDay, TranslatedDay } from './types';

interface GospelElements {
  citation: HTMLElement | null;
  verse: HTMLElement | null;
  reflection: HTMLElement | null;
  season: HTMLElement | null;
  title: HTMLElement | null;
  acclamation: HTMLElement | null;
  readings: HTMLElement | null;
  dateFull: HTMLElement | null;
  parishDate: HTMLElement | null;
  body: HTMLElement | null;
  card: HTMLElement | null;
  btnToday: HTMLButtonElement | null;
  btnNext: HTMLButtonElement | null;
}

function query<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function byId<T extends HTMLElement>(id: string): T | null {
  return query<T>(id);
}

export class GospelController {
  private readonly elements: GospelElements = {
    citation: byId('gospelCitation'),
    verse: byId('gospelVerse'),
    reflection: byId('gospelReflection'),
    season: byId('liturgicalSeason'),
    title: byId('gospelLiturgicalTitle'),
    acclamation: byId('gospelAcclamation'),
    readings: byId('gospelReadings'),
    dateFull: byId('gospelDateFull'),
    parishDate: byId('parishCurrentDate'),
    body: document.querySelector<HTMLElement>('.gospel-body'),
    card: document.querySelector<HTMLElement>('.gospel-card-wrapper'),
    btnToday: byId<HTMLButtonElement>('btnTodayGospel'),
    btnNext: byId<HTMLButtonElement>('btnNextReading'),
  };

  private todayIso = dateInParishTimeZone(new Date());
  private currentOffset = 0;
  private currentDay: GospelDay | null = null;
  private requestToken = 0;
  private fadeTimer: number | undefined;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private readonly status: StatusController) {}

  init(): void {
    this.updateParishDate();
    this.elements.btnToday?.addEventListener('click', (event) => {
      event.preventDefault();
      if (this.currentOffset === 0 && this.currentDay) {
        this.transition(() => this.renderDay(this.currentDay!, 0, this.todayIso));
        return;
      }
      void this.showDay(0);
    });

    this.elements.btnNext?.addEventListener('click', (event) => {
      event.preventDefault();
      const next = this.currentOffset >= MAX_NEXT_DAYS ? 0 : this.currentOffset + 1;
      void this.showDay(next);
    });

    void this.showDay(0);

    window.setInterval(() => {
      const nowIso = dateInParishTimeZone(new Date());
      if (nowIso === this.todayIso) return;
      this.todayIso = nowIso;
      this.updateParishDate();
      if (this.currentOffset === 0) void this.showDay(0);
    }, DAY_CHECK_MS);
  }

  /** Al cambiar de idioma se recarga el día visible con sus lecturas traducidas. */
  refreshLanguage(): void {
    this.updateParishDate();
    void this.showDay(this.currentOffset, { silent: true });
  }

  private updateParishDate(): void {
    if (this.elements.parishDate) {
      this.elements.parishDate.textContent = formatLongDate(this.todayIso, getLanguage());
    }
  }

  private setLoading(loading: boolean): void {
    this.elements.card?.classList.toggle('is-loading', loading);
    this.elements.card?.setAttribute('aria-busy', String(loading));
    if (this.elements.btnToday) this.elements.btnToday.disabled = loading;
    if (this.elements.btnNext) this.elements.btnNext.disabled = loading;
  }

  /** Cancela cualquier transición pendiente y deja la tarjeta legible (#53). */
  private resetTransition(): void {
    if (this.fadeTimer !== undefined) {
      window.clearTimeout(this.fadeTimer);
      this.fadeTimer = undefined;
    }
    if (this.elements.body) {
      this.elements.body.style.opacity = '';
      this.elements.body.style.transition = '';
    }
  }

  private transition(callback: () => void): void {
    this.resetTransition();
    const body = this.elements.body;
    if (!body || this.reducedMotion) {
      callback();
      return;
    }

    body.style.opacity = '0.15';
    body.style.transition = `opacity ${FADE_MS}ms ease`;
    this.fadeTimer = window.setTimeout(() => {
      this.fadeTimer = undefined;
      try {
        callback();
      } finally {
        body.style.opacity = '1';
      }
    }, FADE_MS);
  }

  private async showDay(offset: number, options: { silent?: boolean } = {}): Promise<void> {
    const requestId = ++this.requestToken;
    const lang = getLanguage();
    const isoDate = addDays(this.todayIso, offset);

    this.resetTransition();
    this.setLoading(true);
    if (!options.silent) this.status.show('Cargando el Evangelio…', 'info');

    try {
      const base = await loadDay(isoDate);
      if (requestId !== this.requestToken) return;

      let content = base;
      let notice = '';

      // En español los archivos locales ya son la fuente: no se pisan con los
      // datos de Evangelizo (#55).
      if (lang !== 'es') {
        try {
          const translated: TranslatedDay = await loadEvangelizoDay(isoDate, lang);
          content = {
            ...base,
            celebration: translated.celebration || base.celebration,
            liturgicalTitle: translated.liturgicalTitle,
            gospel: {
              ...base.gospel,
              ref: translated.gospel?.ref || base.gospel.ref,
              longTitle: translated.gospel?.longTitle,
              text: translated.gospel?.text || base.gospel.text,
            },
            readings: translated.readings || [],
            acclamation: translated.acclamation,
            comment: translated.comment,
          };
        } catch {
          notice = 'La traducción no está disponible en este momento. Se muestra el texto en español.';
        }
      }

      if (requestId !== this.requestToken) return;
      this.currentOffset = offset;
      this.currentDay = content;

      this.transition(() => {
        if (requestId !== this.requestToken) return;
        this.renderDay(content, offset, isoDate);
      });
      if (notice) this.status.show(notice, 'info');
    } catch (error) {
      if (requestId !== this.requestToken) return;
      console.error('No se pudo cargar el Evangelio:', error);
      if (this.currentDay) {
        this.status.show('No se pudo cargar el día solicitado. Inténtalo de nuevo.', 'error');
      } else {
        this.renderError(isoDate);
      }
    } finally {
      if (requestId === this.requestToken) this.setLoading(false);
    }
  }

  private renderDay(data: GospelDay, offset: number, isoDate: string): void {
    const lang: LanguageCode = getLanguage();
    const elements = this.elements;

    if (elements.citation) elements.citation.textContent = getGospelCitation(data, lang);
    if (elements.verse) elements.verse.innerHTML = renderGospelText(data.gospel?.text || '', lang);
    if (elements.readings) elements.readings.innerHTML = renderReadings(data, lang);
    if (elements.reflection) elements.reflection.innerHTML = renderReflection(data, lang);
    if (elements.season) elements.season.textContent = seasonLabel(data.season, lang);
    if (elements.title) elements.title.textContent = getLiturgicalTitle(data, lang);

    if (elements.acclamation) {
      const html = renderAcclamation(data, lang);
      elements.acclamation.innerHTML = html;
      elements.acclamation.style.display = html ? '' : 'none';
    }

    if (elements.dateFull) {
      elements.dateFull.innerHTML = renderDateLabel(isoDate, offset === 0, lang);
    }
    this.updateParishDate();
  }

  private renderError(isoDate: string): void {
    const lang = getLanguage();
    const elements = this.elements;

    if (elements.citation) elements.citation.textContent = t('Evangelio no disponible', lang);
    if (elements.verse) {
      elements.verse.textContent = t('No fue posible cargar el Evangelio de este día. Revisa tu conexión y vuelve a intentarlo.', lang);
    }
    if (elements.readings) elements.readings.innerHTML = '';
    if (elements.reflection) elements.reflection.innerHTML = '';
    if (elements.title) elements.title.textContent = t('Calendario Litúrgico', lang);
    if (elements.season) elements.season.textContent = t('Tiempo Litúrgico', lang);
    if (elements.acclamation) {
      elements.acclamation.innerHTML = '';
      elements.acclamation.style.display = 'none';
    }
    if (elements.dateFull) elements.dateFull.innerHTML = renderDateLabel(isoDate, false, lang);

    this.status.show('No se pudo cargar el Evangelio. Comprueba tu conexión y vuelve a intentarlo.', 'error');
  }
}
