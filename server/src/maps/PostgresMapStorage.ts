import { ensureStorageSchema, getPostgresPool } from "../db/Postgres";
import { MapStorage, MapStorageBackend, StoredMapDocument, normalizeMapName } from "./MapStorage";

export class PostgresMapStorage implements MapStorageBackend {
    private readonly fallbackStorage = new MapStorage();

    async exists(name: string): Promise<boolean> {
        await ensureStorageSchema();
        const result = await getPostgresPool().query<{ exists: boolean }>(
            "SELECT EXISTS (SELECT 1 FROM game_maps WHERE name = $1) AS exists",
            [name],
        );
        return result.rows[0]?.exists === true || await this.fallbackStorage.exists(name);
    }

    async list(): Promise<string[]> {
        await ensureStorageSchema();
        const result = await getPostgresPool().query<{ name: string }>(
            "SELECT name FROM game_maps ORDER BY name ASC",
        );
        const databaseNames = result.rows
            .map((row) => row.name)
            .filter((name) => normalizeMapName(name) === name);
        const fallbackNames = await this.fallbackStorage.list();
        return [...new Set([...databaseNames, ...fallbackNames])].sort();
    }

    async load(name: string): Promise<unknown> {
        await ensureStorageSchema();
        const result = await getPostgresPool().query<{ document: unknown }>(
            "SELECT document FROM game_maps WHERE name = $1",
            [name],
        );
        if (result.rows[0]) return result.rows[0].document;

        const fallbackDocument = await this.fallbackStorage.load(name) as StoredMapDocument;
        await this.save(fallbackDocument);
        return fallbackDocument;
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
