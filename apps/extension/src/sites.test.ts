import { describe, expect, it } from 'vitest';
import { hostnamesIn, siteOf } from './sites';

const files = { isFileAccessAllowed: false };

describe('siteOf', () => {
  it('is the hostname, so Gmail and Google search are different sites', () => {
    expect(siteOf('https://mail.google.com/mail/u/0/', files)).toEqual({
      hostname: 'mail.google.com',
    });
    expect(siteOf('https://www.google.com/search?q=vim', files)).toEqual({
      hostname: 'www.google.com',
    });
    expect(siteOf('http://localhost:5173/', files)).toEqual({ hostname: 'localhost' });
  });

  it('is nothing where content scripts can’t run', () => {
    for (const url of [
      undefined,
      'chrome://newtab/',
      'chrome://extensions/',
      'chrome-extension://abc/keys.html',
      'view-source:https://example.com/',
      'https://chromewebstore.google.com/detail/x',
      'https://chrome.google.com/webstore/detail/x',
      'about:blank',
      'not a url',
    ]) {
      expect(siteOf(url, files)).toBeUndefined();
    }
  });

  it('runs on chrome.google.com outside the old store', () => {
    expect(siteOf('https://chrome.google.com/chromecast', files)).toEqual({
      hostname: 'chrome.google.com',
    });
  });

  it('runs on files only once the user allows it', () => {
    expect(siteOf('file:///srv/notes.html', files)).toBeUndefined();
    expect(siteOf('file:///srv/notes.html', { isFileAccessAllowed: true })).toEqual({
      hostname: '',
    });
  });
});

describe('hostnamesIn', () => {
  it('reads the sites a sync change touched, ignoring anything else', () => {
    expect(
      hostnamesIn({ 'disabled:github.com': {}, 'disabled:www.youtube.com': {}, other: {} }),
    ).toEqual(['github.com', 'www.youtube.com']);
  });
});
