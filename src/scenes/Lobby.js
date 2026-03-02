import RoomClient from '../network/RoomClient.js';

const ROOM_CODE_DISPLAY_MS = 2000; // ms to show the created room code before entering the game

/**
 * Lobby scene — lets players create a new room or join an existing one
 * by entering a 4-letter alpha room code.
 */
export class Lobby extends Phaser.Scene {
    constructor() {
        super('Lobby');
    }

    create() {
        this._state = 'idle'; // 'idle' | 'busy'
        this._codeInput = '';

        const cx = this.scale.width  * 0.5;
        const cy = this.scale.height * 0.5;

        // ── Background ──────────────────────────────────────────────────────
        this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000);

        // ── Title ───────────────────────────────────────────────────────────
        this.add.text(cx, 100, 'SHMUP', {
            fontFamily: 'Arial Black', fontSize: 80, color: '#ffffff',
            stroke: '#000000', strokeThickness: 10,
        }).setOrigin(0.5);

        // ── Create Room button ───────────────────────────────────────────────
        this._createBtn = this.add.text(cx, 240, '[ CREATE ROOM ]', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#00ff88',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this._createBtn.on('pointerover',  () => this._createBtn.setColor('#88ffcc'));
        this._createBtn.on('pointerout',   () => this._createBtn.setColor('#00ff88'));
        this._createBtn.on('pointerdown',  () => this._onCreateRoom());

        // ── Divider ─────────────────────────────────────────────────────────
        this.add.text(cx, 330, '— OR —', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#888888',
        }).setOrigin(0.5);

        // ── Join section ────────────────────────────────────────────────────
        this.add.text(cx, 400, 'ENTER ROOM CODE', {
            fontFamily: 'Arial Black', fontSize: 26, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5);

        // 4-letter code display
        this._codeText = this.add.text(cx, 465, '_ _ _ _', {
            fontFamily: 'Arial Black', fontSize: 54, color: '#ffff00',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5);

        this.add.text(cx, 515, '(type letters)', {
            fontFamily: 'Arial', fontSize: 18, color: '#666666',
        }).setOrigin(0.5);

        // ── Join button ─────────────────────────────────────────────────────
        this._joinBtn = this.add.text(cx, 580, '[ JOIN ROOM ]', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#4488ff',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this._joinBtn.on('pointerover',  () => this._joinBtn.setColor('#88aaff'));
        this._joinBtn.on('pointerout',   () => this._joinBtn.setColor('#4488ff'));
        this._joinBtn.on('pointerdown',  () => this._onJoinRoom());

        // ── Status / error text ──────────────────────────────────────────────
        this._statusText = this.add.text(cx, 660, '', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ff4444',
            stroke: '#000000', strokeThickness: 6, align: 'center',
        }).setOrigin(0.5);

        // ── Keyboard input ───────────────────────────────────────────────────
        this.input.keyboard.on('keydown', (event) => this._onKey(event));
    }

    // ── Keyboard handler ─────────────────────────────────────────────────────
    _onKey(event) {
        if (this._state !== 'idle') return;

        const key = event.key.toUpperCase();
        if (/^[A-Z]$/.test(key) && this._codeInput.length < 4) {
            this._codeInput += key;
            this._updateCodeDisplay();
        } else if (event.key === 'Backspace' && this._codeInput.length > 0) {
            this._codeInput = this._codeInput.slice(0, -1);
            this._updateCodeDisplay();
        } else if (event.key === 'Enter' && this._codeInput.length === 4) {
            this._onJoinRoom();
        }
    }

    _updateCodeDisplay() {
        const chars = this._codeInput.padEnd(4, '_').split('').join(' ');
        this._codeText.setText(chars);
    }

    // ── Create Room ──────────────────────────────────────────────────────────
    async _onCreateRoom() {
        if (this._state !== 'idle') return;
        this._state = 'busy';
        this._setStatus('Creating room…', '#ffffff');

        try {
            await RoomClient.createRoom();
            const code = RoomClient.room.id;
            this._setStatus(`Room created: ${code}\nShare this code with friends!`, '#00ff88');
            // Brief pause so the player can see and share the code
            this.time.delayedCall(ROOM_CODE_DISPLAY_MS, () => this.scene.start('Game'));
        } catch (e) {
            this._setStatus('Failed to create room. Is the server running?', '#ff4444');
            this._state = 'idle';
        }
    }

    // ── Join Room ────────────────────────────────────────────────────────────
    async _onJoinRoom() {
        if (this._state !== 'idle') return;
        if (this._codeInput.length !== 4) {
            this._setStatus('Enter a 4-letter room code first.', '#ff4444');
            return;
        }
        this._state = 'busy';
        this._setStatus(`Joining room ${this._codeInput}…`, '#ffffff');

        try {
            await RoomClient.joinRoom(this._codeInput);
            this.scene.start('Game');
        } catch (e) {
            this._setStatus(`Room "${this._codeInput}" not found. Check the code.`, '#ff4444');
            this._state = 'idle';
        }
    }

    _setStatus(msg, color) {
        this._statusText.setText(msg).setColor(color);
    }
}
