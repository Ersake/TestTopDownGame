import { Client } from "colyseus.js";

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

    /** @type {Client | null} */
    _client = null;

    /** @private Initialise the Colyseus Client if not already done. */
    _ensureClient() {
        if (!this._client) {
            const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
            this._client = new Client(serverUrl);
        }
    }

    /** @private Leave the current room if one is open. */
    async _leaveCurrentRoom() {
        if (this.room) {
            try { await this.room.leave(); } catch (e) { console.warn("[RoomClient] error leaving previous room:", e); }
            this.room = null;
            this.sessionId = null;
        }
    }

    /**
     * Create a new shmup_room on the server. The server assigns a 4-letter
     * alpha room code as the room ID which callers can read from `room.id`.
     * @returns {Promise<import("colyseus.js").Room>}
     */
    async createRoom() {
        await this._leaveCurrentRoom();
        this._ensureClient();
        try {
            this.room = await this._client.create("shmup_room");
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
            this.room = await this._client.joinById(code.toUpperCase());
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
        await this._leaveCurrentRoom();
    }

    /**
     * Send the current keyboard input state to the server.
     * Only transmits when the state has changed since the last call.
     * @param {{ left: boolean, right: boolean, up: boolean, down: boolean, fire: boolean }} input
     */
    sendInput(input) {
        if (!this.room) return;

        const encoded = `${+input.left}${+input.right}${+input.up}${+input.down}${+input.fire}`;
        if (encoded === this._lastInput) return;
        this._lastInput = encoded;

        this.room.send("input", input);
    }

    _lastInput = "";
}

// Export as a singleton
export default new RoomClient();
