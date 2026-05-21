import { getPool, ensureSchema } from './db'
import type { Game, GameCard } from './types'

let schemaReady: Promise<void> | null = null
function ready() {
  if (!schemaReady) schemaReady = ensureSchema()
  return schemaReady
}

export async function saveGame(game: Game): Promise<void> {
  await ready()
  await getPool().query(
    `INSERT INTO games (id, data) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [game.id, JSON.stringify(game)]
  )
}

export async function getGame(id: string): Promise<Game | null> {
  await ready()
  const result = await getPool().query('SELECT data FROM games WHERE id = $1', [id])
  if (result.rows.length === 0) return null
  return result.rows[0].data as Game
}

export async function updateGameCards(id: string, cards: GameCard[]): Promise<Game | null> {
  const game = await getGame(id)
  if (!game) return null
  const updated = { ...game, cards }
  await saveGame(updated)
  return updated
}
