import { test, expect, login, defaultAdmin } from './setup'

test.describe('Manajemen Rumah', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
  })

  test('Admin dapat melihat daftar rumah', async ({ page }) => {
    await page.goto('/houses')
    await expect(page.locator('text=Rumah')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('Admin dapat menambah rumah', async ({ page }) => {
    await page.goto('/houses')
    await page.click('text=Tambah Rumah')

    await page.fill('input[name="house_number"]', 'E2E-01')
    await page.fill('input[name="address"]', 'Jl. E2E No. 1')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=E2E-01')).toBeVisible()
  })

  test('Admin dapat assign penghuni ke rumah', async ({ page }) => {
    // Tambah resident dulu
    await page.goto('/residents')
    await page.click('text=Tambah Penghuni')
    await page.fill('input[name="full_name"]', 'Assign Test Resident')
    await page.click('input[value="tetap"]')
    await page.fill('input[name="phone_number"]', '081234567891')
    await page.click('input[value="belum_menikah"]')
    await page.click('button[type="submit"]')

    // Assign ke rumah
    await page.goto('/houses')
    const row = page.locator('tr:has-text("E2E-01")')
    await row.locator('button[aria-label="Open menu"]').click()
    await page.click('text=Assign Penghuni')

    await page.click('[data-testid="resident-select"]')
    await page.fill('[data-testid="resident-search"]', 'Assign Test Resident')
    await page.click('text=Assign Test Resident')

    await page.fill('input[name="start_date"]', '2026-07-01')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Assign Test Resident')).toBeVisible()
  })
})
