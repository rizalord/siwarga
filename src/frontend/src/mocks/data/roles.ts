import type { Role } from '@/types/api'
import { mockPermissions } from './permissions'

export const mockRoles: Role[] = [
  {
    id: 1,
    name: 'admin',
    description: 'Administrator',
    permissions: mockPermissions,
    users_count: 1,
    is_admin: true,
  },
  {
    id: 2,
    name: 'bendahara',
    description: 'Bendahara',
    permissions: mockPermissions.filter((p) =>
      ['houses.view', 'bills.view', 'bills.generate', 'payments.view', 'payments.create', 'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete', 'reports.view'].includes(p.name)
    ),
    users_count: 1,
  },
  {
    id: 3,
    name: 'warga',
    description: 'Warga',
    permissions: mockPermissions.filter((p) => ['bills.view', 'payments.view'].includes(p.name)),
    users_count: 1,
  },
]
