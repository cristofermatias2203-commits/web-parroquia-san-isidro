/**
 * Registro del service worker (F5, issues #21-#23).
 *
 * Solo se registra en producción y en contexto seguro (HTTPS o localhost):
 * en development Astro sirve los archivos sin hashes y un SW interceptaría
 * versiones obsoletas del sitio durante la recarga en caliente.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) return;

  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  const scope = import.meta.env.BASE_URL || '/';

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl, { scope }).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`No se pudo registrar el service worker: ${detail}`);
    });
  });
}
