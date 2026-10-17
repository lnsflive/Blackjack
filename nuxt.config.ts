import { defineNuxtConfig } from 'nuxt/config'

const baseURL = process.env.APP_BASE_PATH || '/'
const apiBase = process.env.API_BASE_URL || 'https://api.jaimegonzalezjr.com'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-17',
  ssr: false,
  pages: true,
  dir: {
    public: 'static',
  },
  devtools: {
    enabled: false,
  },
  app: {
    baseURL,
    head: {
      title: 'BlackJack',
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Blackjack with a shared player account and leaderboard.' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: `${baseURL}favicon.ico` },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: `${baseURL}favicon-16x16.png` },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${baseURL}favicon-32x32.png` },
        { rel: 'apple-touch-icon', sizes: '180x180', href: `${baseURL}apple-touch-icon.png` },
      ],
    },
  },
  css: [
    '@mdi/font/css/materialdesignicons.css',
  ],
  modules: [
    'vuetify-nuxt-module',
  ],
  runtimeConfig: {
    public: {
      apiBase,
    },
  },
  nitro: {
    output: {
      publicDir: process.env.BUILD_OUTPUT || '.output/public',
    },
    prerender: {
      routes: ['/', '/auth/google'],
    },
  },
  vuetify: {
    moduleOptions: {
      prefixComposables: ['useLayout'],
    },
    vuetifyOptions: {
      icons: {
        defaultSet: 'mdi',
      },
      theme: {
        defaultTheme: 'blackjackDark',
        themes: {
          blackjackDark: {
            dark: true,
            colors: {
              primary: '#1976D2',
              accent: '#424242',
              secondary: '#FFA000',
              info: '#26A69A',
              warning: '#FFC107',
              error: '#FF3D00',
              success: '#00E676',
            },
          },
        },
      },
    },
  },
})
