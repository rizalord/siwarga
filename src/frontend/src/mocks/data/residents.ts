import type { Resident } from '@/types/api'

export const mockResidents: Resident[] = [
  {
    id: 1,
    full_name: 'Ahmad Fauzi',
    ktp_photo_url: null,
    status: 'tetap',
    phone_number: '081234567890',
    marital_status: 'menikah',
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    id: 2,
    full_name: 'Siti Nurhaliza',
    ktp_photo_url: null,
    status: 'kontrak',
    phone_number: '081234567891',
    marital_status: 'belum_menikah',
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
]
