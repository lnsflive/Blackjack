<template><div><div ref="form" /><p v-if="error" role="alert">{{ error }}</p></div></template>
<script setup lang="ts">
import { mountAccountForm } from '~/utils/google-auth'
import type { AccountFormHandle } from '~/utils/google-auth'

const emit = defineEmits<{ 'signed-in': [] }>()
const form = ref<HTMLElement | null>(null)
const error = ref('')
let accountForm: AccountFormHandle | null = null
let disposed = false

onMounted(async () => {
  if (!form.value) return
  try {
    const handle = await mountAccountForm(form.value, () => emit('signed-in'))
    if (disposed) handle.destroy()
    else accountForm = handle
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Unable to load account controls.'
  }
})
onBeforeUnmount(() => { disposed = true; accountForm?.destroy() })
</script>
