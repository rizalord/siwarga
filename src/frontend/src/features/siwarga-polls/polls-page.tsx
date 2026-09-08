import { useEffect, useRef, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Poll, PollStatus } from '@/types/api'
import { Plus } from 'lucide-react'
import { useHasPermission } from '@/hooks/use-permission'
import {
  useDeletePoll,
  usePollResults,
  usePolls,
  useVotePoll,
} from '@/hooks/use-polls'
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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PollFormDialog } from './poll-form'

const route = getRouteApi('/_authenticated/polls/')

const STATUS_LABELS: Record<PollStatus, string> = {
  upcoming: 'Akan datang',
  ongoing: 'Berlangsung',
  ended: 'Selesai',
}

function formatPeriodDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PollCard({ poll }: { poll: Poll }) {
  const canManage = useHasPermission('polls.manage')
  const canVote = useHasPermission('polls.vote')
  const votePoll = useVotePoll(poll.id)
  const deletePoll = useDeletePoll()
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const shouldLoadResults =
    poll.has_voted || poll.status === 'ended' || canManage
  const { data: results } = usePollResults(shouldLoadResults ? poll.id : null)

  const showVoteForm = canVote && !poll.has_voted && poll.status === 'ongoing'

  const handleVote = () => {
    const optionId = Number(selectedOption)
    if (!optionId || votePoll.isPending) return
    votePoll.mutate(optionId)
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='secondary'>{STATUS_LABELS[poll.status]}</Badge>
          {poll.has_voted && <Badge variant='default'>Sudah memilih</Badge>}
        </div>
        <CardTitle className='leading-snug'>{poll.title}</CardTitle>
        <CardDescription>
          {formatPeriodDate(poll.starts_at)} – {formatPeriodDate(poll.ends_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {poll.description && (
          <p className='text-sm text-muted-foreground'>{poll.description}</p>
        )}

        {showVoteForm ? (
          <div className='space-y-3'>
            <RadioGroup
              value={selectedOption}
              onValueChange={setSelectedOption}
            >
              {poll.options.map((option) => (
                <div key={option.id} className='flex items-center gap-2'>
                  <RadioGroupItem
                    value={String(option.id)}
                    id={`poll-${poll.id}-option-${option.id}`}
                  />
                  <Label htmlFor={`poll-${poll.id}-option-${option.id}`}>
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              size='sm'
              disabled={!selectedOption || votePoll.isPending}
              onClick={handleVote}
            >
              {votePoll.isPending ? 'Merekam...' : 'Vote'}
            </Button>
          </div>
        ) : (
          <ul className='space-y-1.5'>
            {poll.options.map((option) => (
              <li
                key={option.id}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  poll.user_voted_option_id === option.id
                    ? 'border-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {option.label}
                {poll.user_voted_option_id === option.id && ' (pilihan Anda)'}
              </li>
            ))}
          </ul>
        )}

        {results && (
          <div className='space-y-2 border-t pt-3'>
            <h3 className='text-sm font-semibold'>
              Hasil sementara ({results.total_votes} suara)
            </h3>
            <ul className='space-y-2'>
              {results.options.map((option) => (
                <li key={option.id} className='space-y-1'>
                  <div className='flex items-center justify-between gap-2 text-sm'>
                    <span>{option.label}</span>
                    <span className='text-muted-foreground'>
                      {option.votes} suara · {option.percent}%
                    </span>
                  </div>
                  <div
                    className='h-2 overflow-hidden rounded-full bg-muted'
                    role='progressbar'
                    aria-valuenow={option.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${option.label}: ${option.percent}%`}
                  >
                    <div
                      className='h-full rounded-full bg-primary transition-all'
                      style={{ width: `${option.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canManage && (
          <div className='flex justify-end border-t pt-3'>
            <Button
              variant='outline'
              size='sm'
              disabled={deletePoll.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              Hapus
            </Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        handleConfirm={() =>
          deletePoll.mutate(poll.id, {
            onSuccess: () => setDeleteOpen(false),
          })
        }
        disabled={deletePoll.isPending}
        title='Hapus Polling'
        desc={`Apakah Anda yakin ingin menghapus "${poll.title}"?`}
        confirmText='Hapus'
        destructive
      />
    </Card>
  )
}

function PollsPageInner() {
  const canManage = useHasPermission('polls.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isError, refetch } = usePolls({
    page: search.page,
    per_page: search.pageSize,
    status: search.status,
    search: search.search,
  })

  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [createOpen, setCreateOpen] = useState(false)

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
        status: value === 'all' ? undefined : (value as PollStatus),
        page: undefined,
      }),
    })
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
            <h2 className='text-2xl font-bold tracking-tight'>Polling</h2>
            <p className='text-muted-foreground'>
              Ikuti polling warga dan lihat hasil sementara.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setCreateOpen(true)}>
              <span>Buat Polling</span> <Plus size={18} />
            </Button>
          )}
        </div>

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <Input
            placeholder='Cari polling'
            aria-label='Cari polling'
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='sm:max-w-sm'
          />
          <Select
            value={search.status ?? 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className='w-full sm:w-44'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Semua status</SelectItem>
              <SelectItem value='upcoming'>Akan datang</SelectItem>
              <SelectItem value='ongoing'>Berlangsung</SelectItem>
              <SelectItem value='ended'>Selesai</SelectItem>
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
            <p className='py-12 text-muted-foreground'>Tidak ada polling.</p>
          </div>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-2'>
              {(data?.data ?? []).map((poll) => (
                <PollCard key={poll.id} poll={poll} />
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

      <PollFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

export function PollsPage() {
  return <PollsPageInner />
}
