import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { expenseCategoriesService } from '@/services/expense-categories'
import type { CreateExpenseCategoryRequest, ExpenseCategoryFilter } from '@/types/api'

export function useExpenseCategories(params?: ExpenseCategoryFilter) {
  return useQuery({
    queryKey: ['expense-categories', params],
    queryFn: () => expenseCategoriesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useExpenseCategory(id: number) {
  return useQuery({
    queryKey: ['expense-categories', id],
    queryFn: () => expenseCategoriesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseCategoryRequest) => expenseCategoriesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Kategori pengeluaran berhasil ditambahkan')
    },
  })
}

export function useUpdateExpenseCategory(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseCategoryRequest) => expenseCategoriesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Kategori pengeluaran berhasil diperbarui')
    },
  })
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expenseCategoriesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Kategori pengeluaran berhasil dihapus')
    },
  })
}

export function useBulkDeleteExpenseCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => expenseCategoriesService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Kategori pengeluaran terpilih berhasil dihapus')
    },
  })
}
