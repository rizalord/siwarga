import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dueTypesService } from '@/services/due-types'
import type { CreateDueTypeRequest, DueTypeFilter } from '@/types/api'

export function useDueTypes(params?: DueTypeFilter) {
  return useQuery({
    queryKey: ['due-types', params],
    queryFn: () => dueTypesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useDueType(id: number) {
  return useQuery({
    queryKey: ['due-types', id],
    queryFn: () => dueTypesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateDueType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDueTypeRequest) => dueTypesService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['due-types'] }),
  })
}

export function useUpdateDueType(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDueTypeRequest) => dueTypesService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['due-types'] }),
  })
}

export function useDeleteDueType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => dueTypesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['due-types'] }),
  })
}
