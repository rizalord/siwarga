import type { User } from '@/types/api'
import { mockRoles } from './roles'

export const mockUsers: User[] = [
  {
    id: 1,
    name: 'Admin RT',
    email: 'admin@siwarga.test',
    is_active: true,
    resident_id: null,
    roles: [{ id: 1, name: 'admin', description: 'Administrator', is_admin: true }],
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: null,
  },
  {
    id: 2,
    name: 'Bendahara Lama',
    email: 'bendahara-lama@siwarga.test',
    is_active: true,
    resident_id: null,
    roles: [mockRoles[1]],
    created_at: '2024-01-01T00:00:00.000000Z',
    updated_at: '2024-01-01T00:00:00.000000Z',
    deleted_at: '2026-07-20T10:00:00.000000Z',
  },
]
