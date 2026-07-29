import { http, HttpResponse } from 'msw'
import { mockPayments } from '../data/payments'
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

const payments = [...mockPayments]
let nextId = 100

export const paymentHandlers = [
  http.get('/api/payments', ({ request }) => {
    const url = new URL(request.url)
    const billId = url.searchParams.get('bill_id')
    let filtered = applyTrashedFilter(payments, url.searchParams.get('trashed'))
    if (billId) filtered = filtered.filter((p) => p.bill_id === Number(billId))
    return HttpResponse.json(buildPaginatedResponse(filtered))
  }),

  http.get('/api/payments/:id', ({ params }) => {
    const payment = payments.find((p) => p.id === Number(params.id))
    if (!payment) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: payment })
  }),

  http.post('/api/payments', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const newPayment = {
      id: nextId++,
      bill_id: body.bill_id as number,
      amount_paid: body.amount_paid as number,
      payment_date: body.payment_date as string,
      notes: (body.notes as string) || null,
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    payments.push(newPayment)
    return HttpResponse.json({ data: newPayment }, { status: 201 })
  }),

  http.put('/api/payments/:id', async ({ params, request }) => {
    const idx = payments.findIndex((p) => p.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    payments[idx] = { ...payments[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: payments[idx] })
  }),

  http.delete('/api/payments/:id', ({ params }) => {
    const payment = softDeleteById(payments, Number(params.id))
    if (!payment) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),

  http.post('/api/payments/:id/restore', ({ params }) => {
    const payment = restoreById(payments, Number(params.id))
    if (!payment) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: payment })
  }),

  http.delete('/api/payments/:id/force-delete', ({ params }) => {
    const deleted = forceDeleteById(payments, Number(params.id))
    if (!deleted) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted permanently' })
  }),

  http.post('/api/payments/bulk-delete', async ({ request }) => {
    const deleted = bulkSoftDelete(payments, await readIds(request))
    return HttpResponse.json({ data: null, message: `${deleted} data berhasil dihapus` })
  }),

  http.post('/api/payments/bulk-restore', async ({ request }) => {
    const restored = bulkRestore(payments, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${restored} data berhasil dipulihkan`,
    })
  }),

  http.post('/api/payments/bulk-force-delete', async ({ request }) => {
    const deleted = bulkForceDelete(payments, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${deleted} data berhasil dihapus permanen`,
    })
  }),
]
