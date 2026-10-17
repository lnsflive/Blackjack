<template>
  <v-container class="text-center py-12">
    <h1 class="mb-6">Blackjack</h1>
    <p role="status">{{ error || 'Completing your Blackjack sign-in…' }}</p>
    <v-btn v-if="error" to="/" color="primary">Return to Blackjack</v-btn>
  </v-container>
</template>
<script setup lang="ts">
import { completeGoogleLogin } from '~/utils/google-auth'
const error = ref('')
onMounted(async () => {
  const search = window.location.search
  window.history.replaceState(null, '', window.location.pathname)
  try { window.location.replace(await completeGoogleLogin(search)) }
  catch { error.value = 'Sign-in could not be completed. Please try again.' }
})
</script>
