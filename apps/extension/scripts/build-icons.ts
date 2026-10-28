// Renders the toolbar and store icons from the SVG masters. Run after changing one:
// pnpm -F @vinimal/extension icons
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import type { IconDrawing } from '../src/action/icon-paths';

const master = (name: string) => readFile(new URL(`../../../assets-src/${name}`, import.meta.url));
const out = (name: string) => new URL(`../public/icons/${name}.png`, import.meta.url).pathname;
// Rendered at 8× and scaled down, for clean edges.
const render = async (svg: Buffer, size: number, viewBox: number) =>
  sharp(svg, { density: 72 * (size / viewBox) * 8 })
    .resize(size, size)
    .png()
    .toBuffer();

// Each state has a 16 px drawing on the pixel grid and a 128 px one for the toolbar's 32 px, both
// filling their canvas. The store sizes come from `icon.svg`, which keeps the store's padding.
const MASTERS: Record<IconDrawing, { small: string; large: string }> = {
  on: { small: 'icon-16.svg', large: 'icon-32.svg' },
  off: { small: 'icon-off-16.svg', large: 'icon-off.svg' },
  unavailable: { small: 'icon-unavailable-16.svg', large: 'icon-unavailable.svg' },
};

// Once the keys have stopped: a small index amber dot with a "!" in the bottom-right corner, cut
// out of the key by a transparent ring. Chrome's own badge is too big. Not on `unavailable`, whose
// prohibition sign sits in that corner.
const STOPPED_CUTOUT = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="25.5" cy="25.5" r="7.5"/></svg>',
);
const STOPPED_DOT = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <circle cx="25.5" cy="25.5" r="6" fill="#dd9314"/>
    <rect x="24.6" y="21.6" width="1.8" height="5.2" rx="0.9" fill="#171b20"/>
    <circle cx="25.5" cy="28.9" r="1" fill="#171b20"/>
  </svg>`,
);
const withStoppedDot = async (icon: Buffer, size: number) =>
  sharp(icon)
    .composite([
      { input: await render(STOPPED_CUTOUT, size, 32), blend: 'dest-out' },
      { input: await render(STOPPED_DOT, size, 32) },
    ])
    .png()
    .toBuffer();

await Promise.all(
  Object.entries(MASTERS).flatMap(([state, { small, large }]) =>
    [
      { size: 16, svg: small, viewBox: 16 },
      { size: 32, svg: large, viewBox: 128 },
    ].map(async ({ size, svg, viewBox }) => {
      const icon = await render(await master(svg), size, viewBox);
      await sharp(icon).toFile(out(`${state}-${size}`));
      if (state !== 'unavailable') {
        await sharp(await withStoppedDot(icon, size)).toFile(out(`${state}-stopped-${size}`));
      }
    }),
  ),
);

const main = await master('icon.svg');
await Promise.all([
  sharp(await render(main, 48, 128)).toFile(out('icon-48')),
  // The Chrome Web Store wants the artwork at 96 px inside a transparent 16 px border.
  sharp(await render(main, 96, 128))
    .extend({
      top: 16,
      bottom: 16,
      left: 16,
      right: 16,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toFile(out('icon-128')),
]);
