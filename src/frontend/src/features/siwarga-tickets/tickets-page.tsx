import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Ticket, TicketStatus } from '@/types/api'
import { Plus } from 'lucide-react'
import { useTickets } from '@/hooks/use-tickets'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
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
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ReportTicketDialog } from './report-ticket-dialog'
import { TicketDetailDialog } from './ticket-detail-dialog'

const route = getRouteApi('/_authenticated/tickets/')

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  resolved: 'Selesai',
}

function formatTicketDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function TicketCard({
  ticket,
  onSelect,
}: {
  ticket: Ticket
  onSelect: (ticket: Ticket) => void
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(ticket)
    }
  }

  return (
    <Card
      role='button'
      tabIndex={0}
      aria-label={ticket.title}
      onClick={() => onSelect(ticket)}
      onKeyDown={handleKeyDown}
      className='cursor-pointer transition-colors hover:border-primary'
    >
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='secondary'>{STATUS_LABELS[ticket.status]}</Badge>
          {ticket.category && (
            <Badge variant='outline'>{ticket.category}</Badge>
          )}
        </div>
        <CardTitle className='leading-snug'>{ticket.title}</CardTitle>
        <CardDescription>
          {ticket.reporter_name ?? 'Warga'} ·{' '}
          {formatTicketDate(ticket.created_at)} · {ticket.comments_count}{' '}
          komentar
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function TicketsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isError, refetch } = useTickets({
    page: search.page,
    per_page: search.pageSize,
    status: search.status,
    search: search.search,
  })

  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [reportOpen, setReportOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

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
        status: value === 'all' ? undefined : (value as TicketStatus),
        page: undefined,
      }),
    })
  }

  const handleSelect = (ticket: Ticket) => {
    setSelectedId(ticket.id)
    setDetailOpen(true)
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
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Tiket Pengaduan
            </h2>
            <p className='text-muted-foreground'>
              Laporkan masalah di lingkungan RT dan pantau tindak lanjutnya.
            </p>
          </div>
          <Button className='space-x-1' onClick={() => setReportOpen(true)}>
            <span>Lapor Masalah</span> <Plus size={18} />
          </Button>
        </div>

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <Input
            placeholder='Cari tiket'
            aria-label='Cari tiket'
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
              <SelectItem value='open'>Terbuka</SelectItem>
              <SelectItem value='in_progress'>Diproses</SelectItem>
              <SelectItem value='resolved'>Selesai</SelectItem>
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
            <p className='py-12 text-muted-foreground'>Tidak ada tiket.</p>
          </div>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-2'>
              {(data?.data ?? []).map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onSelect={handleSelect}
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

      <ReportTicketDialog open={reportOpen} onOpenChange={setReportOpen} />
      <TicketDetailDialog
        ticketId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}

export function TicketsPage() {
  return <TicketsPageInner />
}
