import { randomUUID } from "node:crypto";
import { Pool, PoolClient } from "pg";
import { ensureStorageSchema, getPostgresPool } from "../db/Postgres";
import {
    CharacterStorageBackend,
    EMPTY_CHARACTER_UPGRADES,
    MAX_CHARACTERS_PER_PLAYER,
    StoredCharacterDocument,
    hashOwnerKey,
    normalizeCharacterId,
    normalizeStoredCharacterDocument,
    sanitizeCharacterDisplayName,
} from "./CharacterStorage";

const CHARACTER_SAVE_VERSION = 1;
const DEFAULT_EXPERIENCE_TO_NEXT = 10;
const DEFAULT_OUTFIT_COLOR = 4;

export class PostgresCharacterStorage implements CharacterStorageBackend {
    async create(ownerKey: unknown, displayName: unknown): Promise<StoredCharacterDocument> {
        const ownerKeyHash = hashOwnerKey(ownerKey);
        if (!ownerKeyHash) throw new Error("Invalid player key.");
        await ensureStorageSchema();

        const client = await getPostgresPool().connect();
        try {
            await client.query("BEGIN");
            const countResult = await client.query<{ count: string }>(
                "SELECT COUNT(*)::int AS count FROM game_characters WHERE owner_key_hash = $1",
                [ownerKeyHash],
            );
            if (Number(countResult.rows[0]?.count || 0) >= MAX_CHARACTERS_PER_PLAYER) {
                throw new Error(`Maximum ${MAX_CHARACTERS_PER_PLAYER} characters reached.`);
            }

            const now = new Date().toISOString();
            const document: StoredCharacterDocument = {
                version: CHARACTER_SAVE_VERSION,
                id: `char_${randomUUID()}`,
                ownerKeyHash,
                displayName: sanitizeCharacterDisplayName(displayName),
                level: 1,
                experience: 0,
                experienceToNext: DEFAULT_EXPERIENCE_TO_NEXT,
                pendingUpgradeChoices: 0,
                outfitColor: DEFAULT_OUTFIT_COLOR,
                upgrades: { ...EMPTY_CHARACTER_UPGRADES },
                createdAt: now,
                updatedAt: now,
                lastPlayedAt: now,
            };
            await this.upsertWithClient(client, document);
            await client.query("COMMIT");
            return document;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async listForOwner(ownerKey: unknown): Promise<StoredCharacterDocument[]> {
        const ownerKeyHash = hashOwnerKey(ownerKey);
        if (!ownerKeyHash) throw new Error("Invalid player key.");
        await ensureStorageSchema();

        const result = await getPostgresPool().query<{ document: unknown }>(
            "SELECT document FROM game_characters WHERE owner_key_hash = $1 ORDER BY last_played_at DESC",
            [ownerKeyHash],
        );
        return result.rows
            .map((row) => normalizeStoredCharacterDocument(row.document))
            .filter((document): document is StoredCharacterDocument => !!document && document.ownerKeyHash === ownerKeyHash);
    }

    async loadOwned(ownerKey: unknown, id: unknown): Promise<StoredCharacterDocument | null> {
        const ownerKeyHash = hashOwnerKey(ownerKey);
        const characterId = normalizeCharacterId(id);
        if (!ownerKeyHash || !characterId) return null;
        await ensureStorageSchema();

        const result = await getPostgresPool().query<{ document: unknown }>(
            "SELECT document FROM game_characters WHERE id = $1 AND owner_key_hash = $2",
            [characterId, ownerKeyHash],
        );
        const document = normalizeStoredCharacterDocument(result.rows[0]?.document);
        return document?.ownerKeyHash === ownerKeyHash ? document : null;
    }

    async deleteOwned(ownerKey: unknown, id: unknown): Promise<boolean> {
        const ownerKeyHash = hashOwnerKey(ownerKey);
        const characterId = normalizeCharacterId(id);
        if (!ownerKeyHash || !characterId) return false;
        await ensureStorageSchema();

        const result = await getPostgresPool().query(
            "DELETE FROM game_characters WHERE id = $1 AND owner_key_hash = $2",
            [characterId, ownerKeyHash],
        );
        return (result.rowCount || 0) > 0;
    }

    async save(document: StoredCharacterDocument): Promise<void> {
        await ensureStorageSchema();
        await this.upsertWithClient(getPostgresPool(), document);
    }

    private async upsertWithClient(client: Pool | PoolClient, document: StoredCharacterDocument): Promise<void> {
        await client.query(
            `INSERT INTO game_characters (id, owner_key_hash, document, updated_at, last_played_at)
             VALUES ($1, $2, $3::jsonb, NOW(), $4)
             ON CONFLICT (id) DO UPDATE
             SET owner_key_hash = EXCLUDED.owner_key_hash,
                 document = EXCLUDED.document,
                 updated_at = NOW(),
                 last_played_at = EXCLUDED.last_played_at`,
            [document.id, document.ownerKeyHash, JSON.stringify(document), document.lastPlayedAt],
        );
    }
}
