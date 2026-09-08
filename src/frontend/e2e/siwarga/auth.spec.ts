import { test, expect, login, logout, defaultAdmin } from './setup'

test.describe('Authentication', () => {
  test('Admin dapat login dan melihat dashboard', async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible()
  })

  test('Login gagal dengan kredensial salah', async ({ page }) => {
    await page.goto('/sign-in')
    await page.fill('input[name="email"]', 'wrong@test.com')
    await page.fill('input[name="password"]', 'wrong')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Kredensial tidak valid')).toBeVisible()
  })

  test('Admin dapat logout', async ({ page }) => {
    await login(page, defaultAdmin.email, defaultAdmin.password)
    await logout(page)
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
