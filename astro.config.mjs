// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: "https://garal-code.github.io/portfolio/",
  base: "/portfolio/",

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap()]
});
