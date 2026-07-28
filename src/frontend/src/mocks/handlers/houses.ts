import { http, HttpResponse } from 'msw'
import { mockHouses } from '../data/houses'

const houses = [...mockHouses]
let nextId = 100

export const houseHandlers = [
  http.get('/api/houses', () =>
    HttpResponse.json({ data: houses, current_page: 1, last_page: 1, per_page: 10, total: houses.length })),

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
]
