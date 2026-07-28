import { getRouteApi } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { usePayments } from '@/hooks/use-payments'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PaymentDeleteDialog } from './payment-delete-dialog'
import { PaymentFormDialog } from './payment-form'
import { PaymentsProvider, usePaymentsContext } from './payments-provider'
import { PaymentsTable } from './payments-table'

const route = getRouteApi('/_authenticated/payments/')

function PaymentsDialogs() {
  const { open, setOpen } = usePaymentsContext()

  return (
    <>
      <PaymentFormDialog
        key='payment-create'
        open={open === 'create'}
        onOpenChange={() => setOpen('create')}
      />

      <PaymentDeleteDialog />
    </>
  )
}

function PaymentsPageInner() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data, isLoading, isFetching } = usePayments({
    page: search.page,
    per_page: search.pageSize,
    month: search.month,
    year: search.year,
    search: search.search,
    sort: search.sort,
    order: search.order,
  })

  const { setOpen } = usePaymentsContext()

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
            <h2 className='text-2xl font-bold tracking-tight'>Pembayaran</h2>
            <p className='text-muted-foreground'>
              Kelola pembayaran iuran di sini.
            </p>
          </div>
          <Button className='space-x-1' onClick={() => setOpen('create')}>
            <span>Catat Pembayaran</span> <Plus size={18} />
          </Button>
        </div>
        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>Memuat data...</p>
          </div>
        ) : (
          <PaymentsTable
            data={data?.data ?? []}
            pageCount={data?.last_page ?? 1}
            isFetching={isFetching}
            search={search}
            navigate={navigate}
          />
        )}
      </Main>

      <PaymentsDialogs />
    </>
  )
}

export function PaymentsPage() {
  return (
    <PaymentsProvider>
      <PaymentsPageInner />
    </PaymentsProvider>
  )
}
