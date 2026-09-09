import { useState } from 'react'
import { useCreateBooking, useFacilities } from '@/hooks/use-bookings'
import { useHasPermission } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type BookingRequestDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFacilityId?: number | null
}

export function BookingRequestDialog({
  open,
  onOpenChange,
  initialFacilityId,
}: BookingRequestDialogProps) {
  const canManageFacilities = useHasPermission('facilities.manage')
  const { data: facilitiesData } = useFacilities({ per_page: 100 })
  const createBooking = useCreateBooking()

  const [facilityId, setFacilityId] = useState(
    initialFacilityId != null ? String(initialFacilityId) : ''
  )
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  const facilities = (facilitiesData?.data ?? []).filter(
    (facility) => canManageFacilities || facility.is_active
  )

  const validRange =
    startAt.length > 0 && endAt.length > 0 && endAt > startAt
  const canSubmit =
    facilityId.length > 0 && validRange && !createBooking.isPending

  const reset = () => {
    setFacilityId('')
    setStartAt('')
    setEndAt('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createBooking.mutate(
      {
        facility_id: Number(facilityId),
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      },
      {
        // Keep the draft on failure so the user does not lose their input.
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>Ajukan Booking</DialogTitle>
          <DialogDescription>
            Pilih fasilitas dan waktu penggunaan yang diinginkan.
          </DialogDescription>
        </DialogHeader>
        <form
          id='booking-request-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='booking-facility'>Pilih Fasilitas</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger
                id='booking-facility'
                aria-label='Pilih Fasilitas'
                className='w-full'
              >
                <SelectValue placeholder='Pilih Fasilitas' />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={String(facility.id)}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='booking-start-at'>Mulai *</Label>
              <Input
                id='booking-start-at'
                type='datetime-local'
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='booking-end-at'>Selesai *</Label>
              <Input
                id='booking-end-at'
                type='datetime-local'
                value={endAt}
                min={startAt || undefined}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>
          {startAt && endAt && !validRange && (
            <p className='text-sm text-destructive'>
              Waktu selesai harus setelah waktu mulai.
            </p>
          )}
        </form>
        <DialogFooter>
          <Button
            type='submit'
            form='booking-request-form'
            disabled={!canSubmit}
          >
            {createBooking.isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
