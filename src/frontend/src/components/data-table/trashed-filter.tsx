import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL_OPTION = '__all__'

export type TrashedFilterProps = {
  value: 'with' | 'only' | undefined
  onChange: (value: 'with' | 'only' | undefined) => void
}

export function TrashedFilter({ value, onChange }: TrashedFilterProps) {
  return (
    <Select
      value={value ?? ALL_OPTION}
      onValueChange={(nextValue) =>
        onChange(nextValue === ALL_OPTION ? undefined : nextValue)
      }
    >
      <SelectTrigger size='sm' aria-label='Filter data terhapus'>
        <SelectValue placeholder='Tanpa Data Terhapus' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_OPTION}>Tanpa Data Terhapus</SelectItem>
        <SelectItem value='with'>Termasuk Data Terhapus</SelectItem>
        <SelectItem value='only'>Hanya Data Terhapus</SelectItem>
      </SelectContent>
    </Select>
  )
}
