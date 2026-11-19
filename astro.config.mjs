import { defineConfig } from 'astro/config';

// Static site, deployed to GitHub Pages at the root of dhanushkrishna4.github.io.
// Every page is built as /path/index.html so links keep their trailing slash.
export default defineConfig({
  site: 'https://dhanushkrishna4.github.io',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    // One shared stylesheet set for every page, so the client-side router
    // never swaps in a page whose CSS is missing.
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
  server: { port: 4321, host: true },
});
