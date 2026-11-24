/**
 * Resuelve rutas de `public/` teniendo en cuenta el `base` de Astro.
 *
 * Vite ya prefija las `url()` de CSS, pero los `href`/`src` escritos a mano en
 * componentes y el JavaScript de cliente deben hacerlo explícitamente (F6).
 */
import { BASE_PATH } from './config';

export function publicPath(path: string): string {
  return `${BASE_PATH}${path.replace(/^\/+/, '')}`;
}
