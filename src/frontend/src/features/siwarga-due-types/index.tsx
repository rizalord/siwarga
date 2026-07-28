import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Main } from '@/components/layout/main'
import { ConfirmDialog } from '@/components/confirm-dialog'
import useDialogState from '@/hooks/use-dialog-state'
import { useDueTypes, useDeleteDueType } from '@/hooks/use-due-types'
import type { DueType } from '@/types/api'
import { DueTypeFormDialog } from './due-type-form'
import { DueTypesTable } from './due-types-table'

const route = getRouteApi('/_authenticated/due-types/')

function DueTypesDialogs({
  open,
  setOpen,
  currentRow,
  setCurrentRow,
}: {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  currentRow: DueType | null
  setCurrentRow: (row: DueType | null) => void
}) {
  const deleteDueType = useDeleteDueType()

  const handleDelete = () => {
    if (!currentRow) return
    deleteDueType.mutate(currentRow.id, {
      onSuccess: () => {
        setOpen(null)
        setTimeout(() => {
          setCurrentRow(null)
        }, 500)
      },
    })
  }

  return (
    <>
      <DueTypeFormDialog
        key='due-type-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      {currentRow && (
        <>
          <DueTypeFormDialog
            key={`due-type-update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={() => {
              setOpen('update')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key={`due-type-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            handleConfirm={handleDelete}
            disabled={deleteDueType.isPending}
            title={
              <span className='text-destructive'>
                <AlertTriangle
                  className='me-1 inline-block stroke-destructive'
                  size={18}
                />{' '}
                Hapus Jenis Iuran
              </span>
            }
            desc={
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <span className='font-bold'>{currentRow.name}</span>?
                <br />
                Tindakan ini akan menghapus jenis iuran secara permanen dan
                tidak dapat dibatalkan.
              </p>
            }
            confirmText='Hapus'
            destructive
          />
        </>
      )}
    </>
  )
}

function DueTypesPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useDueTypes({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const [open, setOpen] = useDialogState<'create' | 'update' | 'delete'>(null)
  const [currentRow, setCurrentRow] = useState<DueType | null>(null)

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Jenis Iuran
            </h2>
            <p className='text-muted-foreground'>
              Kelola jenis iuran di sini.
            </p>
          </div>
          <Button className='space-x-1' onClick={() => setOpen('create')}>
            <span>Tambah Jenis Iuran</span> <Plus size={18} />
          </Button>
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <DueTypesTable
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

      <DueTypesDialogs
        open={open}
        setOpen={setOpen}
        currentRow={currentRow}
        setCurrentRow={setCurrentRow}
      />
    </>
  )
}

export function DueTypesPage() {
  return <DueTypesPageInner />
}
