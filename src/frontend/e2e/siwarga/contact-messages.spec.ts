import { test, expect, login, defaultAdmin, uid } from './setup'

test.describe('Pesan Kontak', () => {
  test('Pesan dari formulir kontak masuk sebagai Baru lalu terbaca', async ({
    page,
    request,
  }) => {
    const name = `E2E Kontak ${uid()}`
    const body = `Halo, ini pesan e2e ${uid()}.`

    // Simulasi submit formulir kontak landing page via public API
    const res = await request.post(
      'http://localhost:8000/api/public/contact',
      {
        data: {
          name,
          email: 'e2e@siwarga.test',
          message: body,
        },
      }
    )
    expect(res.status()).toBe(201)

    await login(page, defaultAdmin.email, defaultAdmin.password)
    await page.goto('/contact-messages')

    const row = page.locator(`tr:has-text("${name}")`)
    await expect(row).toBeVisible()
    await expect(row.locator('text=Baru')).toBeVisible()

    // Buka detail → otomatis ditandai dibaca
    await row.locator(`button:has-text("${name}")`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator(`text=${body}`)).toBeVisible()

    // Tunggu mutasi mark-read selesai (badge flip) sebelum reload
    await expect(row.locator('text=Dibaca')).toBeVisible()

    await page.reload()
    const reloadedRow = page.locator(`tr:has-text("${name}")`)
    await expect(reloadedRow).toBeVisible()
    await expect(reloadedRow.locator('text=Dibaca')).toBeVisible()
  })
})
