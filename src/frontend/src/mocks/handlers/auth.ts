import { http, HttpResponse } from 'msw'
import { mockUsers } from '../data/users'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    const user = mockUsers.find((u) => u.email === body.email)
    if (!user) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }
    return HttpResponse.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email, permissions: ['*'] },
        token: 'mock-token-123',
      },
    })
  }),

  http.post('/api/auth/logout', () =>
    HttpResponse.json({ data: null, message: 'Logged out' })),

  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ data: { token: 'mock-token-refreshed' } })),

  http.get('/api/auth/me', () => {
    const user = mockUsers[0]
    return HttpResponse.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        permissions: ['*'],
      },
    })
  }),
]
