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

    /**
     * Connect to the Colyseus server and join (or create) the "shmup_room".
     * @returns {Promise<import("colyseus.js").Room>}
     */
    async connect() {
        // Leave the existing room before joining a new one so the old session
        // is properly closed and doesn't linger as a second player.
        if (this.room) {
            try { await this.room.leave(); } catch (e) { console.warn("[RoomClient] error leaving previous room:", e); }
            this.room = null;
            this.sessionId = null;
        }

        const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
        this._client = new Client(serverUrl);

        try {
            this.room = await this._client.joinOrCreate("shmup_room");
            this.sessionId = this.room.sessionId;
            console.log("[RoomClient] joined room:", this.room.id, "session:", this.sessionId);
        } catch (err) {
            console.error("[RoomClient] failed to join room:", err);
            throw err;
        }

        return this.room;
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
