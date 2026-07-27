import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesService } from '@/services/expenses'
import type { ExpenseFilter, CreateExpenseRequest } from '@/types/api'

export function useExpenses(params?: ExpenseFilter) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesService.getAll(params),
    select: (res) => res.data,
  })
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesService.getById(id),
    select: (res) => res.data,
    enabled: !!id,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => expensesService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateExpense(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateExpenseRequest>) => expensesService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expensesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}
