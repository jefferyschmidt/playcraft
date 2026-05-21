import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { pgPool?: Pool }

/** Lazily creates the pool on first use — safe to import at build time */
export function getPool(): Pool {
  if (globalForPg.pgPool) return globalForPg.pgPool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const p = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 10 })
  if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = p
  return p
}

let schemaEnsured = false

/** Idempotent: creates tables on first call */
export async function ensureSchema(): Promise<void> {
  if (schemaEnsured) return
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS game_states (
      game_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `)
  schemaEnsured = true
}
