import { http, HttpResponse } from 'msw'
import { mockUsers } from '../data/users'

let users = [...mockUsers]
let nextId = 100

export const userHandlers = [
  http.get('/api/users', () =>
    HttpResponse.json({ data: users, current_page: 1, last_page: 1, per_page: 10, total: users.length })),

  http.get('/api/users/:id', ({ params }) => {
    const user = users.find((u) => u.id === Number(params.id))
    if (!user) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: user })
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    const idx = users.findIndex((u) => u.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    users[idx] = { ...users[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: users[idx] })
  }),
]
