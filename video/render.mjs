// Renderiza el video cuadro a cuadro: node video/render.mjs [--times 3,8,12] | [--fps 30]
import { chromium } from 'playwright'
import { pathToFileURL, fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const get = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const out = get('--out', path.join(dir, 'frames'))
const fps = +get('--fps', 30)
const workers = +get('--workers', 4)
const times = get('--times', null)?.split(',').map(Number)
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined })
const open = async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(pathToFileURL(path.join(dir, 'index.html')).href)
  await page.evaluate(() => window.ready)
  return page
}

if (times) {
  const page = await open()
  for (const t of times) {
    await page.evaluate((x) => window.seek(x), t)
    await page.screenshot({ path: path.join(out, `t${String(t).replace('.', '_')}.jpg`), type: 'jpeg', quality: 88 })
  }
} else {
  const probe = await open()
  const total = Math.round((await probe.evaluate(() => window.DURATION)) * fps)
  await probe.close()
  let next = 0
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await open()
    for (;;) {
      const i = next++
      if (i >= total) break
      await page.evaluate((t) => window.seek(t), i / fps)
      await page.screenshot({ path: path.join(out, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 })
    }
  }))
  console.log('frames:', total)
}
await browser.close()
