import { describe, expect, test } from 'vitest'
import { type Rank, type Card, BlackjackGame, basicStrategy, createSeededRandom, createShoe, handValue, isBlackjack, simulateBlackjack } from '../../game/blackjack.ts'

const card = (rank: Rank): Card => ({ rank, suit: 'spade' })

describe('blackjack rules engine', () => {
  test('creates a six-deck shoe', () => {
    expect(createShoe()).toHaveLength(312)
  })

  test('values multiple aces correctly', () => {
    expect(handValue([card('A'), card('A'), card('9')])).toEqual({ total: 21, soft: true, bust: false })
    expect(handValue([card('A'), card('A'), card('K'), card('9')])).toEqual({ total: 21, soft: false, bust: false })
  })

  test('only an unsplit two-card 21 is blackjack', () => {
    expect(isBlackjack({ cards: [card('A'), card('K')], fromSplit: false })).toBe(true)
    expect(isBlackjack({ cards: [card('A'), card('K')], fromSplit: true })).toBe(false)
    expect(isBlackjack({ cards: [card('7'), card('7'), card('7')], fromSplit: false })).toBe(false)
  })

  test('offers insurance only before the dealer peek', () => {
    const game = new BlackjackGame({ random: createSeededRandom(4) })
    game.round = {
      phase: 'insurance', hands: [{ cards: [card('10'), card('9')], wager: 10, fromSplit: false, splitAces: false, doubled: false, stood: false, surrendered: false, result: null, returned: 0 }],
      activeHandIndex: 0, dealerCards: [card('A'), card('K')], insuranceWager: 0, insuranceReturned: 0,
      totalWagered: 10, totalReturned: 0, net: 0,
    }
    game.takeInsurance()
    expect(game.round.insuranceWager).toBe(5)
    expect(game.round.insuranceReturned).toBe(15)
    expect(game.round.net).toBe(0)
  })

  test('pays a natural blackjack at 3:2 plus the returned stake', () => {
    const game = new BlackjackGame({ random: createSeededRandom(8) })
    game.round = {
      phase: 'player', hands: [{ cards: [card('A'), card('K')], wager: 10, fromSplit: false, splitAces: false, doubled: false, stood: false, surrendered: false, result: null, returned: 0 }],
      activeHandIndex: 0, dealerCards: [card('9'), card('7')], insuranceWager: 0, insuranceReturned: 0,
      totalWagered: 10, totalReturned: 0, net: 0,
    }
    game.finishPeek()
    expect(game.round.totalReturned).toBe(25)
    expect(game.round.net).toBe(15)
  })

  test('stands on soft 17', () => {
    const game = new BlackjackGame({ random: createSeededRandom(9) })
    game.round = {
      phase: 'player', hands: [{ cards: [card('10'), card('8')], wager: 10, fromSplit: false, splitAces: false, doubled: false, stood: false, surrendered: false, result: null, returned: 0 }],
      activeHandIndex: 0, dealerCards: [card('A'), card('6')], insuranceWager: 0, insuranceReturned: 0,
      totalWagered: 10, totalReturned: 0, net: 0,
    }
    game.act('stand')
    expect(game.round.dealerCards).toHaveLength(2)
    expect(game.round.hands[0].result).toBe('win')
  })

  test('gives each split Ace one card and stops both hands', () => {
    const game = new BlackjackGame({ random: createSeededRandom(12) })
    game.shoe = [card('9'), card('8')]
    game.round = {
      phase: 'player', hands: [{ cards: [card('A'), card('A')], wager: 10, fromSplit: false, splitAces: false, doubled: false, stood: false, surrendered: false, result: null, returned: 0 }],
      activeHandIndex: 0, dealerCards: [card('10'), card('7')], insuranceWager: 0, insuranceReturned: 0,
      totalWagered: 10, totalReturned: 0, net: 0,
    }
    game.act('split')
    expect(game.round.hands).toHaveLength(2)
    expect(game.round.hands.every(hand => hand.cards.length === 2 && hand.stood)).toBe(true)
    expect(game.round.totalWagered).toBe(20)
    expect(game.round.phase).toBe('settled')
  })

  test('offers late surrender only on the original two-card hand', () => {
    const game = new BlackjackGame({ random: createSeededRandom(3) })
    game.round = {
      phase: 'player', hands: [{ cards: [card('10'), card('6')], wager: 10, fromSplit: false, splitAces: false, doubled: false, stood: false, surrendered: false, result: null, returned: 0 }],
      activeHandIndex: 0, dealerCards: [card('10'), card('7')], insuranceWager: 0, insuranceReturned: 0,
      totalWagered: 10, totalReturned: 0, net: 0,
    }
    expect(game.availableActions()).toContain('surrender')
    game.act('surrender')
    expect(game.round.totalReturned).toBe(5)
    expect(game.round.net).toBe(-5)
  })

  test('seeded simulation is repeatable and within a broad casino range', () => {
    const first = simulateBlackjack({ rounds: 100000, seed: 42 })
    const second = simulateBlackjack({ rounds: 100000, seed: 42 })
    expect(second).toEqual(first)
    expect(first.houseEdgeOnInitialWager).toBeGreaterThan(-0.01)
    expect(first.houseEdgeOnInitialWager).toBeLessThan(0.02)
  })

  test.each(['4', '5'] satisfies Rank[])('hits soft %s against a ten instead of surrendering', rank => {
    const game = new BlackjackGame({ random: createSeededRandom(3) })
    game.round = {
      phase: 'player', hands: [{ cards: [card('A'), card(rank)], wager: 10, fromSplit: false, splitAces: false, doubled: false, stood: false, surrendered: false, result: null, returned: 0 }],
      activeHandIndex: 0, dealerCards: [card('10'), card('7')], insuranceWager: 0, insuranceReturned: 0,
      totalWagered: 10, totalReturned: 0, net: 0,
    }
    expect(basicStrategy(game)).toBe('hit')
  })
})
