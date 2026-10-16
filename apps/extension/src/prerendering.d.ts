// Chrome's prerendering (https://wicg.github.io/nav-speculation/prerendering.html), not yet in
// TypeScript's DOM types: whether the document is being prerendered, out of sight, and the
// `prerenderingchange` event when it's shown.
declare global {
  interface Document {
    readonly prerendering: boolean;
  }
}

export {};
