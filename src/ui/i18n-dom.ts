import type { LanguageCode } from '../data/site';
import { LANGUAGE_STORAGE_KEY } from '../config';
import {
  getDirection,
  getLanguage,
  getMeta,
  isLanguageCode,
  setLanguage,
  t,
} from '../i18n/translate';

const SKIP_SELECTOR = [
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
  '#lightboxCaption',
].join(',');
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt', 'data-caption'];

const normalize = (value: string | null): string => String(value ?? '').replace(/\s+/g, ' ').trim();

interface TextEntry { node: Text; source: string }
interface AttributeEntry { element: Element; name: string; source: string }

const textEntries: TextEntry[] = [];
const attributeEntries: AttributeEntry[] = [];

const META_SELECTORS = {
  description: 'meta[name="description"]',
  keywords: 'meta[name="keywords"]',
  ogTitle: 'meta[property="og:title"]',
  ogDescription: 'meta[property="og:description"]',
  ogSiteName: 'meta[property="og:site_name"]',
  ogLocale: 'meta[property="og:locale"]',
  twitterTitle: 'meta[name="twitter:title"]',
  twitterDescription: 'meta[name="twitter:description"]',
} as const;

type MetaKey = keyof typeof META_SELECTORS;
const originalMeta: Partial<Record<MetaKey | 'title', string>> = { title: document.title };

export function registerTranslatableContent(): void {
  (Object.keys(META_SELECTORS) as MetaKey[]).forEach((key) => {
    const element = document.querySelector(META_SELECTORS[key]);
    originalMeta[key] = element?.getAttribute('content') ?? '';
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (!normalize(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    textEntries.push({ node: text, source: normalize(text.nodeValue) });
  }

  document.querySelectorAll('[placeholder], [title], [aria-label], [alt], [data-caption]').forEach((element) => {
    if (element.closest(SKIP_SELECTOR)) return;
    TRANSLATABLE_ATTRIBUTES.forEach((name) => {
      if (!element.hasAttribute(name)) return;
      const source = normalize(element.getAttribute(name));
      if (source) attributeEntries.push({ element, name, source });
    });
  });
}

function applyInterfaceLanguage(): void {
  textEntries.forEach(({ node, source }) => {
    if (!node.isConnected) return;
    const raw = node.nodeValue || '';
    const leading = raw.match(/^\s*/)?.[0] ?? '';
    const trailing = raw.match(/\s*$/)?.[0] ?? '';
    const next = leading + t(source) + trailing;
    if (node.nodeValue !== next) node.nodeValue = next;
  });

  attributeEntries.forEach(({ element, name, source }) => {
    if (!element.isConnected) return;
    const translated = t(source);
    if (element.getAttribute(name) !== translated) element.setAttribute(name, translated);
  });
}

function setMetaContent(selector: string, value: string | undefined): void {
  const element = document.querySelector(selector);
  if (element && value) element.setAttribute('content', value);
}

function applyDocumentMeta(): void {
  const meta = getMeta();
  document.title = meta.title || originalMeta.title || '';
  setMetaContent(META_SELECTORS.description, meta.description || originalMeta.description);
  setMetaContent(META_SELECTORS.keywords, meta.keywords || originalMeta.keywords);
  setMetaContent(META_SELECTORS.ogTitle, meta.title || originalMeta.ogTitle);
  setMetaContent(META_SELECTORS.ogDescription, meta.description || originalMeta.ogDescription);
  setMetaContent(META_SELECTORS.ogSiteName, meta.siteName || originalMeta.ogSiteName);
  setMetaContent(META_SELECTORS.ogLocale, meta.locale || originalMeta.ogLocale);
  setMetaContent(META_SELECTORS.twitterTitle, meta.title || originalMeta.twitterTitle);
  setMetaContent(META_SELECTORS.twitterDescription, meta.description || originalMeta.twitterDescription);
}

export function applyLanguage(code: LanguageCode, persist = true): void {
  const next = isLanguageCode(code) ? code : 'es';
  setLanguage(next);

  if (persist) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Ignorar almacenamiento deshabilitado.
    }
  }

  document.documentElement.lang = next === 'zh' ? 'zh-CN' : next;
  document.documentElement.dir = getDirection(next);
  applyInterfaceLanguage();
  applyDocumentMeta();
}

export function currentLanguage(): LanguageCode {
  return getLanguage();
}
