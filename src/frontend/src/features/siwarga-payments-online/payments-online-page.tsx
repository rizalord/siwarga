import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { PaymentChannel, PaymentTransaction } from '@/types/api'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { useBills } from '@/hooks/use-bills'
import {
  useCreateTransaction,
  usePaymentTransaction,
  usePaymentTransactions,
  useSimulatePay,
  useUploadProof,
  useVerifyTransaction,
} from '@/hooks/use-payments-online'
import { useHasPermission } from '@/hooks/use-permission'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

const route = getRouteApi('/_authenticated/payments-online/')

const STATUS_LABELS: Record<PaymentTransaction['status'], string> = {
  pending: 'Menunggu bayar',
  awaiting_verification: 'Menunggu verifikasi',
  paid: 'Lunas',
  expired: 'Kedaluwarsa',
  failed: 'Gagal',
  rejected: 'Ditolak',
}

const CHANNEL_LABELS: Record<PaymentChannel, string> = {
  qris: 'QRIS',
  va: 'Virtual Account',
  ewallet: 'E-Wallet',
  manual_transfer: 'Transfer Manual',
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Backend `proof` rule is `image|max:2048` — mirror it client-side so
// invalid files are rejected before submit instead of failing server-side.
const MAX_PROOF_SIZE = 2_048_000

function handleProofFileChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setProof: (file: File | null) => void
) {
  const file = e.target.files?.[0] ?? null
  if (!file) {
    setProof(null)
    return
  }
  if (!file.type.startsWith('image/') || file.size > MAX_PROOF_SIZE) {
    toast.error('File harus gambar JPG/PNG maksimal 2MB')
    e.target.value = ''
    setProof(null)
    return
  }
  setProof(file)
}

// Seconds remaining until expiry, ticking every second. Returns null when
// there is no expiry. Interval is cleared on unmount or when inactive.
function useCountdown(expiresAt: string | null, active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active || !expiresAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active, expiresAt])
  if (!expiresAt) return null
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - now) / 1000)
  )
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function CreateForm({ onCreated }: { onCreated: (id: number) => void }) {
  const createTransaction = useCreateTransaction()
  const { data: billsData, isLoading: billsLoading } = useBills({
    status: 'belum_lunas',
    // Daftar tagihan dibatasi server berdasarkan peran (warga hanya
    // menerima tagihannya sendiri), jadi 200 sekadar menghindari
    // pemotongan pada RT besar.
    per_page: 200,
  })
  const [billId, setBillId] = useState('')
  const [channel, setChannel] = useState<PaymentChannel>('qris')
  const [provider, setProvider] = useState('simulator')
  const [proof, setProof] = useState<File | null>(null)

  const unpaidBills = billsData?.data ?? []
  const canSubmit =
    billId !== '' &&
    !createTransaction.isPending &&
    (channel !== 'manual_transfer' || proof !== null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createTransaction.mutate(
      {
        bill_id: Number(billId),
        channel,
        provider,
        proof: proof ?? undefined,
      },
      {
        onSuccess: (res) => onCreated(res.data.data.id),
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bayar Tagihan</CardTitle>
        <CardDescription>
          Pilih tagihan belum lunas, kanal pembayaran, lalu kirim pembayaran.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='trx-bill'>Tagihan</Label>
            <Select value={billId} onValueChange={setBillId}>
              <SelectTrigger id='trx-bill' aria-label='Tagihan'>
                <SelectValue
                  placeholder={
                    billsLoading ? 'Memuat tagihan...' : 'Pilih tagihan'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {unpaidBills.length === 0 ? (
                  <SelectItem value='__empty' disabled>
                    Tidak ada tagihan belum lunas
                  </SelectItem>
                ) : (
                  unpaidBills.map((bill) => (
                    <SelectItem key={bill.id} value={String(bill.id)}>
                      {bill.due_type.name} — {bill.house.house_number} —{' '}
                      {formatRupiah(bill.amount_due - bill.total_paid)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='trx-channel'>Kanal pembayaran</Label>
              <Select
                value={channel}
                onValueChange={(v) => setChannel(v as PaymentChannel)}
              >
                <SelectTrigger id='trx-channel' aria-label='Kanal pembayaran'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHANNEL_LABELS) as PaymentChannel[]).map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {CHANNEL_LABELS[c]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='trx-provider'>Penyedia</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id='trx-provider' aria-label='Penyedia'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='simulator'>Simulator</SelectItem>
                  <SelectItem value='xendit'>Xendit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='trx-proof'>Upload Bukti</Label>
            <Input
              id='trx-proof'
              type='file'
              accept='image/*'
              onChange={(e) => handleProofFileChange(e, setProof)}
            />
            {channel === 'manual_transfer' && (
              <p className='text-sm text-muted-foreground'>
                Bukti transfer wajib diunggah untuk kanal transfer manual.
              </p>
            )}
          </div>
          <Button type='submit' disabled={!canSubmit}>
            {createTransaction.isPending ? 'Mengirim...' : 'Kirim Pembayaran'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function TransactionDetail({
  id,
  onReset,
}: {
  id: number
  onReset: () => void
}) {
  const { data: trx, isLoading } = usePaymentTransaction(id)
  const uploadProof = useUploadProof()
  const simulatePay = useSimulatePay()
  const [proof, setProof] = useState<File | null>(null)
  const remaining = useCountdown(
    trx?.expires_at ?? null,
    trx?.status === 'pending' || trx?.status === 'awaiting_verification'
  )

  if (isLoading || !trx) {
    return (
      <Card>
        <CardContent className='py-12 text-center text-muted-foreground'>
          Memuat detail transaksi...
        </CardContent>
      </Card>
    )
  }

  const needsProof =
    trx.channel === 'manual_transfer' &&
    !trx.proof_path &&
    ['pending', 'awaiting_verification'].includes(trx.status)
  const canSimulate = trx.provider === 'simulator' && trx.status === 'pending'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detail Pembayaran</CardTitle>
        <CardDescription>
          Referensi {trx.reference} — {STATUS_LABELS[trx.status]}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-center gap-4'>
          {trx.qr_payload ? (
            <QRCodeSVG
              value={trx.qr_payload}
              size={160}
              aria-label={`Kode QR pembayaran ${trx.reference}`}
            />
          ) : trx.pay_code ? (
            <p className='rounded-md border px-4 py-3 font-mono text-lg'>
              {trx.pay_code}
            </p>
          ) : null}
          <div className='space-y-1 text-sm'>
            <p>
              Jumlah:{' '}
              <span className='font-semibold'>{formatRupiah(trx.amount)}</span>
            </p>
            {remaining !== null && (
              <p className='font-medium'>
                {remaining > 0 ? (
                  <>Sisa waktu {formatCountdown(remaining)}</>
                ) : (
                  <>Kedaluarsa</>
                )}
              </p>
            )}
            <p className='text-muted-foreground'>
              Berlaku hingga {formatDateTime(trx.expires_at)}
            </p>
            <p>
              Status:{' '}
              <Badge variant={trx.status === 'paid' ? 'default' : 'secondary'}>
                {STATUS_LABELS[trx.status]}
              </Badge>
            </p>
          </div>
        </div>
        {needsProof && (
          <div className='flex flex-wrap items-end gap-2'>
            <div className='space-y-2'>
              <Label htmlFor='trx-proof-retry'>Upload Bukti</Label>
              <Input
                id='trx-proof-retry'
                type='file'
                accept='image/*'
                onChange={(e) => handleProofFileChange(e, setProof)}
              />
            </div>
            <Button
              variant='outline'
              disabled={!proof || uploadProof.isPending}
              onClick={() => proof && uploadProof.mutate({ id: trx.id, proof })}
            >
              {uploadProof.isPending ? 'Mengunggah...' : 'Kirim Bukti'}
            </Button>
          </div>
        )}
        <div className='flex flex-wrap gap-2'>
          {canSimulate && (
            <Button
              variant='outline'
              disabled={simulatePay.isPending}
              onClick={() => simulatePay.mutate(trx.id)}
            >
              {simulatePay.isPending ? 'Memproses...' : 'Simulasi Bayar'}
            </Button>
          )}
          <Button variant='ghost' onClick={onReset}>
            Buat Transaksi Lain
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RejectDialog({
  trx,
  onClose,
}: {
  trx: PaymentTransaction | null
  onClose: () => void
}) {
  const verify = useVerifyTransaction()
  const [reason, setReason] = useState('')

  const handleReject = () => {
    if (!trx || reason.trim() === '') return
    verify.mutate(
      { id: trx.id, approve: false, reason: reason.trim() },
      { onSuccess: () => onClose() }
    )
  }

  return (
    <Dialog open={trx !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tolak pembayaran</DialogTitle>
          <DialogDescription>
            Tulis alasan penolakan untuk referensi {trx?.reference}.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-2'>
          <Label htmlFor='reject-reason'>Alasan penolakan</Label>
          <Textarea
            id='reject-reason'
            placeholder='Contoh: bukti transfer tidak jelas'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Batal
          </Button>
          <Button
            variant='destructive'
            disabled={reason.trim() === '' || verify.isPending}
            onClick={handleReject}
          >
            {verify.isPending ? 'Menolak...' : 'Tolak Transaksi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HistorySection() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const canVerify = useHasPermission('payments.verify')
  const verify = useVerifyTransaction()
  const [rejectTarget, setRejectTarget] = useState<PaymentTransaction | null>(
    null
  )
  const { data, isLoading, isError, refetch } = usePaymentTransactions({
    page: search.page,
    status: search.status,
  })

  const currentPage = data?.current_page ?? search.page ?? 1
  const lastPage = data?.last_page ?? 1

  const handleStatusChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: value === 'all' ? undefined : (value as typeof search.status),
        page: undefined,
      }),
    })
  }

  const handlePageChange = (nextPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: nextPage <= 1 ? undefined : nextPage,
      }),
    })
  }

  return (
    <section aria-label='Riwayat transaksi' className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h3 className='text-lg font-semibold tracking-tight'>Riwayat</h3>
          <p className='text-sm text-muted-foreground'>
            Daftar transaksi pembayaran online.
          </p>
        </div>
        <Select
          value={search.status ?? 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger aria-label='Filter status' className='w-full sm:w-52'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Semua status</SelectItem>
            {(Object.keys(STATUS_LABELS) as PaymentTransaction['status'][]).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              )
            )}
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
          <p className='py-12 text-muted-foreground'>Tidak ada transaksi.</p>
        </div>
      ) : (
        <>
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Tagihan</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Kanal</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data ?? []).map((trx) => (
                  <TableRow key={trx.id}>
                    <TableCell className='font-mono text-xs'>
                      {trx.reference}
                    </TableCell>
                    <TableCell>{trx.bill_label ?? `#${trx.bill_id}`}</TableCell>
                    <TableCell className='whitespace-nowrap'>
                      {formatRupiah(trx.amount)}
                    </TableCell>
                    <TableCell>{CHANNEL_LABELS[trx.channel]}</TableCell>
                    <TableCell>
                      {trx.proof_url ? (
                        <a
                          href={trx.proof_url}
                          target='_blank'
                          rel='noreferrer'
                        >
                          <img
                            src={trx.proof_url}
                            alt={`Bukti pembayaran ${trx.reference}`}
                            className='h-12 w-12 rounded border object-cover'
                          />
                        </a>
                      ) : (
                        <span className='text-sm text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trx.status === 'paid' ? 'default' : 'secondary'
                        }
                      >
                        {STATUS_LABELS[trx.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      {canVerify && trx.status === 'awaiting_verification' ? (
                        <div className='flex justify-end gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            disabled={verify.isPending}
                            onClick={() =>
                              verify.mutate({ id: trx.id, approve: true })
                            }
                          >
                            Setujui
                          </Button>
                          <Button
                            variant='destructive'
                            size='sm'
                            disabled={verify.isPending}
                            onClick={() => setRejectTarget(trx)}
                          >
                            Tolak
                          </Button>
                        </div>
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

      <RejectDialog trx={rejectTarget} onClose={() => setRejectTarget(null)} />
    </section>
  )
}

function PaymentsOnlinePageInner() {
  const [createdId, setCreatedId] = useState<number | null>(null)

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
          <h2 className='text-2xl font-bold tracking-tight'>Bayar Online</h2>
          <p className='text-muted-foreground'>
            Bayar tagihan iuran secara online dan pantau statusnya.
          </p>
        </div>

        {createdId === null ? (
          <CreateForm onCreated={setCreatedId} />
        ) : (
          <TransactionDetail
            id={createdId}
            onReset={() => setCreatedId(null)}
          />
        )}

        <HistorySection />
      </Main>
    </>
  )
}

export function PaymentsOnlinePage() {
  return <PaymentsOnlinePageInner />
}
