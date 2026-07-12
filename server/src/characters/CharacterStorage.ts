import { randomUUID, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface CharacterUpgradeSnapshot {
    axeSwingSpeedUpgrades: number;
    axePrimaryDamageUpgrades: number;
    axeWhirlwindCooldownUpgrades: number;
    axeWhirlwindAoeUpgrades: number;
    axeWhirlwindDamageUpgrades: number;
    bowDamageUpgrades: number;
    bowPierceUpgrades: number;
    bowChargeTimeUpgrades: number;
    bowVolleyCooldownUpgrades: number;
    bowVolleyAoeUpgrades: number;
    bowVolleyDamageUpgrades: number;
    shieldPrimaryAttackSpeedUpgrades: number;
    shieldPrimaryDamageUpgrades: number;
    shieldMaxHpUpgrades: number;
    shieldRechargeUpgrades: number;
    shieldSizeUpgrades: number;
    woodGatherUpgrades: number;
}

export interface StoredCharacterDocument {
    version: number;
    id: string;
    ownerKeyHash: string;
    displayName: string;
    level: number;
    experience: number;
    experienceToNext: number;
    pendingUpgradeChoices: number;
    outfitColor: number;
    upgrades: CharacterUpgradeSnapshot;
    createdAt: string;
    updatedAt: string;
    lastPlayedAt: string;
}

export type CharacterSummary = Omit<StoredCharacterDocument, "ownerKeyHash">;

export const EMPTY_CHARACTER_UPGRADES: CharacterUpgradeSnapshot = {
    axeSwingSpeedUpgrades: 0,
    axePrimaryDamageUpgrades: 0,
    axeWhirlwindCooldownUpgrades: 0,
    axeWhirlwindAoeUpgrades: 0,
    axeWhirlwindDamageUpgrades: 0,
    bowDamageUpgrades: 0,
    bowPierceUpgrades: 0,
    bowChargeTimeUpgrades: 0,
    bowVolleyCooldownUpgrades: 0,
    bowVolleyAoeUpgrades: 0,
    bowVolleyDamageUpgrades: 0,
    shieldPrimaryAttackSpeedUpgrades: 0,
    shieldPrimaryDamageUpgrades: 0,
    shieldMaxHpUpgrades: 0,
    shieldRechargeUpgrades: 0,
    shieldSizeUpgrades: 0,
    woodGatherUpgrades: 0,
};

const CHARACTER_SAVE_VERSION = 1;
const DEFAULT_EXPERIENCE_TO_NEXT = 10;
const DEFAULT_OUTFIT_COLOR = 4;
export const MAX_CHARACTERS_PER_PLAYER = 5;

export function normalizeCharacterId(value: unknown): string | null {
    if (typeof value !== "string") return null;
    return /^char_[a-f0-9-]{36}$/.test(value) ? value : null;
}

export function hashOwnerKey(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const key = value.trim();
    if (key.length < 24 || key.length > 128) return null;
    return createHash("sha256").update(key).digest("hex");
}

export function sanitizeCharacterDisplayName(value: unknown): string {
    const name = String(value ?? "")
        .toUpperCase()
        .replace(/[^A-Z ]/g, "")
        .replace(/ +/g, " ")
        .trim()
        .slice(0, 12)
        .trim();
    return name || "PLAYER";
}

export function toCharacterSummary(document: StoredCharacterDocument): CharacterSummary {
    const { ownerKeyHash: _ownerKeyHash, ...summary } = document;
    return summary;
}

function numberOrDefault(value: unknown, fallback: number): number {
    return Number.isFinite(value) ? Math.floor(Number(value)) : fallback;
}

function normalizeDocument(value: unknown): StoredCharacterDocument | null {
    const input = value as Partial<StoredCharacterDocument> | null;
    if (!input || typeof input !== "object") return null;
    const id = normalizeCharacterId(input.id);
    if (!id || typeof input.ownerKeyHash !== "string" || !/^[a-f0-9]{64}$/.test(input.ownerKeyHash)) return null;
    const now = new Date().toISOString();
    const upgrades = { ...EMPTY_CHARACTER_UPGRADES, ...(input.upgrades || {}) };

    return {
        version: CHARACTER_SAVE_VERSION,
        id,
        ownerKeyHash: input.ownerKeyHash,
        displayName: sanitizeCharacterDisplayName(input.displayName),
        level: Math.max(1, numberOrDefault(input.level, 1)),
        experience: Math.max(0, numberOrDefault(input.experience, 0)),
        experienceToNext: Math.max(1, numberOrDefault(input.experienceToNext, DEFAULT_EXPERIENCE_TO_NEXT)),
        pendingUpgradeChoices: Math.max(0, numberOrDefault(input.pendingUpgradeChoices, 0)),
        outfitColor: Math.max(0, numberOrDefault(input.outfitColor, DEFAULT_OUTFIT_COLOR)),
        upgrades: Object.fromEntries(
            Object.entries(EMPTY_CHARACTER_UPGRADES).map(([key]) => [
                key,
                Math.max(0, numberOrDefault((upgrades as Record<string, unknown>)[key], 0)),
            ]),
        ) as unknown as CharacterUpgradeSnapshot,
        createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
        updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now,
        lastPlayedAt: typeof input.lastPlayedAt === "string" ? input.lastPlayedAt : now,
    };
}

export class CharacterStorage {
    private readonly saveQueues = new Map<string, Promise<void>>();

    constructor(private readonly directory = path.resolve(process.env.CHARACTER_STORAGE_DIR || path.join(process.cwd(), "characters"))) {}

    private filePath(id: string): string {
        return path.join(this.directory, `${id}.json`);
    }

    private async writeDocument(document: StoredCharacterDocument, payload: string): Promise<void> {
        await fs.mkdir(this.directory, { recursive: true });
        const target = this.filePath(document.id);
        const temporary = path.join(this.directory, `.${document.id}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`);
        await fs.writeFile(temporary, payload, "utf8");
        await fs.rename(temporary, target);
    }

    async create(ownerKey: unknown, displayName: unknown): Promise<StoredCharacterDocument> {
        const ownerKeyHash = hashOwnerKey(ownerKey);
        if (!ownerKeyHash) throw new Error("Invalid player key.");
        const existingCharacters = await this.listForOwner(ownerKey);
        if (existingCharacters.length >= MAX_CHARACTERS_PER_PLAYER) {
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
        await this.save(document);
        return document;
    }

    async listForOwner(ownerKey: unknown): Promise<StoredCharacterDocument[]> {
        const ownerKeyHash = hashOwnerKey(ownerKey);
        if (!ownerKeyHash) throw new Error("Invalid player key.");

        let entries;
        try {
            entries = await fs.readdir(this.directory, { withFileTypes: true });
        } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
            throw error;
        }

        const documents: StoredCharacterDocument[] = [];
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
            try {
                const content = await fs.readFile(path.join(this.directory, entry.name), "utf8");
                const document = normalizeDocument(JSON.parse(content));
                if (document?.ownerKeyHash === ownerKeyHash) documents.push(document);
            } catch (_error) {
                // Ignore malformed character files so one bad save does not break the menu.
            }
        }

        return documents.sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));
    }

    async loadOwned(ownerKey: unknown, id: unknown): Promise<StoredCharacterDocument | null> {
        const ownerKeyHash = hashOwnerKey(ownerKey);
        const characterId = normalizeCharacterId(id);
        if (!ownerKeyHash || !characterId) return null;

        try {
            const content = await fs.readFile(this.filePath(characterId), "utf8");
            const document = normalizeDocument(JSON.parse(content));
            if (!document || document.ownerKeyHash !== ownerKeyHash) return null;
            return document;
        } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
            throw error;
        }
    }

    async deleteOwned(ownerKey: unknown, id: unknown): Promise<boolean> {
        const character = await this.loadOwned(ownerKey, id);
        if (!character) return false;

        try {
            await fs.unlink(this.filePath(character.id));
            return true;
        } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
            throw error;
        }
    }

    async save(document: StoredCharacterDocument): Promise<void> {
        const payload = `${JSON.stringify(document, null, 2)}\n`;
        const previousSave = this.saveQueues.get(document.id) || Promise.resolve();
        const nextSave = previousSave
            .catch(() => undefined)
            .then(() => this.writeDocument(document, payload));
        this.saveQueues.set(document.id, nextSave);
        try {
            await nextSave;
        } finally {
            if (this.saveQueues.get(document.id) === nextSave) {
                this.saveQueues.delete(document.id);
            }
        }
    }
}
