import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useHasPermission } from '@/hooks/use-permission'
import {
  useCreateSuggestion,
  useMarkSuggestionReviewed,
  useSuggestions,
} from '@/hooks/use-suggestions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/layout/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/suggestions/')

const STATUS_LABELS: Record<string, string> = {
  new: 'Baru',
  reviewed: 'Sudah dibaca',
}

function formatSuggestionDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SuggestionsInbox() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isError, refetch } = useSuggestions({
    page: search.page,
    status: search.status,
  })
  const markReviewed = useMarkSuggestionReviewed()

  const handleStatusChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: value === 'all' ? undefined : (value as 'new' | 'reviewed'),
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
    <section aria-label='Kotak masuk saran' className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h3 className='text-lg font-semibold tracking-tight'>
            Kotak Masuk Saran
          </h3>
          <p className='text-sm text-muted-foreground'>
            Daftar saran anonim yang masuk dari warga.
          </p>
        </div>
        <Select
          value={search.status ?? 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger aria-label='Filter status' className='w-full sm:w-44'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Semua status</SelectItem>
            <SelectItem value='new'>Baru</SelectItem>
            <SelectItem value='reviewed'>Sudah dibaca</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className='flex flex-1 items-center justify-center rounded-md border py-12'>
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
          <p className='py-12 text-muted-foreground'>Tidak ada saran.</p>
        </div>
      ) : (
        <>
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Isi saran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className='text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data ?? []).map((suggestion) => (
                  <TableRow key={suggestion.id}>
                    <TableCell className='max-w-md whitespace-pre-wrap'>
                      {suggestion.content}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          suggestion.status === 'new' ? 'default' : 'secondary'
                        }
                      >
                        {STATUS_LABELS[suggestion.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className='whitespace-nowrap'>
                      {formatSuggestionDate(suggestion.created_at)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {suggestion.status === 'new' ? (
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={markReviewed.isPending}
                          onClick={() =>
                            markReviewed.mutate(suggestion.id)
                          }
                        >
                          Tandai dibaca
                        </Button>
                      ) : (
                        <span className='text-sm text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
  )
}

function SuggestionsPageInner() {
  const canViewInbox = useHasPermission('suggestions.view')
  const createSuggestion = useCreateSuggestion()
  const [content, setContent] = useState('')

  const canSubmit =
    content.trim().length > 0 && !createSuggestion.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createSuggestion.mutate(content.trim(), {
      // Keep the draft on error so the user does not lose their text.
      onSuccess: () => setContent(''),
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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Saran Anonim</h2>
          <p className='text-muted-foreground'>
            Sampaikan saran untuk lingkungan RT tanpa mengungkap identitas Anda.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kirim saran</CardTitle>
            <CardDescription>
              Saran Anda terkirim tanpa nama — identitas pengirim tidak
              dicatat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='suggestion-content'>Saran</Label>
                <Textarea
                  id='suggestion-content'
                  placeholder='Tulis saran Anda'
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                />
              </div>
              <Button type='submit' disabled={!canSubmit}>
                {createSuggestion.isPending ? 'Mengirim...' : 'Kirim Saran'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {canViewInbox && <SuggestionsInbox />}
      </Main>
    </>
  )
}

export function SuggestionsPage() {
  return <SuggestionsPageInner />
}
