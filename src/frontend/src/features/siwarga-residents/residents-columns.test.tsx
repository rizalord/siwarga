import { describe, it, expect } from 'vitest'
import { residentsColumns } from './residents-columns'

describe('residentsColumns', () => {
  it('should have full_name, status, phone_number columns', () => {
    const columns = residentsColumns()
    const columnIds = columns.map((c) => c.id)
    expect(columnIds).toContain('full_name')
    expect(columnIds).toContain('status')
    expect(columnIds).toContain('phone_number')
  })
})
