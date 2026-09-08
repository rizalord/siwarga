import { useState } from 'react'
import { useHouses } from '@/hooks/use-houses'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

type HouseTargetPickerProps = {
  value: number[]
  onChange: (houseIds: number[]) => void
}

export function HouseTargetPicker({ value, onChange }: HouseTargetPickerProps) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useHouses({ search, per_page: 50 })

  const toggle = (houseId: number) => {
    onChange(
      value.includes(houseId)
        ? value.filter((id) => id !== houseId)
        : [...value, houseId]
    )
  }

  return (
    <div className='space-y-2'>
      <Input
        placeholder='Cari nomor rumah...'
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ScrollArea className='h-40 rounded-md border p-2'>
        {isLoading && (
          <p className='text-muted-foreground text-sm'>Memuat...</p>
        )}
        {!isLoading && data?.data.length === 0 && (
          <p className='text-muted-foreground text-sm'>
            Tidak ada rumah ditemukan.
          </p>
        )}
        {data?.data.map((house) => (
          <label
            key={house.id}
            className='flex items-center gap-2 py-1 text-sm'
          >
            <Checkbox
              checked={value.includes(house.id)}
              onCheckedChange={() => toggle(house.id)}
            />
            {house.house_number}
          </label>
        ))}
      </ScrollArea>
      <p className='text-muted-foreground text-xs'>
        {value.length === 0
          ? 'Tidak ada rumah dipilih — pengumuman akan dikirim ke semua warga saat diterbitkan.'
          : `${value.length} rumah dipilih.`}
      </p>
    </div>
  )
}
