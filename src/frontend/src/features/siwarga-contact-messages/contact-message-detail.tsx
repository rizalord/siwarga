import type { ContactMessage } from '@/types/api'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type ContactMessageDetailProps = {
  message: ContactMessage | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactMessageDetail({
  message,
  open,
  onOpenChange,
}: ContactMessageDetailProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='space-y-4'>
        <SheetHeader>
          <SheetTitle>{message?.name}</SheetTitle>
          <SheetDescription>
            {message
              ? new Date(message.created_at).toLocaleString('id-ID')
              : ''}
          </SheetDescription>
        </SheetHeader>
        {message && (
          <div className='space-y-3 px-4 text-sm'>
            {message.email && (
              <p>
                <span className='font-medium'>Email:</span> {message.email}
              </p>
            )}
            {message.phone && (
              <p>
                <span className='font-medium'>Telepon:</span> {message.phone}
              </p>
            )}
            <p className='whitespace-pre-wrap'>{message.message}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
