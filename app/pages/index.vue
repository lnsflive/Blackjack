<template>
  <v-container fluid class="pa-0 game-shell">
    <v-alert v-if="authError" type="error" role="alert">{{ authError }}</v-alert>
    <v-card v-if="!user || loading" class="pa-6 ma-4">
      <v-card-title>Blackjack</v-card-title>
      <p>{{ loading ? 'Checking your account…' : 'Sign in with Google to recover your player on any device.' }}</p>
      <AccountForm v-if="!loading" @signed-in="loadAccount" />
      <v-btn v-if="!loading" @click="loadAccount">Retry</v-btn>
    </v-card>

    <template v-if="user && !loading">
      <AppBar :bank="bankAmount" :player-name="playerName" :bet="displayedBet" :has-bet2="false" />
      <v-container>
        <v-row class="align-center mb-3" no-gutters>
          <v-col>
            <h1 class="text-h4">Blackjack</h1>
            <p class="text-body-2 mb-0">6 decks · dealer stands on soft 17 · blackjack pays 3:2 · DAS · late surrender</p>
          </v-col>
          <v-btn variant="text" @click="showLeaderboards = true">Leaderboard</v-btn>
          <v-btn variant="text" :disabled="busy" @click="logout">Sign out</v-btn>
        </v-row>

        <v-card class="table pa-4" min-height="500">
          <section class="mb-8" aria-label="Dealer hand">
            <div class="d-flex align-center ga-2 mb-2">
              <h2 class="text-h6">Dealer</h2>
              <v-chip v-if="dealerTotal !== null" size="small">{{ dealerTotal }}</v-chip>
            </div>
            <div class="d-flex flex-wrap">
              <PlayingCard v-for="(card, index) in visibleDealerCards" :key="`dealer-${index}`" :card="card" />
              <PlayingCard v-if="dealerHoleHidden" hidden />
            </div>
          </section>

          <section aria-label="Player hands">
            <div v-for="(hand, index) in playerHands" :key="`hand-${index}`" class="player-hand pa-3 mb-3" :class="{ active: index === activeHandIndex && round?.phase === 'player' }">
              <div class="d-flex align-center flex-wrap ga-2 mb-2">
                <h2 class="text-h6">Hand {{ index + 1 }}</h2>
                <v-chip size="small">{{ handTotal(hand) }}</v-chip>
                <v-chip size="small">Wager ${{ money(hand.wager) }}</v-chip>
                <v-chip v-if="hand.result" size="small" :color="resultColor(hand.result)">{{ resultLabel(hand.result) }}</v-chip>
              </div>
              <div class="d-flex flex-wrap">
                <PlayingCard v-for="(card, cardIndex) in hand.cards" :key="`player-${index}-${cardIndex}`" :card="card" />
              </div>
            </div>
          </section>

          <v-alert v-if="round?.phase === 'insurance'" type="info" class="mt-4">
            Dealer shows an Ace. Insurance costs ${{ money(insuranceCost) }} and pays 2:1.
            <div class="mt-3 d-flex ga-2">
              <v-btn :disabled="bankAmount < insuranceCost" @click="decideInsurance(true)">Take insurance</v-btn>
              <v-btn @click="decideInsurance(false)">Decline</v-btn>
            </div>
          </v-alert>

          <div v-if="round?.phase === 'player'" class="actions d-flex flex-wrap ga-2 mt-4">
            <v-btn v-for="action in availableActions" :key="action" size="large" :disabled="!canAfford(action)" @click="playAction(action)">
              {{ actionLabel(action) }}
            </v-btn>
          </div>
        </v-card>
      </v-container>

      <v-dialog v-model="endGame" persistent max-width="560">
        <v-card>
          <v-card-title>{{ result || 'Place your wager' }}</v-card-title>
          <v-card-subtitle>Bank: ${{ money(bankAmount) }}</v-card-subtitle>
          <v-card-text>
            <div class="d-flex flex-wrap justify-center">
              <v-btn v-for="chip in [10, 20, 50, 100, 500, 1000]" :key="chip" class="ma-2" rounded="circle" height="64" width="64" :disabled="chip > bankAmount" @click="changeBet(chip)">${{ chip }}</v-btn>
            </div>
          </v-card-text>
          <v-card-actions class="flex-wrap">
            <v-btn color="success" size="large" :disabled="betGame1 <= 0" @click="playAgain">Deal ${{ money(betGame1) }}</v-btn>
            <v-btn :disabled="betGame1 <= 0" @click="clearBet">Clear wager</v-btn>
            <v-spacer />
            <v-btn @click="showLeaderboards = true">Leaderboard</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showLeaderboards" max-width="420">
        <v-card>
          <v-card-title>Leaderboard</v-card-title>
          <v-data-table :headers="headers" :items="players" :items-per-page="10" :sort-by="[{ key: 'bank', order: 'desc' }]" />
        </v-card>
      </v-dialog>

      <v-dialog v-model="createPlayer" persistent max-width="520">
        <v-card>
          <v-card-title>Create new player</v-card-title>
          <v-card-text>
            <p>Your player will be linked to your account. Existing names require an administrator to migrate them.</p>
            <v-text-field v-model="tempPlayer" :counter="10" label="Player name" @keyup.enter="submitPlayer" />
          </v-card-text>
          <v-card-actions>
            <v-btn :disabled="invalid || busy" color="success" @click="submitPlayer">Create</v-btn>
            <v-btn :disabled="busy" @click="logout">Sign out</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { BlackjackGame, handValue } from '../../game/blackjack'
import type { Action, Hand, HandResult, Round } from '../../game/blackjack'

const { $axios } = useNuxtApp()
const {
  user, bankAmount, playerName, players, loading, busy, authError, profileLoaded,
  createPlayer, endGame, tempPlayer, invalid, loadAccount, submitPlayer, logout,
} = useBlackjackAccount({ api: $axios })

// Keep the engine outside Vue's deep proxy; round snapshots drive the template.
const game = new BlackjackGame()
const round = shallowRef<Round | null>(null)
const settlementCredited = ref(false)
const betGame1 = ref(0)
const originalBet = ref(0)
const result = ref('')
const showLeaderboards = ref(false)
const headers = [
  { title: 'Players', sortable: false, key: 'name' },
  { title: 'Bank', key: 'bank' },
]
const sounds = {
  bet: new Audio('./sounds/bet.mp3'),
  card: new Audio('./sounds/card.mp3'),
  lose: new Audio('./sounds/lose.mp3'),
  win: new Audio('./sounds/win.mp3'),
  tie: new Audio('./sounds/tie.mp3'),
}
const playerHands = computed(() => round.value?.hands ?? [])
const activeHandIndex = computed(() => round.value?.activeHandIndex ?? -1)
const availableActions = computed(() => {
  if (round.value?.phase !== 'player') return []
  return game.availableActions()
})
const dealerHoleHidden = computed(() => Boolean(round.value && ['insurance', 'player'].includes(round.value.phase)))
const visibleDealerCards = computed(() => dealerHoleHidden.value ? round.value?.dealerCards.slice(0, 1) ?? [] : round.value?.dealerCards ?? [])
const dealerTotal = computed(() => round.value && !dealerHoleHidden.value ? handValue(round.value.dealerCards).total : null)
const insuranceCost = computed(() => (round.value?.hands[0]?.wager ?? 0) / 2)
const displayedBet = computed(() => round.value && round.value.phase !== 'settled' ? round.value.totalWagered : betGame1.value)

function money(value: number) { return value.toFixed(Number.isInteger(value) ? 0 : 2) }
function handTotal(hand: Hand) { return handValue(hand.cards).total }
function actionLabel(action: Action) {
  return ({ hit: 'Hit', stand: 'Stand', double: 'Double down', split: 'Split', surrender: 'Late surrender' })[action]
}
function resultLabel(outcome: HandResult) {
  return ({ blackjack: 'Blackjack 3:2', win: 'Win', lose: 'Lose', push: 'Push', bust: 'Bust', surrender: 'Surrender', 'dealer-blackjack': 'Dealer blackjack' })[outcome]
}
function resultColor(outcome: HandResult) {
  return ['win', 'blackjack'].includes(outcome) ? 'success' : outcome === 'push' ? 'info' : 'error'
}
function canAfford(action: Action) {
  return !['double', 'split'].includes(action) || bankAmount.value >= game.activeHand().wager
}
function playSound(sound: HTMLAudioElement) { void sound.play().catch(() => {}) }
function changeBet(amount: number) {
  if (amount > bankAmount.value) return
  playSound(sounds.bet)
  betGame1.value += amount
  bankAmount.value -= amount
}
function clearBet() {
  bankAmount.value += betGame1.value
  betGame1.value = 0
}
function playAgain() {
  if (!user.value || !profileLoaded.value || busy.value || betGame1.value <= 0) return
  originalBet.value = betGame1.value
  result.value = ''
  endGame.value = false
  settlementCredited.value = false
  round.value = game.startRound(originalBet.value)
  playSound(sounds.card)
  syncRound()
}
function decideInsurance(take: boolean) {
  if (take && bankAmount.value < insuranceCost.value) return
  if (take) {
    bankAmount.value -= insuranceCost.value
    game.takeInsurance()
  } else game.declineInsurance()
  syncRound()
}
function playAction(action: Action) {
  if (!canAfford(action)) return
  const before = game.round.totalWagered
  game.act(action)
  bankAmount.value -= game.round.totalWagered - before
  playSound(sounds.card)
  syncRound()
}
function syncRound() {
  const current = game.round
  round.value = { ...current, hands: [...current.hands], dealerCards: [...current.dealerCards] }
  if (current.phase !== 'settled' || settlementCredited.value) return
  settlementCredited.value = true
  bankAmount.value += current.totalReturned
  const net = current.net
  result.value = net > 0 ? `You win ${money(net)}` : net < 0 ? `You lose ${money(-net)}` : 'Push'
  playSound(net > 0 ? sounds.win : net < 0 ? sounds.lose : sounds.tie)
  betGame1.value = 0
  endGame.value = true
}
onMounted(loadAccount)
</script>

<style scoped>
.game-shell { min-height: 100vh; }
.table { background: #165c3a; border: 3px solid #c7a552; }
.player-hand { border: 1px solid #ffffff55; border-radius: 8px; }
.player-hand.active { border-color: #ffc107; box-shadow: 0 0 0 2px #ffc10755; }
.actions { position: sticky; bottom: 12px; background: #103d2aee; padding: 12px; border-radius: 8px; }
</style>
