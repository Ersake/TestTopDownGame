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
const PLAYER_DASH_VISUAL_MOVE_SPEED = 900;
const PLAYER_VISUAL_SNAP_DISTANCE = 96;
const PLAYER_BODY_DEPTH = 100;
const PLAYER_WEAPON_DEPTH = 101;
const ENEMY_DISPLAY_SIZE = 128;
const DARK_KNIGHT_DISPLAY_SIZE = ENEMY_DISPLAY_SIZE * 1.5;
const ENEMY_VISUAL_Y_OFFSET = 6;
const TREE_HALF_SIZE = 96;
const LOG_DISPLAY_SIZE = 48;
const LOG_DEPTH = 95;
const PLAYER_HITBOX_HW = 17;
const PLAYER_HITBOX_HH = 17;
const PLAYER_FOOT_RADIUS = 5;
const PLAYER_FOOT_Y_OFFSET = 32;
const ENEMY_HITBOX_HW = 28;
const ENEMY_HITBOX_HH = 28;
const PLAYER_BULLET_HITBOX_HW = 6;
const PLAYER_BULLET_HITBOX_HH = 16;
const ENEMY_BULLET_HITBOX_HW = 8;
const ENEMY_BULLET_HITBOX_HH = 12;
const ARROW_HITBOX_ROTATION_OFFSET = Phaser.Math.DegToRad(90);
const ENEMY_FOOT_RADIUS = 7;
const ENEMY_FOOT_Y_OFFSET = 34;
const TREE_TRUNK_Y_OFFSET = -18;
const PLAYER_ATTACK_HIT_RADIUS = 33;
const PLAYER_AXE_WHIRLWIND_HIT_RADIUS = 56;
const PLAYER_AXE_WHIRLWIND_HITBOX_DEBUG_MS = 120;
const PLAYER_ATTACK_HIT_START_OFFSET = 10;
const PLAYER_ATTACK_HIT_END_OFFSET = 40;
const PLAYER_ATTACK_HIT_ORIGIN_Y_OFFSET = 18;
const ARROW_DISPLAY_SIZE = 64;
const FIREBALL_DISPLAY_SIZE = 48;
const FIREBALL_DEPTH = 84;
const FIRECHARGE_DISPLAY_SIZE = 48;
const FIRECHARGE_Y_OFFSET = 4;
const FIRECHARGE_DIRECTION_OFFSET = 12;
const FIRECHARGE_DEPTH_OFFSET = 4;
const FIREBALL_ROTATION_OFFSET = Phaser.Math.DegToRad(32);
const BOW_AIM_SEND_INTERVAL_MS = 50;
const ENEMY_ATTACK_RANGE = 26;
const BASE_CASTER_CAST_RANGE = 360;
const CASTER_CAST_RANGE = BASE_CASTER_CAST_RANGE;
const DARK_KNIGHT_DETECTION_RANGE = BASE_CASTER_CAST_RANGE;
const DARK_KNIGHT_AOE_RADIUS = 88;
const ENEMY_ATTACK_HIT_OFFSET = 28;
const ENEMY_ATTACK_HIT_HW = 42;
const ENEMY_ATTACK_HIT_HH = 36;
const HITBOX_DEPTH = 950;
const HITBOX_BUTTON_SIZE = 34;
const OFFSCREEN_PLAYER_INDICATOR_RADIUS = 6;
const OFFSCREEN_PLAYER_INDICATOR_COLOR = 0x89cff0;
const OFFSCREEN_DEAD_PLAYER_INDICATOR_COLOR = 0xff9d2e;
const TILE_WORLD_SCALE = 1.25;
const BASE_TILE_SIZE = 32;
const BUILD_GRID_SIZE = BASE_TILE_SIZE * TILE_WORLD_SCALE;
const BUILD_GRID_LINE_COLOR = 0xd8f5d0;
const BUILD_GRID_LINE_ALPHA = 0.22;
const BUILD_GRID_DOT_LENGTH = 6;
const BUILD_GRID_DOT_GAP = 10;
const MAP_EDITOR_MODE = 'map-editor';
const MAP_TILE_SIZE = BASE_TILE_SIZE * TILE_WORLD_SCALE;
const TREE_VARIANT_TOPDOWN_3X3 = 'topdown_3x3';
const TOPDOWN_TREE_FRAME_COL = 11;
const TOPDOWN_TREE_FRAME_ROW = 11;
const TOPDOWN_TREE_TILE_SPAN = 3;
const TREE_HITBOX_SCALE = 0.75;
const TOPDOWN_TREE_HITBOX_RADIUS = MAP_TILE_SIZE * TOPDOWN_TREE_TILE_SPAN * 0.5 * TREE_HITBOX_SCALE;
const LEGACY_TREE_HITBOX_RADIUS = 28 * TREE_HITBOX_SCALE;
const MAP_PALETTE_TILE_SIZE = 16;
const MAP_CHUNK_SIZE = 16;
const MAP_CHUNK_CELL_COUNT = MAP_CHUNK_SIZE * MAP_CHUNK_SIZE;
const MAP_CHUNK_ENCODED_LENGTH = Math.ceil((MAP_CHUNK_CELL_COUNT * 2) / 3) * 4;
const MAP_FRAME_COUNT = 32 * 32;
const MAP_MAX_FILLED_CELLS = 50000;
const CASTLE_PARTIAL_SUPPORT_FRAMES = new Set([35, 36, 37, 67]);
const CASTLE_LOWER_PARTIAL_SUPPORT_FRAMES = new Set([68, 69]);
const WORKBENCH_LEFT_FRAME = 294;
const WORKBENCH_RIGHT_FRAME = 295;
const WORKBENCH_INTERACT_RANGE = 80;
const ENCHANTMENT_TABLE_FRAME = 0;
const ENCHANTMENT_TABLE_DISPLAY_SIZE = MAP_TILE_SIZE * 2;
const ENCHANTMENT_TABLE_VISUAL_Y_OFFSET = -MAP_TILE_SIZE * 0.5;
const ENCHANTMENT_TABLE_DEPTH = 87;
const ENCHANTMENT_TABLE_IDLE_ANIMATION_KEY = 'enchantment-table-idle';
const ENCHANTMENT_TABLE_EFFECT_ANIMATION_KEY = 'enchantment-table-effect';
const CRAFTING_TABLE_FRAME = 0;
const CRAFTING_TABLE_DISPLAY_SIZE = MAP_TILE_SIZE * 2;
const CRAFTING_TABLE_VISUAL_Y_OFFSET = -MAP_TILE_SIZE * 0.5;
const CRAFTING_TABLE_DEPTH = 87;
const CALTROPS_FRAME = 449;
const CALTROPS_DISPLAY_SIZE = 40;
const CALTROPS_DEPTH = 85;
const CALTROPS_SLOW_RADIUS = 44;
const CRAFTING_PANEL_WIDTH = 760;
const CRAFTING_PANEL_HEIGHT = 430;
const CRAFTING_PANEL_PADDING = 28;
const CRAFTING_ROW_HEIGHT = 116;
const CRAFTING_ROW_GAP = 16;
const CRAFTING_ICON_SIZE = 72;
const CRAFTING_SCROLL_STEP = 46;
const CAMPFIRE_CRAFT_RECIPE_ID = 'campfire';
const MAP_PALETTE_MARGIN_X = 10;
const MAP_PALETTE_Y = 54;
const MAP_PALETTE_COLUMNS = 32;
const MAP_PALETTE_SIZE = MAP_PALETTE_COLUMNS * MAP_PALETTE_TILE_SIZE;
const MAP_PALETTE_PANEL_WIDTH = MAP_PALETTE_SIZE + MAP_PALETTE_MARGIN_X * 2;
const MAP_DRAFT_STORAGE_KEY = 'testtopdown-map-drafts:v1';
const MAP_DRAFT_VERSION = 5;
const EDITOR_WORLD_BACKGROUND_COLOR = 0x707070;
const EDITOR_WORLD_BACKGROUND_CSS = '#707070';
const BUILD_PREVIEW_FILL_COLOR = 0xfff0a8;
const BUILD_PREVIEW_STROKE_COLOR = 0xffffff;
const BUILD_DRAG_SEND_INTERVAL_MS = 35;
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
const BASE_WORLD_WIDTH = 3840;
const BASE_WORLD_HEIGHT = 2160;
const DEFAULT_WORLD_WIDTH = BASE_WORLD_WIDTH * TILE_WORLD_SCALE;
const DEFAULT_WORLD_HEIGHT = BASE_WORLD_HEIGHT * TILE_WORLD_SCALE;
const LEGACY_EDITOR_WORLD_WIDTH = BASE_WORLD_WIDTH * 2;
const LEGACY_EDITOR_WORLD_HEIGHT = BASE_WORLD_HEIGHT * 2;
const WORLD_BACKGROUND_COLOR = 0x2f7c31;
const WORLD_BACKGROUND_CSS = '#2f7c31';
const GRASS_NOISE_DEPTH = -99;
const GRASS_NOISE_DARK_COLOR = 0x1f5f27;
const GRASS_NOISE_CELL_SIZE = 96;
const GRASS_NOISE_PATCH_COUNT = 24;
const GRASS_NOISE_FLECK_COUNT = 460;
const PUNCH_SOUND_VOLUME = 0.6;
const AXE_ATTACK_HIT_SOUND_DELAY_MS = 200;
const SWORD_SPIN_SOUND_VOLUME = 0.48;
const SWORD_SPIN_HIGH_PASS_HZ = 180;
const AXE_WHIRLWIND_SOUND_INTERVAL_MS = 500;
const WOOD_HIT_SOUND_VOLUME = 0.75;
const TREE_FALL_SOUND_VOLUME = 0.5;
const SKELETON_HIT_SOUND_VOLUME = 0.75;
const SKELETON_HIT_BURST_WINDOW_MS = 80;
const GRAB_ITEM_SOUND_VOLUME = 0.75;
const REVIVE_SOUND_VOLUME = 0.75;
const PLAYER_HURT_SOUND_VOLUME = 0.5625;
const LEVEL_UP_SOUND_VOLUME = 0.7;
const ENEMY_WAVE_HORN_SOUND_VOLUME = 0.7;
const ENEMY_WAVE_HORN_MAX_EVENT_AGE_MS = 2000;
const DEBUG_MAX_ROUND = 99;
const IS_DEVELOPMENT_BUILD = import.meta.env.DEV;
const FIREBALL_CHARGE_SOUND_VOLUME = 0.315;
const FIREBALL_CAST_SOUND_VOLUME = 0.375;
const FIREBALL_SOUND_FALLOFF_POWER = 1.25;
const FIREBALL_STACK_VOLUME_MULTIPLIER = 0.72;
const DARK_KNIGHT_ATTACK_SOUND_VOLUME = 0.495;
const ANVIL_HIT_SOUND_VOLUME = 0.5;
const ENEMY_DAMAGE_FLASH_MS = 90;
const PLAYER_ATTACK_REPEAT_MS = 850;
const PLAYER_ATTACK_REPEAT_BUFFER_MS = 60;
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
const PLAYER_DASH_COOLDOWN_BAR_Y_OFFSET = 36;
const PLAYER_DASH_COOLDOWN_BAR_DEPTH = PLAYER_HEALTH_BAR_DEPTH + 1;
const PLAYER_DASH_COOLDOWN_BAR_COLOR = 0xffffff;
const PLAYER_DASH_COOLDOWN_BAR_ALPHA = 0.38;
const PLAYER_REVIVE_BAR_WIDTH = 58;
const PLAYER_REVIVE_BAR_HEIGHT = 7;
const PLAYER_REVIVE_BAR_Y_OFFSET = -38;
const PLAYER_REVIVE_BAR_DEPTH = 131;
const PLAYER_REVIVE_BAR_FILL_COLOR = 0x8bdcff;
const PLAYER_LEVEL_LABEL_Y_OFFSET = -27;
const PLAYER_LEVEL_LABEL_DEPTH = 132;
const PLAYER_NAME_LABEL_Y_OFFSET = -70;
const PLAYER_NAME_LABEL_DEPTH = 133;
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
const HOTBAR_DRAG_START_DISTANCE = 6;
const HOTBAR_COOLDOWN_OVERLAY_COLOR = 0x000000;
const HOTBAR_COOLDOWN_OVERLAY_ALPHA = 0.55;
const HOTBAR_ACTIVE_OVERLAY_COLOR = 0xffffff;
const HOTBAR_ACTIVE_OVERLAY_ALPHA = 0.42;
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
const ITEM_WOOD_CALTROPS = 'wood_caltrops';
const ITEM_WOOD = 'wood';
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
    { field: 'axeWoodGainUpgrades', label: 'Axe wood gain' },
    { field: 'axeCampfireMaxUpgrades', label: 'Axe max campfires' },
    { field: 'axeWhirlwindCooldownUpgrades', label: 'Whirlwind cooldown' },
    { field: 'axeWhirlwindAoeUpgrades', label: 'Whirlwind AOE' },
    { field: 'bowDamageUpgrades', label: 'Bow damage' },
    { field: 'bowPierceUpgrades', label: 'Bow pierce' },
    { field: 'bowChargeTimeUpgrades', label: 'Bow charge speed' },
    { field: 'woodGatherUpgrades', label: 'Wood gathering' },
];
const ENCHANTMENT_MAX_RANK = 3;
const ENCHANTMENT_SKILL_TREES = {
    [ITEM_WOOD_AXE]: {
        title: 'Axe Skills',
        displayName: 'Axe',
        nodes: [
            { id: 'axe_wood_gain', label: '+25% wood gain', field: 'axeWoodGainUpgrades', maxRank: ENCHANTMENT_MAX_RANK, column: 0, row: 0 },
            { id: 'axe_campfire_max', label: '+1 max campfires', field: 'axeCampfireMaxUpgrades', prerequisite: 'axe_wood_gain', maxRank: ENCHANTMENT_MAX_RANK, column: 0, row: 1 },
            { id: 'axe_whirlwind_cooldown', label: '-1 second whirlwind cooldown', field: 'axeWhirlwindCooldownUpgrades', maxRank: ENCHANTMENT_MAX_RANK, column: 1, row: 0 },
            { id: 'axe_whirlwind_aoe', label: '+25% AOE size', field: 'axeWhirlwindAoeUpgrades', prerequisite: 'axe_whirlwind_cooldown', maxRank: ENCHANTMENT_MAX_RANK, column: 1, row: 1 },
        ],
    },
    [ITEM_WOOD_BOW]: {
        title: 'Bow Skills',
        displayName: 'Bow',
        nodes: [
            { id: 'bow_damage', label: '+1 damage', field: 'bowDamageUpgrades' },
            { id: 'bow_pierce', label: '+1 pierce', field: 'bowPierceUpgrades', prerequisite: 'bow_damage' },
            { id: 'bow_charge_time', label: '-25% charge time', field: 'bowChargeTimeUpgrades', prerequisite: 'bow_pierce' },
        ],
    },
    [ITEM_HAMMER]: {
        title: 'Hammer Skills',
        displayName: 'Hammer',
        nodes: [
            { id: 'hammer_wood_gather', label: '+50% wood gather', field: 'woodGatherUpgrades' },
        ],
    },
};
const ENCHANTMENT_NODE_BY_ID = Object.values(ENCHANTMENT_SKILL_TREES)
    .flatMap(({ nodes }) => nodes)
    .reduce((lookup, node) => {
        lookup[node.id] = node;
        return lookup;
    }, {});
const CRAFTING_RECIPES = [
    {
        id: CAMPFIRE_CRAFT_RECIPE_ID,
        name: 'Campfire',
        description: 'Heals 1 HP every 10 seconds.',
        cost: 'Cost: 10 wood',
        enabled: true,
        icon: 'campfire',
    },
    {
        id: 'wood_caltrops',
        name: 'Wood Caltrops',
        description: 'Slows enemies. Can upgrade to deal damage.',
        cost: 'Cost: 4 wood',
        enabled: true,
        icon: 'caltrops',
    },
    {
        id: 'sword_shield',
        name: 'Sword and Shield',
        description: 'Pretty good.',
        cost: 'Cost: 10 wood, 10 bones',
        enabled: false,
        icon: 'placeholder',
    },
    {
        id: 'bone_bow',
        name: 'Bone Bow',
        description: 'Deals 2 damage.',
        cost: 'Cost: 15 bones',
        enabled: false,
        icon: 'placeholder',
    },
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
        if (this.isMapEditor) this.initMapEditorUi();
        this.initInput();
        this.initNetworking();
    }

    update(_time, delta) {
        if (!this.gameStarted) return;
        this.sendInput();
        this.updatePlayerVisualPositions(delta);
        this.ensureLocalCameraFollow();
        if (this.isMapEditor) {
            this.updateEditorGrid();
            this.updateLocalPlayerAnimation();
            this.updateRemotePlayerAnimations();
            this.updatePlayerHealthBars();
            this.updatePlayerDashCooldownBars();
            this.updatePlayerNameLabels();
            return;
        }
        this.cancelBowChargeForMovement();
        this.updateBowChargeAim();
        this.updateHeldAttack();
        this.updateAxeWhirlwind();
        this.updateAxeWhirlwindSounds();
        this.updateBuildHold();
        this.updateLocalPlayerAnimation();
        this.updateRemotePlayerAnimations();
        this.updatePlayerHealthBars();
        this.updatePlayerBowChargeBars();
        this.updatePlayerDashCooldownBars();
        this.updatePlayerReviveBars();
        this.updatePlayerNameLabels();
        this.updatePlayerLevelLabels();
        this.updateOffscreenPlayerIndicators();
        this.updateEnemyHealthBars();
        this.updateCasterChargeEffects();
        this.updateCampfireHealBars();
        this.updateCraftingMenuProximity();
        this.updateEnchantmentMenuProximity();
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
        this.isMapEditor = state?.mode === MAP_EDITOR_MODE;

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
        this.playerDashCooldownBars = new Map();
        this.playerReviveBars = new Map();
        this.playerNameLabels = new Map();
        this.playerLevelLabels = new Map();
        this.offscreenPlayerIndicators = new Map();
        this.localExperienceState = null;
        this.localPendingUpgradeChoices = 0;
        this.localActiveSlot = 1;
        this.hotbarSlots = [];
        this.hotbarSlotItems = [ITEM_WOOD_AXE, ITEM_WOOD_BOW, ITEM_HAMMER, '', '', '', '', '', ''];
        this.hotbarSlotCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.hotbarDrag = null;
        this.localAxeWhirlwindProgress = 0;
        this.localAxeWhirlwindCooldownProgress = 0;
        this.skillPointText = null;
        this.enchantmentUi = null;
        this.enchantmentUiObjects = new Set();
        this.enchantmentSelectedItem = '';
        this.enchantmentSelectedSlot = 0;
        this.outfitColorIndex = OUTFIT_TAN_INDEX;
        this.outfitColorButtons = [];
        this.outfitColorButtonObjects = new Set();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.enemySprites        = new Map();
        this.enemyAnimationState = new Map();
        this.enemyHealthBars = new Map();
        this.casterChargeEffects = new Map();
        this.casterChargeSounds = new Map();
        this.treeSprites         = new Map();
        this.logSprites          = new Map();
        this.campfireSprites     = new Map();
        this.caltropSprites      = new Map();
        this.enchantmentTableSprites = new Map();
        this.craftingTableSprites = new Map();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.playerBulletSprites = new Map();
        /** @type {Map<string, Phaser.GameObjects.Sprite>} */
        this.enemyBulletSprites  = new Map();
        this.grassNoiseLayer = null;
        this.mapEditorTilemap = null;
        this.mapEditorLayer = null;
        this.mapEditorChunks = new Map();
        this.mapTileCache = new Map();
        this.mapEditorTileSprites = new Map();
        this.mapEditorUiObjects = new Set();
        this.mapLayerButtons = [];
        this.mapPaletteLayoutObjects = [];
        this.mapPaletteSide = 'left';
        this.mapPaletteSideButton = null;
        this.mapPaletteHitArea = null;
        this.mapPaletteSelection = null;
        this.mapEditorStatusText = null;
        this.mapDraftNameInput = null;
        this.serverMapNames = new Set();
        this.mapDirty = false;
        this.activeMapTool = 'tiles';
        this.activeLayer3Tool = 'enchantment';
        this.mapToolButtons = [];
        this.editorGridGraphics = null;
        this.editorBoundaryGraphics = null;
        this.editorGridRenderKey = '';
        this.selectedMapFrame = 0;
        this.selectedMapPattern = { frames: [0], width: 1, height: 1 };
        this.activeMapLayer = 1;
        this.paletteDragPointerId = null;
        this.paletteDragStart = null;
        this.activeMapPaintPointerId = null;
        this.lastMapPaintCellKey = null;
        this.activeMapErasePointerId = null;
        this.lastMapEraseCellKey = null;
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
        this.axeWhirlwindPointerId = null;
        this.axeWhirlwindPointer = null;
        this.bowChargePointerId = null;
        this.bowChargePointer = null;
        this.bowChargeMoveState = null;
        this.nextBowAimSendAt = 0;
        this.nextHeldAttackAt = 0;
        this.lastEscapeToggleAt = 0;
        this.isQuittingToLobby = false;
        this.cameraZoom = CAMERA_MIN_ZOOM;
        this.showHitboxes = false;
        this.hitboxGraphics = null;
        this.debugRoundInput = null;
        this.debugRoundStatusText = null;
        this.debugRoundInputHandlers = null;
        this.craftingUi = null;
        this.craftingUiObjects = new Set();
        this.craftingStatusText = null;
        this.masterVolume = this.loadMasterVolume();
        this.sfxGroupLastPlayedAt = new Map();
        this.activeSfxStacks = new Map();
        this.axeWhirlwindSoundNextAt = new Map();
        this.suppressServerEventAudioUntil = performance.now() + INITIAL_SERVER_AUDIO_SUPPRESS_MS;
        this.suppressResetEffectsUntil = 0;
        this.isTabActive = this.isDocumentActive();
        this.lastTabActiveAtUnixMs = Date.now();
        this.remoteAttackAudioDirty = !this.isTabActive;
        this.suppressRemoteAttackAudioUntil = this.isTabActive ? 0 : Number.POSITIVE_INFINITY;
        this.handleTabInactive = () => {
            this.isTabActive = false;
            this.remoteAttackAudioDirty = true;
            this.suppressRemoteAttackAudioUntil = Number.POSITIVE_INFINITY;
            this.stopAxeWhirlwind();
        };
        this.handleTabActive = () => {
            this.isTabActive = this.isDocumentActive();
            if (!this.isTabActive) return;

            this.lastTabActiveAtUnixMs = Date.now();
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
        this.handleGlobalMouseUp = (event) => {
            if (event?.button === 0 || (typeof event?.buttons === 'number' && (event.buttons & 1) === 0)) {
                window.setTimeout(() => this.cancelHotbarDrag(), 0);
            }
            if (event?.button === 2 || (typeof event?.buttons === 'number' && (event.buttons & 2) === 0)) {
                this.stopAxeWhirlwind();
            }
        };
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('blur', this.handleTabInactive);
        window.addEventListener('focus', this.handleTabActive);
        window.addEventListener('keydown', this.handleEscapeKey, true);
        window.addEventListener('mouseup', this.handleGlobalMouseUp, true);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            window.removeEventListener('blur', this.handleTabInactive);
            window.removeEventListener('focus', this.handleTabActive);
            window.removeEventListener('keydown', this.handleEscapeKey, true);
            window.removeEventListener('mouseup', this.handleGlobalMouseUp, true);
            this.disableBuildMode();
            this.closeCraftingMenu();
            this.closeEnchantmentMenu();
            this.cancelHotbarDrag();
            this.stopAxeWhirlwind();
            this.stopAllCasterChargeSounds();
            this.destroyDebugRoundControls();
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

        this.waveText = this.add.text(20, 20, 'Wave: 0', {
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

        this.skillPointText = this.add.text(this.scale.width - 20, this.scale.height - 74, '(0 skill points available)', {
            fontFamily: 'Arial Black', fontSize: 18, color: '#ffffff',
            stroke: '#000000', strokeThickness: 5, align: 'right',
        }).setOrigin(1, 1).setDepth(UI_DEPTH).setScrollFactor(0);

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

        const activeMapName = RoomClient.room?.state?.activeMapName || '';
        this.activeMapText = this.add.text(this.centreX, 50, activeMapName ? `Map: ${activeMapName}` : '', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ff6666',
            stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5, 0).setDepth(UI_DEPTH).setScrollFactor(0).setVisible(IS_DEVELOPMENT_BUILD && !!activeMapName);

        this.hitboxToggleButton = this.add.text(
            this.scale.width - 12,
            this.scale.height - 12,
            'DEBUG',
            {
                fontFamily: 'Arial', fontSize: 10, color: '#cccccc',
                stroke: '#000000', strokeThickness: 2, align: 'right',
            },
        ).setOrigin(1)
            .setDepth(UI_DEPTH + 10)
            .setScrollFactor(0)
            .setVisible(false)
            .setInteractive({ useHandCursor: true });
        this.hitboxToggleButton.on('pointerdown', () => this.toggleHitboxes());

        if (IS_DEVELOPMENT_BUILD) {
            this.initDebugRoundControls();
        }

        this.initExperienceBar();
        this.initHudHealthBar();
        this.initHotbar();
        this.initOutfitColorPicker();
        this.initVolumeSlider();
        this.updateSkillPointText();
        this.registerFixedUi(
            this.tutorialText,
            this.waveText,
            this.killsText,
            this.playerCountText,
            this.buffListText,
            this.skillPointText,
            this.gameOverText,
            this.quitButton,
            this.roomCodeText,
            this.activeMapText,
            this.hitboxToggleButton,
            this.debugRoundStatusText,
        );
    }

    initDebugRoundControls() {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '2';
        input.max = String(DEBUG_MAX_ROUND);
        input.step = '1';
        input.placeholder = 'Round';
        input.setAttribute('aria-label', 'Target round');
        input.style.cssText = [
            'width: 62px', 'height: 24px', 'box-sizing: border-box', 'padding: 2px 5px',
            'border: 1px solid #aaaaaa', 'border-radius: 3px', 'background: #181818',
            'color: #ffffff', 'font: 12px Arial', 'text-align: center',
        ].join(';');

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Start';
        button.style.cssText = [
            'height: 24px', 'margin-left: 4px', 'padding: 1px 7px', 'border: 1px solid #aaaaaa',
            'border-radius: 3px', 'background: #333333', 'color: #ffffff', 'font: 12px Arial', 'cursor: pointer',
        ].join(';');

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; align-items:center; visibility:hidden; pointer-events:none;';
        wrapper.append(input, button);
        this.debugRoundInput = this.add.dom(this.scale.width - 92, this.scale.height - 36, wrapper)
            .setOrigin(0.5, 1)
            .setDepth(UI_DEPTH + 10)
            .setScrollFactor(0);

        this.debugRoundStatusText = this.add.text(this.scale.width - 12, this.scale.height - 58, '', {
            fontFamily: 'Arial', fontSize: 11, color: '#ffdddd',
            stroke: '#000000', strokeThickness: 2, align: 'right',
        }).setOrigin(1, 1).setDepth(UI_DEPTH + 10).setScrollFactor(0).setVisible(false);

        const submit = () => this.submitDebugRound(input.value);
        button.addEventListener('click', submit);
        const onKeyDown = (event) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
                event.preventDefault();
                submit();
            }
        };
        input.addEventListener('keydown', onKeyDown);
        this.debugRoundInputHandlers = { input, button, submit, onKeyDown };
    }

    setDebugRoundControlsVisible(visible) {
        if (!IS_DEVELOPMENT_BUILD || !this.debugRoundInput) return;
        this.debugRoundInput.node.style.visibility = visible ? 'visible' : 'hidden';
        this.debugRoundInput.node.style.pointerEvents = visible ? 'auto' : 'none';
        this.debugRoundStatusText?.setVisible(visible && !!this.debugRoundStatusText.text);
    }

    submitDebugRound(rawRound) {
        const round = Number(rawRound);
        const currentRound = Math.max(0, RoomClient.room?.state?.waveNumber || 0);
        if (!Number.isInteger(round) || round < 2 || round > DEBUG_MAX_ROUND) {
            this.setDebugRoundStatus(`Enter a whole round from 2 to ${DEBUG_MAX_ROUND}.`);
            return;
        }
        if (round <= currentRound) {
            this.setDebugRoundStatus(`Round must be later than ${currentRound}.`);
            return;
        }
        this.setDebugRoundStatus(`Starting round ${round}...`, '#ffffaa');
        RoomClient.sendDebugSetRound(round);
    }

    setDebugRoundStatus(message, color = '#ffdddd') {
        if (!this.debugRoundStatusText) return;
        this.debugRoundStatusText.setText(message).setColor(color)
            .setVisible(this.debugRoundInput?.node?.style.visibility === 'visible');
    }

    destroyDebugRoundControls() {
        if (this.debugRoundInputHandlers) {
            const { input, button, submit, onKeyDown } = this.debugRoundInputHandlers;
            button.removeEventListener('click', submit);
            input.removeEventListener('keydown', onKeyDown);
            this.debugRoundInputHandlers = null;
        }
        this.debugRoundInput?.destroy();
        this.debugRoundInput = null;
        this.debugRoundStatusText?.destroy();
        this.debugRoundStatusText = null;
    }

    updateBuffList(player) {
        if (!this.buffListText) return;

        const buffs = PLAYER_BUFFS
            .map(({ field, label }) => ({ label, stacks: Math.max(0, player[field] || 0) }))
            .filter(({ stacks }) => stacks > 0)
            .map(({ label, stacks }) => `${label} x${stacks}`);

        this.buffListText.setText(buffs.length > 0 ? `BUFFS\n${buffs.join('\n')}` : '');
    }

    updateSkillPointText() {
        if (!this.skillPointText) return;
        const points = Math.max(0, this.localPendingUpgradeChoices || 0);
        this.skillPointText.setText(`(${points} skill points available)`);
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
        RoomClient.sendSetOutfitColor(index);
    }

    applyLocalOutfitTint() {
        if (!this.localSessionId) return;
        this.applyPlayerOutfitTint(this.localSessionId, this.outfitColorIndex);
    }

    applyPlayerOutfitTint(sessionId, colorIndex) {
        const sprite = this.playerSprites.get(sessionId);
        if (!sprite) return;

        const tint = OUTFIT_COLOR_BUTTONS[colorIndex]?.tint;
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
        this.cancelHotbarDrag();
        this.hotbarSlots.forEach((slot) => {
            slot.box?.destroy();
            slot.icon?.destroy();
            slot.label?.destroy();
            slot.countLabel?.destroy();
            slot.cooldownOverlay?.destroy();
            slot.activeOverlay?.destroy();
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
                .setScrollFactor(0)
                .setInteractive({ useHandCursor: true });
            box.on('pointerdown', (pointer, _localX, _localY, event) => {
                event?.stopPropagation?.();
                this.beginHotbarDrag(slot, pointer);
            });
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
                if (item === ITEM_WOOD_CALTROPS) icon.setFrame(CALTROPS_FRAME);
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
            const cooldownOverlay = this.add.graphics()
                .setDepth(UI_DEPTH + 7)
                .setScrollFactor(0);
            const activeOverlay = this.add.graphics()
                .setDepth(UI_DEPTH + 8)
                .setScrollFactor(0);

            this.hotbarSlots.push({ box, icon, label, countLabel, cooldownOverlay, activeOverlay, slot });
            this.registerFixedUi(box, icon, label, countLabel, cooldownOverlay, activeOverlay);
        }

        this.updateHotbarSelection();
        this.updateHotbarAxeOverlays();
    }

    beginHotbarDrag(slot, pointer) {
        if (!Number.isInteger(slot) || slot < 1 || slot > HOTBAR_SLOT_COUNT || !pointer?.leftButtonDown?.()) return;
        if (!this.getItemForHotbarSlot(slot)) {
            this.equipHotbarSlot(slot);
            this.selectEnchantmentHotbarSlot(slot);
            return;
        }
        this.hotbarDrag = {
            pointerId: pointer.id,
            fromSlot: slot,
            startX: pointer.x,
            startY: pointer.y,
            hasDragged: false,
            ghost: null,
        };
    }

    updateHotbarDrag(pointer) {
        const drag = this.hotbarDrag;
        if (!drag || drag.pointerId !== pointer.id) return false;
        if (!pointer.leftButtonDown()) return false;

        const dx = pointer.x - drag.startX;
        const dy = pointer.y - drag.startY;
        if (!drag.hasDragged && Math.hypot(dx, dy) < HOTBAR_DRAG_START_DISTANCE) return true;

        if (!drag.hasDragged) {
            drag.hasDragged = true;
            drag.ghost = this.createHotbarDragGhost(drag.fromSlot, pointer.x, pointer.y);
        }
        drag.ghost?.setPosition(pointer.x, pointer.y);
        return true;
    }

    finishHotbarDrag(pointer) {
        const drag = this.hotbarDrag;
        if (!drag || drag.pointerId !== pointer.id) return false;

        if (drag.hasDragged) {
            if (this.tryDropHotbarItemIntoEnchantmentSlot(drag.fromSlot, pointer)) {
                this.cancelHotbarDrag();
                return true;
            }
            const targetSlot = this.getHotbarSlotAt(pointer.x, pointer.y);
            if (targetSlot && targetSlot !== drag.fromSlot) {
                RoomClient.sendSwapHotbarSlots(drag.fromSlot, targetSlot);
            }
        } else {
            this.equipHotbarSlot(drag.fromSlot);
            this.selectEnchantmentHotbarSlot(drag.fromSlot);
        }
        this.cancelHotbarDrag();
        return true;
    }

    cancelHotbarDrag() {
        this.hotbarDrag?.ghost?.destroy(true);
        this.hotbarDrag = null;
    }

    createHotbarDragGhost(slot, x, y) {
        const item = this.getItemForHotbarSlot(slot);
        const count = this.hotbarSlotCounts[slot - 1] || 0;
        const container = this.add.container(x, y)
            .setDepth(UI_DEPTH + 30)
            .setScrollFactor(0)
            .setAlpha(0.86);
        const background = this.add.rectangle(0, 0, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_SIZE, HOTBAR_SLOT_ACTIVE_COLOR, 0.28)
            .setOrigin(0.5)
            .setStrokeStyle(2, HOTBAR_SLOT_ACTIVE_COLOR, 0.8);
        container.add(background);

        const iconKey = this.getHotbarIconKey(item);
        if (iconKey) {
            const icon = this.add.image(0, 2, iconKey).setOrigin(0.5);
            if (item === ITEM_CAMPFIRE) icon.setFrame(CAMPFIRE_ICON_FRAME);
            if (item === ITEM_WOOD_CALTROPS) icon.setFrame(CALTROPS_FRAME);
            icon.setDisplaySize(HOTBAR_ICON_SIZE, HOTBAR_ICON_SIZE);
            container.add(icon);
        }
        if (count > 0) {
            const countLabel = this.add.text(HOTBAR_SLOT_SIZE * 0.5 - 5, HOTBAR_SLOT_SIZE * 0.5 - 15, `${count}`, {
                fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
                stroke: '#000000', strokeThickness: 3,
            }).setOrigin(1, 0.5);
            container.add(countLabel);
        }
        this.registerFixedUi(container, container.list);
        return container;
    }

    getHotbarSlotAt(x, y) {
        const slot = this.hotbarSlots.find(({ box }) => box?.getBounds().contains(x, y));
        return slot?.slot || 0;
    }

    updateHotbarAxeOverlays() {
        const activeProgress = Phaser.Math.Clamp(this.localAxeWhirlwindProgress || 0, 0, 1);
        const cooldownProgress = Phaser.Math.Clamp(this.localAxeWhirlwindCooldownProgress || 0, 0, 1);
        this.hotbarSlots.forEach(({ box, cooldownOverlay, activeOverlay, slot }) => {
            if (!cooldownOverlay) return;
            cooldownOverlay.clear();
            activeOverlay?.clear();
            if (!box || this.getItemForHotbarSlot(slot) !== ITEM_WOOD_AXE) return;

            const x = box.x - HOTBAR_SLOT_SIZE * 0.5;
            const bottomY = box.y + HOTBAR_SLOT_SIZE * 0.5;
            if (cooldownProgress > 0) {
                const height = HOTBAR_SLOT_SIZE * cooldownProgress;
                cooldownOverlay.fillStyle(HOTBAR_COOLDOWN_OVERLAY_COLOR, HOTBAR_COOLDOWN_OVERLAY_ALPHA);
                cooldownOverlay.fillRect(x, bottomY - height, HOTBAR_SLOT_SIZE, height);
            }
            if (activeOverlay && activeProgress > 0) {
                const height = HOTBAR_SLOT_SIZE * activeProgress;
                activeOverlay.fillStyle(HOTBAR_ACTIVE_OVERLAY_COLOR, HOTBAR_ACTIVE_OVERLAY_ALPHA);
                activeOverlay.fillRect(x, bottomY - height, HOTBAR_SLOT_SIZE, height);
            }
        });
    }

    isHotbarGameObject(gameObject) {
        return this.hotbarSlots.some(({ box, icon, label, countLabel, cooldownOverlay, activeOverlay }) => (
            gameObject === box
            || gameObject === icon
            || gameObject === label
            || gameObject === countLabel
            || gameObject === cooldownOverlay
            || gameObject === activeOverlay
        ));
    }

    getHotbarIconKey(item) {
        if (item === ITEM_WOOD_AXE) return ASSETS.image.woodAxeIcon.key;
        if (item === ITEM_WOOD_BOW) return ASSETS.image.woodBowIcon.key;
        if (item === ITEM_HAMMER) return ASSETS.image.hammerIcon.key;
        if (item === ITEM_CAMPFIRE) return ASSETS.spritesheet.campfire.key;
        if (item === ITEM_WOOD_CALTROPS) return ASSETS.spritesheet.topdownTileset.key;
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
        this.updateHotbarAxeOverlays();
        this.validateEnchantmentSelection();
    }

    selectEnchantmentHotbarSlot(slot) {
        if (!this.enchantmentUi) return;
        if (!Number.isInteger(slot) || slot < 1 || slot > HOTBAR_SLOT_COUNT) return;

        const item = this.getItemForHotbarSlot(slot);
        this.enchantmentSelectedItem = item || '';
        this.enchantmentSelectedSlot = item ? slot : 0;
        this.renderEnchantmentUi();
    }

    selectEquippedItemForEnchantment() {
        const slot = this.localActiveSlot || 1;
        const item = this.getItemForHotbarSlot(slot);
        this.enchantmentSelectedItem = item || '';
        this.enchantmentSelectedSlot = item ? slot : 0;
    }

    createInventoryItemIcon(item, x, y, size, depth = UI_DEPTH + 36) {
        const iconKey = this.getHotbarIconKey(item);
        if (!iconKey) return null;
        const icon = this.add.image(x, y, iconKey)
            .setOrigin(0.5)
            .setDisplaySize(size, size)
            .setDepth(depth)
            .setScrollFactor(0);
        if (item === ITEM_CAMPFIRE) icon.setFrame(CAMPFIRE_ICON_FRAME);
        if (item === ITEM_WOOD_CALTROPS) icon.setFrame(CALTROPS_FRAME);
        return icon;
    }

    getInventoryItemDisplayName(item) {
        return ENCHANTMENT_SKILL_TREES[item]?.displayName || {
            [ITEM_CAMPFIRE]: 'Campfire',
            [ITEM_WOOD_CALTROPS]: 'Wood Caltrops',
            [ITEM_WOOD]: 'Wood',
        }[item] || 'Item';
    }

    addEnchantmentUiObject(object) {
        if (!object) return object;
        this.enchantmentUiObjects.add(object);
        this.registerFixedUi(object);
        return object;
    }

    addEnchantmentDynamicObject(object) {
        if (!object) return object;
        this.enchantmentUi?.dynamicObjects?.add(object);
        return this.addEnchantmentUiObject(object);
    }

    clearEnchantmentDynamicObjects() {
        this.enchantmentUi?.dynamicObjects?.forEach((object) => {
            object?.destroy?.();
            this.enchantmentUiObjects.delete(object);
        });
        if (this.enchantmentUi) this.enchantmentUi.dynamicObjects = new Set();
    }

    openEnchantmentMenu() {
        if (this.isMapEditor || !this.gameStarted || !this.getNearbyEnchantmentTable()) return;
        if (this.enchantmentUi) {
            this.selectEquippedItemForEnchantment();
            this.renderEnchantmentUi();
            return;
        }

        this.stopHeldAttack();
        this.cancelBowCharge();
        this.stopAxeWhirlwind();

        const panelWidth = Math.min(CRAFTING_PANEL_WIDTH, Math.max(320, this.scale.width - 48));
        const panelHeight = Math.min(CRAFTING_PANEL_HEIGHT, Math.max(280, this.scale.height - 48));
        const panelX = this.centreX - panelWidth * 0.5;
        const panelY = this.centreY - panelHeight * 0.5;
        const slotSize = 84;
        const slotX = this.centreX;
        const slotY = panelY + panelHeight - 58;
        const slotRect = new Phaser.Geom.Rectangle(slotX - slotSize * 0.5, slotY - slotSize * 0.5, slotSize, slotSize);
        const objects = [];

        const addObject = (object) => {
            objects.push(object);
            this.addEnchantmentUiObject(object);
            return object;
        };

        const panel = addObject(this.add.graphics().setDepth(UI_DEPTH + 30).setScrollFactor(0));
        panel.fillStyle(0x4a4a4a, 0.78);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        panel.lineStyle(2, 0xbcbcbc, 0.78);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        panel.setInteractive(new Phaser.Geom.Rectangle(panelX, panelY, panelWidth, panelHeight), Phaser.Geom.Rectangle.Contains);

        addObject(this.add.text(panelX + CRAFTING_PANEL_PADDING, panelY + 22, 'Enchantment', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 5,
        }).setDepth(UI_DEPTH + 34).setScrollFactor(0));

        const closeButton = addObject(this.add.text(panelX + panelWidth - 28, panelY + 20, 'X', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ff3333',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(UI_DEPTH + 35).setScrollFactor(0).setInteractive({ useHandCursor: true }));
        closeButton.on('pointerdown', (_pointer, _x, _y, event) => {
            event?.stopPropagation();
            this.closeEnchantmentMenu();
        });

        addObject(this.add.rectangle(slotX, slotY, slotSize, slotSize, 0x181818, 0.86)
            .setOrigin(0.5)
            .setDepth(UI_DEPTH + 34)
            .setScrollFactor(0)
            .setStrokeStyle(3, 0xffffff, 0.64)
            .setInteractive({ useHandCursor: true }));

        this.enchantmentUi = {
            objects,
            dynamicObjects: new Set(),
            panel: new Phaser.Geom.Rectangle(panelX, panelY, panelWidth, panelHeight),
            slotRect,
            slotX,
            slotY,
            slotSize,
            treeTopY: panelY + 94,
            treeBottomY: slotY - 96,
        };
        this.selectEquippedItemForEnchantment();
        this.renderEnchantmentUi();
    }

    closeEnchantmentMenu() {
        if (!this.enchantmentUi && this.enchantmentUiObjects.size <= 0) return;
        this.enchantmentSelectedItem = '';
        this.enchantmentSelectedSlot = 0;
        this.clearEnchantmentDynamicObjects();
        this.enchantmentUi?.objects?.forEach((object) => object?.destroy?.());
        this.enchantmentUiObjects.clear();
        this.enchantmentUi = null;
    }

    renderEnchantmentUi() {
        const ui = this.enchantmentUi;
        if (!ui) return;
        this.clearEnchantmentDynamicObjects();

        const points = Math.max(0, this.localPendingUpgradeChoices || 0);
        const item = this.enchantmentSelectedItem;
        const slotX = ui.slotX;
        const slotY = ui.slotY;
        const tree = ENCHANTMENT_SKILL_TREES[item];

        if (item) {
            const icon = this.createInventoryItemIcon(item, slotX, slotY, 54, UI_DEPTH + 36);
            this.addEnchantmentDynamicObject(icon);
            this.addEnchantmentDynamicObject(this.add.text(slotX, slotY + 34, this.getInventoryItemDisplayName(item), {
                fontFamily: 'Arial Black', fontSize: 13, color: '#ffffff',
                stroke: '#000000', strokeThickness: 3,
            }).setOrigin(0.5, 0.5).setDepth(UI_DEPTH + 37).setScrollFactor(0));
        }

        this.addEnchantmentDynamicObject(this.add.text(ui.panel.x + ui.panel.width - CRAFTING_PANEL_PADDING, ui.panel.y + 56, `${points} skill points`, {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(1, 0).setDepth(UI_DEPTH + 34).setScrollFactor(0));

        if (!item) {
            this.addEnchantmentDynamicObject(this.add.text(this.centreX, ui.panel.y + ui.panel.height * 0.45, 'No equipped item selected', {
                fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff',
                stroke: '#000000', strokeThickness: 4, align: 'center',
            }).setOrigin(0.5).setDepth(UI_DEPTH + 34).setScrollFactor(0));
            return;
        }

        if (!tree) {
            this.addEnchantmentDynamicObject(this.add.text(this.centreX, ui.panel.y + ui.panel.height * 0.45, 'No skills for this item', {
                fontFamily: 'Arial Black', fontSize: 22, color: '#cccccc',
                stroke: '#000000', strokeThickness: 4, align: 'center',
            }).setOrigin(0.5).setDepth(UI_DEPTH + 34).setScrollFactor(0));
            return;
        }

        this.addEnchantmentDynamicObject(this.add.text(this.centreX, ui.panel.y + 66, tree.title, {
            fontFamily: 'Arial Black', fontSize: 21, color: '#ffd37a',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(UI_DEPTH + 34).setScrollFactor(0));

        const hasColumns = tree.nodes.some((node) => Number.isInteger(node.column));
        const nodeColumns = hasColumns
            ? [...new Set(tree.nodes.map((node) => Number.isInteger(node.column) ? node.column : 0))].sort((a, b) => a - b)
            : [0];
        const rowCount = hasColumns
            ? Math.max(1, Math.max(...tree.nodes.map((node) => Number.isInteger(node.row) ? node.row : 0)) + 1)
            : tree.nodes.length;
        const columnGap = hasColumns ? 36 : 0;
        const nodeWidth = hasColumns
            ? Math.min(270, (ui.panel.width - CRAFTING_PANEL_PADDING * 4 - columnGap * (nodeColumns.length - 1)) / nodeColumns.length)
            : Math.min(330, ui.panel.width - CRAFTING_PANEL_PADDING * 4);
        const nodeHeight = hasColumns ? 68 : 56;
        const nodeGap = rowCount > 1
            ? Math.min(108, (ui.treeBottomY - ui.treeTopY) / (rowCount - 1))
            : 0;
        const totalNodeWidth = nodeColumns.length * nodeWidth + Math.max(0, nodeColumns.length - 1) * columnGap;
        const startX = this.centreX - totalNodeWidth * 0.5 + nodeWidth * 0.5;
        const columnIndexByValue = nodeColumns.reduce((lookup, column, index) => {
            lookup[column] = index;
            return lookup;
        }, {});
        const positions = tree.nodes.map((node, index) => {
            const column = hasColumns && Number.isInteger(node.column) ? node.column : 0;
            const row = hasColumns && Number.isInteger(node.row) ? node.row : index;
            const columnIndex = columnIndexByValue[column] ?? 0;
            return {
                x: hasColumns ? startX + columnIndex * (nodeWidth + columnGap) : this.centreX,
                y: ui.treeBottomY - row * nodeGap,
            };
        });
        const positionById = tree.nodes.reduce((lookup, node, index) => {
            lookup[node.id] = positions[index];
            return lookup;
        }, {});

        const connector = this.add.graphics().setDepth(UI_DEPTH + 32).setScrollFactor(0);
        connector.lineStyle(4, 0xffffff, 0.35);
        tree.nodes.forEach((node, index) => {
            if (!node.prerequisite) return;
            const from = positionById[node.prerequisite];
            const to = positions[index];
            if (!from || !to) return;
            connector.beginPath();
            connector.moveTo(from.x, from.y - nodeHeight * 0.5);
            connector.lineTo(to.x, to.y + nodeHeight * 0.5);
            connector.strokePath();
        });
        this.addEnchantmentDynamicObject(connector);

        tree.nodes.forEach((node, index) => {
            const position = positions[index];
            const rank = this.getUpgradeRankForNode(node);
            const maxRank = this.getUpgradeMaxRankForNode(node);
            const unlocked = this.isEnchantmentNodeUnlocked(node);
            const capped = maxRank !== null && rank >= maxRank;
            const canSpend = unlocked && points > 0 && !capped;
            const fillColor = unlocked ? 0xf2f2f2 : 0x505050;
            const fillAlpha = unlocked ? 0.92 : 0.52;
            const strokeColor = canSpend ? 0xffd37a : 0xffffff;
            const textColor = unlocked ? '#111111' : '#999999';

            const oval = this.add.ellipse(position.x, position.y, nodeWidth, nodeHeight, fillColor, fillAlpha)
                .setOrigin(0.5)
                .setDepth(UI_DEPTH + 34)
                .setScrollFactor(0)
                .setStrokeStyle(canSpend ? 4 : 2, strokeColor, canSpend ? 0.95 : 0.38);
            this.addEnchantmentDynamicObject(oval);

            this.addEnchantmentDynamicObject(this.add.text(position.x, position.y - 7, node.label, {
                fontFamily: 'Arial Black', fontSize: hasColumns ? 13 : 16, color: textColor,
                align: 'center',
                wordWrap: { width: nodeWidth - 18, useAdvancedWrap: true },
            }).setOrigin(0.5).setDepth(UI_DEPTH + 35).setScrollFactor(0));
            const rankLabel = maxRank !== null ? `Rank: ${rank}/${maxRank}` : `Rank: ${rank}`;
            this.addEnchantmentDynamicObject(this.add.text(position.x, position.y + (hasColumns ? 22 : 15), rankLabel, {
                fontFamily: 'Arial Black', fontSize: 12, color: textColor,
                align: 'center',
            }).setOrigin(0.5).setDepth(UI_DEPTH + 35).setScrollFactor(0));

            if (canSpend) {
                const zone = this.add.zone(position.x, position.y, nodeWidth, nodeHeight)
                    .setOrigin(0.5)
                    .setDepth(UI_DEPTH + 36)
                    .setScrollFactor(0)
                    .setInteractive({ useHandCursor: true });
                zone.on('pointerdown', (_pointer, _x, _y, event) => {
                    event?.stopPropagation?.();
                    this.selectEnchantmentUpgrade(node);
                });
                this.addEnchantmentDynamicObject(zone);
            }
        });
    }

    getUpgradeRankForNode(node) {
        const player = this.localPlayerState || RoomClient.room?.state?.players?.get(this.localSessionId);
        if (!player || !node?.field) return 0;
        return Math.max(0, player[node.field] || 0);
    }

    getUpgradeMaxRankForNode(node) {
        return Number.isFinite(node?.maxRank) ? Math.max(0, Math.floor(node.maxRank)) : null;
    }

    getUpgradeRankById(upgradeId) {
        const node = ENCHANTMENT_NODE_BY_ID[upgradeId];
        return node ? this.getUpgradeRankForNode(node) : 0;
    }

    isEnchantmentNodeUnlocked(node) {
        if (!node?.prerequisite) return true;
        return this.getUpgradeRankById(node.prerequisite) > 0;
    }

    selectEnchantmentUpgrade(node) {
        if (!node || !this.enchantmentSelectedItem || !this.enchantmentSelectedSlot) return;
        if (!this.isEnchantmentNodeUnlocked(node)) return;
        const maxRank = this.getUpgradeMaxRankForNode(node);
        if (maxRank !== null && this.getUpgradeRankForNode(node) >= maxRank) return;
        RoomClient.sendSelectUpgrade(node.id, this.enchantmentSelectedItem, this.enchantmentSelectedSlot);
    }

    tryDropHotbarItemIntoEnchantmentSlot(slot, pointer) {
        const ui = this.enchantmentUi;
        if (!ui || !pointer || !ui.slotRect.contains(pointer.x, pointer.y)) return false;
        const item = this.getItemForHotbarSlot(slot);
        if (!item) return false;
        this.selectEnchantmentHotbarSlot(slot);
        return true;
    }

    validateEnchantmentSelection() {
        if (!this.enchantmentUi) return;
        if (!this.enchantmentSelectedSlot || !this.enchantmentSelectedItem) {
            this.selectEquippedItemForEnchantment();
            this.renderEnchantmentUi();
            return;
        }
        if (this.getItemForHotbarSlot(this.enchantmentSelectedSlot) === this.enchantmentSelectedItem) return;
        this.selectEquippedItemForEnchantment();
        this.renderEnchantmentUi();
    }

    addCraftingUiObject(object) {
        if (!object) return object;
        this.craftingUiObjects.add(object);
        this.registerFixedUi(object);
        return object;
    }

    openCraftingMenu() {
        if (this.isMapEditor || !this.gameStarted || !this.getNearbyWorkbench()) return;
        if (this.craftingUi) {
            this.setCraftingStatus('');
            return;
        }

        this.stopHeldAttack();
        this.cancelBowCharge();
        this.stopAxeWhirlwind();

        const panelWidth = Math.min(CRAFTING_PANEL_WIDTH, Math.max(320, this.scale.width - 48));
        const panelHeight = Math.min(CRAFTING_PANEL_HEIGHT, Math.max(280, this.scale.height - 48));
        const panelX = this.centreX - panelWidth * 0.5;
        const panelY = this.centreY - panelHeight * 0.5;
        const viewport = {
            x: panelX + CRAFTING_PANEL_PADDING,
            y: panelY + 76,
            width: panelWidth - CRAFTING_PANEL_PADDING * 2,
            height: panelHeight - 132,
        };
        const objects = [];
        const rowContainers = [];

        const addObject = (object) => {
            objects.push(object);
            this.addCraftingUiObject(object);
            return object;
        };

        const panel = addObject(this.add.graphics().setDepth(UI_DEPTH + 30).setScrollFactor(0));
        panel.fillStyle(0x4a4a4a, 0.78);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        panel.lineStyle(2, 0xbcbcbc, 0.78);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        panel.setInteractive(new Phaser.Geom.Rectangle(panelX, panelY, panelWidth, panelHeight), Phaser.Geom.Rectangle.Contains);

        addObject(this.add.text(panelX + CRAFTING_PANEL_PADDING, panelY + 22, 'Crafting', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 5,
        }).setDepth(UI_DEPTH + 34).setScrollFactor(0));

        const closeButton = addObject(this.add.text(panelX + panelWidth - 28, panelY + 20, 'X', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ff3333',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(UI_DEPTH + 35).setScrollFactor(0).setInteractive({ useHandCursor: true }));
        closeButton.on('pointerdown', (_pointer, _x, _y, event) => {
            event?.stopPropagation();
            this.closeCraftingMenu();
        });

        const maskGraphics = addObject(this.add.graphics().setDepth(UI_DEPTH + 31).setScrollFactor(0));
        maskGraphics.fillStyle(0xffffff, 1);
        maskGraphics.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
        maskGraphics.setVisible(false);
        const mask = maskGraphics.createGeometryMask();

        CRAFTING_RECIPES.forEach((recipe, index) => {
            const rowY = viewport.y + index * (CRAFTING_ROW_HEIGHT + CRAFTING_ROW_GAP);
            const row = addObject(this.add.container(viewport.x, rowY).setDepth(UI_DEPTH + 32).setScrollFactor(0));
            row.setMask(mask);

            const rowBackground = this.add.rectangle(0, 0, viewport.width, CRAFTING_ROW_HEIGHT, 0x262626, recipe.enabled ? 0.66 : 0.38)
                .setOrigin(0)
                .setStrokeStyle(1, 0xffffff, recipe.enabled ? 0.18 : 0.1);
            row.add(rowBackground);

            let icon;
            if (recipe.icon === 'campfire') {
                icon = this.add.image(48, CRAFTING_ROW_HEIGHT * 0.5, ASSETS.spritesheet.campfire.key, CAMPFIRE_ICON_FRAME)
                    .setDisplaySize(CRAFTING_ICON_SIZE, CRAFTING_ICON_SIZE);
            } else if (recipe.icon === 'caltrops') {
                icon = this.add.image(48, CRAFTING_ROW_HEIGHT * 0.5, ASSETS.spritesheet.topdownTileset.key, CALTROPS_FRAME)
                    .setDisplaySize(CRAFTING_ICON_SIZE, CRAFTING_ICON_SIZE);
            } else {
                icon = this.add.rectangle(48, CRAFTING_ROW_HEIGHT * 0.5, CRAFTING_ICON_SIZE, CRAFTING_ICON_SIZE, 0x1d1d1d, 0.85)
                    .setStrokeStyle(3, 0x050505, 0.9);
                const label = this.add.text(48, CRAFTING_ROW_HEIGHT * 0.5, '?', {
                    fontFamily: 'Arial Black', fontSize: 28, color: '#777777',
                }).setOrigin(0.5);
                row.add(label);
            }
            row.add(icon);
            if (recipe.enabled) {
                icon.setInteractive({ useHandCursor: true });
                this.craftingUiObjects.add(icon);
                icon.on('pointerdown', (_pointer, _x, _y, event) => {
                    event?.stopPropagation();
                    this.setCraftingStatus('Crafting...');
                    RoomClient.sendCraftItem(recipe.id);
                });
            } else {
                icon.setAlpha(0.55);
            }

            const name = this.add.text(104, 22, recipe.name, {
                fontFamily: 'Arial Black', fontSize: 20, color: recipe.enabled ? '#ffffff' : '#aaaaaa',
                stroke: '#000000', strokeThickness: 4,
            });
            const description = this.add.text(104, 52, recipe.description, {
                fontFamily: 'Arial', fontSize: 17, color: recipe.enabled ? '#eeeeee' : '#999999',
            });
            const cost = this.add.text(104, 78, recipe.cost, {
                fontFamily: 'Arial Black', fontSize: 16, color: recipe.enabled ? '#ffd37a' : '#888888',
                stroke: '#000000', strokeThickness: 3,
            });
            row.add([name, description, cost]);
            rowContainers.push(row);
        });

        this.craftingStatusText = addObject(this.add.text(this.centreX, panelY + panelHeight - 28, '', {
            fontFamily: 'Arial Black', fontSize: 15, color: '#ffd37a',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(UI_DEPTH + 34).setScrollFactor(0));

        const contentHeight = CRAFTING_RECIPES.length * CRAFTING_ROW_HEIGHT + Math.max(0, CRAFTING_RECIPES.length - 1) * CRAFTING_ROW_GAP;
        this.craftingUi = {
            objects,
            rowContainers,
            mask,
            viewport,
            scrollY: 0,
            maxScroll: Math.max(0, contentHeight - viewport.height),
            panel: new Phaser.Geom.Rectangle(panelX, panelY, panelWidth, panelHeight),
        };
        this.updateCraftingMenuScroll(0);
    }

    closeCraftingMenu() {
        if (!this.craftingUi && this.craftingUiObjects.size <= 0) return;
        this.craftingUi?.mask?.destroy?.();
        this.craftingUi?.objects?.forEach(object => object?.destroy?.());
        this.craftingUiObjects.clear();
        this.craftingUi = null;
        this.craftingStatusText = null;
    }

    setCraftingStatus(message, color = '#ffd37a') {
        if (!this.craftingStatusText) return;
        this.craftingStatusText.setText(message || '').setColor(color);
    }

    updateCraftingMenuScroll(deltaY) {
        if (!this.craftingUi) return;
        const ui = this.craftingUi;
        ui.scrollY = Phaser.Math.Clamp(ui.scrollY + deltaY, 0, ui.maxScroll);
        ui.rowContainers.forEach((row, index) => {
            const y = ui.viewport.y + index * (CRAFTING_ROW_HEIGHT + CRAFTING_ROW_GAP) - ui.scrollY;
            row.setY(y);
            row.setVisible(y + CRAFTING_ROW_HEIGHT > ui.viewport.y && y < ui.viewport.y + ui.viewport.height);
        });
    }

    handleCraftingWheel(pointer, deltaY) {
        if (!this.craftingUi) return false;
        if (this.craftingUi.panel.contains(pointer.x, pointer.y)) {
            this.updateCraftingMenuScroll(Math.sign(deltaY) * CRAFTING_SCROLL_STEP);
            return true;
        }
        return false;
    }

    handleInteractPressed(event) {
        if (this.craftingUi || this.enchantmentUi) return;
        if (this.getNearbyEnchantmentTable()) {
            event?.preventDefault?.();
            this.openEnchantmentMenu();
            return;
        }
        if (!this.getNearbyWorkbench()) return;
        event?.preventDefault?.();
        this.openCraftingMenu();
    }

    updateCraftingMenuProximity() {
        if (!this.craftingUi) return;
        if (this.isMapEditor || !this.gameStarted || !this.getNearbyWorkbench()) {
            this.closeCraftingMenu();
        }
    }

    updateEnchantmentMenuProximity() {
        if (!this.enchantmentUi) return;
        if (this.isMapEditor || !this.gameStarted || !this.getNearbyEnchantmentTable()) {
            this.closeEnchantmentMenu();
        }
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
        Object.values(ANIMATION.player.axeRunAttack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.axeWhirlwind).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.bow).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.player.die).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodAxeIdle).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodAxeRun).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodAxeAttack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodAxeRunAttack).forEach(animation => this.createAnimation(animation));
        Object.values(ANIMATION.weapon.woodAxeWhirlwind).forEach(animation => this.createAnimation(animation));
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
        if (!this.anims.exists(ENCHANTMENT_TABLE_IDLE_ANIMATION_KEY)) {
            this.anims.create({
                key: ENCHANTMENT_TABLE_IDLE_ANIMATION_KEY,
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.enchantIdle.key, {
                    frames: [0, 1, 2, 3, 4, 5],
                }),
                frameRate: 8,
                repeat: -1,
            });
        }
        if (!this.anims.exists(ENCHANTMENT_TABLE_EFFECT_ANIMATION_KEY)) {
            this.anims.create({
                key: ENCHANTMENT_TABLE_EFFECT_ANIMATION_KEY,
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.enchantEffect.key, {
                    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                }),
                frameRate: 12,
                repeat: 0,
            });
        }
    }

    // ─── Input ────────────────────────────────────────────────────────────────
    initMapEditorUi() {
        this.fixedUiObjects.forEach((object) => {
            if (object === this.roomCodeText) return;
            object?.setVisible(false);
            object?.disableInteractive?.();
        });
        this.setDebugRoundControlsVisible(false);

        const addEditorUi = (object) => {
            object.setScrollFactor(0).setDepth(UI_DEPTH + 20);
            this.registerFixedUi(object);
            this.mapEditorUiObjects.add(object);
            return object;
        };

        const addPaletteUi = (object, offsetX, y) => {
            addEditorUi(object);
            this.mapPaletteLayoutObjects.push({ object, offsetX, y });
            return object;
        };

        addPaletteUi(this.add.rectangle(0, 0, MAP_PALETTE_PANEL_WIDTH, this.scale.height, 0x171717, 0.58).setOrigin(0), 0, 0);
        addPaletteUi(this.add.text(0, 12, 'MAP PALETTE', {
            fontFamily: 'Arial Black', fontSize: 18, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
        }), MAP_PALETTE_MARGIN_X, 12);
        const layer1Button = addPaletteUi(this.add.text(0, 12, 'LAYER 1', {
            fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
            backgroundColor: '#2468a8', padding: { left: 8, right: 8, top: 5, bottom: 5 },
        }).setInteractive({ useHandCursor: true }), 270, 12);
        const layer2Button = addPaletteUi(this.add.text(0, 12, 'LAYER 2', {
            fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
            backgroundColor: '#4b4b4b', padding: { left: 8, right: 8, top: 5, bottom: 5 },
        }).setInteractive({ useHandCursor: true }), 378, 12);
        const layer3Button = addPaletteUi(this.add.text(0, 38, 'LAYER 3', {
            fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
            backgroundColor: '#4b4b4b', padding: { left: 8, right: 8, top: 5, bottom: 5 },
        }).setInteractive({ useHandCursor: true }), 100, 38);
        const enchantToolButton = addPaletteUi(this.add.text(0, 38, 'ENCHANT', {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            backgroundColor: '#4b4b4b', padding: { left: 8, right: 8, top: 4, bottom: 4 },
        }).setInteractive({ useHandCursor: true }), 198, 38);
        const craftingToolButton = addPaletteUi(this.add.text(0, 38, 'CRAFT', {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            backgroundColor: '#4b4b4b', padding: { left: 8, right: 8, top: 4, bottom: 4 },
        }).setInteractive({ useHandCursor: true }), 292, 38);
        this.mapPaletteSideButton = addPaletteUi(this.add.text(0, 38, 'MOVE →', {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            backgroundColor: '#5d5d5d', padding: { left: 8, right: 8, top: 4, bottom: 4 },
        }).setInteractive({ useHandCursor: true }), MAP_PALETTE_MARGIN_X, 38);
        this.mapLayerButtons = [
            { layer: 1, button: layer1Button },
            { layer: 2, button: layer2Button },
            { layer: 3, button: layer3Button },
        ];
        layer1Button.on('pointerdown', () => this.setActiveMapLayer(1));
        layer2Button.on('pointerdown', () => this.setActiveMapLayer(2));
        layer3Button.on('pointerdown', () => this.setActiveMapLayer(3));
        this.mapToolButtons = [
            { tool: 'enchantment', button: enchantToolButton },
            { tool: 'crafting', button: craftingToolButton },
        ];
        enchantToolButton.on('pointerdown', () => this.setActiveMapTool('enchantment'));
        craftingToolButton.on('pointerdown', () => this.setActiveMapTool('crafting'));
        this.mapPaletteSideButton.on('pointerdown', () => this.toggleMapPaletteSide());
        addPaletteUi(this.add.image(0, MAP_PALETTE_Y, ASSETS.image.topdownTilesetPalette.key).setOrigin(0), MAP_PALETTE_MARGIN_X, MAP_PALETTE_Y);

        this.mapPaletteHitArea = addPaletteUi(
            this.add.rectangle(0, MAP_PALETTE_Y, MAP_PALETTE_SIZE, MAP_PALETTE_SIZE, 0xffffff, 0.001)
                .setOrigin(0)
                .setInteractive({ useHandCursor: true }),
            MAP_PALETTE_MARGIN_X,
            MAP_PALETTE_Y,
        );
        this.mapPaletteSelection = addPaletteUi(
            this.add.rectangle(0, 0, MAP_PALETTE_TILE_SIZE, MAP_PALETTE_TILE_SIZE)
                .setOrigin(0)
                .setStrokeStyle(2, 0xffff00, 1),
            MAP_PALETTE_MARGIN_X,
            MAP_PALETTE_Y,
        );
        this.mapEditorStatusText = addPaletteUi(this.add.text(0, MAP_PALETTE_Y + MAP_PALETTE_SIZE + 10, '', {
            fontFamily: 'Arial', fontSize: 14, color: '#d7ffd7',
            wordWrap: { width: MAP_PALETTE_SIZE },
        }), MAP_PALETTE_MARGIN_X, MAP_PALETTE_Y + MAP_PALETTE_SIZE + 10);

        const draftNameInput = document.createElement('input');
        draftNameInput.type = 'text';
        draftNameInput.maxLength = 48;
        draftNameInput.placeholder = 'Map name';
        draftNameInput.value = 'untitled-map';
        draftNameInput.setAttribute('aria-label', 'Saved map name');
        draftNameInput.style.cssText = [
            'width: 400px', 'height: 28px', 'box-sizing: border-box', 'padding: 4px 8px',
            'border: 1px solid #8fbd8f', 'border-radius: 3px', 'background: rgba(15,25,15,0.88)',
            'color: #ffffff', 'font: 14px Arial',
        ].join(';');
        this.mapDraftNameInput = this.add.dom(0, this.scale.height - 108, draftNameInput)
            .setOrigin(0, 0.5)
            .setDepth(UI_DEPTH + 21)
            .setScrollFactor(0);

        const saveButton = addPaletteUi(this.add.text(0, this.scale.height - 78, 'SAVE DRAFT', {
            fontFamily: 'Arial Black', fontSize: 17, color: '#ffffff',
            backgroundColor: '#2468a8', padding: { left: 10, right: 10, top: 7, bottom: 7 },
        }).setInteractive({ useHandCursor: true }), MAP_PALETTE_MARGIN_X, this.scale.height - 78);
        const loadButton = addPaletteUi(this.add.text(0, this.scale.height - 78, 'LOAD MAP', {
            fontFamily: 'Arial Black', fontSize: 17, color: '#ffffff',
            backgroundColor: '#7a4b9e', padding: { left: 10, right: 10, top: 7, bottom: 7 },
        }).setInteractive({ useHandCursor: true }), MAP_PALETTE_MARGIN_X + 150, this.scale.height - 78);
        const importButton = addPaletteUi(this.add.text(0, this.scale.height - 78, 'IMPORT LEGACY', {
            fontFamily: 'Arial Black', fontSize: 13, color: '#ffffff',
            backgroundColor: '#865d25', padding: { left: 8, right: 8, top: 9, bottom: 9 },
        }).setInteractive({ useHandCursor: true }), MAP_PALETTE_MARGIN_X + 290, this.scale.height - 78);
        saveButton.on('pointerdown', () => this.saveMapDraft());
        loadButton.on('pointerdown', () => this.loadMapDraft());
        importButton.on('pointerdown', () => this.importLegacyMapDraft());

        this.updateMapPaletteLayout();
        this.selectMapFrame(0);
        this.setActiveMapLayer(1);
        this.setActiveMapTool('tiles');
    }

    getMapPalettePanelX() {
        if (this.mapPaletteSide === 'right') {
            return Math.max(0, this.scale.width - MAP_PALETTE_PANEL_WIDTH);
        }
        return 0;
    }

    getMapPaletteX() {
        return this.getMapPalettePanelX() + MAP_PALETTE_MARGIN_X;
    }

    updateMapPaletteLayout() {
        const panelX = this.getMapPalettePanelX();
        this.mapPaletteLayoutObjects.forEach(({ object, offsetX, y }) => {
            object?.setPosition(panelX + offsetX, y);
        });
        this.mapDraftNameInput?.setPosition(this.getMapPaletteX(), this.scale.height - 108);
        this.mapPaletteSideButton?.setText(this.mapPaletteSide === 'right' ? '← MOVE' : 'MOVE →');
        this.updateMapPaletteSelectionPosition();
    }

    toggleMapPaletteSide() {
        this.mapPaletteSide = this.mapPaletteSide === 'right' ? 'left' : 'right';
        this.updateMapPaletteLayout();
    }

    setMapEditorStatus(message) {
        this.mapEditorStatusText?.setText(message);
    }

    selectMapFrame(frame) {
        if (!Number.isInteger(frame) || frame < 0 || frame >= MAP_FRAME_COUNT) return;
        this.selectMapPattern(frame % MAP_PALETTE_COLUMNS, Math.floor(frame / MAP_PALETTE_COLUMNS), frame % MAP_PALETTE_COLUMNS, Math.floor(frame / MAP_PALETTE_COLUMNS));
    }

    selectMapPattern(startCol, startRow, endCol, endRow) {
        const minCol = Phaser.Math.Clamp(Math.min(startCol, endCol), 0, MAP_PALETTE_COLUMNS - 1);
        const maxCol = Phaser.Math.Clamp(Math.max(startCol, endCol), 0, MAP_PALETTE_COLUMNS - 1);
        const minRow = Phaser.Math.Clamp(Math.min(startRow, endRow), 0, MAP_PALETTE_COLUMNS - 1);
        const maxRow = Phaser.Math.Clamp(Math.max(startRow, endRow), 0, MAP_PALETTE_COLUMNS - 1);
        const width = maxCol - minCol + 1;
        const height = maxRow - minRow + 1;
        const frames = [];
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                frames.push(row * MAP_PALETTE_COLUMNS + col);
            }
        }
        this.selectedMapFrame = frames[0];
        this.selectedMapPattern = { frames, width, height };
        this.updateMapPaletteSelectionPosition(minCol, minRow);
        this.mapPaletteSelection?.setSize(width * MAP_PALETTE_TILE_SIZE, height * MAP_PALETTE_TILE_SIZE);
        this.mapPaletteSelection?.setDisplaySize(width * MAP_PALETTE_TILE_SIZE, height * MAP_PALETTE_TILE_SIZE);
        this.updateMapEditorStatus();
    }

    updateMapPaletteSelectionPosition(col = null, row = null) {
        const selectedCol = Number.isInteger(col) ? col : this.selectedMapFrame % MAP_PALETTE_COLUMNS;
        const selectedRow = Number.isInteger(row) ? row : Math.floor(this.selectedMapFrame / MAP_PALETTE_COLUMNS);
        this.mapPaletteSelection?.setPosition(
            this.getMapPaletteX() + selectedCol * MAP_PALETTE_TILE_SIZE,
            MAP_PALETTE_Y + selectedRow * MAP_PALETTE_TILE_SIZE,
        );
    }

    setActiveMapLayer(layer) {
        this.activeMapLayer = layer === 3 ? 3 : layer === 2 ? 2 : 1;
        this.activeMapTool = this.activeMapLayer === 3 ? this.activeLayer3Tool : 'tiles';
        this.mapLayerButtons.forEach(({ layer: buttonLayer, button }) => {
            button.setBackgroundColor(buttonLayer === this.activeMapLayer ? '#2468a8' : '#4b4b4b');
        });
        this.mapToolButtons.forEach(({ tool: buttonTool, button }) => {
            button.setBackgroundColor(buttonTool === this.activeMapTool ? '#2468a8' : '#4b4b4b');
        });
        this.updateMapEditorStatus();
    }

    setActiveMapTool(tool) {
        this.activeMapTool = tool === 'crafting' ? 'crafting' : tool === 'enchantment' ? 'enchantment' : 'tiles';
        if (this.activeMapTool === 'crafting' || this.activeMapTool === 'enchantment') {
            this.activeLayer3Tool = this.activeMapTool;
            this.activeMapLayer = 3;
        } else {
            this.activeMapLayer = Math.min(this.activeMapLayer || 1, 2);
        }
        this.mapLayerButtons.forEach(({ layer: buttonLayer, button }) => {
            button.setBackgroundColor(buttonLayer === this.activeMapLayer ? '#2468a8' : '#4b4b4b');
        });
        this.mapToolButtons.forEach(({ tool: buttonTool, button }) => {
            button.setBackgroundColor(buttonTool === this.activeMapTool ? '#2468a8' : '#4b4b4b');
        });
        this.updateMapEditorStatus();
    }

    updateMapEditorStatus() {
        if (this.activeMapTool === 'enchantment') {
            this.setMapEditorStatus('Layer 3 · Enchantment table tool. Left-click places a 1x2 row object; right-click removes one.');
            return;
        }
        if (this.activeMapTool === 'crafting') {
            this.setMapEditorStatus('Layer 3 · Crafting table tool. Left-click places a 1x2 row workbench; right-click removes one.');
            return;
        }

        const { width, height } = this.selectedMapPattern;
        this.setMapEditorStatus(
            'Layer ' + this.activeMapLayer + ' · ' + width + '×' + height
            + ' pattern. Drag on palette to select; drag on map to stamp. Middle-click picks; right-click drag removes.',
        );
    }

    getPaletteCellFromPointer(pointer) {
        const col = Math.floor((pointer.x - this.getMapPaletteX()) / MAP_PALETTE_TILE_SIZE);
        const row = Math.floor((pointer.y - MAP_PALETTE_Y) / MAP_PALETTE_TILE_SIZE);
        if (col < 0 || row < 0 || col >= MAP_PALETTE_COLUMNS || row >= MAP_PALETTE_COLUMNS) return null;
        return { col, row };
    }

    getMapCellFromPointer(pointer) {
        const worldPoint = this.getPointerWorldPoint(pointer);
        if (!worldPoint) return null;
        const mapWidth = this.getMapEditorBoundaryWidth();
        const mapHeight = this.getMapEditorBoundaryHeight();
        if (worldPoint.x < 0 || worldPoint.y < 0 || worldPoint.x >= mapWidth || worldPoint.y >= mapHeight) return null;
        const col = Math.floor(worldPoint.x / MAP_TILE_SIZE);
        const row = Math.floor(worldPoint.y / MAP_TILE_SIZE);
        return { col, row };
    }

    getMapEditorBoundaryWidth() {
        return this.isMapEditor ? Math.min(this.worldWidth, DEFAULT_WORLD_WIDTH) : this.worldWidth;
    }

    getMapEditorBoundaryHeight() {
        return this.isMapEditor ? Math.min(this.worldHeight, DEFAULT_WORLD_HEIGHT) : this.worldHeight;
    }

    isMapCellInsideEditorBoundary(col, row) {
        return col >= 0 && row >= 0
            && col < this.getMapEditorBoundaryWidth() / MAP_TILE_SIZE
            && row < this.getMapEditorBoundaryHeight() / MAP_TILE_SIZE;
    }

    stampMapPattern(col, row) {
        this.markMapDirty();
        if (this.activeMapTool === 'enchantment') {
            if (!this.isMapCellInsideEditorBoundary(col + 1, row)) return;
            RoomClient.sendPlaceEnchantmentTable(col, row);
            return;
        }
        if (this.activeMapTool === 'crafting') {
            if (!this.isMapCellInsideEditorBoundary(col + 1, row)) return;
            RoomClient.sendPlaceCraftingTable(col, row);
            return;
        }

        const { frames, width, height } = this.selectedMapPattern;
        for (let patternRow = 0; patternRow < height; patternRow++) {
            for (let patternCol = 0; patternCol < width; patternCol++) {
                if (!this.isMapCellInsideEditorBoundary(col + patternCol, row + patternRow)) continue;
                const frame = frames[patternRow * width + patternCol];
                RoomClient.sendPlaceMapTile(col + patternCol, row + patternRow, frame, this.activeMapLayer);
            }
        }
    }

    eraseMapTile(col, row) {
        this.markMapDirty();
        if (this.activeMapTool === 'enchantment' || this.activeMapTool === 'crafting') {
            RoomClient.sendRemoveEnchantmentTable(col, row);
            RoomClient.sendRemoveCraftingTable(col, row);
            return;
        }

        RoomClient.sendRemoveMapTile(col, row, this.activeMapLayer);
    }

    markMapDirty() {
        if (this.mapDirty) return;
        this.mapDirty = true;
        this.setMapEditorStatus('Unsaved changes. Click SAVE DRAFT to write this map to the server.');
    }

    pickMapTile(col, row) {
        const chunkCol = Math.floor(col / MAP_CHUNK_SIZE);
        const chunkRow = Math.floor(row / MAP_CHUNK_SIZE);
        const chunk = this.mapEditorChunks.get(chunkCol + ':' + chunkRow);
        if (!chunk) {
            this.setMapEditorStatus('No tile to pick on the active layer.');
            return;
        }
        const layerData = this.activeMapLayer === 2 ? chunk.layer2 : chunk.layer1;
        const values = this.decodeMapChunk(layerData);
        const tileValue = values?.[(row % MAP_CHUNK_SIZE) * MAP_CHUNK_SIZE + (col % MAP_CHUNK_SIZE)] || 0;
        if (tileValue === 0) {
            this.setMapEditorStatus('No tile to pick on the active layer.');
            return;
        }
        this.selectMapFrame(tileValue - 1);
        this.setMapEditorStatus('Picked tile from Layer ' + this.activeMapLayer + '. Left-click to place it.');
    }

    getMapDrafts() {
        try {
            const drafts = JSON.parse(window.localStorage.getItem(MAP_DRAFT_STORAGE_KEY) || '{}');
            return drafts && typeof drafts === 'object' ? drafts : {};
        } catch (_error) {
            return {};
        }
    }

    saveMapDraft() {
        const draftName = String(this.mapDraftNameInput?.node?.value || '').trim().slice(0, 48);
        if (!draftName) {
            this.setMapEditorStatus('Enter a map name, then click SAVE DRAFT.');
            return;
        }
        const normalizedName = draftName.toLowerCase().replace(/\s+/g, '-');
        const overwrite = this.serverMapNames.has(normalizedName);
        if (overwrite && !window.confirm('Overwrite saved map "' + normalizedName + '"?')) {
            this.setMapEditorStatus('Save cancelled.');
            return;
        }
        if (!RoomClient.sendSaveMap(draftName, overwrite)) {
            this.setMapEditorStatus('No server connection. Map was not saved.');
            return;
        }
        this.setMapEditorStatus('Saving map "' + normalizedName + '"…');
    }

    loadMapDraft() {
        const name = String(this.mapDraftNameInput?.node?.value || '').trim();
        if (!name) {
            this.setMapEditorStatus('Enter a saved map name to load.');
            return;
        }
        if (this.mapDirty && !window.confirm('Load a saved map and discard unsaved editor changes?')) return;
        if (!RoomClient.sendLoadMap(name)) {
            this.setMapEditorStatus('No server connection. Map was not loaded.');
            return;
        }
        this.setMapEditorStatus('Loading saved map "' + name + '"…');
    }

    importLegacyMapDraft() {
        const drafts = this.getMapDrafts();
        const names = Object.keys(drafts);
        if (names.length === 0) {
            this.setMapEditorStatus('No local map drafts have been saved yet.');
            return;
        }
        const name = String(this.mapDraftNameInput?.node?.value || '').trim();
        if (!drafts[name]) {
            this.setMapEditorStatus('Draft not found. Saved drafts: ' + names.join(', '));
            return;
        }
        const draft = drafts[name];
        if (
            draft?.version !== MAP_DRAFT_VERSION
            || !this.isMapDraftBoundsCompatible(draft)
            || !Array.isArray(draft.chunks)
        ) {
            this.setMapEditorStatus('That draft is not compatible with this editor map.');
            return;
        }
        const validationError = this.validateMapDraftChunks(draft.chunks);
        if (validationError) {
            this.setMapEditorStatus(validationError);
            return;
        }
        if (!RoomClient.sendReplaceMap(draft.chunks)) {
            this.setMapEditorStatus('This draft is too large to send and was not loaded.');
            return;
        }
        
        this.setMapEditorStatus('Loading draft "' + name + '"…');
    }

    isMapDraftBoundsCompatible(draft) {
        return (draft.width === this.worldWidth && draft.height === this.worldHeight)
            || (draft.width === BASE_WORLD_WIDTH && draft.height === BASE_WORLD_HEIGHT)
            || (draft.width === LEGACY_EDITOR_WORLD_WIDTH && draft.height === LEGACY_EDITOR_WORLD_HEIGHT);
    }

    validateMapDraftChunks(chunks) {
        const maxChunkCols = Math.ceil(this.worldWidth / (MAP_TILE_SIZE * MAP_CHUNK_SIZE));
        const maxChunkRows = Math.ceil(this.worldHeight / (MAP_TILE_SIZE * MAP_CHUNK_SIZE));
        const maxChunkCount = maxChunkCols * maxChunkRows;
        if (chunks.length > maxChunkCount) {
            return 'This draft has too many map chunks and was not loaded.';
        }

        const keys = new Set();
        let tileCount = 0;
        for (const chunk of chunks) {
            if (!chunk || typeof chunk.key !== 'string' || typeof chunk.layer1 !== 'string' || typeof chunk.layer2 !== 'string') {
                return 'This draft has invalid map chunk data and was not loaded.';
            }
            const position = this.getMapChunkPosition(chunk.key);
            if (
                !position
                || position.col >= maxChunkCols
                || position.row >= maxChunkRows
                || keys.has(chunk.key)
                || chunk.layer1.length !== MAP_CHUNK_ENCODED_LENGTH
                || chunk.layer2.length !== MAP_CHUNK_ENCODED_LENGTH
            ) {
                return 'This draft has invalid map chunk data and was not loaded.';
            }
            keys.add(chunk.key);

            const layer1 = this.decodeMapChunk(chunk.layer1);
            const layer2 = this.decodeMapChunk(chunk.layer2);
            if (!layer1 || !layer2) {
                return 'This draft has invalid map chunk data and was not loaded.';
            }
            for (const value of layer1) tileCount += value === 0 ? 0 : 1;
            for (const value of layer2) tileCount += value === 0 ? 0 : 1;
            if (tileCount > MAP_MAX_FILLED_CELLS) {
                return 'This draft contains too many tiles and was not loaded.';
            }
        }

        return null;
    }

    getMapChunkPosition(key) {
        const match = /^(\d+):(\d+)$/.exec(key || '');
        if (!match) return null;
        return { col: Number(match[1]), row: Number(match[2]) };
    }

    decodeMapChunk(data) {
        try {
            const decoded = window.atob(data);
            if (decoded.length !== MAP_CHUNK_CELL_COUNT * 2) return null;
            const values = new Uint16Array(MAP_CHUNK_CELL_COUNT);
            for (let index = 0; index < MAP_CHUNK_CELL_COUNT; index++) {
                values[index] = decoded.charCodeAt(index * 2) | (decoded.charCodeAt(index * 2 + 1) << 8);
                if (values[index] > MAP_FRAME_COUNT) return null;
            }
            return values;
        } catch (_error) {
            return null;
        }
    }

    cacheMapChunk(key, layer1Data, layer2Data) {
        const position = this.getMapChunkPosition(key);
        const layer1 = this.decodeMapChunk(layer1Data);
        const layer2 = this.decodeMapChunk(layer2Data);
        if (!position || !layer1 || !layer2) {
            this.mapTileCache.delete(key);
            return;
        }
        this.mapTileCache.set(key, { ...position, layer1, layer2 });
    }

    getMapTileValue(col, row, layer = 1) {
        if (col < 0 || row < 0 || col >= this.worldWidth / MAP_TILE_SIZE || row >= this.worldHeight / MAP_TILE_SIZE) return 0;
        const chunkCol = Math.floor(col / MAP_CHUNK_SIZE);
        const chunkRow = Math.floor(row / MAP_CHUNK_SIZE);
        const chunk = this.mapTileCache.get(chunkCol + ':' + chunkRow);
        if (!chunk) return 0;
        const localCol = col % MAP_CHUNK_SIZE;
        const localRow = row % MAP_CHUNK_SIZE;
        const values = layer === 2 ? chunk.layer2 : chunk.layer1;
        return values[localRow * MAP_CHUNK_SIZE + localCol] || 0;
    }

    isSolidMapFrame(frame) {
        if (!Number.isInteger(frame)) return false;
        const col = frame % MAP_PALETTE_COLUMNS;
        const row = Math.floor(frame / MAP_PALETTE_COLUMNS);
        const isCastle = col >= 0 && col < 6 && row >= 0 && row < 3;
        const isWater = col >= 8 && col < 14 && row >= 7 && row < 10;
        const isTree = col >= 11 && col < 14 && row >= 11 && row < 14;
        return isCastle
            || isWater
            || isTree
            || frame === WORKBENCH_LEFT_FRAME
            || frame === WORKBENCH_RIGHT_FRAME;
    }

    getMapTileCollider(col, row, frame) {
        const topHalfCollider = CASTLE_PARTIAL_SUPPORT_FRAMES.has(frame);
        const narrowCollider = topHalfCollider || CASTLE_LOWER_PARTIAL_SUPPORT_FRAMES.has(frame);
        return {
            x: col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5,
            y: row * MAP_TILE_SIZE + (topHalfCollider ? MAP_TILE_SIZE * 0.25 : MAP_TILE_SIZE * 0.5),
            halfWidth: MAP_TILE_SIZE * (narrowCollider ? 0.25 : 0.5),
            halfHeight: MAP_TILE_SIZE * (topHalfCollider ? 0.25 : 0.5),
        };
    }

    isWorkbenchLeftCell(col, row, layer = 1) {
        return this.getMapTileValue(col, row, layer) === WORKBENCH_LEFT_FRAME + 1
            && this.getMapTileValue(col + 1, row, layer) === WORKBENCH_RIGHT_FRAME + 1;
    }

    getNearbyWorkbench() {
        if (this.isMapEditor || !this.localSessionId) return null;
        const player = this.localPlayerState || RoomClient.room?.state?.players?.get(this.localSessionId);
        if (!player || player.isDead) return null;

        const footX = player.x;
        const footY = player.y + PLAYER_FOOT_Y_OFFSET;
        const searchRadius = WORKBENCH_INTERACT_RANGE + MAP_TILE_SIZE;
        const startCol = Math.floor((footX - searchRadius) / MAP_TILE_SIZE);
        const endCol = Math.floor((footX + searchRadius) / MAP_TILE_SIZE);
        const startRow = Math.floor((footY - searchRadius) / MAP_TILE_SIZE);
        const endRow = Math.floor((footY + searchRadius) / MAP_TILE_SIZE);
        const rangeSq = WORKBENCH_INTERACT_RANGE * WORKBENCH_INTERACT_RANGE;

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                for (const layer of [1, 2]) {
                    if (!this.isWorkbenchLeftCell(col, row, layer)) continue;
                    const centerX = col * MAP_TILE_SIZE + MAP_TILE_SIZE;
                    const centerY = row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5;
                    const dx = footX - centerX;
                    const dy = footY - centerY;
                    if (dx * dx + dy * dy <= rangeSq) return { col, row, layer, x: centerX, y: centerY };
                }
            }
        }

        for (const [id, entry] of this.craftingTableSprites) {
            const table = entry.table;
            const dx = footX - table.x;
            const dy = footY - table.y;
            if (dx * dx + dy * dy <= rangeSq) {
                return { id, col: table.col, row: table.row, layer: 3, x: table.x, y: table.y };
            }
        }

        return null;
    }

    getNearbyEnchantmentTable() {
        if (this.isMapEditor || !this.localSessionId) return null;
        const player = this.localPlayerState || RoomClient.room?.state?.players?.get(this.localSessionId);
        if (!player || player.isDead) return null;

        const footX = player.x;
        const footY = player.y + PLAYER_FOOT_Y_OFFSET;
        const rangeSq = WORKBENCH_INTERACT_RANGE * WORKBENCH_INTERACT_RANGE;

        for (const [id, entry] of this.enchantmentTableSprites) {
            const table = entry.table;
            const dx = footX - table.x;
            const dy = footY - table.y;
            if (dx * dx + dy * dy <= rangeSq) {
                return { id, col: table.col, row: table.row, layer: 3, x: table.x, y: table.y };
            }
        }

        return null;
    }

    renderMapEditorChunk(key, data, layer) {
        const position = this.getMapChunkPosition(key);
        const values = this.decodeMapChunk(data);
        if (!position || !values) return;
        const baseCol = position.col * MAP_CHUNK_SIZE;
        const baseRow = position.row * MAP_CHUNK_SIZE;
        for (let localRow = 0; localRow < MAP_CHUNK_SIZE; localRow++) {
            for (let localCol = 0; localCol < MAP_CHUNK_SIZE; localCol++) {
                const col = baseCol + localCol;
                const row = baseRow + localRow;
                if (col >= this.worldWidth / MAP_TILE_SIZE || row >= this.worldHeight / MAP_TILE_SIZE) continue;
                const value = values[localRow * MAP_CHUNK_SIZE + localCol];
                const cellKey = layer + ':' + col + ':' + row;
                const existingSprite = this.mapEditorTileSprites.get(cellKey);
                if (value === 0) {
                    existingSprite?.destroy();
                    this.mapEditorTileSprites.delete(cellKey);
                } else {
                    const frame = value - 1;
                    if (existingSprite) {
                        existingSprite.setFrame(frame);
                    } else {
                        const sprite = this.add.image(
                            col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5,
                            row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5,
                            ASSETS.spritesheet.topdownTileset.key,
                            frame,
                        ).setDisplaySize(MAP_TILE_SIZE, MAP_TILE_SIZE).setDepth(-96 + layer);
                        this.registerWorldObject(sprite);
                        this.mapEditorTileSprites.set(cellKey, sprite);
                    }
                }
            }
        }
    }

    clearMapEditorChunk(key) {
        const position = this.getMapChunkPosition(key);
        if (!position) return;
        const baseCol = position.col * MAP_CHUNK_SIZE;
        const baseRow = position.row * MAP_CHUNK_SIZE;
        for (let localRow = 0; localRow < MAP_CHUNK_SIZE; localRow++) {
            for (let localCol = 0; localCol < MAP_CHUNK_SIZE; localCol++) {
                for (const layer of [1, 2]) {
                    const cellKey = layer + ':' + (baseCol + localCol) + ':' + (baseRow + localRow);
                    this.mapEditorTileSprites.get(cellKey)?.destroy();
                    this.mapEditorTileSprites.delete(cellKey);
                }
            }
        }
    }

    initInput() {
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
            interact: Phaser.Input.Keyboard.KeyCodes.F,
            dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
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
        this.keys.interact.on('down', (_key, event) => {
            this.handleInteractPressed(event);
        });
        this.keys.dash.on('down', (_key, event) => {
            event?.preventDefault?.();
            RoomClient.sendDash();
        });
        for (let slot = 1; slot <= HOTBAR_SLOT_COUNT; slot++) {
            this.keys[`slot${slot}`].on('down', () => this.equipHotbarSlot(slot));
        }
        this.input.keyboard.on('keydown-ESC', (event) => {
            this.handleEscapeQuit(event);
        });

        this.input.on('pointerdown', (pointer, gameObjects = []) => {
            if (this.isMapEditor) {
                if (
                    gameObjects.includes(this.quitButton)
                    || gameObjects.includes(this.hitboxToggleButton)
                    || gameObjects.some(gameObject => this.isHotbarGameObject(gameObject))
                ) {
                    return;
                }
                if (gameObjects.includes(this.mapPaletteHitArea)) {
                    if (pointer.leftButtonDown()) {
                        const cell = this.getPaletteCellFromPointer(pointer);
                        if (cell) {
                            this.paletteDragPointerId = pointer.id;
                            this.paletteDragStart = cell;
                            this.selectMapPattern(cell.col, cell.row, cell.col, cell.row);
                        }
                    }
                    return;
                }
                if (gameObjects.some(gameObject => this.mapEditorUiObjects.has(gameObject))) return;
                const cell = this.getMapCellFromPointer(pointer);
                if (!cell) return;
                if (pointer.leftButtonDown()) {
                    this.activeMapPaintPointerId = pointer.id;
                    this.lastMapPaintCellKey = cell.col + ':' + cell.row;
                    this.stampMapPattern(cell.col, cell.row);
                } else if (pointer.rightButtonDown()) {
                    this.activeMapErasePointerId = pointer.id;
                    this.lastMapEraseCellKey = cell.col + ':' + cell.row;
                    this.eraseMapTile(cell.col, cell.row);
                } else if (pointer.middleButtonDown()) {
                    this.pickMapTile(cell.col, cell.row);
                }
                return;
            }
            if (
                gameObjects.includes(this.hitboxToggleButton)
                || gameObjects.includes(this.quitButton)
                || gameObjects.some(gameObject => this.isHotbarGameObject(gameObject))
                || gameObjects.some(gameObject => this.craftingUiObjects.has(gameObject))
                || gameObjects.some(gameObject => this.enchantmentUiObjects.has(gameObject))
                || gameObjects.some(gameObject => this.outfitColorButtonObjects.has(gameObject))
            ) {
                return;
            }
            if (this.isBuildModeActive) {
                this.handleBuildModePointerDown(pointer);
                return;
            }

            if (pointer.leftButtonDown()) {
                const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
                if (animationState?.axeWhirlwind) this.stopAxeWhirlwind();
                if (this.getLocalActiveItem() === ITEM_WOOD_BOW) {
                    this.startBowCharge(pointer);
                } else {
                    this.startHeldAttack(pointer);
                }
                return;
            }

            if (pointer.rightButtonDown()) {
                const activeItem = this.getLocalActiveItem();
                if (activeItem === ITEM_WOOD_AXE) {
                    this.startAxeWhirlwind(pointer);
                    return;
                }
                if (activeItem === ITEM_WOOD_BOW) {
                    this.cancelBowCharge();
                    return;
                }
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.updateHotbarDrag(pointer)) return;
            if (this.isMapEditor) {
                if (this.paletteDragPointerId === pointer.id && pointer.leftButtonDown()) {
                    const cell = this.getPaletteCellFromPointer(pointer);
                    if (cell && this.paletteDragStart) {
                        this.selectMapPattern(this.paletteDragStart.col, this.paletteDragStart.row, cell.col, cell.row);
                    }
                    return;
                }
                if (this.activeMapPaintPointerId === pointer.id && pointer.leftButtonDown()) {
                    const cell = this.getMapCellFromPointer(pointer);
                    if (!cell) return;
                    const cellKey = cell.col + ':' + cell.row;
                    if (cellKey !== this.lastMapPaintCellKey) {
                        this.lastMapPaintCellKey = cellKey;
                        this.stampMapPattern(cell.col, cell.row);
                    }
                }
                if (this.activeMapErasePointerId === pointer.id && pointer.rightButtonDown()) {
                    const cell = this.getMapCellFromPointer(pointer);
                    if (!cell) return;
                    const cellKey = cell.col + ':' + cell.row;
                    if (cellKey !== this.lastMapEraseCellKey) {
                        this.lastMapEraseCellKey = cellKey;
                        this.eraseMapTile(cell.col, cell.row);
                    }
                }
                return;
            }
            if (this.isBuildModeActive) {
                this.updateBuildPreview(pointer);
                this.handleBuildModePointerDrag(pointer);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (this.finishHotbarDrag(pointer)) return;
            if (this.isMapEditor) {
                if (this.paletteDragPointerId === pointer.id) {
                    this.paletteDragPointerId = null;
                    this.paletteDragStart = null;
                }
                if (this.activeMapPaintPointerId === pointer.id) {
                    this.activeMapPaintPointerId = null;
                    this.lastMapPaintCellKey = null;
                }
                if (this.activeMapErasePointerId === pointer.id) {
                    this.activeMapErasePointerId = null;
                    this.lastMapEraseCellKey = null;
                }
                return;
            }
            if (this.activeBuildPointerId === pointer.id) {
                this.activeBuildPointerId = null;
                this.activeBuildPointer = null;
                this.activeBuildButton = null;
                this.lastBuildDragCellId = null;
            }
            if (this.attackHeldPointerId === pointer.id) {
                this.stopHeldAttack();
            }
            if (this.axeWhirlwindPointerId === pointer.id && !this.isRightMouseButtonDown(pointer)) {
                this.stopAxeWhirlwind();
            }
        });

        this.input.on('wheel', (_pointer, _gameObjects, _deltaX, deltaY) => {
            if (this.handleCraftingWheel(_pointer, deltaY)) return;
            this.handleCameraWheel(deltaY);
        });
    }

    // ─── Networking ───────────────────────────────────────────────────────────
    equipHotbarSlot(slot) {
        if (!Number.isInteger(slot) || slot < 1 || slot > HOTBAR_SLOT_COUNT) return;
        this.localActiveSlot = slot;
        this.updateHotbarSelection();
        this.selectEnchantmentHotbarSlot(slot);
        RoomClient.sendEquipSlot(slot);

        const sessionId = this.localSessionId;
        const animationState = sessionId ? this.playerAnimationState.get(sessionId) : null;
        if (!animationState) return;

        const nextItem = this.getItemForHotbarSlot(slot);
        if (animationState.activeItem === ITEM_WOOD_BOW && nextItem !== ITEM_WOOD_BOW) {
            this.cancelBowCharge();
            this.clearBowPresentationState(sessionId, { updateAnimation: false });
        }
        if (animationState.activeItem === ITEM_WOOD_AXE && nextItem !== ITEM_WOOD_AXE) {
            this.stopAxeWhirlwind();
            this.clearAxeWhirlwindPresentationState(sessionId, { updateAnimation: false });
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
        const shouldBuild = item === ITEM_HAMMER || item === ITEM_CAMPFIRE || item === ITEM_WOOD_CALTROPS;
        if (this.isBuildModeActive === shouldBuild && this.buildPreviewKind === item) return;

        this.isBuildModeActive = shouldBuild;
        if (this.isBuildModeActive) {
            this.stopHeldAttack();
            this.cancelBowCharge();
            this.stopAxeWhirlwind();
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

        const addMapChunk = (chunk, key) => {
            if (!key || !chunk) return;
            const render = () => {
                if (typeof chunk.layer1 !== 'string' || typeof chunk.layer2 !== 'string') return;
                this.mapEditorChunks.set(key, { layer1: chunk.layer1, layer2: chunk.layer2 });
                this.cacheMapChunk(key, chunk.layer1, chunk.layer2);
                this.renderMapEditorChunk(key, chunk.layer1, 1);
                this.renderMapEditorChunk(key, chunk.layer2, 2);
            };
            chunk.onChange(render);
            render();
        };
        state.mapChunks.onAdd(addMapChunk);
        state.mapChunks.forEach(addMapChunk);
        state.mapChunks.onRemove((_chunk, key) => {
            if (!key) return;
            this.mapEditorChunks.delete(key);
            this.mapTileCache.delete(key);
            this.clearMapEditorChunk(key);
        });

        if (this.isMapEditor) {
            room.onMessage('mapList', (event) => {
                const names = Array.isArray(event?.names) ? event.names.filter((name) => typeof name === 'string') : [];
                this.serverMapNames = new Set(names);
                this.setMapEditorStatus(names.length > 0 ? `Saved maps: ${names.join(', ')}` : 'No saved maps yet.');
            });
            room.onMessage('mapSaveConflict', (event) => {
                const name = typeof event?.name === 'string' ? event.name : '';
                if (!name) return;
                if (window.confirm(`Overwrite saved map "${name}"?`)) {
                    RoomClient.sendSaveMap(name, true);
                    this.setMapEditorStatus(`Saving map "${name}"…`);
                } else {
                    this.setMapEditorStatus('Save cancelled.');
                }
            });
            room.onMessage('mapSaved', (event) => {
                const name = typeof event?.name === 'string' ? event.name : 'map';
                this.mapDirty = false;
                if (this.mapDraftNameInput?.node) this.mapDraftNameInput.node.value = name;
                this.setMapEditorStatus(`Saved map "${name}" to the server.`);
            });
            room.onMessage('mapLoaded', (event) => {
                const name = typeof event?.name === 'string' ? event.name : 'map';
                const trimmed = !!event?.trimmed;
                this.mapDirty = trimmed;
                if (this.mapDraftNameInput?.node) this.mapDraftNameInput.node.value = name;
                this.setMapEditorStatus(trimmed
                    ? `Loaded map "${name}" and removed tiles outside the red boundary. Save to update it.`
                    : `Loaded map "${name}".`);
            });
            room.onMessage('mapImported', (event) => {
                if (!event?.accepted) {
                    this.setMapEditorStatus('Legacy draft was rejected.');
                    return;
                }
                this.mapDirty = true;
                this.setMapEditorStatus('Legacy draft imported. Click SAVE DRAFT to store it on the server.');
            });
            room.onMessage('mapStorageError', (event) => {
                this.setMapEditorStatus(event?.message || 'Map storage failed.');
            });
            RoomClient.sendListMaps();
        }

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

        room.onMessage('craftResult', (result) => {
            if (!this.craftingUi) return;
            if (result?.accepted) {
                this.closeCraftingMenu();
            } else {
                this.setCraftingStatus(result?.reason || 'Crafting failed.', '#ff9d9d');
            }
        });

        room.onMessage('itemCrafted', () => {
            const anvilHit = Math.random() < 0.5 ? ASSETS.audio.anvilHit1 : ASSETS.audio.anvilHit2;
            this.playSfx(anvilHit.key, ANVIL_HIT_SOUND_VOLUME, { serverEvent: true });
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

        if (IS_DEVELOPMENT_BUILD) {
            room.onMessage('debugRoundResult', (result) => {
                if (result?.accepted) {
                    this.setDebugRoundStatus(`Started round ${result.round}.`, '#aaffaa');
                } else {
                    this.setDebugRoundStatus(result?.reason || 'Could not start that round.');
                }
            });
        }

        room.onMessage('enemyWaveStarted', (event) => {
            const startedAtUnixMs = Number(event?.startedAtUnixMs);
            const eventAgeMs = Date.now() - startedAtUnixMs;
            if (!this.isDocumentActive()
                || !Number.isFinite(startedAtUnixMs)
                || startedAtUnixMs < this.lastTabActiveAtUnixMs
                || eventAgeMs < 0
                || eventAgeMs > ENEMY_WAVE_HORN_MAX_EVENT_AGE_MS) return;
            this.playSfx(ASSETS.audio.enemyWaveHorn.key, ENEMY_WAVE_HORN_SOUND_VOLUME, {
                serverEvent: true,
            });
        });

        room.onMessage('levelReset', () => {
            this.suppressLevelResetEffects();
            this.closeEnchantmentMenu();
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

            this.playerSprites.set(playerSessionId, sprite);
            this.playerWeaponSprites.set(playerSessionId, weaponSprite);
            this.applyPlayerOutfitTint(playerSessionId, player.outfitColor);
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
            const playerDashCooldownFill = this.add.graphics()
                .setDepth(PLAYER_DASH_COOLDOWN_BAR_DEPTH)
                .setVisible(false);
            this.playerDashCooldownBars.set(playerSessionId, {
                fill: playerDashCooldownFill,
                player,
            });
            this.registerWorldObject(playerDashCooldownFill);
            const playerReviveBackground = this.add.graphics().setDepth(PLAYER_REVIVE_BAR_DEPTH);
            const playerReviveFill = this.add.graphics().setDepth(PLAYER_REVIVE_BAR_DEPTH + 1);
            this.playerReviveBars.set(playerSessionId, {
                background: playerReviveBackground,
                fill: playerReviveFill,
                player,
            });
            this.registerWorldObject(playerReviveBackground, playerReviveFill);
            const nameLabel = this.add.text(player.x, player.y + PLAYER_NAME_LABEL_Y_OFFSET, player.displayName || 'PLAYER', {
                fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
                stroke: '#000000', strokeThickness: 4, align: 'center',
            }).setOrigin(0.5).setDepth(PLAYER_NAME_LABEL_DEPTH);
            this.registerWorldObject(nameLabel);
            this.playerNameLabels.set(playerSessionId, { label: nameLabel, player });
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
                axeAttackHitboxActive: !!player.axeAttackHitboxActive,
                dashing: !!player.dashing,
                dashCooldownProgress: player.dashCooldownProgress || 0,
                axeWhirlwind: !!player.axeWhirlwind,
                axeWhirlwindProgress: player.axeWhirlwindProgress || 0,
                axeWhirlwindCooldownProgress: player.axeWhirlwindCooldownProgress || 0,
                lastAxeWhirlwindHitSeq: player.axeWhirlwindHitSeq || 0,
                axeWhirlwindHitboxUntil: 0,
                axeWhirlwindAoeUpgrades: player.axeWhirlwindAoeUpgrades || 0,
                lastBowChargeSeq: player.bowChargeSeq || 0,
                bowCharging: !!player.bowCharging,
                bowChargeProgress: player.bowChargeProgress || 0,
                bowFullyCharged: false,
                bowAnimationPaused: false,
                axeSwingSpeedUpgrades: player.axeSwingSpeedUpgrades || 0,
                lastMovedAt: 0,
                x: player.x,
                y: player.y,
                visualTargetX: player.x,
                visualTargetY: player.y + PLAYER_VISUAL_Y_OFFSET,
            });
            this.setPlayerAnimation(playerSessionId, false, DEFAULT_PLAYER_DIRECTION);
            this.updatePlayerWeaponIdleFrame(playerSessionId, DEFAULT_PLAYER_DIRECTION);
            if (player.axeWhirlwind) {
                this.playPlayerAxeWhirlwindAnimation(playerSessionId, player.facingDirection || DEFAULT_PLAYER_DIRECTION);
            }

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
                    if (this.enchantmentUi) this.selectEquippedItemForEnchantment();
                    this.renderEnchantmentUi();
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
                if (animationState.axeWhirlwind && animationState.activeItem !== ITEM_WOOD_AXE) {
                    if (isLocal) this.stopAxeWhirlwind();
                    this.clearAxeWhirlwindPresentationState(playerSessionId, { updateAnimation: false });
                }
                if (isLocal) {
                    this.syncBuildModeForActiveItem(animationState.activeItem);
                    if (this.enchantmentUi) {
                        this.selectEquippedItemForEnchantment();
                        this.renderEnchantmentUi();
                    }
                }
                if (!animationState.attacking && !animationState.dead) {
                    this.updatePlayerWeaponIdleFrame(playerSessionId, animationState.direction || DEFAULT_PLAYER_DIRECTION);
                }
            });

            player.listen('attackItem', (item) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.attackItem = item || ITEM_WOOD_AXE;
            });

            player.listen('axeAttackHitboxActive', (active) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.axeAttackHitboxActive = !!active;
            });

            player.listen('dashing', (dashing) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.dashing = !!dashing;
            });

            player.listen('dashCooldownProgress', (progress) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.dashCooldownProgress = Phaser.Math.Clamp(progress || 0, 0, 1);
                this.updatePlayerDashCooldownBar(playerSessionId);
            });

            player.listen('axeWhirlwind', (active) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState) return;
                animationState.axeWhirlwind = !!active;
                if (!active) {
                    if (isLocal) {
                        this.axeWhirlwindPointerId = null;
                        this.axeWhirlwindPointer = null;
                    }
                    this.axeWhirlwindSoundNextAt.delete(playerSessionId);
                    this.clearAxeWhirlwindPresentationState(playerSessionId, { updateAnimation: true });
                    return;
                }
                animationState.attackItem = ITEM_WOOD_AXE;
                if (!this.axeWhirlwindSoundNextAt.has(playerSessionId)) {
                    this.axeWhirlwindSoundNextAt.set(playerSessionId, 0);
                    this.playPlayerAxeWhirlwindAnimation(playerSessionId, animationState.direction || player.facingDirection || DEFAULT_PLAYER_DIRECTION);
                }
            });

            player.listen('axeWhirlwindHitSeq', () => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState || player.axeWhirlwindHitSeq <= animationState.lastAxeWhirlwindHitSeq) return;
                animationState.lastAxeWhirlwindHitSeq = player.axeWhirlwindHitSeq;
                animationState.axeWhirlwindHitboxUntil = this.time.now + PLAYER_AXE_WHIRLWIND_HITBOX_DEBUG_MS;
            });

            player.listen('axeWhirlwindProgress', (progress) => {
                const normalizedProgress = Phaser.Math.Clamp(progress || 0, 0, 1);
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.axeWhirlwindProgress = normalizedProgress;
                if (isLocal) {
                    this.localAxeWhirlwindProgress = normalizedProgress;
                    this.updateHotbarAxeOverlays();
                }
            });

            player.listen('axeWhirlwindCooldownProgress', (progress) => {
                const normalizedProgress = Phaser.Math.Clamp(progress || 0, 0, 1);
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.axeWhirlwindCooldownProgress = normalizedProgress;
                if (isLocal) {
                    this.localAxeWhirlwindCooldownProgress = normalizedProgress;
                    this.updateHotbarAxeOverlays();
                }
            });

            player.listen('bowCharging', (charging) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (!animationState) return;
                animationState.bowCharging = !!charging;
                if (!charging) {
                    const repeatBowChargePointer = isLocal && this.bowChargePointer?.leftButtonDown?.()
                        ? this.bowChargePointer
                        : null;
                    if (isLocal) {
                        this.bowChargePointerId = null;
                        this.bowChargePointer = null;
                        this.nextBowAimSendAt = 0;
                    }
                    this.updatePlayerBowChargeBar(playerSessionId);
                    this.clearBowPresentationState(playerSessionId, { updateAnimation: true });
                    if (repeatBowChargePointer) this.startBowCharge(repeatBowChargePointer);
                    return;
                }
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

            player.listen('displayName', () => {
                this.updatePlayerNameLabel(playerSessionId);
            });

            player.listen('outfitColor', (colorIndex) => {
                this.applyPlayerOutfitTint(playerSessionId, colorIndex);
                if (!isLocal || !OUTFIT_COLOR_BUTTONS[colorIndex]) return;
                this.outfitColorIndex = colorIndex;
                this.outfitColorButtons.forEach(({ selection, index }) => {
                    selection?.setVisible(index === colorIndex);
                });
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
                if (animationState.attackItem === ITEM_WOOD_BOW) {
                    if (this.shouldPlayAttackAudio(playerSessionId)) {
                        this.playSfx(ASSETS.audio.arrowLaunch.key, PUNCH_SOUND_VOLUME, {
                            spatial: !this.isLocalSession(playerSessionId),
                            worldX: player.x,
                            worldY: player.y,
                        });
                    }
                    this.clearBowPresentationState(playerSessionId, { updateAnimation: true });
                    return;
                }
                this.playPlayerAttackAnimation(playerSessionId, player.attackDirection, {
                    playAudio: this.shouldPlayAttackAudio(playerSessionId),
                    restart: animationState.attackItem !== ITEM_WOOD_BOW,
                });
            });

            player.listen('axeSwingSpeedUpgrades', (stacks) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.axeSwingSpeedUpgrades = stacks || 0;
            });
            player.listen('axeWhirlwindAoeUpgrades', (stacks) => {
                const animationState = this.playerAnimationState.get(playerSessionId);
                if (animationState) animationState.axeWhirlwindAoeUpgrades = stacks || 0;
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
                this.localAxeWhirlwindProgress = Phaser.Math.Clamp(player.axeWhirlwindProgress || 0, 0, 1);
                this.localAxeWhirlwindCooldownProgress = Phaser.Math.Clamp(player.axeWhirlwindCooldownProgress || 0, 0, 1);
                this.syncLocalHotbarFromPlayer(player);
                this.updateHotbarSelection();
                this.syncBuildModeForActiveItem(player.activeItem || '');
                this.updateSkillPointText();
                this.renderEnchantmentUi();
                this.updateBuffList(player);

                PLAYER_BUFFS.forEach(({ field }) => {
                    player.listen(field, () => {
                        this.updateBuffList(player);
                        this.renderEnchantmentUi();
                    });
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
                    this.updateSkillPointText();
                    this.renderEnchantmentUi();
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
            const dashCooldownBar = this.playerDashCooldownBars.get(sessionId);
            if (dashCooldownBar) dashCooldownBar.fill.destroy();
            const reviveBar = this.playerReviveBars.get(sessionId);
            if (reviveBar) {
                reviveBar.background.destroy();
                reviveBar.fill.destroy();
            }
            const nameLabel = this.playerNameLabels.get(sessionId);
            if (nameLabel) nameLabel.label.destroy();
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
                this.updateSkillPointText();
                this.closeEnchantmentMenu();
                this.buffListText?.setText('');
                this.updateExperienceBar(0, 5, 1);
                this.updateHudHealthBar(PLAYER_MAX_HEALTH);
            }
            this.playerSprites.delete(sessionId);
            this.playerWeaponSprites.delete(sessionId);
            this.playerAnimationState.delete(sessionId);
            this.axeWhirlwindSoundNextAt.delete(sessionId);
            this.playerHealthBars.delete(sessionId);
            this.playerBowChargeBars.delete(sessionId);
            this.playerDashCooldownBars.delete(sessionId);
            this.playerReviveBars.delete(sessionId);
            this.playerNameLabels.delete(sessionId);
            this.playerLevelLabels.delete(sessionId);
            this.offscreenPlayerIndicators.delete(sessionId);
            this.playerCountText.setText(`Players: ${state.players.size}`);
        });

        const addTree = (tree, id) => {
            const treeId = id || tree.id;
            if (!treeId || this.treeSprites.has(treeId)) return;

            if (tree.variant === TREE_VARIANT_TOPDOWN_3X3) {
                const sprites = [];
                for (let row = 0; row < TOPDOWN_TREE_TILE_SPAN; row++) {
                    for (let col = 0; col < TOPDOWN_TREE_TILE_SPAN; col++) {
                        const frame = (TOPDOWN_TREE_FRAME_ROW + row) * MAP_PALETTE_COLUMNS + TOPDOWN_TREE_FRAME_COL + col;
                        const sprite = this.add.image(
                            tree.x + (col - 1) * MAP_TILE_SIZE,
                            tree.y - (TOPDOWN_TREE_TILE_SPAN - row - 0.5) * MAP_TILE_SIZE,
                            ASSETS.spritesheet.topdownTileset.key,
                            frame,
                        )
                            .setOrigin(0.5)
                            .setDisplaySize(MAP_TILE_SIZE, MAP_TILE_SIZE)
                            .setDepth(row === TOPDOWN_TREE_TILE_SPAN - 1 ? 90 : 110);
                        sprites.push(sprite);
                    }
                }
                this.registerWorldObject(sprites);
                this.treeSprites.set(treeId, { sprites, tree });
                return;
            }

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
            if (sprites.sprites) {
                sprites.sprites.forEach((sprite) => sprite.destroy());
            } else {
                sprites.bottom.destroy();
                sprites.top.destroy();
            }
            this.treeSprites.delete(id);
            if (!this.isSuppressingResetEffects() && this.shouldPlayWorldEventAudio()) {
                this.playSfx(ASSETS.audio.treeFall.key, TREE_FALL_SOUND_VOLUME, {
                    serverEvent: true,
                    spatial: true,
                    worldX: sprites.tree?.x ?? sprites.bottom?.x,
                    worldY: sprites.tree?.y ?? sprites.bottom?.y,
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
                .setDepth(LOG_DEPTH));
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

        const addCaltrops = (caltrops, id) => {
            const caltropsId = id || caltrops.id;
            if (!caltropsId || this.caltropSprites.has(caltropsId)) return;

            const sprite = this.add.image(caltrops.x, caltrops.y, ASSETS.spritesheet.topdownTileset.key, CALTROPS_FRAME)
                .setOrigin(0.5)
                .setDisplaySize(CALTROPS_DISPLAY_SIZE, CALTROPS_DISPLAY_SIZE)
                .setDepth(CALTROPS_DEPTH);
            this.registerWorldObject(sprite);
            this.caltropSprites.set(caltropsId, { sprite, caltrops });

            caltrops.onChange(() => {
                const entry = this.caltropSprites.get(caltropsId);
                if (!entry) return;
                entry.sprite.setPosition(caltrops.x, caltrops.y);
            });
        };

        state.caltrops?.onAdd(addCaltrops);
        state.caltrops?.forEach(addCaltrops);

        state.caltrops?.onRemove((_caltrops, id) => {
            const entry = this.caltropSprites.get(id);
            if (!entry) return;
            entry.sprite.destroy();
            this.caltropSprites.delete(id);
        });

        const addEnchantmentTable = (table, id) => {
            const tableId = id || table.id;
            if (!tableId || this.enchantmentTableSprites.has(tableId)) return;

            const sprite = this.add.sprite(table.x, table.y + ENCHANTMENT_TABLE_VISUAL_Y_OFFSET, ASSETS.spritesheet.enchantIdle.key, ENCHANTMENT_TABLE_FRAME)
                .setOrigin(0.5)
                .setDisplaySize(ENCHANTMENT_TABLE_DISPLAY_SIZE, ENCHANTMENT_TABLE_DISPLAY_SIZE)
                .setDepth(ENCHANTMENT_TABLE_DEPTH);
            sprite.play(ENCHANTMENT_TABLE_IDLE_ANIMATION_KEY);
            this.registerWorldObject(sprite);
            this.enchantmentTableSprites.set(tableId, { sprite, table });

            table.onChange(() => {
                const entry = this.enchantmentTableSprites.get(tableId);
                if (!entry) return;
                entry.sprite.setPosition(table.x, table.y + ENCHANTMENT_TABLE_VISUAL_Y_OFFSET);
            });
        };

        state.enchantmentTables?.onAdd(addEnchantmentTable);
        state.enchantmentTables?.forEach(addEnchantmentTable);

        state.enchantmentTables?.onRemove((_table, id) => {
            const entry = this.enchantmentTableSprites.get(id);
            if (!entry) return;
            entry.sprite.destroy();
            this.enchantmentTableSprites.delete(id);
        });

        const addCraftingTable = (table, id) => {
            const tableId = id || table.id;
            if (!tableId || this.craftingTableSprites.has(tableId)) return;

            const sprite = this.add.sprite(table.x, table.y + CRAFTING_TABLE_VISUAL_Y_OFFSET, ASSETS.spritesheet.craftingTable.key, CRAFTING_TABLE_FRAME)
                .setOrigin(0.5)
                .setDisplaySize(CRAFTING_TABLE_DISPLAY_SIZE, CRAFTING_TABLE_DISPLAY_SIZE)
                .setDepth(CRAFTING_TABLE_DEPTH);
            this.registerWorldObject(sprite);
            this.craftingTableSprites.set(tableId, { sprite, table });

            table.onChange(() => {
                const entry = this.craftingTableSprites.get(tableId);
                if (!entry) return;
                entry.sprite.setPosition(table.x, table.y + CRAFTING_TABLE_VISUAL_Y_OFFSET);
            });
        };

        state.craftingTables?.onAdd(addCraftingTable);
        state.craftingTables?.forEach(addCraftingTable);

        state.craftingTables?.onRemove((_table, id) => {
            const entry = this.craftingTableSprites.get(id);
            if (!entry) return;
            entry.sprite.destroy();
            this.craftingTableSprites.delete(id);
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
            this.updateEnemyHealthBar(enemyId, enemy);
            if (enemy.action === 'charge') {
                this.startCasterChargeSound(enemyId);
                this.showCasterChargeEffect(enemyId);
            }

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
                this.updateCasterChargeEffect(enemyId);
                this.setEnemyAnimation(enemyId, enemy.action || 'run', enemy.facingDirection || 'S');
            });

            enemy.listen('action', (action) => {
                const animationState = this.enemyAnimationState.get(enemyId);
                this.setEnemyAnimation(enemyId, action || 'run', enemy.facingDirection || animationState?.direction || 'S');
                if (action === 'charge') {
                    this.startCasterChargeSound(enemyId);
                    this.showCasterChargeEffect(enemyId);
                } else {
                    this.hideCasterChargeEffect(enemyId);
                    if (action !== 'attack') this.stopCasterChargeSound(enemyId);
                }
            });

            enemy.listen('facingDirection', (direction) => {
                const animationState = this.enemyAnimationState.get(enemyId);
                this.setEnemyAnimation(enemyId, animationState?.action || enemy.action || 'run', direction || animationState?.direction || 'S');
            });

            enemy.listen('health', () => {
                this.updateEnemyHealthBar(enemyId, enemy);
            });

            enemy.listen('attackSeq', () => {
                const animationState = this.enemyAnimationState.get(enemyId);
                if (!animationState || enemy.attackSeq <= animationState.lastAttackSeq) return;

                animationState.lastAttackSeq = enemy.attackSeq;
                if (enemy.attackSeq <= 0) return;
                this.stopCasterChargeSound(enemyId);
                this.hideCasterChargeEffect(enemyId);
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
                    this.destroyEnemyHealthBar(enemyId);
                    this.stopCasterChargeSound(enemyId);
                    this.hideCasterChargeEffect(enemyId);
                    this.playEnemyDeathAnimation(enemyId, enemy.facingDirection || 'S');
                }
            });

            if (enemy.isDead) {
                this.stopCasterChargeSound(enemyId);
                this.hideCasterChargeEffect(enemyId);
                this.playEnemyDeathAnimation(enemyId, enemy.facingDirection || 'S');
            }
        };

        state.enemies.onAdd(addEnemy);
        state.enemies.forEach(addEnemy);

        state.enemies.onRemove((_enemy, id) => {
            const s = this.enemySprites.get(id);
            const animationState = this.enemyAnimationState.get(id);
            this.destroyEnemyHealthBar(id);
            if (s) {
                if (!animationState?.dead && !this.isSuppressingResetEffects()) this.addExplosion(s.x, s.y);
                s.destroy();
            }
            this.stopCasterChargeSound(id);
            this.hideCasterChargeEffect(id);
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
            this.playerBulletSprites.set(bulletId, { sprite, bullet });

            bullet.onChange(() => {
                const s = this.playerBulletSprites.get(bulletId)?.sprite;
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
            const s = this.playerBulletSprites.get(id)?.sprite;
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
            this.enemyBulletSprites.set(bulletId, { sprite, bullet });

            bullet.onChange(() => {
                const s = this.enemyBulletSprites.get(bulletId)?.sprite;
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
            const s = this.enemyBulletSprites.get(id)?.sprite;
            if (s) s.destroy();
            this.enemyBulletSprites.delete(id);
        });

        // ── Root state listeners ─────────────────────────────────────────────
        this.updateWaveText(state.waveNumber || 0);
        state.listen('waveNumber', (waveNumber) => {
            this.updateWaveText(waveNumber || 0);
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
                this.closeCraftingMenu();
                this.closeEnchantmentMenu();
                this.updateGameOverCountdown(state.gameOverCountdown || 10);
                this.gameOverText.setVisible(true);
                this.quitButton
                    .setPosition(this.centreX, this.centreY + 118)
                    .setVisible(true);
                this.hitboxToggleButton.setVisible(false);
                this.setDebugRoundControlsVisible(false);
            } else {
                this.gameStarted = true;
                this.suppressLevelResetEffects();
                this.gameOverText.setVisible(false);
                this.quitButton.setVisible(false);
                this.hitboxToggleButton.setVisible(false);
                this.setDebugRoundControlsVisible(false);
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

    updateWaveText(waveNumber) {
        if (!this.waveText) return;
        const safeWaveNumber = Math.max(0, Math.floor(waveNumber || 0));
        this.waveText.setText(`Wave: ${safeWaveNumber}`);
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
        this.hitboxToggleButton.setVisible(false);
        this.setDebugRoundControlsVisible(false);
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
        const shouldShowQuitScreen = !this.quitButton.visible;
        this.quitButton
            .setPosition(this.centreX, this.centreY)
            .setVisible(shouldShowQuitScreen);
        if (shouldShowQuitScreen) {
            this.quitButton.setInteractive({ useHandCursor: true });
        } else {
            this.quitButton.disableInteractive();
        }
        this.hitboxToggleButton.setVisible(IS_DEVELOPMENT_BUILD && shouldShowQuitScreen);
        if (IS_DEVELOPMENT_BUILD && shouldShowQuitScreen) {
            this.hitboxToggleButton.setInteractive({ useHandCursor: true });
        } else {
            this.hitboxToggleButton.disableInteractive();
        }
        this.setDebugRoundControlsVisible(shouldShowQuitScreen);
    }

    // Flat world background
    initWorldBackground() {
        const hasSavedGameMap = !this.isMapEditor && !!RoomClient.room?.state?.activeMapName;
        const backgroundColor = this.isMapEditor || hasSavedGameMap ? EDITOR_WORLD_BACKGROUND_COLOR : WORLD_BACKGROUND_COLOR;
        this.localCamera.setBackgroundColor(this.isMapEditor || hasSavedGameMap ? EDITOR_WORLD_BACKGROUND_CSS : WORLD_BACKGROUND_CSS);
        this.worldBackground = this.add.rectangle(0, 0, this.worldWidth, this.worldHeight, backgroundColor)
            .setOrigin(0)
            .setDepth(-100);
        this.registerWorldObject(this.worldBackground);
        if (this.isMapEditor) {
            this.createMapEditorTileRenderer();
            this.createEditorGrid();
            this.createEditorBoundary();
        } else if (!hasSavedGameMap) {
            this.createGrassNoiseLayer();
        }
        this.localCamera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        if (!this.isMapEditor) this.createBuildGrid();
    }

    createMapEditorTileRenderer() {
        this.mapEditorTileSprites.clear();
    }

    createEditorGrid() {
        this.editorGridGraphics?.destroy();
        this.editorGridGraphics = this.add.graphics().setDepth(-90);
        this.registerWorldObject(this.editorGridGraphics);
        this.editorGridRenderKey = '';
        this.updateEditorGrid(true);
    }

    createEditorBoundary() {
        this.editorBoundaryGraphics?.destroy();
        const boundary = this.add.graphics().setDepth(-85);
        boundary.lineStyle(5, 0xff3030, 0.95);
        boundary.strokeRect(0, 0, this.getMapEditorBoundaryWidth(), this.getMapEditorBoundaryHeight());
        this.registerWorldObject(boundary);
        this.editorBoundaryGraphics = boundary;
    }

    updateEditorGrid(force = false) {
        if (!this.isMapEditor || !this.editorGridGraphics) return;
        const camera = this.localCamera;
        const view = camera.worldView;
        const startCol = Math.max(0, Math.floor(view.x / MAP_TILE_SIZE));
        const endCol = Math.min(Math.ceil(this.worldWidth / MAP_TILE_SIZE), Math.ceil((view.x + view.width) / MAP_TILE_SIZE));
        const startRow = Math.max(0, Math.floor(view.y / MAP_TILE_SIZE));
        const endRow = Math.min(Math.ceil(this.worldHeight / MAP_TILE_SIZE), Math.ceil((view.y + view.height) / MAP_TILE_SIZE));
        const renderKey = `${startCol}:${endCol}:${startRow}:${endRow}:${camera.zoom}`;
        if (!force && renderKey === this.editorGridRenderKey) return;
        this.editorGridRenderKey = renderKey;

        const grid = this.editorGridGraphics;
        grid.clear();
        grid.lineStyle(1, BUILD_GRID_LINE_COLOR, 0.34);
        const x1 = startCol * MAP_TILE_SIZE;
        const x2 = endCol * MAP_TILE_SIZE;
        const y1 = startRow * MAP_TILE_SIZE;
        const y2 = endRow * MAP_TILE_SIZE;
        for (let col = startCol; col <= endCol; col++) this.drawDottedLine(grid, col * MAP_TILE_SIZE, y1, col * MAP_TILE_SIZE, y2);
        for (let row = startRow; row <= endRow; row++) this.drawDottedLine(grid, x1, row * MAP_TILE_SIZE, x2, row * MAP_TILE_SIZE);
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
        } else if (item === ITEM_WOOD_CALTROPS) {
            this.buildPreview = this.add.image(0, 0, ASSETS.spritesheet.topdownTileset.key, CALTROPS_FRAME)
                .setOrigin(0.5)
                .setDisplaySize(CALTROPS_DISPLAY_SIZE, CALTROPS_DISPLAY_SIZE)
                .setAlpha(0.65)
                .setDepth(CALTROPS_DEPTH)
                .setVisible(false);
        } else {
            this.buildPreview = this.add.rectangle(0, 0, BUILD_GRID_SIZE, BUILD_GRID_SIZE, BUILD_PREVIEW_FILL_COLOR, 0.28)
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
        if (now - this.lastBuildDragSentAt < BUILD_DRAG_SEND_INTERVAL_MS) return;
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
        if (!force && cell.id === this.lastBuildDragCellId) return;

        this.lastBuildDragCellId = cell.id;
        this.lastBuildDragSentAt = this.time.now;

        if (button === 0 && activeItem === ITEM_CAMPFIRE) {
            RoomClient.sendPlaceCampfire(cell.x, cell.y);
        } else if (button === 0 && activeItem === ITEM_WOOD_CALTROPS) {
            RoomClient.sendPlaceCaltrops(cell.x, cell.y);
        } else if (button === 2 && activeItem === ITEM_HAMMER) {
            RoomClient.sendRemoveDeployable(cell.x, cell.y);
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
            this.hitboxToggleButton.setColor(this.showHitboxes ? '#ffaaaa' : '#cccccc');
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

        this.drawMapSolidHitboxes(g);
        this.drawPlayerHitboxes(g);
        this.drawPlayerBulletHitboxes(g);
        this.drawEnemyBulletHitboxes(g);
        this.drawEnemyHitboxes(g);
        this.drawTreeHitboxes(g);
        this.drawCampfireHitboxes(g);
        this.drawCaltropsHitboxes(g);
    }

    drawMapSolidHitboxes(graphics) {
        if (!this.mapTileCache || this.mapTileCache.size <= 0) return;

        graphics.lineStyle(1, 0x55ccff, 0.72);
        this.mapTileCache.forEach((chunk) => {
            for (let localRow = 0; localRow < MAP_CHUNK_SIZE; localRow++) {
                for (let localCol = 0; localCol < MAP_CHUNK_SIZE; localCol++) {
                    const index = localRow * MAP_CHUNK_SIZE + localCol;
                    const col = chunk.col * MAP_CHUNK_SIZE + localCol;
                    const row = chunk.row * MAP_CHUNK_SIZE + localRow;
                    for (const value of [chunk.layer1[index] || 0, chunk.layer2[index] || 0]) {
                        if (value <= 0) continue;
                        const frame = value - 1;
                        if (!this.isSolidMapFrame(frame)) continue;
                        const collider = this.getMapTileCollider(col, row, frame);
                        graphics.strokeRect(
                            collider.x - collider.halfWidth,
                            collider.y - collider.halfHeight,
                            collider.halfWidth * 2,
                            collider.halfHeight * 2,
                        );
                    }
                }
            }
        });
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

            if (animationState?.axeAttackHitboxActive) {
                this.drawPlayerAttackHitbox(graphics, x, y, animationState);
            }
            if ((animationState?.axeWhirlwindHitboxUntil || 0) > this.time.now) {
                this.drawPlayerAxeWhirlwindHitbox(graphics, x, y, animationState);
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
            const hitbox = this.getTreeHitbox(tree);
            graphics.lineStyle(2, 0x7dff62, 0.95);
            graphics.strokeCircle(hitbox.x, hitbox.y, hitbox.radius);
        });
    }

    getTreeHitbox(tree) {
        if (tree?.variant === TREE_VARIANT_TOPDOWN_3X3) {
            return {
                x: tree.x,
                y: tree.y - (MAP_TILE_SIZE * TOPDOWN_TREE_TILE_SPAN * 0.5),
                radius: TOPDOWN_TREE_HITBOX_RADIUS,
            };
        }

        return {
            x: tree.x,
            y: tree.y + TREE_TRUNK_Y_OFFSET,
            radius: LEGACY_TREE_HITBOX_RADIUS,
        };
    }

    drawCampfireHitboxes(graphics) {
        this.campfireSprites.forEach(({ campfire }) => {
            graphics.lineStyle(2, 0xffb23a, 0.9);
            graphics.strokeCircle(campfire.x, campfire.y, CAMPFIRE_HEAL_RADIUS);
        });
    }

    drawCaltropsHitboxes(graphics) {
        this.caltropSprites.forEach(({ caltrops }) => {
            graphics.lineStyle(2, 0xb87944, 0.9);
            graphics.strokeCircle(caltrops.x, caltrops.y, CALTROPS_SLOW_RADIUS);
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

    drawPlayerAxeWhirlwindHitbox(graphics, x, y, animationState) {
        const rank = Phaser.Math.Clamp(Math.floor(animationState?.axeWhirlwindAoeUpgrades || 0), 0, ENCHANTMENT_MAX_RANK);
        const radius = PLAYER_AXE_WHIRLWIND_HIT_RADIUS * (1 + 0.25 * rank);
        graphics.lineStyle(2, 0x66ffff, 0.95);
        graphics.strokeCircle(x, y, radius);
    }

    drawPlayerBulletHitboxes(graphics) {
        this.playerBulletSprites.forEach(({ sprite, bullet }) => {
            if (!sprite?.visible || bullet?.kind !== 'arrow') return;
            graphics.lineStyle(2, 0x8bdcff, 0.95);
            this.strokeRotatedRect(
                graphics,
                sprite.x,
                sprite.y,
                PLAYER_BULLET_HITBOX_HW,
                PLAYER_BULLET_HITBOX_HH,
                (bullet.angle || sprite.rotation || 0) + ARROW_HITBOX_ROTATION_OFFSET,
            );
        });
    }

    drawEnemyBulletHitboxes(graphics) {
        this.enemyBulletSprites.forEach(({ sprite, bullet }) => {
            if (!sprite?.visible || bullet?.kind !== 'fireball') return;
            graphics.lineStyle(2, 0xff7744, 0.95);
            graphics.strokeRect(
                bullet.x - ENEMY_BULLET_HITBOX_HW,
                bullet.y - ENEMY_BULLET_HITBOX_HH,
                ENEMY_BULLET_HITBOX_HW * 2,
                ENEMY_BULLET_HITBOX_HH * 2,
            );
        });
    }

    strokeRotatedRect(graphics, x, y, halfWidth, halfHeight, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const points = [
            { x: -halfWidth, y: -halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: halfWidth, y: halfHeight },
            { x: -halfWidth, y: halfHeight },
        ].map(point => ({
            x: x + point.x * cos - point.y * sin,
            y: y + point.x * sin + point.y * cos,
        }));

        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.strokePath();
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

        this.playerSprites.forEach((sprite, sessionId) => {
            const animationState = this.playerAnimationState.get(sessionId);
            const weapon = this.playerWeaponSprites.get(sessionId);
            if (!animationState) return;
            const visualMoveSpeed = animationState.dashing ? PLAYER_DASH_VISUAL_MOVE_SPEED : PLAYER_VISUAL_MOVE_SPEED;
            const maxStep = visualMoveSpeed * dtSec;

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
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        if (animationState?.axeWhirlwind) this.stopAxeWhirlwind();
        this.attackHeldPointerId = pointer.id;
        this.attackHeldPointer = pointer;
        this.tryHeldAttack(pointer, true);
    }

    stopHeldAttack() {
        this.attackHeldPointerId = null;
        this.attackHeldPointer = null;
    }

    startAxeWhirlwind(pointer) {
        const sessionId = this.localSessionId;
        const animationState = sessionId ? this.playerAnimationState.get(sessionId) : null;
        const sprite = sessionId ? this.playerSprites.get(sessionId) : null;
        if (!this.gameStarted || !sessionId || !animationState || !sprite || animationState.dead || this.isBuildModeActive) return;
        if (animationState.activeItem !== ITEM_WOOD_AXE) return;
        if ((animationState.axeWhirlwindCooldownProgress || this.localAxeWhirlwindCooldownProgress || 0) > 0) return;
        if (animationState.axeWhirlwind) {
            this.axeWhirlwindPointerId = pointer.id;
            this.axeWhirlwindPointer = pointer;
            return;
        }

        this.stopHeldAttack();
        this.cancelBowCharge();

        this.axeWhirlwindPointerId = pointer.id;
        this.axeWhirlwindPointer = pointer;
        RoomClient.sendAxeWhirlwind(true);
    }

    stopAxeWhirlwind() {
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        if (!this.axeWhirlwindPointer && this.axeWhirlwindPointerId === null && !animationState?.axeWhirlwind) return;
        RoomClient.sendAxeWhirlwind(false);
        this.axeWhirlwindPointerId = null;
        this.axeWhirlwindPointer = null;
        if (this.localSessionId) this.axeWhirlwindSoundNextAt.delete(this.localSessionId);
        if (animationState) {
            animationState.axeWhirlwind = false;
            this.clearAxeWhirlwindPresentationState(this.localSessionId, { updateAnimation: true });
        }
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
        this.bowChargeMoveState = this.getMovementKeyState();
        this.nextBowAimSendAt = this.time.now + BOW_AIM_SEND_INTERVAL_MS;
        RoomClient.sendBowChargeStart(worldPoint?.x, worldPoint?.y);
        this.playPlayerAttackAnimation(sessionId, direction, { playAudio: false, allowWhileCharging: true });
    }

    updateBowChargeAim() {
        if (!this.bowChargePointer || this.time.now < this.nextBowAimSendAt) return;
        const pointer = this.bowChargePointer;

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

    cancelBowChargeForMovement() {
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        if (!animationState?.bowCharging) return;
        const movement = this.getMovementKeyState();
        const previous = this.bowChargeMoveState || movement;
        const pressed = (movement.left && !previous.left)
            || (movement.right && !previous.right)
            || (movement.up && !previous.up)
            || (movement.down && !previous.down);
        this.bowChargeMoveState = movement;
        if (!pressed) return;
        this.cancelBowCharge();
        this.clearBowPresentationState(this.localSessionId, { updateAnimation: true });
    }

    getMovementKeyState() {
        return {
            left: !!this.keys.left.isDown,
            right: !!this.keys.right.isDown,
            up: !!this.keys.up.isDown,
            down: !!this.keys.down.isDown,
        };
    }

    cancelBowCharge() {
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        if (!this.bowChargePointer && this.bowChargePointerId === null && !animationState?.bowCharging) return;
        RoomClient.sendBowCancel();
        this.bowChargePointerId = null;
        this.bowChargePointer = null;
        this.bowChargeMoveState = null;
        this.nextBowAimSendAt = 0;
    }

    updateHeldAttack() {
        if (!this.attackHeldPointer || this.isBuildModeActive) return;
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        if (animationState?.axeWhirlwind) {
            this.stopHeldAttack();
            return;
        }
        if (this.time.now < this.nextHeldAttackAt) return;

        const pointer = this.attackHeldPointer;
        if (!pointer.leftButtonDown?.()) {
            this.stopHeldAttack();
            return;
        }

        this.tryHeldAttack(pointer, false);
    }

    updateAxeWhirlwind() {
        if (!this.axeWhirlwindPointer) return;
        const animationState = this.localSessionId ? this.playerAnimationState.get(this.localSessionId) : null;
        if (!this.isRightMouseButtonDown(this.axeWhirlwindPointer) || animationState?.activeItem !== ITEM_WOOD_AXE || animationState?.dead) {
            this.stopAxeWhirlwind();
        }
    }

    updateAxeWhirlwindSounds() {
        const now = this.time.now;
        this.playerAnimationState.forEach((animationState, sessionId) => {
            if (!animationState.axeWhirlwind || animationState.dead) {
                this.axeWhirlwindSoundNextAt.delete(sessionId);
                return;
            }

            const nextAt = this.axeWhirlwindSoundNextAt.get(sessionId) ?? 0;
            if (now < nextAt) return;
            if (!this.shouldPlayAttackAudio(sessionId)) {
                this.axeWhirlwindSoundNextAt.set(sessionId, now + AXE_WHIRLWIND_SOUND_INTERVAL_MS);
                return;
            }

            const sprite = this.playerSprites.get(sessionId);
            if (!sprite) return;
            this.playSfx(ASSETS.audio.swordSpin.key, SWORD_SPIN_SOUND_VOLUME, {
                spatial: !this.isLocalSession(sessionId),
                worldX: sprite.x,
                worldY: sprite.y,
                highPassHz: SWORD_SPIN_HIGH_PASS_HZ,
            });
            this.axeWhirlwindSoundNextAt.set(sessionId, now + AXE_WHIRLWIND_SOUND_INTERVAL_MS);
        });
    }

    isRightMouseButtonDown(pointer = null) {
        const activePointer = this.input?.activePointer || null;
        const candidates = [activePointer, pointer].filter(Boolean);

        for (const candidate of candidates) {
            if (typeof candidate.buttons === 'number') return (candidate.buttons & 2) !== 0;
            const eventButtons = candidate.event?.buttons;
            if (typeof eventButtons === 'number') return (eventButtons & 2) !== 0;
        }

        return candidates.some(candidate => candidate.rightButtonDown?.());
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
        return (PLAYER_ATTACK_REPEAT_MS / (1 + 0.25 * stacks)) + PLAYER_ATTACK_REPEAT_BUFFER_MS;
    }

    playLocalAttackAnimation(pointer) {
        const sessionId = this.localSessionId;
        const animationState = sessionId ? this.playerAnimationState.get(sessionId) : null;
        const sprite = sessionId ? this.playerSprites.get(sessionId) : null;
        if (!this.gameStarted || !sessionId || !animationState || !sprite || animationState.attacking || animationState.axeWhirlwind || animationState.dead) return false;

        const worldPoint = this.getPointerWorldPoint(pointer);
        const origin = { x: animationState.x ?? sprite.x, y: animationState.y ?? (sprite.y - PLAYER_VISUAL_Y_OFFSET) };
        const direction = this.getAttackDirectionFromWorldPoint(worldPoint, origin, animationState.direction || DEFAULT_PLAYER_DIRECTION);
        const attackItem = animationState.activeItem || '';
        if (attackItem !== ITEM_WOOD_AXE) return false;
        animationState.attackTargetX = worldPoint?.x ?? null;
        animationState.attackTargetY = worldPoint?.y ?? null;
        animationState.attackItem = attackItem;
        RoomClient.sendAttack(direction, worldPoint?.x, worldPoint?.y);
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

    getPlayerAttackMode(item, moving = false) {
        if (item === ITEM_WOOD_AXE) return moving ? 'axeRunAttack' : 'axe';
        if (item === ITEM_WOOD_BOW) return 'bow';
        return null;
    }

    getWeaponAnimationGroup(item, mode = 'idle') {
        if (item !== ITEM_WOOD_AXE && item !== ITEM_WOOD_BOW) return null;
        const suffix = mode === 'whirlwind' ? 'Whirlwind' : mode === 'runAttack' ? 'RunAttack' : mode === 'attack' ? 'Attack' : mode === 'run' ? 'Run' : 'Idle';
        const prefix = item === ITEM_WOOD_BOW ? 'woodBow' : 'woodAxe';
        return ANIMATION.weapon[`${prefix}${suffix}`];
    }

    getWeaponTextureKey(item, mode = 'idle') {
        if (item !== ITEM_WOOD_AXE && item !== ITEM_WOOD_BOW) return null;
        const suffix = mode === 'runAttack' ? 'RunAttack1' : mode === 'attack' ? 'Attack' : mode === 'run' ? 'Run' : 'Idle';
        const prefix = item === ITEM_WOOD_BOW ? 'woodBow' : 'woodAxe';
        return ASSETS.spritesheet[`${prefix}${suffix}`]?.key || ASSETS.spritesheet.woodAxeIdle.key;
    }

    updatePlayerWeaponAnimation(sessionId, moving, direction) {
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!weapon || !animationState || animationState.dead) return;

        const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
        const item = animationState.activeItem || '';
        if (animationState.axeWhirlwind) {
            this.playPlayerAxeWhirlwindAnimation(sessionId, nextDirection, { preserveProgress: true });
            return;
        }
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

    playPlayerWeaponAnimation(sessionId, item, direction, { mode = 'attack', restart = false, preserveProgress = false } = {}) {
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!weapon || !animationState || !weapon.visible) return false;

        const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
        const animation = this.getWeaponAnimationGroup(item, mode)?.[nextDirection];
        if (!animation) return false;

        weapon.setVisible(true);
        this.playDirectionalAnimation(weapon, animation.key, { restart, preserveProgress });

        return true;
    }

    isLocalMovementInputActive() {
        if (!this.keys) return false;
        return !!(this.keys.left?.isDown || this.keys.right?.isDown || this.keys.up?.isDown || this.keys.down?.isDown);
    }

    playPlayerAxeWhirlwindAnimation(sessionId, direction, { preserveProgress = true } = {}) {
        const sprite = this.playerSprites.get(sessionId);
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || animationState.dead || !sprite.visible) return false;

        const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
        animationState.direction = nextDirection;
        animationState.attackItem = ITEM_WOOD_AXE;
        animationState.attacking = false;
        animationState.attackTargetX = null;
        animationState.attackTargetY = null;

        const bodyAnimation = ANIMATION.player.axeWhirlwind?.[nextDirection];
        const weaponAnimation = ANIMATION.weapon.woodAxeWhirlwind?.[nextDirection];
        if (!bodyAnimation) return false;

        this.playDirectionalAnimation(sprite, bodyAnimation.key, { preserveProgress });
        if (weapon && weaponAnimation) {
            weapon.setVisible(true);
            this.playDirectionalAnimation(weapon, weaponAnimation.key, { preserveProgress });
        } else {
            this.hidePlayerWeapon(sessionId);
        }

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

    clearBowPresentationState(sessionId, { updateAnimation = true } = {}) {
        const sprite = this.playerSprites.get(sessionId);
        const weapon = this.playerWeaponSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!animationState) return;

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

    clearAxeWhirlwindPresentationState(sessionId, { updateAnimation = true } = {}) {
        const animationState = this.playerAnimationState.get(sessionId);
        if (!animationState) return;

        animationState.axeWhirlwind = false;
        if (animationState.attackItem === ITEM_WOOD_AXE) {
            animationState.attacking = false;
            animationState.attackTargetX = null;
            animationState.attackTargetY = null;
        }
        if (!updateAnimation || animationState.dead) return;

        if (this.isLocalSession(sessionId)) {
            this.updateLocalPlayerAnimation();
        } else {
            this.setPlayerAnimation(sessionId, animationState.moving, null);
        }
        this.updatePlayerWeaponIdleFrame(sessionId, animationState.direction || DEFAULT_PLAYER_DIRECTION);
    }

    playPlayerAttackAnimation(sessionId, direction, { playAudio = true, allowWhileCharging = false, restart = false, preserveProgress = false } = {}) {
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!sprite || !animationState || animationState.dead || !sprite.visible) return;

        const attackItem = animationState.attackItem || animationState.activeItem || ITEM_WOOD_AXE;
        if (animationState.axeWhirlwind && attackItem === ITEM_WOOD_AXE) return;
        if (animationState.attacking && !allowWhileCharging && !restart) return;
        animationState.attacking = true;

        const useRunAttack = attackItem === ITEM_WOOD_AXE
            && !animationState.bowCharging
            && (animationState.moving || (this.isLocalSession(sessionId) && this.isLocalMovementInputActive()));
        const attackMode = this.getPlayerAttackMode(attackItem, useRunAttack);
        const weaponAttackMode = useRunAttack ? 'runAttack' : 'attack';
        const didPlay = this.playPlayerAnimation(sessionId, attackMode, direction, { force: true, restart, preserveProgress });
        const didPlayWeapon = this.playPlayerWeaponAnimation(sessionId, attackItem, direction, { mode: weaponAttackMode, restart, preserveProgress });
        if (!didPlay) {
            animationState.attacking = false;
            return;
        }
        if (!didPlayWeapon) this.hidePlayerWeapon(sessionId);

        if (playAudio) {
            if (attackItem === ITEM_WOOD_BOW) {
                this.playSfx(ASSETS.audio.arrowLaunch.key, PUNCH_SOUND_VOLUME, {
                    spatial: !this.isLocalSession(sessionId),
                    worldX: sprite.x,
                    worldY: sprite.y,
                });
            } else {
                this.time.delayedCall(AXE_ATTACK_HIT_SOUND_DELAY_MS, () => {
                    const currentSprite = this.playerSprites.get(sessionId);
                    const currentState = this.playerAnimationState.get(sessionId);
                    if (!currentSprite || !currentState || currentState.dead) return;
                    this.playSfx(ASSETS.audio.punchWhoosh.key, PUNCH_SOUND_VOLUME, {
                        spatial: !this.isLocalSession(sessionId),
                        worldX: currentSprite.x,
                        worldY: currentSprite.y,
                    });
                });
            }
        }

        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            if (animationState.bowCharging) return;
            if (animationState.axeWhirlwind) {
                animationState.attacking = false;
                return;
            }
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

        if (this.isLocalSession(sessionId)) {
            this.cancelBowCharge();
            this.stopAxeWhirlwind();
        }
        animationState.dead = true;
        animationState.deathPlayed = true;
        animationState.attacking = false;
        animationState.axeAttackHitboxActive = false;
        animationState.axeWhirlwind = false;
        animationState.axeWhirlwindHitboxUntil = 0;
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
        animationState.axeAttackHitboxActive = false;
        animationState.axeWhirlwind = false;
        animationState.axeWhirlwindHitboxUntil = 0;
        animationState.moving = false;
        animationState.bowCharging = false;
        animationState.bowChargeProgress = 0;
        animationState.bowFullyCharged = false;
        animationState.bowAnimationPaused = false;
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
        highPassHz = null,
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

        const filterNode = this.applyHighPassFilter(sound, highPassHz);
        if (filterNode) {
            const disconnectFilter = () => {
                try {
                    filterNode.disconnect();
                } catch (_error) {
                    // The browser may already disconnect nodes when the sound is destroyed.
                }
            };
            sound.once('complete', disconnectFilter);
            sound.once('stop', disconnectFilter);
        }
        return sound;
    }

    applyHighPassFilter(sound, highPassHz) {
        if (!Number.isFinite(highPassHz) || highPassHz <= 0) return null;
        const context = sound?.manager?.context;
        const source = sound?.source;
        const destination = sound?.muteNode;
        if (!context?.createBiquadFilter || !source?.disconnect || !source?.connect || !destination) return null;

        try {
            const filter = context.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = highPassHz;
            filter.Q.value = 0.7;
            source.disconnect();
            source.connect(filter);
            filter.connect(destination);
            return filter;
        } catch (_error) {
            return null;
        }
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

    showCasterChargeEffect(enemyId) {
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!this.isCasterAnimationState(animationState) || animationState.dead) return;

        let effect = this.casterChargeEffects.get(enemyId);
        if (!effect) {
            effect = this.add.image(0, 0, ASSETS.image.firecharge.key)
                .setOrigin(0.5)
                .setDisplaySize(FIRECHARGE_DISPLAY_SIZE, FIRECHARGE_DISPLAY_SIZE)
                .setDepth(PLAYER_WEAPON_DEPTH + FIRECHARGE_DEPTH_OFFSET)
                .setBlendMode(Phaser.BlendModes.ADD);
            this.registerWorldObject(effect);
            this.casterChargeEffects.set(enemyId, effect);
        }

        effect.setVisible(true);
        this.updateCasterChargeEffect(enemyId);
    }

    updateCasterChargeEffect(enemyId) {
        const effect = this.casterChargeEffects.get(enemyId);
        const sprite = this.enemySprites.get(enemyId);
        const animationState = this.enemyAnimationState.get(enemyId);
        if (!effect || !sprite || !this.isCasterAnimationState(animationState) || animationState.action !== 'charge' || animationState.dead) {
            effect?.setVisible(false);
            return;
        }

        const directionVector = this.getDirectionVector(animationState.direction || 'S');
        effect
            .setPosition(
                sprite.x + directionVector.x * FIRECHARGE_DIRECTION_OFFSET,
                sprite.y + FIRECHARGE_Y_OFFSET + directionVector.y * FIRECHARGE_DIRECTION_OFFSET,
            )
            .setDepth(sprite.depth + FIRECHARGE_DEPTH_OFFSET)
            .setVisible(true);
    }

    updateCasterChargeEffects() {
        this.casterChargeEffects.forEach((_effect, enemyId) => this.updateCasterChargeEffect(enemyId));
    }

    hideCasterChargeEffect(enemyId) {
        const effect = this.casterChargeEffects.get(enemyId);
        if (!effect) return;
        effect.destroy();
        this.casterChargeEffects.delete(enemyId);
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
        if (animationState?.axeWhirlwind) {
            const nextDirection = direction || animationState.direction || DEFAULT_PLAYER_DIRECTION;
            animationState.moving = moving;
            this.playPlayerAxeWhirlwindAnimation(sessionId, nextDirection, { preserveProgress: true });
            return;
        }
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

    updatePlayerDashCooldownBars() {
        this.playerDashCooldownBars.forEach((_dashBar, sessionId) => {
            this.updatePlayerDashCooldownBar(sessionId);
        });
    }

    updatePlayerReviveBars() {
        this.playerReviveBars.forEach((_reviveBar, sessionId) => {
            this.updatePlayerReviveBar(sessionId);
        });
    }

    updatePlayerNameLabels() {
        this.playerNameLabels.forEach((_nameLabel, sessionId) => {
            this.updatePlayerNameLabel(sessionId);
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

    createEnemyHealthBar(enemyId, enemy) {
        let healthBar = this.enemyHealthBars.get(enemyId);
        if (healthBar) return healthBar;

        const background = this.add.graphics().setDepth(ENEMY_HEALTH_BAR_DEPTH);
        const fill = this.add.graphics().setDepth(ENEMY_HEALTH_BAR_DEPTH + 1);
        healthBar = { background, fill, enemy };
        this.enemyHealthBars.set(enemyId, healthBar);
        this.registerWorldObject(background, fill);
        return healthBar;
    }

    destroyEnemyHealthBar(enemyId) {
        const healthBar = this.enemyHealthBars.get(enemyId);
        if (!healthBar) return;

        healthBar.background.destroy();
        healthBar.fill.destroy();
        this.enemyHealthBars.delete(enemyId);
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

    updatePlayerNameLabel(sessionId) {
        const nameLabel = this.playerNameLabels.get(sessionId);
        const sprite = this.playerSprites.get(sessionId);
        if (!nameLabel || !sprite) return;

        nameLabel.label
            .setText(nameLabel.player.displayName || 'PLAYER')
            .setPosition(sprite.x, sprite.y + PLAYER_NAME_LABEL_Y_OFFSET)
            .setVisible(!nameLabel.player.isDead);
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

    updatePlayerDashCooldownBar(sessionId) {
        const dashBar = this.playerDashCooldownBars.get(sessionId);
        const sprite = this.playerSprites.get(sessionId);
        const animationState = this.playerAnimationState.get(sessionId);
        if (!dashBar || !sprite || !animationState) return;

        const progress = Phaser.Math.Clamp(animationState.dashCooldownProgress || 0, 0, 1);
        dashBar.fill.clear();
        dashBar.fill.setVisible(progress > 0 && !animationState.dead);
        if (!dashBar.fill.visible) return;

        const x = sprite.x - PLAYER_HEALTH_BAR_WIDTH * 0.5;
        const y = sprite.y + PLAYER_DASH_COOLDOWN_BAR_Y_OFFSET;
        dashBar.fill.fillStyle(PLAYER_DASH_COOLDOWN_BAR_COLOR, PLAYER_DASH_COOLDOWN_BAR_ALPHA);
        dashBar.fill.fillRect(x, y, PLAYER_HEALTH_BAR_WIDTH * progress, PLAYER_HEALTH_BAR_HEIGHT);
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

    updateEnemyHealthBar(enemyId, enemy = null) {
        let healthBar = this.enemyHealthBars.get(enemyId);
        const healthBarEnemy = enemy || healthBar?.enemy;
        const sprite = this.enemySprites.get(enemyId);
        if (!healthBarEnemy || !sprite) return;

        const maxHealth = Math.max(1, healthBarEnemy.maxHealth || ENEMY_MAX_HEALTH);
        const health = Phaser.Math.Clamp(healthBarEnemy.health || 0, 0, maxHealth);
        if (healthBarEnemy.isDead || health >= maxHealth) {
            this.destroyEnemyHealthBar(enemyId);
            return;
        }

        healthBar = this.createEnemyHealthBar(enemyId, healthBarEnemy);
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

    addExplosion(x, y) {
        const explosion = new Explosion(this, x, y);
        this.registerWorldObject(explosion);
    }

    clearAllSprites() {
        this.stopAllCasterChargeSounds();
        this.playerSprites.forEach(s => s.destroy());
        this.playerWeaponSprites.forEach(s => s.destroy());
        this.playerHealthBars.forEach(({ background, fill }) => {
            background.destroy();
            fill.destroy();
        });
        this.playerBowChargeBars.forEach(({ fill }) => {
            fill.destroy();
        });
        this.playerDashCooldownBars.forEach(({ fill }) => {
            fill.destroy();
        });
        this.playerReviveBars.forEach(({ background, fill }) => {
            background.destroy();
            fill.destroy();
        });
        this.playerNameLabels.forEach(({ label }) => {
            label.destroy();
        });
        this.playerLevelLabels.forEach(({ label }) => {
            label.destroy();
        });
        this.offscreenPlayerIndicators.forEach(indicator => indicator.destroy());
        this.axeWhirlwindSoundNextAt.clear();
        this.enemySprites.forEach(s => s.destroy());
        this.casterChargeEffects.forEach(effect => effect.destroy());
        this.enemyHealthBars.forEach(({ background, fill }) => {
            background.destroy();
            fill.destroy();
        });
        this.treeSprites.forEach(({ bottom, top, sprites }) => {
            if (sprites) {
                sprites.forEach((sprite) => sprite.destroy());
            } else {
                bottom.destroy();
                top.destroy();
            }
        });
        this.logSprites.forEach(({ sprites }) => {
            sprites.forEach((sprite) => sprite.destroy());
        });
        this.campfireSprites.forEach(({ sprite, radius, healBar }) => {
            sprite.destroy();
            radius?.destroy();
            healBar?.destroy();
        });
        this.caltropSprites.forEach(({ sprite }) => sprite.destroy());
        this.enchantmentTableSprites.forEach(({ sprite }) => sprite.destroy());
        this.craftingTableSprites.forEach(({ sprite }) => sprite.destroy());
        this.playerBulletSprites.forEach(({ sprite }) => sprite.destroy());
        this.enemyBulletSprites.forEach(({ sprite }) => sprite.destroy());
        if (this.grassNoiseLayer) {
            this.grassNoiseLayer.destroy();
            this.grassNoiseLayer = null;
        }
        if (this.buildGridGraphics) {
            this.buildGridGraphics.destroy();
            this.buildGridGraphics = null;
        }
        if (this.editorGridGraphics) {
            this.editorGridGraphics.destroy();
            this.editorGridGraphics = null;
        }
        if (this.editorBoundaryGraphics) {
            this.editorBoundaryGraphics.destroy();
            this.editorBoundaryGraphics = null;
        }
        if (this.mapEditorLayer) {
            this.mapEditorLayer.destroy();
            this.mapEditorLayer = null;
        }
        this.mapEditorTilemap?.destroy();
        this.mapEditorTilemap = null;
        this.mapEditorChunks.clear();
        this.mapEditorTileSprites.forEach((sprite) => sprite.destroy());
        this.mapEditorTileSprites.clear();
        this.mapDraftNameInput?.destroy();
        this.mapDraftNameInput = null;
        this.mapPaletteLayoutObjects = [];
        this.mapPaletteSideButton = null;
        this.mapPaletteHitArea = null;
        this.mapPaletteSelection = null;
        this.mapEditorStatusText = null;
        this.mapEditorUiObjects.clear();
        this.mapLayerButtons = [];
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
            this.hitboxToggleButton.setColor('#cccccc');
            this.hitboxToggleButton.setVisible(false);
        }
        this.setDebugRoundControlsVisible(false);
        this.closeCraftingMenu();
        this.closeEnchantmentMenu();
        this.isBuildModeActive = false;
        this.resetBuildDragState();
        this.stopHeldAttack();
        this.cancelBowCharge();
        this.localAxeWhirlwindProgress = 0;
        this.localAxeWhirlwindCooldownProgress = 0;
        this.updateHotbarAxeOverlays();
        this.playerSprites.clear();
        this.playerWeaponSprites.clear();
        this.playerAnimationState.clear();
        this.playerHealthBars.clear();
        this.playerBowChargeBars.clear();
        this.playerDashCooldownBars.clear();
        this.playerReviveBars.clear();
        this.playerNameLabels.clear();
        this.playerLevelLabels.clear();
        this.offscreenPlayerIndicators.clear();
        this.localExperienceState = null;
        this.localPendingUpgradeChoices = 0;
        this.updateSkillPointText();
        this.enemySprites.clear();
        this.enemyAnimationState.clear();
        this.casterChargeEffects.clear();
        this.enemyHealthBars.clear();
        this.treeSprites.clear();
        this.logSprites.clear();
        this.campfireSprites.clear();
        this.caltropSprites.clear();
        this.enchantmentTableSprites.clear();
        this.craftingTableSprites.clear();
        this.playerBulletSprites.clear();
        this.enemyBulletSprites.clear();
    }
}
