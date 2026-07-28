import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { housesService } from '@/services/houses'
import type { HouseFilter, CreateHouseRequest, AssignResidentRequest } from '@/types/api'

export function useHouses(params?: HouseFilter) {
  return useQuery({
    queryKey: ['houses', params],
    queryFn: () => housesService.getAll({ per_page: 1000, ...params }),
    select: (res) => res.data,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['houses'] }),
  })
}

export function useUpdateHouse(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateHouseRequest>) => housesService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['houses'] }),
  })
}

export function useDeleteHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => housesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['houses'] }),
  })
}

export function useAssignResident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AssignResidentRequest }) =>
      housesService.assignResident(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['houses'] }),
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
