#!/usr/bin/env node
/**
 * Genera dist/sw.js después de `astro build`.
 *
 * Astro emite CSS y JS con hashes, así que la lista de precaché no puede
 * escribirse a mano: se escanea el directorio de salida y se calcula una
 * versión de caché a partir de los nombres de esos archivos. El service worker
 * se escribe en dist/ (no en public/) para no quedarse desactualizado.
 */

import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

/** prefijo de rutas del sitio (F6 puede publicar bajo /web-parroquia-san-isidro/). */
async function resolveBaseUrl() {
  const fromEnv = process.env.BASE_URL || process.env.PUBLIC_BASE_URL;
  if (fromEnv) return fromEnv.startsWith('/') ? fromEnv : `/${fromEnv}`;
  try {
    const astroConfig = await readFile(path.join(projectRoot, 'astro.config.mjs'), 'utf8');
    const match = astroConfig.match(/\bbase\s*:\s*['"`]([^'"`]+)['"`]/);
    if (match) return match[1].startsWith('/') ? match[1] : `/${match[1]}`;
  } catch {
    // Sin configuración explícita se publica en la raíz.
  }
  return '/';
}

const baseUrl = await resolveBaseUrl();
const normalizedBase = baseUrl === '/' ? '/' : `${baseUrl.replace(/\/+$/, '')}/`;

async function walk(dir, relative = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(path.join(dir, entry.name), rel)));
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}

const outputFiles = await walk(distDir);
if (!outputFiles.includes('index.html')) {
  throw new Error('No se encontró dist/index.html; ejecuta astro build antes de generar el service worker.');
}

// El shell es lo imprescindible para abrir la aplicación sin red. Los meses del
// Evangelio se cachean en runtime: son ~180 archivos y no deben inflar la
// instalación inicial (los días sin datos locales siguen necesitando la API).
const shell = outputFiles.filter((file) => {
  if (file === 'sw.js') return false;
  if (file === 'index.html' || file === 'index.htm') return true;
  if (file === 'manifest.webmanifest' || file === 'robots.txt' || file === 'sitemap.xml') return true;
  if (file.startsWith('_astro/')) return /\.(?:css|js|mjs|map)$/.test(file);
  if (file.startsWith('fonts/')) return /\.(?:woff2?|ttf|otf)$/.test(file);
  if (file === 'icons/sprite.svg' || file === 'icons/ATTRIBUTION.txt') return true;
  if (file === 'img/favicon-parroquia.png' || /^img\/icon-(?:192|512)(?:-maskable)?\.png$/.test(file)) return true;
  return false;
}).sort();

const precache = [...new Set(['./', './index.html', ...shell.map((file) => `./${file}`)])];

const revisionSource = `${normalizedBase}|${precache.join('|')}`;
const cacheVersion = createHash('sha256').update(revisionSource).digest('hex').slice(0, 12);
const cacheName = `parroquia-shell-${cacheVersion}`;
const dataCacheName = `parroquia-evangelio-${cacheVersion}`;
const assetCacheName = `parroquia-assets-${cacheVersion}`;
const apiCacheName = `parroquia-api-${cacheVersion}`;
const allCaches = [cacheName, dataCacheName, assetCacheName, apiCacheName];
const scope = normalizedBase;
const dataPrefix = `${normalizedBase}data/evangelio/`;

const source = `/* Generado por scripts/build-sw.mjs. No editar a mano. */
const SHELL_CACHE = ${JSON.stringify(cacheName)};
const DATA_CACHE = ${JSON.stringify(dataCacheName)};
const ASSET_CACHE = ${JSON.stringify(assetCacheName)};
const API_CACHE = ${JSON.stringify(apiCacheName)};
const ALL_CACHES = ${JSON.stringify(allCaches)};
const PRECACHE = ${JSON.stringify(precache)};
const DATA_PREFIX = ${JSON.stringify(dataPrefix)};
const API_HOSTS = ['feed.evangelizo.org', 'categpt.chat'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('No se pudo precachear el shell de la Parroquia:', error);
        throw error;
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith('parroquia-') && !ALL_CACHES.includes(name))
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  return API_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith('.' + host));
}

function isDataRequest(url) {
  return isSameOrigin(url) && url.pathname.startsWith(DATA_PREFIX) && url.pathname.endsWith('.json');
}

function isAssetRequest(request, url) {
  return isSameOrigin(url) && (request.destination === 'image' || request.destination === 'font');
}

/** Cache-first para el shell y los meses: se revalidan en segundo plano. */
async function cacheFirstWithRevalidation(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  if (cached) {
    if (network) network.catch(() => {});
    return cached;
  }
  const response = await network;
  if (response) return response;
  if (request.mode === 'navigate') {
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;
  }
  return Response.error();
}

/** Network-first para las APIs: la caché solo se usa si no hay conexión. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (isDataRequest(url)) {
    event.respondWith(cacheFirstWithRevalidation(request, DATA_CACHE));
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (isAssetRequest(request, url)) {
    event.respondWith(cacheFirstWithRevalidation(request, ASSET_CACHE));
  } else if (isSameOrigin(url) && request.mode === 'navigate') {
    event.respondWith(cacheFirstWithRevalidation(request, SHELL_CACHE));
  }
});
`;

await writeFile(path.join(distDir, 'sw.js'), source, 'utf8');
const bytes = (await stat(path.join(distDir, 'sw.js'))).size;
console.log(`Service worker generado: dist/sw.js (${precache.length} entradas, caché ${cacheVersion}, ${bytes} bytes, scope ${scope}).`);
