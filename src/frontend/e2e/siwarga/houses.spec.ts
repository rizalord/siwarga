import { test, expect, login, defaultAdmin, apiToken, apiPost, uid } from './setup'

test.describe('Manajemen Rumah', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
  })

  test('Admin dapat melihat daftar rumah', async ({ page }) => {
    await page.goto('/houses')
    await expect(
      page.getByRole('heading', { name: 'Data Rumah' })
    ).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('Admin dapat menambah rumah', async ({ page }) => {
    const number = `E2E-${uid().toString().slice(-8)}`
    await page.goto('/houses')
    await page.click('text=Tambah Rumah')

    await page.fill('input[name="house_number"]', number)
    await page.fill('textarea[name="address"]', 'Jl. E2E No. 1')
    await page.click('button[type="submit"]')

    await expect(page.locator(`tr:has-text("${number}")`)).toBeVisible()
  })

  test('Admin dapat menugaskan penghuni ke rumah', async ({
    page,
    request,
  }) => {
    // Data dibuat via API agar test mandiri
    const token = await apiToken(request)
    const id = uid()
    await apiPost(request, token, '/api/houses', {
      house_number: `E2E-H${id}`,
      address: 'Jl. E2E',
    })
    const residentName = `E2E Penghuni ${id}`
    await apiPost(request, token, '/api/residents', {
      full_name: residentName,
      status: 'tetap',
      phone_number: `08${Date.now().toString().slice(-10)}`,
      marital_status: 'belum_menikah',
    })

    await page.goto('/houses')
    const row = page.locator(`tr:has-text("E2E-H${id}")`)
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Buka menu' }).click()
    await page.click('text=Tugaskan')

    await page.getByRole('combobox').click()
    await page.fill('input[placeholder="Cari penghuni..."]', residentName)
    await page.getByRole('option', { name: residentName }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Tugaskan', exact: true })
      .click()

    await expect(
      page.locator(`tr:has-text("E2E-H${id}")`).locator(`text=${residentName}`)
    ).toBeVisible()
  })
})
