import { http, HttpResponse } from 'msw'

export const reportHandlers = [
  http.get('/api/reports/monthly', ({ request }) => {
    const url = new URL(request.url)
    const month = Number(url.searchParams.get('month')) || 7
    const year = Number(url.searchParams.get('year')) || 2026
    return HttpResponse.json({
      data: {
        year,
        month,
        total_income: 100000,
        total_expense: 500000,
        balance: -400000,
        payments: [
          { id: 1, bill_id: 1, amount_paid: 100000, payment_date: `${year}-${String(month).padStart(2, '0')}-15`, notes: 'Bayar iuran', created_by: 1, created_at: '', updated_at: '', deleted_at: null },
        ],
        expenses: [
          { id: 1, category: 'Gaji Satpam', description: 'Gaji satpam', amount: 500000, expense_date: `${year}-${String(month).padStart(2, '0')}-01`, created_by: 1, created_at: '', updated_at: '', deleted_at: null },
        ],
      },
    })
  }),

  http.get('/api/reports/yearly', ({ request }) => {
    const url = new URL(request.url)
    const year = Number(url.searchParams.get('year')) || 2026
    return HttpResponse.json({
      data: {
        year,
        monthly_data: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          total_income: 100000,
          total_expense: 500000,
          balance: -400000,
        })),
        year_balance: -4800000,
      },
    })
  }),
]
