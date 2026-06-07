/*
 * Asset from: https://kenney.nl/assets/pixel-platformer
 *
 * Game scene — CLIENT RENDERING ONLY
 * All game logic runs on the Colyseus server (ShmupRoom.ts).
 * This scene:
 *   1. Listens for state changes on RoomClient.room
 *   2. Creates / destroys sprites to mirror server state
 *   3. Sends keyboard input to the server every frame (on change)
 *   4. Renders the server-owned deterministic tilemap background
 */
import ASSETS from '../assets.js';
import ANIMATION from '../animation.js';
import Explosion from '../gameObjects/Explosion.js';
import RoomClient from '../network/RoomClient.js';

// Sprite frame constants (matching the original game objects)
const SHIP_FRAME_OFFSET = 12;  // ships.png: enemy frames start at 12 + shipId
const EB_TILE_OFFSET    = 11;  // tiles.png: enemy bullet frame = 11 + power
const DEFAULT_PLAYER_DIRECTION = 'N';
const PLAYER_DISPLAY_SIZE = 128;
const DEFAULT_WORLD_WIDTH = 1280;
const DEFAULT_WORLD_HEIGHT = 720;
const DEFAULT_TILE_SIZE = 32;
const DEFAULT_MAP_SEED = 1337;
const DEFAULT_TILE_PALETTE = '50,50,50,50,50,50,50,50,50,110,110,110,110,110,50,50,50,50,50,50,50,50,50,110,110,110,110,110,36,48,60,72,84';

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
        if (!this.gameStarted) return;
        this.sendInput();
        this.updateLocalPlayerAnimation();
        this.updateRemotePlayerAnimations();
    }

    // ─── Variables ────────────────────────────────────────────────────────────
    initVariables() {
        this.gameStarted = false;
        this.centreX = this.scale.width  * 0.5;
        this.centreY = this.scale.height * 0.5;

        const state = RoomClient.room?.state;

        // Server-owned map config. The client only renders this deterministic map.
        this.worldWidth  = state?.worldWidth  || DEFAULT_WORLD_WIDTH;
        this.worldHeight = state?.worldHeight || DEFAULT_WORLD_HEIGHT;
        this.tileSize    = state?.tileSize    || DEFAULT_TILE_SIZE;
        this.mapSeed     = state?.mapSeed     || DEFAULT_MAP_SEED;
        this.tiles       = this.parseTilePalette(state?.tilePalette || DEFAULT_TILE_PALETTE);
        this.mapWidth    = Math.ceil(this.worldWidth  / this.tileSize);
        this.mapHeight   = Math.ceil(this.worldHeight / this.tileSize);

        // Sprite dictionaries keyed by server-side ID
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.playerSprites       = new Map();
        this.playerAnimationState = new Map();
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
        }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
        }).setDepth(100).setScrollFactor(0);

        this.killsText = this.add.text(this.scale.width - 20, 20, 'Kills: 0', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffff00',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

        this.playerCountText = this.add.text(this.scale.width - 20, 60, 'Players: 0', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#aaffaa',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(1, 0).setDepth(100).setScrollFactor(0);

        this.gameOverText = this.add.text(this.centreX, this.centreY, 'Game Over\nPress Space for Lobby', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, align: 'center',
        }).setOrigin(0.5).setDepth(100).setVisible(false).setScrollFactor(0);

        const roomCode = RoomClient.room ? RoomClient.room.id : '';
        this.roomCodeText = this.add.text(this.centreX, 20, `Room: ${roomCode}`, {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffaa00',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5, 0).setDepth(100).setScrollFactor(0);
    }

    // ─── Animations ───────────────────────────────────────────────────────────
    initAnimations() {
        this.createAnimation(ANIMATION.explosion);

        Object.values(ANIMATION.player.idle).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.run).forEach(animation => this.createAnimation(animation));
    }

    // ─── Input ────────────────────────────────────────────────────────────────
    initInput() {
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
        });
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
        const addPlayer = (player, sessionId) => {
            if (this.playerSprites.has(sessionId)) return;

            const isLocal = sessionId === RoomClient.sessionId;
            const sprite  = this.add.sprite(player.x, player.y, ASSETS.spritesheet.playerIdle.key, 0)
                .setDepth(100)
                .setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);

            if (!isLocal) sprite.setTint(0x88ffff); // tint remote players cyan

            this.playerSprites.set(sessionId, sprite);
            this.playerAnimationState.set(sessionId, {
                direction: DEFAULT_PLAYER_DIRECTION,
                moving: false,
                lastMovedAt: 0,
                x: player.x,
                y: player.y,
            });
            this.setPlayerAnimation(sessionId, false, DEFAULT_PLAYER_DIRECTION);

            player.onChange(() => {
                const s = this.playerSprites.get(sessionId);
                if (!s) return;
                const animationState = this.playerAnimationState.get(sessionId);
                const previousX = animationState ? animationState.x : player.x;
                const previousY = animationState ? animationState.y : player.y;

                // Lerp toward server position for smooth rendering
                s.x = Phaser.Math.Linear(s.x, player.x, 0.3);
                s.y = Phaser.Math.Linear(s.y, player.y, 0.3);

                if (animationState) {
                    const direction = this.getDirectionFromVector(player.x - previousX, player.y - previousY);
                    if (direction) {
                        animationState.lastMovedAt = this.time.now;
                    }
                    animationState.moving = !!direction;
                    if (!isLocal) this.setPlayerAnimation(sessionId, animationState.moving, direction);
                    animationState.x = player.x;
                    animationState.y = player.y;
                }

                if (player.isDead && s.visible) {
                    this.addExplosion(s.x, s.y);
                    s.setVisible(false);
                }
            });

            if (isLocal) {
                this.cameras.main.centerOn(player.x, player.y);
                this.cameras.main.startFollow(sprite, false, 1, 1);
                this.killsText.setText(`Kills: ${player.kills}`);

                player.listen('kills', (kills) => {
                    this.killsText.setText(`Kills: ${kills}`);
                });
            }

            this.playerCountText.setText(`Players: ${state.players.size}`);
        };

        state.players.onAdd(addPlayer);
        state.players.forEach(addPlayer);

        state.players.onRemove((_player, sessionId) => {
            const s = this.playerSprites.get(sessionId);
            if (s) s.destroy();
            this.playerSprites.delete(sessionId);
            this.playerAnimationState.delete(sessionId);
            this.playerCountText.setText(`Players: ${state.players.size}`);
        });

        // ── Enemies ──────────────────────────────────────────────────────────
        const addEnemy = (enemy, id) => {
            if (this.enemySprites.has(id)) return;

            const frame  = SHIP_FRAME_OFFSET + enemy.shipId;
            const sprite = this.add.sprite(enemy.x, enemy.y, ASSETS.spritesheet.ships.key, frame)
                .setDepth(10).setFlipY(true);
            this.enemySprites.set(id, sprite);

            enemy.onChange(() => {
                const s = this.enemySprites.get(id);
                if (s) { s.x = enemy.x; s.y = enemy.y; }
            });
        };

        state.enemies.onAdd(addEnemy);
        state.enemies.forEach(addEnemy);

        state.enemies.onRemove((_enemy, id) => {
            const s = this.enemySprites.get(id);
            if (s) { this.addExplosion(s.x, s.y); s.destroy(); }
            this.enemySprites.delete(id);
        });

        // ── Player bullets ───────────────────────────────────────────────────
        const addPlayerBullet = (bullet, id) => {
            if (this.playerBulletSprites.has(id)) return;

            const sprite = this.add.sprite(bullet.x, bullet.y, ASSETS.spritesheet.tiles.key, bullet.power - 1)
                .setDepth(10);
            this.playerBulletSprites.set(id, sprite);

            bullet.onChange(() => {
                const s = this.playerBulletSprites.get(id);
                if (s) { s.x = bullet.x; s.y = bullet.y; }
            });
        };

        state.playerBullets.onAdd(addPlayerBullet);
        state.playerBullets.forEach(addPlayerBullet);

        state.playerBullets.onRemove((_bullet, id) => {
            const s = this.playerBulletSprites.get(id);
            if (s) s.destroy();
            this.playerBulletSprites.delete(id);
        });

        // ── Enemy bullets ────────────────────────────────────────────────────
        const addEnemyBullet = (bullet, id) => {
            if (this.enemyBulletSprites.has(id)) return;

            const sprite = this.add.sprite(bullet.x, bullet.y, ASSETS.spritesheet.tiles.key, EB_TILE_OFFSET + bullet.power)
                .setDepth(10).setFlipY(true);
            this.enemyBulletSprites.set(id, sprite);

            bullet.onChange(() => {
                const s = this.enemyBulletSprites.get(id);
                if (s) { s.x = bullet.x; s.y = bullet.y; }
            });
        };

        state.enemyBullets.onAdd(addEnemyBullet);
        state.enemyBullets.forEach(addEnemyBullet);

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

                this.keys.fire.once('down', async () => {
                    this.gameOverText.setVisible(false);
                    this.clearAllSprites();
                    await RoomClient.disconnect();
                    this.scene.start('Lobby');
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
            left:  this.keys.left.isDown,
            right: this.keys.right.isDown,
            up:    this.keys.up.isDown,
            down:  this.keys.down.isDown,
            fire:  this.keys.fire.isDown,
        });
    }

    // ─── Tilemap (server-owned metadata, deterministic client render) ────────
    initMap() {
        const rng = this.createSeededRandom(this.mapSeed);
        const mapData = [];
        for (let y = 0; y < this.mapHeight; y++) {
            const row = [];
            for (let x = 0; x < this.mapWidth; x++) {
                row.push(this.pickTile(rng));
            }
            mapData.push(row);
        }
        this.map = this.make.tilemap({ data: mapData, tileWidth: this.tileSize, tileHeight: this.tileSize });
        const tileset    = this.map.addTilesetImage(ASSETS.spritesheet.tiles.key);
        this.groundLayer = this.map.createLayer(0, tileset, 0, 0);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    parseTilePalette(tilePalette) {
        const tiles = String(tilePalette)
            .split(',')
            .map(tile => Number(tile.trim()))
            .filter(Number.isFinite);
        return tiles.length > 0 ? tiles : DEFAULT_TILE_PALETTE.split(',').map(Number);
    }

    createSeededRandom(seed) {
        let value = seed >>> 0;
        return () => {
            value = (value + 0x6D2B79F5) >>> 0;
            let result = value;
            result = Math.imul(result ^ (result >>> 15), result | 1);
            result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
            return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
        };
    }

    pickTile(rng) {
        return this.tiles[Math.floor(rng() * this.tiles.length)];
    }

    createAnimation(animation) {
        if (this.anims.exists(animation.key)) return;

        this.anims.create({
            key: animation.key,
            frames: this.anims.generateFrameNumbers(animation.texture, animation.config),
            frameRate: animation.frameRate,
            repeat: animation.repeat,
        });
    }

    updateLocalPlayerAnimation() {
        const sessionId = RoomClient.sessionId;
        if (!sessionId || !this.playerSprites.has(sessionId)) return;

        const dx = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
        const dy = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
        const direction = this.getDirectionFromVector(dx, dy);

        this.setPlayerAnimation(sessionId, !!direction, direction);
    }

    updateRemotePlayerAnimations() {
        this.playerAnimationState.forEach((animationState, sessionId) => {
            if (sessionId === RoomClient.sessionId || !animationState.moving) return;

            if (this.time.now - animationState.lastMovedAt > 150) {
                animationState.moving = false;
                this.setPlayerAnimation(sessionId, false, null);
            }
        });
    }

    getDirectionFromVector(dx, dy) {
        const threshold = 0.1;
        const horizontal = Math.abs(dx) > threshold ? (dx > 0 ? 'E' : 'W') : '';
        const vertical = Math.abs(dy) > threshold ? (dy > 0 ? 'S' : 'N') : '';

        if (!horizontal && !vertical) return null;
        if (horizontal && vertical) return `${vertical}${horizontal}`;
        return horizontal || vertical;
    }

    setPlayerAnimation(sessionId, moving, direction) {
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || !sprite.visible) return;

        const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
        animationState.direction = nextDirection;

        const mode = moving ? 'run' : 'idle';
        const animation = ANIMATION.player[mode][nextDirection];
        if (!animation) return;

        if (sprite.anims.currentAnim?.key !== animation.key || !sprite.anims.isPlaying) {
            sprite.play(animation.key);
        }
    }

    addExplosion(x, y) {
        new Explosion(this, x, y);
    }

    clearAllSprites() {
        this.playerSprites.forEach(s => s.destroy());
        this.enemySprites.forEach(s => s.destroy());
        this.playerBulletSprites.forEach(s => s.destroy());
        this.enemyBulletSprites.forEach(s => s.destroy());
        this.playerSprites.clear();
        this.playerAnimationState.clear();
        this.enemySprites.clear();
        this.playerBulletSprites.clear();
        this.enemyBulletSprites.clear();
    }
}

