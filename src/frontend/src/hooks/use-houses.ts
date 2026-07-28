import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { housesService } from '@/services/houses'
import type { HouseFilter, CreateHouseRequest, AssignResidentRequest } from '@/types/api'

export function useHouses(params?: HouseFilter) {
  return useQuery({
    queryKey: ['houses', params],
    queryFn: () => housesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useHouse(id: number) {
  return useQuery({
    queryKey: ['houses', id],
    queryFn: () => housesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHouseRequest) => housesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['houses'] })
      toast.success('Rumah berhasil ditambahkan')
    },
  })
}

export function useUpdateHouse(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateHouseRequest>) => housesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['houses'] })
      toast.success('Rumah berhasil diperbarui')
    },
  })
}

export function useDeleteHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => housesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['houses'] })
      toast.success('Rumah berhasil dihapus')
    },
  })
}

export function useBulkDeleteHouses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => housesService.bulkDelete(ids),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['houses'] })
      toast.success(res.data.message ?? 'Rumah terpilih berhasil dihapus')
    },
  })
}

export function useAssignResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AssignResidentRequest }) =>
      housesService.assignResident(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['houses'] })
      toast.success('Penghuni berhasil ditempatkan')
    },
  })
}

export function useVacateResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => housesService.vacateResident(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['houses'] })
      toast.success(res.data.message ?? 'Penghuni berhasil dicopot')
    },
  })
}

export function useHouseResidents(id: number) {
  return useQuery({
    queryKey: ['houses', id, 'residents'],
    queryFn: () => housesService.getResidents(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}
