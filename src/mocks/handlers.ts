import { http, HttpResponse } from 'msw'
import type { User } from '../types/User'

const mockUser: User = {
  id: 1,
  name: 'Anna Petrenko',
  email: 'anna@example.com',
  avatar_url: null,
  status: 'active',
  last_seen_at: '2026-07-03T12:00:00Z',
}

let isAuthenticated = false

export const handlers = [
  http.get('*/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),

  http.post('*/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    if (!body.email || !body.password) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 422 })
    }
    isAuthenticated = true
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/logout', () => {
    isAuthenticated = false
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/user', () => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    return HttpResponse.json(mockUser)
  }),
]
