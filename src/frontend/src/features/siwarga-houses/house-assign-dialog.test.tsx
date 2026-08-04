import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { House, ResidentFilter } from '@/types/api'
import { HouseAssignDialog } from './house-assign-dialog'

const { capturedParams } = vi.hoisted(() => ({
  capturedParams: { value: undefined as ResidentFilter | undefined },
}))

vi.mock('@/hooks/use-residents', () => ({
  useResidents: (params?: ResidentFilter) => {
    capturedParams.value = params
    return {
      data: {
        data: [
          {
            id: 1,
            full_name: 'Ahmad Kontrak',
            ktp_photo_url: null,
            status: 'kontrak',
            phone_number: '081234567890',
            marital_status: 'belum_menikah',
            created_at: '2026-08-01T00:00:00.000000Z',
            updated_at: '2026-08-01T00:00:00.000000Z',
            deleted_at: null,
          },
          {
            id: 2,
            full_name: 'Budi Tetap',
            ktp_photo_url: null,
            status: 'tetap',
            phone_number: '081298765432',
            marital_status: 'menikah',
            created_at: '2026-08-01T00:00:00.000000Z',
            updated_at: '2026-08-01T00:00:00.000000Z',
            deleted_at: null,
          },
        ],
      },
    }
  },
}))

vi.mock('@/hooks/use-houses', () => ({
  useAssignResident: () => ({ mutate: vi.fn(), isPending: false }),
}))

const house: House = {
  id: 10,
  house_number: 'A-01',
  address: '',
  status: 'kosong',
  current_resident: undefined,
  created_at: '2026-08-01T00:00:00.000000Z',
  updated_at: '2026-08-01T00:00:00.000000Z',
  deleted_at: null,
}

describe('HouseAssignDialog', () => {
  beforeEach(() => {
    capturedParams.value = undefined
    vi.clearAllMocks()
  })

  it('meminta daftar penghuni tanpa memfilter status tetap', async () => {
    await render(<HouseAssignDialog currentRow={house} open onOpenChange={vi.fn()} />)

    expect(capturedParams.value?.status).toBeUndefined()
  })

  it('menampilkan penghuni kontrak sebagai opsi assign', async () => {
    const screen = await render(
      <HouseAssignDialog currentRow={house} open onOpenChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('combobox'))

    await expect.element(screen.getByText('Ahmad Kontrak')).toBeInTheDocument()
    await expect.element(screen.getByText('Budi Tetap')).toBeInTheDocument()
  })
})
