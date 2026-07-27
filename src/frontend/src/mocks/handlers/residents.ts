import { http, HttpResponse } from 'msw'
import { mockResidents } from '../data/residents'

let residents = [...mockResidents]
let nextId = 100

export const residentHandlers = [
  http.get('/api/residents', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    let filtered = [...residents]
    if (status) filtered = filtered.filter((r) => r.status === status)
    if (search) filtered = filtered.filter((r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()),
    )
    return HttpResponse.json({
      data: filtered,
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: filtered.length,
    })
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
    const idx = residents.findIndex((r) => r.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    residents[idx] = { ...residents[idx], deleted_at: new Date().toISOString() }
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
