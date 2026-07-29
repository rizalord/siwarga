import { http, HttpResponse } from 'msw'
import { mockUsers } from '../data/users'
import { mockRoles } from '../data/roles'
import type { User } from '@/types/api'
import {
  applyTrashedFilter,
  buildPaginatedResponse,
  bulkForceDelete,
  bulkRestore,
  bulkSoftDelete,
  forceDeleteById,
  readIds,
  restoreById,
  softDeleteById,
} from './soft-delete'

const users = [...mockUsers]
let nextId = 100

function otherAdminExists(excludeUserId?: number) {
  return users.some(
    (u) => u.deleted_at === null && u.id !== excludeUserId && u.roles.some((r) => r.is_admin)
  )
}

export const userHandlers = [
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url)
    const filtered = applyTrashedFilter(users, url.searchParams.get('trashed'))

    return HttpResponse.json(buildPaginatedResponse(filtered))
  }),

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
    const user = softDeleteById(users, Number(params.id))
    if (!user) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),

  http.post('/api/users/:id/restore', ({ params }) => {
    const user = restoreById(users, Number(params.id))
    if (!user) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: user })
  }),

  http.delete('/api/users/:id/force-delete', ({ params }) => {
    const deleted = forceDeleteById(users, Number(params.id))
    if (!deleted) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted permanently' })
  }),

  http.post('/api/users/bulk-delete', async ({ request }) => {
    const deleted = bulkSoftDelete(users, await readIds(request))
    return HttpResponse.json({ data: null, message: `${deleted} data berhasil dihapus` })
  }),

  http.post('/api/users/bulk-restore', async ({ request }) => {
    const restored = bulkRestore(users, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${restored} data berhasil dipulihkan`,
    })
  }),

  http.post('/api/users/bulk-force-delete', async ({ request }) => {
    const deleted = bulkForceDelete(users, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${deleted} data berhasil dihapus permanen`,
    })
  }),
]
