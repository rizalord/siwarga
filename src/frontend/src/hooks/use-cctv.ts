import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cctvService, type CameraInput } from '@/services/cctv'
import type { SnapshotFilter } from '@/types/api'
import { toast } from 'sonner'

export function useCameras(
  params?: { page?: number; search?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['cameras', params],
    queryFn: () => cctvService.cameras(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  })
}

export function useCreateCamera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CameraInput) => cctvService.createCamera(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] })
      toast.success('Kamera disimpan')
    },
    onError: () => toast.error('Gagal menyimpan kamera'),
  })
}

export function useUpdateCamera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CameraInput> }) =>
      cctvService.updateCamera(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] })
      toast.success('Kamera disimpan')
    },
    onError: () => toast.error('Gagal menyimpan kamera'),
  })
}

export function useDeleteCamera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cctvService.deleteCamera(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] })
      toast.success('Kamera dihapus')
    },
    onError: () => toast.error('Gagal menghapus kamera'),
  })
}

export function useSnapshots(
  params?: SnapshotFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['camera-snapshots', params],
    queryFn: () => cctvService.snapshots(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  })
}

export function useDeleteSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cctvService.deleteSnapshot(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camera-snapshots'] })
      toast.success('Snapshot dihapus')
    },
    onError: () => toast.error('Gagal menghapus snapshot'),
  })
}

export function useSimulateCamera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, count = 1 }: { id: number; count?: number }) =>
      cctvService.simulate(id, count),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['camera-snapshots'] })
      qc.invalidateQueries({ queryKey: ['cameras'] })
      toast.success('Simulasi berhasil')
    },
    onError: () => toast.error('Gagal menjalankan simulasi'),
  })
}
