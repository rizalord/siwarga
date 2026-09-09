import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '@/services/notifications'
import { toast } from 'sonner'

export function useNotifications(page?: number) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsService.getAll(page),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
    refetchInterval: 60_000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsService.getAll(),
    select: (res) => res.data.data.filter((n) => n.read_at === null).length,
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast.error('Gagal menandai notifikasi'),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Semua notifikasi ditandai dibaca')
    },
    onError: () => toast.error('Gagal menandai notifikasi'),
  })
}
