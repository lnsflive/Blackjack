import type { AccountAPI, RequestOptions } from '../utils/account-api'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  function request(url: string, method: 'GET' | 'POST' | 'PUT', options: RequestOptions, body?: Record<string, unknown>): Promise<unknown> {
    return $fetch<unknown>(url, {
      baseURL: config.public.apiBase,
      method,
      headers: options.headers,
      credentials: options.withCredentials ? 'include' : 'omit',
      body,
    })
  }
  const axios: AccountAPI = {
    $get: (url, options = {}) => request(url, 'GET', options),
    $post: (url, body, options = {}) => request(url, 'POST', options, body),
    $put: (url, body, options = {}) => request(url, 'PUT', options, body),
  }
  return { provide: { axios } }
})
