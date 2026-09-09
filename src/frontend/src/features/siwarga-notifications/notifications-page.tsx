import { getRouteApi } from '@tanstack/react-router'
import type { AppNotification } from '@/types/api'
import { cn } from '@/lib/utils'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/layout/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/notifications/')

const STATUS_LABELS: Record<string, string> = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  resolved: 'Selesai',
}

function statusLabel(value: string): string {
  return STATUS_LABELS[value] ?? value
}

function formatNotificationDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: AppNotification
  onMarkRead: (notification: AppNotification) => void
}) {
  const unread = notification.read_at === null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onMarkRead(notification)
    }
  }

  return (
    <Card
      role='button'
      tabIndex={0}
      aria-label={notification.data.title}
      onClick={() => onMarkRead(notification)}
      onKeyDown={handleKeyDown}
      className={cn(
        'cursor-pointer transition-colors hover:border-primary',
        unread && 'border-primary bg-primary/5'
      )}
    >
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          {unread && <Badge variant='default'>Belum dibaca</Badge>}
          <Badge variant='secondary'>
            {statusLabel(notification.data.old_status)} →{' '}
            {statusLabel(notification.data.new_status)}
          </Badge>
        </div>
        <CardTitle className='leading-snug'>
          {notification.data.title}
        </CardTitle>
        <CardDescription>
          {notification.data.actor_name} ·{' '}
          {formatNotificationDate(notification.created_at)}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function NotificationsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isError, refetch } = useNotifications(search.page)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const handleMarkRead = (notification: AppNotification) => {
    if (notification.read_at !== null || markRead.isPending) return
    markRead.mutate(notification.id)
  }

  const currentPage = data?.current_page ?? search.page ?? 1
  const lastPage = data?.last_page ?? 1

  const handlePageChange = (nextPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: nextPage <= 1 ? undefined : nextPage,
      }),
    })
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <NotificationBell />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Notifikasi</h2>
            <p className='text-muted-foreground'>
              Pembaruan status tiket pengaduan yang dilaporkan.
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Tandai semua dibaca
          </Button>
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : isError ? (
          <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-md border py-12'>
            <p className='text-muted-foreground'>Gagal memuat data.</p>
            <Button variant='outline' size='sm' onClick={() => refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className='flex flex-1 items-center justify-center rounded-md border'>
            <p className='py-12 text-muted-foreground'>Tidak ada notifikasi.</p>
          </div>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-2'>
              {(data?.data ?? []).map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>

            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm text-muted-foreground'>
                Halaman {currentPage} dari {lastPage}
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage >= lastPage}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </>
        )}
      </Main>
    </>
  )
}

export function NotificationsPage() {
  return <NotificationsPageInner />
}
