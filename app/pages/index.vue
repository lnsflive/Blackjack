<template>
  <main class="casino">
    <div class="table-rail">
      <div class="felt">
        <header class="table-header">
          <div class="table-brand"><span class="brand-spade" aria-hidden="true">♠</span><div><h1>Blackjack</h1><span class="brand-caption">TAKE YOUR SEAT</span></div></div>
          <div class="table-account">
            <div class="bank"><span>Bankroll</span><strong data-testid="bank-balance">${{ money(bankAmount) }}</strong></div>
            <div class="player-identity"><span class="player-avatar" aria-hidden="true">{{ playerName?.slice(0, 1) || '♠' }}</span><span>{{ playerName || 'Guest' }}</span></div>
            <button class="icon-button" type="button" :aria-label="soundOn ? 'Mute sound' : 'Turn sound on'" :aria-pressed="soundOn" @click="soundOn = !soundOn"><v-icon :icon="soundOn ? 'mdi-volume-high' : 'mdi-volume-off'" size="20" /></button>
            <button v-if="user" class="sign-out" type="button" :disabled="busy" @click="logout">Sign out</button>
          </div>
        </header>

        <div v-if="authError" class="account-error" role="alert">{{ authError }}</div>

        <div class="table-layout">
          <div class="play-area">
            <section v-if="loading || !user || createPlayer" class="welcome-area" aria-label="Account">
              <div class="welcome-mark" aria-hidden="true">♠</div>
              <h2>{{ loading ? 'Setting your table…' : createPlayer ? 'Make yourself at home' : 'Your seat is waiting' }}</h2>
              <p>{{ loading ? 'Checking your account.' : createPlayer ? 'Choose a player name for your seat and the leaderboard.' : 'Sign in to keep your bankroll and pick up your game on any device.' }}</p>
              <form v-if="createPlayer && !loading" class="player-form" @submit.prevent="submitPlayer">
                <label for="player-name">Player name</label>
                <input id="player-name" v-model="tempPlayer" minlength="3" maxlength="10" autocomplete="nickname" />
                <button class="table-button primary-button" type="submit" :disabled="invalid || busy">Take a seat</button>
              </form>
              <template v-else-if="!loading"><AccountForm @signed-in="loadAccount" /><button class="text-button" type="button" @click="loadAccount">Retry sign-in</button></template>
            </section>

            <template v-else>
              <section class="dealer-zone" aria-label="Dealer hand">
                <div class="hand-heading"><h2>DEALER</h2><span v-if="dealerTotal !== null" class="total-badge">{{ dealerTotal }}</span></div>
                <div v-if="round" class="card-fan dealer-cards" :style="{ '--card-gaps': visibleDealerCards.length + Number(dealerHoleHidden) - 1 }">
                  <PlayingCard v-for="(card, index) in visibleDealerCards" :key="'dealer-' + index" :card="card" />
                  <PlayingCard v-if="dealerHoleHidden" hidden />
                </div>
                <div v-else class="empty-cards" aria-label="Waiting for the deal"><span>♠</span><span>♠</span></div>
              </section>

              <div class="table-lettering" aria-hidden="true"><span class="lettering-line"></span><div><p>BLACKJACK PAYS <strong>3 TO 2</strong></p><small>DEALER STANDS ON ALL 17s</small></div><span class="lettering-line"></span></div>

              <div class="round-status" :class="{ 'winning-status': round?.phase === 'settled' && round.net > 0 }" role="status" aria-live="polite" aria-atomic="true">
                <span class="status-heading">{{ statusHeading }}</span>
                <span class="status-detail">{{ statusDetail }}</span>
              </div>

              <section class="player-zone" aria-label="Player hands">
                <div v-if="!round" class="empty-seat"><div class="betting-circle"><span>PLACE YOUR<br />WAGER</span></div><p>Good luck, {{ playerName }}.</p></div>
                <div v-else class="player-hands" :class="{ 'multiple-hands': playerHands.length > 1 }">
                  <article v-for="(hand, index) in playerHands" :key="'hand-' + index" class="player-hand" :class="{ 'active-hand': index === activeHandIndex && round.phase === 'player' }" :aria-label="'Hand ' + (index + 1)" :aria-current="index === activeHandIndex && round.phase === 'player' ? 'true' : undefined">
                    <div class="hand-heading"><h2>{{ playerHands.length > 1 ? 'HAND ' + (index + 1) : 'YOUR HAND' }}</h2><span class="total-badge" :class="{ busted: handTotal(hand) > 21 }">{{ handTotal(hand) }}</span></div>
                    <div class="card-fan" :style="{ '--card-gaps': hand.cards.length - 1 }"><PlayingCard v-for="(card, cardIndex) in hand.cards" :key="'player-' + index + '-' + cardIndex" :card="card" /></div>
                    <div class="hand-caption"><span class="hand-wager">${{ money(hand.wager) }}</span><span v-if="hand.result" class="outcome" :class="{ 'positive-outcome': ['win', 'blackjack'].includes(hand.result) }">{{ resultLabel(hand.result) }}</span><span v-else-if="index === activeHandIndex && round.phase === 'player'" class="active-caption">Your turn</span><span v-else-if="hand.stood">Standing</span></div>
                  </article>
                </div>
              </section>

              <footer class="table-controls">
                <template v-if="round?.phase === 'insurance'">
                  <div class="insurance-choice"><p><strong>Dealer shows an Ace.</strong> Insurance pays 2:1.</p><div class="decision-buttons"><button class="table-button" type="button" :disabled="bankAmount < insuranceCost" @click="decideInsurance(true)">Insurance ${{ money(insuranceCost) }}</button><button class="table-button primary-button" type="button" @click="decideInsurance(false)">No insurance</button></div></div>
                </template>
                <div v-else-if="round?.phase === 'player'" class="decision-buttons" role="group" aria-label="Hand actions">
                  <button v-for="action in availableActions" :key="action" class="table-button" :class="{ 'primary-button': action === 'hit', 'stand-button': action === 'stand', 'surrender-button': action === 'surrender' }" type="button" :disabled="!canAfford(action)" @click="playAction(action)">{{ actionLabel(action) }}</button>
                </div>
                <div v-else class="betting-actions">
                  <div class="wager-preview"><span>Your wager</span><strong data-testid="wager-amount">${{ money(betGame1) }}</strong></div>
                  <button class="text-button clear-button" type="button" :disabled="!canBet || betGame1 <= 0" @click="clearBet">Clear</button>
                  <button class="table-button primary-button deal-button" type="button" :disabled="!canBet || betGame1 <= 0 || betGame1 > bankAmount" @click="playAgain">Deal<span v-if="betGame1 > 0"> ${{ money(betGame1) }}</span><span aria-hidden="true"> →</span></button>
                </div>
                <div class="chip-rack" role="group" aria-label="Betting chips">
                  <button v-for="chip in chips" :key="chip.value" class="casino-chip" :class="chip.color" type="button" :aria-label="'Add $' + chip.value + ' to wager'" :disabled="!canBet || betGame1 + chip.value > bankAmount" @click="changeBet(chip.value)"><span>{{ chip.value.toLocaleString() }}</span></button>
                </div>
                <p class="control-hint">{{ canBet ? 'Choose your chips. Your next hand is waiting.' : 'SIX DECKS · BLACKJACK PAYS 3:2' }}</p>
              </footer>
            </template>
          </div>

          <aside class="table-sidebar" aria-label="Table information">
            <section class="leaderboard">
              <h2 class="desktop-sidebar-title"><v-icon icon="mdi-trophy-outline" size="18" /> Leaderboard</h2>
              <button class="leaderboard-toggle" type="button" aria-controls="table-leaders" :aria-expanded="leaderboardExpanded" @click="leaderboardOpen = !leaderboardOpen"><span><v-icon icon="mdi-trophy-outline" size="18" /> Leaderboard</span><v-icon :icon="leaderboardExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" /></button>
              <div v-show="leaderboardExpanded" id="table-leaders">
                <p class="sidebar-eyebrow">TOP BANKROLLS</p>
                <ol v-if="topPlayers.length" class="leader-list">
                  <li v-for="(player, index) in topPlayers" :key="player.id" :class="{ 'your-rank': player.id === userID }"><span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span><span class="rank-name">{{ player.name }}<small v-if="player.id === userID">YOU</small></span><strong>${{ money(player.bank) }}</strong></li>
                </ol>
                <p v-else class="empty-leaderboard">{{ user ? 'The table is open. Make your mark.' : 'Sign in to join the table.' }}</p>
                <p v-if="yourRank > 5" class="personal-rank">Your place <strong>#{{ yourRank }}</strong></p>
              </div>
            </section>

            <section class="house-rules" aria-label="Table rules">
              <div class="rules-emblem" aria-hidden="true">♠ <span>♥</span> ♣ <span>♦</span></div>
              <h2>House rules</h2>
              <p class="rules-tagline">A CLASSIC SIX-DECK GAME</p>
              <dl><div><dt>Blackjack</dt><dd>3:2</dd></div><div><dt>Dealer</dt><dd>Stands on soft 17</dd></div><div><dt>Double down</dt><dd>Any first two cards</dd></div><div><dt>After a split</dt><dd>Double allowed</dd></div><div><dt>Resplit</dt><dd>Up to 4 hands</dd></div><div><dt>Split Aces</dt><dd>Once, one card each</dd></div><div><dt>Surrender</dt><dd>Late</dd></div></dl>
              <p class="minimum-bet">TABLE MINIMUM <strong>$10</strong></p>
            </section>
          </aside>
        </div>
        <div class="table-bottom-edge"><span>♣</span><span>PLAY THE HAND. ENJOY THE TABLE.</span><span>♦</span></div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { BlackjackGame, handValue } from '../../game/blackjack'
import type { Action, Hand, HandResult, Round } from '../../game/blackjack'

const { $axios } = useNuxtApp()
const { user, userID, bankAmount, playerName, players, loading, busy, authError, profileLoaded, createPlayer, tempPlayer, invalid, loadAccount, submitPlayer, logout } = useBlackjackAccount({ api: $axios })

const game = new BlackjackGame()
const round = shallowRef<Round | null>(null)
const settlementCredited = ref(false)
const betGame1 = ref(0)
const originalBet = ref(0)
const result = ref('')
const soundOn = ref(false)
const leaderboardOpen = ref(false)
const wideLayout = ref(false)
const leaderboardExpanded = computed(() => wideLayout.value || leaderboardOpen.value)
const sortedPlayers = computed(() => [...players.value].sort((left, right) => right.bank - left.bank))
const topPlayers = computed(() => sortedPlayers.value.slice(0, 5))
const yourRank = computed(() => sortedPlayers.value.findIndex(player => player.id === userID.value) + 1)
const chips = [
  { value: 10, color: 'chip-red' }, { value: 20, color: 'chip-green' },
  { value: 50, color: 'chip-blue' }, { value: 100, color: 'chip-black' },
  { value: 500, color: 'chip-purple' }, { value: 1000, color: 'chip-orange' },
]
const sounds = {
  bet: new Audio('./sounds/bet.mp3'), card: new Audio('./sounds/card.mp3'),
  lose: new Audio('./sounds/lose.mp3'), win: new Audio('./sounds/win.mp3'), tie: new Audio('./sounds/tie.mp3'),
}
const playerHands = computed(() => round.value?.hands ?? [])
const activeHandIndex = computed(() => round.value?.activeHandIndex ?? -1)
const availableActions = computed(() => round.value?.phase === 'player' ? game.availableActions() : [])
const dealerHoleHidden = computed(() => Boolean(round.value && ['insurance', 'player'].includes(round.value.phase)))
const visibleDealerCards = computed(() => dealerHoleHidden.value ? round.value?.dealerCards.slice(0, 1) ?? [] : round.value?.dealerCards ?? [])
const dealerTotal = computed(() => round.value && !dealerHoleHidden.value ? handValue(round.value.dealerCards).total : null)
const insuranceCost = computed(() => (round.value?.hands[0]?.wager ?? 0) / 2)
const canBet = computed(() => Boolean(user.value && profileLoaded.value && !createPlayer.value && !busy.value && (!round.value || round.value.phase === 'settled')))
const statusHeading = computed(() => round.value?.phase === 'settled' ? result.value : round.value?.phase === 'insurance' ? 'Insurance?' : round.value?.phase === 'player' ? 'Your move' : 'Place your wager')
const statusDetail = computed(() => round.value?.phase === 'settled' ? 'The next hand is yours to deal.' : round.value?.phase === 'player' ? 'Hand ' + (activeHandIndex.value + 1) + ' · ' + money(game.activeHand().wager) + ' wagered' : round.value?.phase === 'insurance' ? 'Decide before the dealer checks for blackjack.' : 'Select chips below, then press Deal.')

function money(value: number) { return value.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }) }
function handTotal(hand: Hand) { return handValue(hand.cards).total }
function actionLabel(action: Action) { return ({ hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split', surrender: 'Surrender' })[action] }
function resultLabel(outcome: HandResult) { return ({ blackjack: 'Blackjack', win: 'Win', lose: 'Lose', push: 'Push', bust: 'Bust', surrender: 'Surrendered', 'dealer-blackjack': 'Dealer blackjack' })[outcome] }
function canAfford(action: Action) { return !['double', 'split'].includes(action) || bankAmount.value >= game.activeHand().wager }
function playSound(sound: HTMLAudioElement) { if (soundOn.value) void sound.play().catch(() => {}) }
function changeBet(amount: number) {
  if (!canBet.value || betGame1.value + amount > bankAmount.value) return
  playSound(sounds.bet)
  betGame1.value += amount
}
function clearBet() { if (canBet.value) betGame1.value = 0 }
function playAgain() {
  if (!canBet.value || betGame1.value <= 0 || betGame1.value > bankAmount.value) return
  originalBet.value = betGame1.value
  const dealt = game.startRound(originalBet.value)
  bankAmount.value -= originalBet.value
  result.value = ''
  settlementCredited.value = false
  round.value = dealt
  playSound(sounds.card)
  syncRound()
}
function decideInsurance(take: boolean) {
  if (round.value?.phase !== 'insurance' || (take && bankAmount.value < insuranceCost.value)) return
  if (take) { bankAmount.value -= insuranceCost.value; game.takeInsurance() }
  else game.declineInsurance()
  syncRound()
}
function playAction(action: Action) {
  if (round.value?.phase !== 'player' || !canAfford(action)) return
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
  result.value = net > 0 ? 'You win $' + money(net) : net < 0 ? 'You lose $' + money(-net) : 'Push · wager returned'
  playSound(net > 0 ? sounds.win : net < 0 ? sounds.lose : sounds.tie)
  betGame1.value = originalBet.value <= bankAmount.value ? originalBet.value : 0
}
let layoutQuery: MediaQueryList | null = null
function updateLayout() { wideLayout.value = layoutQuery?.matches ?? false }
onMounted(() => {
  layoutQuery = window.matchMedia('(min-width: 1024px)')
  updateLayout()
  layoutQuery.addEventListener('change', updateLayout)
  void loadAccount()
})
onBeforeUnmount(() => layoutQuery?.removeEventListener('change', updateLayout))
</script>

<style scoped>
.casino {
  --cream: #f5eedb;
  --gold: #d4b676;
  --muted: #b2c8b9;
  --card-width: 76px;
  min-height: 100svh;
  background: radial-gradient(ellipse at 50% 10%, #34382e, #131c18 85%);
  padding: 24px;
  color: var(--cream);
  font-family: Arial, sans-serif;
}
.table-rail { max-width: 1520px; margin: 0 auto; padding: 12px; border-radius: 72px 72px 100px 100px; background: linear-gradient(120deg, #45382e, #211e1b 40%, #4d3c2d 75%, #25211b); box-shadow: 0 20px 60px #0007, inset 0 2px 1px #ac8a5655; }
.felt { position: relative; border: 1px solid #bd9e6266; border-radius: 60px 60px 88px 88px; overflow: clip; background-color: #164b38; background-image: radial-gradient(ellipse at 45% 40%, #29735070, transparent 75%), repeating-linear-gradient(0deg, #ffffff02 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, #00000003 0 1px, transparent 1px 3px); box-shadow: inset 0 0 65px #071f1a70, 0 0 0 4px #101e18, 0 0 0 5px #ad8c4d66; }
button, input { font: inherit; }
button { cursor: pointer; touch-action: manipulation; }
button:disabled { cursor: default; opacity: .4; }
button:focus-visible, input:focus-visible, :deep(a:focus-visible) { outline: 3px solid #ffe2a4; outline-offset: 4px; }
.table-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin: 0 36px; padding: 24px 4px 22px; border-bottom: 1px solid #d4b67633; }
.table-brand { display: flex; align-items: center; gap: 12px; }
.brand-spade { font: 46px/1 Georgia, serif; color: var(--gold); }
.table-brand h1 { font: italic 36px/1 Georgia, serif; letter-spacing: -.8px; }
.brand-caption { display: block; color: var(--gold); font-size: 9px; letter-spacing: 2.5px; margin-top: 7px; }
.table-account { display: flex; align-items: center; gap: 20px; }
.bank { display: grid; gap: 4px; text-align: right; }
.bank > span { color: var(--muted); font-size: 11px; }
.bank strong { font-size: 23px; font-weight: 500; font-variant-numeric: tabular-nums; }
.player-identity { display: flex; align-items: center; gap: 9px; font-size: 12px; }
.player-avatar { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid #d4b67666; border-radius: 50%; color: var(--gold); background: #092c2455; }
.icon-button { min-width: 44px; min-height: 44px; color: var(--muted); border-radius: 50%; }
.icon-button:hover, .text-button:hover, .sign-out:hover { color: var(--cream); background: #ffffff0a; }
.sign-out { color: var(--muted); font-size: 11px; padding: 12px 6px; min-height: 44px; }
.account-error { margin: 16px 36px 0; padding: 12px 16px; background: #6d2629; border: 1px solid #edacaa77; border-radius: 8px; }
.table-layout { display: grid; grid-template-columns: minmax(0, 1fr) 252px; gap: 20px; padding: 24px 36px 0; min-height: min(700px, calc(100svh - 210px)); }
.play-area { min-width: 0; display: flex; flex-direction: column; }
.dealer-zone { text-align: center; padding-top: 2px; min-height: 151px; }
.hand-heading { min-height: 26px; display: flex; gap: 8px; align-items: center; justify-content: center; margin-bottom: 12px; }
.hand-heading h2 { font-size: 10px; letter-spacing: 2px; font-weight: 500; color: var(--muted); }
.total-badge { display: inline-grid; place-items: center; min-width: 26px; height: 24px; padding: 0 7px; border: 1px solid #e2ce9d66; border-radius: 6px; font-size: 12px; background: #0d2a22; }
.total-badge.busted { background: #782a32; }
.card-fan { display: grid; grid-template-columns: repeat(var(--card-gaps), minmax(0, 30px)) var(--card-width); justify-content: center; width: 100%; isolation: isolate; }
.empty-cards { display: flex; justify-content: center; gap: 10px; }
.empty-cards span { width: var(--card-width); aspect-ratio: 5 / 7; border: 1px solid #d4b67644; border-radius: 7px; color: #d4b67644; display: grid; place-items: center; font-size: 30px; }
.table-lettering { display: flex; align-items: center; gap: 22px; justify-content: center; color: #d4b676b3; text-align: center; padding: 16px 0 8px; }
.table-lettering p { font: 15px/1.5 Georgia, serif; letter-spacing: 2px; }
.table-lettering strong { font-weight: 400; }
.table-lettering small { font-size: 8px; letter-spacing: 2px; }
.lettering-line { width: 55px; height: 1px; background: linear-gradient(90deg, transparent, #d4b67688, transparent); }
.round-status { display: grid; text-align: center; gap: 5px; min-height: 65px; padding: 6px 8px 12px; }
.status-heading { font: 24px/1.2 Georgia, serif; color: var(--cream); }
.status-detail { font-size: 11px; color: var(--muted); }
.winning-status .status-heading { color: #f1d28c; }
.player-zone { flex: 1; display: grid; align-content: center; min-height: 174px; padding-bottom: 14px; }
.empty-seat { text-align: center; }
.betting-circle { display: grid; place-items: center; width: 108px; height: 108px; border: 1px solid #d4b67688; border-radius: 50%; margin: 0 auto 14px; box-shadow: inset 0 0 0 7px #164b38, inset 0 0 0 8px #d4b67633; }
.betting-circle span { color: #d4b676b3; font-size: 9px; line-height: 1.7; letter-spacing: 2px; }
.empty-seat p { font-size: 11px; color: var(--muted); }
.player-hands { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.player-hands.multiple-hands { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.player-hand { min-width: 0; text-align: center; border: 1px solid transparent; border-radius: 16px; padding: 12px 8px 8px; }
.active-hand { border-color: #d4b67688; background: #0b322633; box-shadow: inset 0 0 24px #d4b67609; }
.active-hand .hand-heading h2 { color: var(--gold); }
.hand-caption { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; min-height: 24px; padding-top: 10px; font-size: 10px; color: var(--muted); }
.hand-wager { color: var(--cream); border: 1px solid #d4b67666; border-radius: 14px; padding: 3px 10px; font-variant-numeric: tabular-nums; }
.outcome { font-weight: 600; }
.positive-outcome, .active-caption { color: #f1d28c; }
.table-controls { margin-top: auto; padding: 18px 0 4px; border-top: 1px solid #d4b67633; }
.betting-actions { display: flex; align-items: center; gap: 14px; max-width: 500px; margin: auto auto 20px; }
.wager-preview { display: flex; align-items: baseline; gap: 12px; flex: 1; }
.wager-preview > span { font-size: 12px; color: var(--muted); }
.wager-preview strong { font-size: 24px; font-weight: 500; font-variant-numeric: tabular-nums; }
.table-button { border: 1px solid #d4b67688; background: #0f3228; color: var(--cream); padding: 12px 22px; min-height: 48px; border-radius: 8px; font-size: 13px; font-weight: 600; transition: background .15s, transform .15s; }
.table-button:hover:not(:disabled) { background: #285440; transform: translateY(-1px); }
.primary-button { background: #dec48a; border-color: #e9d9b4; color: #22382a; box-shadow: 0 3px 8px #0002; }
.primary-button:hover:not(:disabled) { background: #efd9a6; }
.deal-button { min-width: 150px; }
.text-button { color: var(--muted); background: transparent; border: 0; min-height: 48px; padding: 10px 12px; font-size: 12px; border-radius: 6px; }
.chip-rack { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
.casino-chip { --chip-color: #b94a49; position: relative; display: grid; place-items: center; width: 54px; height: 54px; border: 5px dashed #f7f0dc; outline: 1px solid #ffffff22; border-radius: 50%; background: var(--chip-color); box-shadow: 0 4px 0 color-mix(in srgb, var(--chip-color), #000 35%), 0 7px 8px #0004; font-size: 12px; font-weight: 600; color: white; transition: transform .15s; }
.casino-chip span { display: grid; place-items: center; width: 100%; height: 100%; border: 1px solid #ffffff66; border-radius: 50%; }
.casino-chip:hover:not(:disabled) { transform: translateY(-4px); }
.chip-green { --chip-color: #357c5a; }.chip-blue { --chip-color: #3c7ea4; }.chip-black { --chip-color: #333a39; }.chip-purple { --chip-color: #82628f; }.chip-orange { --chip-color: #bd733d; }
.control-hint { font-size: 9px; letter-spacing: .5px; color: var(--muted); text-align: center; padding-top: 16px; }
.decision-buttons { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 20px; }
.surrender-button { border-color: #ffffff22; color: var(--muted); }
.insurance-choice { text-align: center; }.insurance-choice p { margin-bottom: 12px; color: var(--muted); font-size: 12px; }
.table-sidebar { min-width: 0; border-left: 1px solid #d4b67633; padding-left: 24px; }
.desktop-sidebar-title, .leaderboard-toggle { display: flex; align-items: center; gap: 8px; font: 18px/1.2 Georgia, serif; color: var(--cream); }
.leaderboard-toggle { display: none; width: 100%; min-height: 48px; justify-content: space-between; border: 0; background: transparent; text-align: left; }
.leaderboard-toggle > span { display: flex; align-items: center; gap: 8px; }
.sidebar-eyebrow { margin: 20px 0 10px; color: var(--muted); font-size: 8px; letter-spacing: 1.7px; }
.leader-list { list-style: none; padding: 0; margin: 0; }
.leader-list li { display: flex; align-items: center; gap: 10px; min-height: 45px; padding: 8px 2px; border-bottom: 1px solid #ffffff0d; }
.rank-number { color: var(--gold); font-size: 10px; font-variant-numeric: tabular-nums; }
.rank-name { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 4px; overflow-wrap: anywhere; font-size: 11px; }
.rank-name small { font-size: 7px; letter-spacing: 1px; color: var(--gold); }
.leader-list strong { font-size: 11px; font-weight: 500; white-space: nowrap; }
.your-rank { color: #f2d9a0; }
.empty-leaderboard, .personal-rank { color: var(--muted); font-size: 11px; line-height: 1.6; margin: 16px 0; }
.house-rules { margin-top: 24px; padding-top: 18px; border-top: 1px solid #d4b67633; }
.rules-emblem { text-align: center; color: #e2ce9d88; letter-spacing: 8px; font-size: 20px; }.rules-emblem span { color: #dbb09688; }
.house-rules h2 { margin-top: 12px; text-align: center; font: italic 22px/1.4 Georgia, serif; }
.rules-tagline { text-align: center; color: var(--muted); font-size: 7px; letter-spacing: 1.5px; margin: 4px 0 18px; }
.house-rules dl > div { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; font-size: 10px; }
.house-rules dt { color: var(--muted); }.house-rules dd { text-align: right; }
.minimum-bet { padding: 18px 0; margin-top: 8px; border-top: 1px solid #d4b67633; color: var(--muted); font-size: 8px; letter-spacing: 1px; display: flex; justify-content: space-between; }.minimum-bet strong { color: var(--gold); font-size: 12px; font-weight: 500; }
.table-bottom-edge { display: flex; gap: 24px; justify-content: center; align-items: center; padding: 22px; color: #d4b67677; font-size: 8px; letter-spacing: 2px; }
.table-bottom-edge > span:first-child, .table-bottom-edge > span:last-child { font-size: 16px; }
.welcome-area { display: grid; justify-items: center; align-content: center; gap: 20px; text-align: center; flex: 1; padding: 40px 20px; min-height: 480px; }
.welcome-mark { color: var(--gold); font: 80px/1 Georgia, serif; }
.welcome-area h2 { font: 30px/1.3 Georgia, serif; }.welcome-area p { font-size: 13px; color: var(--muted); max-width: 350px; line-height: 1.7; }
.player-form { display: grid; text-align: left; gap: 12px; width: min(100%, 300px); }.player-form label { font-size: 12px; }.player-form input { background: #0d2b23; border: 1px solid #d4b67688; color: var(--cream); border-radius: 8px; min-height: 48px; padding: 12px; }
@media (min-width: 1280px) { .player-hands.multiple-hands { grid-template-columns: repeat(4, minmax(0, 1fr)); }.player-hands.multiple-hands:has(> :nth-child(2):last-child) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 1023px) {
  .casino { padding: 16px; }.table-rail { border-radius: 42px; padding: 9px; }.felt { border-radius: 33px; }
  .table-header { margin: 0 24px; padding: 22px 0 18px; }.table-layout { grid-template-columns: minmax(0, 1fr); padding: 22px 24px 0; gap: 20px; }
  .table-account { gap: 12px; }.table-sidebar { border-left: 0; border-top: 1px solid #d4b67633; padding: 10px 0 0; }.desktop-sidebar-title { display: none; }.leaderboard-toggle { display: flex; }
  .house-rules { margin-top: 14px; padding: 18px 0 0; }.house-rules dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 28px; }.rules-emblem { display: none; }.house-rules h2 { font-size: 18px; margin: 0; }.minimum-bet { padding-bottom: 0; }
  .table-bottom-edge { padding: 16px; }.play-area { min-height: 610px; }.player-zone { min-height: 180px; }.table-lettering { padding-top: 16px; }.house-rules .rules-tagline { margin-bottom: 10px; }
}
@media (max-width: 599px) {
  .casino { padding: 8px; --card-width: 66px; }.table-rail { padding: 6px; border-radius: 28px; }.felt { border-radius: 22px; }
  .table-header { margin: 0 14px; padding: 18px 0 14px; gap: 8px; flex-wrap: wrap; }.table-brand { gap: 7px; }.table-brand h1 { font-size: 29px; }.brand-spade { font-size: 35px; }.brand-caption { font-size: 7px; letter-spacing: 1.5px; }
  .table-account { gap: 5px; margin-left: auto; }.player-identity { display: none; }.bank strong { font-size: 21px; }.bank > span { font-size: 10px; }.sign-out { font-size: 10px; padding: 8px 4px; }.icon-button { min-width: 44px; min-height: 44px; }
  .table-layout { padding: 18px 12px 0; gap: 10px; }.play-area { min-height: 590px; }.dealer-zone { min-height: 132px; }.hand-heading { margin-bottom: 9px; }.table-lettering { gap: 8px; padding: 10px 0 6px; }.table-lettering p { font-size: 12px; letter-spacing: 1.2px; }.table-lettering small { font-size: 7px; letter-spacing: 1.2px; }.lettering-line { width: 20px; }
  .round-status { min-height: 63px; }.status-heading { font-size: 23px; }.status-detail { font-size: 10px; }.player-zone { min-height: 162px; padding-bottom: 14px; }.betting-circle { width: 90px; height: 90px; margin-bottom: 10px; }
  .player-hands { gap: 8px; }.player-hand { padding: 10px 4px 8px; }.multiple-hands { --card-width: 59px; }.multiple-hands .hand-heading h2 { font-size: 8px; letter-spacing: 1px; }.multiple-hands .total-badge { font-size: 10px; min-width: 23px; height: 23px; }
  .hand-caption { gap: 6px; font-size: 9px; }.table-controls { padding-top: 14px; }.betting-actions { gap: 8px; margin-bottom: 17px; }.wager-preview { display: grid; gap: 4px; }.wager-preview > span { font-size: 10px; }.wager-preview strong { font-size: 22px; }.deal-button { min-width: 120px; }
  .chip-rack { gap: 8px; }.casino-chip { width: 44px; height: 44px; border-width: 4px; font-size: 10px; }.control-hint { font-size: 8px; padding-top: 14px; }.decision-buttons { gap: 6px; margin-bottom: 16px; }.decision-buttons .table-button { flex: 1; padding: 10px 8px; min-width: 64px; font-size: 12px; }.decision-buttons .surrender-button { flex: 0 1 100%; }
  .house-rules dl { grid-template-columns: minmax(0, 1fr); gap: 0; }.house-rules dl > div { padding: 7px 0; font-size: 11px; }.house-rules { padding: 16px 8px 0; }.table-bottom-edge { font-size: 6px; letter-spacing: 1.4px; gap: 12px; padding: 16px 8px 18px; }
  .account-error { margin: 12px; font-size: 12px; }.welcome-area { padding: 30px 12px; min-height: 460px; }.welcome-area h2 { font-size: 26px; }
}
@media (max-width: 359px) { .casino { padding: 4px; }.table-rail { padding: 4px; }.table-header { margin: 0 10px; }.table-layout { padding-left: 9px; padding-right: 9px; }.table-brand h1 { font-size: 24px; }.brand-caption { display: none; }.chip-rack { gap: 3px; }.casino-chip { width: 44px; height: 44px; } }
@media (prefers-reduced-motion: reduce) { .table-button, .casino-chip { transition: none; }.table-button:hover:not(:disabled), .casino-chip:hover:not(:disabled) { transform: none; } }
</style>
