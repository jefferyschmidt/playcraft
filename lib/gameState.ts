import { pool, ensureSchema } from './db'
import type { SharedGameState, PlayerStats } from './types'

let schemaReady: Promise<void> | null = null
function getSchema() {
  if (!schemaReady) schemaReady = ensureSchema()
  return schemaReady
}

export function emptyStats(): PlayerStats {
  return {
    truths: 0, dares: 0, chickens: 0,
    correct: 0, incorrect: 0,
    haveCount: 0,
    agrees: 0, disagrees: 0, wilds: 0,
    votesReceived: 0,
  }
}

export function bumpStat(s: PlayerStats, key: keyof PlayerStats, by = 1): PlayerStats {
  return { ...s, [key]: (s[key] ?? 0) + by }
}

export async function getState(gameId: string): Promise<SharedGameState | null> {
  await getSchema()
  const result = await pool.query('SELECT data FROM game_states WHERE game_id = $1', [gameId])
  if (result.rows.length === 0) return null
  return result.rows[0].data as SharedGameState
}

export async function saveState(gameId: string, state: SharedGameState): Promise<void> {
  await getSchema()
  await pool.query(
    `INSERT INTO game_states (game_id, data) VALUES ($1, $2)
     ON CONFLICT (game_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [gameId, JSON.stringify(state)]
  )
}

export function createInitialState(players: string[], gameType: string): SharedGameState {
  const scores: Record<string, number> = {}
  const lives: Record<string, number> = {}
  const stats: Record<string, PlayerStats> = {}
  for (const p of players) {
    scores[p] = gameType === 'never-have-i-ever' ? 100 : 0
    lives[p] = 3
    stats[p] = emptyStats()
  }
  return {
    phase: 'playing',
    cardIndex: 0,
    playerTurnIndex: 0,
    scores,
    lives,
    stats,
    revealed: false,
    ante: null,
    currentCardId: null,
    votes: {},
    wyrGroupStats: {},
    ca: gameType === 'cards-against' ? {
      roundIndex: 0,
      czarIndex: 0,
      phase: 'pick',
      pickerIndex: 0,
      submissions: [],
      winner: null,
      hands: {},
      usedResponseIds: [],
    } : null,
    version: 0,
  }
}
