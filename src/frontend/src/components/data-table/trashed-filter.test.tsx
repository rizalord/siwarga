import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { TrashedFilter } from './trashed-filter'

describe('TrashedFilter', () => {
  it('renders the default label and all filter options', async () => {
    const { getByRole, getByText } = await render(
      <TrashedFilter value={undefined} onChange={vi.fn()} />
    )

    await expect
      .element(getByText('Tanpa Data Terhapus'))
      .toBeInTheDocument()

    await expect
      .element(getByRole('combobox', { name: 'Filter data terhapus' }))
      .toBeInTheDocument()

    await userEvent.click(getByRole('combobox', { name: 'Filter data terhapus' }))

    await expect
      .element(getByRole('option', { name: 'Tanpa Data Terhapus' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('option', { name: 'Termasuk Data Terhapus' }))
      .toBeInTheDocument()
    await expect
      .element(getByRole('option', { name: 'Hanya Data Terhapus' }))
      .toBeInTheDocument()
  })

  it('calls onChange with the selected trash filter', async () => {
    const onChange = vi.fn()
    const { getByRole, getByText } = await render(
      <TrashedFilter value={undefined} onChange={onChange} />
    )

    await userEvent.click(getByRole('combobox', { name: 'Filter data terhapus' }))
    await userEvent.click(getByText('Termasuk Data Terhapus'))

    expect(onChange).toHaveBeenCalledWith('with')
  })

  it('maps the default option back to undefined', async () => {
    const onChange = vi.fn()
    const { getByRole, getByText } = await render(
      <TrashedFilter value='with' onChange={onChange} />
    )

    await userEvent.click(getByRole('combobox', { name: 'Filter data terhapus' }))
    await userEvent.click(getByText('Tanpa Data Terhapus'))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
