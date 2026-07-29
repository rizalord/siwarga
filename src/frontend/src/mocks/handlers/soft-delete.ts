type SoftDeletable = { id: number; deleted_at: string | null }

function now() {
  return new Date().toISOString()
}

export function applyTrashedFilter<T extends SoftDeletable>(
  items: T[],
  trashed: string | null
) {
  if (trashed === 'with') {
    return [...items]
  }

  if (trashed === 'only') {
    return items.filter((item) => item.deleted_at !== null)
  }

  return items.filter((item) => item.deleted_at === null)
}

export function buildPaginatedResponse<T>(items: T[]) {
  return {
    data: items,
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: items.length,
  }
}

export function softDeleteById<T extends SoftDeletable>(items: T[], id: number) {
  const item = items.find((entry) => entry.id === id)
  if (!item) {
    return null
  }

  item.deleted_at = now()
  return item
}

export function restoreById<T extends SoftDeletable>(items: T[], id: number) {
  const item = items.find((entry) => entry.id === id)
  if (!item) {
    return null
  }

  item.deleted_at = null
  return item
}

export function forceDeleteById<T extends SoftDeletable>(items: T[], id: number) {
  const index = items.findIndex((entry) => entry.id === id)
  if (index === -1) {
    return false
  }

  items.splice(index, 1)
  return true
}

export function bulkSoftDelete<T extends SoftDeletable>(items: T[], ids: number[]) {
  let deleted = 0

  for (const id of ids) {
    const item = items.find((entry) => entry.id === id)
    if (!item || item.deleted_at !== null) {
      continue
    }

    item.deleted_at = now()
    deleted++
  }

  return deleted
}

export function bulkRestore<T extends SoftDeletable>(items: T[], ids: number[]) {
  let restored = 0

  for (const id of ids) {
    const item = items.find((entry) => entry.id === id)
    if (!item || item.deleted_at === null) {
      continue
    }

    item.deleted_at = null
    restored++
  }

  return restored
}

export function bulkForceDelete<T extends SoftDeletable>(
  items: T[],
  ids: number[]
) {
  let deleted = 0

  for (const id of ids) {
    if (forceDeleteById(items, id)) {
      deleted++
    }
  }

  return deleted
}

export async function readIds(request: Request) {
  const body = (await request.json()) as { ids?: number[] }
  return Array.isArray(body.ids) ? body.ids.map(Number) : []
}
