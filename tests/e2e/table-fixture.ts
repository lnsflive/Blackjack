import type { Page } from '@playwright/test'

export async function prepareTable(page: Page, { seed = 42, bank = 1000 }: { seed?: number; bank?: number } = {}) {
  const savedBalances: number[] = []
  let balance = bank
  await page.addInitScript(({ seed }) => {
    localStorage.setItem('strapi_jwt', 'test-token')
    window.SharedAccounts = {
      create: () => ({ initialize: async () => {}, storageKey: () => 'strapi_jwt', startGoogle: async () => '/', completeGoogle: async () => '/' }),
      mount: () => ({ destroy: () => {} }),
    }
    let state = seed >>> 0
    Math.random = () => {
      state += 0x6d2b79f5
      let value = state
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    }
  }, { seed })
  await page.route('https://api.jaimegonzalezjr.com/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const profile = () => ({ id: 11, name: 'Alex Rivera', bank: balance })
    if (url.pathname === '/users/me') return route.fulfill({ json: { id: 7 } })
    if (url.pathname === '/blackjacks' && url.searchParams.has('portfolioUserId')) return route.fulfill({ json: [profile()] })
    if (url.pathname === '/blackjacks' && request.method() === 'GET') return route.fulfill({ json: [
      { id: 1, name: 'Maya', bank: 18450 }, { id: 2, name: 'Jordan', bank: 12600 },
      { id: 3, name: 'Sam', bank: 8750 }, { id: 4, name: 'Quinn', bank: 6320 }, profile(),
    ] })
    if (url.pathname === '/blackjacks/11' && request.method() === 'PUT') {
      const payload: unknown = JSON.parse(request.postData() ?? '{}')
      if (typeof payload === 'object' && payload !== null && 'bank' in payload && typeof payload.bank === 'number') {
        balance = payload.bank
        savedBalances.push(balance)
      }
      return route.fulfill({ json: profile() })
    }
    return route.fulfill({ json: {} })
  })
  return { savedBalances }
}
