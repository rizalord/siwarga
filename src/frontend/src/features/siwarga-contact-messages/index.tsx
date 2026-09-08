import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ContactMessage } from '@/types/api'
import {
  useContactMessages,
  useMarkContactMessageRead,
} from '@/hooks/use-contact-messages'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ContactMessageDetail } from './contact-message-detail'
import { contactMessagesColumns as columns } from './contact-messages-columns'

const route = getRouteApi('/_authenticated/contact-messages/')

function ContactMessagesPageInner() {
  const search = route.useSearch()
  const { data, isLoading } = useContactMessages({
    page: search.page as number | undefined,
  })
  const markRead = useMarkContactMessageRead()

  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleSelect = (message: ContactMessage) => {
    setSelected(message)
    setDetailOpen(true)
    if (message.status === 'new') {
      markRead.mutate(message.id)
    }
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.data ?? [],
    columns: columns({ onSelect: handleSelect }),
    getCoreRowModel: getCoreRowModel(),
  })

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
          <h2 className='text-2xl font-bold tracking-tight'>Pesan Kontak</h2>
          <p className='text-muted-foreground'>
            Pesan masuk dari formulir kontak di landing page.
          </p>
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className='h-24 text-center'>
                      Tidak ada pesan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>

      <ContactMessageDetail
        message={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}

export function ContactMessagesPage() {
  return <ContactMessagesPageInner />
}
