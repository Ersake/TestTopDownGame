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
const PLAYER_VISUAL_Y_OFFSET = 6;
const PLAYER_VISUAL_MOVE_SPEED = 255;
const PLAYER_VISUAL_SNAP_DISTANCE = 96;
const PLAYER_BODY_DEPTH = 100;
const PLAYER_WEAPON_DEPTH = 101;
const ENEMY_DISPLAY_SIZE = 128;
const DARK_KNIGHT_DISPLAY_SIZE = ENEMY_DISPLAY_SIZE * 1.5;
const ENEMY_VISUAL_Y_OFFSET = 6;
const TREE_HALF_SIZE = 96;
const LOG_DISPLAY_SIZE = 48;
const PLAYER_HITBOX_HW = 17;
const PLAYER_HITBOX_HH = 17;
const PLAYER_FOOT_RADIUS = 5;
const PLAYER_FOOT_Y_OFFSET = 36;
const ENEMY_HITBOX_HW = 28;
const ENEMY_HITBOX_HH = 28;
const ENEMY_FOOT_RADIUS = 7;
const ENEMY_FOOT_Y_OFFSET = 34;
const TREE_TRUNK_Y_OFFSET = -18;
const TREE_TRUNK_HW = 5;
const TREE_TRUNK_HH = 18;
const PLAYER_ATTACK_HIT_RADIUS = 44;
const PLAYER_ATTACK_HIT_START_OFFSET = 10;
const PLAYER_ATTACK_HIT_END_OFFSET = 40;
const PLAYER_ATTACK_HIT_ORIGIN_Y_OFFSET = 18;
const ARROW_DISPLAY_SIZE = 64;
const FIREBALL_DISPLAY_SIZE = 48;
const FIREBALL_DEPTH = 84;
const FIREBALL_ROTATION_OFFSET = Phaser.Math.DegToRad(32);
const BOW_AIM_SEND_INTERVAL_MS = 50;
const ENEMY_ATTACK_RANGE = 26;
const CASTER_CAST_RANGE = 360;
const DARK_KNIGHT_DETECTION_RANGE = CASTER_CAST_RANGE;
const DARK_KNIGHT_AOE_RADIUS = 88;
const ENEMY_ATTACK_HIT_OFFSET = 28;
const ENEMY_ATTACK_HIT_HW = 42;
const ENEMY_ATTACK_HIT_HH = 36;
const HITBOX_DEPTH = 950;
const HITBOX_BUTTON_SIZE = 34;
const OFFSCREEN_PLAYER_INDICATOR_RADIUS = 6;
const OFFSCREEN_PLAYER_INDICATOR_COLOR = 0x89cff0;
const OFFSCREEN_DEAD_PLAYER_INDICATOR_COLOR = 0xff9d2e;
const BUILD_GRID_SIZE = 32;
const BUILD_GRID_LINE_COLOR = 0xd8f5d0;
const BUILD_GRID_LINE_ALPHA = 0.22;
const BUILD_GRID_DOT_LENGTH = 6;
const BUILD_GRID_DOT_GAP = 10;
const WOOD_BLOCK_SIZE = 32;
const WOOD_BLOCK_FILL_COLOR = 0x8a5a2b;
const WOOD_BLOCK_STROKE_COLOR = 0x4b2d14;
const WOOD_BLOCK_HEALTH_BAR_WIDTH = 28;
const WOOD_BLOCK_HEALTH_BAR_HEIGHT = 4;
const WOOD_BLOCK_HEALTH_BAR_Y_OFFSET = -24;
const WOOD_BLOCK_HEALTH_BAR_FILL_COLOR = 0x22ff44;
const WOOD_BLOCK_HIT_FLASH_MS = 90;
const BUILD_PREVIEW_FILL_COLOR = 0xfff0a8;
const BUILD_PREVIEW_STROKE_COLOR = 0xffffff;
const BUILD_DRAG_SEND_INTERVAL_MS = 35;
const HAMMER_REPAIR_TICK_MS = 500;
const CAMPFIRE_DISPLAY_SIZE = 84;
const CAMPFIRE_HEAL_RADIUS = 320;
const CAMPFIRE_HEAL_INTERVAL_MS = 10000;
const CAMPFIRE_DEPTH = 86;
const CAMPFIRE_ANIMATION_KEY = 'campfire-burn';
const CAMPFIRE_ICON_FRAME = 0;
const CAMPFIRE_RADIUS_COLOR = 0xffc46a;
const CAMPFIRE_RADIUS_ALPHA = 0.65;
const CAMPFIRE_RADIUS_DOT_LENGTH = 10;
const CAMPFIRE_RADIUS_DOT_GAP = 8;
const CAMPFIRE_HEAL_BAR_WIDTH = 28;
const CAMPFIRE_HEAL_BAR_HEIGHT = 4;
const CAMPFIRE_HEAL_BAR_Y_OFFSET = -52;
const CAMPFIRE_HEAL_BAR_BACKGROUND_COLOR = 0x2b1608;
const CAMPFIRE_HEAL_BAR_FILL_COLOR = 0xff941f;
const UI_DEPTH = 1000;
const BUFF_LIST_X_OFFSET = 20;
const BUFF_LIST_Y = 96;
const DEFAULT_WORLD_WIDTH = 3840;
const DEFAULT_WORLD_HEIGHT = 2160;
const WORLD_BACKGROUND_COLOR = 0x2f7c31;
const WORLD_BACKGROUND_CSS = '#2f7c31';
const GRASS_NOISE_DEPTH = -99;
const GRASS_NOISE_DARK_COLOR = 0x1f5f27;
const GRASS_NOISE_CELL_SIZE = 96;
const GRASS_NOISE_PATCH_COUNT = 24;
const GRASS_NOISE_FLECK_COUNT = 460;
const PUNCH_SOUND_VOLUME = 0.6;
const WOOD_HIT_SOUND_VOLUME = 0.75;
const TREE_FALL_SOUND_VOLUME = 0.5;
const SKELETON_HIT_SOUND_VOLUME = 0.75;
const SKELETON_HIT_BURST_WINDOW_MS = 80;
const GRAB_ITEM_SOUND_VOLUME = 0.75;
const REVIVE_SOUND_VOLUME = 0.75;
const PLAYER_HURT_SOUND_VOLUME = 0.5625;
const LEVEL_UP_SOUND_VOLUME = 0.7;
const FIREBALL_CHARGE_SOUND_VOLUME = 0.315;
const FIREBALL_CAST_SOUND_VOLUME = 0.375;
const FIREBALL_SOUND_FALLOFF_POWER = 1.25;
const FIREBALL_STACK_VOLUME_MULTIPLIER = 0.72;
const DARK_KNIGHT_ATTACK_SOUND_VOLUME = 0.495;
const ENEMY_DAMAGE_FLASH_MS = 90;
const PLAYER_ATTACK_REPEAT_MS = 850;
const PLAYER_MAX_HEALTH = 5;
const PLAYER_HEALTH_BAR_WIDTH = 48;
const PLAYER_HEALTH_BAR_HEIGHT = 6;
const PLAYER_HEALTH_BAR_Y_OFFSET = -48;
const PLAYER_HEALTH_BAR_DEPTH = 130;
const PLAYER_HEALTH_BAR_FILL_COLOR = 0x10ff35;
const PLAYER_BOW_CHARGE_BAR_Y_OFFSET = PLAYER_HEALTH_BAR_Y_OFFSET + PLAYER_HEALTH_BAR_HEIGHT + 3;
const PLAYER_BOW_CHARGE_BAR_DEPTH = PLAYER_HEALTH_BAR_DEPTH + 1;
const PLAYER_BOW_CHARGE_BAR_COLOR = 0xffffff;
const PLAYER_BOW_CHARGE_BAR_ALPHA = 0.55;
const PLAYER_REVIVE_BAR_WIDTH = 58;
const PLAYER_REVIVE_BAR_HEIGHT = 7;
const PLAYER_REVIVE_BAR_Y_OFFSET = -38;
const PLAYER_REVIVE_BAR_DEPTH = 131;
const PLAYER_REVIVE_BAR_FILL_COLOR = 0x8bdcff;
const PLAYER_LEVEL_LABEL_Y_OFFSET = -27;
const PLAYER_LEVEL_LABEL_DEPTH = 132;
const HUD_BAR_WIDTH = 360;
const HUD_BAR_HEIGHT = 16;
const HUD_STACK_GAP = 8;
const HUD_BOTTOM_MARGIN = 14;
const EXPERIENCE_BAR_BACKGROUND_COLOR = 0x050505;
const EXPERIENCE_BAR_FILL_COLOR = 0x8a22d8;
const EXPERIENCE_BAR_STROKE_COLOR = 0x000000;
const HUD_HEALTH_BAR_FILL_COLOR = 0xff2020;
const HOTBAR_SLOT_COUNT = 9;
const HOTBAR_SLOT_SIZE = 53;
const HOTBAR_SLOT_GAP = 8;
const HOTBAR_ICON_SIZE = 35;
const HOTBAR_BOTTOM_GAP = 12;
const HOTBAR_SLOT_FILL_COLOR = 0xffffff;
const HOTBAR_SLOT_ACTIVE_COLOR = 0xfff4a3;
const OUTFIT_TAN_INDEX = 4;
const OUTFIT_COLOR_BUTTON_RADIUS = 11;
const OUTFIT_COLOR_BUTTON_X = 40;
const OUTFIT_COLOR_BUTTON_START_Y = 118;
const OUTFIT_COLOR_BUTTON_GAP = 36;
const OUTFIT_COLOR_BUTTONS = [
    { color: 0x7954b8, tint: 0x7954b8 },
    { color: 0x2477a6, tint: 0x2477a6 },
    { color: 0xba4343, tint: 0xba4343 },
    { color: 0x3fcd46, tint: 0x3fcd46 },
    { color: 0xa99d83, tint: null },
];
const ITEM_WOOD_AXE = 'wood_axe';
const ITEM_WOOD_BOW = 'wood_bow';
const ITEM_HAMMER = 'hammer';
const ITEM_CAMPFIRE = 'campfire';
const ITEM_WOOD = 'wood';
const BOW_RELEASE_FALLBACK_MS = 350;
const ENEMY_MAX_HEALTH = 3;
const ENEMY_HEALTH_BAR_WIDTH = 48;
const ENEMY_HEALTH_BAR_HEIGHT = 6;
const ENEMY_HEALTH_BAR_Y_OFFSET = -60;
const ENEMY_HEALTH_BAR_DEPTH = 130;
const ENEMY_HEALTH_BAR_FILL_COLOR = 0xff1010;
const REMOTE_ATTACK_AUDIO_RESUME_SUPPRESS_MS = 3000;
const INITIAL_SERVER_AUDIO_SUPPRESS_MS = 1500;
const LEVEL_RESET_EFFECT_SUPPRESS_MS = 1200;
const MASTER_VOLUME_STORAGE_KEY = 'testtopdown-master-volume';
const DEFAULT_MASTER_VOLUME = 0.5;
const MAX_EFFECTIVE_SOUND_VOLUME = 0.65;
const VOLUME_SLIDER_WIDTH = 120;
const VOLUME_SLIDER_HEIGHT = 8;
const VOLUME_UI_ICON_SIZE = 48;
const SPATIAL_FULL_VOLUME_RADIUS = 250;
const SPATIAL_MAX_VOLUME = 0.9;
const SPATIAL_MIN_ONSCREEN_VOLUME = 0.25;
const SPATIAL_MIN_AUDIBLE_VIEWPORT_SCALE = 0.5;
const SPATIAL_SILENT_VIEWPORT_SCALE = 0.8;
const CAMERA_MIN_ZOOM = 1;
const CAMERA_MAX_ZOOM = 1.45;
const CAMERA_ZOOM_STEP = 0.08;
const LOG_PILE_OFFSETS = [
    { x: -18, y: -6 },
    { x: 0, y: -10 },
    { x: 18, y: -6 },
    { x: -9, y: 10 },
    { x: 11, y: 8 },
];
const PLAYER_DIRECTION_ORDER = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const ENEMY_DIRECTION_ORDER = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const FRAMES_PER_DIRECTION = 15;
const PLAYER_BUFFS = [
    { field: 'axeSwingSpeedUpgrades', label: 'Axe swing speed' },
    { field: 'axeTreeDamageUpgrades', label: 'Axe wood damage' },
    { field: 'axeEnemyDamageUpgrades', label: 'Axe enemy damage' },
    { field: 'bowDamageUpgrades', label: 'Bow damage' },
    { field: 'bowPierceUpgrades', label: 'Bow pierce' },
    { field: 'bowChargeTimeUpgrades', label: 'Bow charge speed' },
    { field: 'barricadeHealthUpgrades', label: 'Barricade health' },
    { field: 'woodGatherUpgrades', label: 'Wood gathering' },
    { field: 'campfireUpgrades', label: 'Campfire charge' },
];

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

    update(_time, delta) {
        if (!this.gameStarted) return;
        this.sendInput();
        this.updatePlayerVisualPositions(delta);
        this.ensureLocalCameraFollow();
        this.updateBowChargeAim();
        this.updateHeldAttack();
        this.updateBuildHold();
        this.updateLocalPlayerAnimation();
        this.updateRemotePlayerAnimations();
        this.updatePlayerHealthBars();
        this.updatePlayerBowChargeBars();
        this.updatePlayerReviveBars();
        this.updatePlayerLevelLabels();
        this.updateOffscreenPlayerIndicators();
        this.updateEnemyHealthBars();
        this.updateCampfireHealBars();
        this.updateHitboxOverlay();
    }

    // ─── Variables ────────────────────────────────────────────────────────────
    initVariables() {
        this.gameStarted = false;
        this.localSessionId = RoomClient.sessionId;
        this.localPlayerSprite = null;
        this.localPlayerState = null;
        this.localCamera = this.cameras.main;
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.setScroll(0, 0);
        this.uiCamera.setZoom(1);
        this.fixedUiObjects = new Set();
        this.centreX = this.scale.width  * 0.5;
        this.centreY = this.scale.height * 0.5;

        const state = RoomClient.room?.state;

        // Server-owned world bounds. The client only renders inside this space.
        this.worldWidth  = state?.worldWidth  || DEFAULT_WORLD_WIDTH;
        this.worldHeight = state?.worldHeight || DEFAULT_WORLD_HEIGHT;

        // Sprite dictionaries keyed by server-side ID
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.playerSprites       = new Map();
        this.playerWeaponSprites = new Map();
        this.playerAnimationState = new Map();
        this.playerHealthBars = new Map();
        this.playerBowChargeBars = new Map();
        this.playerReviveBars = new Map();
        this.playerLevelLabels = new Map();
        this.offscreenPlayerIndicators = new Map();
        this.localExperienceState = null;
        this.localPendingUpgradeChoices = 0;
        this.localActiveSlot = 1;
        this.hotbarSlots = [];
        this.hotbarSlotItems = [ITEM_WOOD_AXE, ITEM_WOOD_BOW, ITEM_HAMMER, '', '', '', '', '', ''];
        this.hotbarSlotCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.upgradeUiMode = 'root';
        this.upgradeUiObjects = [];
        this.outfitColorIndex = OUTFIT_TAN_INDEX;
        this.outfitColorButtons = [];
        this.outfitColorButtonObjects = new Set();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.enemySprites        = new Map();
        this.enemyAnimationState = new Map();
        this.enemyHealthBars = new Map();
        this.casterChargeSounds = new Map();
        this.treeSprites         = new Map();
        this.logSprites          = new Map();
        this.woodBlockSprites    = new Map();
        this.campfireSprites     = new Map();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.playerBulletSprites = new Map();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.enemyBulletSprites  = new Map();
        this.grassNoiseLayer = null;
        this.isBuildModeActive = false;
        this.buildGridGraphics = null;
        this.buildPreview = null;
        this.buildPreviewKind = null;
        this.activeBuildPointerId = null;
        this.activeBuildPointer = null;
        this.activeBuildButton = null;
        this.lastBuildDragCellId = null;
        this.lastBuildDragSentAt = 0;
        this.attackHeldPointerId = null;
        this.attackHeldPointer = null;
        this.bowChargePointerId = null;
        this.bowChargePointer = null;
        this.nextBowAimSendAt = 0;
        this.nextHeldAttackAt = 0;
        this.lastEscapeToggleAt = 0;
        this.isQuittingToLobby = false;
        this.cameraZoom = CAMERA_MIN_ZOOM;
        this.showHitboxes = false;
        this.hitboxGraphics = null;
        this.masterVolume = this.loadMasterVolume();
        this.sfxGroupLastPlayedAt = new Map();
        this.activeSfxStacks = new Map();
        this.suppressServerEventAudioUntil = performance.now() + INITIAL_SERVER_AUDIO_SUPPRESS_MS;
        this.suppressResetEffectsUntil = 0;
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
        this.handleEscapeKey = (event) => {
            if (event?.key !== 'Escape' && event?.code !== 'Escape') return;
            this.handleEscapeQuit(event);
        };
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('blur', this.handleTabInactive);
        window.addEventListener('focus', this.handleTabActive);
        window.addEventListener('keydown', this.handleEscapeKey, true);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            window.removeEventListener('blur', this.handleTabInactive);
            window.removeEventListener('focus', this.handleTabActive);
            window.removeEventListener('keydown', this.handleEscapeKey, true);
            this.disableBuildMode();
            this.stopAllCasterChargeSounds();
        });
    }

    registerFixedUi(...objects) {
        objects.flat().forEach((object) => {
            if (!object) return;
            this.fixedUiObjects.add(object);
            this.localCamera?.ignore(object);
        });
    }

    registerWorldObject(...objects) {
        objects.flat().forEach((object) => {
            if (!object) return;
            this.uiCamera?.ignore(object);
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

        this.killsText = this.add.text(this.scale.width - 20, 20, 'Kills: 0', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffff00',
            stroke: '#000000', strokeThickness: 8,
        }).setOrigin(1, 0).setDepth(UI_DEPTH).setScrollFactor(0);

        this.playerCountText = this.add.text(this.scale.width - 20, 60, 'Players: 0', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#aaffaa',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(1, 0).setDepth(UI_DEPTH).setScrollFactor(0);

        this.buffListText = this.add.text(this.scale.width - BUFF_LIST_X_OFFSET, BUFF_LIST_Y, '', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ffe27a',
            stroke: '#000000', strokeThickness: 5, align: 'right',
        }).setOrigin(1, 0).setDepth(UI_DEPTH).setScrollFactor(0);

        this.gameOverText = this.add.text(this.centreX, this.centreY, 'Game Over\nRestarting in 10', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, align: 'center',
        }).setOrigin(0.5).setDepth(UI_DEPTH).setVisible(false).setScrollFactor(0);

        this.quitButton = this.add.text(this.centreX, this.centreY + 118, 'Quit', {
            fontFamily: 'Arial Black', fontSize: 34, color: '#ffdddd',
            stroke: '#000000', strokeThickness: 7, align: 'center',
        }).setOrigin(0.5).setDepth(UI_DEPTH).setVisible(false).setScrollFactor(0)
            .setInteractive({ useHandCursor: true });
        this.quitButton.on('pointerover', () => this.quitButton.setColor('#ffffff'));
        this.quitButton.on('pointerout', () => this.quitButton.setColor('#ffdddd'));
        this.quitButton.on('pointerdown', () => {
            this.quitToLobby();
        });

        const roomCode = RoomClient.room ? RoomClient.room.id : '';
        this.roomCodeText = this.add.text(this.centreX, 20, `Room: ${roomCode}`, {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffaa00',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5, 0).setDepth(UI_DEPTH).setScrollFactor(0);

        this.hitboxToggleButton = this.add.text(
            this.scale.width - HITBOX_BUTTON_SIZE * 0.5 - 12,
            this.scale.height - HITBOX_BUTTON_SIZE * 0.5 - 12,
            'X',
            {
                fontFamily: 'Arial Black', fontSize: 22, color: '#ff2222',
                stroke: '#000000', strokeThickness: 5, align: 'center',
                fixedWidth: HITBOX_BUTTON_SIZE,
                fixedHeight: HITBOX_BUTTON_SIZE,
            },
        ).setOrigin(0.5)
            .setDepth(UI_DEPTH + 10)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true });
        this.hitboxToggleButton.on('pointerdown', () => this.toggleHitboxes());

        this.initExperienceBar();
        this.initHudHealthBar();
        this.initHotbar();
        this.initOutfitColorPicker();
        this.initVolumeSlider();
        this.registerFixedUi(
            this.tutorialText,
            this.timerText,
            this.killsText,
            this.playerCountText,
            this.buffListText,
            this.gameOverText,
            this.quitButton,
            this.roomCodeText,
            this.hitboxToggleButton,
        );
    }

    updateBuffList(player) {
        if (!this.buffListText) return;

        const buffs = PLAYER_BUFFS
            .map(({ field, label }) => ({ label, stacks: Math.max(0, player[field] || 0) }))
            .filter(({ stacks }) => stacks > 0)
            .map(({ label, stacks }) => `${label} x${stacks}`);

        this.buffListText.setText(buffs.length > 0 ? `BUFFS\n${buffs.join('\n')}` : '');
    }

    initOutfitColorPicker() {
        this.outfitColorButtons.forEach(({ fill, selection }) => {
            fill?.destroy();
            selection?.destroy();
        });
        this.outfitColorButtons = [];
        this.outfitColorButtonObjects.clear();

        OUTFIT_COLOR_BUTTONS.forEach((option, index) => {
            const y = OUTFIT_COLOR_BUTTON_START_Y + index * OUTFIT_COLOR_BUTTON_GAP;
            const selection = this.add.circle(
                OUTFIT_COLOR_BUTTON_X,
                y,
                OUTFIT_COLOR_BUTTON_RADIUS + 4,
            )
                .setStrokeStyle(2, 0xffffff, 0.85)
                .setDepth(UI_DEPTH + 2)
                .setScrollFactor(0)
                .setVisible(index === this.outfitColorIndex);
            const fill = this.add.circle(
                OUTFIT_COLOR_BUTTON_X,
                y,
                OUTFIT_COLOR_BUTTON_RADIUS,
                option.color,
                1,
            )
                .setDepth(UI_DEPTH + 3)
                .setScrollFactor(0)
                .setInteractive({ useHandCursor: true });

            fill.on('pointerdown', (pointer, _localX, _localY, event) => {
                event?.stopPropagation();
                this.setLocalOutfitColor(index);
            });

            this.outfitColorButtons.push({ fill, selection, index });
            this.outfitColorButtonObjects.add(fill);
            this.outfitColorButtonObjects.add(selection);
            this.registerFixedUi(fill, selection);
        });
    }

    setLocalOutfitColor(index) {
        if (!OUTFIT_COLOR_BUTTONS[index]) return;

        this.outfitColorIndex = index;
        this.outfitColorButtons.forEach(({ selection, index: buttonIndex }) => {
            selection?.setVisible(buttonIndex === index);
        });
        this.applyLocalOutfitTint();
    }

    applyLocalOutfitTint() {
        const sprite = this.localSessionId ? this.playerSprites.get(this.localSessionId) : null;
        if (!sprite) return;

        const tint = OUTFIT_COLOR_BUTTONS[this.outfitColorIndex]?.tint;
        if (tint == null) {
            sprite.clearTint();
        } else {
            sprite.setTint(tint);
        }
    }

    initExperienceBar() {
        const x = this.centreX - HUD_BAR_WIDTH * 0.5;
        const y = this.scale.height - HUD_BOTTOM_MARGIN - HUD_BAR_HEIGHT;

        this.experienceBarBackground = this.add.graphics().setDepth(UI_DEPTH).setScrollFactor(0);
        this.experienceBarFill = this.add.graphics().setDepth(UI_DEPTH + 1).setScrollFactor(0);
        this.experienceBarText = this.add.text(this.centreX, y + HUD_BAR_HEIGHT * 0.5, 'XP: 0 / 5', {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(UI_DEPTH + 2).setScrollFactor(0);

        this.experienceBarLayout = { x, y, width: HUD_BAR_WIDTH, height: HUD_BAR_HEIGHT };
        this.updateExperienceBar(0, 5, 1);
        this.registerFixedUi(this.experienceBarBackground, this.experienceBarFill, this.experienceBarText);
    }

    initHudHealthBar() {
        const x = this.centreX - HUD_BAR_WIDTH * 0.5;
        const y = this.experienceBarLayout.y - HUD_STACK_GAP - HUD_BAR_HEIGHT;

        this.hudHealthBarBackground = this.add.graphics().setDepth(UI_DEPTH).setScrollFactor(0);
        this.hudHealthBarFill = this.add.graphics().setDepth(UI_DEPTH + 1).setScrollFactor(0);
        this.hudHealthBarText = this.add.text(this.centreX, y + HUD_BAR_HEIGHT * 0.5, 'HP: 5 / 5', {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(UI_DEPTH + 2).setScrollFactor(0);

        this.hudHealthBarLayout = { x, y, width: HUD_BAR_WIDTH, height: HUD_BAR_HEIGHT };
        this.updateHudHealthBar(PLAYER_MAX_HEALTH);
        this.registerFixedUi(this.hudHealthBarBackground, this.hudHealthBarFill, this.hudHealthBarText);
    }

    initHotbar() {
        this.hotbarSlots.forEach((slot) => {
            slot.box?.destroy();
            slot.icon?.destroy();
            slot.label?.destroy();
            slot.countLabel?.destroy();
        });
        this.hotbarSlots = [];

        const totalWidth = HOTBAR_SLOT_COUNT * HOTBAR_SLOT_SIZE + (HOTBAR_SLOT_COUNT - 1) * HOTBAR_SLOT_GAP;
        const startX = this.centreX - totalWidth * 0.5 + HOTBAR_SLOT_SIZE * 0.5;
        const y = this.hudHealthBarLayout.y - HOTBAR_BOTTOM_GAP - HOTBAR_SLOT_SIZE * 0.5;

        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            const slot = i + 1;
            const x = startX + i * (HOTBAR_SLOT_SIZE + HOTBAR_SLOT_GAP);
            const box = this.add.rectangle(x, y, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_FILL_COLOR, 0.22)
                .setOrigin(0.5)
                .setStrokeStyle(2, HOTBAR_SLOT_FILL_COLOR, 0.5)
                .setDepth(UI_DEPTH + 3)
                .setScrollFactor(0);
            const label = this.add.text(x - HOTBAR_SLOT_SIZE * 0.5 + 5, y - HOTBAR_SLOT_SIZE * 0.5 + 3, `${slot}`, {
                fontFamily: 'Arial Black', fontSize: 10, color: '#ffffff',
                stroke: '#000000', strokeThickness: 3,
            }).setDepth(UI_DEPTH + 5).setScrollFactor(0);

            const item = this.hotbarSlotItems[i];
            const count = this.hotbarSlotCounts[i] || 0;
            const iconKey = this.getHotbarIconKey(item);
            const icon = iconKey ? this.add.image(x, y + 2, iconKey).setOrigin(0.5) : null;
            if (icon) {
                if (item === ITEM_CAMPFIRE) icon.setFrame(CAMPFIRE_ICON_FRAME);
                icon.setDisplaySize(HOTBAR_ICON_SIZE, HOTBAR_ICON_SIZE)
                    .setDepth(UI_DEPTH + 4)
                    .setScrollFactor(0);
            }
            const countLabel = item && count > 0
                ? this.add.text(x + HOTBAR_SLOT_SIZE * 0.5 - 5, y + HOTBAR_SLOT_SIZE * 0.5 - 15, `${count}`, {
                    fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
                    stroke: '#000000', strokeThickness: 3,
                }).setOrigin(1, 0.5).setDepth(UI_DEPTH + 6).setScrollFactor(0)
                : null;

            this.hotbarSlots.push({ box, icon, label, countLabel, slot });
            this.registerFixedUi(box, icon, label, countLabel);
        }

        this.updateHotbarSelection();
    }

    getHotbarIconKey(item) {
        if (item === ITEM_WOOD_AXE) return ASSETS.image.woodAxeIcon.key;
        if (item === ITEM_WOOD_BOW) return ASSETS.image.woodBowIcon.key;
        if (item === ITEM_HAMMER) return ASSETS.image.hammerIcon.key;
        if (item === ITEM_CAMPFIRE) return ASSETS.spritesheet.campfire.key;
        if (item === ITEM_WOOD) return ASSETS.image.log.key;
        return null;
    }

    syncLocalHotbarFromPlayer(player) {
        if (!player?.hotbarItems) return;
        const nextItems = [];
        const nextCounts = [];
        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            nextItems.push(player.hotbarItems[i] || '');
            nextCounts.push(player.hotbarCounts?.[i] || 0);
        }
        this.hotbarSlotItems = nextItems;
        this.hotbarSlotCounts = nextCounts;
        this.initHotbar();
        this.localActiveSlot = player.activeSlot || 1;
        this.updateHotbarSelection();
    }

    updateUpgradeUi() {
        this.clearUpgradeUi();
        if (this.localPendingUpgradeChoices <= 0) return;

        const root = this.upgradeUiMode === 'root';
        const width = this.scale.width;
        const height = this.scale.height;
        const baseX = width - 156;
        const baseY = height - 98;
        const topY = baseY - 118;
        const leftX = baseX - 72;
        const rightX = baseX + 72;

        this.createUpgradeText(baseX, topY - 58, 'UPGRADE AVAILABLE', 24);

        if (root) {
            this.createUpgradeHex(baseX, topY, 44, { iconKey: ASSETS.image.woodAxeIcon.key, onClick: () => this.openUpgradeCategory('axe') });
            this.createUpgradeHex(leftX, baseY, 44, { iconKey: ASSETS.image.woodBowIcon.key, onClick: () => this.openUpgradeCategory('bow') });
            this.createUpgradeHex(rightX, baseY, 44, { iconKey: ASSETS.image.hammerIcon.key, onClick: () => this.openUpgradeCategory('hammer') });
            return;
        }

        const options = this.getUpgradeOptions(this.upgradeUiMode);
        this.createUpgradeHex(baseX, topY, 58, options[0]);
        this.createUpgradeHex(leftX, baseY, 58, options[1]);
        this.createUpgradeHex(rightX, baseY, 58, options[2]);
        this.createUpgradeCategoryIcon(baseX, baseY - 40, this.upgradeUiMode);
        this.createUpgradeBackButton(rightX + 76, baseY + 24);
    }

    getUpgradeOptions(category) {
        if (category === 'axe') {
            return [
                { text: '+25% swing\nspeed', upgradeId: 'axe_swing_speed' },
                { text: '+1 dmg\nto wood', upgradeId: 'axe_tree_damage' },
                { text: '+1 dmg\nto enemies', upgradeId: 'axe_enemy_damage' },
            ];
        }
        if (category === 'bow') {
            return [
                { text: '+1 damage', upgradeId: 'bow_damage' },
                { text: '+1 pierce', upgradeId: 'bow_pierce' },
                { text: '-25% charge\ntime', upgradeId: 'bow_charge_time' },
            ];
        }
        return [
            { text: '+5 barricade\nHP', upgradeId: 'hammer_barricade_hp' },
            { text: '+50% wood\ngather', upgradeId: 'hammer_wood_gather' },
            { text: '+1 campfire', upgradeId: 'hammer_campfire' },
        ];
    }

    openUpgradeCategory(category) {
        this.upgradeUiMode = category;
        this.updateUpgradeUi();
    }

    createUpgradeCategoryIcon(x, y, category) {
        const iconKey = {
            axe: ASSETS.image.woodAxeIcon.key,
            bow: ASSETS.image.woodBowIcon.key,
            hammer: ASSETS.image.hammerIcon.key,
        }[category];
        if (!iconKey) return;

        const icon = this.add.image(x, y, iconKey)
            .setOrigin(0.5)
            .setDisplaySize(40, 40)
            .setDepth(UI_DEPTH + 21)
            .setScrollFactor(0);
        this.upgradeUiObjects.push(icon);
        this.registerFixedUi(icon);
    }

    selectUpgrade(upgradeId) {
        RoomClient.sendSelectUpgrade(upgradeId);
        this.upgradeUiMode = 'root';
    }

    createUpgradeText(x, y, text, size = 22) {
        const label = this.add.text(x, y, text, {
            fontFamily: 'Arial',
            fontSize: size,
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5).setDepth(UI_DEPTH + 20).setScrollFactor(0);
        this.upgradeUiObjects.push(label);
        this.registerFixedUi(label);
        return label;
    }

    createUpgradeHex(x, y, radius, config) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = Phaser.Math.DegToRad(30 + i * 60);
            points.push(new Phaser.Geom.Point(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
        }

        const graphics = this.add.graphics().setDepth(UI_DEPTH + 18).setScrollFactor(0);
        graphics.fillStyle(0x1f7b34, 0.18);
        graphics.fillPoints(points, true);
        graphics.lineStyle(4, 0x000000, 1);
        graphics.strokePoints(points, true);
        this.upgradeUiObjects.push(graphics);
        this.registerFixedUi(graphics);

        if (config.iconKey) {
            const icon = this.add.image(x, y, config.iconKey)
                .setOrigin(0.5)
                .setDisplaySize(radius * 1.08, radius * 1.08)
                .setDepth(UI_DEPTH + 21)
                .setScrollFactor(0);
            this.upgradeUiObjects.push(icon);
            this.registerFixedUi(icon);
        }

        if (config.text) {
            this.createUpgradeText(x, y, config.text, 24);
        }

        const zone = this.add.zone(x, y, radius * 1.75, radius * 1.75)
            .setOrigin(0.5)
            .setDepth(UI_DEPTH + 22)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', (pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            if (config.upgradeId) this.selectUpgrade(config.upgradeId);
            else config.onClick?.();
        });
        this.upgradeUiObjects.push(zone);
        this.registerFixedUi(zone);
    }

    createUpgradeBackButton(x, y) {
        const button = this.add.text(x, y, 'X', {
            fontFamily: 'Arial Black',
            fontSize: 34,
            color: '#ff2222',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(UI_DEPTH + 24).setScrollFactor(0).setInteractive({ useHandCursor: true });
        button.on('pointerdown', (pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            this.upgradeUiMode = 'root';
            this.updateUpgradeUi();
        });
        this.upgradeUiObjects.push(button);
        this.registerFixedUi(button);
    }

    clearUpgradeUi() {
        this.upgradeUiObjects.forEach((object) => object?.destroy());
        this.upgradeUiObjects = [];
    }

    updateHotbarSelection() {
        this.hotbarSlots.forEach(({ box, slot }) => {
            if (!box) return;
            const active = slot === this.localActiveSlot;
            box.setFillStyle(active ? HOTBAR_SLOT_ACTIVE_COLOR : HOTBAR_SLOT_FILL_COLOR, active ? 0.36 : 0.22);
            box.setStrokeStyle(active ? 3 : 2, active ? HOTBAR_SLOT_ACTIVE_COLOR : HOTBAR_SLOT_FILL_COLOR, active ? 0.95 : 0.5);
        });
    }

    initVolumeSlider() {
        const x = this.centreX - VOLUME_SLIDER_WIDTH * 0.5;
        const y = 58;

        this.volumeIcon = this.add.image(x - 42, y, ASSETS.image.volume.key)
            .setOrigin(0.5)
            .setDisplaySize(VOLUME_UI_ICON_SIZE, VOLUME_UI_ICON_SIZE)
            .setDepth(UI_DEPTH)
            .setScrollFactor(0);

        this.volumeSliderTrack = this.add.rectangle(x, y, VOLUME_SLIDER_WIDTH, VOLUME_SLIDER_HEIGHT, 0x050505, 0.85)
            .setOrigin(0, 0.5)
            .setDepth(UI_DEPTH)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true });

        this.volumeSliderFill = this.add.rectangle(x, y, VOLUME_SLIDER_WIDTH, VOLUME_SLIDER_HEIGHT, 0xdddddd, 1)
            .setOrigin(0, 0.5)
            .setDepth(UI_DEPTH + 1)
            .setScrollFactor(0);

        this.volumeSliderKnob = this.add.circle(x, y, 8, 0xffffff, 1)
            .setDepth(UI_DEPTH + 2)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true });

        const updateFromPointer = (pointer) => {
            const value = Phaser.Math.Clamp((pointer.x - x) / VOLUME_SLIDER_WIDTH, 0, 1);
            this.setMasterVolume(value);
        };

        this.volumeSliderTrack.on('pointerdown', updateFromPointer);
        this.volumeSliderFill.on('pointerdown', updateFromPointer);
        this.volumeSliderKnob.on('pointerdown', (pointer) => {
            updateFromPointer(pointer);
            this.volumeSliderDragging = true;
        });
        this.input.on('pointermove', (pointer) => {
            if (this.volumeSliderDragging) updateFromPointer(pointer);
        });
        this.input.on('pointerup', () => {
            this.volumeSliderDragging = false;
        });

        this.updateVolumeSliderUi();
        this.registerFixedUi(
            this.volumeIcon,
            this.volumeSliderTrack,
            this.volumeSliderFill,
            this.volumeSliderKnob,
        );
    }

    // ─── Animations ───────────────────────────────────────────────────────────
    initAnimations() {
        this.createAnimation(ANIMATION.explosion);

        Object.values(ANIMATION.player.idle).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.run).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.axe).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.bow).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.die).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodAxeIdle).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodAxeRun).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodAxeAttack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodBowIdle).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodBowRun).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodBowAttack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy1.run).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy1.attack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy1.damage).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy1.death).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy2.run).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy2.attack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy2.damage).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.enemy2.death).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.caster.run).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.caster.charge).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.caster.attack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.caster.damage).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.caster.death).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.dk.walk).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.dk.run).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.dk.attack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.dk.idle).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.dk.damage).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.dk.death).forEach(animation => this.createAnimation(animation));
        this.createAnimation(ANIMATION.fireball);
        if (!this.anims.exists(CAMPFIRE_ANIMATION_KEY)) {
            this.anims.create({
                key: CAMPFIRE_ANIMATION_KEY,
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.campfire.key, {
                    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
                }),
                frameRate: 12,
                repeat: -1,
            });
        }
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
            escape: Phaser.Input.Keyboard.KeyCodes.ESC,
            slot1: Phaser.Input.Keyboard.KeyCodes.ONE,
            slot2: Phaser.Input.Keyboard.KeyCodes.TWO,
            slot3: Phaser.Input.Keyboard.KeyCodes.THREE,
            slot4: Phaser.Input.Keyboard.KeyCodes.FOUR,
            slot5: Phaser.Input.Keyboard.KeyCodes.FIVE,
            slot6: Phaser.Input.Keyboard.KeyCodes.SIX,
            slot7: Phaser.Input.Keyboard.KeyCodes.SEVEN,
            slot8: Phaser.Input.Keyboard.KeyCodes.EIGHT,
            slot9: Phaser.Input.Keyboard.KeyCodes.NINE,
        });

        this.input.mouse?.disableContextMenu();
        this.keys.escape.on('down', (key, event) => {
            this.handleEscapeQuit(event);
        });
        for (let slot = 1; slot <= HOTBAR_SLOT_COUNT; slot++) {
            this.keys[`slot${slot}`].on('down', () => this.equipHotbarSlot(slot));
        }
        this.input.keyboard.on('keydown-ESC', (event) => {
            this.handleEscapeQuit(event);
        });

        this.input.on('pointerdown', (pointer, gameObjects = []) => {
            if (
                gameObjects.includes(this.hitboxToggleButton)
                || gameObjects.includes(this.quitButton)
                || gameObjects.some(gameObject => this.outfitColorButtonObjects.has(gameObject))
                || gameObjects.some(gameObject => this.upgradeUiObjects.includes(gameObject))
            ) {
                return;
            }
            if (this.isBuildModeActive) {
                this.handleBuildModePointerDown(pointer);
                return;
            }

            if (pointer.leftButtonDown()) {
                if (this.getLocalActiveItem() === ITEM_WOOD_BOW) {
                    this.startBowCharge(pointer);
                } else {
                    this.startHeldAttack(pointer);
                }
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isBuildModeActive) {
                this.updateBuildPreview(pointer);
                this.handleBuildModePointerDrag(pointer);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (this.activeBuildPointerId === pointer.id) {
                this.activeBuildPointerId = null;
                this.activeBuildPointer = null;
                this.activeBuildButton = null;
                this.lastBuildDragCellId = null;
            }
            if (this.attackHeldPointerId === pointer.id) {
                this.stopHeldAttack();
            }
            if (this.bowChargePointerId === pointer.id) {
                this.releaseBowCharge(pointer);
            }
        });

        this.input.on('wheel', (_pointer, _gameObjects, _deltaX, deltaY) => {
            this.handleCameraWheel(deltaY);
        });
    }

    // ─── Networking ───────────────────────────────────────────────────────────
    equipHotbarSlot(slot) {
        if (!Number.isInteger(slot) || slot < 1 || slot > HOTBAR_SLOT_COUNT) return;
        this.localActiveSlot = slot;
        this.updateHotbarSelection();
        RoomClient.sendEquipSlot(slot);

        const sessionId = this.localSessionId;
        const animationState = sessionId ? this.playerAnimationState.get(sessionId) : null;
        if (!animationState) return;

        const nextItem = this.getItemForHotbarSlot(slot);
        if (animationState.activeItem === ITEM_WOOD_BOW && nextItem !== ITEM_WOOD_BOW) {
            this.cancelBowCharge();
            this.clearBowPresentationState(sessionId, { updateAnimation: false });
        }
        animationState.activeSlot = slot;
        animationState.activeItem = nextItem;
        this.syncBuildModeForActiveItem(animationState.activeItem);
        if (!animationState.attacking && !animationState.dead) {
            this.updatePlayerWeaponIdleFrame(sessionId, animationState.direction || DEFAULT_PLAYER_DIRECTION);
        }
    }

    getItemForHotbarSlot(slot) {
        return this.hotbarSlotItems[slot - 1] || '';
    }

    getLocalActiveItem() {
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        return animationState?.activeItem || this.getItemForHotbarSlot(this.localActiveSlot);
    }

    syncBuildModeForActiveItem(item) {
        const shouldBuild = item === ITEM_WOOD || item === ITEM_HAMMER || item === ITEM_CAMPFIRE;
        if (this.isBuildModeActive === shouldBuild && this.buildPreviewKind === item) return;

        this.isBuildModeActive = shouldBuild;
        if (this.isBuildModeActive) {
            this.stopHeldAttack();
            this.cancelBowCharge();
        }
        if (this.buildGridGraphics) {
            this.buildGridGraphics.setVisible(this.isBuildModeActive);
        }
        this.createBuildPreview(item);
        this.buildPreview?.setVisible(this.isBuildModeActive);
        if (this.isBuildModeActive) {
            this.updateBuildPreview(this.input.activePointer);
        } else {
            this.resetBuildDragState();
        }
    }

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
            this.playSfx(ASSETS.audio.woodHit.key, WOOD_HIT_SOUND_VOLUME, {
                serverEvent: true,
                spatial: !this.isLocalSession(hit.attackerId),
                worldX: hit.x,
                worldY: hit.y,
            });
        });

        room.onMessage('enemyHit', (hit) => {
            if (!hit || !this.shouldPlayEnemyHitAudio(hit.attackerId)) return;
            this.playSfx(ASSETS.audio.skeletonHit.key, SKELETON_HIT_SOUND_VOLUME, {
                serverEvent: true,
                spatial: !this.isLocalSession(hit.attackerId),
                worldX: hit.x,
                worldY: hit.y,
                groupKey: ASSETS.audio.skeletonHit.key,
                groupWindowMs: SKELETON_HIT_BURST_WINDOW_MS,
            });
        });

        room.onMessage('woodPickup', () => {
            this.playSfx(ASSETS.audio.grabItem.key, GRAB_ITEM_SOUND_VOLUME, { serverEvent: true });
        });

        room.onMessage('reviveStarted', () => {
            this.playSfx(ASSETS.audio.reviveSound.key, REVIVE_SOUND_VOLUME);
        });

        room.onMessage('playerHurt', (hurt) => {
            if (!this.shouldPlayWorldEventAudio()) return;
            this.playSfx(ASSETS.audio.playerHurt.key, PLAYER_HURT_SOUND_VOLUME, {
                serverEvent: true,
                spatial: !this.isLocalSession(hurt?.playerId),
                worldX: hurt?.x,
                worldY: hurt?.y,
            });
        });

        // ── Players ──────────────────────────────────────────────────────────
        room.onMessage('playerLevelUp', (event) => {
            if (!this.shouldPlayWorldEventAudio()) return;
            this.playSfx(ASSETS.audio.levelUp.key, LEVEL_UP_SOUND_VOLUME, {
                serverEvent: true,
                spatial: !this.isLocalSession(event?.playerId),
                worldX: event?.x,
                worldY: event?.y,
            });
        });

        room.onMessage('levelReset', () => {
            this.suppressLevelResetEffects();
            this.createGrassNoiseLayer();
        });

        const addPlayer = (player, sessionId) => {
            const playerSessionId = sessionId || player.sessionId;
            if (!playerSessionId || this.playerSprites.has(playerSessionId)) return;

            const isLocal = this.isLocalSession(playerSessionId);
            const sprite  = this.add.sprite(player.x, player.y + PLAYER_VISUAL_Y_OFFSET, ASSETS.spritesheet.playerIdle.key, 0)
                .setDepth(PLAYER_BODY_DEPTH)
                .setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
            const weaponSprite = this.add.sprite(player.x, player.y + PLAYER_VISUAL_Y_OFFSET, ASSETS.spritesheet.woodAxeIdle.key, 0)
                .setDepth(PLAYER_WEAPON_DEPTH)
                .setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
            this.registerWorldObject(sprite, weaponSprite);

            if (!isLocal) {
                sprite.setTint(0x88ffff); // tint remote players cyan
                weaponSprite.setTint(0x88ffff);
            }

            this.playerSprites.set(playerSessionId, sprite);
            this.playerWeaponSprites.set(playerSessionId, weaponSprite);
            if (isLocal) this.applyLocalOutfitTint();
            if (!isLocal) {
                const indicator = this.add.circle(0, 0, OFFSCREEN_PLAYER_INDICATOR_RADIUS, OFFSCREEN_PLAYER_INDICATOR_COLOR, 1)
                    .setDepth(UI_DEPTH + 5)
                    .setScrollFactor(0)
                    .setVisible(false);
                this.registerFixedUi(indicator);
                this.offscreenPlayerIndicators.set(playerSessionId, indicator);
            }
            const playerHealthBackground = this.add.graphics().setDepth(PLAYER_HEALTH_BAR_DEPTH);
            const playerHealthFill = this.add.graphics().setDepth(PLAYER_HEALTH_BAR_DEPTH + 1);
            this.playerHealthBars.set(playerSessionId, {
                background: playerHealthBackground,
                fill: playerHealthFill,
                player,
            });
            this.registerWorldObject(playerHealthBackground, playerHealthFill);
            const playerBowChargeFill = this.add.graphics()
                .setDepth(PLAYER_BOW_CHARGE_BAR_DEPTH)
                .setVisible(false);
            this.playerBowChargeBars.set(playerSessionId, {
                fill: playerBowChargeFill,
                player,
            });
            this.registerWorldObject(playerBowChargeFill);
            const playerReviveBackground = this.add.graphics().setDepth(PLAYER_REVIVE_BAR_DEPTH);
            const playerReviveFill = this.add.graphics().setDepth(PLAYER_REVIVE_BAR_DEPTH + 1);
            this.playerReviveBars.set(playerSessionId, {
                background: playerReviveBackground,
                fill: playerReviveFill,
                player,
            });
            this.registerWorldObject(playerReviveBackground, playerReviveFill);
            const levelLabel = this.add.text(player.x, player.y + PLAYER_LEVEL_LABEL_Y_OFFSET, `${player.level || 1}`, {
                fontFamily: 'Arial Black', fontSize: 11, color: '#ffffff',
                stroke: '#000000', strokeThickness: 4, align: 'center',
                fixedWidth: PLAYER_HEALTH_BAR_WIDTH,
            }).setOrigin(0, 0.5).setDepth(PLAYER_LEVEL_LABEL_DEPTH);
            this.registerWorldObject(levelLabel);
            this.playerLevelLabels.set(playerSessionId, { label: levelLabel, player });
            this.playerAnimationState.set(playerSessionId, {
                direction: DEFAULT_PLAYER_DIRECTION,
                moving: false,
                attacking: false,
                dead: false,
                deathPlayed: false,
                attackTargetX: null,
                attackTargetY: null,
                activeSlot: player.activeSlot || 1,
                activeItem: player.activeItem || '',
                attackItem: player.attackItem || ITEM_WOOD_AXE,
                lastAttackSeq: player.attackSeq || 0,
                lastBowChargeSeq: player.bowChargeSeq || 0,
                bowCharging: !!player.bowCharging,
                bowChargeProgress: player.bowChargeProgress || 0,
                bowFullyCharged: false,
                bowAnimationPaused: false,
                bowReleaseFallbackEvent: null,
                axeSwingSpeedUpgrades: player.axeSwingSpeedUpgrades || 0,
                lastMovedAt: 0,
                x: player.x,
                y: player.y,
                visualTargetX: player.x,
                visualTargetY: player.y + PLAYER_VISUAL_Y_OFFSET,
            });
            this.setPlayerAnimation(playerSessionId, false, DEFAULT_PLAYER_DIRECTION);
            this.updatePlayerWeaponIdleFrame(playerSessionId, DEFAULT_PLAYER_DIRECTION);

            player.onChange(() => {
                const s = this.playerSprites.get(playerSessionId);
                const weapon = this.playerWeaponSprites.get(playerSessionId);
                if (!s) return;
                const animationState = this.playerAnimationState.get(playerSessionId);
                const previousX = animationState ? animationState.x : player.x;
                const previousY = animationState ? animationState.y : player.y;
                const serverPositionChanged = player.x !== previousX || player.y !== previousY;

                if (animationState) {
                    if (serverPositionChanged) {
                        animationState.visualTargetX = player.x;
                        animationState.visualTargetY = player.y + PLAYER_VISUAL_Y_OFFSET;
                        const direction = this.getDirectionFromVector(player.x - previousX, player.y - previousY);
                        if (direction) {
                            animationState.lastMovedAt = this.time.now;
                        }
                        animationState.moving = !!direction;
                        if (!isLocal) this.setPlayerAnimation(playerSessionId, animationState.moving, direction);
                        animationState.x = player.x;
                        animationState.y = player.y;
                    }
                } else if (serverPositionChanged) {
                    s.x = player.x;
                    s.y = player.y + PLAYER_VISUAL_Y_OFFSET;
                    if (weapon) {
                        weapon.x = s.x;
                        weapon.y = s.y;
                    }
                }

                if (player.isDead) {
                    this.playPlayerDeathAnimation(playerSessionId);
                } else if (animationState?.dead) {
                    this.resetPlayerAfterRevive(playerSessionId);
                }
            });

            player.listen('isDead', (isDead) => {
                if (isDead) this.playPlayerDeathAnimation(playerSessionId);
                else this.resetPlayerAfterRevive(playerSessionId);
            });

            player.listen('facingDirection', (direction) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState && direction) {
                    animationState.direction = direction;
                    if (animationState.bowCharging && !animationState.dead) {
                        animationState.attackItem = ITEM_WOOD_BOW;
                        animationState.bowAnimationPaused = false;
                        this.playPlayerAttackAnimation(playerSessionId, direction, {
                            playAudio: false,
                            allowWhileCharging: true,
                            preserveProgress: true,
                        });
                        if (animationState.bowFullyCharged) this.pauseFullBowChargeAnimation(playerSessionId);
                        return;
                    }
                    if (!animationState.attacking && !animationState.dead) {
                        this.updatePlayerWeaponIdleFrame(playerSessionId, direction);
                    }
                }
            });

            player.listen('activeSlot', (slot) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.activeSlot = slot || 1;
                if (isLocal) {
                    this.localActiveSlot = slot || 1;
                    this.updateHotbarSelection();
                }
            });

            player.listen('activeItem', (item) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState) return;
                const wasBow = animationState.activeItem === ITEM_WOOD_BOW;
                animationState.activeItem = item || '';
                if (wasBow && animationState.activeItem !== ITEM_WOOD_BOW) {
                    if (isLocal) this.cancelBowCharge();
                    this.clearBowPresentationState(playerSessionId, { updateAnimation: false });
                }
                if (isLocal) this.syncBuildModeForActiveItem(animationState.activeItem);
                if (!animationState.attacking && !animationState.dead) {
                    this.updatePlayerWeaponIdleFrame(playerSessionId, animationState.direction || DEFAULT_PLAYER_DIRECTION);
                }
            });

            player.listen('attackItem', (item) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.attackItem = item || ITEM_WOOD_AXE;
            });

            player.listen('bowCharging', (charging) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState) return;
                animationState.bowCharging = !!charging;
                if (!charging) {
                    this.updatePlayerBowChargeBar(playerSessionId);
                    if (animationState.bowFullyCharged && animationState.attackItem === ITEM_WOOD_BOW) {
                        this.scheduleBowReleaseFallback(playerSessionId);
                        return;
                    }
                    this.clearBowPresentationState(playerSessionId, { updateAnimation: true });
                    return;
                }
                this.cancelBowReleaseFallback(playerSessionId);
                animationState.attackItem = ITEM_WOOD_BOW;
                animationState.bowFullyCharged = false;
                animationState.bowAnimationPaused = false;
                this.playPlayerAttackAnimation(playerSessionId, player.attackDirection || animationState.direction || DEFAULT_PLAYER_DIRECTION, {
                    playAudio: false,
                    allowWhileCharging: true,
                });
            });

            player.listen('bowChargeProgress', (progress) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState) return;
                animationState.bowChargeProgress = Phaser.Math.Clamp(progress || 0, 0, 1);
                this.updatePlayerBowChargeBar(playerSessionId);
                if (animationState.bowCharging && animationState.bowChargeProgress >= 1) {
                    animationState.bowFullyCharged = true;
                    this.pauseFullBowChargeAnimation(playerSessionId);
                }
            });

            player.listen('bowChargeSeq', () => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState || player.bowChargeSeq <= animationState.lastBowChargeSeq) return;
                animationState.lastBowChargeSeq = player.bowChargeSeq;
                if (player.bowChargeSeq <= 0 || !this.shouldPlayAttackAudio(playerSessionId)) return;
                this.playSfx(ASSETS.audio.arrowPull.key, PUNCH_SOUND_VOLUME, {
                    spatial: !this.isLocalSession(playerSessionId),
                    worldX: player.x,
                    worldY: player.y,
                });
            });

            player.listen('health', () => {
                this.updatePlayerHealthBar(playerSessionId);
                if (isLocal) this.updateHudHealthBar(player.health, player.maxHealth);
            });

            player.listen('maxHealth', () => {
                this.updatePlayerHealthBar(playerSessionId);
                if (isLocal) this.updateHudHealthBar(player.health, player.maxHealth);
            });

            player.listen('reviveProgress', () => {
                this.updatePlayerReviveBar(playerSessionId);
            });

            player.listen('attackSeq', () => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState || player.attackSeq <= animationState.lastAttackSeq) return;

                animationState.lastAttackSeq = player.attackSeq;
                if (player.attackSeq <= 0) return;
                animationState.attackItem = player.attackItem || animationState.activeItem || ITEM_WOOD_AXE;
                const isLocalPredictedAttack = this.isLocalSession(playerSessionId) && animationState.attackItem !== ITEM_WOOD_BOW;

                this.playPlayerAttackAnimation(playerSessionId, player.attackDirection, {
                    playAudio: !isLocalPredictedAttack && this.shouldPlayAttackAudio(playerSessionId),
                    resumeBowRelease: animationState.attackItem === ITEM_WOOD_BOW,
                    restart: animationState.attackItem !== ITEM_WOOD_BOW,
                });
            });

            player.listen('axeSwingSpeedUpgrades', (stacks) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.axeSwingSpeedUpgrades = stacks || 0;
            });

            if (player.isDead) {
                this.playPlayerDeathAnimation(playerSessionId);
            }

            if (isLocal) {
                this.activateLocalCamera(sprite, player);
                this.killsText.setText(`Kills: ${player.kills}`);
                this.updateLocalExperienceState(player);
                this.updateHudHealthBar(player.health, player.maxHealth);
                this.localPendingUpgradeChoices = player.pendingUpgradeChoices || 0;
                this.localActiveSlot = player.activeSlot || 1;
                this.syncLocalHotbarFromPlayer(player);
                this.updateHotbarSelection();
                this.syncBuildModeForActiveItem(player.activeItem || '');
                this.updateUpgradeUi();
                this.updateBuffList(player);

                PLAYER_BUFFS.forEach(({ field }) => {
                    player.listen(field, () => this.updateBuffList(player));
                });

                if (player.hotbarItems) {
                    const syncHotbar = () => this.syncLocalHotbarFromPlayer(player);
                    player.hotbarItems.onAdd(syncHotbar);
                    player.hotbarItems.onChange(syncHotbar);
                    player.hotbarItems.onRemove(syncHotbar);
                    player.hotbarCounts?.onAdd(syncHotbar);
                    player.hotbarCounts?.onChange(syncHotbar);
                    player.hotbarCounts?.onRemove(syncHotbar);
                }

                player.listen('kills', (kills) => {
                    this.killsText.setText(`Kills: ${kills}`);
                    this.updateLocalExperienceState(player);
                });

                player.listen('experience', () => {
                    this.updateLocalExperienceState(player);
                });

                player.listen('experienceToNext', () => {
                    this.updateLocalExperienceState(player);
                });

                player.listen('pendingUpgradeChoices', (choices) => {
                    this.localPendingUpgradeChoices = choices || 0;
                    if (this.localPendingUpgradeChoices <= 0) this.upgradeUiMode = 'root';
                    this.updateUpgradeUi();
                });
            }

            player.listen('level', () => {
                this.updatePlayerLevelLabel(playerSessionId);
                if (isLocal) this.updateLocalExperienceState(player);
            });

            this.playerCountText.setText(`Players: ${state.players.size}`);
        };

        state.players.onAdd(addPlayer);
        state.players.forEach(addPlayer);

        state.players.onRemove((_player, sessionId) => {
            this.cancelBowReleaseFallback(sessionId);
            const s = this.playerSprites.get(sessionId);
            if (s) s.destroy();
            const weapon = this.playerWeaponSprites.get(sessionId);
            if (weapon) weapon.destroy();
            const healthBar = this.playerHealthBars.get(sessionId);
            if (healthBar) {
                healthBar.background.destroy();
                healthBar.fill.destroy();
            }
            const bowChargeBar = this.playerBowChargeBars.get(sessionId);
            if (bowChargeBar) bowChargeBar.fill.destroy();
            const reviveBar = this.playerReviveBars.get(sessionId);
            if (reviveBar) {
                reviveBar.background.destroy();
                reviveBar.fill.destroy();
            }
            const levelLabel = this.playerLevelLabels.get(sessionId);
            if (levelLabel) levelLabel.label.destroy();
            const indicator = this.offscreenPlayerIndicators.get(sessionId);
            if (indicator) indicator.destroy();
            if (this.isLocalSession(sessionId)) {
                this.localCamera.stopFollow();
                this.localPlayerSprite = null;
                this.localPlayerState = null;
                this.localExperienceState = null;
                this.localPendingUpgradeChoices = 0;
                this.buffListText?.setText('');
                this.clearUpgradeUi();
                this.updateExperienceBar(0, 5, 1);
                this.updateHudHealthBar(PLAYER_MAX_HEALTH);
            }
            this.playerSprites.delete(sessionId);
            this.playerWeaponSprites.delete(sessionId);
            this.playerAnimationState.delete(sessionId);
            this.playerHealthBars.delete(sessionId);
            this.playerBowChargeBars.delete(sessionId);
            this.playerReviveBars.delete(sessionId);
            this.playerLevelLabels.delete(sessionId);
            this.offscreenPlayerIndicators.delete(sessionId);
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
            this.registerWorldObject(bottom, top);

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
            if (!this.isSuppressingResetEffects() && this.shouldPlayWorldEventAudio()) {
                this.playSfx(ASSETS.audio.treeFall.key, TREE_FALL_SOUND_VOLUME, {
                    serverEvent: true,
                    spatial: true,
                    worldX: sprites.bottom.x,
                    worldY: sprites.bottom.y,
                });
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
            this.registerWorldObject(sprites);

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

        const addWoodBlock = (block, id) => {
            const blockId = id || block.id;
            if (!blockId || this.woodBlockSprites.has(blockId)) return;

            const fill = this.add.rectangle(block.x, block.y, WOOD_BLOCK_SIZE, WOOD_BLOCK_SIZE, WOOD_BLOCK_FILL_COLOR, 1)
                .setOrigin(0.5)
                .setDepth(80);
            const outline = this.add.rectangle(block.x, block.y, WOOD_BLOCK_SIZE, WOOD_BLOCK_SIZE)
                .setOrigin(0.5)
                .setStrokeStyle(2, WOOD_BLOCK_STROKE_COLOR, 0.85)
                .setDepth(81);
            const healthBackground = this.add.graphics().setDepth(82);
            const healthFill = this.add.graphics().setDepth(83);
            this.registerWorldObject(fill, outline, healthBackground, healthFill);

            this.woodBlockSprites.set(blockId, {
                fill,
                outline,
                healthBackground,
                healthFill,
                block,
                lastHealth: block.health ?? block.maxHealth ?? 5,
                flashEvent: null,
            });
            this.updateWoodBlockHealthBar(blockId);

            block.onChange(() => {
                const sprites = this.woodBlockSprites.get(blockId);
                if (!sprites) return;
                sprites.fill.setPosition(block.x, block.y);
                sprites.outline.setPosition(block.x, block.y);
                const health = block.health ?? block.maxHealth ?? 5;
                if (health < sprites.lastHealth) {
                    this.flashWoodBlockHit(blockId);
                }
                sprites.lastHealth = health;
                this.updateWoodBlockHealthBar(blockId);
            });
        };

        state.woodBlocks.onAdd(addWoodBlock);
        state.woodBlocks.forEach(addWoodBlock);

        state.woodBlocks.onRemove((_block, id) => {
            const sprites = this.woodBlockSprites.get(id);
            if (!sprites) return;
            sprites.fill.destroy();
            sprites.outline.destroy();
            sprites.healthBackground.destroy();
            sprites.healthFill.destroy();
            sprites.flashEvent?.remove(false);
            this.woodBlockSprites.delete(id);
        });

        const addCampfire = (campfire, id) => {
            const campfireId = id || campfire.id;
            if (!campfireId || this.campfireSprites.has(campfireId)) return;

            const sprite = this.add.sprite(campfire.x, campfire.y, ASSETS.spritesheet.campfire.key, CAMPFIRE_ICON_FRAME)
                .setOrigin(0.5)
                .setDisplaySize(CAMPFIRE_DISPLAY_SIZE, CAMPFIRE_DISPLAY_SIZE)
                .setDepth(CAMPFIRE_DEPTH);
            sprite.play(CAMPFIRE_ANIMATION_KEY);
            const radius = this.add.graphics().setDepth(CAMPFIRE_DEPTH - 1);
            this.drawCampfireRadiusOutline(radius, campfire.x, campfire.y);
            const healBar = this.add.graphics().setDepth(CAMPFIRE_DEPTH + 1);
            const healProgress = Phaser.Math.Clamp((campfire.healProgress || 0) / 100, 0, 1);
            this.drawCampfireHealBar(healBar, campfire, healProgress);
            this.registerWorldObject(radius, sprite, healBar);
            this.campfireSprites.set(campfireId, {
                sprite,
                radius,
                healBar,
                campfire,
                healProgress,
                healProgressUpdatedAt: this.time.now,
            });

            campfire.onChange(() => {
                const entry = this.campfireSprites.get(campfireId);
                if (!entry) return;
                entry.sprite.setPosition(campfire.x, campfire.y);
                this.drawCampfireRadiusOutline(entry.radius, campfire.x, campfire.y);
                entry.healProgress = Phaser.Math.Clamp((campfire.healProgress || 0) / 100, 0, 1);
                entry.healProgressUpdatedAt = this.time.now;
                this.drawCampfireHealBar(entry.healBar, campfire, entry.healProgress);
            });
        };

        state.campfires?.onAdd(addCampfire);
        state.campfires?.forEach(addCampfire);

        state.campfires?.onRemove((_campfire, id) => {
            const entry = this.campfireSprites.get(id);
            if (!entry) return;
            entry.sprite.destroy();
            entry.radius.destroy();
            entry.healBar.destroy();
            this.campfireSprites.delete(id);
        });

        const addEnemy = (enemy, id) => {
            const enemyId = id || enemy.id;
            if (!enemyId || this.enemySprites.has(enemyId)) return;
            const enemyAnimationKey = this.getEnemyAnimationKey(enemy);
            const runTexture = ASSETS.spritesheet[`${enemyAnimationKey}Run`]?.key || ASSETS.spritesheet.enemy1Run.key;
            const displaySize = enemyAnimationKey === 'dk' ? DARK_KNIGHT_DISPLAY_SIZE : ENEMY_DISPLAY_SIZE;

            const sprite = this.add.sprite(enemy.x, enemy.y + ENEMY_VISUAL_Y_OFFSET, runTexture, 0)
                .setDepth(100)
                .setDisplaySize(displaySize, displaySize);
            this.registerWorldObject(sprite);
            this.enemySprites.set(enemyId, sprite);
            const enemyHealthBackground = this.add.graphics().setDepth(ENEMY_HEALTH_BAR_DEPTH);
            const enemyHealthFill = this.add.graphics().setDepth(ENEMY_HEALTH_BAR_DEPTH + 1);
            this.enemyHealthBars.set(enemyId, {
                background: enemyHealthBackground,
                fill: enemyHealthFill,
                enemy,
            });
            this.registerWorldObject(enemyHealthBackground, enemyHealthFill);
            this.enemyAnimationState.set(enemyId, {
                animationKey: enemyAnimationKey,
                enemyType: Number(enemy.enemyType) || 1,
                direction: enemy.facingDirection || 'S',
                action: enemy.action || 'run',
                attacking: false,
                takingDamage: false,
                dead: !!enemy.isDead,
                deathPlayed: false,
                damageFlashEvent: null,
                lastAttackSeq: enemy.attackSeq || 0,
                lastDamageSeq: enemy.damageSeq || 0,
                lastDeathSeq: enemy.deathSeq || 0,
                x: enemy.x,
                y: enemy.y,
            });
            this.setEnemyAnimation(enemyId, enemy.action || 'run', enemy.facingDirection || 'S');
            if (enemy.action === 'charge') this.startCasterChargeSound(enemyId);

            enemy.onChange(() => {
                const s = this.enemySprites.get(enemyId);
                if (!s) return;

                s.x = Phaser.Math.Linear(s.x, enemy.x, 0.3);
                s.y = Phaser.Math.Linear(s.y, enemy.y + ENEMY_VISUAL_Y_OFFSET, 0.3);
                const animationState = this.enemyAnimationState.get(enemyId);
                if (animationState) {
                    animationState.x = enemy.x;
                    animationState.y = enemy.y;
                }
                this.setEnemyAnimation(enemyId, enemy.action || 'run', enemy.facingDirection || 'S');
            });

            enemy.listen('action', (action) => {
                const animationState = this.enemyAnimationState.get(enemyId);
                this.setEnemyAnimation(enemyId, action || 'run', enemy.facingDirection || animationState?.direction || 'S');
                if (action === 'charge') {
                    this.startCasterChargeSound(enemyId);
                } else if (action !== 'attack') {
                    this.stopCasterChargeSound(enemyId);
                }
            });

            enemy.listen('facingDirection', (direction) => {
                const animationState = this.enemyAnimationState.get(enemyId);
                this.setEnemyAnimation(enemyId, animationState?.action || enemy.action || 'run', direction || animationState?.direction || 'S');
            });

            enemy.listen('health', () => {
                this.updateEnemyHealthBar(enemyId);
            });

            enemy.listen('attackSeq', () => {
                const animationState = this.enemyAnimationState.get(enemyId);
                if (!animationState || enemy.attackSeq <= animationState.lastAttackSeq) return;

                animationState.lastAttackSeq = enemy.attackSeq;
                if (enemy.attackSeq <= 0) return;
                this.stopCasterChargeSound(enemyId);
                this.playEnemyAttackAnimation(enemyId, enemy.facingDirection || animationState.direction || 'S');
            });

            enemy.listen('damageSeq', () => {
                const animationState = this.enemyAnimationState.get(enemyId);
                if (!animationState || enemy.damageSeq <= animationState.lastDamageSeq) return;

                animationState.lastDamageSeq = enemy.damageSeq;
                if (enemy.damageSeq <= 0) return;
                if (enemy.isDead || animationState.dead) return;
                this.playEnemyDamageAnimation(enemyId, enemy.facingDirection || animationState.direction || 'S');
            });

            enemy.listen('deathSeq', () => {
                const animationState = this.enemyAnimationState.get(enemyId);
                if (!animationState || enemy.deathSeq <= animationState.lastDeathSeq) return;

                animationState.lastDeathSeq = enemy.deathSeq;
                if (enemy.deathSeq <= 0) return;
                this.playEnemyDeathAnimation(enemyId, enemy.facingDirection || animationState.direction || 'S');
            });

            enemy.listen('isDead', (isDead) => {
                if (isDead) {
                    this.stopCasterChargeSound(enemyId);
                    this.playEnemyDeathAnimation(enemyId, enemy.facingDirection || 'S');
                }
            });

            if (enemy.isDead) {
                this.stopCasterChargeSound(enemyId);
                this.playEnemyDeathAnimation(enemyId, enemy.facingDirection || 'S');
            }
        };

        state.enemies.onAdd(addEnemy);
        state.enemies.forEach(addEnemy);

        state.enemies.onRemove((_enemy, id) => {
            const s = this.enemySprites.get(id);
            const animationState = this.enemyAnimationState.get(id);
            const healthBar = this.enemyHealthBars.get(id);
            if (healthBar) {
                healthBar.background.destroy();
                healthBar.fill.destroy();
            }
            if (s) {
                if (!animationState?.dead && !this.isSuppressingResetEffects()) this.addExplosion(s.x, s.y);
                s.destroy();
            }
            this.stopCasterChargeSound(id);
            if (animationState?.damageFlashEvent) {
                animationState.damageFlashEvent.remove(false);
            }
            this.enemySprites.delete(id);
            this.enemyAnimationState.delete(id);
            this.enemyHealthBars.delete(id);
        });

        // ── Player bullets ───────────────────────────────────────────────────
        const addPlayerBullet = (bullet, id) => {
            const bulletId = id || bullet.id;
            if (!bulletId || this.playerBulletSprites.has(bulletId)) return;

            const isArrow = bullet.kind === 'arrow';
            const sprite = this.add.sprite(
                bullet.x,
                bullet.y,
                isArrow ? ASSETS.spritesheet.arrowsPack.key : ASSETS.spritesheet.tiles.key,
                isArrow ? 0 : bullet.power - 1,
            ).setDepth(10);
            if (isArrow) {
                sprite
                    .setDisplaySize(ARROW_DISPLAY_SIZE, ARROW_DISPLAY_SIZE)
                    .setRotation(bullet.angle || 0);
            }
            this.registerWorldObject(sprite);
            this.playerBulletSprites.set(bulletId, sprite);

            bullet.onChange(() => {
                const s = this.playerBulletSprites.get(bulletId);
                if (s) {
                    s.x = bullet.x;
                    s.y = bullet.y;
                    if (bullet.kind === 'arrow') s.setRotation(bullet.angle || 0);
                }
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

            const isFireball = bullet.kind === 'fireball';
            const sprite = this.add.sprite(
                bullet.x,
                bullet.y,
                isFireball ? ASSETS.spritesheet.fireball.key : ASSETS.spritesheet.tiles.key,
                isFireball ? 0 : EB_TILE_OFFSET + bullet.power,
            ).setDepth(isFireball ? FIREBALL_DEPTH : 10);
            if (isFireball) {
                sprite
                    .setDisplaySize(FIREBALL_DISPLAY_SIZE, FIREBALL_DISPLAY_SIZE)
                    .setRotation((bullet.angle || 0) + FIREBALL_ROTATION_OFFSET)
                    .play(ANIMATION.fireball.key);
            } else {
                sprite.setFlipY(true);
            }
            this.registerWorldObject(sprite);
            this.enemyBulletSprites.set(bulletId, sprite);

            bullet.onChange(() => {
                const s = this.enemyBulletSprites.get(bulletId);
                if (s) {
                    s.x = bullet.x;
                    s.y = bullet.y;
                    if (bullet.kind === 'fireball') s.setRotation((bullet.angle || 0) + FIREBALL_ROTATION_OFFSET);
                }
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

        state.listen('gameOverCountdown', (countdown) => {
            if (state.gameOver) {
                this.updateGameOverCountdown(countdown);
            }
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
                this.disableBuildMode();
                this.stopHeldAttack();
                this.cancelBowCharge();
                this.updateGameOverCountdown(state.gameOverCountdown || 10);
                this.gameOverText.setVisible(true);
                this.quitButton
                    .setPosition(this.centreX, this.centreY + 118)
                    .setVisible(true);
            } else {
                this.gameStarted = true;
                this.suppressLevelResetEffects();
                this.gameOverText.setVisible(false);
                this.quitButton.setVisible(false);
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

    updateGameOverCountdown(countdown) {
        const safeCountdown = Math.max(0, Math.ceil(countdown || 0));
        this.gameOverText.setText(`Game Over\nRestarting in ${safeCountdown}`);
    }

    async quitToLobby() {
        if (this.isQuittingToLobby) return;
        this.isQuittingToLobby = true;

        this.gameOverText.setVisible(false);
        this.quitButton.setVisible(false);
        this.clearAllSprites();

        try {
            await Promise.race([
                RoomClient.disconnect(),
                new Promise(resolve => window.setTimeout(resolve, 750)),
            ]);
        } catch (error) {
            console.warn('[Game] quit disconnect failed:', error);
        } finally {
            this.isQuittingToLobby = false;
            this.scene.start('Lobby');
        }
    }

    handleEscapeQuit(event) {
        event?.preventDefault();
        const now = performance.now();
        if (now - this.lastEscapeToggleAt < 120) return;
        this.lastEscapeToggleAt = now;
        this.toggleQuitButton();
    }

    toggleQuitButton() {
        if (RoomClient.room?.state?.gameOver) return;
        this.quitButton
            .setPosition(this.centreX, this.centreY)
            .setVisible(!this.quitButton.visible);
    }

    // Flat world background
    initWorldBackground() {
        this.localCamera.setBackgroundColor(WORLD_BACKGROUND_CSS);
        this.worldBackground = this.add.rectangle(0, 0, this.worldWidth, this.worldHeight, WORLD_BACKGROUND_COLOR)
            .setOrigin(0)
            .setDepth(-100);
        this.registerWorldObject(this.worldBackground);
        this.createGrassNoiseLayer();
        this.localCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.createBuildGrid();
    }

    createGrassNoiseLayer() {
        if (this.grassNoiseLayer) this.grassNoiseLayer.destroy();

        const grass = this.add.graphics().setDepth(GRASS_NOISE_DEPTH);
        this.registerWorldObject(grass);

        for (let y = 0; y < this.worldHeight; y += GRASS_NOISE_CELL_SIZE) {
            for (let x = 0; x < this.worldWidth; x += GRASS_NOISE_CELL_SIZE) {
                const alpha = Phaser.Math.FloatBetween(0.012, 0.055);
                grass.fillStyle(GRASS_NOISE_DARK_COLOR, alpha);
                grass.fillRect(x, y, GRASS_NOISE_CELL_SIZE + 1, GRASS_NOISE_CELL_SIZE + 1);
            }
        }

        for (let i = 0; i < GRASS_NOISE_PATCH_COUNT; i++) {
            grass.fillStyle(GRASS_NOISE_DARK_COLOR, Phaser.Math.FloatBetween(0.025, 0.075));
            grass.fillEllipse(
                Phaser.Math.Between(0, this.worldWidth),
                Phaser.Math.Between(0, this.worldHeight),
                Phaser.Math.Between(360, 920),
                Phaser.Math.Between(220, 680),
            );
        }

        for (let i = 0; i < GRASS_NOISE_FLECK_COUNT; i++) {
            grass.fillStyle(GRASS_NOISE_DARK_COLOR, Phaser.Math.FloatBetween(0.035, 0.12));
            grass.fillRect(
                Phaser.Math.Between(0, this.worldWidth),
                Phaser.Math.Between(0, this.worldHeight),
                Phaser.Math.Between(18, 95),
                Phaser.Math.Between(8, 42),
            );
        }

        this.grassNoiseLayer = grass;
    }

    createBuildGrid() {
        if (this.buildGridGraphics) this.buildGridGraphics.destroy();

        const grid = this.add.graphics()
            .setDepth(-90)
            .setVisible(this.isBuildModeActive);
        this.registerWorldObject(grid);

        grid.lineStyle(1, BUILD_GRID_LINE_COLOR, BUILD_GRID_LINE_ALPHA);

        for (let x = 0; x <= this.worldWidth; x += BUILD_GRID_SIZE) {
            this.drawDottedLine(grid, x, 0, x, this.worldHeight);
        }

        for (let y = 0; y <= this.worldHeight; y += BUILD_GRID_SIZE) {
            this.drawDottedLine(grid, 0, y, this.worldWidth, y);
        }

        this.buildGridGraphics = grid;
    }

    createBuildPreview(item = this.getLocalActiveItem()) {
        if (this.buildPreview && this.buildPreviewKind === item) return;
        if (this.buildPreview) this.buildPreview.destroy();

        this.buildPreviewKind = item;
        if (item === ITEM_CAMPFIRE) {
            this.buildPreview = this.add.image(0, 0, ASSETS.spritesheet.campfire.key, CAMPFIRE_ICON_FRAME)
                .setOrigin(0.5)
                .setDisplaySize(CAMPFIRE_DISPLAY_SIZE, CAMPFIRE_DISPLAY_SIZE)
                .setAlpha(0.65)
                .setDepth(CAMPFIRE_DEPTH)
                .setVisible(false);
        } else {
            this.buildPreview = this.add.rectangle(0, 0, WOOD_BLOCK_SIZE, WOOD_BLOCK_SIZE, BUILD_PREVIEW_FILL_COLOR, 0.28)
                .setOrigin(0.5)
                .setStrokeStyle(1, BUILD_PREVIEW_STROKE_COLOR, 0.75)
                .setDepth(82)
                .setVisible(false);
        }
        this.registerWorldObject(this.buildPreview);
    }

    drawDottedLine(graphics, x1, y1, x2, y2) {
        const length = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        if (length <= 0) return;

        const dx = (x2 - x1) / length;
        const dy = (y2 - y1) / length;
        const step = BUILD_GRID_DOT_LENGTH + BUILD_GRID_DOT_GAP;

        for (let distance = 0; distance < length; distance += step) {
            const endDistance = Math.min(distance + BUILD_GRID_DOT_LENGTH, length);
            graphics.lineBetween(
                x1 + dx * distance,
                y1 + dy * distance,
                x1 + dx * endDistance,
                y1 + dy * endDistance,
            );
        }
    }

    drawCampfireRadiusOutline(graphics, x, y) {
        if (!graphics) return;
        graphics.clear();
        graphics.lineStyle(2, CAMPFIRE_RADIUS_COLOR, CAMPFIRE_RADIUS_ALPHA);

        const circumference = Math.PI * 2 * CAMPFIRE_HEAL_RADIUS;
        const step = CAMPFIRE_RADIUS_DOT_LENGTH + CAMPFIRE_RADIUS_DOT_GAP;
        const segmentAngle = (CAMPFIRE_RADIUS_DOT_LENGTH / circumference) * Math.PI * 2;
        const stepAngle = (step / circumference) * Math.PI * 2;

        for (let angle = 0; angle < Math.PI * 2; angle += stepAngle) {
            const endAngle = Math.min(angle + segmentAngle, Math.PI * 2);
            graphics.beginPath();
            graphics.arc(x, y, CAMPFIRE_HEAL_RADIUS, angle, endAngle, false);
            graphics.strokePath();
        }
    }

    drawCampfireHealBar(graphics, campfire, progress) {
        const x = campfire.x - CAMPFIRE_HEAL_BAR_WIDTH * 0.5;
        const y = campfire.y + CAMPFIRE_HEAL_BAR_Y_OFFSET;

        graphics.clear();
        graphics.fillStyle(CAMPFIRE_HEAL_BAR_BACKGROUND_COLOR, 0.9);
        graphics.fillRect(x, y, CAMPFIRE_HEAL_BAR_WIDTH, CAMPFIRE_HEAL_BAR_HEIGHT);
        if (progress > 0) {
            graphics.fillStyle(CAMPFIRE_HEAL_BAR_FILL_COLOR, 1);
            graphics.fillRect(x, y, CAMPFIRE_HEAL_BAR_WIDTH * progress, CAMPFIRE_HEAL_BAR_HEIGHT);
        }
    }

    updateCampfireHealBars() {
        this.campfireSprites.forEach(({ healBar, campfire, healProgress, healProgressUpdatedAt }) => {
            const elapsed = this.time.now - healProgressUpdatedAt;
            const progress = (healProgress + elapsed / CAMPFIRE_HEAL_INTERVAL_MS) % 1;
            this.drawCampfireHealBar(healBar, campfire, progress);
        });
    }

    toggleBuildMode() {
        this.isBuildModeActive = !this.isBuildModeActive;
        if (this.isBuildModeActive) {
            this.stopHeldAttack();
            this.cancelBowCharge();
        }
        if (this.buildGridGraphics) {
            this.buildGridGraphics.setVisible(this.isBuildModeActive);
        }
        this.createBuildPreview(this.getLocalActiveItem());
        this.buildPreview?.setVisible(this.isBuildModeActive);
        if (this.isBuildModeActive) {
            this.updateBuildPreview(this.input.activePointer);
        } else {
            this.resetBuildDragState();
        }
    }

    disableBuildMode() {
        this.isBuildModeActive = false;
        this.stopHeldAttack();
        this.cancelBowCharge();
        if (this.buildGridGraphics) {
            this.buildGridGraphics.setVisible(false);
        }
        if (this.buildPreview) {
            this.buildPreview.setVisible(false);
        }
        this.resetBuildDragState();
    }

    handleBuildModePointerDown(pointer) {
        const button = this.getBuildPointerButton(pointer);
        if (button !== 0 && button !== 2) return;

        this.activeBuildPointerId = pointer.id;
        this.activeBuildPointer = pointer;
        this.activeBuildButton = button;
        this.lastBuildDragCellId = null;
        this.lastBuildDragSentAt = 0;
        this.updateBuildPreview(pointer);
        this.sendBuildIntentAtPointer(pointer, button, true);
    }

    handleBuildModePointerDrag(pointer) {
        if (this.activeBuildPointerId !== pointer.id) return;
        if (this.activeBuildButton !== 0 && this.activeBuildButton !== 2) return;
        this.activeBuildPointer = pointer;

        const now = this.time.now;
        const activeItem = this.getLocalActiveItem();
        const minInterval = activeItem === ITEM_HAMMER && this.activeBuildButton === 0 ? HAMMER_REPAIR_TICK_MS : BUILD_DRAG_SEND_INTERVAL_MS;
        if (now - this.lastBuildDragSentAt < minInterval) return;
        this.sendBuildIntentAtPointer(pointer, this.activeBuildButton, false);
    }

    updateBuildHold() {
        if (!this.isBuildModeActive || this.activeBuildPointerId === null || !this.activeBuildPointer) return;
        if (this.activeBuildButton !== 0 && this.activeBuildButton !== 2) return;

        const pointer = this.activeBuildPointer;
        if (this.activeBuildButton === 0 && !pointer.leftButtonDown?.()) return;
        if (this.activeBuildButton === 2 && !pointer.rightButtonDown?.()) return;
        this.sendBuildIntentAtPointer(pointer, this.activeBuildButton, false);
    }

    sendBuildIntentAtPointer(pointer, button, force = false) {
        const cell = this.getBuildCellFromPointer(pointer);
        if (!cell) return;

        const activeItem = this.getLocalActiveItem();
        const isRepairTick = button === 0 && activeItem === ITEM_HAMMER;
        if (isRepairTick && !force && this.time.now - this.lastBuildDragSentAt < HAMMER_REPAIR_TICK_MS) return;
        if (!force && !isRepairTick && cell.id === this.lastBuildDragCellId) return;

        this.lastBuildDragCellId = cell.id;
        this.lastBuildDragSentAt = this.time.now;

        if (button === 0 && activeItem === ITEM_WOOD) {
            RoomClient.sendBuildWoodBlock(cell.x, cell.y);
        } else if (button === 0 && activeItem === ITEM_HAMMER) {
            RoomClient.sendRepairWoodBlock(cell.x, cell.y);
        } else if (button === 0 && activeItem === ITEM_CAMPFIRE) {
            RoomClient.sendPlaceCampfire(cell.x, cell.y);
        } else if (button === 2 && (activeItem === ITEM_HAMMER || activeItem === ITEM_WOOD)) {
            RoomClient.sendRemoveWoodBlock(cell.x, cell.y);
        }
    }

    updateBuildPreview(pointer) {
        if (!this.isBuildModeActive) return;
        this.createBuildPreview(this.getLocalActiveItem());

        const cell = this.getBuildCellFromPointer(pointer);
        if (!cell) {
            this.buildPreview?.setVisible(false);
            return;
        }

        this.buildPreview
            .setPosition(cell.x, cell.y)
            .setVisible(true);
    }

    getBuildCellFromPointer(pointer) {
        const worldPoint = this.getPointerWorldPoint(pointer);
        if (!worldPoint) return null;

        const x = Phaser.Math.Clamp(worldPoint.x, 0, this.worldWidth - 1);
        const y = Phaser.Math.Clamp(worldPoint.y, 0, this.worldHeight - 1);
        const col = Math.floor(x / BUILD_GRID_SIZE);
        const row = Math.floor(y / BUILD_GRID_SIZE);

        return {
            id: `${col}:${row}`,
            x: col * BUILD_GRID_SIZE + BUILD_GRID_SIZE * 0.5,
            y: row * BUILD_GRID_SIZE + BUILD_GRID_SIZE * 0.5,
        };
    }

    getBuildPointerButton(pointer) {
        const nativeButton = pointer?.event?.button;
        if (nativeButton === 0 || nativeButton === 2) return nativeButton;
        const nativeButtons = pointer?.event?.buttons;
        if (typeof nativeButtons === 'number') {
            if ((nativeButtons & 1) === 1) return 0;
            if ((nativeButtons & 2) === 2) return 2;
        }
        if (pointer?.buttons) {
            if ((pointer.buttons & 1) === 1) return 0;
            if ((pointer.buttons & 2) === 2) return 2;
        }
        if (pointer?.button === 0 || pointer?.button === 2) return pointer.button;
        if (pointer?.leftButtonDown?.()) return 0;
        if (pointer?.rightButtonDown?.()) return 2;
        return null;
    }

    resetBuildDragState() {
        this.activeBuildPointerId = null;
        this.activeBuildPointer = null;
        this.activeBuildButton = null;
        this.lastBuildDragCellId = null;
        this.lastBuildDragSentAt = 0;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    isLocalSession(sessionId) {
        return !!this.localSessionId && sessionId === this.localSessionId;
    }

    activateLocalCamera(sprite, player) {
        this.localPlayerSprite = sprite;
        this.localPlayerState = player;
        this.localCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.localCamera.setZoom(this.cameraZoom);
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

    handleCameraWheel(deltaY) {
        if (!this.gameStarted || !Number.isFinite(deltaY) || deltaY === 0) return;

        const direction = deltaY < 0 ? 1 : -1;
        this.cameraZoom = Phaser.Math.Clamp(
            this.cameraZoom + direction * CAMERA_ZOOM_STEP,
            CAMERA_MIN_ZOOM,
            CAMERA_MAX_ZOOM,
        );
        this.localCamera.setZoom(this.cameraZoom);
    }

    toggleHitboxes() {
        this.showHitboxes = !this.showHitboxes;
        if (this.hitboxToggleButton) {
            this.hitboxToggleButton.setColor(this.showHitboxes ? '#ff7777' : '#ff2222');
        }
        if (!this.showHitboxes && this.hitboxGraphics) {
            this.hitboxGraphics.clear();
        }
    }

    updateHitboxOverlay() {
        if (!this.showHitboxes) return;
        if (!this.hitboxGraphics) {
            this.hitboxGraphics = this.add.graphics().setDepth(HITBOX_DEPTH);
            this.registerWorldObject(this.hitboxGraphics);
        }

        const g = this.hitboxGraphics;
        g.clear();

        this.drawPlayerHitboxes(g);
        this.drawEnemyHitboxes(g);
        this.drawTreeHitboxes(g);
        this.drawCampfireHitboxes(g);
    }

    drawPlayerHitboxes(graphics) {
        this.playerSprites.forEach((sprite, sessionId) => {
            const animationState = this.playerAnimationState.get(sessionId);
            if (!sprite.visible) return;
            const x = sprite.x;
            const y = sprite.y - PLAYER_VISUAL_Y_OFFSET;

            graphics.lineStyle(2, 0x44aaff, 0.95);
            graphics.strokeRect(x - PLAYER_HITBOX_HW, y - PLAYER_HITBOX_HH, PLAYER_HITBOX_HW * 2, PLAYER_HITBOX_HH * 2);
            graphics.lineStyle(2, 0xffffff, 0.95);
            graphics.strokeCircle(x, y + PLAYER_FOOT_Y_OFFSET, PLAYER_FOOT_RADIUS);

            if (animationState?.attacking) {
                this.drawPlayerAttackHitbox(graphics, x, y, animationState);
            }
        });
    }

    drawEnemyHitboxes(graphics) {
        this.enemySprites.forEach((sprite, enemyId) => {
            const animationState = this.enemyAnimationState.get(enemyId);
            if (!sprite.visible) return;
            const x = sprite.x;
            const y = sprite.y - ENEMY_VISUAL_Y_OFFSET;

            graphics.lineStyle(2, 0xff4444, 0.95);
            graphics.strokeRect(x - ENEMY_HITBOX_HW, y - ENEMY_HITBOX_HH, ENEMY_HITBOX_HW * 2, ENEMY_HITBOX_HH * 2);
            graphics.lineStyle(2, 0xffdd66, 0.95);
            graphics.strokeCircle(x, y + ENEMY_FOOT_Y_OFFSET, ENEMY_FOOT_RADIUS);
            const isCaster = animationState?.enemyType === 3 || animationState?.animationKey === 'caster';
            const isDarkKnight = this.isDarkKnightAnimationState(animationState);
            graphics.lineStyle(1, isCaster ? 0xff66dd : isDarkKnight ? 0x8844ff : 0xff8844, 0.65);
            graphics.strokeCircle(x, y, isCaster ? CASTER_CAST_RANGE : isDarkKnight ? DARK_KNIGHT_DETECTION_RANGE : ENEMY_ATTACK_RANGE);

            if (animationState?.attacking && isDarkKnight) {
                graphics.lineStyle(2, 0xaa66ff, 0.95);
                graphics.strokeCircle(x, y, DARK_KNIGHT_AOE_RADIUS);
            } else if (animationState?.attacking && !isCaster) {
                this.drawEnemyAttackHitbox(graphics, x, y, animationState.direction || 'S');
            }
        });
    }

    drawTreeHitboxes(graphics) {
        this.treeSprites.forEach(({ tree }) => {
            graphics.lineStyle(2, 0x7dff62, 0.95);
            graphics.strokeRect(
                tree.x - TREE_TRUNK_HW,
                tree.y + TREE_TRUNK_Y_OFFSET - TREE_TRUNK_HH,
                TREE_TRUNK_HW * 2,
                TREE_TRUNK_HH * 2,
            );
        });
    }

    drawCampfireHitboxes(graphics) {
        this.campfireSprites.forEach(({ campfire }) => {
            graphics.lineStyle(2, 0xffb23a, 0.9);
            graphics.strokeCircle(campfire.x, campfire.y, CAMPFIRE_HEAL_RADIUS);
        });
    }

    drawPlayerAttackHitbox(graphics, x, y, animationState) {
        const targetX = animationState?.attackTargetX;
        const targetY = animationState?.attackTargetY;
        let vector = null;
        if (Number.isFinite(targetX) && Number.isFinite(targetY)) {
            const dx = targetX - x;
            const dy = targetY - (y + PLAYER_ATTACK_HIT_ORIGIN_Y_OFFSET);
            const distance = Math.hypot(dx, dy);
            if (distance > 0) vector = { x: dx / distance, y: dy / distance };
        }
        if (!vector) {
            vector = this.getDirectionVector(animationState?.direction || DEFAULT_PLAYER_DIRECTION);
        }
        const originY = y + PLAYER_ATTACK_HIT_ORIGIN_Y_OFFSET;
        if ((animationState?.attackItem || animationState?.activeItem) === ITEM_WOOD_BOW) return;

        const startX = x + vector.x * PLAYER_ATTACK_HIT_START_OFFSET;
        const startY = originY + vector.y * PLAYER_ATTACK_HIT_START_OFFSET;
        const endX = x + vector.x * PLAYER_ATTACK_HIT_END_OFFSET;
        const endY = originY + vector.y * PLAYER_ATTACK_HIT_END_OFFSET;

        graphics.lineStyle(2, 0xff66ff, 0.9);
        graphics.strokeCircle(startX, startY, PLAYER_ATTACK_HIT_RADIUS);
        graphics.strokeCircle(endX, endY, PLAYER_ATTACK_HIT_RADIUS);
        graphics.lineBetween(startX, startY, endX, endY);
    }

    drawEnemyAttackHitbox(graphics, x, y, direction) {
        const vector = this.getDirectionVector(direction || 'S');
        const hitX = x + vector.x * ENEMY_ATTACK_HIT_OFFSET;
        const hitY = y + vector.y * ENEMY_ATTACK_HIT_OFFSET;

        graphics.lineStyle(2, 0xffaa00, 0.95);
        graphics.strokeRect(
            hitX - ENEMY_ATTACK_HIT_HW,
            hitY - ENEMY_ATTACK_HIT_HH,
            ENEMY_ATTACK_HIT_HW * 2,
            ENEMY_ATTACK_HIT_HH * 2,
        );
    }

    getDirectionVector(direction) {
        switch (direction) {
            case 'E': return { x: 1, y: 0 };
            case 'SE': return { x: Math.SQRT1_2, y: Math.SQRT1_2 };
            case 'S': return { x: 0, y: 1 };
            case 'SW': return { x: -Math.SQRT1_2, y: Math.SQRT1_2 };
            case 'W': return { x: -1, y: 0 };
            case 'NW': return { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
            case 'N': return { x: 0, y: -1 };
            case 'NE': return { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
            default: return { x: 0, y: 1 };
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

    updatePlayerVisualPositions(deltaMs = 0) {
        const dtSec = Math.max(0, deltaMs) / 1000;
        const maxStep = PLAYER_VISUAL_MOVE_SPEED * dtSec;

        this.playerSprites.forEach((sprite, sessionId) => {
            const animationState = this.playerAnimationState.get(sessionId);
            const weapon = this.playerWeaponSprites.get(sessionId);
            if (!animationState) return;

            const targetX = Number.isFinite(animationState.visualTargetX) ? animationState.visualTargetX : sprite.x;
            const targetY = Number.isFinite(animationState.visualTargetY) ? animationState.visualTargetY : sprite.y;
            const dx = targetX - sprite.x;
            const dy = targetY - sprite.y;
            const distance = Math.hypot(dx, dy);

            if (distance > PLAYER_VISUAL_SNAP_DISTANCE || maxStep <= 0 || distance <= maxStep) {
                sprite.x = targetX;
                sprite.y = targetY;
            } else if (distance > 0) {
                sprite.x += (dx / distance) * maxStep;
                sprite.y += (dy / distance) * maxStep;
            }

            if (weapon) {
                weapon.x = sprite.x;
                weapon.y = sprite.y;
            }
        });
    }

    updateLocalPlayerAnimation() {
        const sessionId = this.localSessionId;
        if (!sessionId || !this.playerSprites.has(sessionId)) return;

        const animationState = this.playerAnimationState.get(sessionId);
        if (animationState?.attacking || animationState?.bowCharging || animationState?.dead) return;

        const dx = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
        const dy = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
        const direction = this.getDirectionFromVector(dx, dy);

        this.setPlayerAnimation(sessionId, !!direction, direction);
    }

    updateRemotePlayerAnimations() {
        this.playerAnimationState.forEach((animationState, sessionId) => {
            if (animationState.dead) return;
            if (this.isLocalSession(sessionId) || !animationState.moving) return;

            if (this.time.now - animationState.lastMovedAt > 150) {
                animationState.moving = false;
                this.setPlayerAnimation(sessionId, false, null);
            }
        });
    }

    getDirectionFromVector(dx, dy) {
        if (Math.hypot(dx, dy) <= 0.0001) return null;

        const angle = Math.atan2(dy, dx);
        const octant = Math.round(angle / (Math.PI / 4));
        const index = (octant + 8) % 8;
        return ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][index];
    }

    startHeldAttack(pointer) {
        this.attackHeldPointerId = pointer.id;
        this.attackHeldPointer = pointer;
        this.tryHeldAttack(pointer, true);
    }

    stopHeldAttack() {
        this.attackHeldPointerId = null;
        this.attackHeldPointer = null;
    }

    startBowCharge(pointer) {
        const sessionId = this.localSessionId;
        const animationState = sessionId ? this.playerAnimationState.get(sessionId) : null;
        if (!this.gameStarted || !sessionId || !animationState || animationState.dead || this.isBuildModeActive) return;
        if (animationState.activeItem !== ITEM_WOOD_BOW || animationState.bowCharging) return;

        const worldPoint = this.getPointerWorldPoint(pointer);
        const sprite = this.playerSprites.get(sessionId);
        const origin = { x: animationState.x ?? sprite?.x ?? 0, y: animationState.y ?? ((sprite?.y ?? 0) - PLAYER_VISUAL_Y_OFFSET) };
        const direction = this.getAttackDirectionFromWorldPoint(worldPoint, origin, animationState.direction || DEFAULT_PLAYER_DIRECTION);
        animationState.attackItem = ITEM_WOOD_BOW;
        animationState.attackTargetX = worldPoint?.x ?? null;
        animationState.attackTargetY = worldPoint?.y ?? null;
        this.bowChargePointerId = pointer.id;
        this.bowChargePointer = pointer;
        this.nextBowAimSendAt = this.time.now + BOW_AIM_SEND_INTERVAL_MS;
        RoomClient.sendBowChargeStart(worldPoint?.x, worldPoint?.y);
        this.playPlayerAttackAnimation(sessionId, direction, { playAudio: false, allowWhileCharging: true });
    }

    updateBowChargeAim() {
        if (!this.bowChargePointer || this.time.now < this.nextBowAimSendAt) return;
        const pointer = this.bowChargePointer;
        if (!pointer.leftButtonDown?.()) {
            this.releaseBowCharge(pointer);
            return;
        }

        const sessionId = this.localSessionId;
        const animationState = sessionId ? this.playerAnimationState.get(sessionId) : null;
        if (!animationState?.bowCharging) return;

        const worldPoint = this.getPointerWorldPoint(pointer);
        animationState.attackTargetX = worldPoint?.x ?? null;
        animationState.attackTargetY = worldPoint?.y ?? null;
        const sprite = this.playerSprites.get(sessionId);
        const origin = { x: animationState.x ?? sprite?.x ?? 0, y: animationState.y ?? ((sprite?.y ?? 0) - PLAYER_VISUAL_Y_OFFSET) };
        const direction = this.getAttackDirectionFromWorldPoint(worldPoint, origin, animationState.direction || DEFAULT_PLAYER_DIRECTION);
        if (direction !== animationState.direction) {
            animationState.bowAnimationPaused = false;
            this.playPlayerAttackAnimation(sessionId, direction, {
                playAudio: false,
                allowWhileCharging: true,
                preserveProgress: true,
            });
            if (animationState.bowFullyCharged) this.pauseFullBowChargeAnimation(sessionId);
        }
        RoomClient.sendBowAim(worldPoint?.x, worldPoint?.y);
        this.nextBowAimSendAt = this.time.now + BOW_AIM_SEND_INTERVAL_MS;
    }

    releaseBowCharge(pointer) {
        const worldPoint = this.getPointerWorldPoint(pointer || this.bowChargePointer);
        RoomClient.sendBowRelease(worldPoint?.x, worldPoint?.y);
        this.bowChargePointerId = null;
        this.bowChargePointer = null;
        this.nextBowAimSendAt = 0;
    }

    cancelBowCharge() {
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        if (!this.bowChargePointer && this.bowChargePointerId === null && !animationState?.bowCharging) return;
        RoomClient.sendBowCancel();
        this.bowChargePointerId = null;
        this.bowChargePointer = null;
        this.nextBowAimSendAt = 0;
    }

    updateHeldAttack() {
        if (!this.attackHeldPointer || this.isBuildModeActive) return;
        if (this.time.now < this.nextHeldAttackAt) return;

        const pointer = this.attackHeldPointer;
        if (!pointer.leftButtonDown?.()) {
            this.stopHeldAttack();
            return;
        }

        this.tryHeldAttack(pointer, false);
    }

    tryHeldAttack(pointer, force = false) {
        if (!force && this.time.now < this.nextHeldAttackAt) return;
        const didAttack = this.playLocalAttackAnimation(pointer);
        if (didAttack) {
            this.nextHeldAttackAt = this.time.now + this.getLocalAxeRepeatMs();
        }
    }

    getLocalAxeRepeatMs() {
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        const stacks = Math.max(0, animationState?.axeSwingSpeedUpgrades || 0);
        return PLAYER_ATTACK_REPEAT_MS / (1 + 0.25 * stacks);
    }

    playLocalAttackAnimation(pointer) {
        const sessionId = this.localSessionId;
        const animationState = sessionId ? this.playerAnimationState.get(sessionId) : null;
        const sprite = sessionId ? this.playerSprites.get(sessionId) : null;
        if (!this.gameStarted || !sessionId || !animationState || !sprite || animationState.attacking || animationState.dead) return false;

        const worldPoint = this.getPointerWorldPoint(pointer);
        const origin = { x: animationState.x ?? sprite.x, y: animationState.y ?? (sprite.y - PLAYER_VISUAL_Y_OFFSET) };
        const direction = this.getAttackDirectionFromWorldPoint(worldPoint, origin, animationState.direction || DEFAULT_PLAYER_DIRECTION);
        const attackItem = animationState.activeItem || '';
        if (attackItem !== ITEM_WOOD_AXE) return false;
        animationState.attackTargetX = worldPoint?.x ?? null;
        animationState.attackTargetY = worldPoint?.y ?? null;
        animationState.attackItem = attackItem;
        RoomClient.sendAttack(direction, worldPoint?.x, worldPoint?.y);
        this.playPlayerAttackAnimation(sessionId, direction, { playAudio: true });
        return true;
    }

    getPointerWorldPoint(pointer) {
        if (!pointer) return null;
        return (this.localCamera || this.cameras.main).getWorldPoint(pointer.x, pointer.y);
    }

    getAttackDirectionFromWorldPoint(worldPoint, origin, fallbackDirection) {
        if (!worldPoint) return fallbackDirection;
        return this.getDirectionFromVector(worldPoint.x - origin.x, worldPoint.y - origin.y) || fallbackDirection;
    }

    getPlayerAttackMode(item) {
        if (item === ITEM_WOOD_AXE) return 'axe';
        if (item === ITEM_WOOD_BOW) return 'bow';
        return null;
    }

    getWeaponAnimationGroup(item, mode = 'idle') {
        if (item !== ITEM_WOOD_AXE && item !== ITEM_WOOD_BOW) return null;
        const suffix = mode === 'attack' ? 'Attack' : mode === 'run' ? 'Run' : 'Idle';
        const prefix = item === ITEM_WOOD_BOW ? 'woodBow' : 'woodAxe';
        return ANIMATION.weapon[`${prefix}${suffix}`];
    }

    getWeaponTextureKey(item, mode = 'idle') {
        if (item !== ITEM_WOOD_AXE && item !== ITEM_WOOD_BOW) return null;
        const suffix = mode === 'attack' ? 'Attack' : mode === 'run' ? 'Run' : 'Idle';
        const prefix = item === ITEM_WOOD_BOW ? 'woodBow' : 'woodAxe';
        return ASSETS.spritesheet[`${prefix}${suffix}`]?.key || ASSETS.spritesheet.woodAxeIdle.key;
    }

    updatePlayerWeaponAnimation(sessionId, moving, direction) {
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!weapon || !animationState || animationState.dead) return;

        const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
        const item = animationState.activeItem || '';
        if (item !== ITEM_WOOD_AXE && item !== ITEM_WOOD_BOW) {
            this.hidePlayerWeapon(sessionId);
            return;
        }
        const mode = moving ? 'run' : 'idle';
        const animation = this.getWeaponAnimationGroup(item, mode)?.[nextDirection];
        weapon.setVisible(true);
        if (!animation) {
            const row = PLAYER_DIRECTION_ORDER.indexOf(nextDirection);
            const frame = Math.max(0, row) * FRAMES_PER_DIRECTION;
            if (weapon.anims.isPlaying) weapon.anims.stop();
            const textureKey = this.getWeaponTextureKey(item, mode);
            if (textureKey) weapon.setTexture(textureKey, frame);
            return;
        }

        if (weapon.anims.currentAnim?.key !== animation.key || !weapon.anims.isPlaying) {
            weapon.play(animation.key);
        }
    }

    updatePlayerWeaponIdleFrame(sessionId, direction) {
        const animationState = this.playerAnimationState.get(sessionId);
        this.updatePlayerWeaponAnimation(sessionId, !!animationState?.moving, direction);
    }

    hidePlayerWeapon(sessionId) {
        const weapon = this.playerWeaponSprites.get(sessionId);
        if (!weapon) return;
        if (weapon.anims.isPlaying) weapon.anims.stop();
        weapon.setVisible(false);
    }

    playDirectionalAnimation(gameObject, animationKey, { restart = false, preserveProgress = false } = {}) {
        const animationState = gameObject?.anims;
        if (!animationState || !animationKey) return false;

        const changingAnimation = animationState.currentAnim?.key !== animationKey;
        const progress = preserveProgress && animationState.currentAnim
            ? Phaser.Math.Clamp(animationState.getProgress(), 0, 1)
            : null;

        if (changingAnimation || !animationState.isPlaying) {
            gameObject.play(animationKey);
            if (progress !== null) animationState.setProgress(progress);
        } else if (restart) {
            animationState.stop();
            gameObject.play(animationKey);
        }

        return true;
    }

    playPlayerWeaponAnimation(sessionId, item, direction, { restart = false, preserveProgress = false } = {}) {
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!weapon || !animationState || !weapon.visible) return false;

        const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
        const animation = this.getWeaponAnimationGroup(item, 'attack')?.[nextDirection];
        if (!animation) return false;

        weapon.setVisible(true);
        this.playDirectionalAnimation(weapon, animation.key, { restart, preserveProgress });

        return true;
    }

    pauseFullBowChargeAnimation(sessionId) {
        const sprite = this.playerSprites.get(sessionId);
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || animationState.attackItem !== ITEM_WOOD_BOW || animationState.bowAnimationPaused) return;

        if (sprite.anims.isPlaying) sprite.anims.pause();
        if (weapon?.anims.isPlaying) weapon.anims.pause();
        animationState.bowAnimationPaused = true;
    }

    cancelBowReleaseFallback(sessionId) {
        const animationState = this.playerAnimationState.get(sessionId);
        if (!animationState?.bowReleaseFallbackEvent) return;
        animationState.bowReleaseFallbackEvent.remove(false);
        animationState.bowReleaseFallbackEvent = null;
    }

    scheduleBowReleaseFallback(sessionId) {
        const animationState = this.playerAnimationState.get(sessionId);
        if (!animationState || animationState.bowReleaseFallbackEvent) return;

        animationState.bowReleaseFallbackEvent = this.time.delayedCall(BOW_RELEASE_FALLBACK_MS, () => {
            animationState.bowReleaseFallbackEvent = null;
            if (animationState.bowCharging || animationState.attackItem !== ITEM_WOOD_BOW) return;
            this.clearBowPresentationState(sessionId, { updateAnimation: true });
        });
    }

    clearBowPresentationState(sessionId, { updateAnimation = true } = {}) {
        const sprite = this.playerSprites.get(sessionId);
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!animationState) return;

        this.cancelBowReleaseFallback(sessionId);
        animationState.bowCharging = false;
        animationState.bowChargeProgress = 0;
        animationState.bowFullyCharged = false;
        animationState.bowAnimationPaused = false;
        if (animationState.attackItem === ITEM_WOOD_BOW) {
            animationState.attacking = false;
            animationState.attackTargetX = null;
            animationState.attackTargetY = null;
        }

        if (sprite?.anims?.isPaused) sprite.anims.resume();
        if (weapon?.anims?.isPaused) weapon.anims.resume();

        if (!updateAnimation || animationState.dead) return;
        if (this.isLocalSession(sessionId)) {
            this.updateLocalPlayerAnimation();
        } else {
            this.setPlayerAnimation(sessionId, animationState.moving, null);
        }
        this.updatePlayerWeaponIdleFrame(sessionId, animationState.direction || DEFAULT_PLAYER_DIRECTION);
    }

    resumeBowReleaseAnimation(sessionId) {
        const sprite = this.playerSprites.get(sessionId);
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || animationState.attackItem !== ITEM_WOOD_BOW || !animationState.bowAnimationPaused) return false;

        this.cancelBowReleaseFallback(sessionId);
        sprite.anims.resume();
        weapon?.anims.resume();
        animationState.bowAnimationPaused = false;
        animationState.bowFullyCharged = false;
        animationState.attacking = true;
        return true;
    }

    playPlayerAttackAnimation(sessionId, direction, { playAudio = true, allowWhileCharging = false, restart = false, resumeBowRelease = false, preserveProgress = false } = {}) {
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || animationState.dead || !sprite.visible) return;

        const attackItem = animationState.attackItem || animationState.activeItem || ITEM_WOOD_AXE;
        if (animationState.attacking && !allowWhileCharging && !restart && !resumeBowRelease) return;
        animationState.attacking = true;

        const didResumeBowRelease = resumeBowRelease && attackItem === ITEM_WOOD_BOW && this.resumeBowReleaseAnimation(sessionId);
        if (!didResumeBowRelease) {
            const attackMode = this.getPlayerAttackMode(attackItem);
            const didPlay = this.playPlayerAnimation(sessionId, attackMode, direction, { force: true, restart, preserveProgress });
            const didPlayWeapon = this.playPlayerWeaponAnimation(sessionId, attackItem, direction, { restart, preserveProgress });
            if (!didPlay) {
                animationState.attacking = false;
                return;
            }
            if (!didPlayWeapon) this.hidePlayerWeapon(sessionId);
        }

        if (playAudio) {
            const audioKey = attackItem === ITEM_WOOD_BOW ? ASSETS.audio.arrowLaunch.key : ASSETS.audio.punchWhoosh.key;
            this.playSfx(audioKey, PUNCH_SOUND_VOLUME, {
                spatial: !this.isLocalSession(sessionId),
                worldX: sprite.x,
                worldY: sprite.y,
            });
        }

        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            if (animationState.bowCharging) return;
            if (animationState.attackItem === ITEM_WOOD_BOW) this.cancelBowReleaseFallback(sessionId);
            animationState.attacking = false;
            animationState.attackTargetX = null;
            animationState.attackTargetY = null;
            if (this.isLocalSession(sessionId)) {
                this.updateLocalPlayerAnimation();
            } else {
                this.setPlayerAnimation(sessionId, animationState.moving, null);
            }
            this.updatePlayerWeaponIdleFrame(sessionId, animationState.direction || direction || DEFAULT_PLAYER_DIRECTION);
        });
    }

    playPlayerDeathAnimation(sessionId) {
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || animationState.deathPlayed) return;

        if (this.isLocalSession(sessionId)) this.cancelBowCharge();
        this.cancelBowReleaseFallback(sessionId);
        animationState.dead = true;
        animationState.deathPlayed = true;
        animationState.attacking = false;
        animationState.moving = false;

        const direction = animationState.direction || DEFAULT_PLAYER_DIRECTION;
        const animation = ANIMATION.player.die?.[direction];
        if (!animation) return;

        this.hidePlayerWeapon(sessionId);
        sprite.setVisible(true);
        sprite.anims.stop();
        sprite.play(animation.key);
    }

    resetPlayerAfterRevive(sessionId) {
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        const player = this.playerHealthBars.get(sessionId)?.player;
        if (!sprite || !animationState || !player || player.isDead) return;

        animationState.dead = false;
        animationState.deathPlayed = false;
        animationState.attacking = false;
        animationState.moving = false;
        animationState.bowCharging = false;
        animationState.bowChargeProgress = 0;
        animationState.bowFullyCharged = false;
        animationState.bowAnimationPaused = false;
        this.cancelBowReleaseFallback(sessionId);
        animationState.attackTargetX = null;
        animationState.attackTargetY = null;
        animationState.x = player.x;
        animationState.y = player.y;
        animationState.visualTargetX = player.x;
        animationState.visualTargetY = player.y + PLAYER_VISUAL_Y_OFFSET;
        sprite.x = animationState.visualTargetX;
        sprite.y = animationState.visualTargetY;
        sprite.setVisible(true);
        sprite.anims.stop();
        this.setPlayerAnimation(sessionId, false, animationState.direction || player?.facingDirection || DEFAULT_PLAYER_DIRECTION);
        this.updatePlayerWeaponIdleFrame(sessionId, animationState.direction || player?.facingDirection || DEFAULT_PLAYER_DIRECTION);
    }

    loadMasterVolume() {
        const saved = Number(window.localStorage?.getItem(MASTER_VOLUME_STORAGE_KEY));
        return Number.isFinite(saved) ? Phaser.Math.Clamp(saved, 0, 1) : DEFAULT_MASTER_VOLUME;
    }

    setMasterVolume(value) {
        this.masterVolume = Phaser.Math.Clamp(value, 0, 1);
        try {
            window.localStorage?.setItem(MASTER_VOLUME_STORAGE_KEY, String(this.masterVolume));
        } catch (_error) {
            // Ignore storage failures; volume still works for this session.
        }
        this.updateVolumeSliderUi();
    }

    updateVolumeSliderUi() {
        if (!this.volumeSliderTrack || !this.volumeSliderFill || !this.volumeSliderKnob) return;

        const value = Phaser.Math.Clamp(this.masterVolume ?? DEFAULT_MASTER_VOLUME, 0, 1);
        const width = VOLUME_SLIDER_WIDTH * value;
        this.volumeSliderFill.width = Math.max(1, width);
        this.volumeSliderKnob.x = this.volumeSliderTrack.x + width;
        this.volumeSliderKnob.y = this.volumeSliderTrack.y;
    }

    getSfxVolume(baseVolume, {
        spatial = false,
        worldX = null,
        worldY = null,
        spatialFalloffPower = 1,
    } = {}) {
        const spatialMultiplier = spatial ? this.getSpatialVolumeMultiplier(worldX, worldY) : 1;
        if (spatialMultiplier <= 0) return 0;
        const adjustedSpatialMultiplier = spatial
            ? Math.pow(spatialMultiplier, Math.max(1, spatialFalloffPower))
            : 1;

        return Math.min(
            MAX_EFFECTIVE_SOUND_VOLUME,
            Phaser.Math.Clamp(baseVolume, 0, 1)
                * Phaser.Math.Clamp(this.masterVolume ?? DEFAULT_MASTER_VOLUME, 0, 1)
                * adjustedSpatialMultiplier,
        );
    }

    playSfx(key, baseVolume, {
        serverEvent = false,
        spatial = false,
        worldX = null,
        worldY = null,
        spatialFalloffPower = 1,
        stackKey = null,
        stackVolumeMultiplier = 1,
        groupKey = null,
        groupWindowMs = 0,
    } = {}) {
        if (serverEvent && !this.shouldPlayServerEventAudio()) return null;

        let volume = this.getSfxVolume(baseVolume, { spatial, worldX, worldY, spatialFalloffPower });
        if (volume <= 0) return null;

        if (groupKey && groupWindowMs > 0) {
            const now = performance.now();
            const lastPlayedAt = this.sfxGroupLastPlayedAt.get(groupKey) || 0;
            if (now - lastPlayedAt < groupWindowMs) return null;
            this.sfxGroupLastPlayedAt.set(groupKey, now);
        }

        const sound = this.sound.add(key, { volume });
        const stackRecord = stackKey ? {
            sound,
            volume,
            stackVolumeMultiplier: Phaser.Math.Clamp(stackVolumeMultiplier, 0, 1),
        } : null;
        if (stackRecord) {
            const stack = this.activeSfxStacks.get(stackKey) || new Set();
            stack.add(stackRecord);
            this.activeSfxStacks.set(stackKey, stack);
            this.updateSfxStackVolumes(stackKey);
        }

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            if (stackRecord) {
                const stack = this.activeSfxStacks.get(stackKey);
                stack?.delete(stackRecord);
                if (stack?.size) this.updateSfxStackVolumes(stackKey);
                else this.activeSfxStacks.delete(stackKey);
            }
            sound.destroy();
        };
        sound.once('complete', cleanup);
        sound.once('stop', cleanup);
        const didPlay = sound.play();
        if (!didPlay) {
            cleanup();
            return null;
        }
        return sound;
    }

    updateSfxStackVolumes(stackKey) {
        const stack = this.activeSfxStacks.get(stackKey);
        if (!stack?.size) return;

        const stackCount = stack.size;
        stack.forEach((record) => {
            const multiplier = Math.pow(record.stackVolumeMultiplier, Math.max(0, stackCount - 1));
            const volume = record.volume * multiplier;
            if (typeof record.sound?.setVolume === 'function') {
                record.sound.setVolume(volume);
            } else if (record.sound) {
                record.sound.volume = volume;
            }
        });
    }

    isCasterAnimationState(animationState) {
        return animationState?.enemyType === 3 || animationState?.animationKey === 'caster';
    }

    isDarkKnightAnimationState(animationState) {
        return animationState?.enemyType === 4 || animationState?.animationKey === 'dk';
    }

    startCasterChargeSound(enemyId) {
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!this.isCasterAnimationState(animationState) || animationState.dead) return;
        if (this.casterChargeSounds.get(enemyId)?.isPlaying) return;

        const sound = this.playSfx(ASSETS.audio.fireballCharge.key, FIREBALL_CHARGE_SOUND_VOLUME, {
            serverEvent: true,
            spatial: true,
            worldX: animationState.x,
            worldY: animationState.y,
            spatialFalloffPower: FIREBALL_SOUND_FALLOFF_POWER,
            stackKey: ASSETS.audio.fireballCharge.key,
            stackVolumeMultiplier: FIREBALL_STACK_VOLUME_MULTIPLIER,
        });
        if (!sound) return;

        this.casterChargeSounds.set(enemyId, sound);
        sound.once('complete', () => {
            if (this.casterChargeSounds.get(enemyId) === sound) {
                this.casterChargeSounds.delete(enemyId);
            }
        });
    }

    stopCasterChargeSound(enemyId) {
        const sound = this.casterChargeSounds.get(enemyId);
        if (!sound) return;

        if (sound.isPlaying || sound.isPaused) {
            sound.stop();
        } else {
            sound.destroy();
        }
        this.casterChargeSounds.delete(enemyId);
    }

    stopAllCasterChargeSounds() {
        Array.from(this.casterChargeSounds.keys()).forEach((enemyId) => this.stopCasterChargeSound(enemyId));
    }

    getSpatialVolumeMultiplier(worldX, worldY) {
        const listener = this.localPlayerSprite;
        if (!listener || !Number.isFinite(worldX) || !Number.isFinite(worldY)) return 0;

        const distance = Math.hypot(worldX - listener.x, worldY - listener.y);
        const viewportRadius = Math.max(this.scale.width, this.scale.height);
        const minAudibleRadius = viewportRadius * SPATIAL_MIN_AUDIBLE_VIEWPORT_SCALE;
        const silentRadius = viewportRadius * SPATIAL_SILENT_VIEWPORT_SCALE;

        if (distance <= SPATIAL_FULL_VOLUME_RADIUS) return SPATIAL_MAX_VOLUME;
        if (distance >= silentRadius) return 0;

        if (distance <= minAudibleRadius) {
            const t = Phaser.Math.Clamp(
                (distance - SPATIAL_FULL_VOLUME_RADIUS) / Math.max(1, minAudibleRadius - SPATIAL_FULL_VOLUME_RADIUS),
                0,
                1,
            );
            return Phaser.Math.Linear(SPATIAL_MAX_VOLUME, SPATIAL_MIN_ONSCREEN_VOLUME, t);
        }

        const t = Phaser.Math.Clamp(
            (distance - minAudibleRadius) / Math.max(1, silentRadius - minAudibleRadius),
            0,
            1,
        );
        return Phaser.Math.Linear(SPATIAL_MIN_ONSCREEN_VOLUME, 0, t);
    }

    shouldPlayAttackAudio(sessionId) {
        if (this.isLocalSession(sessionId)) return true;
        if (!this.isTabActive || document.hidden || this.remoteAttackAudioDirty) return false;
        return performance.now() >= this.suppressRemoteAttackAudioUntil;
    }

    shouldPlayServerEventAudio() {
        return performance.now() >= this.suppressServerEventAudioUntil && !this.isSuppressingResetEffects();
    }

    suppressLevelResetEffects() {
        this.suppressResetEffectsUntil = performance.now() + LEVEL_RESET_EFFECT_SUPPRESS_MS;
    }

    isSuppressingResetEffects() {
        return performance.now() < this.suppressResetEffectsUntil;
    }

    shouldPlayWorldEventAudio() {
        if (!this.shouldPlayServerEventAudio()) return false;
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
        const animationState = this.playerAnimationState.get(sessionId);
        if (animationState?.dead) return;
        const mode = moving ? 'run' : 'idle';
        const didPlay = this.playPlayerAnimation(sessionId, mode, direction);
        if (didPlay && !animationState?.attacking) {
            animationState.moving = moving;
            this.updatePlayerWeaponAnimation(sessionId, moving, animationState.direction || direction || DEFAULT_PLAYER_DIRECTION);
        }
    }

    playPlayerAnimation(sessionId, mode, direction, { force = false, restart = false, preserveProgress = false } = {}) {
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || !sprite.visible) return false;
        if (animationState.dead && mode !== 'die') return false;
        if (animationState.attacking && !force) return false;

        const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
        animationState.direction = nextDirection;

        const animation = ANIMATION.player[mode]?.[nextDirection];
        if (!animation) return false;

        this.playDirectionalAnimation(sprite, animation.key, { restart, preserveProgress });

        return true;
    }

    setEnemyAnimation(enemyId, action, direction) {
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!animationState) return;

        const nextDirection = direction || animationState.direction || 'S';
        animationState.direction = nextDirection;
        animationState.action = action || 'run';
        if (animationState.dead) return;
        if (animationState.takingDamage) return;
        if (animationState.attacking) return;

        if (animationState.action === 'idle') {
            const animationKey = animationState.animationKey || 'enemy1';
            if (ANIMATION[animationKey]?.idle?.[nextDirection]) {
                this.playEnemyAnimation(enemyId, 'idle', nextDirection);
                return;
            }
            this.setEnemyIdleFrame(enemyId, nextDirection);
            return;
        }

        if (animationState.action === 'walk') {
            if (this.playEnemyAnimation(enemyId, 'walk', nextDirection)) return;
            this.playEnemyAnimation(enemyId, 'run', nextDirection);
            return;
        }

        if (animationState.action === 'charge') {
            this.playEnemyAnimation(enemyId, 'charge', nextDirection);
            return;
        }

        this.playEnemyAnimation(enemyId, 'run', nextDirection);
    }

    playEnemyAttackAnimation(enemyId, direction) {
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!animationState || animationState.attacking || animationState.dead) return;

        if (this.isCasterAnimationState(animationState)) {
            this.stopCasterChargeSound(enemyId);
            this.playSfx(ASSETS.audio.fireballCast.key, FIREBALL_CAST_SOUND_VOLUME, {
                serverEvent: true,
                spatial: true,
                worldX: animationState.x,
                worldY: animationState.y,
                spatialFalloffPower: FIREBALL_SOUND_FALLOFF_POWER,
                stackKey: ASSETS.audio.fireballCast.key,
                stackVolumeMultiplier: FIREBALL_STACK_VOLUME_MULTIPLIER,
            });
        }
        if (this.isDarkKnightAnimationState(animationState)) {
            this.playSfx(ASSETS.audio.dkAttack.key, DARK_KNIGHT_ATTACK_SOUND_VOLUME, {
                serverEvent: true,
                spatial: true,
                worldX: animationState.x,
                worldY: animationState.y,
            });
        }

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
        if (!animationState || animationState.dead) return;
        if (this.isDarkKnightAnimationState(animationState) && animationState.attacking) {
            this.flashEnemyDamage(enemyId);
            return;
        }

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

    playEnemyDeathAnimation(enemyId, direction) {
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!animationState || animationState.deathPlayed) return;

        animationState.dead = true;
        animationState.deathPlayed = true;
        animationState.attacking = false;
        animationState.takingDamage = false;
        animationState.action = 'dead';

        if (animationState.damageFlashEvent) {
            animationState.damageFlashEvent.remove(false);
            animationState.damageFlashEvent = null;
        }

        const didPlay = this.playEnemyAnimation(enemyId, 'death', direction, { restart: true });
        if (!didPlay) return;

        const sprite = this.enemySprites.get(enemyId);
        if (sprite) sprite.clearTint();
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

        const animationKey = animationState.animationKey || 'enemy1';
        const animation = ANIMATION[animationKey]?.[mode]?.[nextDirection] || ANIMATION.enemy1[mode]?.[nextDirection];
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
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!sprite) return;

        const row = ENEMY_DIRECTION_ORDER.indexOf(direction);
        const frame = Math.max(0, row) * FRAMES_PER_DIRECTION;
        const animationKey = animationState?.animationKey || 'enemy1';
        const textureKey = ASSETS.spritesheet[`${animationKey}Run`]?.key || ASSETS.spritesheet.enemy1Run.key;
        if (sprite.anims.isPlaying) sprite.anims.stop();
        sprite.setTexture(textureKey, frame);
    }

    getEnemyAnimationKey(enemy) {
        const enemyType = Number(enemy?.enemyType);
        if (enemyType === 4) return 'dk';
        if (enemyType === 3) return 'caster';
        if (enemyType === 2) return 'enemy2';
        return 'enemy1';
    }

    updatePlayerHealthBars() {
        this.playerHealthBars.forEach((_healthBar, sessionId) => {
            this.updatePlayerHealthBar(sessionId);
        });
    }

    updatePlayerBowChargeBars() {
        this.playerBowChargeBars.forEach((_chargeBar, sessionId) => {
            this.updatePlayerBowChargeBar(sessionId);
        });
    }

    updatePlayerReviveBars() {
        this.playerReviveBars.forEach((_reviveBar, sessionId) => {
            this.updatePlayerReviveBar(sessionId);
        });
    }

    updatePlayerLevelLabels() {
        this.playerLevelLabels.forEach((_levelLabel, sessionId) => {
            this.updatePlayerLevelLabel(sessionId);
        });
    }

    updateOffscreenPlayerIndicators() {
        const camera = this.localCamera || this.cameras.main;
        const width = this.scale.width;
        const height = this.scale.height;
        const edge = OFFSCREEN_PLAYER_INDICATOR_RADIUS;

        this.offscreenPlayerIndicators.forEach((indicator, sessionId) => {
            const sprite = this.playerSprites.get(sessionId);
            const animationState = this.playerAnimationState.get(sessionId);
            if (!sprite || !sprite.visible) {
                indicator.setVisible(false);
                return;
            }

            const worldX = animationState?.x ?? sprite.x;
            const worldY = animationState?.y ?? (sprite.y - PLAYER_VISUAL_Y_OFFSET);
            const screenX = (worldX - camera.scrollX) * camera.zoom;
            const screenY = (worldY - camera.scrollY) * camera.zoom;
            const isOffscreen = screenX < 0 || screenX > width || screenY < 0 || screenY > height;
            if (!isOffscreen) {
                indicator.setVisible(false);
                return;
            }

            indicator
                .setFillStyle(animationState?.dead ? OFFSCREEN_DEAD_PLAYER_INDICATOR_COLOR : OFFSCREEN_PLAYER_INDICATOR_COLOR, 1)
                .setPosition(
                    Phaser.Math.Clamp(screenX, edge, width - edge),
                    Phaser.Math.Clamp(screenY, edge, height - edge),
                )
                .setVisible(true);
        });
    }

    updateEnemyHealthBars() {
        this.enemyHealthBars.forEach((_healthBar, enemyId) => {
            this.updateEnemyHealthBar(enemyId);
        });
    }

    updatePlayerLevelLabel(sessionId) {
        const levelLabel = this.playerLevelLabels.get(sessionId);
        const sprite = this.playerSprites.get(sessionId);
        if (!levelLabel || !sprite) return;

        levelLabel.label
            .setText(`${levelLabel.player.level || 1}`)
            .setPosition(sprite.x - PLAYER_HEALTH_BAR_WIDTH * 0.5, sprite.y + PLAYER_LEVEL_LABEL_Y_OFFSET)
            .setVisible(!levelLabel.player.isDead);
    }

    updateLocalExperienceState(player) {
        const experience = Math.max(0, player.experience || 0);
        const experienceToNext = Math.max(1, player.experienceToNext || 5);
        const level = Math.max(1, player.level || 1);
        this.localExperienceState = { experience, experienceToNext, level };
        this.updateExperienceBar(experience, experienceToNext, level);
    }

    updateExperienceBar(experience, experienceToNext, level) {
        if (!this.experienceBarLayout || !this.experienceBarBackground || !this.experienceBarFill) return;

        const { x, y, width, height } = this.experienceBarLayout;
        const progress = Phaser.Math.Clamp(experience / Math.max(1, experienceToNext), 0, 1);

        this.experienceBarBackground.clear();
        this.experienceBarBackground.fillStyle(EXPERIENCE_BAR_BACKGROUND_COLOR, 0.9);
        this.experienceBarBackground.fillRoundedRect(x, y, width, height, 6);
        this.experienceBarBackground.lineStyle(3, EXPERIENCE_BAR_STROKE_COLOR, 0.95);
        this.experienceBarBackground.strokeRoundedRect(x, y, width, height, 6);

        this.experienceBarFill.clear();
        if (progress > 0) {
            this.experienceBarFill.fillStyle(EXPERIENCE_BAR_FILL_COLOR, 1);
            this.experienceBarFill.fillRoundedRect(x, y, width * progress, height, 6);
        }

        if (this.experienceBarText) {
            this.experienceBarText.setText(`XP: ${experience} / ${experienceToNext}   Lv. ${level}`);
        }
    }

    updateHudHealthBar(health, maxHealth = PLAYER_MAX_HEALTH) {
        if (!this.hudHealthBarLayout || !this.hudHealthBarBackground || !this.hudHealthBarFill) return;

        const { x, y, width, height } = this.hudHealthBarLayout;
        const currentMaxHealth = Math.max(1, maxHealth || PLAYER_MAX_HEALTH);
        const currentHealth = Phaser.Math.Clamp(health || 0, 0, currentMaxHealth);
        const progress = currentHealth / currentMaxHealth;

        this.hudHealthBarBackground.clear();
        this.hudHealthBarBackground.fillStyle(EXPERIENCE_BAR_BACKGROUND_COLOR, 0.9);
        this.hudHealthBarBackground.fillRoundedRect(x, y, width, height, 6);
        this.hudHealthBarBackground.lineStyle(3, EXPERIENCE_BAR_STROKE_COLOR, 0.95);
        this.hudHealthBarBackground.strokeRoundedRect(x, y, width, height, 6);

        this.hudHealthBarFill.clear();
        if (progress > 0) {
            this.hudHealthBarFill.fillStyle(HUD_HEALTH_BAR_FILL_COLOR, 1);
            this.hudHealthBarFill.fillRoundedRect(x, y, width * progress, height, 6);
        }

        this.hudHealthBarText?.setText(`HP: ${currentHealth} / ${currentMaxHealth}`);
    }

    updatePlayerHealthBar(sessionId) {
        const healthBar = this.playerHealthBars.get(sessionId);
        const sprite = this.playerSprites.get(sessionId);
        if (!healthBar || !sprite) return;

        const maxHealth = Math.max(1, healthBar.player.maxHealth || PLAYER_MAX_HEALTH);
        const health = Phaser.Math.Clamp(healthBar.player.health || 0, 0, maxHealth);
        const fillWidth = (health / maxHealth) * PLAYER_HEALTH_BAR_WIDTH;
        const x = sprite.x - PLAYER_HEALTH_BAR_WIDTH * 0.5;
        const y = sprite.y + PLAYER_HEALTH_BAR_Y_OFFSET;

        healthBar.background.clear();
        healthBar.background.fillStyle(0x050505, 1);
        healthBar.background.fillRect(x, y, PLAYER_HEALTH_BAR_WIDTH, PLAYER_HEALTH_BAR_HEIGHT);

        healthBar.fill.clear();
        if (fillWidth > 0) {
            healthBar.fill.fillStyle(PLAYER_HEALTH_BAR_FILL_COLOR, 1);
            healthBar.fill.fillRect(x, y, fillWidth, PLAYER_HEALTH_BAR_HEIGHT);
        }
    }

    updatePlayerBowChargeBar(sessionId) {
        const chargeBar = this.playerBowChargeBars.get(sessionId);
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!chargeBar || !sprite || !animationState) return;

        const progress = Phaser.Math.Clamp(animationState.bowChargeProgress || 0, 0, 1);
        chargeBar.fill.clear();
        chargeBar.fill.setVisible(!!animationState.bowCharging && progress > 0 && !animationState.dead);
        if (!chargeBar.fill.visible) return;

        const x = sprite.x - PLAYER_HEALTH_BAR_WIDTH * 0.5;
        const y = sprite.y + PLAYER_BOW_CHARGE_BAR_Y_OFFSET;
        chargeBar.fill.fillStyle(PLAYER_BOW_CHARGE_BAR_COLOR, PLAYER_BOW_CHARGE_BAR_ALPHA);
        chargeBar.fill.fillRect(x, y, PLAYER_HEALTH_BAR_WIDTH * progress, PLAYER_HEALTH_BAR_HEIGHT);
    }

    updatePlayerReviveBar(sessionId) {
        const reviveBar = this.playerReviveBars.get(sessionId);
        const sprite = this.playerSprites.get(sessionId);
        if (!reviveBar || !sprite) return;

        const progress = Phaser.Math.Clamp(reviveBar.player.reviveProgress || 0, 0, 1);
        reviveBar.background.clear();
        reviveBar.fill.clear();
        if (!reviveBar.player.isDead || progress <= 0) return;

        const fillWidth = progress * PLAYER_REVIVE_BAR_WIDTH;
        const x = sprite.x - PLAYER_REVIVE_BAR_WIDTH * 0.5;
        const y = sprite.y + PLAYER_REVIVE_BAR_Y_OFFSET;

        reviveBar.background.fillStyle(0x050505, 1);
        reviveBar.background.fillRect(x, y, PLAYER_REVIVE_BAR_WIDTH, PLAYER_REVIVE_BAR_HEIGHT);

        reviveBar.fill.fillStyle(PLAYER_REVIVE_BAR_FILL_COLOR, 1);
        reviveBar.fill.fillRect(x, y, fillWidth, PLAYER_REVIVE_BAR_HEIGHT);
    }

    updateEnemyHealthBar(enemyId) {
        const healthBar = this.enemyHealthBars.get(enemyId);
        const sprite = this.enemySprites.get(enemyId);
        if (!healthBar || !sprite) return;

        const maxHealth = Math.max(1, healthBar.enemy.maxHealth || ENEMY_MAX_HEALTH);
        const health = Phaser.Math.Clamp(healthBar.enemy.health || 0, 0, maxHealth);
        const fillWidth = (health / maxHealth) * ENEMY_HEALTH_BAR_WIDTH;
        const x = sprite.x - ENEMY_HEALTH_BAR_WIDTH * 0.5;
        const y = sprite.y + ENEMY_HEALTH_BAR_Y_OFFSET;

        healthBar.background.clear();
        healthBar.background.fillStyle(0x050505, 1);
        healthBar.background.fillRect(x, y, ENEMY_HEALTH_BAR_WIDTH, ENEMY_HEALTH_BAR_HEIGHT);

        healthBar.fill.clear();
        if (fillWidth > 0) {
            healthBar.fill.fillStyle(ENEMY_HEALTH_BAR_FILL_COLOR, 1);
            healthBar.fill.fillRect(x, y, fillWidth, ENEMY_HEALTH_BAR_HEIGHT);
        }
    }

    updateWoodBlockHealthBar(blockId) {
        const sprites = this.woodBlockSprites.get(blockId);
        if (!sprites) return;

        const maxHealth = Math.max(1, sprites.block.maxHealth || 5);
        const health = Phaser.Math.Clamp(sprites.block.health ?? maxHealth, 0, maxHealth);
        sprites.healthBackground.clear();
        sprites.healthFill.clear();
        if (health >= maxHealth) return;

        const x = sprites.block.x - WOOD_BLOCK_HEALTH_BAR_WIDTH * 0.5;
        const y = sprites.block.y + WOOD_BLOCK_HEALTH_BAR_Y_OFFSET;
        const fillWidth = (health / maxHealth) * WOOD_BLOCK_HEALTH_BAR_WIDTH;

        sprites.healthBackground.fillStyle(0x050505, 1);
        sprites.healthBackground.fillRect(x, y, WOOD_BLOCK_HEALTH_BAR_WIDTH, WOOD_BLOCK_HEALTH_BAR_HEIGHT);

        if (fillWidth > 0) {
            sprites.healthFill.fillStyle(WOOD_BLOCK_HEALTH_BAR_FILL_COLOR, 1);
            sprites.healthFill.fillRect(x, y, fillWidth, WOOD_BLOCK_HEALTH_BAR_HEIGHT);
        }
    }

    flashWoodBlockHit(blockId) {
        const sprites = this.woodBlockSprites.get(blockId);
        if (!sprites) return;

        sprites.flashEvent?.remove(false);
        sprites.fill.setFillStyle(0xffffff, 1);
        sprites.flashEvent = this.time.delayedCall(WOOD_BLOCK_HIT_FLASH_MS, () => {
            const current = this.woodBlockSprites.get(blockId);
            if (!current) return;
            current.fill.setFillStyle(WOOD_BLOCK_FILL_COLOR, 1);
            current.flashEvent = null;
        });
    }

    addExplosion(x, y) {
        const explosion = new Explosion(this, x, y);
        this.registerWorldObject(explosion);
    }

    clearAllSprites() {
        this.stopAllCasterChargeSounds();
        this.playerAnimationState.forEach((_animationState, sessionId) => this.cancelBowReleaseFallback(sessionId));
        this.playerSprites.forEach(s => s.destroy());
        this.playerWeaponSprites.forEach(s => s.destroy());
        this.playerHealthBars.forEach(({ background, fill }) => {
            background.destroy();
            fill.destroy();
        });
        this.playerBowChargeBars.forEach(({ fill }) => {
            fill.destroy();
        });
        this.playerReviveBars.forEach(({ background, fill }) => {
            background.destroy();
            fill.destroy();
        });
        this.playerLevelLabels.forEach(({ label }) => {
            label.destroy();
        });
        this.offscreenPlayerIndicators.forEach(indicator => indicator.destroy());
        this.enemySprites.forEach(s => s.destroy());
        this.enemyHealthBars.forEach(({ background, fill }) => {
            background.destroy();
            fill.destroy();
        });
        this.treeSprites.forEach(({ bottom, top }) => {
            bottom.destroy();
            top.destroy();
        });
        this.logSprites.forEach(({ sprites }) => {
            sprites.forEach((sprite) => sprite.destroy());
        });
        this.woodBlockSprites.forEach(({ fill, outline, healthBackground, healthFill, flashEvent }) => {
            flashEvent?.remove(false);
            fill.destroy();
            outline.destroy();
            healthBackground.destroy();
            healthFill.destroy();
        });
        this.campfireSprites.forEach(({ sprite, radius, healBar }) => {
            sprite.destroy();
            radius?.destroy();
            healBar?.destroy();
        });
        this.playerBulletSprites.forEach(s => s.destroy());
        this.enemyBulletSprites.forEach(s => s.destroy());
        if (this.grassNoiseLayer) {
            this.grassNoiseLayer.destroy();
            this.grassNoiseLayer = null;
        }
        if (this.buildGridGraphics) {
            this.buildGridGraphics.destroy();
            this.buildGridGraphics = null;
        }
        if (this.buildPreview) {
            this.buildPreview.destroy();
            this.buildPreview = null;
        }
        if (this.hitboxGraphics) {
            this.hitboxGraphics.destroy();
            this.hitboxGraphics = null;
        }
        this.showHitboxes = false;
        if (this.hitboxToggleButton) {
            this.hitboxToggleButton.setColor('#ff2222');
        }
        this.isBuildModeActive = false;
        this.resetBuildDragState();
        this.stopHeldAttack();
        this.cancelBowCharge();
        this.playerSprites.clear();
        this.playerWeaponSprites.clear();
        this.playerAnimationState.clear();
        this.playerHealthBars.clear();
        this.playerBowChargeBars.clear();
        this.playerReviveBars.clear();
        this.playerLevelLabels.clear();
        this.offscreenPlayerIndicators.clear();
        this.localExperienceState = null;
        this.localPendingUpgradeChoices = 0;
        this.clearUpgradeUi();
        this.enemySprites.clear();
        this.enemyAnimationState.clear();
        this.enemyHealthBars.clear();
        this.treeSprites.clear();
        this.logSprites.clear();
        this.woodBlockSprites.clear();
        this.campfireSprites.clear();
        this.playerBulletSprites.clear();
        this.enemyBulletSprites.clear();
    }
}

