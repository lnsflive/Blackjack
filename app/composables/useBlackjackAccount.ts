import { computed, nextTick, ref, watch } from 'vue'
import { apiFailure, parsePlayer, parsePlayers, parseUser } from '../utils/account-api'
import type { AccountAPI, AccountId, Player, RequestOptions, User } from '../utils/account-api'
import { getAccounts } from '../utils/google-auth'
import type { AccountClient } from '../utils/google-auth'

export interface AccountDependencies {
  api: AccountAPI
  accounts?: () => Promise<AccountClient>
  storage?: Pick<Storage, 'getItem' | 'removeItem'>
  reload?: () => void
}

export function useBlackjackAccount(dependencies: AccountDependencies) {
  const api = dependencies.api
  const accounts = ref<AccountClient | null>(null)
  const user = ref<User | null>(null)
  const userID = ref<AccountId | null>(null)
  const bankAmount = ref(0)
  const playerName = ref<string | null>(null)
  const players = ref<Player[]>([])
  const loading = ref(true)
  const busy = ref(false)
  const authError = ref('')
  const profileLoaded = ref(false)
  const createPlayer = ref(false)
  const endGame = ref(false)
  const tempPlayer = ref('')
  const invalid = computed(() => tempPlayer.value.trim().length < 3 || tempPlayer.value.trim().length > 10)
  let saveQueue = Promise.resolve()
  const storage = () => dependencies.storage ?? localStorage

  function authConfig(): RequestOptions {
    const token = storage().getItem(accounts.value?.storageKey() ?? 'strapi_jwt')
    if (!token) throw Object.assign(new Error('Sign in required'), { response: { status: 401 } })
    return { headers: { Authorization: `Bearer ${token}` }, withCredentials: false }
  }

  async function applyProfile(value: unknown) {
    const profile = parsePlayer(value)
    profileLoaded.value = false
    userID.value = profile.id
    playerName.value = profile.name
    bankAmount.value = profile.bank
    createPlayer.value = false
    endGame.value = true
    await nextTick()
    profileLoaded.value = true
  }

  function handleError(error: unknown) {
    if (apiFailure(error).status === 401) {
      user.value = null
      profileLoaded.value = false
      userID.value = null
      playerName.value = null
      bankAmount.value = 0
      players.value = []
      endGame.value = false
      createPlayer.value = false
      authError.value = 'Please sign in with Google to continue.'
    } else authError.value = 'Unable to load or save your account. Please retry before continuing.'
  }

  async function updateLeaderboard() {
    try { players.value = parsePlayers(await api.$get('/blackjacks?_sort=bank:desc', authConfig())) }
    catch (error) { handleError(error) }
  }

  async function loadAccount() {
    loading.value = true
    authError.value = ''
    try {
      accounts.value = await (dependencies.accounts ?? getAccounts)()
      const currentUser = parseUser(await api.$get('/users/me', authConfig()))
      user.value = currentUser
      const profiles = parsePlayers(await api.$get(`/blackjacks?portfolioUserId=${encodeURIComponent(currentUser.id)}`, authConfig()))
      const profile = profiles[0]
      if (profile) await applyProfile(profile)
      else { profileLoaded.value = false; userID.value = null; createPlayer.value = true }
      await updateLeaderboard()
    } catch (error) { handleError(error) }
    finally { loading.value = false }
  }

  async function submitPlayer() {
    if (invalid.value || busy.value) return
    busy.value = true
    authError.value = ''
    try {
      await applyProfile(await api.$post('/blackjacks', { name: tempPlayer.value.trim() }, authConfig()))
    } catch (error) {
      const failure = apiFailure(error)
      if (failure.status === 409) {
        if (failure.code === 'profile_exists') await loadAccount()
        else authError.value = 'That name is reserved. Choose another name or contact the administrator to migrate your existing player.'
      } else handleError(error)
    } finally { busy.value = false }
  }

  async function logout() {
    busy.value = true
    try {
      await saveQueue
      storage().removeItem(accounts.value?.storageKey() ?? 'strapi_jwt')
      try { await api.$post('/auth/logout', {}, { withCredentials: true }) } catch {}
      ;(dependencies.reload ?? (() => window.location.reload()))()
    } catch (error) { handleError(error) }
    finally { busy.value = false }
  }

  watch(bankAmount, bank => {
    if (!profileLoaded.value || !user.value || userID.value === null) return
    const profileId = userID.value
    saveQueue = saveQueue.then(async () => {
      if (!user.value) return
      try {
        await api.$put(`/blackjacks/${profileId}`, { bank }, authConfig())
        await updateLeaderboard()
      } catch (error) { handleError(error) }
    })
  })

  return {
    user, userID, bankAmount, playerName, players, loading, busy, authError, profileLoaded,
    createPlayer, endGame, tempPlayer, invalid, authConfig, applyProfile, loadAccount,
    submitPlayer, logout, handleError, waitForSaves: () => saveQueue,
  }
}
