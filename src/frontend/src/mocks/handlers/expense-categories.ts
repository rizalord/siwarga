import { http, HttpResponse } from 'msw'
import { mockExpenseCategories } from '../data/expense-categories'

const expenseCategories = [...mockExpenseCategories]
let nextId = 100

export const expenseCategoryHandlers = [
  http.get('/api/expense-categories', () =>
    HttpResponse.json({
      data: expenseCategories,
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: expenseCategories.length,
    })
  ),

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
    const idx = expenseCategories.findIndex((c) => c.id === Number(params.id))
    if (idx === -1)
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    expenseCategories[idx] = {
      ...expenseCategories[idx],
      deleted_at: new Date().toISOString(),
    }
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
