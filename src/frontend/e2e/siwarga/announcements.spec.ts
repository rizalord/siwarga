import { test, expect, login, defaultAdmin, uid } from './setup'

test.describe('Pengumuman', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
  })

  test('Admin dapat melihat daftar pengumuman', async ({ page }) => {
    await page.goto('/announcements')
    await expect(
      page.getByRole('heading', { name: 'Pengumuman' })
    ).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('Admin dapat menambah dan menghapus pengumuman', async ({ page }) => {
    const title = `E2E-${uid()}`
    await page.goto('/announcements')
    await page.click('text=Tambah Pengumuman')

    await page.fill('input[name="title"]', title)
    await page.locator('.tiptap[contenteditable="true"]').click()
    await page
      .locator('.tiptap[contenteditable="true"]')
      .fill('Isi pengumuman e2e.')
    await page.click('button[type="submit"]')

    const row = page.locator(`tr:has-text("${title}")`)
    await expect(row).toBeVisible()

    // Hapus lagi agar tidak mengotori data
    await row.getByRole('button', { name: 'Buka menu' }).click()
    await page.click('text=Hapus')
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Hapus' })
      .click()
    await expect(
      page.locator(`tr:has-text("${title}")`)
    ).toHaveCount(0)
  })

  test('Admin dapat mencari pengumuman', async ({ page }) => {
    const title = `Cari-${uid()}`
    await page.goto('/announcements')
    await page.click('text=Tambah Pengumuman')
    await page.fill('input[name="title"]', title)
    await page.locator('.tiptap[contenteditable="true"]').click()
    await page
      .locator('.tiptap[contenteditable="true"]')
      .fill('Materi pencarian e2e.')
    await page.click('button[type="submit"]')
    await expect(page.locator(`tr:has-text("${title}")`)).toBeVisible()

    await page.fill('input[placeholder="Cari pengumuman..."]', title)
    await expect(page.locator(`tr:has-text("${title}")`)).toBeVisible()

    await page.fill('input[placeholder="Cari pengumuman..."]', 'zz-tidak-ada')
    await expect(page.locator('text=Tidak ada data.')).toBeVisible()
  })

  test('Admin dapat memfilter pengumuman per kategori', async ({ page }) => {
    const title = `Keu-${uid()}`
    await page.goto('/announcements')
    await page.click('text=Tambah Pengumuman')
    await page.fill('input[name="title"]', title)
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Keuangan' }).click()
    await page.locator('.tiptap[contenteditable="true"]').click()
    await page
      .locator('.tiptap[contenteditable="true"]')
      .fill('Laporan keuangan e2e.')
    await page.click('button[type="submit"]')
    await expect(page.locator(`tr:has-text("${title}")`)).toBeVisible()

    await page
      .locator('button[aria-haspopup="dialog"]:has-text("Kategori")')
      .click()
    await page.getByRole('option', { name: 'Keuangan' }).click()
    await expect(page.locator(`tr:has-text("${title}")`)).toBeVisible()
  })

  test('Admin dapat mempublish pengumuman ke WhatsApp', async ({ page }) => {
    const title = `Pub-${uid()}`
    await page.goto('/announcements')
    await page.click('text=Tambah Pengumuman')
    await page.fill('input[name="title"]', title)
    await page.locator('.tiptap[contenteditable="true"]').click()
    await page.locator('.tiptap[contenteditable="true"]').fill('Kirim e2e.')
    await page.click('button[type="submit"]')

    const row = page.locator(`tr:has-text("${title}")`)
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Buka menu' }).click()
    await page.click('text=Kirim ke WhatsApp')
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Kirim' })
      .click()

    await expect(
      page.locator('text=Pengumuman sedang dikirim')
    ).toBeVisible()
  })
})
