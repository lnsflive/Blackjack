export interface AccountClient {
  initialize(): Promise<void>
  storageKey(): string
  startGoogle(): Promise<string>
  completeGoogle(search: string): Promise<string>
}

export interface AccountFormHandle { destroy(): void }

export interface SharedAccountsSDK {
  create(options: { app: string; apiBase: string; brokerBase: string }): AccountClient
  mount(element: HTMLElement, options: { client: AccountClient; onSignedIn: () => void }): AccountFormHandle
}

declare global {
  interface Window {
    SharedAccounts?: SharedAccountsSDK
    __sharedAccountsScript?: Promise<SharedAccountsSDK> | null
  }
}

let clientPromise: Promise<AccountClient> | null = null

async function library(apiBase: string): Promise<SharedAccountsSDK> {
  if (window.SharedAccounts) return window.SharedAccounts
  if (!window.__sharedAccountsScript) {
    window.__sharedAccountsScript = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      const timer = setTimeout(fail, 15000)
      function fail() {
        clearTimeout(timer)
        script.remove()
        window.__sharedAccountsScript = null
        reject(new Error('Account service unavailable. Please retry.'))
      }
      script.src = apiBase.replace(/\/$/, '') + '/auth/client.v1.js'
      script.async = true
      script.onerror = fail
      script.onload = () => {
        if (!window.SharedAccounts) return fail()
        clearTimeout(timer)
        resolve(window.SharedAccounts)
      }
      document.head.appendChild(script)
    })
  }
  return window.__sharedAccountsScript
}

export async function getAccounts(apiBase = 'https://api.jaimegonzalezjr.com'): Promise<AccountClient> {
  if (!clientPromise) {
    clientPromise = library(apiBase).then(async sdk => {
      const client = sdk.create({ app: 'blackjack', apiBase, brokerBase: apiBase })
      await client.initialize()
      return client
    }).catch((error: unknown) => { clientPromise = null; throw error })
  }
  return clientPromise
}

export async function startGoogleLogin() { return (await getAccounts()).startGoogle() }
export async function completeGoogleLogin(search: string) { return (await getAccounts()).completeGoogle(search) }
export async function mountAccountForm(element: HTMLElement, onSignedIn: () => void): Promise<AccountFormHandle> {
  const client = await getAccounts()
  const sdk = await library('https://api.jaimegonzalezjr.com')
  return sdk.mount(element, { client, onSignedIn })
}
