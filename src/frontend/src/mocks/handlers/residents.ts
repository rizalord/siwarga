import { http, HttpResponse } from 'msw'
import { mockResidents } from '../data/residents'
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

const residents = [...mockResidents]
let nextId = 100

export const residentHandlers = [
  http.get('/api/residents', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const maritalStatus = url.searchParams.get('marital_status')
    const search = url.searchParams.get('search')
    let filtered = applyTrashedFilter(residents, url.searchParams.get('trashed'))
    if (status) filtered = filtered.filter((r) => r.status === status)
    if (maritalStatus) filtered = filtered.filter((r) => r.marital_status === maritalStatus)
    if (search) filtered = filtered.filter((r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()),
    )
    return HttpResponse.json(buildPaginatedResponse(filtered))
  }),

  http.get('/api/residents/:id', ({ params }) => {
    const resident = residents.find((r) => r.id === Number(params.id))
    if (!resident) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: resident })
  }),

  http.post('/api/residents', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newResident = {
      id: nextId++,
      full_name: body.full_name as string,
      ktp_photo_url: null,
      status: body.status as 'kontrak' | 'tetap',
      phone_number: body.phone_number as string,
      marital_status: body.marital_status as 'menikah' | 'belum_menikah',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    residents.push(newResident)
    return HttpResponse.json({ data: newResident }, { status: 201 })
  }),

  http.put('/api/residents/:id', async ({ params, request }) => {
    const idx = residents.findIndex((r) => r.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    residents[idx] = { ...residents[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: residents[idx] })
  }),

  http.delete('/api/residents/:id', ({ params }) => {
    const resident = softDeleteById(residents, Number(params.id))
    if (!resident) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),

  http.post('/api/residents/:id/restore', ({ params }) => {
    const resident = restoreById(residents, Number(params.id))
    if (!resident) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: resident })
  }),

  http.delete('/api/residents/:id/force-delete', ({ params }) => {
    const deleted = forceDeleteById(residents, Number(params.id))
    if (!deleted) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted permanently' })
  }),

  http.post('/api/residents/bulk-delete', async ({ request }) => {
    const deleted = bulkSoftDelete(residents, await readIds(request))
    return HttpResponse.json({ data: null, message: `${deleted} data berhasil dihapus` })
  }),

  http.post('/api/residents/bulk-restore', async ({ request }) => {
    const restored = bulkRestore(residents, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${restored} data berhasil dipulihkan`,
    })
  }),

  http.post('/api/residents/bulk-force-delete', async ({ request }) => {
    const deleted = bulkForceDelete(residents, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${deleted} data berhasil dihapus permanen`,
    })
  }),
]
