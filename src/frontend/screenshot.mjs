import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto('http://localhost:5175/sign-in')
await page.fill('input[name="email"]', 'admin@siwarga.test')
await page.fill('input[name="password"]', 'password')
await page.click('button[type="submit"]')
await page.waitForURL('http://localhost:5175/', { timeout: 15000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: '/tmp/claude-1000/-home-rizalord-Projects-personal-siwarga/b392f849-43b0-47cf-a812-62d7c274c3e3/scratchpad/dashboard.png', fullPage: true })

await page.goto('http://localhost:5175/reports')
await page.waitForTimeout(1500)
await page.screenshot({ path: '/tmp/claude-1000/-home-rizalord-Projects-personal-siwarga/b392f849-43b0-47cf-a812-62d7c274c3e3/scratchpad/reports.png', fullPage: true })

await browser.close()
console.log('done')
