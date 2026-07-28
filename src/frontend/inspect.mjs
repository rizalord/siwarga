import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath:
    '/home/rizalord/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
})
const page = await browser.newPage({ viewport: { width: 1440, height: 700 } })
await page.setViewportSize({ width: 1440, height: 700 })

await page.goto('http://localhost:5173/sign-in')
await page.fill('#email', 'admin@siwarga.test')
await page.fill('#password', 'password')
await page.click('button[type=submit]')
await page.waitForURL('http://localhost:5173/', { timeout: 10000 })
await page.waitForTimeout(1000)

for (const path of ['/', '/residents', '/houses', '/bills']) {
  await page.goto(`http://localhost:5173${path}`)
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => {
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')
    const main = document.querySelector('main')
    return {
      url: location.pathname,
      htmlScrollHeight: html.scrollHeight,
      htmlClientHeight: html.clientHeight,
      bodyScrollHeight: body.scrollHeight,
      rootHeight: root?.getBoundingClientRect().height,
      mainHeight: main?.getBoundingClientRect().height,
      mainScrollHeight: main?.scrollHeight,
      windowInnerHeight: window.innerHeight,
    }
  })
  console.log(JSON.stringify(info, null, 2))
  await page.screenshot({ path: `/tmp/claude-1000/-home-rizalord-Projects-personal-siwarga/46fc82d3-2425-45b1-adba-5c9246ef9db2/scratchpad/page-${path.replace('/', 'root')}.png`, fullPage: true })
}

await browser.close()
