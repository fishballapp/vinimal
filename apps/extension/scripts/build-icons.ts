// Renders the toolbar and store icons from the SVG masters. Run after changing one:
// pnpm -F @vinimal/extension icons
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import type { IconState } from '../src/action/icon-paths';

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
const MASTERS: Record<IconState, { small: string; large: string }> = {
  on: { small: 'icon-16.svg', large: 'icon-32.svg' },
  off: { small: 'icon-off-16.svg', large: 'icon-off.svg' },
  unavailable: { small: 'icon-unavailable-16.svg', large: 'icon-unavailable.svg' },
};

await Promise.all(
  Object.entries(MASTERS).flatMap(([state, { small, large }]) => [
    (async () => sharp(await render(await master(small), 16, 16)).toFile(out(`${state}-16`)))(),
    (async () => sharp(await render(await master(large), 32, 128)).toFile(out(`${state}-32`)))(),
  ]),
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
