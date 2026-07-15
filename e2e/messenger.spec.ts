import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel(/email/i).fill('anna@example.com')
  await page.getByLabel(/пароль/i).fill('secret123')
  await page.getByRole('button', { name: 'Увійти' }).click()
  await expect(page.getByText('Expedition Workspace')).toBeVisible()
}

test('login shows workspace with channels', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'general' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'design' })).toBeVisible()
})

test('selecting a channel and sending a message shows it optimistically', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'design' }).click()

  const text = `e2e message ${Date.now()}`
  await page.getByPlaceholder('Напишіть повідомлення...').fill(text)
  await page.keyboard.press('Enter')

  await expect(page.getByText(text)).toBeVisible()
})

test('starting a DM via user search', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Почати бесіду' }).click()

  await page.getByPlaceholder("Введіть ім'я...").fill('Ihor')
  const dmResult = page.locator('.dm-user-item', { hasText: 'Ihor Franko' })
  await expect(dmResult).toBeVisible()
  await dmResult.click()

  // The DM channel appears in the sidebar as a channel-item button and becomes active.
  await expect(page.getByRole('button', { name: 'Ihor Franko' })).toBeVisible()
})

test('Ctrl+K search finds a message and jumping to it highlights it', async ({ page }) => {
  await login(page)

  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Пошук повідомлень…').fill('повідомлення #100')

  const result = page.getByRole('button', { name: /повідомлення #100/ }).first()
  await expect(result).toBeVisible()
  await result.click()

  await expect(page.locator('.msg-highlighted')).toBeVisible()
})

test('429 on search shows the rate-limit cooldown copy', async ({ page }) => {
  await login(page)

  // MSW resolves mocked responses entirely inside the Service Worker, so they never
  // reach the browser's network stack and `page.route()` cannot intercept them. Use
  // MSW's own runtime-override mechanism (exposed on window by src/mocks/browser.ts)
  // to simulate a 429 from the search endpoint instead.
  await page.evaluate(() => {
    const { worker, http, HttpResponse } = window.__msw!
    worker.use(
      http.get('*/api/search/messages', () =>
        HttpResponse.json({}, { status: 429, headers: { 'retry-after': '7' } }),
      ),
    )
  })

  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Пошук повідомлень…').fill('щось')

  await expect(page.getByText('Забагато запитів пошуку. Повторіть через 7 с.')).toBeVisible()
})
