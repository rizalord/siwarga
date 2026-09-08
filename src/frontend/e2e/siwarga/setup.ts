import {
  test as base,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

export const baseURL = 'http://localhost:5173'

export const apiBaseURL = 'http://localhost:8000'

// ID unik pendek untuk data e2e (aman dari tabrakan antar worker paralel)
export function uid(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}

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
  // Tombol avatar adalah menu terakhir di header (setelah Ganti tema)
  await page.locator('header button[aria-haspopup="menu"]').last().click()
  await page.getByRole('menuitem', { name: 'Keluar' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Keluar' })
    .click()
}

export async function apiToken(
  request: APIRequestContext,
  email: string = defaultAdmin.email,
  password: string = defaultAdmin.password
): Promise<string> {
  const res = await request.post(`${apiBaseURL}/api/auth/login`, {
    data: { email, password },
  })
  if (!res.ok()) {
    throw new Error(`API login failed: ${res.status()} ${await res.text()}`)
  }
  const body = await res.json()
  return body.data.token as string
}

export async function apiPost(
  request: APIRequestContext,
  token: string,
  path: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await request.post(`${apiBaseURL}${path}`, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok()) {
    throw new Error(
      `POST ${path} failed: ${res.status()} ${await res.text()}`
    )
  }
  const body = await res.json()
  return body.data as Record<string, unknown>
}

export async function apiGet(
  request: APIRequestContext,
  token: string,
  path: string
): Promise<unknown> {
  const res = await request.get(`${apiBaseURL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok()) {
    throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`)
  }
  return res.json()
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
