import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dueTypesService } from '@/services/due-types'
import type { CreateDueTypeRequest } from '@/types/api'

export function useDueTypes() {
  return useQuery({
    queryKey: ['due-types'],
    queryFn: () => dueTypesService.getAll({ per_page: 1000 }),
    select: (res) => res.data,
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
