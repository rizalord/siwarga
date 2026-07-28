import { http, HttpResponse } from 'msw'
import { mockRoles } from '../data/roles'
import { mockPermissions } from '../data/permissions'
import type { Role } from '@/types/api'

let roles = [...mockRoles]
let nextId = 100

export const roleHandlers = [
  http.get('/api/roles', () =>
    HttpResponse.json({ data: roles, current_page: 1, last_page: 1, per_page: 10, total: roles.length })),

  http.get('/api/roles/:id', ({ params }) => {
    const role = roles.find((r) => r.id === Number(params.id))
    if (!role) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: role })
  }),

  http.post('/api/roles', async ({ request }) => {
    const body = await request.json() as { name: string; description?: string; permission_ids?: number[] }
    const newRole: Role = {
      id: nextId++,
      name: body.name,
      description: body.description ?? null,
      permissions: mockPermissions.filter((p) => body.permission_ids?.includes(p.id)),
      users_count: 0,
    }
    roles.push(newRole)
    return HttpResponse.json({ data: newRole }, { status: 201 })
  }),

  http.put('/api/roles/:id', async ({ params, request }) => {
    const idx = roles.findIndex((r) => r.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as { name?: string; description?: string; permission_ids?: number[] }
    roles[idx] = {
      ...roles[idx],
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.permission_ids !== undefined
        ? { permissions: mockPermissions.filter((p) => body.permission_ids?.includes(p.id)) }
        : {}),
    }
    return HttpResponse.json({ data: roles[idx] })
  }),

  http.delete('/api/roles/:id', ({ params }) => {
    const role = roles.find((r) => r.id === Number(params.id))
    if (!role) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    if ((role.users_count ?? 0) > 0) {
      return HttpResponse.json(
        { message: 'Role tidak bisa dihapus karena masih digunakan oleh pengguna.' },
        { status: 422 }
      )
    }
    roles = roles.filter((r) => r.id !== Number(params.id))
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
