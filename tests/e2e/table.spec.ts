import { expect, test } from '@playwright/test'
import { prepareTable } from './table-fixture'

test('opens a seat on the table for a signed-out player', async ({ page }) => {
  await page.route('**/auth/client.v1.js', route => route.abort())
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveTitle('BlackJack')
  await expect(page.getByRole('heading', { name: 'Blackjack', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your seat is waiting' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('previews chips without saving, then deducts the wager on Deal', async ({ page }) => {
  const { savedBalances } = await prepareTable(page)
  await page.goto('/')
  const chips = page.getByRole('group', { name: 'Betting chips' })
  await expect(page.getByTestId('bank-balance')).toHaveText('$1,000')
  await chips.getByRole('button', { name: 'Add $10 to wager', exact: true }).click()
  await chips.getByRole('button', { name: 'Add $10 to wager', exact: true }).click()
  await expect(page.getByTestId('wager-amount')).toHaveText('$20')
  await expect(page.getByTestId('bank-balance')).toHaveText('$1,000')
  expect(savedBalances).toEqual([])
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.getByTestId('wager-amount')).toHaveText('$0')
  expect(savedBalances).toEqual([])
  await chips.getByRole('button', { name: 'Add $20 to wager', exact: true }).click()
  await page.getByRole('button', { name: 'Deal $20', exact: true }).click()
  await expect(page.getByTestId('bank-balance')).toHaveText('$980')
  await expect.poll(() => savedBalances).toEqual([980])
  await expect(page.getByRole('button', { name: 'Hit', exact: true })).toBeVisible()
  await expect(chips.getByRole('button', { name: 'Add $10 to wager', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Stand', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('You lose $20')
  await expect(page.getByRole('button', { name: 'Deal $20', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('bounds chip selection and disables additional wagers when the bank is empty', async ({ page }) => {
  await prepareTable(page, { bank: 10 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add $10 to wager', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add $10 to wager', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Add $20 to wager', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Deal $10', exact: true }).click()
  await expect(page.getByTestId('bank-balance')).toHaveText('$0')
  await expect(page.getByRole('button', { name: 'Double', exact: true })).toBeDisabled()
})

for (const viewport of [
  { name: 'phone', width: 390, height: 844, screenshot: 'ss3.png', seed: 42 },
  { name: 'tablet', width: 1024, height: 900, screenshot: 'ss2.png', seed: 145 },
  { name: 'desktop', width: 1440, height: 960, screenshot: 'ss1.png', seed: 6 },
  { name: 'small phone', width: 320, height: 740, screenshot: null, seed: 42 },
]) {
  test(viewport.name + ' keeps the game on the table with usable controls', async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await prepareTable(page, { seed: viewport.seed })
    await page.goto('/')
    await page.getByRole('button', { name: 'Add $50 to wager', exact: true }).click()
    await page.getByRole('button', { name: 'Deal $50', exact: true }).click()
    if (viewport.seed === 145) await page.getByRole('button', { name: 'Split', exact: true }).click()
    await expect(page.getByRole('group', { name: 'Hand actions' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    if (viewport.width < 1024) {
      const toggle = page.getByRole('button', { name: 'Leaderboard' })
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await toggle.click()
      await expect(page.getByText('Maya', { exact: true })).toBeVisible()
      await toggle.click()
    } else await expect(page.getByText('Maya', { exact: true })).toBeVisible()
    if (viewport.name === 'desktop') {
      await page.getByRole('button', { name: 'Stand', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('You win $50')
      await expect(page.getByRole('button', { name: 'Deal $50', exact: true })).toBeVisible()
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
    for (const button of await page.locator('.table-button, .casino-chip').all()) {
      const bounds = await button.boundingBox()
      expect(bounds?.height).toBeGreaterThanOrEqual(44)
      expect(bounds?.width).toBeGreaterThanOrEqual(44)
    }
    if (process.env.UPDATE_REPO_SCREENSHOTS === '1' && viewport.screenshot) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: 'static/img/' + viewport.screenshot, fullPage: true, animations: 'disabled' })
    }
  })
}

test('resplits to four hands without covering the active hand', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await prepareTable(page, { seed: 145 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add $50 to wager', exact: true }).click()
  await page.getByRole('button', { name: 'Deal $50', exact: true }).click()
  await page.getByRole('button', { name: 'Split', exact: true }).click()
  await page.getByRole('button', { name: 'Stand', exact: true }).click()
  await page.getByRole('button', { name: 'Split', exact: true }).click()
  await page.getByRole('button', { name: 'Split', exact: true }).click()
  await expect(page.locator('.player-hand')).toHaveCount(4)
  await expect(page.getByRole('article', { name: 'Hand 2', exact: true })).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('button', { name: 'Split', exact: true })).toHaveCount(0)
  await expect(page.getByTestId('bank-balance')).toHaveText('$800')
  const handBounds = await page.locator('.player-hand').evaluateAll(elements => elements.map(element => ({ top: element.getBoundingClientRect().top, left: element.getBoundingClientRect().left })))
  expect(new Set(handBounds.map(bounds => bounds.top)).size).toBe(1)
  expect(new Set(handBounds.map(bounds => bounds.left)).size).toBe(4)
  if (process.env.UPDATE_REPO_SCREENSHOTS === '1') await page.screenshot({ path: 'static/img/ss4.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  await expect(page.getByRole('button', { name: 'Hit', exact: true })).toBeVisible()
})
