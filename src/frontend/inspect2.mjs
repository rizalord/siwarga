import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath:
    '/home/rizalord/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
})
const page = await browser.newPage({ viewport: { width: 1440, height: 800 } })

await page.goto('http://localhost:5173/sign-in')
await page.fill('#email', 'admin@siwarga.test')
await page.fill('#password', 'password')
await page.click('button[type=submit]')
await page.waitForURL('http://localhost:5173/', { timeout: 10000 })
await page.waitForTimeout(800)

for (const path of ['/residents']) {
  await page.goto(`http://localhost:5173${path}`)
  await page.waitForTimeout(1200)
  const info = await page.evaluate(() => {
    const html = document.documentElement
    const main = document.querySelector('main')
    const lastEl = main?.lastElementChild
    const lastRect = lastEl?.getBoundingClientRect()
    const mainRect = main?.getBoundingClientRect()
    return {
      htmlScrollHeight: html.scrollHeight,
      mainRectBottom: mainRect?.bottom,
      lastElTag: lastEl?.tagName,
      lastElBottom: lastRect?.bottom,
      bodyLastChild: document.body.lastElementChild?.outerHTML?.slice(0, 200),
    }
  })
  console.log(path, JSON.stringify(info, null, 2))
}
await browser.close()
