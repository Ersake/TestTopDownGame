import { Client } from "colyseus.js";

const MAX_MAP_REPLACE_PAYLOAD_BYTES = 512 * 1024;
const DEFAULT_SERVER_URL = "ws://localhost:2567";
const PLAYER_KEY_STORAGE_KEY = 'testtopdown-player-key';
const SELECTED_CHARACTER_STORAGE_KEY = 'testtopdown-selected-character-id';
const CHARACTER_CACHE_STORAGE_KEY = 'testtopdown-character-cache';

function normalizeServerUrl(url) {
    return String(url || '').trim();
}

function normalizeHttpUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

function deriveApiBaseUrl(serverUrl) {
    const normalized = normalizeServerUrl(serverUrl);
    if (!normalized) return '';

    try {
        const parsed = new URL(normalized);
        parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : parsed.protocol === 'ws:' ? 'http:' : parsed.protocol;
        parsed.pathname = '';
        parsed.search = '';
        parsed.hash = '';
        return normalizeHttpUrl(parsed.toString());
    } catch (_error) {
        if (normalized.startsWith('wss://')) return normalizeHttpUrl(`https://${normalized.slice(6).split('/')[0]}`);
        if (normalized.startsWith('ws://')) return normalizeHttpUrl(`http://${normalized.slice(5).split('/')[0]}`);
        return normalizeHttpUrl(normalized);
    }
}

function makeServerOption(label, url, apiUrl = '') {
    const normalizedUrl = normalizeServerUrl(url);
    if (!normalizedUrl) return null;
    return {
        label,
        url: normalizedUrl,
        apiUrl: normalizeHttpUrl(apiUrl) || deriveApiBaseUrl(normalizedUrl),
    };
}

const SERVER_OPTIONS = [
    makeServerOption(
        'SERVER 1',
        import.meta.env.VITE_SERVER_URL_1 || import.meta.env.VITE_SERVER_URL || DEFAULT_SERVER_URL,
        import.meta.env.VITE_SERVER_API_URL_1 || import.meta.env.VITE_SERVER_API_URL,
    ),
    makeServerOption(
        'SERVER 2',
        import.meta.env.VITE_SERVER_URL_2,
        import.meta.env.VITE_SERVER_API_URL_2,
    ),
].filter(Boolean);

/**
 * RoomClient
 * A singleton that manages the Colyseus connection.
 * Call RoomClient.connect() once before starting Phaser,
 * then access RoomClient.room / RoomClient.sessionId anywhere.
 */
class RoomClient {
    /** @type {import("colyseus.js").Room | null} */
    room = null;

    /** @type {string | null} */
    sessionId = null;

    playerName = '';

    selectedCharacterId = this._loadSelectedCharacterId();

    /** @type {Client | null} */
    _client = null;

    _selectedServerIndex = 0;

    /** @private Initialise the Colyseus Client if not already done. */
    _ensureClient() {
        if (!this._client) {
            this._client = new Client(this.getSelectedServer().url);
        }
    }

    _getApiBaseUrl() {
        return this.getSelectedServer().apiUrl;
    }

    _loadSelectedCharacterId() {
        try { return window.localStorage?.getItem(SELECTED_CHARACTER_STORAGE_KEY) || ''; } catch (_error) { return ''; }
    }

    refreshSelectedCharacterId() {
        this.selectedCharacterId = this._loadSelectedCharacterId();
        return this.selectedCharacterId;
    }

    _saveSelectedCharacterId(characterId) {
        this.selectedCharacterId = characterId || '';
        try {
            if (this.selectedCharacterId) {
                window.localStorage?.setItem(SELECTED_CHARACTER_STORAGE_KEY, this.selectedCharacterId);
            } else {
                window.localStorage?.removeItem(SELECTED_CHARACTER_STORAGE_KEY);
            }
        } catch (_error) {
            // Character selection can still work for this session without storage.
        }
    }

    getPlayerKey() {
        try {
            const existing = window.localStorage?.getItem(PLAYER_KEY_STORAGE_KEY);
            if (existing) return existing;
            const generated = window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
            const key = `player_${generated}`;
            window.localStorage?.setItem(PLAYER_KEY_STORAGE_KEY, key);
            return key;
        } catch (_error) {
            return `player_${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
        }
    }

    async _postApi(path, body) {
        const response = await fetch(`${this._getApiBaseUrl()}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 404 && path.startsWith('/characters/')) {
                throw new Error(`${this.getSelectedServer().label} needs the updated character server.`);
            }
            throw new Error(payload?.error || `Request failed: ${response.status}`);
        }
        return payload;
    }

    async listCharacters() {
        const payload = await this._postApi('/characters/list', { playerKey: this.getPlayerKey() });
        const characters = Array.isArray(payload.characters) ? payload.characters : [];
        this._saveCharacterCache(characters);
        return characters;
    }

    async createCharacter(displayName = 'PLAYER') {
        const payload = await this._postApi('/characters/create', {
            playerKey: this.getPlayerKey(),
            displayName,
        });
        if (!payload.character?.id) throw new Error('Character creation failed.');
        this._saveSelectedCharacterId(payload.character.id);
        return payload.character;
    }

    async deleteCharacter(characterId) {
        await this._postApi('/characters/delete', {
            playerKey: this.getPlayerKey(),
            characterId,
        });
        if (this.selectedCharacterId === characterId) this._saveSelectedCharacterId('');
        return true;
    }

    getCachedCharacters() {
        try {
            const cached = JSON.parse(window.localStorage?.getItem(CHARACTER_CACHE_STORAGE_KEY) || '[]');
            return Array.isArray(cached) ? cached : [];
        } catch (_error) {
            return [];
        }
    }

    _saveCharacterCache(characters) {
        try {
            window.localStorage?.setItem(CHARACTER_CACHE_STORAGE_KEY, JSON.stringify(Array.isArray(characters) ? characters : []));
        } catch (_error) {
            // Cache is only a menu fallback; live server state remains authoritative.
        }
    }

    selectCharacter(characterId) {
        this._saveSelectedCharacterId(characterId);
    }

    _roomOptions(options = {}) {
        return {
            displayName: this.playerName,
            playerKey: this.getPlayerKey(),
            characterId: this.selectedCharacterId,
            ...options,
        };
    }

    /** @private Leave the current room if one is open. */
    async _leaveCurrentRoom() {
        const room = this.room;
        this.room = null;
        this.sessionId = null;
        this._lastInput = "";
        if (room) {
            try { await room.leave(); } catch (e) { console.warn("[RoomClient] error leaving previous room:", e); }
        }
    }

    /**
     * Create a new shmup_room on the server. The server assigns a 4-letter
     * alpha room code as the room ID which callers can read from `room.id`.
     * @returns {Promise<import("colyseus.js").Room>}
     */
    async createRoom(options = {}) {
        await this._leaveCurrentRoom();
        this._ensureClient();
        try {
            this.room = await this._client.create("shmup_room", this._roomOptions(options));
            this.sessionId = this.room.sessionId;
            console.log("[RoomClient] created room:", this.room.id, "session:", this.sessionId);
        } catch (err) {
            console.error("[RoomClient] failed to create room:", err);
            throw err;
        }
        return this.room;
    }

    /**
     * Join an existing room by its 4-letter code.
     * @param {string} code - 4-letter alpha room code (case-insensitive)
     * @returns {Promise<import("colyseus.js").Room>}
     */
    async joinRoom(code) {
        await this._leaveCurrentRoom();
        this._ensureClient();
        try {
            this.room = await this._client.joinById(code.toUpperCase(), this._roomOptions());
            this.sessionId = this.room.sessionId;
            console.log("[RoomClient] joined room:", this.room.id, "session:", this.sessionId);
        } catch (err) {
            console.error("[RoomClient] failed to join room:", err);
            throw err;
        }
        return this.room;
    }

    /**
     * Leave the current room and reset the connection state.
     * Call this when navigating away from the game (e.g., back to lobby).
     */
    async disconnect() {
        this._client = null;
        await this._leaveCurrentRoom();
    }

    /**
     * List normal game rooms that can be joined from the lobby.
     * @returns {Promise<Array<{ roomId: string, clients: number, maxClients: number, mapName: string, gameStarted: boolean }>>}
     */
    async listPlayableRooms() {
        this._ensureClient();
        const rooms = await this._client.getAvailableRooms("shmup_room");
        return rooms
            .filter((room) => {
                const metadata = room.metadata || {};
                return metadata.mode === "game"
                    && metadata.gameStarted === true
                    && metadata.gameOver !== true
                    && room.clients > 0
                    && room.clients < room.maxClients;
            })
            .map((room) => ({
                roomId: String(room.roomId || '').toUpperCase(),
                clients: Number(room.clients) || 0,
                maxClients: Number(room.maxClients) || 0,
                mapName: String(room.metadata?.activeMapName || ''),
                gameStarted: !!room.metadata?.gameStarted,
            }))
            .filter((room) => /^[A-Z]{4}$/.test(room.roomId))
            .sort((a, b) => a.roomId.localeCompare(b.roomId));
    }

    getServerOptions() {
        return SERVER_OPTIONS;
    }

    getSelectedServer() {
        return SERVER_OPTIONS[this._selectedServerIndex] || SERVER_OPTIONS[0];
    }

    selectServer(index) {
        if (this.room) return false;
        const nextIndex = Math.max(0, Math.min(SERVER_OPTIONS.length - 1, index));
        if (nextIndex !== this._selectedServerIndex) {
            this._selectedServerIndex = nextIndex;
            this._client = null;
        }
        return true;
    }

    selectNextServer() {
        if (SERVER_OPTIONS.length <= 1) return this.getSelectedServer();
        this.selectServer((this._selectedServerIndex + 1) % SERVER_OPTIONS.length);
        return this.getSelectedServer();
    }

    /**
     * Send the current keyboard input state to the server.
     * Only transmits when the state has changed since the last call.
     * @param {{ left: boolean, right: boolean, up: boolean, down: boolean, fire: boolean, interact: boolean }} input
     */
    sendInput(input) {
        if (!this.room) return;

        const encoded = `${+input.left}${+input.right}${+input.up}${+input.down}${+input.fire}${+input.interact}`;
        if (encoded === this._lastInput) return;
        this._lastInput = encoded;

        this.room.send("input", input);
    }

    sendAttack(direction, targetX, targetY) {
        if (!this.room) return;
        this.room.send("attack", { direction, targetX, targetY });
    }

    sendDash() {
        if (!this.room) return;
        this.room.send("dash", {});
    }

    setPlayerName(name) {
        this.playerName = name;
    }

    sendBowChargeStart(targetX, targetY) {
        if (!this.room) return;
        this.room.send("bowChargeStart", { targetX, targetY });
    }

    sendBowAim(targetX, targetY) {
        if (!this.room) return;
        this.room.send("bowAim", { targetX, targetY });
    }

    sendBowCancel() {
        if (!this.room) return;
        this.room.send("bowCancel", {});
    }

    sendBowVolleyStart(targetX, targetY) {
        if (!this.room) return;
        this.room.send("bowVolleyStart", { targetX, targetY });
    }

    sendBowVolleyAim(targetX, targetY) {
        if (!this.room) return;
        this.room.send("bowVolleyAim", { targetX, targetY });
    }

    sendBowVolleyRelease(targetX, targetY) {
        if (!this.room) return;
        this.room.send("bowVolleyRelease", { targetX, targetY });
    }

    sendBowVolleyCancel() {
        if (!this.room) return;
        this.room.send("bowVolleyCancel", {});
    }

    sendAxeWhirlwind(active) {
        if (!this.room) return;
        this.room.send("axeWhirlwind", { active: !!active });
    }

    sendShieldBlockStart() {
        if (!this.room) return;
        this.room.send("shieldBlockStart", {});
    }

    sendShieldBlockStop() {
        if (!this.room) return;
        this.room.send("shieldBlockStop", {});
    }

    sendEquipSlot(slot) {
        if (!this.room) return;
        this.room.send("equipSlot", { slot });
    }

    sendSwapHotbarSlots(fromSlot, toSlot) {
        if (!this.room) return;
        this.room.send("swapHotbarSlots", { fromSlot, toSlot });
    }

    sendRemoveDeployable(x, y) {
        if (!this.room) return;
        this.room.send("removeDeployable", { x, y });
    }

    sendPlaceCampfire(x, y) {
        if (!this.room) return;
        this.room.send("placeCampfire", { x, y });
    }

    sendPlaceCaltrops(x, y) {
        if (!this.room) return;
        this.room.send("placeCaltrops", { x, y });
    }

    sendCraftItem(recipeId) {
        if (!this.room) return;
        this.room.send("craftItem", { recipeId });
    }

    sendSelectUpgrade(upgradeId, item = '', slot = 0) {
        if (!this.room) return;
        this.room.send("selectUpgrade", { upgradeId, item, slot });
    }

    sendRefundUpgradeTree(item = '', slot = 0) {
        if (!this.room) return;
        this.room.send("refundUpgradeTree", { item, slot });
    }

    sendSetOutfitColor(outfitColor) {
        if (!this.room) return;
        this.room.send("setOutfitColor", { outfitColor });
    }

    sendPlaceMapTile(col, row, frame, layer = 1) {
        if (!this.room) return;
        this.room.send("placeMapTile", { col, row, frame, layer });
    }

    sendRemoveMapTile(col, row, layer = 1) {
        if (!this.room) return;
        this.room.send("removeMapTile", { col, row, layer });
    }

    sendPlaceEnchantmentTable(col, row) {
        if (!this.room) return;
        this.room.send("placeEnchantmentTable", { col, row });
    }

    sendRemoveEnchantmentTable(col, row) {
        if (!this.room) return;
        this.room.send("removeEnchantmentTable", { col, row });
    }

    sendPlaceCraftingTable(col, row) {
        if (!this.room) return;
        this.room.send("placeCraftingTable", { col, row });
    }

    sendRemoveCraftingTable(col, row) {
        if (!this.room) return;
        this.room.send("removeCraftingTable", { col, row });
    }

    sendReplaceMap(chunks, enchantmentTables = [], craftingTables = []) {
        if (!this.room) return false;
        const payload = { chunks, enchantmentTables, craftingTables };
        const payloadSize = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
        if (payloadSize > MAX_MAP_REPLACE_PAYLOAD_BYTES) {
            console.error('[RoomClient] refusing oversized replaceMap payload:', payloadSize);
            return false;
        }
        this.room.send("replaceMap", payload);
        return true;
    }

    sendSaveMap(name, overwrite = false) {
        if (!this.room) return false;
        this.room.send("saveMap", { name, overwrite });
        return true;
    }

    sendLoadMap(name) {
        if (!this.room) return false;
        this.room.send("loadMap", { name });
        return true;
    }

    sendListMaps() {
        if (!this.room) return false;
        this.room.send("listMaps", {});
        return true;
    }

    sendDebugSetRound(round) {
        if (!this.room) return;
        this.room.send("debugSetRound", { round });
    }

    sendDebugSetLevel(level) {
        if (!this.room) return;
        this.room.send("debugSetLevel", { level });
    }

    sendReadyForNextWave() {
        if (!this.room) return;
        this.room.send("readyForNextWave", {});
    }

    sendRetryGame() {
        if (!this.room) return;
        this.room.send("retryGame", {});
    }

    _lastInput = "";
}

// Export as a singleton
export default new RoomClient();
