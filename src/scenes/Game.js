/*
 * Asset from: https://kenney.nl/assets/pixel-platformer
 *
 * Game scene — CLIENT RENDERING ONLY
 * All game logic runs on the Colyseus server (ShmupRoom.ts).
 * This scene:
 *   1. Listens for state changes on RoomClient.room
 *   2. Creates / destroys sprites to mirror server state
 *   3. Sends keyboard input to the server every frame (on change)
 *   4. Handles the scrolling tilemap background (purely visual)
 */
import ASSETS from '../assets.js';
import ANIMATION from '../animation.js';
import Explosion from '../gameObjects/Explosion.js';
import RoomClient from '../network/RoomClient.js';

// Sprite frame constants (matching the original game objects)
const SHIP_FRAME_OFFSET = 12;  // ships.png: enemy frames start at 12 + shipId
const LOCAL_SHIP_FRAME  = 8;   // ships.png frame for the local player
const REMOTE_SHIP_FRAME = 0;   // ships.png frame for remote players
const EB_TILE_OFFSET    = 11;  // tiles.png: enemy bullet frame = 11 + power

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.initVariables();
        this.initGameUi();
        this.initAnimations();
        this.initMap();
        this.initInput();
        this.initNetworking();
    }

    update() {
        this.updateMap();
        if (!this.gameStarted) return;
        this.sendInput();
    }

    // ─── Variables ────────────────────────────────────────────────────────────
    initVariables() {
        this.gameStarted = false;
        this.centreX = this.scale.width  * 0.5;
        this.centreY = this.scale.height * 0.5;

        // Tilemap config
        this.tiles      = [50,50,50,50,50,50,50,50,50,110,110,110,110,110,50,50,50,50,50,50,50,50,50,110,110,110,110,110,36,48,60,72,84];
        this.tileSize   = 32;
        this.mapOffset  = 10;
        this.mapTop     = -this.mapOffset * this.tileSize;
        this.mapHeight  = Math.ceil(this.scale.height / this.tileSize) + this.mapOffset + 1;
        this.mapWidth   = Math.ceil(this.scale.width  / this.tileSize);
        this.scrollSpeed    = 1;
        this.scrollMovement = 0;

        // Sprite dictionaries keyed by server-side ID
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.playerSprites       = new Map();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.enemySprites        = new Map();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.playerBulletSprites = new Map();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.enemyBulletSprites  = new Map();
    }

    // ─── UI ───────────────────────────────────────────────────────────────────
    initGameUi() {
        this.tutorialText = this.add.text(this.centreX, this.centreY, 'Waiting for server…', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, align: 'center',
        }).setOrigin(0.5).setDepth(100);

        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
        }).setDepth(100);

        this.killsText = this.add.text(this.scale.width - 20, 20, 'Kills: 0', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffff00',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(1, 0).setDepth(100);

        this.playerCountText = this.add.text(this.scale.width - 20, 60, 'Players: 0', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#aaffaa',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(1, 0).setDepth(100);

        this.gameOverText = this.add.text(this.centreX, this.centreY, 'Game Over\nPress Space to Rejoin', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, align: 'center',
        }).setOrigin(0.5).setDepth(100).setVisible(false);
    }

    // ─── Animations ───────────────────────────────────────────────────────────
    initAnimations() {
        this.anims.create({
            key: ANIMATION.explosion.key,
            frames: this.anims.generateFrameNumbers(ANIMATION.explosion.texture, ANIMATION.explosion.config),
            frameRate: ANIMATION.explosion.frameRate,
            repeat: ANIMATION.explosion.repeat,
        });
    }

    // ─── Input ────────────────────────────────────────────────────────────────
    initInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    // ─── Networking ───────────────────────────────────────────────────────────
    initNetworking() {
        const room = RoomClient.room;
        if (!room) {
            this.tutorialText.setText('No server connection.\nCheck console.');
            return;
        }

        const state = room.state;

        // ── Players ──────────────────────────────────────────────────────────
        state.players.onAdd((player, sessionId) => {
            const isLocal = sessionId === RoomClient.sessionId;
            const frame   = isLocal ? LOCAL_SHIP_FRAME : REMOTE_SHIP_FRAME;
            const sprite  = this.add.sprite(player.x, player.y, ASSETS.spritesheet.ships.key, frame)
                .setDepth(100);

            if (!isLocal) sprite.setTint(0x88ffff); // tint remote players cyan

            this.playerSprites.set(sessionId, sprite);

            player.onChange(() => {
                const s = this.playerSprites.get(sessionId);
                if (!s) return;
                // Lerp toward server position for smooth rendering
                s.x = Phaser.Math.Linear(s.x, player.x, 0.3);
                s.y = Phaser.Math.Linear(s.y, player.y, 0.3);

                if (player.isDead && s.visible) {
                    this.addExplosion(s.x, s.y);
                    s.setVisible(false);
                }
            });

            if (isLocal) {
                player.listen('kills', (kills) => {
                    this.killsText.setText(`Kills: ${kills}`);
                });
            }

            this.playerCountText.setText(`Players: ${state.players.size}`);
        });

        state.players.onRemove((_player, sessionId) => {
            const s = this.playerSprites.get(sessionId);
            if (s) s.destroy();
            this.playerSprites.delete(sessionId);
            this.playerCountText.setText(`Players: ${state.players.size}`);
        });

        // ── Enemies ──────────────────────────────────────────────────────────
        state.enemies.onAdd((enemy, id) => {
            const frame  = SHIP_FRAME_OFFSET + enemy.shipId;
            const sprite = this.add.sprite(enemy.x, enemy.y, ASSETS.spritesheet.ships.key, frame)
                .setDepth(10).setFlipY(true);
            this.enemySprites.set(id, sprite);

            enemy.onChange(() => {
                const s = this.enemySprites.get(id);
                if (s) { s.x = enemy.x; s.y = enemy.y; }
            });
        });

        state.enemies.onRemove((_enemy, id) => {
            const s = this.enemySprites.get(id);
            if (s) { this.addExplosion(s.x, s.y); s.destroy(); }
            this.enemySprites.delete(id);
        });

        // ── Player bullets ───────────────────────────────────────────────────
        state.playerBullets.onAdd((bullet, id) => {
            const sprite = this.add.sprite(bullet.x, bullet.y, ASSETS.spritesheet.tiles.key, bullet.power - 1)
                .setDepth(10);
            this.playerBulletSprites.set(id, sprite);

            bullet.onChange(() => {
                const s = this.playerBulletSprites.get(id);
                if (s) { s.x = bullet.x; s.y = bullet.y; }
            });
        });

        state.playerBullets.onRemove((_bullet, id) => {
            const s = this.playerBulletSprites.get(id);
            if (s) s.destroy();
            this.playerBulletSprites.delete(id);
        });

        // ── Enemy bullets ────────────────────────────────────────────────────
        state.enemyBullets.onAdd((bullet, id) => {
            const sprite = this.add.sprite(bullet.x, bullet.y, ASSETS.spritesheet.tiles.key, EB_TILE_OFFSET + bullet.power)
                .setDepth(10).setFlipY(true);
            this.enemyBulletSprites.set(id, sprite);

            bullet.onChange(() => {
                const s = this.enemyBulletSprites.get(id);
                if (s) { s.x = bullet.x; s.y = bullet.y; }
            });
        });

        state.enemyBullets.onRemove((_bullet, id) => {
            const s = this.enemyBulletSprites.get(id);
            if (s) s.destroy();
            this.enemyBulletSprites.delete(id);
        });

        // ── Root state listeners ─────────────────────────────────────────────
        state.listen('teamScore', (score) => {
            this.scoreText.setText(`Score: ${score}`);
        });

        state.listen('gameStarted', (started) => {
            if (started) {
                this.gameStarted = true;
                this.tutorialText.setVisible(false);
            }
        });

        state.listen('gameOver', (over) => {
            if (over) {
                this.gameStarted = false;
                this.gameOverText.setVisible(true);

                this.cursors.space.once('down', async () => {
                    this.gameOverText.setVisible(false);
                    this.clearAllSprites();
                    try {
                        await RoomClient.connect();
                        this.initNetworking();
                    } catch (e) {
                        console.error('Rejoin failed:', e);
                    }
                });
            }
        });

        // Apply current state if we joined a room already in progress
        if (state.gameStarted) {
            this.gameStarted = true;
            this.tutorialText.setVisible(false);
        } else {
            this.tutorialText.setText('Connected!\nGame starts when players join…');
        }
    }

    // ─── Input sender ─────────────────────────────────────────────────────────
    sendInput() {
        RoomClient.sendInput({
            left:  this.cursors.left.isDown,
            right: this.cursors.right.isDown,
            up:    this.cursors.up.isDown,
            down:  this.cursors.down.isDown,
            fire:  this.cursors.space.isDown,
        });
    }

    // ─── Tilemap (visual only — unchanged from original) ─────────────────────
    initMap() {
        const mapData = [];
        for (let y = 0; y < this.mapHeight; y++) {
            const row = [];
            for (let x = 0; x < this.mapWidth; x++) {
                row.push(Phaser.Math.RND.weightedPick(this.tiles));
            }
            mapData.push(row);
        }
        this.map = this.make.tilemap({ data: mapData, tileWidth: this.tileSize, tileHeight: this.tileSize });
        const tileset    = this.map.addTilesetImage(ASSETS.spritesheet.tiles.key);
        this.groundLayer = this.map.createLayer(0, tileset, 0, this.mapTop);
    }

    updateMap() {
        this.scrollMovement += this.scrollSpeed;

        if (this.scrollMovement >= this.tileSize) {
            let tile, prev;
            for (let y = this.mapHeight - 2; y > 0; y--) {
                for (let x = 0; x < this.mapWidth; x++) {
                    tile = this.map.getTileAt(x, y - 1);
                    prev = this.map.getTileAt(x, y);
                    prev.index = tile.index;
                    if (y === 1) tile.index = Phaser.Math.RND.weightedPick(this.tiles);
                }
            }
            this.scrollMovement -= this.tileSize;
        }

        this.groundLayer.y = this.mapTop + this.scrollMovement;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    addExplosion(x, y) {
        new Explosion(this, x, y);
    }

    clearAllSprites() {
        this.playerSprites.forEach(s => s.destroy());
        this.enemySprites.forEach(s => s.destroy());
        this.playerBulletSprites.forEach(s => s.destroy());
        this.enemyBulletSprites.forEach(s => s.destroy());
        this.playerSprites.clear();
        this.enemySprites.clear();
        this.playerBulletSprites.clear();
        this.enemyBulletSprites.clear();
    }
}

