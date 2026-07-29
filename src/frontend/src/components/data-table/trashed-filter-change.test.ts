import { describe, expect, it, vi } from 'vitest'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { handleTrashedFilterChange } from './trashed-filter-change'

describe('handleTrashedFilterChange', () => {
  it('clears row selection before navigating to a different trashed mode', () => {
    const clearRowSelection = vi.fn()
    const navigate = vi.fn()
    const prev = { page: 3, search: 'Budi', trashed: 'with' }

    handleTrashedFilterChange({
      value: 'only',
      clearRowSelection,
      navigate: navigate as NavigateFn,
    })

    expect(clearRowSelection).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(clearRowSelection.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0]
    )

    const search = navigate.mock.calls[0]?.[0].search
    const next =
      typeof search === 'function'
        ? (search(prev) as Record<string, unknown>)
        : (search as Record<string, unknown>)

    expect(next).toMatchObject({
      page: 1,
      search: 'Budi',
      trashed: 'only',
    })
  })
})
