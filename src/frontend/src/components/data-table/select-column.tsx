import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'

export function selectColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Pilih semua'
        className='translate-y-0.5'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        disabled={!row.getCanSelect()}
        aria-label='Pilih baris'
        className='translate-y-0.5'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}
