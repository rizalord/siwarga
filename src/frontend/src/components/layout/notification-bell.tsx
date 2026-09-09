import { Link } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useUnreadCount } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'

export function NotificationBell() {
  // Intentionally only reads `data`: the bell stays silent on fetch error
  // and never disturbs the header chrome with toasts.
  const { data: unreadCount } = useUnreadCount()
  const count = unreadCount ?? 0

  return (
    <Button variant='ghost' size='icon' asChild className='relative'>
      <Link to='/notifications' aria-label='Notifikasi'>
        <Bell />
        {count > 0 && (
          <span
            aria-hidden='true'
            className='absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white'
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
