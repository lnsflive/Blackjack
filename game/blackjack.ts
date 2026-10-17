export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type Suit = 'spade' | 'diamond' | 'heart' | 'club'
export interface Card { rank: Rank; suit: Suit }
export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender'
export type HandResult = 'blackjack' | 'win' | 'lose' | 'push' | 'bust' | 'surrender' | 'dealer-blackjack'
export interface Hand {
  cards: [Card, ...Card[]]
  wager: number
  fromSplit: boolean
  splitAces: boolean
  doubled: boolean
  stood: boolean
  surrendered: boolean
  result: HandResult | null
  returned: number
}
export interface Round {
  phase: 'insurance' | 'player' | 'dealer' | 'settled'
  hands: [Hand, ...Hand[]]
  activeHandIndex: number
  dealerCards: [Card, Card, ...Card[]]
  insuranceWager: number
  insuranceReturned: number
  totalWagered: number
  totalReturned: number
  net: number
}
export interface Rules {
  decks: number
  blackjackPayout: number
  dealerHitsSoft17: boolean
  dealerPeeks: boolean
  doubleAfterSplit: boolean
  maxHands: number
  resplitAces: boolean
  hitSplitAces: boolean
  lateSurrender: boolean
  insurance: boolean
  penetration: number
}

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const SUITS: Suit[] = ['spade', 'diamond', 'heart', 'club']

export const STANDARD_RULES: Readonly<Rules> = Object.freeze({
  decks: 6,
  blackjackPayout: 1.5,
  dealerHitsSoft17: false,
  dealerPeeks: true,
  doubleAfterSplit: true,
  maxHands: 4,
  resplitAces: false,
  hitSplitAces: false,
  lateSurrender: true,
  insurance: true,
  penetration: 0.75,
})

export function createSeededRandom(seed = 1) {
  let state = Number(seed) >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createShoe(decks = STANDARD_RULES.decks) {
  const cards: Card[] = []
  for (let deck = 0; deck < decks; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ rank, suit })
    }
  }
  return cards
}

export function shuffleCards(cards: Card[], random = Math.random) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const original = cards[index]
    const swapped = cards[swapIndex]
    if (original && swapped) {
      cards[index] = swapped
      cards[swapIndex] = original
    }
  }
  return cards
}

export function cardValue(card: Card) {
  if (card.rank === 'A') return 11
  return ['10', 'J', 'Q', 'K'].includes(card.rank) ? 10 : Number(card.rank)
}

export function handValue(cards: readonly Card[]) {
  let total = cards.reduce((sum, card) => sum + cardValue(card), 0)
  let aces = cards.filter(card => card.rank === 'A').length
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return { total, soft: aces > 0, bust: total > 21 }
}

export function isBlackjack(hand: Pick<Hand, 'cards' | 'fromSplit'>) {
  return hand.cards.length === 2 && !hand.fromSplit && handValue(hand.cards).total === 21
}

export function newHand(cards: [Card, ...Card[]], wager: number, options: { fromSplit?: boolean; splitAces?: boolean } = {}): Hand {
  return {
    cards,
    wager,
    fromSplit: Boolean(options.fromSplit),
    splitAces: Boolean(options.splitAces),
    doubled: false,
    stood: false,
    surrendered: false,
    result: null,
    returned: 0,
  }
}

export class BlackjackGame {
  rules: Rules
  random: () => number
  shoe: Card[] = []
  private currentRound: Round | null = null

  get round(): Round {
    if (!this.currentRound) throw new Error('No round has been dealt')
    return this.currentRound
  }

  set round(round: Round) { this.currentRound = round }

  constructor({ rules = STANDARD_RULES, random = Math.random }: { rules?: Partial<Rules>; random?: () => number } = {}) {
    this.rules = { ...STANDARD_RULES, ...rules }
    this.random = random
    this.shoe = []
    this.shuffle()
  }

  shuffle() {
    this.shoe = shuffleCards(createShoe(this.rules.decks), this.random)
  }

  draw() {
    const card = this.shoe.pop()
    if (!card) throw new Error('The shoe is empty')
    return card
  }

  shouldShuffle() {
    return this.shoe.length < this.rules.decks * 52 * (1 - this.rules.penetration)
  }

  startRound(wager = 1) {
    if (!Number.isFinite(wager) || wager <= 0) throw new Error('Wager must be a positive number')
    if (this.shouldShuffle()) this.shuffle()

    const firstPlayer = this.draw()
    const dealerUpcard = this.draw()
    const playerCards: [Card, Card] = [firstPlayer, this.draw()]
    const dealerCards: [Card, Card] = [dealerUpcard, this.draw()]
    this.round = {
      phase: 'player',
      hands: [newHand(playerCards, wager)],
      activeHandIndex: 0,
      dealerCards,
      insuranceWager: 0,
      insuranceReturned: 0,
      totalWagered: wager,
      totalReturned: 0,
      net: 0,
    }

    const upcard = dealerCards[0]
    if (upcard.rank === 'A' && this.rules.insurance) {
      this.round.phase = 'insurance'
    } else {
      this.finishPeek()
    }
    return this.round
  }

  takeInsurance() {
    this.requirePhase('insurance')
    const wager = this.round.hands[0].wager / 2
    this.round.insuranceWager = wager
    this.round.totalWagered += wager
    this.finishPeek()
    return this.round
  }

  declineInsurance() {
    this.requirePhase('insurance')
    this.finishPeek()
    return this.round
  }

  finishPeek() {
    const dealerBlackjack = handValue(this.round.dealerCards).total === 21
    const upcardValue = cardValue(this.round.dealerCards[0])
    if (this.rules.dealerPeeks && (upcardValue === 10 || upcardValue === 11) && dealerBlackjack) {
      this.settleDealerBlackjack()
      return
    }
    if (isBlackjack(this.round.hands[0])) {
      this.round.hands[0].result = 'blackjack'
      this.round.hands[0].returned = this.round.hands[0].wager * (1 + this.rules.blackjackPayout)
      this.finishSettlement()
      return
    }
    this.round.phase = 'player'
  }

  availableActions(): Action[] {
    if (!this.currentRound || this.currentRound.phase !== 'player') return []
    const hand = this.activeHand()
    const actions: Action[] = ['hit', 'stand']
    const twoCards = hand.cards.length === 2
    if (twoCards && (!hand.fromSplit || this.rules.doubleAfterSplit)) actions.push('double')
    if (twoCards && this.round.hands.length < this.rules.maxHands && hand.cards[0].rank === hand.cards[1]?.rank) {
      if (hand.cards[0].rank !== 'A' || this.rules.resplitAces || !hand.fromSplit) actions.push('split')
    }
    if (twoCards && !hand.fromSplit && this.rules.lateSurrender) actions.push('surrender')
    return actions
  }

  act(action: Action) {
    if (!this.availableActions().includes(action)) throw new Error(`Action is not allowed: ${action}`)
    if (action === 'hit') this.hit()
    if (action === 'stand') this.stand()
    if (action === 'double') this.double()
    if (action === 'split') this.split()
    if (action === 'surrender') this.surrender()
    return this.round
  }

  hit() {
    const hand = this.activeHand()
    hand.cards.push(this.draw())
    const value = handValue(hand.cards)
    if (value.bust) {
      hand.result = 'bust'
      this.advanceHand()
    } else if (value.total === 21) {
      hand.stood = true
      this.advanceHand()
    }
  }

  stand() {
    this.activeHand().stood = true
    this.advanceHand()
  }

  double() {
    const hand = this.activeHand()
    hand.wager *= 2
    hand.doubled = true
    this.round.totalWagered += hand.wager / 2
    hand.cards.push(this.draw())
    if (handValue(hand.cards).bust) hand.result = 'bust'
    else hand.stood = true
    this.advanceHand()
  }

  split() {
    const index = this.round.activeHandIndex
    const hand = this.activeHand()
    const splitCard = hand.cards[1]
    if (!splitCard) throw new Error('Splitting requires two cards')
    const isAce = hand.cards[0].rank === 'A'
    const first = newHand([hand.cards[0], this.draw()], hand.wager, { fromSplit: true, splitAces: isAce })
    const second = newHand([splitCard, this.draw()], hand.wager, { fromSplit: true, splitAces: isAce })
    this.round.totalWagered += hand.wager
    this.round.hands.splice(index, 1, first, second)
    if (isAce && !this.rules.hitSplitAces) {
      first.stood = true
      second.stood = true
      this.round.activeHandIndex += 2
      this.afterPlayerHands()
    }
  }

  surrender() {
    const hand = this.activeHand()
    hand.surrendered = true
    hand.result = 'surrender'
    hand.returned = hand.wager / 2
    this.advanceHand()
  }

  activeHand() {
    const hand = this.round.hands[this.round.activeHandIndex]
    if (!hand) throw new Error('There is no active player hand')
    return hand
  }

  advanceHand() {
    this.round.activeHandIndex += 1
    this.afterPlayerHands()
  }

  afterPlayerHands() {
    if (this.round.activeHandIndex < this.round.hands.length) return
    const liveHand = this.round.hands.some(hand => !hand.result)
    if (!liveHand) {
      this.finishSettlement()
      return
    }
    this.playDealer()
  }

  playDealer() {
    this.round.phase = 'dealer'
    while (true) {
      const value = handValue(this.round.dealerCards)
      const mustHit = value.total < 17 || (value.total === 17 && value.soft && this.rules.dealerHitsSoft17)
      if (!mustHit) break
      this.round.dealerCards.push(this.draw())
    }
    this.settleHands()
  }

  settleDealerBlackjack() {
    if (this.round.insuranceWager) this.round.insuranceReturned = this.round.insuranceWager * 3
    for (const hand of this.round.hands) {
      if (isBlackjack(hand)) {
        hand.result = 'push'
        hand.returned = hand.wager
      } else hand.result = 'dealer-blackjack'
    }
    this.finishSettlement()
  }

  settleHands() {
    const dealer = handValue(this.round.dealerCards)
    for (const hand of this.round.hands) {
      if (hand.result) continue
      const player = handValue(hand.cards)
      if (player.bust) hand.result = 'bust'
      else if (dealer.bust || player.total > dealer.total) {
        hand.result = 'win'
        hand.returned = hand.wager * 2
      } else if (player.total === dealer.total) {
        hand.result = 'push'
        hand.returned = hand.wager
      } else hand.result = 'lose'
    }
    this.finishSettlement()
  }

  finishSettlement() {
    this.round.phase = 'settled'
    this.round.totalReturned = this.round.insuranceReturned + this.round.hands.reduce((sum, hand) => sum + hand.returned, 0)
    this.round.net = this.round.totalReturned - this.round.totalWagered
  }

  requirePhase(phase: Round['phase']) {
    if (!this.round || this.round.phase !== phase) throw new Error(`Expected ${phase} phase`)
  }
}

export function basicStrategy(game: BlackjackGame): Action {
  const hand = game.activeHand()
  const allowed = new Set(game.availableActions())
  const dealer = cardValue(game.round.dealerCards[0])
  const value = handValue(hand.cards)
  const pair = hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1]?.rank
  const choose = (preferred: Action, fallback: Action = 'hit'): Action => allowed.has(preferred) ? preferred : fallback

  if (pair && allowed.has('split')) {
    const rank = hand.cards[0].rank
    if (rank === 'A' || rank === '8') return 'split'
    if (['2', '3'].includes(rank) && dealer >= 2 && dealer <= 7) return 'split'
    if (rank === '4' && dealer >= 5 && dealer <= 6) return 'split'
    if (rank === '6' && dealer >= 2 && dealer <= 6) return 'split'
    if (rank === '7' && dealer >= 2 && dealer <= 7) return 'split'
    if (rank === '9' && ((dealer >= 2 && dealer <= 6) || dealer === 8 || dealer === 9)) return 'split'
  }

  if (!value.soft && allowed.has('surrender') && ((value.total === 16 && dealer >= 9) || (value.total === 15 && dealer === 10))) return 'surrender'

  if (value.soft && value.total <= 20) {
    if (value.total <= 14) return dealer >= 5 && dealer <= 6 ? choose('double') : 'hit'
    if (value.total <= 16) return dealer >= 4 && dealer <= 6 ? choose('double') : 'hit'
    if (value.total === 17) return dealer >= 3 && dealer <= 6 ? choose('double') : 'hit'
    if (value.total === 18) {
      if (dealer >= 3 && dealer <= 6) return choose('double', 'stand')
      return dealer === 2 || dealer === 7 || dealer === 8 ? 'stand' : 'hit'
    }
    return 'stand'
  }

  if (value.total <= 8) return 'hit'
  if (value.total === 9) return dealer >= 3 && dealer <= 6 ? choose('double') : 'hit'
  if (value.total === 10) return dealer >= 2 && dealer <= 9 ? choose('double') : 'hit'
  if (value.total === 11) return dealer >= 2 && dealer <= 10 ? choose('double') : 'hit'
  if (value.total === 12) return dealer >= 4 && dealer <= 6 ? 'stand' : 'hit'
  if (value.total <= 16) return dealer >= 2 && dealer <= 6 ? 'stand' : 'hit'
  return 'stand'
}

export function simulateBlackjack({ rounds = 100000, seed = 1, rules = STANDARD_RULES }: { rounds?: number; seed?: number; rules?: Partial<Rules> } = {}) {
  const game = new BlackjackGame({ rules, random: createSeededRandom(seed) })
  const results = { rounds, seed, initialWagered: rounds, totalWagered: 0, totalReturned: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, surrenders: 0, net: 0, rtpOnTotalAction: 0, houseEdgeOnInitialWager: 0 }
  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    game.startRound(1)
    if (game.round.phase === 'insurance') game.declineInsurance()
    while (game.round.phase === 'player') game.act(basicStrategy(game))
    results.totalWagered += game.round.totalWagered
    results.totalReturned += game.round.totalReturned
    for (const hand of game.round.hands) {
      if (hand.result === 'win' || hand.result === 'blackjack') results.wins += 1
      else if (hand.result === 'push') results.pushes += 1
      else results.losses += 1
      if (hand.result === 'blackjack') results.blackjacks += 1
      if (hand.result === 'surrender') results.surrenders += 1
    }
  }
  results.net = results.totalReturned - results.totalWagered
  results.rtpOnTotalAction = results.totalReturned / results.totalWagered
  results.houseEdgeOnInitialWager = -results.net / results.initialWagered
  return results
}
