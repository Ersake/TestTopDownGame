import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function getDatabaseUrl(): string | null {
    return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || null;
}

export function getPostgresPool(): Pool {
    const connectionString = getDatabaseUrl();
    if (!connectionString) {
        throw new Error("DATABASE_URL or NEON_DATABASE_URL is required for Postgres storage.");
    }

    if (!pool) {
        pool = new Pool({
            connectionString,
            ssl: connectionString.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
            max: Number(process.env.POSTGRES_POOL_MAX) || 5,
        });
    }

    return pool;
}

export async function ensureStorageSchema(): Promise<void> {
    if (!schemaReady) {
        schemaReady = getPostgresPool().query(`
            CREATE TABLE IF NOT EXISTS game_characters (
                id TEXT PRIMARY KEY,
                owner_key_hash TEXT NOT NULL,
                document JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_game_characters_owner_last_played
                ON game_characters (owner_key_hash, last_played_at DESC);

            CREATE TABLE IF NOT EXISTS game_maps (
                name TEXT PRIMARY KEY,
                document JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `).then(() => undefined, (error) => {
            schemaReady = null;
            throw error;
        });
    }

    return schemaReady;
}
