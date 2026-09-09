import { useState } from 'react'
import type { EmergencyContact } from '@/types/api'
import { Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import {
  useCreateContact,
  useDeleteContact,
  useEmergencyContacts,
  useUpdateContact,
} from '@/hooks/use-emergency-contacts'
import { useHasPermission } from '@/hooks/use-permission'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

function ContactFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: EmergencyContact | null
}) {
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [sortOrder, setSortOrder] = useState(
    initial?.sort_order != null ? String(initial.sort_order) : '0'
  )

  const pending = createContact.isPending || updateContact.isPending
  const canSubmit =
    name.trim().length > 0 && phone.trim().length > 0 && !pending

  const reset = () => {
    setName(initial?.name ?? '')
    setPhone(initial?.phone ?? '')
    setSortOrder(initial?.sort_order != null ? String(initial.sort_order) : '0')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const parsedSortOrder = Number(sortOrder)
    const input = {
      name: name.trim(),
      phone: phone.trim(),
      ...(sortOrder.trim() && !Number.isNaN(parsedSortOrder)
        ? { sort_order: parsedSortOrder }
        : {}),
    }
    if (initial) {
      updateContact.mutate(
        { id: initial.id, input },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createContact.mutate(input, {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {initial ? 'Ubah Kontak Darurat' : 'Tambah Kontak Darurat'}
          </DialogTitle>
          <DialogDescription>
            Kontak ini ditampilkan di halaman Panic Button agar warga dapat
            menghubungi langsung saat darurat.
          </DialogDescription>
        </DialogHeader>
        <form
          id='emergency-contact-form'
          onSubmit={handleSubmit}
          className='space-y-4 px-0.5'
        >
          <div className='space-y-2'>
            <Label htmlFor='emergency-contact-name'>Nama *</Label>
            <Input
              id='emergency-contact-name'
              placeholder='cth. Pos Satpam'
              autoComplete='off'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='emergency-contact-phone'>Nomor telepon *</Label>
            <Input
              id='emergency-contact-phone'
              placeholder='cth. 081234567890'
              autoComplete='off'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='emergency-contact-sort'>Urutan tampil</Label>
            <Input
              id='emergency-contact-sort'
              type='number'
              min={0}
              placeholder='0'
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type='submit'
            form='emergency-contact-form'
            disabled={!canSubmit}
          >
            {pending ? 'Menyimpan...' : 'Simpan Kontak'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmergencyContactsPageInner() {
  const canManage = useHasPermission('emergency-contacts.manage')
  const { data, isLoading, isError, refetch } = useEmergencyContacts()
  const deleteContact = useDeleteContact()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EmergencyContact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmergencyContact | null>(
    null
  )

  if (!canManage) {
    return (
      <>
        <Header fixed>
          <Search className='me-auto' />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </Header>

        <Main
          fixed
          className='flex flex-1 flex-col items-center justify-center gap-2'
        >
          <ShieldAlert className='h-10 w-10 text-destructive' />
          <p className='font-semibold'>Tidak punya akses</p>
          <p className='text-sm text-muted-foreground'>
            Anda tidak memiliki izin untuk mengelola kontak darurat.
          </p>
        </Main>
      </>
    )
  }

  const contacts = data?.data ?? []

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
            <h2 className='text-2xl font-bold tracking-tight'>
              Kontak Darurat
            </h2>
            <p className='text-muted-foreground'>
              Kelola nomor darurat yang tampil di halaman Panic Button.
            </p>
          </div>
          <Button
            className='space-x-1'
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <span>Tambah Kontak</span> <Plus size={18} />
          </Button>
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
        ) : (
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Urutan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length ? (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className='font-medium'>
                        {contact.name}
                      </TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>{contact.sort_order}</TableCell>
                      <TableCell>
                        <div className='flex gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            aria-label={`Ubah kontak ${contact.name}`}
                            onClick={() => {
                              setEditing(contact)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil size={16} /> Ubah
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            aria-label={`Hapus kontak ${contact.name}`}
                            onClick={() => setDeleteTarget(contact)}
                          >
                            <Trash2 size={16} /> Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className='h-24 text-center'>
                      Belum ada kontak darurat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>

      <ContactFormDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(state) => {
          if (!state) setDeleteTarget(null)
        }}
        handleConfirm={() => {
          if (!deleteTarget) return
          deleteContact.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
        disabled={deleteContact.isPending}
        title='Hapus Kontak Darurat'
        desc={`Apakah Anda yakin ingin menghapus kontak ${deleteTarget?.name ?? ''}?`}
        confirmText='Hapus'
        destructive
      />
    </>
  )
}

export function EmergencyContactsPage() {
  return <EmergencyContactsPageInner />
}
