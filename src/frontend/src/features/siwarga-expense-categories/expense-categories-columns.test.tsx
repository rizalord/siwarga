import type { Row } from '@tanstack/react-table'
import type { ExpenseCategory } from '@/types/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useAuthStore } from '@/stores/auth-store'
import { expenseCategoriesColumns } from './expense-categories-columns'

const activeExpenseCategory: ExpenseCategory = {
  id: 1,
  name: 'Kas Operasional',
  created_at: '2026-07-29T00:00:00Z',
  updated_at: '2026-07-29T00:00:00Z',
  deleted_at: null,
}

const trashedExpenseCategory: ExpenseCategory = {
  ...activeExpenseCategory,
  id: 2,
  deleted_at: '2026-07-29T01:00:00Z',
}

function renderActionsCell(row: ExpenseCategory) {
  const setOpen = vi.fn()
  const setCurrentRow = vi.fn()
  const columns = expenseCategoriesColumns({ setOpen, setCurrentRow })
  const actionsColumn = columns.find((column) => column.id === 'actions')

  if (typeof actionsColumn?.cell !== 'function') {
    throw new Error('Actions column is not renderable')
  }

  const renderCell = actionsColumn.cell

  function CellUnderTest() {
    return (
      <>
        {renderCell({
          row: { original: row } as Row<ExpenseCategory>,
        } as never)}
      </>
    )
  }

  return {
    setOpen,
    setCurrentRow,
    renderResult: render(<CellUnderTest />),
  }
}

describe('expenseCategoriesColumns row actions', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('shows update and delete actions for active rows', async () => {
    const { renderResult } = renderActionsCell(activeExpenseCategory)
    const { getByRole, getByText } = await renderResult

    await userEvent.click(getByRole('button', { name: 'Buka menu' }))

    await expect.element(getByText('Ubah')).toBeInTheDocument()
    await expect.element(getByText('Hapus')).toBeInTheDocument()
  })

  it('shows restore and permanent delete actions for trashed rows with trash permission', async () => {
    useAuthStore.getState().auth.setUser({
      id: 99,
      name: 'Admin',
      email: 'admin@example.com',
      permissions: ['expense-categories.trash'],
    })

    const { renderResult } = renderActionsCell(trashedExpenseCategory)
    const { getByRole, getByText } = await renderResult

    await userEvent.click(getByRole('button', { name: 'Buka menu' }))

    await expect.element(getByText('Pulihkan')).toBeInTheDocument()
    await expect.element(getByText('Hapus Permanen')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Ubah')
    expect(document.body.textContent).not.toContain('Hapus\n')
  })

  it('hides trashed-row actions without trash permission', async () => {
    const { renderResult } = renderActionsCell(trashedExpenseCategory)
    await renderResult

    expect(
      document.querySelector('[data-slot="dropdown-menu-trigger"]')
    ).toBeNull()
  })
})
