/** A 1×1 canvas to paint colours on, made the first time a page's tone is read. */
let context: OffscreenCanvasRenderingContext2D | null | undefined;

/** Reads any CSS colour (`rgb()`, `oklch()`, a name) as sRGB channels and alpha, 0–255. */
const channelsOf = (color: string) => {
  context ??= new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
  if (context === null) return undefined;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
  return { red, green, blue, alpha };
};

/** WCAG relative luminance of an sRGB colour. */
const luminanceOf = ({ red, green, blue }: { red: number; green: number; blue: number }) => {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
};

/**
 * Whether the page is light or dark behind Vinimal's overlay: the root's background, else the
 * body's, else the canvas, which is dark only where the page opts into a dark scheme and the
 * system is dark. A page painted by an image or a full-size child reads as its colour underneath.
 * `elements` are where to read the background, for a page drawn inside another (a promo film's).
 */
export const pageTone = (
  elements: readonly (Element | null)[] = [document.documentElement, document.body],
): 'light' | 'dark' => {
  const backgrounds = elements
    .filter(element => element !== null)
    .map(element => channelsOf(getComputedStyle(element).backgroundColor));
  const painted = backgrounds.find(color => color !== undefined && color.alpha > 0);
  if (painted !== undefined) return luminanceOf(painted) > 0.2 ? 'light' : 'dark';
  const isDarkCanvas =
    getComputedStyle(document.documentElement).colorScheme.includes('dark') &&
    matchMedia('(prefers-color-scheme: dark)').matches;
  return isDarkCanvas ? 'dark' : 'light';
};
