#!/usr/bin/env node
import { simulateBlackjack, STANDARD_RULES } from '../game/blackjack.ts'

function argument(name: string, fallback: number) {
  const prefix = `--${name}=`
  const value = process.argv.find(item => item.startsWith(prefix))?.slice(prefix.length)
  return value === undefined ? fallback : Number(value)
}

const rounds = argument('rounds', 1_000_000)
const seed = argument('seed', 20261017)
if (!Number.isSafeInteger(rounds) || rounds < 1 || !Number.isSafeInteger(seed)) {
  console.error('Usage: npm run simulate -- --rounds=1000000 --seed=20261017')
  process.exit(1)
}

const result = simulateBlackjack({ rounds, seed })
const percent = (value: number) => `${(value * 100).toFixed(4)}%`

console.log(`Blackjack simulation (${rounds.toLocaleString()} rounds, seed ${seed})`)
console.log(`Rules: ${STANDARD_RULES.decks} decks, S17, 3:2 blackjack, DAS, late surrender, up to ${STANDARD_RULES.maxHands} hands, split aces once`)
console.log(`Initial wagers: ${result.initialWagered.toLocaleString()} units`)
console.log(`Total action (splits/doubles included): ${result.totalWagered.toLocaleString()} units`)
console.log(`Returned: ${result.totalReturned.toLocaleString()} units`)
console.log(`Net: ${result.net.toLocaleString()} units`)
console.log(`House edge / initial wager: ${percent(result.houseEdgeOnInitialWager)}`)
console.log(`RTP / total action: ${percent(result.rtpOnTotalAction)}`)
console.log(`Hands: ${result.wins.toLocaleString()} wins, ${result.losses.toLocaleString()} losses, ${result.pushes.toLocaleString()} pushes`)
