import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAssignResident } from '@/hooks/use-houses'
import { useResidents } from '@/hooks/use-residents'
import type { House, Resident } from '@/types/api'
import { cn } from '@/lib/utils'

type HouseAssignDialogProps = {
  currentRow: House
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HouseAssignDialog({
  currentRow,
  open,
  onOpenChange,
}: HouseAssignDialogProps) {
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false)
  const assignResident = useAssignResident()

  // Fetch residents for search
  const { data: residentsData } = useResidents({ status: 'tetap', per_page: 50 })
  const residents = residentsData?.data ?? []

  const handleAssign = () => {
    if (!selectedResident || !startDate) return

    assignResident.mutate(
      {
        id: currentRow.id,
        data: {
          resident_id: selectedResident.id,
          start_date: startDate,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setSelectedResident(null)
          setStartDate(new Date().toISOString().split('T')[0])
        },
      }
    )
  }

  const isPending = assignResident.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) {
          setSelectedResident(null)
          setStartDate(new Date().toISOString().split('T')[0])
        }
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            Assign Penghuni ke {currentRow.house_number}
          </DialogTitle>
          <DialogDescription>
            Cari dan pilih penghuni untuk menempati rumah ini.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 px-0.5'>
          <div className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
            <Label className='col-span-2 text-end'>Penghuni</Label>
            <div className='col-span-4'>
              <Popover
                open={searchPopoverOpen}
                onOpenChange={setSearchPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={searchPopoverOpen}
                    className='w-full justify-between'
                  >
                    {selectedResident ? (
                      selectedResident.full_name
                    ) : (
                      <span className='text-muted-foreground'>
                        Cari penghuni...
                      </span>
                    )}
                    <Search className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
                  <Command>
                    <CommandInput placeholder='Cari penghuni...' />
                    <CommandList>
                      <CommandEmpty>
                        Tidak ada penghuni ditemukan.
                      </CommandEmpty>
                      <CommandGroup>
                        {residents.map((resident) => (
                          <CommandItem
                            key={resident.id}
                            value={resident.full_name}
                            onSelect={() => {
                              setSelectedResident(resident)
                              setSearchPopoverOpen(false)
                            }}
                          >
                            <span>{resident.full_name}</span>
                            <Badge
                              variant='secondary'
                              className='ml-2 text-xs'
                            >
                              {resident.status}
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {selectedResident && (
            <div className='grid grid-cols-6 items-center gap-x-4 gap-y-1 space-y-0'>
              <Label className='col-span-2 text-end'>Tanggal Mulai</Label>
              <div className='col-span-4 flex items-center gap-2'>
                <Input
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='flex-1'
                />
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 shrink-0'
                  onClick={() => setSelectedResident(null)}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            disabled={!selectedResident || !startDate || isPending}
            onClick={handleAssign}
          >
            {isPending ? 'Menyimpan...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
