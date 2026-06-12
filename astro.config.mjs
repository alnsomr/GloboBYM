import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://globobym.netlify.app',
  output: 'static',
  // format 'directory' (default): /admin/index.html → la URL /admin/
  // funciona igual en Netlify y Vercel sin configuración de rewrites
});
