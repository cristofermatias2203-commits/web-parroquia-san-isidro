import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/data/site';

export default defineConfig({
  output: 'static',
  site: SITE_URL,
  base: new URL(SITE_URL).pathname.replace(/\/$/, ''),
});
