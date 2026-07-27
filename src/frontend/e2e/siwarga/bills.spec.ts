import { test, expect, login, defaultAdmin } from './setup'

test.describe('Tagihan & Pembayaran', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
  })

  test('Admin dapat generate tagihan', async ({ page }) => {
    await page.goto('/bills')
    await page.click('text=Generate Tagihan')

    // Pilih bulan dan tahun
    await page.selectOption('select[name="month"]', '7')
    await page.selectOption('select[name="year"]', '2026')
    await page.click('button:has-text("Generate")')

    await expect(page.locator('text=Tagihan berhasil digenerate')).toBeVisible()
    await expect(page.locator('text=belum_lunas')).toBeVisible()
  })

  test('Admin dapat catat pembayaran', async ({ page }) => {
    await page.goto('/bills')

    // Cari tagihan yang belum lunas
    const row = page.locator('tr:has-text("belum_lunas")')
    await row.locator('text=Bayar').click()

    await page.fill('input[name="amount_paid"]', '100000')
    await page.fill('input[name="payment_date"]', '2026-07-15')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Pembayaran berhasil dicatat')).toBeVisible()
    await expect(page.locator('text=lunas')).toBeVisible()
  })
})
