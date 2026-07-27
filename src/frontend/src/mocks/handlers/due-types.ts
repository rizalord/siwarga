import { http, HttpResponse } from 'msw'
import { mockDueTypes } from '../data/due-types'

let dueTypes = [...mockDueTypes]
let nextId = 100

export const dueTypeHandlers = [
  http.get('/api/due-types', () =>
    HttpResponse.json({ data: dueTypes, current_page: 1, last_page: 1, per_page: 10, total: dueTypes.length })),

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
    const idx = dueTypes.findIndex((d) => d.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    dueTypes[idx] = { ...dueTypes[idx], deleted_at: new Date().toISOString() }
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
