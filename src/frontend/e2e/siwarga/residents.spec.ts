import { test, expect, login, defaultAdmin, apiToken, apiPost, uid } from './setup'

test.describe('Manajemen Penghuni', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
  })

  test('Admin dapat melihat daftar penghuni', async ({ page }) => {
    await page.goto('/residents')
    await expect(
      page.getByRole('heading', { name: 'Data Penghuni' })
    ).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('Admin dapat menambah penghuni', async ({ page }) => {
    const name = `E2E Res ${uid()}`
    await page.goto('/residents')
    await page.click('text=Tambah Penghuni')

    await page.fill('input[name="full_name"]', name)
    await page.click('button[value="tetap"]')
    await page.fill(
      'input[name="phone_number"]',
      `08${uid().toString().slice(-10)}`
    )
    await page.click('button[value="belum_menikah"]')
    await page.click('button[type="submit"]')

    await expect(page.locator(`tr:has-text("${name}")`)).toBeVisible()
  })

  test('Admin dapat menghapus penghuni', async ({ page, request }) => {
    // Data dibuat via API agar test mandiri
    const token = await apiToken(request)
    const name = `E2E Del ${uid()}`
    await apiPost(request, token, '/api/residents', {
      full_name: name,
      status: 'tetap',
      phone_number: `08${uid().toString().slice(-10)}`,
      marital_status: 'belum_menikah',
    })

    await page.goto('/residents')
    const row = page.locator(`tr:has-text("${name}")`)
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Buka menu' }).click()
    await page.getByRole('menuitem', { name: 'Hapus' }).click()
    // Dialog hapus butuh ketik nama persis sebagai konfirmasi
    const dialog = page.getByRole('alertdialog')
    await dialog.locator('input').fill(name)
    await dialog.getByRole('button', { name: 'Hapus' }).click()

    await expect(page.locator(`tr:has-text("${name}")`)).toHaveCount(0)
  })
})
