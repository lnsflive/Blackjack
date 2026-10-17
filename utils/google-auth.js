// The protocol and account controls are versioned inside the Strapi repository.
let clientPromise
async function library(apiBase) {
  if (window.SharedAccounts) return window.SharedAccounts
  if (!window.__sharedAccountsScript) window.__sharedAccountsScript = new Promise((resolve,reject) => {
    const script = document.createElement('script')
    const timer = setTimeout(() => fail(), 15000)
    function fail() {clearTimeout(timer);script.remove();window.__sharedAccountsScript=null;reject(new Error('Account service unavailable. Please retry.'))}
    script.src = apiBase.replace(/\/$/,'') + '/auth/client.v1.js'
    script.async = true
    script.onerror = fail
    script.onload = () => {if (!window.SharedAccounts) return fail();clearTimeout(timer);resolve(window.SharedAccounts)}
    document.head.appendChild(script)
  })
  return window.__sharedAccountsScript
}
export async function getAccounts(apiBase = 'https://api.jaimegonzalezjr.com') {
  if (!clientPromise) clientPromise = library(apiBase).then(async sdk => {
    const client = sdk.create({app:'blackjack',apiBase,brokerBase:apiBase})
    await client.initialize()
    return client
  }).catch(error => {clientPromise=null;throw error})
  return clientPromise
}
export async function startGoogleLogin() {return (await getAccounts()).startGoogle()}
export async function completeGoogleLogin(search) {return (await getAccounts()).completeGoogle(search)}
export async function mountAccountForm(element,onSignedIn) {
  const client = await getAccounts()
  return window.SharedAccounts.mount(element,{client,onSignedIn})
}
