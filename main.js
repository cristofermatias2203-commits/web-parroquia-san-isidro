/**
 * Script Interactivo - Parroquia San Isidro Labrador de Maimón
 * Estilo institucional vaticano con Evangelio del Día Litúrgico Real
 */

document.addEventListener('DOMContentLoaded', () => {
  const PARISH_EMAIL = 'parroquiasanisidromaimon@diocesisdelavega.do';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getFocusable = (container) => Array.from(
    container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
  ).filter(el => el.offsetParent !== null || el === document.activeElement);

  const trapFocus = (event, container) => {
    if (event.key !== 'Tab') return;
    const focusable = getFocusable(container);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const setStatus = (el, message, type) => {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('is-info', 'is-success', 'is-error');
    if (type) el.classList.add(`is-${type}`);
    el.hidden = false;
  };

  const buildMailto = (subject, lines) => {
    const body = lines.join('\r\n');
    return `mailto:${PARISH_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // 0. Selector de idiomas y traducción de la interfaz
  const I18N = window.PARISH_I18N || null;
  const I18N_LANGUAGES = I18N ? I18N.languages : [];
  const LANG_BY_CODE = Object.fromEntries(I18N_LANGUAGES.map((language) => [language.code, language]));
  const DEFAULT_LANGUAGE = (I18N && I18N.defaultLanguage) || 'es';
  const LANGUAGE_STORAGE_KEY = 'parroquia:idioma';

  const normalizeTranslatableText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const detectInitialLanguage = () => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && LANG_BY_CODE[stored]) return stored;
    } catch (error) {
      // localStorage puede estar deshabilitado.
    }

    const candidates = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || DEFAULT_LANGUAGE];

    for (const candidate of candidates) {
      const base = String(candidate).toLowerCase().split('-')[0];
      if (LANG_BY_CODE[base]) return base;
    }
    return DEFAULT_LANGUAGE;
  };

  let currentLang = detectInitialLanguage();

  const getCurrentLocale = () => (LANG_BY_CODE[currentLang] && LANG_BY_CODE[currentLang].locale) || 'es-DO';

  // Devuelve la traducción de una cadena española para el idioma activo.
  const lookupTranslation = (dictionary, source) => {
    if (!dictionary) return source;
    if (dictionary[source]) return dictionary[source];

    // Algunas entidades HTML del origen no llegan al DOM como texto literal.
    const alias = source.replace(/©/g, '&copy;').replace(/•/g, '&bull;');
    return dictionary[alias] || source;
  };

  const t = (source) => {
    if (!I18N || currentLang === DEFAULT_LANGUAGE) return source;
    return lookupTranslation(I18N.ui && I18N.ui[currentLang], source);
  };

  // Nodos de texto y atributos que se traducen al cambiar de idioma.
  const translatableTextNodes = [];
  const translatableAttributes = [];
  const SKIP_TRANSLATION_SELECTOR = [
    '[data-i18n-skip]',
    '#parishCurrentDate',
    '#gospelDateFull',
    '#gospelLiturgicalTitle',
    '#gospelCitation',
    '#gospelAcclamation',
    '#gospelReadings',
    '#gospelVerse',
    '#gospelReflection',
    '#gospelStatus',
    '#formStatus',
    '#intentionStatus',
    '#lightboxCaption'
  ].join(',');
  const SKIP_TRANSLATION_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);

  const registerTranslatableContent = () => {
    if (!I18N) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TRANSLATION_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest(SKIP_TRANSLATION_SELECTOR)) return NodeFilter.FILTER_REJECT;
        if (!normalizeTranslatableText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    while ((node = walker.nextNode())) {
      translatableTextNodes.push({ node, source: normalizeTranslatableText(node.nodeValue) });
    }

    document.querySelectorAll('[placeholder], [title], [aria-label], [alt], [data-caption]').forEach((element) => {
      if (element.closest(SKIP_TRANSLATION_SELECTOR)) return;
      ['placeholder', 'title', 'aria-label', 'alt', 'data-caption'].forEach((name) => {
        if (!element.hasAttribute(name)) return;
        const source = normalizeTranslatableText(element.getAttribute(name));
        if (source) translatableAttributes.push({ element, name, source });
      });
    });
  };

  const applyInterfaceLanguage = () => {
    if (!I18N) return;
    const dictionary = currentLang === DEFAULT_LANGUAGE ? null : (I18N.ui && I18N.ui[currentLang]);

    translatableTextNodes.forEach(({ node, source }) => {
      if (!node.isConnected) return;
      const translated = lookupTranslation(dictionary, source);
      const raw = node.nodeValue || '';
      const leading = raw.match(/^\s*/)[0];
      const trailing = raw.match(/\s*$/)[0];
      const next = leading + translated + trailing;
      if (node.nodeValue !== next) node.nodeValue = next;
    });

    translatableAttributes.forEach(({ element, name, source }) => {
      if (!element.isConnected) return;
      const translated = lookupTranslation(dictionary, source);
      if (element.getAttribute(name) !== translated) element.setAttribute(name, translated);
    });
  };

  const metaSelectors = {
    description: 'meta[name="description"]',
    ogTitle: 'meta[property="og:title"]',
    ogDescription: 'meta[property="og:description"]',
    twitterTitle: 'meta[name="twitter:title"]',
    twitterDescription: 'meta[name="twitter:description"]'
  };
  const originalMeta = { title: document.title };
  Object.entries(metaSelectors).forEach(([key, selector]) => {
    const element = document.querySelector(selector);
    originalMeta[key] = element ? element.getAttribute('content') : '';
  });

  const setMetaContent = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value) element.setAttribute('content', value);
  };

  const applyDocumentMeta = () => {
    const meta = currentLang === DEFAULT_LANGUAGE ? null : (I18N && I18N.meta && I18N.meta[currentLang]);
    document.title = (meta && meta.title) || originalMeta.title;
    setMetaContent(metaSelectors.description, (meta && meta.description) || originalMeta.description);
    setMetaContent(metaSelectors.ogTitle, (meta && meta.title) || originalMeta.ogTitle);
    setMetaContent(metaSelectors.ogDescription, (meta && meta.description) || originalMeta.ogDescription);
    setMetaContent(metaSelectors.twitterTitle, (meta && meta.title) || originalMeta.twitterTitle);
    setMetaContent(metaSelectors.twitterDescription, (meta && meta.description) || originalMeta.twitterDescription);
  };

  const updateLanguageControls = () => {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.value = currentLang;
      languageSelect.setAttribute('aria-label', t('Seleccionar idioma'));
    }

    const languageLabel = document.querySelector('label[for="languageSelect"]');
    if (languageLabel) languageLabel.textContent = t('Idioma');

    if (mobileMenuBtn && mainNav) {
      mobileMenuBtn.setAttribute(
        'aria-label',
        mainNav.classList.contains('active') ? t('Cerrar menú de navegación') : t('Abrir menú de navegación')
      );
    }
  };

  const applyLanguage = (code, options = {}) => {
    const next = LANG_BY_CODE[code] ? code : DEFAULT_LANGUAGE;
    currentLang = next;

    if (options.persist !== false) {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      } catch (error) {
        // Ignorar almacenamiento deshabilitado.
      }
    }

    document.documentElement.lang = next === 'zh' ? 'zh-CN' : next;
    document.documentElement.dir = (LANG_BY_CODE[next] && LANG_BY_CODE[next].dir) || 'ltr';

    applyInterfaceLanguage();
    applyDocumentMeta();
    updateLanguageControls();

    if (parishDateEl) parishDateEl.textContent = formatLongDate(todayIso);
  };

  registerTranslatableContent();

  // 1. Menú Móvil Hamburguesa accesible
  const mobileMenuBtn = document.getElementById('mobileMenuToggle');
  const mainNav = document.getElementById('mainNav');

  if (mobileMenuBtn && mainNav) {
    const menuIcon = mobileMenuBtn.querySelector('i');

    const setMenuState = (open) => {
      mainNav.classList.toggle('active', open);
      mobileMenuBtn.setAttribute('aria-expanded', String(open));
      mobileMenuBtn.setAttribute('aria-label', open ? t('Cerrar menú de navegación') : t('Abrir menú de navegación'));
      if (menuIcon) menuIcon.className = open ? 'fas fa-times' : 'fas fa-bars';
    };

    mobileMenuBtn.addEventListener('click', () => {
      setMenuState(!mainNav.classList.contains('active'));
    });

    mainNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) setMenuState(false);
      });
    });

    // Cerrar al tocar fuera del menú
    document.addEventListener('click', (e) => {
      if (!mainNav.classList.contains('active')) return;
      if (mainNav.contains(e.target) || mobileMenuBtn.contains(e.target)) return;
      setMenuState(false);
    });

    // Cerrar con Escape y devolver el foco al botón
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mainNav.classList.contains('active')) {
        setMenuState(false);
        mobileMenuBtn.focus();
      }
    });

    // Si se amplía la ventana, el menú vuelve a su estado normal
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) setMenuState(false);
    });
  }

  // 3. Calendario Litúrgico y Evangelio del Día
  // Los textos se generan con Breviarium Core (breviarium.es) en data/evangelio/.
  // Si un día falta en los archivos locales se consulta la API de respaldo.
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const GOSPEL_DATA_PATH = 'data/evangelio';
  const GOSPEL_API_URL = 'https://categpt.chat/api/v1/feast';
  const GOSPEL_CACHE_PREFIX = 'parroquia:evangelio:v1:';
  const TRANSLATED_CACHE_PREFIX = 'parroquia:evangelio:v2:';
  const EVANGELIZO_URL = 'https://feed.evangelizo.org/v2/reader.php';
  const GOSPEL_CACHE_TTL = 1000 * 60 * 60 * 24 * 60; // 60 días
  const PARISH_TIME_ZONE = 'America/Santo_Domingo';
  const MAX_NEXT_DAYS = 7;

  const GOSPEL_BOOKS = {
    Mt: 'San Mateo',
    Mc: 'San Marcos',
    Lc: 'San Lucas',
    Jn: 'San Juan'
  };

  const SEASON_LABELS = {
    ADVENT: 'Adviento',
    CHRISTMAS_TIME: 'Navidad',
    LENT: 'Cuaresma',
    EASTER_TRIDUUM: 'Triduo Pascual',
    EASTER_TIME: 'Pascua',
    ORDINARY_TIME: 'Tiempo Ordinario'
  };

  const RANK_LABELS = {
    SOLEMNITY: 'Solemnidad',
    FEAST: 'Fiesta',
    MEMORIAL: 'Memoria',
    OPTIONAL_MEMORIAL: 'Memoria libre',
    WEEKDAY: 'Feria',
    SUNDAY: 'Domingo'
  };

  const MEDITACIONES = {
    ADVENT: 'En este tiempo de espera, preparemos el camino del Señor con la oración, la caridad y una alegre conversión del corazón. Que nuestra comunidad de Maimón se mantenga vigilante y esperanzada.',
    CHRISTMAS_TIME: 'Contemplamos el misterio de Dios hecho niño. Que la luz de Belén ilumine nuestros hogares y nos impulse a acoger al Señor en los más pequeños y necesitados.',
    LENT: 'La Cuaresma nos invita a volver a Dios con sinceridad. Acojamos esta Palabra con espíritu de conversión, ayuno y misericordia, para renovar nuestra vida cristiana.',
    EASTER_TRIDUUM: 'Nos unimos al misterio de la Pasión, Muerte y Resurrección del Señor. Que esta Palabra nos ayude a permanecer junto a la cruz y a esperar con confianza la victoria de la vida.',
    EASTER_TIME: 'Cristo ha resucitado y vive entre nosotros. Que la alegría pascual fortalezca nuestra fe y nos haga testigos valientes de su amor en la familia y en la comunidad.',
    ORDINARY_TIME: 'Acogamos esta Palabra con corazón abierto y pidamos al Espíritu Santo la gracia de vivirla hoy en nuestra familia, en nuestro trabajo y en nuestra comunidad de Maimón.'
  };

  const gospelCitationEl = document.getElementById('gospelCitation');
  const gospelVerseEl = document.getElementById('gospelVerse');
  const gospelReflectionEl = document.getElementById('gospelReflection');
  const gospelSeasonEl = document.getElementById('liturgicalSeason');
  const gospelTitleEl = document.getElementById('gospelLiturgicalTitle');
  const gospelAcclamationEl = document.getElementById('gospelAcclamation');
  const gospelReadingsEl = document.getElementById('gospelReadings');
  const gospelDateFullEl = document.getElementById('gospelDateFull');
  const parishDateEl = document.getElementById('parishCurrentDate');
  const gospelCardEl = document.querySelector('.gospel-card-wrapper');
  const gospelStatusEl = document.getElementById('gospelStatus');
  const btnTodayGospel = document.getElementById('btnTodayGospel');
  const btnNextReading = document.getElementById('btnNextReading');

  const gospelMonthCache = new Map();
  let todayIso = getDateInParishTimeZone(new Date());
  let currentOffset = 0;
  let currentDayData = null;
  let requestToken = 0;

  if (parishDateEl) parishDateEl.textContent = formatLongDate(todayIso);

  // --- Utilidades de fecha ---
  function getDateInParishTimeZone(date) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: PARISH_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    } catch (error) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  function addDays(isoDate, days) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days, 12));
    return date.toISOString().slice(0, 10);
  }

  function formatLongDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));

    try {
      const formatted = new Intl.DateTimeFormat(getCurrentLocale(), {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        numberingSystem: 'latn'
      }).format(date);
      return formatted.charAt(0).toLocaleUpperCase(getCurrentLocale()) + formatted.slice(1);
    } catch (error) {
      return `${diasSemana[date.getUTCDay()]}, ${day} de ${meses[month - 1]} de ${year}`;
    }
  }

  // --- Carga de los datos litúrgicos ---
  function getMonthKey(isoDate) {
    return isoDate.slice(0, 7);
  }

  async function loadMonth(monthKey) {
    if (gospelMonthCache.has(monthKey)) return gospelMonthCache.get(monthKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const request = fetch(`${GOSPEL_DATA_PATH}/${monthKey}.json`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`No se encontró el archivo ${monthKey}.json (HTTP ${response.status}).`);
        }
        return response.json();
      })
      .then((payload) => {
        if (!payload || !payload.days) {
          throw new Error(`El archivo ${monthKey}.json no tiene el formato esperado.`);
        }
        return payload;
      })
      .catch((error) => {
        gospelMonthCache.delete(monthKey);
        throw error;
      })
      .finally(() => clearTimeout(timeout));

    gospelMonthCache.set(monthKey, request);
    return request;
  }

  async function loadDay(isoDate) {
    try {
      const month = await loadMonth(getMonthKey(isoDate));
      const day = month.days?.[isoDate];
      if (!day || !day.gospel?.text) {
        throw new Error(`No hay datos locales para ${isoDate}.`);
      }
      writeCachedDay(isoDate, day);
      return day;
    } catch (localError) {
      try {
        const day = await loadDayFromApi(isoDate);
        writeCachedDay(isoDate, day);
        return day;
      } catch (apiError) {
        const cached = readCachedDay(isoDate);
        if (cached) return cached;
        throw new Error(
          `No se pudo cargar ${isoDate}. Local: ${localError.message}. API: ${apiError.message}`
        );
      }
    }
  }

  async function loadDayFromApi(isoDate) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch(
        `${GOSPEL_API_URL}?date=${encodeURIComponent(isoDate)}&locale=es`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      return normalizeApiDay(json, isoDate);
    } finally {
      clearTimeout(timeout);
    }
  }

  function normalizeApiDay(json, isoDate) {
    const nom = json?.nom;
    if (!nom) throw new Error('La API no devolvió datos litúrgicos.');

    const mass = Array.isArray(nom.mass) ? nom.mass : [];
    const gospel = mass.find((item) => item?.key === 'gospel' && item.text);
    if (!gospel) throw new Error('La API no devolvió el Evangelio.');

    const text = apiHtmlToText(gospel.text);
    if (!text) throw new Error('El texto del Evangelio está vacío.');

    const first = mass.find(
      (item) => (item?.key === 'reading' || item?.key === 'first_reading') && item.ref
    );
    const psalm = mass.find((item) => item?.key === 'psalm' && item.ref);
    const second = mass.find((item) => item?.key === 'second_reading' && item.ref);
    const season = detectSeasonFromText(`${nom.name || ''} ${nom.line || ''}`);

    return {
      date: isoDate,
      celebration: cleanInline(nom.name) || 'Calendario Litúrgico',
      rank: '',
      rankLabel: cleanInline(nom.rank),
      season,
      seasonLabel: '',
      color: '',
      cycle: '',
      gospel: {
        ref: cleanInline(gospel.ref),
        title: '',
        text
      },
      firstReading: cleanInline(first?.ref),
      psalm: cleanInline(psalm?.ref),
      secondReading: cleanInline(second?.ref),
      acclamation: null,
      comment: null
    };
  }

  function apiHtmlToText(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,style').forEach((element) => element.remove());

    const paragraphs = Array.from(doc.querySelectorAll('p'))
      .map((paragraph) => {
        const clone = paragraph.cloneNode(true);
        clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
        return clone.textContent
          .replace(/\u00a0/g, ' ')
          .split('\n')
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('\n');
      })
      .filter(Boolean);

    if (!paragraphs.length) {
      return (doc.body?.textContent || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const cleaned = [];
    for (const paragraph of paragraphs) {
      if (/^(?:o\s+)?lectura breve\b/i.test(paragraph)) break;
      if (/^(?:[–—-]\s*)?(?:Palabra del Señor|¡?Aclamemos la Palabra de Dios!?)/i.test(paragraph)) break;
      cleaned.push(paragraph);
    }
    return cleaned.join('\n\n').trim();
  }

  function detectSeasonFromText(text) {
    const value = String(text || '').toLowerCase();
    if (/adviento/.test(value)) return 'ADVENT';
    if (/cuaresma|semana santa|miércoles de ceniza|domingo de ramos/.test(value)) return 'LENT';
    if (/triduo pascual|jueves santo|viernes santo|vigilia pascual/.test(value)) return 'EASTER_TRIDUUM';
    if (/pascua|pentecostés|ascensión/.test(value)) return 'EASTER_TIME';
    if (/navidad|epifanía|bautismo del señor/.test(value)) return 'CHRISTMAS_TIME';
    if (/tiempo ordinario|semana del tiempo ordinario/.test(value)) return 'ORDINARY_TIME';
    return '';
  }

  function cleanInline(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  // --- Lecturas bíblicas multiidioma (Evangelizo Feed v2) ---
  function readTranslatedDay(isoDate, lang) {
    try {
      const raw = localStorage.getItem(`${TRANSLATED_CACHE_PREFIX}${lang}:${isoDate}`);
      if (!raw) return null;

      const entry = JSON.parse(raw);
      if (!entry || !entry.data) return null;

      if (Date.now() - Number(entry.savedAt || 0) > GOSPEL_CACHE_TTL) {
        localStorage.removeItem(`${TRANSLATED_CACHE_PREFIX}${lang}:${isoDate}`);
        return null;
      }
      return entry.data;
    } catch (error) {
      return null;
    }
  }

  function writeTranslatedDay(isoDate, lang, data) {
    try {
      localStorage.setItem(
        `${TRANSLATED_CACHE_PREFIX}${lang}:${isoDate}`,
        JSON.stringify({ savedAt: Date.now(), data })
      );
      pruneGospelCache();
    } catch (error) {
      // localStorage puede estar deshabilitado o lleno.
    }
  }

  async function loadEvangelizoDay(isoDate, lang) {
    const language = LANG_BY_CODE[lang];
    const evangelizoCode = language && language.evangelizo;
    if (!evangelizoCode) throw new Error('No hay fuente bíblica para este idioma.');

    const cached = readTranslatedDay(isoDate, lang);
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const compactDate = isoDate.replace(/-/g, '');
      const response = await fetch(
        `${EVANGELIZO_URL}?date=${compactDate}&type=xml&lang=${evangelizoCode}`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/xml, text/xml' }
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const xml = await response.text();
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('La respuesta XML no es válida.');

      const field = (tag) => {
        const node = doc.querySelector(tag);
        if (!node) return '';
        return String(node.textContent || '')
          .replace(/\u00a0/g, ' ')
          .replace(/\r\n?/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      };

      const gospelText = field('reading_gospel');
      if (!gospelText) throw new Error('Evangelizo no devolvió el Evangelio.');

      const readings = [
        {
          key: 'first',
          label: 'Primera lectura',
          ref: field('reading_text1_st'),
          title: field('reading_text1_lt'),
          text: field('reading_text1')
        },
        {
          key: 'psalm',
          label: 'Salmo',
          ref: field('reading_text2_st'),
          title: field('reading_text2_lt'),
          text: field('reading_text2')
        },
        {
          key: 'second',
          label: 'Segunda lectura',
          ref: field('reading_text3_st'),
          title: field('reading_text3_lt'),
          text: field('reading_text3')
        }
      ].filter((reading) => reading.text);

      const commentText = field('comment');
      const day = {
        date: isoDate,
        celebration: field('saint'),
        liturgicalTitle: field('litugic_t'),
        gospel: {
          ref: field('reading_gospel_st'),
          title: '',
          longTitle: field('reading_gospel_lt'),
          text: gospelText
        },
        readings,
        acclamation: null,
        comment: commentText
          ? { text: commentText, title: field('comment_t'), source: field('comment_s') }
          : null
      };

      writeTranslatedDay(isoDate, lang, day);
      return day;
    } finally {
      clearTimeout(timeout);
    }
  }

  function mergeTranslatedDay(base, translated) {
    return {
      ...base,
      celebration: translated.celebration || base.celebration,
      liturgicalTitle: translated.liturgicalTitle || '',
      gospel: {
        ref: translated.gospel?.ref || base.gospel?.ref || '',
        title: translated.gospel?.title || base.gospel?.title || '',
        longTitle: translated.gospel?.longTitle || '',
        text: translated.gospel?.text || base.gospel?.text || ''
      },
      readings: translated.readings || [],
      acclamation: translated.acclamation || null,
      comment: translated.comment || null
    };
  }

  // --- Caché local para consultas sin conexión ---
  function readCachedDay(isoDate) {
    try {
      const raw = localStorage.getItem(`${GOSPEL_CACHE_PREFIX}${isoDate}`);
      if (!raw) return null;

      const entry = JSON.parse(raw);
      if (!entry || !entry.data) return null;

      if (Date.now() - Number(entry.savedAt || 0) > GOSPEL_CACHE_TTL) {
        localStorage.removeItem(`${GOSPEL_CACHE_PREFIX}${isoDate}`);
        return null;
      }
      return entry.data;
    } catch (error) {
      return null;
    }
  }

  function writeCachedDay(isoDate, data) {
    try {
      localStorage.setItem(
        `${GOSPEL_CACHE_PREFIX}${isoDate}`,
        JSON.stringify({ savedAt: Date.now(), data })
      );
      pruneGospelCache();
    } catch (error) {
      // localStorage puede estar deshabilitado o lleno.
    }
  }

  function pruneGospelCache() {
    try {
      const keys = [];
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key && (key.startsWith(GOSPEL_CACHE_PREFIX) || key.startsWith(TRANSLATED_CACHE_PREFIX))) {
          keys.push(key);
        }
      }

      const now = Date.now();
      keys.forEach((key) => {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || 'null');
          if (!entry || now - Number(entry.savedAt || 0) > GOSPEL_CACHE_TTL) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Ignorar errores de almacenamiento.
    }
  }

  // --- Formato del contenido ---
  const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeGospelHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
  }

  function formatGospelCitation(ref) {
    const value = cleanInline(ref);
    const match = value.match(/^(\S+)\s+(.+)$/);
    if (!match) return t('Santo Evangelio del Día');

    const bookKey = match[1].replace(/\.$/, '');
    const book = GOSPEL_BOOKS[bookKey] || bookKey;
    return `Santo Evangelio según ${book} (${match[2]})`;
  }

  function getGospelCitation(data) {
    const longTitle = cleanInline(data.gospel?.longTitle);
    if (currentLang !== 'es') {
      return longTitle ? longTitle.replace(/[\s.]+$/, '') : cleanInline(data.gospel?.ref);
    }
    return formatGospelCitation(data.gospel?.ref);
  }

  function getSeasonLabel(season) {
    const seasons = I18N && I18N.seasons && I18N.seasons[currentLang];
    return (seasons && seasons[season]) || SEASON_LABELS[season] || t('Tiempo Litúrgico');
  }

  function getRankLabel(rank) {
    const ranks = I18N && I18N.ranks && I18N.ranks[currentLang];
    return (ranks && ranks[rank]) || RANK_LABELS[rank] || '';
  }

  function getLiturgicalTitle(data) {
    if (currentLang !== 'es' && data.liturgicalTitle) return cleanInline(data.liturgicalTitle);

    const seasonLabel = getSeasonLabel(data.season);
    let celebration = cleanInline(data.celebration);

    if (!celebration) {
      celebration = seasonLabel ? `${t('Feria')} · ${seasonLabel}` : t('Calendario Litúrgico');
    } else if (/^\d{1,2} de [a-záéíóúñ]+$/i.test(celebration)) {
      celebration = seasonLabel ? `${t('Feria')} · ${seasonLabel}` : t('Tiempo Litúrgico');
    }

    const rankLabel = data.rankLabel || getRankLabel(data.rank);
    const includeRank = data.rankLabel
      ? !/^feria$/i.test(rankLabel)
      : ['MEMORIAL', 'OPTIONAL_MEMORIAL', 'FEAST', 'SOLEMNITY'].includes(data.rank);

    return [celebration, includeRank ? rankLabel : ''].filter(Boolean).join(' · ') || t('Calendario Litúrgico');
  }

  function getMeditation(season) {
    const meditations = I18N && I18N.meditations && I18N.meditations[currentLang];
    return (meditations && (meditations[season] || meditations.ORDINARY_TIME))
      || MEDITACIONES[season]
      || MEDITACIONES.ORDINARY_TIME;
  }

  function renderGospelText(text) {
    const value = String(text || '').trim();
    if (!value) return t('El texto del Evangelio no está disponible.');
    return escapeGospelHtml(value).replace(/\n/g, '<br>');
  }

  function renderReadings(readings) {
    if (!Array.isArray(readings) || !readings.length) return '';

    return readings.map((reading) => {
      const label = escapeGospelHtml(t(reading.label));
      const ref = cleanInline(reading.ref);
      const refHtml = ref ? ` <span class="gospel-reading-ref">${escapeGospelHtml(ref)}</span>` : '';
      const text = escapeGospelHtml(reading.text).replace(/\n/g, '<br>');
      return `<details class="gospel-reading">
        <summary><span class="gospel-reading-label">${label}</span>${refHtml}</summary>
        <div class="gospel-reading-text">${text}</div>
      </details>`;
    }).join('');
  }

  function renderAcclamation(data) {
    const parts = [];

    if (data.acclamation?.text) {
      const text = escapeGospelHtml(data.acclamation.text).replace(/\n/g, '<br>');
      parts.push(`<span class="gospel-acclamation-text">&laquo;${text}&raquo;</span>`);
    }

    // Si las lecturas completas no están disponibles, al menos mostramos sus referencias.
    if (!Array.isArray(data.readings) || !data.readings.length) {
      const references = [];
      if (data.firstReading) references.push(`${t('Primera lectura')}: ${escapeGospelHtml(data.firstReading)}`);
      if (data.psalm) references.push(`${t('Salmo')}: ${escapeGospelHtml(data.psalm)}`);
      if (data.secondReading) references.push(`${t('Segunda lectura')}: ${escapeGospelHtml(data.secondReading)}`);

      if (references.length) {
        parts.push(`<span class="gospel-readings-refs">${references.join(' &middot; ')}</span>`);
      }
    }

    return parts.join('');
  }

  function renderReflection(data) {
    if (data.comment?.text) {
      const source = [data.comment.source, data.comment.title].filter(Boolean).join(': ');
      const attribution = source
        ? ` <span class="gospel-reflection-source">— ${escapeGospelHtml(source)}</span>`
        : '';
      const text = escapeGospelHtml(data.comment.text).replace(/\n/g, '<br>');
      return `<strong>${escapeGospelHtml(t('Palabra del Señor.'))} &bull; ${escapeGospelHtml(t('Comentario de la Tradición'))}:</strong> ${text}${attribution}`;
    }

    return `<strong>${escapeGospelHtml(t('Palabra del Señor.'))} &bull; ${escapeGospelHtml(t('Meditación Parroquial'))}:</strong> ${escapeGospelHtml(getMeditation(data.season))}`;
  }

  // --- Renderizado del bloque ---
  function renderLectura(data, esHoy, isoDate) {
    if (gospelCitationEl) gospelCitationEl.textContent = getGospelCitation(data);
    if (gospelVerseEl) gospelVerseEl.innerHTML = renderGospelText(data.gospel?.text);
    if (gospelReadingsEl) gospelReadingsEl.innerHTML = renderReadings(data.readings);
    if (gospelReflectionEl) gospelReflectionEl.innerHTML = renderReflection(data);
    if (gospelSeasonEl) gospelSeasonEl.textContent = getSeasonLabel(data.season);
    if (gospelTitleEl) gospelTitleEl.textContent = getLiturgicalTitle(data);

    if (gospelAcclamationEl) {
      const acclamation = renderAcclamation(data);
      gospelAcclamationEl.innerHTML = acclamation;
      gospelAcclamationEl.style.display = acclamation ? '' : 'none';
    }

    if (gospelDateFullEl) {
      const dateText = escapeGospelHtml(formatLongDate(isoDate));
      gospelDateFullEl.innerHTML = esHoy
        ? `<i class="far fa-calendar-check" style="color:var(--color-gold);"></i> ${dateText} (${escapeGospelHtml(t('Hoy'))})`
        : `<i class="far fa-calendar-alt"></i> ${dateText}`;
    }

    if (parishDateEl) parishDateEl.textContent = formatLongDate(todayIso);
  }

  function renderError(isoDate) {
    if (gospelCitationEl) gospelCitationEl.textContent = t('Evangelio no disponible');
    if (gospelVerseEl) {
      gospelVerseEl.innerHTML = escapeGospelHtml(t('No fue posible cargar el Evangelio de este día. Revisa tu conexión y vuelve a intentarlo.'));
    }
    if (gospelReadingsEl) gospelReadingsEl.innerHTML = '';
    if (gospelReflectionEl) gospelReflectionEl.innerHTML = '';
    if (gospelTitleEl) gospelTitleEl.textContent = t('Calendario Litúrgico');
    if (gospelSeasonEl) gospelSeasonEl.textContent = t('Tiempo Litúrgico');

    if (gospelAcclamationEl) {
      gospelAcclamationEl.innerHTML = '';
      gospelAcclamationEl.style.display = 'none';
    }

    if (gospelDateFullEl) {
      gospelDateFullEl.innerHTML = `<i class="far fa-calendar-alt"></i> ${escapeGospelHtml(formatLongDate(isoDate))}`;
    }

    setGospelStatus(t('No se pudo cargar el Evangelio. Comprueba tu conexión y vuelve a intentarlo.'), true);
  }

  function setLoading(isLoading) {
    if (gospelCardEl) {
      gospelCardEl.classList.toggle('is-loading', isLoading);
      gospelCardEl.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }

    [btnTodayGospel, btnNextReading].forEach((button) => {
      if (button) button.disabled = isLoading;
    });
  }

  function setGospelStatus(message, isError = false) {
    if (!gospelStatusEl) return;
    gospelStatusEl.textContent = message || '';
    gospelStatusEl.classList.toggle('is-error', Boolean(isError));
  }

  function animateTransition(callback) {
    const gospelCard = document.querySelector('.gospel-body');
    if (!gospelCard || prefersReducedMotion) {
      callback();
      return;
    }

    gospelCard.style.opacity = '0.15';
    gospelCard.style.transition = 'opacity 0.22s ease';
    setTimeout(() => {
      callback();
      gospelCard.style.opacity = '1';
    }, 220);
  }

  async function showGospelDay(offset) {
    const requestId = ++requestToken;
    const isoDate = addDays(todayIso, offset);

    setLoading(true);
    setGospelStatus(t('Cargando el Evangelio…'));

    try {
      const base = await loadDay(isoDate);
      if (requestId !== requestToken) return;

      let content = base;
      let notice = '';

      if (currentLang === 'es') {
        // En español las lecturas completas se toman de Evangelizo; el
        // Evangelio local sigue siendo la fuente principal.
        try {
          const spanishReadings = await loadEvangelizoDay(isoDate, 'es');
          content = {
            ...base,
            readings: spanishReadings.readings,
            comment: spanishReadings.comment || base.comment
          };
        } catch (error) {
          // Sin conexión con Evangelizo se conservan las referencias locales.
        }
      } else {
        try {
          const translated = await loadEvangelizoDay(isoDate, currentLang);
          content = mergeTranslatedDay(base, translated);
        } catch (error) {
          console.warn('No se pudo cargar la traducción de las lecturas:', error);
          notice = t('La traducción no está disponible en este momento. Se muestra el texto en español.');
        }
      }

      if (requestId !== requestToken) return;

      currentOffset = offset;
      currentDayData = content;

      animateTransition(() => {
        if (requestId !== requestToken) return;
        renderLectura(content, offset === 0, isoDate);
      });
      setGospelStatus(notice);
    } catch (error) {
      if (requestId !== requestToken) return;
      console.error('No se pudo cargar el Evangelio:', error);

      if (currentDayData) {
        setGospelStatus(t('No se pudo cargar el día solicitado. Inténtalo de nuevo.'), true);
      } else {
        renderError(isoDate);
      }
    } finally {
      if (requestId === requestToken) setLoading(false);
    }
  }

  if (btnTodayGospel) {
    btnTodayGospel.addEventListener('click', (event) => {
      event.preventDefault();
      if (currentOffset === 0 && currentDayData) {
        animateTransition(() => renderLectura(currentDayData, true, todayIso));
        return;
      }
      showGospelDay(0);
    });
  }

  if (btnNextReading) {
    btnNextReading.addEventListener('click', (event) => {
      event.preventDefault();
      const nextOffset = currentOffset >= MAX_NEXT_DAYS ? 0 : currentOffset + 1;
      showGospelDay(nextOffset);
    });
  }

  // Activar el idioma guardado o detectado y preparar el selector.
  applyLanguage(currentLang, { persist: false });

  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      const next = languageSelect.value;
      if (!LANG_BY_CODE[next] || next === currentLang) return;
      applyLanguage(next);
      showGospelDay(currentOffset);
    });
  }

  // Cargar automáticamente el Evangelio correspondiente a hoy.
  showGospelDay(0);

  // Si la página permanece abierta, actualizar al cambiar el día.
  setInterval(() => {
    const nowIso = getDateInParishTimeZone(new Date());
    if (nowIso === todayIso) return;

    todayIso = nowIso;
    if (parishDateEl) parishDateEl.textContent = formatLongDate(todayIso);
    if (currentOffset === 0) showGospelDay(0);
  }, 60 * 1000);


  // 4. Modal de Intenciones y Ofrendas con gestión de foco
  const modal = document.getElementById('intentionModal');
  const modalContent = modal ? modal.querySelector('.modal-content') : null;
  const openModalBtns = document.querySelectorAll('.open-modal-intention');
  const closeModalBtn = document.getElementById('closeModal');
  let lastModalTrigger = null;

  function openModal(trigger) {
    if (!modal) return;
    lastModalTrigger = trigger || document.activeElement;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const firstField = modal.querySelector('select, input, textarea');
    if (firstField) firstField.focus();
    else if (modalContent) modalContent.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastModalTrigger && typeof lastModalTrigger.focus === 'function') lastModalTrigger.focus();
    lastModalTrigger = null;
  }

  if (modal && closeModalBtn) {
    openModalBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(btn);
      });
    });

    closeModalBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else {
        trapFocus(e, modal);
      }
    });
  }

  // 5. Formulario de contacto real (abre el correo del feligrés)
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contactForm.reportValidity()) return;

      const name = document.getElementById('contactName').value.trim();
      const contact = document.getElementById('contactEmail').value.trim();
      const reason = document.getElementById('contactReason').value;
      const message = document.getElementById('contactMessage').value.trim();

      const subject = `Consulta parroquial: ${reason}`;
      const lines = [
        'Pax Christi.',
        '',
        `Nombre: ${name}`,
        `Contacto: ${contact}`,
        `Motivo: ${reason}`,
        '',
        'Mensaje:',
        message,
        '',
        'Enviado desde el sitio web de la Parroquia San Isidro Labrador.'
      ];

      setStatus(formStatus, t('Abriendo su aplicación de correo con el mensaje preparado…'), 'info');
      window.location.href = buildMailto(subject, lines);

      window.setTimeout(() => {
        setStatus(formStatus, t('Si su aplicación de correo no se abrió, escriba directamente a {email}.').replace('{email}', PARISH_EMAIL), 'info');
      }, 1500);
    });
  }

  // 6. Formulario del modal de intenciones (abre el correo del feligrés)
  const modalForm = document.getElementById('modalIntentionForm');
  const intentionStatus = document.getElementById('intentionStatus');

  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!modalForm.reportValidity()) return;

      const tipo = document.getElementById('intentionType').value;
      const porQuien = document.getElementById('intentionNames').value.trim();
      const fecha = document.getElementById('intentionDate').value;
      const solicitante = document.getElementById('intentionRequester').value.trim();

      const subject = 'Intención de Santa Misa';
      const lines = [
        'Pax Christi.',
        '',
        `Tipo de intención: ${tipo}`,
        `Se ofrece por: ${porQuien}`,
        `Fecha deseada: ${fecha}`,
        `Solicitante y teléfono: ${solicitante}`,
        '',
        'Enviado desde el sitio web de la Parroquia San Isidro Labrador.'
      ];

      setStatus(intentionStatus, t('Abriendo su aplicación de correo con los datos de la intención…'), 'info');
      window.location.href = buildMailto(subject, lines);

      window.setTimeout(() => {
        setStatus(intentionStatus, t('Si su aplicación de correo no se abrió, escriba a {email}.').replace('{email}', PARISH_EMAIL), 'info');
      }, 1500);
    });
  }

  // 7. Navegación activa con IntersectionObserver
  const navLinks = Array.from(document.querySelectorAll('.nav-list a[href^="#"]'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  const setActiveNav = (id) => {
    navLinks.forEach(link => {
      if (link.classList.contains('open-modal-intention')) {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        return;
      }
      const isActive = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  if (sections.length && navLinks.length) {
    if ('IntersectionObserver' in window) {
      const visibleSections = new Set();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) visibleSections.add(entry.target.id);
          else visibleSections.delete(entry.target.id);
        });

        const current = sections.find(section => visibleSections.has(section.id));
        if (current) setActiveNav(current.id);
      }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });

      sections.forEach(section => observer.observe(section));
    } else {
      // Respaldo para navegadores sin IntersectionObserver
      window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset + 140;
        let currentId = sections[0].id;
        sections.forEach(section => {
          if (section.offsetTop <= scrollY) currentId = section.id;
        });
        setActiveNav(currentId);
      }, { passive: true });
    }

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (link.classList.contains('open-modal-intention')) return;
        const target = link.getAttribute('href');
        if (target && target.length > 1) setActiveNav(target.slice(1));
      });
    });
  }

  // 8. Visor de la galería fotográfica (lightbox)
  const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
  const photoLightbox = document.getElementById('photoLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  let activePhotoIndex = 0;
  let lastLightboxTrigger = null;

  function showPhoto(index) {
    if (!galleryItems.length) return;
    activePhotoIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[activePhotoIndex];
    const img = item.querySelector('img');
    if (!img) return;
    lightboxImage.src = item.dataset.full || img.src;
    lightboxImage.alt = img.alt;
    lightboxCaption.textContent = item.dataset.caption || '';
  }

  function openLightbox(index, trigger) {
    if (!photoLightbox) return;
    lastLightboxTrigger = trigger || document.activeElement;
    showPhoto(index);
    photoLightbox.classList.add('active');
    photoLightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!photoLightbox) return;
    photoLightbox.classList.remove('active');
    photoLightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    if (lastLightboxTrigger && typeof lastLightboxTrigger.focus === 'function') lastLightboxTrigger.focus();
    lastLightboxTrigger = null;
  }

  if (photoLightbox && lightboxImage && galleryItems.length) {
    galleryItems.forEach((item, index) => {
      item.addEventListener('click', () => openLightbox(index, item));
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => showPhoto(activePhotoIndex - 1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => showPhoto(activePhotoIndex + 1));

    photoLightbox.addEventListener('click', (e) => {
      if (e.target === photoLightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!photoLightbox.classList.contains('active')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        showPhoto(activePhotoIndex - 1);
      } else if (e.key === 'ArrowRight') {
        showPhoto(activePhotoIndex + 1);
      } else {
        trapFocus(e, photoLightbox);
      }
    });
  }
});
