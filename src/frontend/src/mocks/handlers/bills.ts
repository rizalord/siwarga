import { http, HttpResponse } from 'msw'
import { mockBills } from '../data/bills'
import type { Bill } from '@/types/api'
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

const bills = [...mockBills]
let nextId = 100

export const billHandlers = [
  http.get('/api/bills', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const houseId = url.searchParams.get('house_id')
    const dueTypeId = url.searchParams.get('due_type_id')
    let filtered = applyTrashedFilter(bills, url.searchParams.get('trashed'))
    if (status) filtered = filtered.filter((b) => b.status === status)
    if (houseId) filtered = filtered.filter((b) => b.house.id === Number(houseId))
    if (dueTypeId) filtered = filtered.filter((b) => b.due_type.id === Number(dueTypeId))
    return HttpResponse.json(buildPaginatedResponse(filtered))
  }),

  http.get('/api/bills/:id', ({ params }) => {
    const bill = bills.find((b) => b.id === Number(params.id))
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: bill })
  }),

  http.post('/api/bills/generate', async ({ request }) => {
    const body = await request.json() as { month: number; year: number; due_type_id?: number }
    const newBill: Bill = {
      id: nextId++,
      house: { id: 1, house_number: 'A-01', address: 'Jl. Mawar No. 1', status: 'dihuni', created_at: '', updated_at: '', deleted_at: null },
      resident: { id: 1, full_name: 'Ahmad Fauzi', status: 'tetap', phone_number: '081234567890', marital_status: 'menikah', ktp_photo_url: null, created_at: '', updated_at: '', deleted_at: null },
      due_type: { id: body.due_type_id ?? 1, name: 'Iuran Satpam', amount: 100000, billing_cycle: 'bulanan', created_at: '', updated_at: '', deleted_at: null },
      period_start: `${body.year}-${String(body.month).padStart(2, '0')}-01`,
      period_end: `${body.year}-${String(body.month).padStart(2, '0')}-28`,
      amount_due: 100000,
      total_paid: 0,
      status: 'belum_lunas' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    bills.push(newBill)
    return HttpResponse.json({ data: newBill }, { status: 201 })
  }),

  http.put('/api/bills/:id', async ({ params, request }) => {
    const idx = bills.findIndex((b) => b.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    bills[idx] = { ...bills[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: bills[idx] })
  }),

  http.delete('/api/bills/:id', ({ params }) => {
    const bill = softDeleteById(bills, Number(params.id))
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),

  http.post('/api/bills/:id/restore', ({ params }) => {
    const bill = restoreById(bills, Number(params.id))
    if (!bill) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: bill })
  }),

  http.delete('/api/bills/:id/force-delete', ({ params }) => {
    const deleted = forceDeleteById(bills, Number(params.id))
    if (!deleted) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted permanently' })
  }),

  http.post('/api/bills/bulk-delete', async ({ request }) => {
    const deleted = bulkSoftDelete(bills, await readIds(request))
    return HttpResponse.json({ data: null, message: `${deleted} data berhasil dihapus` })
  }),

  http.post('/api/bills/bulk-restore', async ({ request }) => {
    const restored = bulkRestore(bills, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${restored} data berhasil dipulihkan`,
    })
  }),

  http.post('/api/bills/bulk-force-delete', async ({ request }) => {
    const deleted = bulkForceDelete(bills, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${deleted} data berhasil dihapus permanen`,
    })
  }),
]
