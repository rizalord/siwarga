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
      [
        'houses.view',
        'bills.view',
        'bills.view.all',
        'bills.generate',
        'bills.trash',
        'payments.view',
        'payments.view.all',
        'payments.create',
        'payments.trash',
        'expenses.view',
        'expenses.create',
        'expenses.edit',
        'expenses.delete',
        'expenses.trash',
        'expense-categories.view',
        'expense-categories.manage',
        'expense-categories.trash',
        'reports.view',
      ].includes(p.name)
    ),
    users_count: 1,
  },
  {
    id: 3,
    name: 'warga',
    description: 'Warga',
    permissions: mockPermissions.filter((p) => ['bills.view', 'bills.view.own', 'payments.view', 'payments.view.own'].includes(p.name)),
    users_count: 1,
  },
]
