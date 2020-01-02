import os from 'os'
import fs from 'fs'
import path from 'path'
import http from 'http'
import url from 'url'
import puppeteer from 'puppeteer-core'
import {wait, generateId} from './utils'
import './init'

http.createServer(async(request, response) => {
  const requestMethod = request.method
  const requestUrl = request.url ?? ''
  if (requestMethod === 'GET' && requestUrl.startsWith('/screenshoot')) {
    const query = url.parse(requestUrl, true).query
    const { type = 'image', width = '800', height = '600', wait: waitms = '0', filename = '' } = query
    const sourceUrl = decodeURIComponent(query.url as string)
    let filepath: string
    let fileId: string
    switch (type) {
      case 'image': {
        fileId = generateId() + '.png'
        filepath = path.resolve(__dirname, `../out/image/${fileId}`)
        break
      }
      case 'pdf': {
        fileId = generateId() + '.pdf'
        filepath = path.resolve(__dirname, `../out/pdf/${fileId}`)
        break
      }
      default: {
        response.writeHead(400)
        response.write(`不支持该类型[${type}]`)
        response.end()
        return
      }
    }
    await screenshoot(sourceUrl, filepath, { width: +width, height: +height, type, waitms: +waitms })
    // 定时删除
    setTimeout(() => {
      fs.unlink(filepath, (error) => {
        if (error) {
          console.error(error)
        }
      })
    }, 1 * 60 * 1000)
    response.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=${filename || fileId}`,
    })
    const readStream = fs.createReadStream(filepath)
    readStream.on('open', () => {
      readStream.pipe(response)
    })
    readStream.on('error', (err) => {
      response.end(err)
    })
  } else {
    response.writeHead(404).end()
  }
}).listen(3000)

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
