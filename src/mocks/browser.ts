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
declare global {
  interface Window {
    __msw?: { worker: typeof worker; http: typeof http; HttpResponse: typeof HttpResponse }
  }
}
window.__msw = { worker, http, HttpResponse }
