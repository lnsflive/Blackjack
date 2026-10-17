<template>
  <div class="playing-card" :class="{ 'card-back': hidden, 'red-suit': red }" role="img" :aria-label="hidden || !card ? 'Hidden card' : `${card.rank} of ${card.suit}s`">
    <template v-if="!hidden && card">
      <span class="card-corner"><b>{{ card.rank }}</b><span>{{ symbol }}</span></span>
      <span class="card-pip" aria-hidden="true">{{ symbol }}</span>
      <span class="card-corner bottom-corner" aria-hidden="true"><b>{{ card.rank }}</b><span>{{ symbol }}</span></span>
    </template>
    <span v-else class="back-emblem" aria-hidden="true">♠</span>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '../../game/blackjack'
const props = defineProps<{ card?: Card; hidden?: boolean }>()

const symbol = computed(() => props.card ? ({ spade: '♠', diamond: '♦', heart: '♥', club: '♣' })[props.card.suit] : '')
const red = computed(() => props.card && ['diamond', 'heart'].includes(props.card.suit))
</script>

<style scoped>
.playing-card {
  width: var(--card-width, 76px);
  aspect-ratio: 5 / 7;
  position: relative;
  background: #fffdf6;
  color: #202c29;
  border: 1px solid #e3dfd0;
  border-radius: 7px;
  box-shadow: 0 4px 8px #001e1a45;
  user-select: none;
  animation: deal-card 180ms ease-out both;
}
.red-suit { color: #bb3540; }
.card-corner { position: absolute; top: 5px; left: 6px; display: grid; text-align: center; line-height: 1; font-size: 15px; }
.card-corner b { font: 600 20px/1 Georgia, serif; }
.bottom-corner { inset: auto 6px 5px auto; transform: rotate(180deg); }
.card-pip { position: absolute; inset: 0; display: grid; place-items: center; font-size: calc(var(--card-width, 76px) * .57); }
.card-back {
  background-color: #733c40;
  background-image: repeating-linear-gradient(45deg, #ffffff17 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, #ffffff17 0 1px, transparent 1px 7px);
  border: 5px solid #fff9eb;
}
.back-emblem { position: absolute; inset: 15%; display: grid; place-items: center; color: #f6dfae; font-size: 34px; border: 1px solid #e5c78a99; border-radius: 50%; }
@keyframes deal-card { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .playing-card { animation: none; } }
</style>
