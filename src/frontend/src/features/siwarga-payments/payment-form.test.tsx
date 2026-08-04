import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { Bill } from '@/types/api'
import { PaymentFormDialog } from './payment-form'

const { testBill } = vi.hoisted(() => ({
  testBill: {
    id: 1,
    house: {
      id: 10,
      house_number: 'A-01',
      address: '',
      status: 'dihuni',
      created_at: '',
      updated_at: '',
      deleted_at: null,
    },
    resident: {
      id: 5,
      full_name: 'Ahmad',
      ktp_photo_url: null,
      status: 'tetap',
      phone_number: '0812',
      marital_status: 'menikah',
      created_at: '',
      updated_at: '',
      deleted_at: null,
    },
    due_type: {
      id: 2,
      name: 'Iuran Kebersihan',
      amount: 15000,
      billing_cycle: 'bulanan',
    },
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    amount_due: 15000,
    total_paid: 10000,
    status: 'belum_lunas',
    created_at: '',
    updated_at: '',
    deleted_at: null,
  } as Bill,
}))

vi.mock('@/hooks/use-bills', () => ({
  useBills: () => ({ data: { data: [testBill] } }),
}))

vi.mock('@/hooks/use-payments', () => ({
  useCreatePayment: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('PaymentFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengisi nominal sisa tagihan saat bill dipilih', async () => {
    const screen = await render(<PaymentFormDialog open onOpenChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText(/A-01/))

    const amountInput = screen.getByRole('spinbutton')
    await expect.element(amountInput).toHaveValue(5000)
  })

  it('menampilkan sisa tagihan yang tersisa', async () => {
    const screen = await render(<PaymentFormDialog open onOpenChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText(/A-01/))

    await expect
      .element(screen.getByText(/Sisa tagihan.*5\.000/))
      .toBeInTheDocument()
  })
})
