import { expect, test } from '@playwright/test'

test('loads the Blackjack application', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveTitle('BlackJack')
  await expect(page.getByText('Blackjack', { exact: true }).first()).toBeVisible()
})
