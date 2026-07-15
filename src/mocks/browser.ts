import { setupWorker } from 'msw/browser'
import { http, HttpResponse } from 'msw'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

// Expose MSW on window so Playwright e2e tests can override handlers at runtime
// (e.g. simulate a 429 from the search endpoint). Response bodies MSW resolves
// entirely inside the Service Worker never reach the browser's network stack, so
// `page.route()` cannot intercept them — this is MSW's documented Playwright
// integration pattern. This module is only ever imported when mocks are enabled
// (see src/main.ts), so it has no effect when VITE_USE_MOCKS=false / in production.
// Additionally gated on import.meta.env.DEV so it can never ship in a `vite build`
// output, even for a mocked demo/staging deployment built with VITE_USE_MOCKS=true —
// Playwright's webServer always runs via `npm run dev` (DEV mode), so this has no
// effect on the e2e suite.
declare global {
  interface Window {
    __msw?: { worker: typeof worker; http: typeof http; HttpResponse: typeof HttpResponse }
  }
}
if (import.meta.env.DEV) {
  window.__msw = { worker, http, HttpResponse }
}
