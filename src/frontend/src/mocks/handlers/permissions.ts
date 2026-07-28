import { http, HttpResponse } from 'msw'
import { mockPermissions } from '../data/permissions'
import type { Permission } from '@/types/api'

let permissions = [...mockPermissions]
let nextId = 100

export const permissionHandlers = [
  http.get('/api/permissions', () =>
    HttpResponse.json({ data: permissions, current_page: 1, last_page: 1, per_page: 100, total: permissions.length })),

  http.get('/api/permissions/:id', ({ params }) => {
    const permission = permissions.find((p) => p.id === Number(params.id))
    if (!permission) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: permission })
  }),

  http.post('/api/permissions', async ({ request }) => {
    const body = await request.json() as { name: string; description?: string }
    const newPermission: Permission = {
      id: nextId++,
      name: body.name,
      description: body.description ?? null,
      is_system: false,
    }
    permissions.push(newPermission)
    return HttpResponse.json({ data: newPermission }, { status: 201 })
  }),

  http.put('/api/permissions/:id', async ({ params, request }) => {
    const idx = permissions.findIndex((p) => p.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    permissions[idx] = { ...permissions[idx], ...body }
    return HttpResponse.json({ data: permissions[idx] })
  }),

  http.delete('/api/permissions/:id', ({ params }) => {
    const permission = permissions.find((p) => p.id === Number(params.id))
    if (!permission) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    if (permission.is_system) {
      return HttpResponse.json(
        { message: 'Permission ini adalah permission inti sistem dan tidak bisa dihapus.' },
        { status: 422 }
      )
    }
    permissions = permissions.filter((p) => p.id !== Number(params.id))
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
