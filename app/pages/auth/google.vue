<template>
  <v-container class="text-center py-12">
    <h1 class="mb-6">Blackjack</h1>
    <p role="status">{{ error || 'Completing your Blackjack sign-in…' }}</p>
    <v-btn v-if="error" to="/" color="primary">Return to Blackjack</v-btn>
  </v-container>
</template>
<script>
import { completeGoogleLogin } from '~/utils/google-auth'
export default {
  data: () => ({error: ''}),
  async mounted() {
    const search = window.location.search
    window.history.replaceState(null, '', window.location.pathname)
    try { window.location.replace(await completeGoogleLogin(search)) }
    catch (_) { this.error = 'Sign-in could not be completed. Please try again.' }
  }
}
</script>
