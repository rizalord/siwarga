import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { familyService } from '@/services/family'
import type { FamilyFilter, FamilyInput } from '@/types/api'
import { toast } from 'sonner'

export function useFamilyMembers(params?: FamilyFilter) {
  return useQuery({
    queryKey: ['family-members', params],
    queryFn: () => familyService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: FamilyInput) => familyService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members'] })
      qc.invalidateQueries({ queryKey: ['household-card'] })
      toast.success('Anggota keluarga ditambahkan')
    },
    onError: () => toast.error('Gagal menambahkan anggota keluarga'),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<FamilyInput> }) =>
      familyService.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members'] })
      qc.invalidateQueries({ queryKey: ['household-card'] })
      toast.success('Anggota keluarga ditambahkan')
    },
    onError: () => toast.error('Gagal menyimpan anggota keluarga'),
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => familyService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members'] })
      qc.invalidateQueries({ queryKey: ['household-card'] })
      toast.success('Anggota keluarga dihapus')
    },
    onError: () => toast.error('Gagal menghapus anggota keluarga'),
  })
}

export function useHouseholdCard() {
  return useQuery({
    queryKey: ['household-card'],
    queryFn: () => familyService.card(),
    select: (res) => res.data,
  })
}
