import { http, HttpResponse } from 'msw'
import { mockDueTypes } from '../data/due-types'
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

const dueTypes = [...mockDueTypes]
let nextId = 100

export const dueTypeHandlers = [
  http.get('/api/due-types', ({ request }) => {
    const url = new URL(request.url)
    const filtered = applyTrashedFilter(dueTypes, url.searchParams.get('trashed'))

    return HttpResponse.json(buildPaginatedResponse(filtered))
  }),

  http.get('/api/due-types/:id', ({ params }) => {
    const dueType = dueTypes.find((d) => d.id === Number(params.id))
    if (!dueType) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: dueType })
  }),

  http.post('/api/due-types', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newDueType = {
      id: nextId++,
      name: body.name as string,
      amount: body.amount as number,
      billing_cycle: (body.billing_cycle as 'bulanan' | 'fleksibel') || 'bulanan',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    dueTypes.push(newDueType)
    return HttpResponse.json({ data: newDueType }, { status: 201 })
  }),

  http.put('/api/due-types/:id', async ({ params, request }) => {
    const idx = dueTypes.findIndex((d) => d.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    dueTypes[idx] = { ...dueTypes[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: dueTypes[idx] })
  }),

  http.delete('/api/due-types/:id', ({ params }) => {
    const dueType = softDeleteById(dueTypes, Number(params.id))
    if (!dueType) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),

  http.post('/api/due-types/:id/restore', ({ params }) => {
    const dueType = restoreById(dueTypes, Number(params.id))
    if (!dueType) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: dueType })
  }),

  http.delete('/api/due-types/:id/force-delete', ({ params }) => {
    const deleted = forceDeleteById(dueTypes, Number(params.id))
    if (!deleted) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted permanently' })
  }),

  http.post('/api/due-types/bulk-delete', async ({ request }) => {
    const deleted = bulkSoftDelete(dueTypes, await readIds(request))
    return HttpResponse.json({ data: null, message: `${deleted} data berhasil dihapus` })
  }),

  http.post('/api/due-types/bulk-restore', async ({ request }) => {
    const restored = bulkRestore(dueTypes, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${restored} data berhasil dipulihkan`,
    })
  }),

  http.post('/api/due-types/bulk-force-delete', async ({ request }) => {
    const deleted = bulkForceDelete(dueTypes, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${deleted} data berhasil dihapus permanen`,
    })
  }),
]
