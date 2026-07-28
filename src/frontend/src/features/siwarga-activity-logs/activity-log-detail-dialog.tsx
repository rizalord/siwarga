import type { ActivityLog } from '@/types/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ActivityLogDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: ActivityLog | null
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isBeforeAfterShape(
  changes: ActivityLog['changes']
): changes is { before: Record<string, unknown>; after: Record<string, unknown> } {
  return (
    !!changes &&
    typeof changes === 'object' &&
    'before' in changes &&
    'after' in changes
  )
}

export function ActivityLogDetailDialog({
  open,
  onOpenChange,
  currentRow,
}: ActivityLogDetailDialogProps) {
  if (!currentRow) return null

  const changes = currentRow.changes
  const isUpdate = currentRow.action === 'updated' && isBeforeAfterShape(changes)
  const fieldEntries = !isUpdate && changes ? Object.entries(changes) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Detail Log Aktivitas</DialogTitle>
          <DialogDescription>{currentRow.description}</DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
          <div>
            <p className='text-muted-foreground'>Waktu</p>
            <p className='font-medium'>{formatDateTime(currentRow.created_at)}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Pengguna</p>
            <p className='font-medium'>{currentRow.user?.name ?? 'Sistem'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Modul</p>
            <p className='font-medium'>{currentRow.subject_type ?? '-'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>IP Address</p>
            <p className='font-medium'>{currentRow.ip_address ?? '-'}</p>
          </div>
        </div>

        {isUpdate && (
          <div className='max-h-80 overflow-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Sebelum</TableHead>
                  <TableHead>Sesudah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(changes.after).map((field) => (
                  <TableRow key={field}>
                    <TableCell className='font-medium'>{field}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {formatValue(changes.before[field])}
                    </TableCell>
                    <TableCell>{formatValue(changes.after[field])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isUpdate && fieldEntries.length > 0 && (
          <div className='max-h-80 overflow-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Nilai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldEntries.map(([field, value]) => (
                  <TableRow key={field}>
                    <TableCell className='font-medium'>{field}</TableCell>
                    <TableCell>{formatValue(value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!changes && (
          <p className='text-sm text-muted-foreground'>
            Tidak ada detail perubahan untuk aktivitas ini.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
