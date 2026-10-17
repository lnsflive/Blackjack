import { afterEach, describe, expect, test, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { useBlackjackAccount } from '../../app/composables/useBlackjackAccount'
import type { AccountAPI } from '../../app/utils/account-api'
import type { AccountClient } from '../../app/utils/google-auth'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => { for (const scope of scopes.splice(0)) scope.stop() })

function fixture() {
  const api = {
    $get: vi.fn<AccountAPI['$get']>(),
    $post: vi.fn<AccountAPI['$post']>(),
    $put: vi.fn<AccountAPI['$put']>(),
  }
  const storage = { getItem: vi.fn((): string | null => 'test-token'), removeItem: vi.fn() }
  const client: AccountClient = {
    initialize: async () => {}, storageKey: () => 'strapi_jwt',
    startGoogle: async () => 'https://example.com/login', completeGoogle: async () => '/',
  }
  const reload = vi.fn()
  const scope = effectScope()
  scopes.push(scope)
  const account = scope.run(() => useBlackjackAccount({ api, storage, reload, accounts: async () => client }))
  if (!account) throw new Error('Account scope did not initialize')
  return { api, storage, reload, account }
}

const profile = { id: 11, name: 'Returning', bank: '1234' }
const failure = (status: number, code = 'API failure') => ({ response: { status, data: { message: code } } })

describe('shared account composable', () => {
  test('requires a bearer token and omits cookies', () => {
    const { account, storage } = fixture()
    expect(account.authConfig()).toEqual({ headers: { Authorization: 'Bearer test-token' }, withCredentials: false })
    storage.getItem.mockReturnValue(null)
    expect(() => account.authConfig()).toThrow('Sign in required')
  })

  test('restores the signed-in player without writing the initial balance back', async () => {
    const { account, api } = fixture()
    api.$get.mockResolvedValueOnce({ id: 7 }).mockResolvedValueOnce([profile]).mockResolvedValueOnce([])
    await account.loadAccount()
    expect(account.playerName.value).toBe('Returning')
    expect(account.bankAmount.value).toBe(1234)
    expect(account.profileLoaded.value).toBe(true)
    expect(api.$get).toHaveBeenCalledWith('/blackjacks?portfolioUserId=7', expect.anything())
    expect(api.$put).not.toHaveBeenCalled()
    await expect(account.applyProfile({ ...profile, bank: 'invalid' })).rejects.toThrow('Invalid saved')
  })

  test('clears an expired account and gates a missing player', async () => {
    const { account, api } = fixture()
    api.$get.mockRejectedValueOnce(failure(401))
    await account.loadAccount()
    expect(account.user.value).toBeNull()
    expect(account.userID.value).toBeNull()
    api.$get.mockResolvedValueOnce({ id: 7 }).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    await account.loadAccount()
    expect(account.createPlayer.value).toBe(true)
    expect(account.profileLoaded.value).toBe(false)
  })

  test('protects reserved names and restores an existing profile on conflict', async () => {
    const { account, api } = fixture()
    account.tempPlayer.value = 'Reserved'
    api.$post.mockRejectedValueOnce(failure(409, 'name_taken'))
    await account.submitPlayer()
    expect(account.authError.value).toMatch(/reserved/)
    api.$post.mockRejectedValueOnce(failure(409, 'profile_exists'))
    api.$get.mockResolvedValueOnce({ id: 7 }).mockResolvedValueOnce([profile]).mockResolvedValueOnce([])
    await account.submitPlayer()
    expect(account.userID.value).toBe(11)
  })

  test('serializes bank updates and sends only the balance', async () => {
    const { account, api } = fixture()
    api.$get.mockResolvedValueOnce({ id: 7 }).mockResolvedValueOnce([profile]).mockResolvedValue([])
    await account.loadAccount()
    account.bankAmount.value = 800
    await nextTick()
    account.bankAmount.value = 900
    await nextTick()
    await account.waitForSaves()
    expect(api.$put.mock.calls.map(call => call.slice(0, 2))).toEqual([
      ['/blackjacks/11', { bank: 800 }], ['/blackjacks/11', { bank: 900 }],
    ])
  })

  test('removes the shared token even when the logout endpoint is unavailable', async () => {
    const { account, api, storage, reload } = fixture()
    api.$post.mockRejectedValueOnce(failure(404))
    await account.logout()
    expect(storage.removeItem).toHaveBeenCalledWith('strapi_jwt')
    expect(reload).toHaveBeenCalledOnce()
  })
})
