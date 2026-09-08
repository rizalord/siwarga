import { useEffect, useRef, useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import type { ForumThread } from '@/types/api'
import { useAuthStore } from '@/stores/auth-store'
import {
  useCreateThread,
  useDeleteThread,
  useForumThreads,
} from '@/hooks/use-forum'
import { useHasPermission } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const route = getRouteApi('/_authenticated/forum/')

function formatThreadDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ThreadRow({ thread }: { thread: ForumThread }) {
  const canManage = useHasPermission('forum.manage')
  const currentUserId = useAuthStore((state) => state.auth.user?.id)
  const deleteThread = useDeleteThread()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canDelete =
    canManage || (currentUserId != null && thread.created_by === currentUserId)

  return (
    <Card>
      <CardContent className='flex items-center justify-between gap-3 py-4'>
        <div className='min-w-0'>
          <Link
            to='/forum/$threadId'
            params={{ threadId: thread.id }}
            className='block truncate font-medium hover:underline'
          >
            {thread.title}
          </Link>
          <p className='mt-1 text-sm text-muted-foreground'>
            {thread.created_by_name ?? 'Warga'} · {thread.posts_count} balasan ·{' '}
            {formatThreadDate(thread.created_at)}
          </p>
        </div>
        {canDelete && (
          <Button
            variant='outline'
            size='sm'
            aria-label={`Hapus diskusi ${thread.title}`}
            disabled={deleteThread.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Hapus
          </Button>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        handleConfirm={() =>
          deleteThread.mutate(thread.id, {
            onSuccess: () => setDeleteOpen(false),
          })
        }
        disabled={deleteThread.isPending}
        title='Hapus Diskusi'
        desc={`Apakah Anda yakin ingin menghapus "${thread.title}"?`}
        confirmText='Hapus'
        destructive
      />
    </Card>
  )
}

function ForumThreadsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isError, refetch } = useForumThreads({
    page: search.page,
    search: search.search,
  })
  const createThread = useCreateThread()

  const [title, setTitle] = useState('')
  const [searchInput, setSearchInput] = useState(search.search ?? '')

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || createThread.isPending) return
    createThread.mutate(trimmed, {
      onSuccess: () => setTitle(''),
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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Forum Warga</h2>
          <p className='text-muted-foreground'>
            Ruang diskusi warga seputar lingkungan RT.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className='flex flex-col gap-2 sm:flex-row'
        >
          <Input
            placeholder='Judul diskusi baru'
            aria-label='Judul diskusi baru'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='sm:max-w-md'
          />
          <Button type='submit' disabled={createThread.isPending}>
            {createThread.isPending ? 'Membuat...' : 'Buat Diskusi'}
          </Button>
        </form>

        <Input
          placeholder='Cari diskusi'
          aria-label='Cari diskusi'
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className='sm:max-w-sm'
        />

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
            <p className='py-12 text-muted-foreground'>Belum ada diskusi.</p>
          </div>
        ) : (
          <>
            <div className='flex flex-col gap-3'>
              {(data?.data ?? []).map((thread) => (
                <ThreadRow key={thread.id} thread={thread} />
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
    </>
  )
}

export function ForumThreadsPage() {
  return <ForumThreadsPageInner />
}
