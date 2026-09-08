import { useEffect, useState } from 'react'
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
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)

    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useHouses({
    search: debouncedSearch,
    per_page: 50,
  })

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
          <p className='text-sm text-muted-foreground'>Memuat...</p>
        )}
        {!isLoading && data?.data.length === 0 && (
          <p className='text-sm text-muted-foreground'>
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
      {data && data.total > data.data.length && (
        <p className='text-xs text-muted-foreground'>
          Menampilkan {data.data.length} dari {data.total} rumah — persempit
          pencarian.
        </p>
      )}
      <p className='text-xs text-muted-foreground'>
        {value.length === 0
          ? 'Tidak ada rumah dipilih — pengumuman akan dikirim ke semua warga saat diterbitkan.'
          : `${value.length} rumah dipilih.`}
      </p>
    </div>
  )
}
