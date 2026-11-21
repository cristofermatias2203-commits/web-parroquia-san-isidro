import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',

  // F6 ajustará `site` y `base` en cuanto se decida entre dominio propio y la
  // ruta del proyecto en GitHub Pages. Mientras tanto no se emiten canonicals.
});
