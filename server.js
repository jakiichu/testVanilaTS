import fs from 'node:fs/promises'
import express from 'express'
import TelegramBot from "node-telegram-bot-api";
const token = '7167139865:AAGwwKqo5wteQbq_kVV6n6GD1CnBV9Iq9Ek';
const bot = new TelegramBot(token, {polling: true});

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5173
const base = process.env.BASE || '/'

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : ''
const ssrManifest = isProduction
  ? await fs.readFile('./dist/client/.vite/ssr-manifest.json', 'utf-8')
  : undefined

// Create http server
const app = express()

// Add Vite or respective production middlewares
let vite
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./dist/client', { extensions: [] }))
}

// Serve HTML
app.use('*', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '')

    let template
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
    } else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    }

    const rendered = await render(url, ssrManifest)

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '')

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
})

// Start http server

function doSomethingAtSpecificTime(hours, minutes) {
  console.log(1050939750)
      //Это айдишник пользователя узнать его можно через первое сообщение
  void bot.sendMessage(1050939750, `уведа на ${hours}:${minutes}! Time to do something!`);
}

const asd = (targetHours, targetMinutes) => {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  let delayInMs;

  if (currentHours < targetHours || (currentHours === targetHours && currentMinutes < targetMinutes)) {
    const targetTimeToday = new Date(now);
    targetTimeToday.setHours(targetHours, targetMinutes, 0, 0);
    delayInMs = targetTimeToday - now;
  } else {
    const targetTimeTomorrow = new Date(now);
    targetTimeTomorrow.setDate(targetTimeTomorrow.getDate() + 1);
    targetTimeTomorrow.setHours(targetHours, targetMinutes, 0, 0);
    delayInMs = targetTimeTomorrow - now;
  }
  console.log(delayInMs)
  setTimeout(() => {
    doSomethingAtSpecificTime(targetHours, targetMinutes);
  }, delayInMs);
}

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)

  asd(17,25)

  bot.on('text', (msg) => {
    console.log('qwe')
    console.log(msg)
    const chatId = msg.chat.id;
    void bot.sendMessage(chatId, 'Received your message');
  });
})
