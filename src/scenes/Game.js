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
const EB_TILE_OFFSET    = 11;  // tiles.png: enemy bullet frame = 11 + power
const DEFAULT_PLAYER_DIRECTION = 'N';
const PLAYER_DISPLAY_SIZE = 128;
const ENEMY_DISPLAY_SIZE = 128;
const TREE_HALF_SIZE = 96;
const LOG_DISPLAY_SIZE = 48;
const WOOD_UI_ICON_SIZE = 64;
const UI_DEPTH = 1000;
const DEFAULT_WORLD_WIDTH = 3840;
const DEFAULT_WORLD_HEIGHT = 2160;
const WORLD_BACKGROUND_COLOR = 0x2f7d32;
const WORLD_BACKGROUND_CSS = '#2f7d32';
const PUNCH_SOUND_VOLUME = 0.6;
const WOOD_HIT_SOUND_VOLUME = 0.75;
const TREE_FALL_SOUND_VOLUME = 0.75;
const SKELETON_HIT_SOUND_VOLUME = 0.75;
const GRAB_ITEM_SOUND_VOLUME = 0.75;
const ENEMY_DAMAGE_FLASH_MS = 90;
const REMOTE_ATTACK_AUDIO_RESUME_SUPPRESS_MS = 3000;
const LOG_PILE_OFFSETS = [
    { x: -18, y: -6 },
    { x: 0, y: -10 },
    { x: 18, y: -6 },
    { x: -9, y: 10 },
    { x: 11, y: 8 },
];
const DIRECTION_ORDER = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const FRAMES_PER_DIRECTION = 15;

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
        this.enemyAnimationState = new Map();
        this.treeSprites         = new Map();
        this.logSprites          = new Map();
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
        }).setOrigin(0.5).setDepth(UI_DEPTH).setScrollFactor(0);

        this.timerText = this.add.text(20, 20, '00:00', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
        }).setDepth(UI_DEPTH).setScrollFactor(0);

        this.woodIcon = this.add.image(52, this.scale.height - 52, ASSETS.image.log.key)
            .setOrigin(0.5)
            .setDisplaySize(WOOD_UI_ICON_SIZE, WOOD_UI_ICON_SIZE)
            .setDepth(UI_DEPTH)
            .setScrollFactor(0);

        this.woodText = this.add.text(96, this.scale.height - 70, '0', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
        }).setDepth(UI_DEPTH).setScrollFactor(0);

        this.killsText = this.add.text(this.scale.width - 20, 20, 'Kills: 0', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffff00',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(1, 0).setDepth(UI_DEPTH).setScrollFactor(0);

        this.playerCountText = this.add.text(this.scale.width - 20, 60, 'Players: 0', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#aaffaa',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(1, 0).setDepth(UI_DEPTH).setScrollFactor(0);

        this.gameOverText = this.add.text(this.centreX, this.centreY, 'Game Over\nPress Space for Lobby', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, align: 'center',
        }).setOrigin(0.5).setDepth(UI_DEPTH).setVisible(false).setScrollFactor(0);

        const roomCode = RoomClient.room ? RoomClient.room.id : '';
        this.roomCodeText = this.add.text(this.centreX, 20, `Room: ${roomCode}`, {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffaa00',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5, 0).setDepth(UI_DEPTH).setScrollFactor(0);
    }

    // ─── Animations ───────────────────────────────────────────────────────────
    initAnimations() {
        this.createAnimation(ANIMATION.explosion);

        Object.values(ANIMATION.player.idle).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.run).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.attack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy1.run).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy1.attack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy1.damage).forEach(animation => this.createAnimation(animation));
    }

    // ─── Input ────────────────────────────────────────────────────────────────
    initInput() {
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
            interact: Phaser.Input.Keyboard.KeyCodes.F,
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

        room.onMessage('treeHit', (hit) => {
            if (!hit || !this.shouldPlayTreeHitAudio(hit.attackerId)) return;
            this.sound.play(ASSETS.audio.woodHit.key, { volume: WOOD_HIT_SOUND_VOLUME });
        });

        room.onMessage('enemyHit', (hit) => {
            if (!hit || !this.shouldPlayEnemyHitAudio(hit.attackerId)) return;
            this.sound.play(ASSETS.audio.skeletonHit.key, { volume: SKELETON_HIT_SOUND_VOLUME });
        });

        room.onMessage('woodPickup', () => {
            this.sound.play(ASSETS.audio.grabItem.key, { volume: GRAB_ITEM_SOUND_VOLUME });
        });

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
                this.woodText.setText(`${player.wood || 0}`);

                player.listen('kills', (kills) => {
                    this.killsText.setText(`Kills: ${kills}`);
                });

                player.listen('wood', (wood) => {
                    this.woodText.setText(`${wood || 0}`);
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

        const addTree = (tree, id) => {
            const treeId = id || tree.id;
            if (!treeId || this.treeSprites.has(treeId)) return;

            const bottom = this.add.image(tree.x, tree.y, ASSETS.image.treeBottom.key)
                .setOrigin(0.5, 1)
                .setDisplaySize(TREE_HALF_SIZE, TREE_HALF_SIZE)
                .setDepth(90);

            const top = this.add.image(tree.x, tree.y, ASSETS.image.treeTop.key)
                .setOrigin(0.5, 1)
                .setDisplaySize(TREE_HALF_SIZE, TREE_HALF_SIZE)
                .setDepth(110);

            this.treeSprites.set(treeId, { bottom, top, tree });
        };

        state.trees.onAdd(addTree);
        state.trees.forEach(addTree);

        state.trees.onRemove((_tree, id) => {
            const sprites = this.treeSprites.get(id);
            if (!sprites) return;
            sprites.bottom.destroy();
            sprites.top.destroy();
            this.treeSprites.delete(id);
            if (this.shouldPlayWorldEventAudio()) {
                this.sound.play(ASSETS.audio.treeFall.key, { volume: TREE_FALL_SOUND_VOLUME });
            }
        });

        // ── Enemies ──────────────────────────────────────────────────────────
        const addLog = (log, id) => {
            const logId = id || log.id;
            if (!logId || this.logSprites.has(logId)) return;

            const sprites = LOG_PILE_OFFSETS.map((offset) => this.add.image(log.x + offset.x, log.y + offset.y, ASSETS.image.log.key)
                .setOrigin(0.5, 0.5)
                .setDisplaySize(LOG_DISPLAY_SIZE, LOG_DISPLAY_SIZE)
                .setDepth(85));

            this.logSprites.set(logId, { sprites, log });

            log.onChange(() => {
                const pile = this.logSprites.get(logId);
                if (!pile) return;
                pile.sprites.forEach((sprite, index) => {
                    const offset = LOG_PILE_OFFSETS[index] || { x: 0, y: 0 };
                    sprite.x = log.x + offset.x;
                    sprite.y = log.y + offset.y;
                });
            });
        };

        state.logs.onAdd(addLog);
        state.logs.forEach(addLog);

        state.logs.onRemove((_log, id) => {
            const pile = this.logSprites.get(id);
            if (pile) pile.sprites.forEach((sprite) => sprite.destroy());
            this.logSprites.delete(id);
        });

        const addEnemy = (enemy, id) => {
            const enemyId = id || enemy.id;
            if (!enemyId || this.enemySprites.has(enemyId)) return;

            const sprite = this.add.sprite(enemy.x, enemy.y, ASSETS.spritesheet.enemy1Run.key, 0)
                .setDepth(100)
                .setDisplaySize(ENEMY_DISPLAY_SIZE, ENEMY_DISPLAY_SIZE);
            this.enemySprites.set(enemyId, sprite);
            this.enemyAnimationState.set(enemyId, {
                direction: enemy.facingDirection || 'S',
                action: enemy.action || 'run',
                attacking: false,
                takingDamage: false,
                damageFlashEvent: null,
                lastAttackSeq: enemy.attackSeq || 0,
                lastDamageSeq: enemy.damageSeq || 0,
            });
            this.setEnemyAnimation(enemyId, enemy.action || 'run', enemy.facingDirection || 'S');

            enemy.onChange(() => {
                const s = this.enemySprites.get(enemyId);
                if (!s) return;

                s.x = Phaser.Math.Linear(s.x, enemy.x, 0.3);
                s.y = Phaser.Math.Linear(s.y, enemy.y, 0.3);
                this.setEnemyAnimation(enemyId, enemy.action || 'run', enemy.facingDirection || 'S');
            });

            enemy.listen('action', (action) => {
                const animationState = this.enemyAnimationState.get(enemyId);
                this.setEnemyAnimation(enemyId, action || 'run', enemy.facingDirection || animationState?.direction || 'S');
            });

            enemy.listen('facingDirection', (direction) => {
                const animationState = this.enemyAnimationState.get(enemyId);
                this.setEnemyAnimation(enemyId, animationState?.action || enemy.action || 'run', direction || animationState?.direction || 'S');
            });

            enemy.listen('attackSeq', () => {
                const animationState = this.enemyAnimationState.get(enemyId);
                if (!animationState || enemy.attackSeq <= animationState.lastAttackSeq) return;

                animationState.lastAttackSeq = enemy.attackSeq;
                if (enemy.attackSeq <= 0) return;
                this.playEnemyAttackAnimation(enemyId, enemy.facingDirection || animationState.direction || 'S');
            });

            enemy.listen('damageSeq', () => {
                const animationState = this.enemyAnimationState.get(enemyId);
                if (!animationState || enemy.damageSeq <= animationState.lastDamageSeq) return;

                animationState.lastDamageSeq = enemy.damageSeq;
                if (enemy.damageSeq <= 0) return;
                this.playEnemyDamageAnimation(enemyId, enemy.facingDirection || animationState.direction || 'S');
            });
        };

        state.enemies.onAdd(addEnemy);
        state.enemies.forEach(addEnemy);

        state.enemies.onRemove((_enemy, id) => {
            const s = this.enemySprites.get(id);
            if (s) { this.addExplosion(s.x, s.y); s.destroy(); }
            const animationState = this.enemyAnimationState.get(id);
            if (animationState?.damageFlashEvent) {
                animationState.damageFlashEvent.remove(false);
            }
            this.enemySprites.delete(id);
            this.enemyAnimationState.delete(id);
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
        this.timerText.setText(this.formatElapsedTime(state.elapsedSeconds || 0));
        state.listen('elapsedSeconds', (elapsedSeconds) => {
            this.timerText.setText(this.formatElapsedTime(elapsedSeconds || 0));
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
            interact: this.keys.interact.isDown,
        });
    }

    formatElapsedTime(elapsedSeconds) {
        const safeSeconds = Math.max(0, Math.floor(elapsedSeconds || 0));
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Flat world background
    initWorldBackground() {
        this.localCamera.setBackgroundColor(WORLD_BACKGROUND_CSS);
        this.worldBackground = this.add.rectangle(0, 0, this.worldWidth, this.worldHeight, WORLD_BACKGROUND_COLOR)
            .setOrigin(0)
            .setDepth(-100);
        this.localCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
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

        const worldPoint = this.getPointerWorldPoint(pointer);
        const direction = this.getAttackDirectionFromWorldPoint(worldPoint, sprite, animationState.direction || DEFAULT_PLAYER_DIRECTION);
        animationState.attackVisualLockUntil = this.time.now + 250;
        animationState.attackVisualLockX = sprite.x;
        animationState.attackVisualLockY = sprite.y;
        RoomClient.sendAttack(direction, worldPoint?.x, worldPoint?.y);
        this.playPlayerAttackAnimation(sessionId, direction, { playAudio: true });
    }

    getPointerWorldPoint(pointer) {
        if (!pointer) return null;
        return (this.localCamera || this.cameras.main).getWorldPoint(pointer.x, pointer.y);
    }

    getAttackDirectionFromWorldPoint(worldPoint, sprite, fallbackDirection) {
        if (!worldPoint) return fallbackDirection;
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

    shouldPlayWorldEventAudio() {
        if (!this.isTabActive || document.hidden || this.remoteAttackAudioDirty) return false;
        return performance.now() >= this.suppressRemoteAttackAudioUntil;
    }

    shouldPlayTreeHitAudio(attackerId) {
        if (this.isLocalSession(attackerId)) return true;
        return this.shouldPlayWorldEventAudio();
    }

    shouldPlayEnemyHitAudio(attackerId) {
        if (this.isLocalSession(attackerId)) return true;
        return this.shouldPlayWorldEventAudio();
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

    setEnemyAnimation(enemyId, action, direction) {
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!animationState) return;

        const nextDirection = direction || animationState.direction || 'S';
        animationState.direction = nextDirection;
        animationState.action = action || 'run';
        if (animationState.takingDamage) return;
        if (animationState.attacking) return;

        if (animationState.action === 'idle') {
            this.setEnemyIdleFrame(enemyId, nextDirection);
            return;
        }

        this.playEnemyAnimation(enemyId, 'run', nextDirection);
    }

    playEnemyAttackAnimation(enemyId, direction) {
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!animationState || animationState.attacking) return;

        animationState.attacking = true;
        const didPlay = this.playEnemyAnimation(enemyId, 'attack', direction, { restart: true });
        if (!didPlay) {
            animationState.attacking = false;
            return;
        }

        const sprite = this.enemySprites.get(enemyId);
        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            animationState.attacking = false;
            this.setEnemyAnimation(enemyId, animationState.action, animationState.direction);
        });
    }

    playEnemyDamageAnimation(enemyId, direction) {
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!animationState) return;

        animationState.takingDamage = true;
        animationState.attacking = false;
        const didPlay = this.playEnemyAnimation(enemyId, 'damage', direction, { restart: true });
        if (!didPlay) {
            animationState.takingDamage = false;
            return;
        }

        const sprite = this.enemySprites.get(enemyId);
        this.flashEnemyDamage(enemyId);
        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            animationState.takingDamage = false;
            this.setEnemyAnimation(enemyId, animationState.action, animationState.direction);
        });
    }

    flashEnemyDamage(enemyId) {
        const sprite = this.enemySprites.get(enemyId);
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!sprite || !animationState) return;

        if (animationState.damageFlashEvent) {
            animationState.damageFlashEvent.remove(false);
        }

        sprite.setTintFill(0xffffff);
        animationState.damageFlashEvent = this.time.delayedCall(ENEMY_DAMAGE_FLASH_MS, () => {
            const currentSprite = this.enemySprites.get(enemyId);
            const currentState = this.enemyAnimationState.get(enemyId);
            if (currentSprite) currentSprite.clearTint();
            if (currentState) currentState.damageFlashEvent = null;
        });
    }

    playEnemyAnimation(enemyId, mode, direction, { restart = false } = {}) {
        const sprite = this.enemySprites.get(enemyId);
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!sprite || !animationState) return false;

        const nextDirection = direction || animationState.direction || 'S';
        animationState.direction = nextDirection;

        const animation = ANIMATION.enemy1[mode]?.[nextDirection];
        if (!animation) return false;

        if (sprite.anims.currentAnim?.key !== animation.key || !sprite.anims.isPlaying) {
            sprite.play(animation.key);
        } else if (restart) {
            sprite.anims.stop();
            sprite.play(animation.key);
        }

        return true;
    }

    setEnemyIdleFrame(enemyId, direction) {
        const sprite = this.enemySprites.get(enemyId);
        if (!sprite) return;

        const row = DIRECTION_ORDER.indexOf(direction);
        const frame = Math.max(0, row) * FRAMES_PER_DIRECTION;
        if (sprite.anims.isPlaying) sprite.anims.stop();
        sprite.setTexture(ASSETS.spritesheet.enemy1Run.key, frame);
    }

    addExplosion(x, y) {
        new Explosion(this, x, y);
    }

    clearAllSprites() {
        this.playerSprites.forEach(s => s.destroy());
        this.enemySprites.forEach(s => s.destroy());
        this.treeSprites.forEach(({ bottom, top }) => {
            bottom.destroy();
            top.destroy();
        });
        this.logSprites.forEach(({ sprites }) => {
            sprites.forEach((sprite) => sprite.destroy());
        });
        this.playerBulletSprites.forEach(s => s.destroy());
        this.enemyBulletSprites.forEach(s => s.destroy());
        this.playerSprites.clear();
        this.playerAnimationState.clear();
        this.enemySprites.clear();
        this.enemyAnimationState.clear();
        this.treeSprites.clear();
        this.logSprites.clear();
        this.playerBulletSprites.clear();
        this.enemyBulletSprites.clear();
    }
}

