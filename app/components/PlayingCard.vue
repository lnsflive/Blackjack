<template>
  <v-card width="80" height="120" class="playing-card pa-2 ma-1" :class="{ 'card-back': hidden }" :aria-label="hidden || !card ? 'Hidden card' : `${card.rank} of ${card.suit}s`">
    <template v-if="!hidden && card">
      <div class="text-h6" :class="color">{{ card.rank }} {{ symbol }}</div>
      <div class="text-h4 text-center" :class="color">{{ symbol }}</div>
    </template>
  </v-card>
</template>

<script setup lang="ts">
import type { Card } from '../../game/blackjack'
const props = defineProps<{ card?: Card; hidden?: boolean }>()

const symbol = computed(() => props.card ? ({ spade: '♠', diamond: '♦', heart: '♥', club: '♣' })[props.card.suit] : '')
const color = computed(() => props.card && ['diamond', 'heart'].includes(props.card.suit) ? 'text-red' : 'text-black')
</script>

<style scoped>
.playing-card { background: white; }
.card-back {
  background-color: #3137a8;
  background-image: linear-gradient(135deg, #fff3 25%, transparent 25%), linear-gradient(315deg, #fff3 25%, transparent 25%);
  background-size: 12px 12px;
}
</style>
