import type { User } from '@/types/api'

export const mockUsers: User[] = [
  {
    id: 1,
    name: 'Admin RT',
    email: 'admin@siwarga.test',
    is_active: true,
    resident_id: null,
    roles: [{ id: 1, name: 'admin', description: 'Administrator' }],
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
]
