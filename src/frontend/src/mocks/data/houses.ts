import type { House } from '@/types/api'

export const mockHouses: House[] = [
  {
    id: 1,
    house_number: 'A-01',
    address: 'Jl. Mawar No. 1',
    status: 'dihuni',
    current_resident: { id: 1, full_name: 'Ahmad Fauzi', status: 'tetap', phone_number: '081234567890', marital_status: 'menikah', ktp_photo_url: null, created_at: '', updated_at: '', deleted_at: null },
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    id: 2,
    house_number: 'A-02',
    address: 'Jl. Mawar No. 2',
    status: 'kosong',
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: '2026-07-20T10:00:00.000000Z',
  },
]
