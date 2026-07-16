import { ensureStorageSchema, getPostgresPool } from "../db/Postgres";
import { MapStorageBackend, StoredMapDocument, normalizeMapName } from "./MapStorage";

export class PostgresMapStorage implements MapStorageBackend {
    async exists(name: string): Promise<boolean> {
        await ensureStorageSchema();
        const result = await getPostgresPool().query<{ exists: boolean }>(
            "SELECT EXISTS (SELECT 1 FROM game_maps WHERE name = $1) AS exists",
            [name],
        );
        return result.rows[0]?.exists === true;
    }

    async list(): Promise<string[]> {
        await ensureStorageSchema();
        const result = await getPostgresPool().query<{ name: string }>(
            "SELECT name FROM game_maps ORDER BY name ASC",
        );
        return result.rows
            .map((row) => row.name)
            .filter((name) => normalizeMapName(name) === name);
    }

    async load(name: string): Promise<unknown> {
        await ensureStorageSchema();
        const result = await getPostgresPool().query<{ document: unknown }>(
            "SELECT document FROM game_maps WHERE name = $1",
            [name],
        );
        if (!result.rows[0]) throw new Error("Map not found.");
        return result.rows[0].document;
    }

    async save(document: StoredMapDocument): Promise<void> {
        await ensureStorageSchema();
        await getPostgresPool().query(
            `INSERT INTO game_maps (name, document, updated_at)
             VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (name) DO UPDATE
             SET document = EXCLUDED.document,
                 updated_at = NOW()`,
            [document.name, JSON.stringify(document)],
        );
    }
}
