import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://globobym.netlify.app',
  output: 'static',
  build: {
    // URLs sin trailing slash: /admin en vez de /admin/
    format: 'file',
  },
});
