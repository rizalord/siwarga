import { http, HttpResponse } from 'msw'
import { mockUsers } from '../data/users'
import { mockRoles } from '../data/roles'
import type { User } from '@/types/api'

let users = [...mockUsers]
let nextId = 100

function otherAdminExists(excludeUserId?: number) {
  return users.some(
    (u) => u.id !== excludeUserId && u.roles.some((r) => r.is_admin)
  )
}

export const userHandlers = [
  http.get('/api/users', () =>
    HttpResponse.json({ data: users, current_page: 1, last_page: 1, per_page: 10, total: users.length })),

  http.get('/api/users/:id', ({ params }) => {
    const user = users.find((u) => u.id === Number(params.id))
    if (!user) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: user })
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as { name: string; email: string; is_active?: boolean; role_ids?: number[] }
    const roles = mockRoles.filter((r) => body.role_ids?.includes(r.id))

    if (roles.some((r) => r.is_admin) && otherAdminExists()) {
      return HttpResponse.json(
        { message: 'Sudah ada user dengan role admin. Hanya diperbolehkan satu admin untuk menghindari konflik kepentingan.' },
        { status: 422 }
      )
    }

    const newUser: User = {
      id: nextId++,
      name: body.name,
      email: body.email,
      is_active: body.is_active ?? true,
      resident_id: null,
      roles,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    users.push(newUser)
    return HttpResponse.json({ data: newUser }, { status: 201 })
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    const idx = users.findIndex((u) => u.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown> & { role_ids?: number[] }

    if (body.role_ids !== undefined) {
      const targetUser = users[idx]
      const userIsAdmin = targetUser.roles.some((r) => r.is_admin)
      const roles = mockRoles.filter((r) => body.role_ids?.includes(r.id))
      const willBeAdmin = roles.some((r) => r.is_admin)

      if (userIsAdmin && !willBeAdmin) {
        return HttpResponse.json(
          { message: 'User dengan role admin tidak bisa dipindahkan ke role lain.' },
          { status: 422 }
        )
      }
      if (!userIsAdmin && willBeAdmin && otherAdminExists(targetUser.id)) {
        return HttpResponse.json(
          { message: 'Sudah ada user dengan role admin. Hanya diperbolehkan satu admin untuk menghindari konflik kepentingan.' },
          { status: 422 }
        )
      }

      const { role_ids: _roleIds, ...rest } = body
      users[idx] = { ...targetUser, ...rest, roles, updated_at: new Date().toISOString() }
      return HttpResponse.json({ data: users[idx] })
    }

    users[idx] = { ...users[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: users[idx] })
  }),

  http.delete('/api/users/:id', ({ params }) => {
    const idx = users.findIndex((u) => u.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    users = users.filter((u) => u.id !== Number(params.id))
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
