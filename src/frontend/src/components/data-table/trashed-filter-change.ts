import type { NavigateFn } from '@/hooks/use-table-url-state'
import type { TrashedFilterValue } from '@/types/api'

type HandleTrashedFilterChangeOptions = {
  value: TrashedFilterValue | undefined
  clearRowSelection: () => void
  navigate: NavigateFn
}

export function handleTrashedFilterChange({
  value,
  clearRowSelection,
  navigate,
}: HandleTrashedFilterChangeOptions) {
  clearRowSelection()
  navigate({
    search: (prev) => ({
      ...(prev as Record<string, unknown>),
      page: 1,
      trashed: value,
    }),
  })
}
