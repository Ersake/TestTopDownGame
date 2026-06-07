/*
 * Asset from: https://kenney.nl/assets/pixel-platformer
 *
 * Game scene — CLIENT RENDERING ONLY
 * All game logic runs on the Colyseus server (ShmupRoom.ts).
 * This scene:
 *   1. Listens for state changes on RoomClient.room
 *   2. Creates / destroys sprites to mirror server state
 *   3. Sends keyboard input to the server every frame (on change)
 *   4. Renders a flat world background inside server-owned bounds
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
const TEST_TREE_HALF_SIZE = 96;
const TEST_TREE_OFFSET_X = 240;
const DEFAULT_WORLD_WIDTH = 3840;
const DEFAULT_WORLD_HEIGHT = 2160;
const WORLD_BACKGROUND_COLOR = 0x2f7d32;
const WORLD_BACKGROUND_CSS = '#2f7d32';
const PUNCH_SOUND_VOLUME = 0.6;
const WOOD_HIT_SOUND_VOLUME = 0.75;
const REMOTE_ATTACK_AUDIO_RESUME_SUPPRESS_MS = 3000;
const TEST_TREE_TRUNK_Y_OFFSET = -18;
const TEST_TREE_TRUNK_HALF_WIDTH = 5;
const TEST_TREE_TRUNK_HALF_HEIGHT = 18;
const ATTACK_HIT_RADIUS = 36;
const ATTACK_HIT_OFFSET = 36;
const ATTACK_HIT_ORIGIN_Y_OFFSET = 18;
const DIRECTION_VECTORS = {
    E: { x: 1, y: 0 },
    SE: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    S: { x: 0, y: 1 },
    SW: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    W: { x: -1, y: 0 },
    NW: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    N: { x: 0, y: -1 },
    NE: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
};

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.initVariables();
        this.initGameUi();
        this.initAnimations();
        this.initWorldBackground();
        this.initInput();
        this.initNetworking();
    }

    update() {
        if (!this.gameStarted) return;
        this.sendInput();
        this.ensureLocalCameraFollow();
        this.updateLocalPlayerAnimation();
        this.updateRemotePlayerAnimations();
    }

    // ─── Variables ────────────────────────────────────────────────────────────
    initVariables() {
        this.gameStarted = false;
        this.localSessionId = RoomClient.sessionId;
        this.localPlayerSprite = null;
        this.localPlayerState = null;
        this.localCamera = this.cameras.main;
        this.centreX = this.scale.width  * 0.5;
        this.centreY = this.scale.height * 0.5;

        const state = RoomClient.room?.state;

        // Server-owned world bounds. The client only renders inside this space.
        this.worldWidth  = state?.worldWidth  || DEFAULT_WORLD_WIDTH;
        this.worldHeight = state?.worldHeight || DEFAULT_WORLD_HEIGHT;

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
        this.isTabActive = this.isDocumentActive();
        this.remoteAttackAudioDirty = !this.isTabActive;
        this.suppressRemoteAttackAudioUntil = this.isTabActive ? 0 : Number.POSITIVE_INFINITY;
        this.handleTabInactive = () => {
            this.isTabActive = false;
            this.remoteAttackAudioDirty = true;
            this.suppressRemoteAttackAudioUntil = Number.POSITIVE_INFINITY;
        };
        this.handleTabActive = () => {
            this.isTabActive = this.isDocumentActive();
            if (!this.isTabActive) return;

            this.syncRemoteAttackSeqBaselines();
            this.remoteAttackAudioDirty = false;
            this.suppressRemoteAttackAudioUntil = performance.now() + REMOTE_ATTACK_AUDIO_RESUME_SUPPRESS_MS;
        };
        this.handleVisibilityChange = () => {
            if (document.hidden) {
                this.handleTabInactive();
            } else {
                this.handleTabActive();
            }
        };
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('blur', this.handleTabInactive);
        window.addEventListener('focus', this.handleTabActive);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            window.removeEventListener('blur', this.handleTabInactive);
            window.removeEventListener('focus', this.handleTabActive);
        });
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
        Object.values(ANIMATION.player.attack).forEach(animation => this.createAnimation(animation));
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

        this.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.playLocalAttackAnimation(pointer);
            }
        });
    }

    // ─── Networking ───────────────────────────────────────────────────────────
    initNetworking() {
        const room = RoomClient.room;
        if (!room) {
            this.tutorialText.setText('No server connection.\nCheck console.');
            return;
        }

        this.localSessionId = room.sessionId || RoomClient.sessionId;
        const state = room.state;

        // ── Players ──────────────────────────────────────────────────────────
        const addPlayer = (player, sessionId) => {
            const playerSessionId = sessionId || player.sessionId;
            if (!playerSessionId || this.playerSprites.has(playerSessionId)) return;

            const isLocal = this.isLocalSession(playerSessionId);
            const sprite  = this.add.sprite(player.x, player.y, ASSETS.spritesheet.playerIdle.key, 0)
                .setDepth(100)
                .setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);

            if (!isLocal) sprite.setTint(0x88ffff); // tint remote players cyan

            this.playerSprites.set(playerSessionId, sprite);
            this.playerAnimationState.set(playerSessionId, {
                direction: DEFAULT_PLAYER_DIRECTION,
                moving: false,
                attacking: false,
                attackVisualLockUntil: 0,
                attackVisualLockX: player.x,
                attackVisualLockY: player.y,
                lastAttackSeq: player.attackSeq || 0,
                lastMovedAt: 0,
                x: player.x,
                y: player.y,
            });
            this.setPlayerAnimation(playerSessionId, false, DEFAULT_PLAYER_DIRECTION);

            player.onChange(() => {
                const s = this.playerSprites.get(playerSessionId);
                if (!s) return;
                const animationState = this.playerAnimationState.get(playerSessionId);
                const previousX = animationState ? animationState.x : player.x;
                const previousY = animationState ? animationState.y : player.y;

                const visualLocked = isLocal
                    && animationState?.attacking
                    && this.time.now < animationState.attackVisualLockUntil;

                if (visualLocked) {
                    s.x = animationState.attackVisualLockX;
                    s.y = animationState.attackVisualLockY;
                } else {
                    // Lerp toward server position for smooth rendering
                    s.x = Phaser.Math.Linear(s.x, player.x, 0.3);
                    s.y = Phaser.Math.Linear(s.y, player.y, 0.3);
                }

                if (animationState) {
                    const direction = this.getDirectionFromVector(player.x - previousX, player.y - previousY);
                    if (direction) {
                        animationState.lastMovedAt = this.time.now;
                    }
                    animationState.moving = !!direction;
                    if (!isLocal) this.setPlayerAnimation(playerSessionId, animationState.moving, direction);
                    animationState.x = player.x;
                    animationState.y = player.y;
                }

                if (player.isDead && s.visible) {
                    this.addExplosion(s.x, s.y);
                    s.setVisible(false);
                }
            });

            player.listen('facingDirection', (direction) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState && direction) {
                    animationState.direction = direction;
                }
            });

            player.listen('attackSeq', () => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState || player.attackSeq <= animationState.lastAttackSeq) return;

                animationState.lastAttackSeq = player.attackSeq;
                if (player.attackSeq <= 0) return;

                this.playPlayerAttackAnimation(playerSessionId, player.attackDirection, {
                    playAudio: this.shouldPlayAttackAudio(playerSessionId),
                });
            });

            if (isLocal) {
                this.activateLocalCamera(sprite, player);
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
            if (this.isLocalSession(sessionId)) {
                this.localCamera.stopFollow();
                this.localPlayerSprite = null;
                this.localPlayerState = null;
            }
            this.playerSprites.delete(sessionId);
            this.playerAnimationState.delete(sessionId);
            this.playerCountText.setText(`Players: ${state.players.size}`);
        });

        // ── Enemies ──────────────────────────────────────────────────────────
        const addEnemy = (enemy, id) => {
            const enemyId = id || enemy.id;
            if (!enemyId || this.enemySprites.has(enemyId)) return;

            const frame  = SHIP_FRAME_OFFSET + enemy.shipId;
            const sprite = this.add.sprite(enemy.x, enemy.y, ASSETS.spritesheet.ships.key, frame)
                .setDepth(10).setFlipY(true);
            this.enemySprites.set(enemyId, sprite);

            enemy.onChange(() => {
                const s = this.enemySprites.get(enemyId);
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
            const bulletId = id || bullet.id;
            if (!bulletId || this.playerBulletSprites.has(bulletId)) return;

            const sprite = this.add.sprite(bullet.x, bullet.y, ASSETS.spritesheet.tiles.key, bullet.power - 1)
                .setDepth(10);
            this.playerBulletSprites.set(bulletId, sprite);

            bullet.onChange(() => {
                const s = this.playerBulletSprites.get(bulletId);
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
            const bulletId = id || bullet.id;
            if (!bulletId || this.enemyBulletSprites.has(bulletId)) return;

            const sprite = this.add.sprite(bullet.x, bullet.y, ASSETS.spritesheet.tiles.key, EB_TILE_OFFSET + bullet.power)
                .setDepth(10).setFlipY(true);
            this.enemyBulletSprites.set(bulletId, sprite);

            bullet.onChange(() => {
                const s = this.enemyBulletSprites.get(bulletId);
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

    // Flat world background
    initWorldBackground() {
        this.localCamera.setBackgroundColor(WORLD_BACKGROUND_CSS);
        this.worldBackground = this.add.rectangle(0, 0, this.worldWidth, this.worldHeight, WORLD_BACKGROUND_COLOR)
            .setOrigin(0)
            .setDepth(-100);
        this.initTestTree();
        this.localCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    initTestTree() {
        const treeX = this.worldWidth * 0.5 + TEST_TREE_OFFSET_X;
        const treeY = this.worldHeight * 0.5;

        this.testTreeBottom = this.add.image(treeX, treeY, ASSETS.image.treeBottom.key)
            .setOrigin(0.5, 1)
            .setDisplaySize(TEST_TREE_HALF_SIZE, TEST_TREE_HALF_SIZE)
            .setDepth(90);

        this.testTreeTop = this.add.image(treeX, treeY, ASSETS.image.treeTop.key)
            .setOrigin(0.5, 1)
            .setDisplaySize(TEST_TREE_HALF_SIZE, TEST_TREE_HALF_SIZE)
            .setDepth(110);
    }

    isLocalSession(sessionId) {
        return !!this.localSessionId && sessionId === this.localSessionId;
    }

    activateLocalCamera(sprite, player) {
        this.localPlayerSprite = sprite;
        this.localPlayerState = player;
        this.localCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.localCamera.centerOn(player.x, player.y);
        this.localCamera.startFollow(sprite, false, 1, 1);
    }

    ensureLocalCameraFollow() {
        if (!this.localPlayerSprite) return;

        this.localCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        const followedSprite = this.localCamera._follow;
        if (followedSprite !== this.localPlayerSprite) {
            this.localCamera.startFollow(this.localPlayerSprite, false, 1, 1);
        }
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
        const sessionId = this.localSessionId;
        if (!sessionId || !this.playerSprites.has(sessionId)) return;

        const animationState = this.playerAnimationState.get(sessionId);
        if (animationState?.attacking) return;

        const dx = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
        const dy = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
        const direction = this.getDirectionFromVector(dx, dy);

        this.setPlayerAnimation(sessionId, !!direction, direction);
    }

    updateRemotePlayerAnimations() {
        this.playerAnimationState.forEach((animationState, sessionId) => {
            if (this.isLocalSession(sessionId) || !animationState.moving) return;

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

    playLocalAttackAnimation(pointer) {
        const sessionId = this.localSessionId;
        const animationState = sessionId ? this.playerAnimationState.get(sessionId) : null;
        const sprite = sessionId ? this.playerSprites.get(sessionId) : null;
        if (!this.gameStarted || !sessionId || !animationState || !sprite || animationState.attacking) return;

        const direction = this.getAttackDirectionFromPointer(pointer, sprite, animationState.direction || DEFAULT_PLAYER_DIRECTION);
        animationState.attackVisualLockUntil = this.time.now + 250;
        animationState.attackVisualLockX = sprite.x;
        animationState.attackVisualLockY = sprite.y;
        RoomClient.sendAttack(direction);
        this.playPlayerAttackAnimation(sessionId, direction, { playAudio: true });
    }

    getAttackDirectionFromPointer(pointer, sprite, fallbackDirection) {
        if (!pointer) return fallbackDirection;

        const worldPoint = (this.localCamera || this.cameras.main).getWorldPoint(pointer.x, pointer.y);
        return this.getDirectionFromVector(worldPoint.x - sprite.x, worldPoint.y - sprite.y) || fallbackDirection;
    }

    playPlayerAttackAnimation(sessionId, direction, { playAudio = true } = {}) {
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || animationState.attacking || !sprite.visible) return;

        animationState.attacking = true;

        const didPlay = this.playPlayerAnimation(sessionId, 'attack', direction, { force: true, restart: true });
        if (!didPlay) {
            animationState.attacking = false;
            return;
        }

        if (playAudio) {
            this.sound.play(ASSETS.audio.punchWhoosh.key, { volume: PUNCH_SOUND_VOLUME });
            if (this.playerAttackHitsTestTree(sprite, direction)) {
                this.sound.play(ASSETS.audio.woodHit.key, { volume: WOOD_HIT_SOUND_VOLUME });
            }
        }

        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            animationState.attacking = false;
            if (this.isLocalSession(sessionId)) {
                this.updateLocalPlayerAnimation();
            } else {
                this.setPlayerAnimation(sessionId, animationState.moving, null);
            }
        });
    }

    shouldPlayAttackAudio(sessionId) {
        if (this.isLocalSession(sessionId)) return true;
        if (!this.isTabActive || document.hidden || this.remoteAttackAudioDirty) return false;
        return performance.now() >= this.suppressRemoteAttackAudioUntil;
    }

    isDocumentActive() {
        const hasFocus = typeof document.hasFocus === 'function' ? document.hasFocus() : !document.hidden;
        return !document.hidden && hasFocus;
    }

    syncRemoteAttackSeqBaselines() {
        const players = RoomClient.room?.state?.players;
        if (!players) return;

        players.forEach((player, sessionId) => {
            const playerSessionId = sessionId || player.sessionId;
            if (!playerSessionId || this.isLocalSession(playerSessionId)) return;

            const animationState = this.playerAnimationState.get(playerSessionId);
            if (animationState) {
                animationState.lastAttackSeq = player.attackSeq || 0;
            }
        });
    }

    playerAttackHitsTestTree(sprite, direction) {
        const vector = DIRECTION_VECTORS[direction] || DIRECTION_VECTORS[DEFAULT_PLAYER_DIRECTION];
        const attackX = sprite.x + vector.x * ATTACK_HIT_OFFSET;
        const attackY = sprite.y + ATTACK_HIT_ORIGIN_Y_OFFSET + vector.y * ATTACK_HIT_OFFSET;
        const treeX = this.worldWidth * 0.5 + TEST_TREE_OFFSET_X;
        const treeY = this.worldHeight * 0.5 + TEST_TREE_TRUNK_Y_OFFSET;

        return this.circleOverlapsAabb(
            attackX,
            attackY,
            ATTACK_HIT_RADIUS,
            treeX,
            treeY,
            TEST_TREE_TRUNK_HALF_WIDTH,
            TEST_TREE_TRUNK_HALF_HEIGHT,
        );
    }

    circleOverlapsAabb(circleX, circleY, radius, rectX, rectY, rectHalfWidth, rectHalfHeight) {
        const closestX = Phaser.Math.Clamp(circleX, rectX - rectHalfWidth, rectX + rectHalfWidth);
        const closestY = Phaser.Math.Clamp(circleY, rectY - rectHalfHeight, rectY + rectHalfHeight);
        const dx = circleX - closestX;
        const dy = circleY - closestY;

        return dx * dx + dy * dy <= radius * radius;
    }

    setPlayerAnimation(sessionId, moving, direction) {
        const mode = moving ? 'run' : 'idle';
        this.playPlayerAnimation(sessionId, mode, direction);
    }

    playPlayerAnimation(sessionId, mode, direction, { force = false, restart = false } = {}) {
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || !sprite.visible) return false;
        if (animationState.attacking && !force) return false;

        const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
        animationState.direction = nextDirection;

        const animation = ANIMATION.player[mode]?.[nextDirection];
        if (!animation) return false;

        if (sprite.anims.currentAnim?.key !== animation.key || !sprite.anims.isPlaying) {
            sprite.play(animation.key);
        } else if (restart) {
            sprite.anims.stop();
            sprite.play(animation.key);
        }

        return true;
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

