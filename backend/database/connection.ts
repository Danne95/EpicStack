import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

// Leave headroom for migrations and other processes on small database plans.
const POOL_SIZE = 5;
// Bound database work below the client's eight-second HTTP timeout.
const DATABASE_TIMEOUT_MS = 5_000;
const IDLE_CONNECTION_MS = 30_000;

export function databaseConfig(env: NodeJS.ProcessEnv): PoolConfig | null {
  if (!env.DATABASE_URL?.trim()) {
    if ('DATABASE_URL' in env || env.NODE_ENV === 'production')
      throw new Error('A non-empty DATABASE_URL is required for database mode and production.');
    return null;
  }
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname)
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  // pg lets URL SSL parameters override the ssl object. Keep verified TLS explicit.
  if (
    ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl', 'uselibpqcompat'].some((key) =>
      url.searchParams.has(key),
    )
  )
    throw new Error(
      'Remove SSL query options from DATABASE_URL; use DATABASE_CA_FILE for a custom CA.',
    );
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const ca = env.DATABASE_CA_FILE ? readFileSync(env.DATABASE_CA_FILE, 'utf8') : undefined;
  return {
    connectionString: env.DATABASE_URL,
    ssl:
      local && env.NODE_ENV !== 'production'
        ? false
        : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: POOL_SIZE,
    connectionTimeoutMillis: DATABASE_TIMEOUT_MS,
    statement_timeout: DATABASE_TIMEOUT_MS,
    idle_in_transaction_session_timeout: DATABASE_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_CONNECTION_MS,
  };
}

export function createDatabasePool(config: PoolConfig): Pool {
  const pool = new Pool(config);
  // Idle socket failures must not crash the server or print credentials/SQL payloads.
  pool.on('error', () =>
    console.error('Database connection interrupted; subsequent requests will reconnect.'),
  );
  return pool;
}
