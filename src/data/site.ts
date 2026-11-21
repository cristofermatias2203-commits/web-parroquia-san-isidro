/** Datos institucionales y metadatos compartidos por SEO y componentes. */

export const languageCodes = ['es', 'it', 'en', 'fr', 'de', 'pt', 'pl', 'ar', 'zh'] as const;
export type LanguageCode = (typeof languageCodes)[number];

export const ogLocales: Record<LanguageCode, string> = {
  es: 'es_DO',
  it: 'it_IT',
  en: 'en_US',
  fr: 'fr_FR',
  de: 'de_DE',
  pt: 'pt_PT',
  pl: 'pl_PL',
  ar: 'ar_SA',
  zh: 'zh_CN',
};

// F6 confirmará el dominio definitivo. Centralizado aquí para no tocar
// metadatos, sitemap ni JSON-LD en varios sitios.
export const SITE_URL = 'https://cristofermatias2203-commits.github.io/web-parroquia-san-isidro/';

export const site = {
  name: 'Parroquia San Isidro Labrador',
  alternateName: 'Parroquia San Isidro Labrador de Maimón',
  title: 'Parroquia San Isidro Labrador | Maimón - Diócesis de La Vega',
  description:
    'Horarios de misa, Evangelio del día, sacramentos y contacto de la Parroquia San Isidro Labrador de Maimón, República Dominicana.',
  keywords:
    'Parroquia San Isidro Labrador, Maimón, Monseñor Nouel, Diócesis de La Vega, misa, evangelio, sacramentos',
  author: 'Parroquia San Isidro Labrador de Maimón',
  email: 'parroquiasanisidromaimon@diocesisdelavega.do',
  address: {
    streetAddress: 'Calle Principal frente al Parque Central',
    addressLocality: 'Maimón',
    addressRegion: 'Provincia Monseñor Nouel',
    addressCountry: 'DO',
  },
  image: 'img/logo-parroquia.png',
  parentOrganization: 'Diócesis de La Vega',
} as const;

export const absoluteUrl = (path: string): string => new URL(path, SITE_URL).href;
