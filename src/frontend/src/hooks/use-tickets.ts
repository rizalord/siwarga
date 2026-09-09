import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketsService } from '@/services/tickets'
import type { TicketFilter, CreateTicketRequest } from '@/types/api'
import { toast } from 'sonner'

export function useTickets(params?: TicketFilter) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useTicket(id: number | null) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsService.getById(id as number),
    select: (res) => res.data.data,
    enabled: id !== null,
  })
}

export function useTicketComments(id: number | null) {
  return useQuery({
    queryKey: ['ticket-comments', id],
    queryFn: () => ticketsService.getComments(id as number),
    select: (res) => res.data.data,
    enabled: id !== null,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTicketRequest) => ticketsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Laporan berhasil dikirim')
    },
    onError: () => toast.error('Gagal mengirim laporan'),
  })
}

export function useChangeTicketStatus(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: string) => ticketsService.changeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      toast.success('Status tiket diperbarui')
    },
    onError: () => toast.error('Gagal memperbarui status'),
  })
}

export function useAssignTicket(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assigned_to: number) => ticketsService.assign(id, assigned_to),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      toast.success('PIC berhasil ditugaskan')
    },
    onError: () => toast.error('Gagal menugaskan PIC'),
  })
}

export function useAddTicketComment(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comment: string) => ticketsService.addComment(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-comments', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Komentar terkirim')
    },
    onError: () => toast.error('Gagal mengirim komentar'),
  })
}

export function useUploadTicketAttachment(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photo: File) => ticketsService.uploadAttachment(id, photo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Foto berhasil diunggah')
    },
    onError: () => toast.error('Gagal mengunggah foto'),
  })
}
