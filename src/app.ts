import os from 'os'
import fs from 'fs'
import Koa from 'koa'
import puppeteer from 'puppeteer-core'
import path from 'path'
import serve from 'koa-static'
import { v4 as uuid } from 'uuid'
import './init'

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

const app = new Koa()
app.use(serve(path.join(__dirname, '../out')))
app.use(async (ctx, next) => {
  if (ctx.method === 'GET' && ctx.url.startsWith('/screenshoot')) {
    const url = decodeURIComponent(ctx.query.url)
    const { type = 'image', width, height, wait: waitms = 0, filename = '' } = ctx.query
    let filepath: string
    let fileId: string
    switch (type) {
      case 'image': {
        fileId = uuid() + '.png'
        filepath = path.resolve(__dirname, `../out/image/${fileId}`)
        break
      }
      case 'pdf': {
        fileId = uuid() + '.pdf'
        filepath = path.resolve(__dirname, `../out/pdf/${fileId}`)
        break
      }
      default: {
        ctx.body = {
          code: '1',
          message: `不支持该类型[${type}]`,
          data: null,
        }
        return
      }
    }
    await screenshoot(url, filepath, { width, height, type, waitms })
    // 定时删除
    setTimeout(() => {
      fs.unlink(filepath, (error) => {
        if (error) {
          console.error(error)
        }
      })
    }, 1 * 60 * 1000)
    ctx.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=${filename || fileId}`,
    })
    ctx.body = fs.createReadStream(filepath)
  } else {
    ctx.status = 404
  }
})

app.listen(3000, () => {
  console.log('http://localhost:3000')
})

async function screenshoot(url: string, filename: string, {
  width = 800,
  height = 600,
  type = 'image',
  waitms = 0
} = {
    width: 800,
    height: 600,
    type: 'image',
    waitms: 0
  }) {
  const isLinux = os.platform() === 'linux'
  const chromePath = isLinux ? '../chrome/chrome-linux/chrome' : '../chrome/chrome-win/chrome.exe'
  const executablePath = path.resolve(__dirname, chromePath)
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox'],
    ignoreDefaultArgs: ['--disable-extensions', '--disable-setuid-sandbox'],
    defaultViewport: {
      width,
      height
    }
  })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: ['networkidle0'] })
  await wait(waitms)
  if (type === 'image') {
    await page.screenshot({ fullPage: true, path: filename, type: 'png' })
  }
  if (type === 'pdf') {
    await page.pdf({ path: filename })
  }
  await browser.close()
}
