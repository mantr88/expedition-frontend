import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function ensureCsrfCookie() {
  return apiClient.get('/sanctum/csrf-cookie')
}

type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler
}

export function getRetryAfterSeconds(error: unknown): number {
  const err = error as { response?: { headers?: Record<string, string> } }
  const raw = err.response?.headers?.['retry-after']
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 10
}

let lastRateLimitToastAt = 0

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401 || status === 419) {
      onUnauthorized?.()
    }
    if (status === 429) {
      const now = Date.now()
      if (now - lastRateLimitToastAt > 3000) {
        lastRateLimitToastAt = now
        // Ліниво, щоб уникнути звернення до Pinia до створення застосунку
        import('../stores/toasts').then(({ useToastsStore }) => {
          useToastsStore().push(
            'error',
            `Занадто багато запитів. Спробуйте через ${getRetryAfterSeconds(error)} с.`,
          )
        })
      }
    }
    return Promise.reject(error)
  },
)
