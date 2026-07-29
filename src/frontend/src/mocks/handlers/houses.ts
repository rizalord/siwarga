import { http, HttpResponse } from 'msw'
import { mockHouses } from '../data/houses'
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

const houses = [...mockHouses]
let nextId = 100

export const houseHandlers = [
  http.get('/api/houses', ({ request }) => {
    const url = new URL(request.url)
    const filtered = applyTrashedFilter(houses, url.searchParams.get('trashed'))

    return HttpResponse.json(buildPaginatedResponse(filtered))
  }),

  http.get('/api/houses/:id', ({ params }) => {
    const house = houses.find((h) => h.id === Number(params.id))
    if (!house) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: house })
  }),

  http.post('/api/houses', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newHouse = {
      id: nextId++,
      house_number: body.house_number as string,
      address: (body.address as string) || '',
      status: 'kosong' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    houses.push(newHouse)
    return HttpResponse.json({ data: newHouse }, { status: 201 })
  }),

  http.put('/api/houses/:id', async ({ params, request }) => {
    const idx = houses.findIndex((h) => h.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    houses[idx] = { ...houses[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: houses[idx] })
  }),

  http.get('/api/houses/:id/history', ({ params }) => {
    return HttpResponse.json({
      data: [
        { id: 1, house_id: Number(params.id), resident: { id: 1, full_name: 'Ahmad Fauzi' }, start_date: '2024-01-01', end_date: null },
      ],
    })
  }),

  http.post('/api/houses/:id/assign-resident', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const houseIdx = houses.findIndex((h) => h.id === Number(params.id))
    if (houseIdx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    houses[houseIdx] = {
      ...houses[houseIdx],
      status: 'dihuni',
      current_resident: { id: body.resident_id as number, full_name: 'Assigned Resident', status: 'tetap' } as never,
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json({ data: houses[houseIdx] })
  }),

  http.post('/api/houses/:id/vacate-resident', ({ params }) => {
    const houseIdx = houses.findIndex((h) => h.id === Number(params.id))
    if (houseIdx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    houses[houseIdx] = {
      ...houses[houseIdx],
      status: 'kosong',
      current_resident: undefined,
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json({ data: null, message: 'Penghuni berhasil dicopot dari rumah' })
  }),

  http.delete('/api/houses/:id', ({ params }) => {
    const house = softDeleteById(houses, Number(params.id))
    if (!house) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),

  http.post('/api/houses/:id/restore', ({ params }) => {
    const house = restoreById(houses, Number(params.id))
    if (!house) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: house })
  }),

  http.delete('/api/houses/:id/force-delete', ({ params }) => {
    const deleted = forceDeleteById(houses, Number(params.id))
    if (!deleted) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted permanently' })
  }),

  http.post('/api/houses/bulk-delete', async ({ request }) => {
    const deleted = bulkSoftDelete(houses, await readIds(request))
    return HttpResponse.json({ data: null, message: `${deleted} data berhasil dihapus` })
  }),

  http.post('/api/houses/bulk-restore', async ({ request }) => {
    const restored = bulkRestore(houses, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${restored} data berhasil dipulihkan`,
    })
  }),

  http.post('/api/houses/bulk-force-delete', async ({ request }) => {
    const deleted = bulkForceDelete(houses, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${deleted} data berhasil dihapus permanen`,
    })
  }),
]
