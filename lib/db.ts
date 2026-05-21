import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { pgPool?: Pool }

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
  })
}

// Reuse pool across hot reloads in dev
export const pool = globalForPg.pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool

/** Ensure the tables exist (runs once on first use) */
export async function ensureSchema(): Promise<void> {
  await pool.query(`
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
}
