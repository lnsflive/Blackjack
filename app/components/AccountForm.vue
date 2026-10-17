<template><div><div ref="form" /><p v-if="error" role="alert">{{ error }}</p></div></template>
<script>
import { mountAccountForm } from '~/utils/google-auth'
export default {
  data: () => ({error:'',accountForm:null}),
  async mounted() {
    try { this.accountForm = await mountAccountForm(this.$refs.form, () => this.$emit('signed-in')) }
    catch (error) { this.error = error.message }
  },
  beforeDestroy() {if(this.accountForm)this.accountForm.destroy()},
  beforeUnmount() {if(this.accountForm)this.accountForm.destroy()}
}
</script>
