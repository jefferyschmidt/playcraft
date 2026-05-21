import { NextRequest, NextResponse } from 'next/server'
import { getState, saveState, createInitialState, emptyStats, bumpStat } from '@/lib/gameState'
import { getGame } from '@/lib/store'
import type { SharedGameState, CardsAgainstCard, PlayerStats, TriviaCard, WouldYouRatherCard } from '@/lib/types'

const HAND_SIZE = 7

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function initCaHands(state: SharedGameState, game: Awaited<ReturnType<typeof getGame>>, players: string[]): SharedGameState {
  if (!state.ca || !game || players.length < 2) return state
  const responses = shuffle(
    game.cards.filter((c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'response')
  )
  const hands: Record<string, string[]> = {}
  let idx = 0
  for (const p of players) {
    hands[p] = responses.slice(idx, idx + HAND_SIZE).map(c => c.id)
    idx += HAND_SIZE
  }
  const usedResponseIds = responses.slice(0, idx).map(c => c.id)
  return { ...state, ca: { ...state.ca, hands, usedResponseIds } }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const game = await getGame(id)
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  let state = await getState(id)
  if (!state) {
    const players = game.config.players.filter(p => p.trim())
    state = createInitialState(players, game.config.type)
    if (game.config.type === 'cards-against') state = initCaHands(state, game, players)
    await saveState(id, state)
  }
  return NextResponse.json(state)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const game = await getGame(id)
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const body = await req.json() as Record<string, unknown>
  const action = body.action as string
  const player = body.player as string | undefined

  let state = await getState(id)
  if (!state) {
    const players = game.config.players.filter(p => p.trim())
    state = createInitialState(players, game.config.type)
    if (game.config.type === 'cards-against') state = initCaHands(state, game, players)
  }

  const players = game.config.players.filter(p => p.trim())
  const filteredCards = (() => {
    const f = game.config.cardFilter
    if (game.config.type !== 'truth-or-dare' || !f || f === 'both') return game.cards
    const kind = f === 'truths-only' ? 'truth' : 'dare'
    return game.cards.filter(c => 'kind' in c ? (c as { kind: string }).kind === kind : true)
  })()

  const next: SharedGameState = { ...state }

  switch (action) {
    /* ── Truth or Dare ───────────────────────────────────── */
    case 'reveal': {
      // Optionally set ante alongside reveal (combined lock-in action)
      if (body.ante !== undefined) next.ante = body.ante as number
      next.revealed = true
      next.currentCardId = filteredCards[state.cardIndex]?.id ?? null
      break
    }
    case 'complete': {
      const { points, kind } = body as { points: number; kind: 'truth' | 'dare' }
      const cp = players[state.playerTurnIndex % players.length]
      if (cp) {
        next.scores = { ...state.scores, [cp]: (state.scores[cp] ?? 0) + points }
        const sk: keyof PlayerStats = kind === 'dare' ? 'dares' : 'truths'
        next.stats = { ...state.stats, [cp]: bumpStat(state.stats[cp] ?? emptyStats(), sk) }
      }
      next.ante = null; next.currentCardId = null; next.revealed = false; next.votes = {}
      next.cardIndex = state.cardIndex + 1
      next.playerTurnIndex = state.playerTurnIndex + 1
      if (next.cardIndex >= filteredCards.length) next.phase = 'done'
      break
    }
    case 'chicken': {
      const cp = players[state.playerTurnIndex % players.length]
      if (cp) {
        next.lives = { ...state.lives, [cp]: Math.max(0, (state.lives[cp] ?? 3) - 1) }
        next.stats = { ...state.stats, [cp]: bumpStat(state.stats[cp] ?? emptyStats(), 'chickens') }
      }
      next.ante = null; next.currentCardId = null; next.revealed = false; next.votes = {}
      next.cardIndex = state.cardIndex + 1
      next.playerTurnIndex = state.playerTurnIndex + 1
      if (next.cardIndex >= filteredCards.length) next.phase = 'done'
      break
    }

    /* ── Vote (individual choice per player) ────────────── */
    case 'vote': {
      if (!player) break
      const choice = body.choice as string | number
      const v = { ...(state.votes as Record<string, unknown>), [player]: choice }
      next.votes = v
      // NHIE
      if (game.config.type === 'never-have-i-ever' && choice === 'have') {
        next.scores = { ...state.scores, [player]: Math.max(0, (state.scores[player] ?? 100) - 10) }
        next.stats = { ...state.stats, [player]: bumpStat(state.stats[player] ?? emptyStats(), 'haveCount') }
      }
      // Hot takes
      if (game.config.type === 'hot-takes') {
        const r = choice as 'agrees' | 'disagrees' | 'wilds'
        if (['agrees', 'disagrees', 'wilds'].includes(r))
          next.stats = { ...state.stats, [player]: bumpStat(state.stats[player] ?? emptyStats(), r) }
      }
      // MLT — bump stat for nominee, recompute scores
      if (game.config.type === 'most-likely-to') {
        const nominee = choice as string
        next.stats = { ...state.stats, [nominee]: bumpStat(state.stats[nominee] ?? emptyStats(), 'votesReceived') }
      }
      // Trivia — current player answers
      if (game.config.type === 'trivia') {
        const card = filteredCards[state.cardIndex] as TriviaCard
        const correct = Number(choice) === card.answerIndex
        if (correct) next.scores = { ...state.scores, [player]: (state.scores[player] ?? 0) + 1 }
        next.stats = { ...state.stats, [player]: bumpStat(state.stats[player] ?? emptyStats(), correct ? 'correct' : 'incorrect') }
      }
      break
    }

    /* ── Advance ─────────────────────────────────────────── */
    case 'advance': {
      // WYR: capture group stats from individual votes
      if (game.config.type === 'would-you-rather') {
        const card = filteredCards[state.cardIndex] as WouldYouRatherCard
        const voteMap = state.votes as Record<string, string>
        const aCount = Object.values(voteMap).filter(v => v === 'a').length
        const bCount = Object.values(voteMap).filter(v => v === 'b').length
        next.wyrGroupStats = {
          ...state.wyrGroupStats,
          [card.id]: { a: aCount, b: bCount, labelA: card.optionA.slice(0, 30), labelB: card.optionB.slice(0, 30) },
        }
      }
      // MLT: award a point to most-voted player
      if (game.config.type === 'most-likely-to') {
        const voteMap = state.votes as Record<string, string>
        const counts: Record<string, number> = {}
        for (const nominee of Object.values(voteMap)) counts[nominee] = (counts[nominee] ?? 0) + 1
        const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0]
        if (top) next.scores = { ...state.scores, [top]: (state.scores[top] ?? 0) + 1 }
      }
      next.votes = {}; next.revealed = false
      next.cardIndex = state.cardIndex + 1
      next.playerTurnIndex = state.playerTurnIndex + 1
      if (next.cardIndex >= filteredCards.length) next.phase = 'done'
      break
    }

    /* ── Cards Against ───────────────────────────────────── */
    case 'ca_pick': {
      if (!state.ca || !player) break
      const { cardId } = body as { cardId: string }
      const ca = { ...state.ca }
      ca.submissions = [...ca.submissions, { player, cardId }]
      // Replace card in hand
      const used = new Set([...ca.usedResponseIds, cardId])
      const responses = game.cards.filter(
        (c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'response'
      )
      const newCard = responses.find(c => !used.has(c.id))
      const hand = (ca.hands[player] ?? []).filter(cid => cid !== cardId)
      ca.hands = { ...ca.hands, [player]: newCard ? [...hand, newCard.id] : hand }
      if (newCard) ca.usedResponseIds = [...ca.usedResponseIds, newCard.id]
      // Transition to judge once all non-czar players submitted
      const nonCzar = players.filter((_, i) => i !== ca.czarIndex % players.length)
      if (ca.submissions.length >= nonCzar.length) ca.phase = 'judge'
      next.ca = ca
      break
    }
    case 'ca_judge': {
      if (!state.ca) break
      const { winner: w } = body as { winner: string }
      next.ca = { ...state.ca, winner: w, phase: 'winner' }
      next.scores = { ...state.scores, [w]: (state.scores[w] ?? 0) + 1 }
      next.stats = { ...state.stats, [w]: bumpStat(state.stats[w] ?? emptyStats(), 'votesReceived') }
      break
    }
    case 'ca_next_round': {
      if (!state.ca) break
      const prompts = game.cards.filter(
        (c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'prompt'
      )
      if (state.ca.roundIndex + 1 >= prompts.length) { next.phase = 'done'; break }
      next.ca = {
        ...state.ca,
        roundIndex: state.ca.roundIndex + 1,
        czarIndex: state.ca.czarIndex + 1,
        phase: 'pick',
        pickerIndex: 0,
        submissions: [],
        winner: null,
      }
      break
    }

    /* ── Reset ───────────────────────────────────────────── */
    case 'reset': {
      const fp = game.config.players.filter(p => p.trim())
      let fresh = createInitialState(fp, game.config.type)
      if (game.config.type === 'cards-against') fresh = initCaHands(fresh, game, fp)
      await saveState(id, fresh)
      return NextResponse.json(fresh)
    }
  }

  next.version = (state.version ?? 0) + 1
  await saveState(id, next)
  return NextResponse.json(next)
}
