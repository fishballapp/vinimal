import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DEV_PUBLIC_KEY, EXTENSION_IDS, siteHostnameOf, siteMatches } from './site';

const release = { allowsLocalhost: false };
const dev = { allowsLocalhost: true };

describe('siteHostnameOf', () => {
  it('is the site’s hostname, only for the site itself', () => {
    expect(siteHostnameOf('https://vinimal.fishball.app', release)).toBe('vinimal.fishball.app');
    for (const origin of [
      undefined,
      'http://vinimal.fishball.app',
      'https://evil.vinimal.fishball.app',
      'https://vinimal.fishball.app.evil.com',
      'https://fishball.app',
      'http://localhost:4321',
    ]) {
      expect(siteHostnameOf(origin, release)).toBeUndefined();
    }
  });

  it('lets the site’s dev server ask a build that isn’t a release', () => {
    expect(siteHostnameOf('http://localhost:4321', dev)).toBe('localhost');
    expect(siteHostnameOf('https://localhost:4321', dev)).toBeUndefined();
    expect(siteHostnameOf('http://127.0.0.1:4321', dev)).toBeUndefined();
  });
});

describe('siteMatches', () => {
  it('names localhost only outside a release', () => {
    expect(siteMatches(release)).toEqual(['https://vinimal.fishball.app/*']);
    expect(siteMatches(dev)).toEqual(['https://vinimal.fishball.app/*', 'http://localhost/*']);
  });
});

describe('EXTENSION_IDS', () => {
  it('has the dev build’s ID derive from its key, as Chrome derives it', () => {
    const hash = createHash('sha256').update(Buffer.from(DEV_PUBLIC_KEY, 'base64')).digest('hex');
    const id = [...hash.slice(0, 32)]
      .map(digit => String.fromCharCode('a'.charCodeAt(0) + Number.parseInt(digit, 16)))
      .join('');
    expect(EXTENSION_IDS.dev).toBe(id);
  });
});
