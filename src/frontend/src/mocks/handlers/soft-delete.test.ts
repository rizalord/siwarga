import { expect, it } from 'vitest'
import { mockBills } from '../data/bills'
import { mockDueTypes } from '../data/due-types'
import { mockExpenseCategories } from '../data/expense-categories'
import { mockExpenses } from '../data/expenses'
import { mockHouses } from '../data/houses'
import { mockPayments } from '../data/payments'
import { mockResidents } from '../data/residents'
import { mockUsers } from '../data/users'
import { billHandlers } from './bills'
import { dueTypeHandlers } from './due-types'
import { expenseCategoryHandlers } from './expense-categories'
import { expenseHandlers } from './expenses'
import { houseHandlers } from './houses'
import { paymentHandlers } from './payments'
import { applyTrashedFilter, bulkForceDelete, bulkRestore, forceDeleteById, softDeleteById, restoreById } from './soft-delete'
import { residentHandlers } from './residents'
import { userHandlers } from './users'

type SoftDeletable = { id: number; deleted_at: string | null }

type ResourceConfig<T extends SoftDeletable> = {
  label: string
  path: string
  fixtures: T[]
  handlers: Array<{ info: { method: unknown; path: unknown } }>
  activeId: number
  trashedId: number
}

const resources: ResourceConfig<SoftDeletable>[] = [
  {
    label: 'residents',
    path: '/api/residents',
    fixtures: mockResidents,
    handlers: residentHandlers,
    activeId: 1,
    trashedId: 2,
  },
  {
    label: 'houses',
    path: '/api/houses',
    fixtures: mockHouses,
    handlers: houseHandlers,
    activeId: 1,
    trashedId: 2,
  },
  {
    label: 'due-types',
    path: '/api/due-types',
    fixtures: mockDueTypes,
    handlers: dueTypeHandlers,
    activeId: 1,
    trashedId: 2,
  },
  {
    label: 'bills',
    path: '/api/bills',
    fixtures: mockBills,
    handlers: billHandlers,
    activeId: 1,
    trashedId: 2,
  },
  {
    label: 'payments',
    path: '/api/payments',
    fixtures: mockPayments,
    handlers: paymentHandlers,
    activeId: 1,
    trashedId: 2,
  },
  {
    label: 'expenses',
    path: '/api/expenses',
    fixtures: mockExpenses,
    handlers: expenseHandlers,
    activeId: 1,
    trashedId: 2,
  },
  {
    label: 'expense-categories',
    path: '/api/expense-categories',
    fixtures: mockExpenseCategories,
    handlers: expenseCategoryHandlers,
    activeId: 1,
    trashedId: 2,
  },
  {
    label: 'users',
    path: '/api/users',
    fixtures: mockUsers,
    handlers: userHandlers,
    activeId: 1,
    trashedId: 2,
  },
]

function ids<T extends SoftDeletable>(items: T[]) {
  return items.map((item) => item.id)
}

it('ships active+trashed fixtures and registers restore/force-delete routes for all resources', () => {
  for (const resource of resources) {
    expect(
      ids(applyTrashedFilter(resource.fixtures, null)),
      `${resource.label} default ids`
    ).toEqual([resource.activeId])
    expect(
      ids(applyTrashedFilter(resource.fixtures, 'invalid')),
      `${resource.label} invalid trashed ids`
    ).toEqual([resource.activeId])
    expect(
      ids(applyTrashedFilter(resource.fixtures, 'with')),
      `${resource.label} with trashed ids`
    ).toEqual([resource.activeId, resource.trashedId])
    expect(
      ids(applyTrashedFilter(resource.fixtures, 'only')),
      `${resource.label} only trashed ids`
    ).toEqual([resource.trashedId])

    const routes = resource.handlers.map(
      (handler) => `${String(handler.info.method)} ${String(handler.info.path)}`
    )

    expect(routes, `${resource.label} restore route`).toContain(
      `POST ${resource.path}/:id/restore`
    )
    expect(routes, `${resource.label} force-delete route`).toContain(
      `DELETE ${resource.path}/:id/force-delete`
    )
    expect(routes, `${resource.label} bulk-restore route`).toContain(
      `POST ${resource.path}/bulk-restore`
    )
    expect(routes, `${resource.label} bulk-force-delete route`).toContain(
      `POST ${resource.path}/bulk-force-delete`
    )
  }
})

it('mutates in-memory rows for restore and force-delete flows', () => {
  for (const resource of resources) {
    const collection = structuredClone(resource.fixtures)

    const restored = restoreById(collection, resource.trashedId)
    expect(restored?.deleted_at, `${resource.label} restore clears deleted_at`).toBeNull()
    expect(
      ids(applyTrashedFilter(collection, 'only')),
      `${resource.label} after single restore`
    ).toEqual([])

    softDeleteById(collection, resource.activeId)
    softDeleteById(collection, resource.trashedId)

    expect(
      bulkRestore(collection, [resource.activeId, resource.trashedId]),
      `${resource.label} bulk restore count`
    ).toBe(2)
    expect(
      ids(applyTrashedFilter(collection, 'only')),
      `${resource.label} after bulk restore`
    ).toEqual([])

    softDeleteById(collection, resource.activeId)
    softDeleteById(collection, resource.trashedId)

    expect(
      forceDeleteById(collection, resource.activeId),
      `${resource.label} force delete succeeds`
    ).toBe(true)
    expect(
      ids(applyTrashedFilter(collection, 'with')),
      `${resource.label} after single force delete`
    ).toEqual([resource.trashedId])

    expect(
      bulkForceDelete(collection, [resource.trashedId]),
      `${resource.label} bulk force delete count`
    ).toBe(1)
    expect(
      ids(applyTrashedFilter(collection, 'with')),
      `${resource.label} after bulk force delete`
    ).toEqual([])
  }
})
