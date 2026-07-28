import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { ActivityLog } from '@/types/api'
import { useActivityLogs } from '@/hooks/use-activity-logs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ActivityLogDetailDialog } from './activity-log-detail-dialog'
import { ActivityLogsTable } from './activity-logs-table'

const route = getRouteApi('/_authenticated/activity-logs/')

function ActivityLogsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = useActivityLogs({
    page: search.page,
    per_page: search.pageSize,
    search: search.search,
    sort: search.sort,
    order: search.order,
    action: search.action,
    subject_type: search.subject_type,
  })

  const [currentRow, setCurrentRow] = useState<ActivityLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

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
          <h2 className='text-2xl font-bold tracking-tight'>Log Aktivitas</h2>
          <p className='text-muted-foreground'>
            Riwayat aktivitas pengguna di sistem: login, perubahan data, dan
            navigasi halaman.
          </p>
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <ActivityLogsTable
            data={data?.data ?? []}
            pageCount={data?.last_page ?? 1}
            isFetching={isFetching}
            search={search}
            navigate={navigate}
            onViewDetail={(row) => {
              setCurrentRow(row)
              setDetailOpen(true)
            }}
          />
        )}
      </Main>

      <ActivityLogDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currentRow={currentRow}
      />
    </>
  )
}

export function ActivityLogsPage() {
  return <ActivityLogsPageInner />
}
