import { test as base, type Page } from '@playwright/test'

export const baseURL = 'http://localhost:5173'

export const defaultAdmin = {
  email: 'admin@siwarga.test',
  password: 'password',
}

export const defaultWarga = {
  email: 'warga@siwarga.test',
  password: 'password',
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/sign-in')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
}

export async function logout(page: Page) {
  await page.click('[data-testid="profile-dropdown"]')
  await page.click('text=Keluar')
}

export const test = base.extend<{
  adminPage: Page
  wargaPage: Page
}>({
  adminPage: async ({ browser }, use) => {
    const page = await browser.newPage()
    await login(page, defaultAdmin.email, defaultAdmin.password)
    await use(page)
  },
  wargaPage: async ({ browser }, use) => {
    const page = await browser.newPage()
    await login(page, defaultWarga.email, defaultWarga.password)
    await use(page)
  },
})

export { expect } from '@playwright/test'
