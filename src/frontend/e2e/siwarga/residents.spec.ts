import { test, expect, login, defaultAdmin } from './setup'

test.describe('Manajemen Penghuni', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
  })

  test('Admin dapat melihat daftar penghuni', async ({ page }) => {
    await page.goto('/residents')
    await expect(page.locator('text=Penghuni')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('Admin dapat menambah penghuni', async ({ page }) => {
    await page.goto('/residents')
    await page.click('text=Tambah Penghuni')

    await page.fill('input[name="full_name"]', 'E2E Test Resident')
    await page.click('input[value="tetap"]')
    await page.fill('input[name="phone_number"]', '081234567890')
    await page.click('input[value="menikah"]')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=E2E Test Resident')).toBeVisible()
  })

  test('Admin dapat menghapus penghuni', async ({ page }) => {
    await page.goto('/residents')
    // Cari row dengan nama E2E Test Resident
    const row = page.locator('tr:has-text("E2E Test Resident")')
    await row.locator('button[aria-label="Open menu"]').click()
    await page.click('text=Hapus')
    await page.click('button:has-text("Hapus")')

    await expect(page.locator('text=E2E Test Resident')).not.toBeVisible()
  })
})
