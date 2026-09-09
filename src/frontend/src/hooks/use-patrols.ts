import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patrolsService } from '@/services/patrols'
import type { PatrolFilter, PatrolInput } from '@/types/api'
import { toast } from 'sonner'

export function usePatrols(params?: PatrolFilter) {
  return useQuery({
    queryKey: ['patrols', params],
    queryFn: () => patrolsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useCreatePatrol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PatrolInput) => patrolsService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrols'] })
      toast.success('Jadwal ronda disimpan')
    },
    onError: () => toast.error('Gagal menyimpan jadwal ronda'),
  })
}

export function useUpdatePatrol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<PatrolInput> }) =>
      patrolsService.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrols'] })
      toast.success('Jadwal ronda disimpan')
    },
    onError: () => toast.error('Gagal menyimpan jadwal ronda'),
  })
}

export function useDeletePatrol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => patrolsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrols'] })
      toast.success('Jadwal ronda dihapus')
    },
    onError: () => toast.error('Gagal menghapus jadwal ronda'),
  })
}
