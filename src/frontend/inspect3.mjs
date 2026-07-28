import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath:
    '/home/rizalord/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
})
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

await page.goto('http://localhost:5173/sign-in')
await page.fill('#email', 'admin@siwarga.test')
await page.fill('#password', 'password')
await page.click('button[type=submit]')
await page.waitForURL('http://localhost:5173/', { timeout: 10000 })
await page.waitForTimeout(800)

const paths = ['/residents', '/houses', '/bills', '/payments', '/expenses', '/due-types', '/reports', '/users']
for (const path of paths) {
  await page.goto(`http://localhost:5173${path}`)
  await page.waitForTimeout(1200)
  const info = await page.evaluate(() => {
    const html = document.documentElement
    return {
      scrollHeight: html.scrollHeight,
      clientHeight: html.clientHeight,
      overflow: html.scrollHeight - html.clientHeight,
    }
  })
  console.log(path, JSON.stringify(info))
}
await browser.close()
