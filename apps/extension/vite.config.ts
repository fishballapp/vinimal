import { readdirSync } from 'node:fs';
import { stripHtmlComments } from '@fishballapps/vite-plugins/strip-html-comments';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { build, defineConfig, type Plugin } from 'vite';
import packageJson from './package.json' with { type: 'json' };
import { iconPaths } from './src/action/icon-paths';

const manifest: chrome.runtime.ManifestV3 = {
  manifest_version: 3,
  name: 'Vinimal',
  short_name: 'Vinimal',
  description:
    'The few Vimium keys you use: j, k, h, l, gg, G, Ctrl+E, Ctrl+Y, gt, gT, f to follow links and ? for help. Nothing to set up.',
  version: packageJson.version,
  // Temporal, which the licence check reads Polar's expiry dates with.
  minimum_chrome_version: '144',
  icons: {
    16: 'icons/on-16.png',
    32: 'icons/on-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  // No popup: a click on the icon turns the site off, which `action.onClicked` only hears without one.
  action: { default_title: 'Vinimal', default_icon: iconPaths('on') },
  // Keys, with Disabled sites and Licence as its tabs: Chrome's own Options item in the icon's
  // right-click menu, and Extension options in chrome://extensions.
  options_page: 'keys.html',
  background: { service_worker: 'background.js', type: 'module' },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content.js'],
      all_frames: true,
      match_about_blank: true,
      run_at: 'document_start',
    },
  ],
  permissions: ['storage', 'alarms', 'webNavigation', 'scripting'],
  // The content script's matches don't count as host access for the tabs and scripting APIs:
  // reading a tab's URL and injecting into tabs open at install need it named here. Same
  // install warning as the content script's.
  host_permissions: ['<all_urls>'],
  // `?` shows the Keys page in a frame on any page; the dynamic URL changes per session, so a page
  // can't use the frame to tell that Vinimal is installed.
  web_accessible_resources: [
    { resources: ['keys.html'], matches: ['<all_urls>'], use_dynamic_url: true },
  ],
};

/** Writes manifest.json from the object above, so the version comes from package.json. */
const emitManifest = (): Plugin => ({
  name: 'vinimal-manifest',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'manifest.json',
      source: `${JSON.stringify(manifest, null, 2)}\n`,
    });
  },
});

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? sourceFiles(`${dir}/${entry.name}`)
      : [`${dir}/${entry.name}`].filter(path => /\.tsx?$/u.test(path)),
  );

/**
 * The content script, built on its own as one classic script: Chrome doesn't load a content script
 * as a module, so it can't share chunks with the pages and the worker.
 */
const buildContentScript = ({ mode }: { mode: string }): Plugin => ({
  name: 'vinimal-content-script',
  apply: 'build',
  // In watch mode a change anywhere in src/ rebuilds both.
  buildStart() {
    for (const file of sourceFiles('src')) this.addWatchFile(file);
  },
  async closeBundle() {
    await build({
      configFile: false,
      mode,
      logLevel: 'warn',
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: false,
        lib: {
          entry: 'src/content/main.ts',
          formats: ['iife'],
          name: 'vinimal',
          fileName: () => 'content.js',
        },
      },
    });
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    stripHtmlComments(),
    emitManifest(),
    buildContentScript({ mode }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        keys: 'keys.html',
        sites: 'sites.html',
        licence: 'licence.html',
      },
      output: {
        entryFileNames: chunk =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
}));
