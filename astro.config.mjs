// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://tobylo.github.io',
  base: '/auto-clicker-site',
  integrations: [svelte()],
});
