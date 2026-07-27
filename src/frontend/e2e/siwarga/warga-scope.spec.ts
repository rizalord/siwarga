import { test, expect, login, defaultWarga } from './setup'

test.describe('Warga Scope', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, defaultWarga.email, defaultWarga.password)
  })

  test('Warga hanya melihat tagihan sendiri', async ({ page }) => {
    await page.goto('/bills')
    await expect(page.locator('table')).toBeVisible()

    // Warga hanya melihat tagihan rumahnya sendiri
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // Cek tidak ada aksi untuk menghapus atau generate
    await expect(page.locator('text=Generate Tagihan')).not.toBeVisible()
    await expect(page.locator('button[aria-label="Open menu"]')).not.toBeVisible()
  })

  test('Warga tidak bisa akses halaman administrasi', async ({ page }) => {
    await page.goto('/residents')
    await expect(page.locator('text=Akses Ditolak')).toBeVisible()

    await page.goto('/houses')
    await expect(page.locator('text=Akses Ditolak')).toBeVisible()

    await page.goto('/users')
    await expect(page.locator('text=Akses Ditolak')).toBeVisible()
  })

  test('Warga bisa lihat dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
})
