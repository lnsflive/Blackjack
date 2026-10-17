import { expect, test } from '@playwright/test'

test('loads the Blackjack application', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveTitle('BlackJack')
  await expect(page.getByText('Blackjack', { exact: true }).first()).toBeVisible()
})

test('shows the disclosed casino rules for an authenticated player', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('strapi_jwt', 'test-token')
    window.SharedAccounts = {
      create: () => ({ initialize: async () => {}, storageKey: () => 'strapi_jwt', startGoogle: async () => '/', completeGoogle: async () => '/' }),
      mount: () => ({ destroy: () => {} }),
    }
  })
  await page.route('https://api.jaimegonzalezjr.com/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/users/me') return route.fulfill({ json: { id: 7 } })
    if (url.pathname === '/blackjacks' && url.searchParams.has('portfolioUserId')) return route.fulfill({ json: [{ id: 11, name: 'Tester', bank: 1000 }] })
    if (url.pathname === '/blackjacks' && route.request().method() === 'GET') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('6 decks · dealer stands on soft 17 · blackjack pays 3:2 · DAS · late surrender')).toBeVisible()
  await expect(page.getByText('Place your wager')).toBeVisible()
  await page.getByRole('button', { name: '$10', exact: true }).click()
  await page.getByRole('button', { name: 'Deal $10', exact: true }).click()
  await expect(page.locator('section[aria-label="Player hands"] .playing-card')).toHaveCount(2)
  await expect(page.locator('section[aria-label="Dealer hand"] .playing-card')).toHaveCount(2)
})
