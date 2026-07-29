import { http, HttpResponse } from 'msw'
import { mockExpenseCategories } from '../data/expense-categories'
import { mockExpenses } from '../data/expenses'

const expenses = [...mockExpenses]
let nextId = 100

export const expenseHandlers = [
  http.get('/api/expenses', ({ request }) => {
    const url = new URL(request.url)
    const month = url.searchParams.get('month')
    const year = url.searchParams.get('year')
    const categoryId = url.searchParams.get('category_id')
    let filtered = [...expenses]
    if (month) filtered = filtered.filter((e) => new Date(e.expense_date).getMonth() + 1 === Number(month))
    if (year) filtered = filtered.filter((e) => new Date(e.expense_date).getFullYear() === Number(year))
    if (categoryId) filtered = filtered.filter((e) => e.category.id === Number(categoryId))
    return HttpResponse.json({
      data: filtered,
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: filtered.length,
    })
  }),

  http.get('/api/expenses/:id', ({ params }) => {
    const expense = expenses.find((e) => e.id === Number(params.id))
    if (!expense) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: expense })
  }),

  http.post('/api/expenses', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const category = mockExpenseCategories.find((c) => c.id === Number(body.category_id)) ?? mockExpenseCategories[0]
    const newExpense = {
      id: nextId++,
      category,
      description: (body.description as string) || null,
      amount: body.amount as number,
      expense_date: body.expense_date as string,
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    expenses.push(newExpense)
    return HttpResponse.json({ data: newExpense }, { status: 201 })
  }),

  http.put('/api/expenses/:id', async ({ params, request }) => {
    const idx = expenses.findIndex((e) => e.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    const category = body.category_id
      ? (mockExpenseCategories.find((c) => c.id === Number(body.category_id)) ?? expenses[idx].category)
      : expenses[idx].category
    expenses[idx] = { ...expenses[idx], ...body, category, updated_at: new Date().toISOString() }
    return HttpResponse.json({ data: expenses[idx] })
  }),

  http.delete('/api/expenses/:id', ({ params }) => {
    const idx = expenses.findIndex((e) => e.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    expenses[idx] = { ...expenses[idx], deleted_at: new Date().toISOString() }
    return HttpResponse.json({ data: null, message: 'Deleted' })
  }),
]
