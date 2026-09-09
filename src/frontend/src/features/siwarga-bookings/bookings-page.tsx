import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Booking, BookingStatus, Facility } from '@/types/api'
import { Plus } from 'lucide-react'
import {
  useBookings,
  useCancelBooking,
  useFacilities,
  useReviewBooking,
} from '@/hooks/use-bookings'
import { useHasPermission } from '@/hooks/use-permission'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/layout/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { BookingRequestDialog } from './booking-request-dialog'

const route = getRouteApi('/_authenticated/bookings/')

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFee(fee: string | null): string {
  const amount = fee === null ? NaN : Number(fee)
  if (fee === null || Number.isNaN(amount) || amount <= 0) return 'Gratis'
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function FacilityCard({
  facility,
  onBook,
}: {
  facility: Facility
  onBook: (facility: Facility) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant={facility.is_active ? 'default' : 'secondary'}>
            {facility.is_active ? 'Aktif' : 'Nonaktif'}
          </Badge>
          <Badge variant='outline'>{formatFee(facility.rental_fee)}</Badge>
        </div>
        <CardTitle className='leading-snug'>{facility.name}</CardTitle>
        {facility.description && (
          <CardDescription>{facility.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Button
          size='sm'
          disabled={!facility.is_active}
          onClick={() => onBook(facility)}
        >
          Ajukan Booking
        </Button>
      </CardContent>
    </Card>
  )
}

function BookingCard({ booking }: { booking: Booking }) {
  const canReview = useHasPermission('bookings.review')
  const currentUserId = useAuthStore((state) => state.auth.user?.id)
  const reviewBooking = useReviewBooking()
  const cancelBooking = useCancelBooking()

  const isPending = booking.status === 'pending'
  const isOwn = currentUserId != null && booking.booked_by === currentUserId
  const busy = reviewBooking.isPending || cancelBooking.isPending

  return (
    <Card
      role='article'
      tabIndex={0}
      aria-label={`Booking ${booking.facility_name ?? `#${booking.id}`} oleh ${booking.booker_name ?? 'warga'}`}
    >
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge
            variant={booking.status === 'approved' ? 'default' : 'secondary'}
          >
            {STATUS_LABELS[booking.status]}
          </Badge>
        </div>
        <CardTitle className='leading-snug'>
          {booking.facility_name ?? `Fasilitas #${booking.facility_id}`}
        </CardTitle>
        <CardDescription>
          {booking.booker_name ?? 'Warga'} · {formatDateTime(booking.start_at)}{' '}
          – {formatDateTime(booking.end_at)}
        </CardDescription>
      </CardHeader>
      {(canReview || isOwn) && isPending ? (
        <CardContent className='flex flex-wrap gap-2'>
          {canReview && isPending && (
            <>
              <Button
                size='sm'
                disabled={busy}
                onClick={() =>
                  reviewBooking.mutate({ id: booking.id, action: 'approve' })
                }
              >
                Setujui
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={busy}
                onClick={() =>
                  reviewBooking.mutate({ id: booking.id, action: 'reject' })
                }
              >
                Tolak
              </Button>
            </>
          )}
          {isOwn && isPending && (
            <Button
              size='sm'
              variant='outline'
              disabled={busy}
              onClick={() => cancelBooking.mutate(booking.id)}
            >
              Batalkan
            </Button>
          )}
        </CardContent>
      ) : null}
    </Card>
  )
}

function BookingsPageInner() {
  const canManageFacilities = useHasPermission('facilities.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const {
    data: facilitiesData,
    isLoading: facilitiesLoading,
    isError: facilitiesError,
    refetch: refetchFacilities,
  } = useFacilities({ per_page: 100 })

  const { data, isLoading, isError, refetch } = useBookings({
    page: search.page,
    per_page: search.pageSize,
    status: search.status,
    facility_id: search.facility_id,
    ...(search.search ? { search: search.search } : {}),
  })

  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [requestOpen, setRequestOpen] = useState(false)
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(
    null
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: value ? value : undefined,
          page: undefined,
        }),
      })
    }, 400)
  }

  const handleStatusChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: value === 'all' ? undefined : (value as BookingStatus),
        page: undefined,
      }),
    })
  }

  const handleFacilityChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        facility_id: value === 'all' ? undefined : Number(value),
        page: undefined,
      }),
    })
  }

  const handleBook = (facility: Facility) => {
    setSelectedFacilityId(facility.id)
    setRequestOpen(true)
  }

  const handleNewRequest = () => {
    setSelectedFacilityId(null)
    setRequestOpen(true)
  }

  const allFacilities = facilitiesData?.data ?? []
  const visibleFacilities = allFacilities.filter(
    (facility) => canManageFacilities || facility.is_active
  )

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
            <h2 className='text-2xl font-bold tracking-tight'>
              Booking Fasilitas
            </h2>
            <p className='text-muted-foreground'>
              Lihat katalog fasilitas dan kelola pengajuan booking warga.
            </p>
          </div>
          <Button className='space-x-1' onClick={handleNewRequest}>
            <span>Ajukan Booking</span> <Plus size={18} />
          </Button>
        </div>

        <section aria-label='Katalog fasilitas' className='flex flex-col gap-3'>
          <h3 className='text-lg font-semibold tracking-tight'>
            Katalog Fasilitas
          </h3>
          {facilitiesLoading ? (
            <div className='flex items-center justify-center rounded-md border py-12'>
              <p className='text-muted-foreground'>Memuat fasilitas...</p>
            </div>
          ) : facilitiesError ? (
            <div className='flex flex-col items-center justify-center gap-3 rounded-md border py-12'>
              <p className='text-muted-foreground'>Gagal memuat fasilitas.</p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => refetchFacilities()}
              >
                Coba lagi
              </Button>
            </div>
          ) : visibleFacilities.length === 0 ? (
            <div className='flex items-center justify-center rounded-md border'>
              <p className='py-12 text-muted-foreground'>
                Tidak ada fasilitas.
              </p>
            </div>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2'>
              {visibleFacilities.map((facility) => (
                <FacilityCard
                  key={facility.id}
                  facility={facility}
                  onBook={handleBook}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-label='Daftar booking' className='flex flex-col gap-3'>
          <h3 className='text-lg font-semibold tracking-tight'>
            Daftar Booking
          </h3>

          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <Input
              placeholder='Cari booking'
              aria-label='Cari booking'
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='sm:max-w-sm'
            />
            <Select
              value={search.status ?? 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger
                aria-label='Filter status'
                className='w-full sm:w-44'
              >
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua status</SelectItem>
                <SelectItem value='pending'>Menunggu</SelectItem>
                <SelectItem value='approved'>Disetujui</SelectItem>
                <SelectItem value='rejected'>Ditolak</SelectItem>
                <SelectItem value='cancelled'>Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={
                search.facility_id != null ? String(search.facility_id) : 'all'
              }
              onValueChange={handleFacilityChange}
            >
              <SelectTrigger
                aria-label='Filter fasilitas'
                className='w-full sm:w-44'
              >
                <SelectValue placeholder='Fasilitas' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua fasilitas</SelectItem>
                {allFacilities.map((facility) => (
                  <SelectItem key={facility.id} value={String(facility.id)}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <p className='py-12 text-muted-foreground'>Tidak ada booking.</p>
            </div>
          ) : (
            <>
              <div className='grid gap-4 sm:grid-cols-2'>
                {(data?.data ?? []).map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
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
        </section>
      </Main>

      <BookingRequestDialog
        key={selectedFacilityId ?? 'new'}
        open={requestOpen}
        onOpenChange={setRequestOpen}
        initialFacilityId={selectedFacilityId}
      />
    </>
  )
}

export function BookingsPage() {
  return <BookingsPageInner />
}
