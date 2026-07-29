import { http, HttpResponse } from 'msw'
import { mockExpenseCategories } from '../data/expense-categories'
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

const expenseCategories = [...mockExpenseCategories]
let nextId = 100

export const expenseCategoryHandlers = [
  http.get('/api/expense-categories', ({ request }) => {
    const url = new URL(request.url)
    const filtered = applyTrashedFilter(
      expenseCategories,
      url.searchParams.get('trashed')
    )

    return HttpResponse.json(buildPaginatedResponse(filtered))
  }),

  http.get('/api/expense-categories/:id', ({ params }) => {
    const category = expenseCategories.find((c) => c.id === Number(params.id))
    if (!category)
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: category })
  }),

  http.post('/api/expense-categories', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const newCategory = {
      id: nextId++,
      name: body.name as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    expenseCategories.push(newCategory)
    return HttpResponse.json({ data: newCategory }, { status: 201 })
  }),

  http.put('/api/expense-categories/:id', async ({ params, request }) => {
    const idx = expenseCategories.findIndex((c) => c.id === Number(params.id))
    if (idx === -1)
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    expenseCategories[idx] = {
      ...expenseCategories[idx],
      ...body,
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json({ data: expenseCategories[idx] })
  }),

  http.delete('/api/expense-categories/:id', ({ params }) => {
    const category = softDeleteById(expenseCategories, Number(params.id))
    if (!category)
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),

  http.post('/api/expense-categories/:id/restore', ({ params }) => {
    const category = restoreById(expenseCategories, Number(params.id))
    if (!category)
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: category })
  }),

  http.delete('/api/expense-categories/:id/force-delete', ({ params }) => {
    const deleted = forceDeleteById(expenseCategories, Number(params.id))
    if (!deleted)
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: null, message: 'Deleted permanently' })
  }),

  http.post('/api/expense-categories/bulk-delete', async ({ request }) => {
    const deleted = bulkSoftDelete(expenseCategories, await readIds(request))
    return HttpResponse.json({ data: null, message: `${deleted} data berhasil dihapus` })
  }),

  http.post('/api/expense-categories/bulk-restore', async ({ request }) => {
    const restored = bulkRestore(expenseCategories, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${restored} data berhasil dipulihkan`,
    })
  }),

  http.post('/api/expense-categories/bulk-force-delete', async ({ request }) => {
    const deleted = bulkForceDelete(expenseCategories, await readIds(request))
    return HttpResponse.json({
      data: null,
      message: `${deleted} data berhasil dihapus permanen`,
    })
  }),
]
