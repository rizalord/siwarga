import { useState } from 'react'
import type { TicketComment, TicketStatus } from '@/types/api'
import { useHasPermission } from '@/hooks/use-permission'
import {
  useAddTicketComment,
  useAssignTicket,
  useChangeTicketStatus,
  useTicket,
  useTicketComments,
  useUploadTicketAttachment,
} from '@/hooks/use-tickets'
import { useUsers } from '@/hooks/use-users'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type TicketDetailDialogProps = {
  ticketId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  resolved: 'Selesai',
}

function nextStatuses(status: TicketStatus): TicketStatus[] {
  if (status === 'open') return ['in_progress']
  if (status === 'in_progress') return ['resolved']
  return []
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CommentItem({ comment }: { comment: TicketComment }) {
  return (
    <div className='rounded-md border px-3 py-2'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground'>
        <span className='font-medium text-foreground'>
          {comment.user_name ?? 'Warga'}
        </span>
        {comment.created_at && <span>{formatDate(comment.created_at)}</span>}
      </div>
      {/* Ticket comments are sanitized server-side before storage; safe to render as HTML. */}
      <div
        className='mt-1 text-sm leading-relaxed'
        dangerouslySetInnerHTML={{ __html: comment.comment }}
      />
    </div>
  )
}

function PicSelect({
  ticketId,
  assignedTo,
}: {
  ticketId: number
  assignedTo: number | null
}) {
  const { data: usersData } = useUsers({ per_page: 100 })
  const assignTicket = useAssignTicket(ticketId)

  return (
    <div className='space-y-2'>
      <Label htmlFor={`ticket-pic-${ticketId}`}>PIC</Label>
      <Select
        value={assignedTo ? String(assignedTo) : ''}
        onValueChange={(value) => {
          const userId = Number(value)
          if (userId && userId !== assignedTo) assignTicket.mutate(userId)
        }}
        disabled={assignTicket.isPending}
      >
        <SelectTrigger
          id={`ticket-pic-${ticketId}`}
          aria-label='Pilih PIC'
          className='w-full sm:w-52'
        >
          <SelectValue placeholder='Pilih PIC' />
        </SelectTrigger>
        <SelectContent>
          {(usersData?.data ?? []).map((user) => (
            <SelectItem key={user.id} value={String(user.id)}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function TicketDetailBody({ ticketId }: { ticketId: number }) {
  const { data: ticket, isLoading, isError, refetch } = useTicket(ticketId)
  const {
    data: comments,
    isLoading: commentsLoading,
    isError: commentsError,
    refetch: refetchComments,
  } = useTicketComments(ticketId)

  const canChangeStatus = useHasPermission('tickets.manage-status')
  const canAssign = useHasPermission('tickets.assign')

  const addComment = useAddTicketComment(ticketId)
  const uploadAttachment = useUploadTicketAttachment(ticketId)
  const changeStatus = useChangeTicketStatus(ticketId)

  const [draft, setDraft] = useState('')

  if (isLoading) {
    return (
      <p className='py-8 text-center text-sm text-muted-foreground'>
        Memuat detail tiket...
      </p>
    )
  }

  if (isError || !ticket) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-8'>
        <p className='text-sm text-muted-foreground'>Gagal memuat detail.</p>
        <Button variant='outline' size='sm' onClick={() => refetch()}>
          Coba lagi
        </Button>
      </div>
    )
  }

  const attachments = ticket.attachments ?? []
  const next = nextStatuses(ticket.status)

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const content = draft.trim()
    if (!content || addComment.isPending) return
    // Keep the draft on failure; only clear on success.
    addComment.mutate(content, {
      onSuccess: () => setDraft(''),
    })
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || uploadAttachment.isPending) return
    uploadAttachment.mutate(file, {
      onSettled: () => {
        e.target.value = ''
      },
    })
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='secondary'>{STATUS_LABELS[ticket.status]}</Badge>
        {ticket.category && <Badge variant='outline'>{ticket.category}</Badge>}
      </div>

      <div className='text-sm text-muted-foreground'>
        Dilaporkan oleh {ticket.reporter_name ?? '-'} ·{' '}
        {formatDate(ticket.created_at)}
        {ticket.assignee_name && ` · PIC: ${ticket.assignee_name}`}
      </div>

      {/* Ticket descriptions are sanitized server-side before storage; safe to render as HTML. */}
      <div
        className='text-sm leading-relaxed'
        dangerouslySetInnerHTML={{ __html: ticket.description }}
      />

      {attachments.length > 0 && (
        <div className='space-y-2'>
          <h3 className='text-sm font-semibold'>Foto terlampir</h3>
          <div className='flex flex-wrap gap-2'>
            {attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target='_blank'
                rel='noreferrer'
              >
                <img
                  src={attachment.url}
                  alt={`Lampiran tiket ${ticket.id}`}
                  className='h-20 w-20 rounded-md border object-cover'
                  loading='lazy'
                />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className='space-y-2'>
        <Label htmlFor={`ticket-photo-${ticket.id}`}>Foto (maks 3)</Label>
        <input
          id={`ticket-photo-${ticket.id}`}
          type='file'
          accept='image/*'
          disabled={attachments.length >= 3 || uploadAttachment.isPending}
          onChange={handlePhotoChange}
          className='block w-full text-sm'
        />
        {uploadAttachment.isPending && (
          <p className='text-xs text-muted-foreground'>Mengunggah foto...</p>
        )}
      </div>

      {canChangeStatus && (
        <div className='space-y-2'>
          <Label htmlFor={`ticket-status-${ticket.id}`}>Ubah Status</Label>
          <Select
            value={ticket.status}
            onValueChange={(value) => {
              if (value !== ticket.status) changeStatus.mutate(value)
            }}
            disabled={next.length === 0 || changeStatus.isPending}
          >
            <SelectTrigger
              id={`ticket-status-${ticket.id}`}
              aria-label='Ubah Status'
              className='w-full sm:w-52'
            >
              <SelectValue placeholder='Ubah Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ticket.status}>
                {STATUS_LABELS[ticket.status]} (saat ini)
              </SelectItem>
              {next.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {canAssign && (
        <PicSelect ticketId={ticketId} assignedTo={ticket.assigned_to} />
      )}

      <div className='space-y-2 border-t pt-4'>
        <h3 className='text-sm font-semibold'>
          Komentar ({ticket.comments_count})
        </h3>
        {commentsLoading ? (
          <p className='text-sm text-muted-foreground'>Memuat komentar...</p>
        ) : commentsError ? (
          <div className='flex items-center gap-2'>
            <p className='text-sm text-muted-foreground'>
              Gagal memuat komentar.
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetchComments()}
            >
              Coba lagi
            </Button>
          </div>
        ) : (comments ?? []).length === 0 ? (
          <p className='text-sm text-muted-foreground'>Belum ada komentar.</p>
        ) : (
          <div className='space-y-2'>
            {(comments ?? []).map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}

        <form onSubmit={handleCommentSubmit} className='flex flex-col gap-2'>
          <Textarea
            placeholder='Tulis komentar'
            aria-label='Tulis komentar'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
          <div>
            <Button type='submit' size='sm' disabled={addComment.isPending}>
              {addComment.isPending ? 'Mengirim...' : 'Kirim Komentar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TicketDetailDialog({
  ticketId,
  open,
  onOpenChange,
}: TicketDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>Detail Tiket</DialogTitle>
          <DialogDescription>
            Rincian laporan, lampiran foto, dan diskusi tindak lanjut.
          </DialogDescription>
        </DialogHeader>
        {open && ticketId !== null ? (
          <TicketDetailBody ticketId={ticketId} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
