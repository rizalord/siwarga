import { useEffect, useRef, useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import type { AnnouncementCategory, WargaAnnouncement } from '@/types/api'
import {
  useWargaAnnouncement,
  useWargaAnnouncements,
} from '@/hooks/use-warga-announcements'
import { useHasPermission } from '@/hooks/use-permission'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const route = getRouteApi('/_authenticated/pengumuman/')

const CATEGORY_LABELS: Record<WargaAnnouncement['category'], string> = {
  darurat: 'Darurat',
  umum: 'Umum',
  kegiatan: 'Kegiatan',
  keuangan: 'Keuangan',
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatPublishedDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function WargaAnnouncementsPageInner() {
  const canManage = useHasPermission('announcements.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading } = useWargaAnnouncements({
    page: search.page,
    per_page: search.pageSize,
    category: search.category,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const { data: detail, isLoading: isDetailLoading } = useWargaAnnouncement(
    detailOpen ? selectedId : null
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

  const handleCategoryChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        category:
          value === 'all'
            ? undefined
            : [value as AnnouncementCategory],
        page: undefined,
      }),
    })
  }

  const handleOpenDetail = (announcement: WargaAnnouncement) => {
    setSelectedId(announcement.id)
    setDetailOpen(true)
  }

  const selectedFromList = (data?.data ?? []).find(
    (item) => item.id === selectedId
  )
  const detailAnnouncement = detail ?? selectedFromList ?? null

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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Pengumuman Warga
          </h2>
          <p className='text-muted-foreground'>
            Pengumuman terbaru dari pengurus RT untuk warga.
          </p>
        </div>

        {canManage && (
          <Alert>
            <AlertTitle>Kelola pengumuman</AlertTitle>
            <AlertDescription>
              Anda memiliki akses kelola pengumuman.{' '}
              <Link to='/announcements' className='underline'>
                Buka halaman Pengumuman
              </Link>{' '}
              untuk menambah atau mengubah pengumuman.
            </AlertDescription>
          </Alert>
        )}

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <Input
            placeholder='Cari pengumuman'
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='sm:max-w-sm'
          />
          <Select
            value={search.category?.[0] ?? 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className='w-full sm:w-44'>
              <SelectValue placeholder='Kategori' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Semua kategori</SelectItem>
              <SelectItem value='darurat'>Darurat</SelectItem>
              <SelectItem value='umum'>Umum</SelectItem>
              <SelectItem value='kegiatan'>Kegiatan</SelectItem>
              <SelectItem value='keuangan'>Keuangan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className='flex flex-1 items-center justify-center rounded-md border'>
            <p className='text-muted-foreground py-12'>
              Tidak ada pengumuman.
            </p>
          </div>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {(data?.data ?? []).map((announcement) => (
                <Card
                  key={announcement.id}
                  className='cursor-pointer transition-shadow hover:shadow-md'
                  onClick={() => handleOpenDetail(announcement)}
                >
                  <CardHeader>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='secondary'>
                        {CATEGORY_LABELS[announcement.category]}
                      </Badge>
                      {!announcement.is_read && (
                        <Badge variant='default'>Belum dibaca</Badge>
                      )}
                    </div>
                    <CardTitle className='leading-snug'>
                      {announcement.title}
                    </CardTitle>
                    <CardDescription>
                      {formatPublishedDate(announcement.published_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className='text-muted-foreground line-clamp-3 text-sm'>
                      {stripHtml(announcement.content)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className='flex items-center justify-between gap-2'>
              <p className='text-muted-foreground text-sm'>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-xl'>
          <DialogHeader>
            <div className='flex flex-wrap items-center gap-2'>
              {detailAnnouncement && (
                <Badge variant='secondary'>
                  {CATEGORY_LABELS[detailAnnouncement.category]}
                </Badge>
              )}
            </div>
            <DialogTitle>{detailAnnouncement?.title ?? 'Memuat...'}</DialogTitle>
            <DialogDescription>
              {detailAnnouncement
                ? formatPublishedDate(detailAnnouncement.published_at)
                : ''}
            </DialogDescription>
          </DialogHeader>
          {isDetailLoading || !detailAnnouncement ? (
            <p className='text-muted-foreground text-sm'>Memuat data...</p>
          ) : (
            <div
              className='prose prose-sm max-w-none'
              dangerouslySetInnerHTML={{
                __html: detailAnnouncement.content,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function WargaAnnouncementsPage() {
  return <WargaAnnouncementsPageInner />
}
