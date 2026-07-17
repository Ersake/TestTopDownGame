import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    CharacterStorage,
    hashOwnerKey,
    normalizeCharacterId,
    sanitizeCharacterDisplayName,
    toCharacterSummary,
} from "../src/characters/CharacterStorage";
import { MapStorage, normalizeMapName } from "../src/maps/MapStorage";

const OWNER_ONE = "owner-key-0000000000000001";
const OWNER_TWO = "owner-key-0000000000000002";

async function withTemporaryDirectory(prefix: string, run: (directory: string) => Promise<void>): Promise<void> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    try {
        await run(directory);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
}

test("character identifiers, owner keys, and display names are normalized at the boundary", () => {
    assert.equal(normalizeCharacterId("char_12345678-1234-1234-1234-123456789abc"), "char_12345678-1234-1234-1234-123456789abc");
    assert.equal(normalizeCharacterId("../character.json"), null);
    assert.equal(hashOwnerKey("short"), null);
    assert.match(hashOwnerKey(OWNER_ONE) ?? "", /^[a-f0-9]{64}$/);
    assert.equal(sanitizeCharacterDisplayName("  Test!!  hero  123 "), "TEST HERO");
    assert.equal(sanitizeCharacterDisplayName("123"), "PLAYER");
});

test("file character storage enforces ownership and omits the owner hash from summaries", async () => {
    await withTemporaryDirectory("shmup-characters-", async (directory) => {
        const storage = new CharacterStorage(directory);
        const created = await storage.create(OWNER_ONE, "Ranger");

        assert.equal(created.displayName, "RANGER");
        assert.equal((await storage.listForOwner(OWNER_ONE)).length, 1);
        assert.equal((await storage.listForOwner(OWNER_TWO)).length, 0);
        assert.equal(await storage.loadOwned(OWNER_TWO, created.id), null);
        assert.equal("ownerKeyHash" in toCharacterSummary(created), false);
        assert.equal(await storage.deleteOwned(OWNER_TWO, created.id), false);
        assert.equal(await storage.deleteOwned(OWNER_ONE, created.id), true);
        assert.equal(await storage.loadOwned(OWNER_ONE, created.id), null);
    });
});

test("map names reject traversal and file map storage round-trips authored documents", async () => {
    assert.equal(normalizeMapName(" Level One "), "level-one");
    assert.equal(normalizeMapName("../level-one"), null);
    assert.equal(normalizeMapName(""), null);

    await withTemporaryDirectory("shmup-maps-", async (directory) => {
        const storage = new MapStorage(directory);
        const document = {
            version: 1,
            name: "level-one",
            width: 240,
            height: 135,
            chunks: [{ id: "0,0", layer1: "AA==", layer2: "AA==" }],
            enchantmentTables: [{ col: 4, row: 5 }],
            craftingTables: [{ col: 8, row: 9 }],
        };

        assert.equal(await storage.exists(document.name), false);
        await storage.save(document);
        assert.equal(await storage.exists(document.name), true);
        assert.deepEqual(await storage.list(), [document.name]);
        assert.deepEqual(await storage.load(document.name), document);
    });
});
