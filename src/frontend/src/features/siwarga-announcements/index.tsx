import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Announcement } from '@/types/api'
import { AlertTriangle, Plus, Send } from 'lucide-react'
import {
  useAnnouncements,
  useDeleteAnnouncement,
  usePublishAnnouncement,
} from '@/hooks/use-announcements'
import useDialogState from '@/hooks/use-dialog-state'
import { useHasPermission } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { AnnouncementFormDialog } from './announcement-form'
import { AnnouncementsTable } from './announcements-table'

const route = getRouteApi('/_authenticated/announcements/')

function AnnouncementsDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | 'publish' | null
  setOpen: (open: 'create' | 'update' | 'delete' | 'publish' | null) => void
  currentRow: Announcement | null
  setCurrentRow: (row: Announcement | null) => void
}) {
  const deleteAnnouncement = useDeleteAnnouncement()
  const publishAnnouncement = usePublishAnnouncement()

  const handleDelete = () => {
    if (!currentRow) return
    deleteAnnouncement.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => setCurrentRow(null), 500)
      },
    })
  }

  const handlePublish = () => {
    if (!currentRow) return
    publishAnnouncement.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => setCurrentRow(null), 500)
      },
    })
  }

  return (
    <>
      <AnnouncementFormDialog
        key='announcement-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <AnnouncementFormDialog
            key={`announcement-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key={`announcement-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => setCurrentRow(null), 500)
            }}
            handleConfirm={handleDelete}
            disabled={deleteAnnouncement.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Pengumuman
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.title}</span>?
              </p>
            }
            confirmText='Hapus'
            destructive
          />

          <ConfirmDialog
            key={`announcement-publish-${currentRow.id}`}
            open={open === 'publish'}
            onOpenChange={() => {
              setOpen('publish')
              setTimeout(() => setCurrentRow(null), 500)
            }}
            handleConfirm={handlePublish}
            disabled={publishAnnouncement.isPending}
            isLoading={publishAnnouncement.isPending}
            title={
              <span className='flex items-center gap-1'>
                <Send size={18} /> Kirim ke WhatsApp
              </span>
            }
            desc={
              <p>
                Kirim <span className='font-bold'>{currentRow.title}</span> ke
                WhatsApp warga
                {currentRow.target_house_ids.length > 0
                  ? ` di ${currentRow.target_house_ids.length} rumah terpilih`
                  : ' — semua warga (tidak ada rumah target yang dipilih)'}
                ?
              </p>
            }
            confirmText='Kirim'
          />
        </>
      )}
    </>
  )
}

function AnnouncementsPageInner() {
  const canManage = useHasPermission('announcements.manage')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useAnnouncements({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const [open, setOpen] = useDialogState<
    'create' | 'update' | 'delete' | 'publish'
  >(null)
  const [currentRow, setCurrentRow] = useState<Announcement | null>(null)

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
            <h2 className='text-2xl font-bold tracking-tight'>Pengumuman</h2>
            <p className='text-muted-foreground'>
              Kelola pengumuman warga dan kirim notifikasi WhatsApp.
            </p>
          </div>
          {canManage && (
            <Button className='space-x-1' onClick={() => setOpen('create')}>
              <span>Tambah Pengumuman</span> <Plus size={18} />
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <AnnouncementsTable
            data={data?.data ?? []}
            pageCount={data?.last_page ?? 1}
            isFetching={isFetching}
            search={search}
            navigate={navigate}
            setOpen={setOpen}
            setCurrentRow={setCurrentRow}
          />
        )}
      </Main>

      <AnnouncementsDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function AnnouncementsPage() {
  return <AnnouncementsPageInner />
}
