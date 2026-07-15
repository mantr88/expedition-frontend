// Vitest setup file, wired in via vite.config.ts `test.setupFiles`.
// Never imported by application code — this must only run under the test runner.
//
// Node 25 ships a built-in, broken `globalThis.localStorage` (the experimental Web
// Storage API) that shadows jsdom's implementation: under vitest's jsdom environment,
// `window` is aliased to `globalThis`, so `window.localStorage` returns the very same
// broken Node stub rather than a working Storage instance (its `.clear`/`.setItem`/etc.
// are `undefined`). We replace it with a real Storage implementation from a standalone
// jsdom instance, so tests behave the same across Node versions and operating systems
// without relying on a `NODE_OPTIONS` shell prefix (which isn't portable to Windows).
if (typeof globalThis.localStorage?.clear !== 'function') {
  // jsdom (already a devDependency, used as vitest's `environment`) ships no bundled
  // type declarations and we don't want to add an `@types/jsdom` dependency just for
  // this one import.
  // @ts-expect-error -- jsdom has no bundled type declarations
  const { JSDOM } = await import('jsdom')
  const dom = new JSDOM('', { url: 'http://localhost' })

  Object.defineProperty(globalThis, 'localStorage', {
    value: dom.window.localStorage,
    writable: true,
    configurable: true,
  })
}
