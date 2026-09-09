import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  emergencyContactsService,
  type EmergencyContactInput,
} from '@/services/emergency-contacts'
import { toast } from 'sonner'

export function useEmergencyContacts() {
  return useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: () => emergencyContactsService.getAll(),
    select: (res) => res.data,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EmergencyContactInput) =>
      emergencyContactsService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-contacts'] })
      toast.success('Kontak darurat disimpan')
    },
    onError: () => toast.error('Gagal menyimpan kontak darurat'),
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number
      input: Partial<EmergencyContactInput>
    }) => emergencyContactsService.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-contacts'] })
      toast.success('Kontak darurat disimpan')
    },
    onError: () => toast.error('Gagal menyimpan kontak darurat'),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => emergencyContactsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency-contacts'] })
      toast.success('Kontak darurat dihapus')
    },
    onError: () => toast.error('Gagal menghapus kontak darurat'),
  })
}
