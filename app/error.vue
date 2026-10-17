<template>
  <v-app theme="blackjackDark">
    <v-main class="d-flex align-center justify-center">
      <div class="text-center">
        <h1>{{ title }}</h1>
        <NuxtLink to="/">Home page</NuxtLink>
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()

const title = computed(() => props.error.statusCode === 404 ? '404 Not Found' : 'An error occurred')
useHead({ title })
</script>
