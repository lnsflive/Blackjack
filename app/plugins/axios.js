export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  async function request(url, options) {
    try {
      return await $fetch(url, {
        baseURL: config.public.apiBase,
        ...options,
      })
    } catch (error) {
      if (error.response && !error.response.data) {
        error.response.data = error.data || error.response._data
      }
      throw error
    }
  }

  return {
    provide: {
      axios: {
        $get: (url, options = {}) => request(url, options),
        $post: (url, body, options = {}) => request(url, { ...options, method: 'POST', body }),
        $put: (url, body, options = {}) => request(url, { ...options, method: 'PUT', body }),
      },
    },
  }
})
