import { Room, Client } from "colyseus";
import {
    GameRoomState,
    PlayerState,
    EnemyState,
    PlayerBulletState,
    EnemyBulletState,
    TreeState,
    LogState,
    BoneDropState,
    CampfireState,
    CaltropState,
    EnchantmentTableState,
    CraftingTableState,
    MapChunkState,
} from "../schema/GameState";
import { MapStorage, normalizeMapName, StoredMapDocument } from "../maps/MapStorage";
import { isProductionEnv } from "../env";

// ─── Physics constants (mirror the Phaser client values) ──────────────────────
const PLAYER_MAX_VEL  = 200;   // px/s
const PLAYER_MAX_HEALTH = 5;
const PLAYER_HIT_INVULNERABILITY_MS = 150;
const PLAYER_SPAWN_INVULNERABILITY_MS = 2000;
const PLAYER_DAMAGE_FLASH_MS = PLAYER_HIT_INVULNERABILITY_MS;
const PLAYER_DAMAGE_FLASH_BLINK_MS = 90;
const PLAYER_INVULNERABILITY_FLASH_BLINK_MS = 220;
const FIRE_RATE_MS    = 167;   // ≈ 10 frames at 60 fps
const P_BULLET_VEL    = 1000;  // px/s upward
const VIEW_WIDTH      = 1280;
const VIEW_HEIGHT     = 720;
const TILE_WORLD_SCALE = 1.25;
const BASE_TILE_SIZE = 32;
const MAP_TILE_SIZE = BASE_TILE_SIZE * TILE_WORLD_SCALE;
const BASE_WORLD_WIDTH = VIEW_WIDTH * 3;
const BASE_WORLD_HEIGHT = VIEW_HEIGHT * 3;
const WORLD_WIDTH = BASE_WORLD_WIDTH * TILE_WORLD_SCALE;
const WORLD_HEIGHT = BASE_WORLD_HEIGHT * TILE_WORLD_SCALE;
const EDITOR_WORLD_WIDTH = WORLD_WIDTH * 2;
const EDITOR_WORLD_HEIGHT = WORLD_HEIGHT * 2;
const LEGACY_EDITOR_WORLD_WIDTH = BASE_WORLD_WIDTH * 2;
const LEGACY_EDITOR_WORLD_HEIGHT = BASE_WORLD_HEIGHT * 2;
const MAP_CHUNK_SIZE = 16;
const MAP_CHUNK_CELL_COUNT = MAP_CHUNK_SIZE * MAP_CHUNK_SIZE;
const MAP_FRAME_COUNT = 32 * 32;
const MAP_MAX_FILLED_CELLS = 50000;
const MAP_EDITOR_MODE = "map-editor";
const MAP_CHUNK_ENCODED_BYTES = MAP_CHUNK_CELL_COUNT * 2;
const MAP_CHUNK_ENCODED_LENGTH = Math.ceil(MAP_CHUNK_ENCODED_BYTES / 3) * 4;
const MAP_SAVE_VERSION = 1;
const PRODUCTION_GAME_MAP_NAME = "lvlone";
const CASTLE_TOP_PARTIAL_SUPPORT_FRAMES = new Set([35, 36, 37]);
const CASTLE_FULL_HEIGHT_PARTIAL_SUPPORT_FRAMES = new Set([67, 68, 69]);
const WORKBENCH_LEFT_FRAME = 294;
const WORKBENCH_RIGHT_FRAME = 295;
const WORKBENCH_INTERACT_RANGE = 80;
const LAYER3_ROW_OBJECT_HALF_WIDTH = MAP_TILE_SIZE;
const LAYER3_ROW_OBJECT_HALF_HEIGHT = MAP_TILE_SIZE * 0.5;
const CAMPFIRE_CRAFT_WOOD_COST = 10;
const WOOD_SHIELD_CRAFT_WOOD_COST = 10;
const BONE_SHIELD_CRAFT_BONE_COST = 10;
const CALTROPS_FRAME = 449;
const CALTROPS_SLOW_RADIUS = 44;
const CALTROPS_SPEED_MULTIPLIER = 0.6;
const CALTROPS_CHECK_INTERVAL_MS = 150;
const CALTROPS_SLOW_MS = 250;
const CALTROPS_CRAFT_WOOD_COST = 4;
const TREE_COUNT = 25;
const TREE_GRID_COLS = 5;
const TREE_GRID_ROWS = 5;
const TREE_EDGE_PADDING = 192;
const TREE_SPAWN_CLEAR_RADIUS = 300;
const TREE_REPLENISH_FIRST_COMPLETED_WAVE = 9;
const TREE_REPLENISH_WAVE_INTERVAL = 10;
const TREE_REPLENISH_MAX_ATTEMPTS_PER_TREE = 80;
const TREE_TRUNK_Y_OFFSET = -18;
const TREE_VARIANT_TOPDOWN_3X3 = "topdown_3x3";
const TOPDOWN_TREE_TILE_SPAN = 3;
const TOPDOWN_TREE_HALF_SIZE = MAP_TILE_SIZE * TOPDOWN_TREE_TILE_SPAN * 0.5;
const TREE_HITBOX_SCALE = 0.75;
const TOPDOWN_TREE_HITBOX_RADIUS = TOPDOWN_TREE_HALF_SIZE * TREE_HITBOX_SCALE;
const LEGACY_TREE_HITBOX_RADIUS = 28 * TREE_HITBOX_SCALE;

// Half-extents used for AABB collision detection
const PLAYER_HW  = 11;  const PLAYER_HH  = 21;
const PLAYER_HITBOX_Y_OFFSET = 10;
const ENEMY_HW   = 28;  const ENEMY_HH   = 28;
const PB_HW      = 6;   const PB_HH      = 16;  // player bullet
const EB_HW      = 8;   const EB_HH      = 12;  // enemy bullet
const PLAYER_TREE_FOOT_RADIUS = 5;
const PLAYER_TREE_Y_OFFSET = 32;
const PLAYER_BULLET_Y_OFFSET = 56;
const MAX_PLAYER_MOVE_STEP = 3;
const PLAYER_DASH_DISTANCE = 135;
const PLAYER_DASH_DURATION_MS = 160;
const PLAYER_DASH_COOLDOWN_MS = 2000;
const ATTACK_LOCK_MS = 350;
const ATTACK_COOLDOWN_MS = 850;
const SHIELD_BASH_COOLDOWN_MS = 1300;
const AXE_ATTACK_IMPACT_DELAY_MS = 200;
const AXE_ATTACK_LINGER_MS = 400;
const TREE_ATTACK_IMPACT_DELAY_MS = AXE_ATTACK_IMPACT_DELAY_MS;
const ENEMY_ATTACK_IMPACT_DELAY_MS = AXE_ATTACK_IMPACT_DELAY_MS;
const BOW_CHARGE_MS = 1000;
const ARROW_SPEED = 900;
const ARROW_RANGE = 1200;
const ARROW_DAMAGE = 1;
const BOW_VOLLEY_RADIUS = 96;
const BOW_VOLLEY_RANGE = 600;
const BOW_VOLLEY_DAMAGE = 1;
const BOW_VOLLEY_IMPACT_DELAY_MS = 500;
const BOW_VOLLEY_COOLDOWN_MS = 3000;
const TREE_HEALTH = 4;
const WOOD_PILE_AMOUNT = 5;
const WOOD_PICKUP_RADIUS = 80;
const BONE_DROP_CHANCE = 0.75;
const BONE_DROP_AMOUNT = 1;
const BONE_PICKUP_RADIUS = WOOD_PICKUP_RADIUS;
const RESOURCE_PICKUP_CHECK_MS = 200;
const BUILD_GRID_SIZE = BASE_TILE_SIZE * TILE_WORLD_SCALE;
const BUILD_BLOCK_HALF_SIZE = BUILD_GRID_SIZE / 2;
const BUILD_PATH_COLUMNS = Math.ceil(WORLD_WIDTH / BUILD_GRID_SIZE);
const BUILD_PATH_ROWS = Math.ceil(WORLD_HEIGHT / BUILD_GRID_SIZE);
const BUILD_PATH_CELL_COUNT = BUILD_PATH_COLUMNS * BUILD_PATH_ROWS;
const BUILD_RANGE = 192;
const FIRST_LEVEL_UP_XP = 10;
const LEVEL_XP_GROWTH_FACTOR = 1.8;
const REVIVE_DURATION_MS = 2500;
const REVIVE_RADIUS = 64;
const REVIVE_HEALTH = 3;
const ATTACK_HIT_RADIUS = 33;
const SHIELD_BASH_RADIUS = 48;
const SHIELD_BASH_FORWARD_OFFSET = 48;
const SHIELD_BLOCK_RADIUS = 44 * 0.9;
const AXE_WHIRLWIND_RADIUS = 56;
const AXE_WHIRLWIND_TICK_MS = 500;
const AXE_WHIRLWIND_MAX_DURATION_MS = 4000;
const AXE_WHIRLWIND_COOLDOWN_MS = 10000;
const AXE_WHIRLWIND_COOLDOWN_MIN_MS = 1000;
const AXE_WHIRLWIND_DAMAGE = 1;
const UPGRADE_MAX_RANK = 3;
const AXE_PRIMARY_DAMAGE_UPGRADE_MAX_RANK = 10;
const AXE_WHIRLWIND_AOE_UPGRADE_MAX_RANK = 2;
const AXE_WHIRLWIND_DAMAGE_UPGRADE_MAX_RANK = 2;
const BOW_PRIMARY_UPGRADE_MAX_RANK = 4;
const BOW_PRIMARY_PIERCE_UPGRADE_MAX_RANK = 10;
const BOW_PRIMARY_DAMAGE_UPGRADE_MAX_RANK = 10;
const BOW_VOLLEY_COOLDOWN_UPGRADE_MAX_RANK = 3;
const BOW_VOLLEY_AOE_UPGRADE_MAX_RANK = 5;
const BOW_VOLLEY_DAMAGE_UPGRADE_MAX_RANK = 3;
const SHIELD_PRIMARY_DAMAGE_UPGRADE_MAX_RANK = 5;
const SHIELD_MAX_HP_UPGRADE_MAX_RANK = 5;
const SHIELD_RECHARGE_UPGRADE_MAX_RANK = 5;
const SHIELD_SIZE_UPGRADE_MAX_RANK = 3;
const BASE_ACTIVE_CAMPFIRE_LIMIT = 1;
const ATTACK_HIT_START_OFFSET = 10;
const ATTACK_HIT_END_OFFSET = 40;
const ATTACK_HIT_ORIGIN_Y_OFFSET = 18;
const ATTACK_TARGET_MIN_DISTANCE = 4;
const LOG_WORLD_PADDING = 16;
const ENEMY_WAVE_SPAWN_INTERVAL_MS = 2000;
const ENEMY_WAVE_MAX_SPAWNS_PER_TICK = 2;
const ENEMY_NEXT_WAVE_DELAY_MS = 30000;
const DEBUG_MAX_ROUND = 99;
const DEBUG_MAX_PLAYER_LEVEL = 99;
const INT32_MAX = 2147483647;
const MAX_ACTIVE_ENEMIES = 100;
const ENEMY_DIAGNOSTIC_INTERVAL_MS = 5000;
const ENABLE_ENEMY_DIAGNOSTICS = process.env.ENEMY_DIAGNOSTICS === "1";
const SLOW_TICK_LOG_THRESHOLD_MS = 75;
const TICK_PHASE_LOG_MIN_MS = 1;
const INITIAL_MELEE_WAVE_COUNT = 5;
const MELEE_PER_MINUTE = 5;
const DARK_KNIGHT_WAVE_INTERVAL_MINUTES = 3;
const ENEMY_TYPE_CASTER = 3;
const ENEMY_TYPE_DARK_KNIGHT = 4;
const ENEMY_TYPE_BOSS1 = 5;
const MIN_BOW_CHARGE_MS = 100;
const BASE_CASTER_CAST_RANGE = 375;
const CASTER_CAST_RANGE = BASE_CASTER_CAST_RANGE;
const CASTER_CHARGE_MS = 1100;
const CASTER_ATTACK_MS = 500;
const CASTER_FIREBALL_SPEED = 225;
const CASTER_FIREBALL_DAMAGE = 1;
const DARK_KNIGHT_BASE_HEALTH = 10;
const DARK_KNIGHT_HEALTH_PER_PLAYER = 10;
const DARK_KNIGHT_DETECTION_RANGE = BASE_CASTER_CAST_RANGE;
const DARK_KNIGHT_WALK_SPEED = 88;
const DARK_KNIGHT_RUSH_SPEED = 230;
const DARK_KNIGHT_MIN_RUSH_MS = 500;
const DARK_KNIGHT_MARK_REACH_RADIUS = 12;
const DARK_KNIGHT_ATTACK_MS = 900;
const DARK_KNIGHT_ATTACK_IMPACT_DELAY_MS = 600;
const DARK_KNIGHT_COOLDOWN_MS = 1560;
const DARK_KNIGHT_AOE_RADIUS = 88;
const DARK_KNIGHT_ATTACK_DAMAGE = 2;
const BOSS1_WAVE_NUMBER = 5;
const BOSS1_BASE_HEALTH = 25;
const BOSS1_HEALTH_PER_PLAYER = 25;
const BOSS1_SPEED = 144;
const BOSS1_BOMB_FUSE_MS = 2500;
const BOSS1_BOMB_DAMAGE = 5;
const BOSS1_BOMB_RADIUS = BOW_VOLLEY_RADIUS * 1.25;
const BOSS1_XP = 15;
const RADIO_TRACK_COUNT = 7;
const ENEMY1_SPEED = 100;
const ENEMY2_SPEED = 114.75;
const ENEMY1_HEALTH = 5;
const CASTER_HEALTH = 2;
const DEFAULT_ENEMY_HEALTH = 3;
const ENEMY1_ATTACK_RANGE = 20;
const ENEMY1_PLAYER_ATTACK_RANGE = 62;
const ENEMY1_ATTACK_TRIGGER_EPSILON = 6;
const ENEMY1_MIN_CHASE_STEP = 1;
const ENEMY1_WINDUP_MS = 100;
const ENEMY1_ATTACK_MS = 850;
const ENEMY_DEATH_REMOVE_MS = 850;
const ENEMY_HIT_STUN_MS = 250;
const DARK_KNIGHT_HIT_STUN_MULTIPLIER = 0.5;
const ENEMY1_EDGE_OFFSET = 96;
const ENEMY1_DAMAGE_IMPACT_DELAY_MS = 250;
const ENEMY1_ATTACK_DAMAGE = 1;
const ENEMY1_ATTACK_HIT_OFFSET = 28;
const ENEMY1_ATTACK_HIT_RADIUS = 32;
const ENEMY_MELEE_HIT_HW = 34;
const ENEMY_MELEE_HIT_HH = 44;
const ENEMY_FOOT_RADIUS = 7;
const ENEMY_FOOT_Y_OFFSET = 34;
const ENEMY_SEPARATION_ITERATIONS = 1;
const ENEMY_SEPARATION_GRID_CELL_SIZE = 64;
const ENEMY_PATH_WAYPOINT_RADIUS = 12;
const ENEMY_PATH_REPATH_MS = 250;
const ENEMY_PATH_FAILED_RETRY_MS = 900;
const ENEMY_PATH_MAX_BUILDS_PER_TICK = 3;
const ENEMY_PATH_MAX_EXPANSIONS = 2000;
const ENEMY_PATH_TARGET_SEARCH_RADIUS = 6;
const ENEMY_PATH_DIAGONAL_COST = Math.SQRT2;
const ENEMY_DIRECT_PATH_RECHECK_MS = 250;
const ENEMY_FLOW_FIELD_MAX_BUILDS_PER_TICK = 1;
const ENEMY_LOS_RECHECK_MS = 200;
const ENEMY_FLOW_DIRECTIONS: Array<[number, number]> = [
    [0, -1], [1, 0], [0, 1], [-1, 0],
    [1, -1], [1, 1], [-1, 1], [-1, -1],
];
const ENEMY_FLOW_DIRECTION_COLS = new Int8Array([0, 1, 0, -1, 1, 1, -1, -1]);
const ENEMY_FLOW_DIRECTION_ROWS = new Int8Array([-1, 0, 1, 0, -1, 1, 1, -1]);
const GAME_OVER_RESTART_SECONDS = 10;
const ITEM_WOOD_AXE = "wood_axe";
const ITEM_WOOD_BOW = "wood_bow";
const ITEM_WOOD_SHIELD = "wood_shield";
const ITEM_BONE_SHIELD = "bone_shield";
const ITEM_HAMMER = "hammer";
const ITEM_CAMPFIRE = "campfire";
const ITEM_WOOD_CALTROPS = "wood_caltrops";
const ITEM_WOOD = "wood";
const ITEM_BONE = "bone";
const HOTBAR_SLOT_COUNT = 9;
const WOOD_SHIELD_MAX_HP = 10;
const BONE_SHIELD_MAX_HP = 20;
const SHIELD_REGEN_INTERVAL_MS = 5000;
const SHIELD_BLOCK_BREAK_COOLDOWN_MS = 5000;
const OUTFIT_COLOR_COUNT = 5;
const EMPTY_HOTBAR_ITEM = "";
const EMPTY_HOTBAR_COUNT = 0;
const WOOD_STACK_MAX = 99;
const BONE_STACK_MAX = 99;
const CAMPFIRE_HEAL_RADIUS = 320;
const CAMPFIRE_HEAL_INTERVAL_MS = 10000;
const CAMPFIRE_HEAL_AMOUNT = 1;
const UPGRADE_IDS = new Set([
    "axe_primary_attack_speed",
    "axe_primary_damage",
    "axe_whirlwind_cooldown",
    "axe_whirlwind_aoe",
    "axe_whirlwind_damage",
    "bow_primary_attack_speed",
    "bow_damage",
    "bow_pierce",
    "bow_volley_cooldown",
    "bow_volley_aoe",
    "bow_volley_damage",
    "shield_primary_attack_speed",
    "shield_primary_damage",
    "shield_max_hp",
    "shield_recharge",
    "shield_size",
    "hammer_wood_gather",
]);
type UpgradeNodeConfig = {
    id: string;
    prerequisite?: string;
    maxRank?: number;
};
const UPGRADE_TREES_BY_ITEM: Record<string, UpgradeNodeConfig[]> = {
    [ITEM_WOOD_AXE]: [
        { id: "axe_primary_attack_speed", maxRank: UPGRADE_MAX_RANK },
        { id: "axe_primary_damage", prerequisite: "axe_primary_attack_speed", maxRank: AXE_PRIMARY_DAMAGE_UPGRADE_MAX_RANK },
        { id: "axe_whirlwind_cooldown", maxRank: UPGRADE_MAX_RANK },
        { id: "axe_whirlwind_aoe", prerequisite: "axe_whirlwind_cooldown", maxRank: AXE_WHIRLWIND_AOE_UPGRADE_MAX_RANK },
        { id: "axe_whirlwind_damage", prerequisite: "axe_whirlwind_aoe", maxRank: AXE_WHIRLWIND_DAMAGE_UPGRADE_MAX_RANK },
    ],
    [ITEM_WOOD_BOW]: [
        { id: "bow_primary_attack_speed", maxRank: BOW_PRIMARY_UPGRADE_MAX_RANK },
        { id: "bow_pierce", prerequisite: "bow_primary_attack_speed", maxRank: BOW_PRIMARY_PIERCE_UPGRADE_MAX_RANK },
        { id: "bow_damage", prerequisite: "bow_pierce", maxRank: BOW_PRIMARY_DAMAGE_UPGRADE_MAX_RANK },
        { id: "bow_volley_cooldown", maxRank: BOW_VOLLEY_COOLDOWN_UPGRADE_MAX_RANK },
        { id: "bow_volley_aoe", prerequisite: "bow_volley_cooldown", maxRank: BOW_VOLLEY_AOE_UPGRADE_MAX_RANK },
        { id: "bow_volley_damage", prerequisite: "bow_volley_aoe", maxRank: BOW_VOLLEY_DAMAGE_UPGRADE_MAX_RANK },
    ],
    [ITEM_WOOD_SHIELD]: [
        { id: "shield_primary_attack_speed", maxRank: UPGRADE_MAX_RANK },
        { id: "shield_primary_damage", prerequisite: "shield_primary_attack_speed", maxRank: SHIELD_PRIMARY_DAMAGE_UPGRADE_MAX_RANK },
        { id: "shield_max_hp", maxRank: SHIELD_MAX_HP_UPGRADE_MAX_RANK },
        { id: "shield_recharge", prerequisite: "shield_max_hp", maxRank: SHIELD_RECHARGE_UPGRADE_MAX_RANK },
        { id: "shield_size", prerequisite: "shield_recharge", maxRank: SHIELD_SIZE_UPGRADE_MAX_RANK },
    ],
    [ITEM_BONE_SHIELD]: [
        { id: "shield_primary_attack_speed", maxRank: UPGRADE_MAX_RANK },
        { id: "shield_primary_damage", prerequisite: "shield_primary_attack_speed", maxRank: SHIELD_PRIMARY_DAMAGE_UPGRADE_MAX_RANK },
        { id: "shield_max_hp", maxRank: SHIELD_MAX_HP_UPGRADE_MAX_RANK },
        { id: "shield_recharge", prerequisite: "shield_max_hp", maxRank: SHIELD_RECHARGE_UPGRADE_MAX_RANK },
        { id: "shield_size", prerequisite: "shield_recharge", maxRank: SHIELD_SIZE_UPGRADE_MAX_RANK },
    ],
    [ITEM_HAMMER]: [
        { id: "hammer_wood_gather" },
    ],
};
const VALID_DIRECTIONS = new Set(["E", "SE", "S", "SW", "W", "NW", "N", "NE"]);
const DIRECTION_VECTORS: Record<string, { x: number; y: number }> = {
    E: { x: 1, y: 0 },
    SE: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    S: { x: 0, y: 1 },
    SW: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    W: { x: -1, y: 0 },
    NW: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    N: { x: 0, y: -1 },
    NE: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
};

const SOLID_TILE_REGIONS = [
    { x: 0, y: 0, width: 6, height: 3 }, // Castle_1
    { x: 8, y: 7, width: 6, height: 3 }, // Water
    { x: 11, y: 11, width: 3, height: 3 }, // Tree
];
const SOLID_MAP_FRAMES = new Set<number>();
for (const region of SOLID_TILE_REGIONS) {
    for (let row = region.y; row < region.y + region.height; row++) {
        for (let col = region.x; col < region.x + region.width; col++) {
            SOLID_MAP_FRAMES.add(row * 32 + col);
        }
    }
}
SOLID_MAP_FRAMES.add(WORKBENCH_LEFT_FRAME);
SOLID_MAP_FRAMES.add(WORKBENCH_RIGHT_FRAME);
const TREE_SPAWN_GROUND_FRAMES = new Set<number>([
    40, // yellow grass/base ground
]);

// ─── CatmullRom spline (replicates Phaser.Curves.Spline.getPoint) ─────────────
function catmullRom(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}

function splineGetPoint(points: [number, number][], t: number): { x: number; y: number } {
    const len      = points.length;
    const segments = len - 1;
    const scaled   = Math.max(0, Math.min(1, t)) * segments;
    const seg      = Math.min(Math.floor(scaled), segments - 1);
    const lt       = scaled - seg;

    const p0 = points[Math.max(0, seg - 1)];
    const p1 = points[seg];
    const p2 = points[Math.min(len - 1, seg + 1)];
    const p3 = points[Math.min(len - 1, seg + 2)];

    return {
        x: catmullRom(lt, p0[0], p1[0], p2[0], p3[0]),
        y: catmullRom(lt, p0[1], p1[1], p2[1], p3[1]),
    };
}

// ─── AABB overlap ─────────────────────────────────────────────────────────────
function overlaps(ax: number, ay: number, ahw: number, ahh: number,
                  bx: number, by: number, bhw: number, bhh: number): boolean {
    return Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;
}

function circleOverlapsAabb(cx: number, cy: number, radius: number,
                            bx: number, by: number, bhw: number, bhh: number): boolean {
    const closestX = clamp(cx, bx - bhw, bx + bhw);
    const closestY = clamp(cy, by - bhh, by + bhh);
    const dx = cx - closestX;
    const dy = cy - closestY;

    return dx * dx + dy * dy < radius * radius;
}

function pointSegmentDistanceSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSq = abx * abx + aby * aby;
    const t = lengthSq > 0 ? clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1) : 0;
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy;
}

function pointAabbDistanceSq(px: number, py: number, rectX: number, rectY: number, rectHw: number, rectHh: number): number {
    const closestX = clamp(px, rectX - rectHw, rectX + rectHw);
    const closestY = clamp(py, rectY - rectHh, rectY + rectHh);
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy;
}

function segmentPointSide(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

function pointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): boolean {
    return Math.min(ax, bx) <= px + 0.0001
        && px <= Math.max(ax, bx) + 0.0001
        && Math.min(ay, by) <= py + 0.0001
        && py <= Math.max(ay, by) + 0.0001;
}

function segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
    const side1 = segmentPointSide(ax, ay, bx, by, cx, cy);
    const side2 = segmentPointSide(ax, ay, bx, by, dx, dy);
    const side3 = segmentPointSide(cx, cy, dx, dy, ax, ay);
    const side4 = segmentPointSide(cx, cy, dx, dy, bx, by);
    if (Math.abs(side1) < 0.0001 && pointOnSegment(cx, cy, ax, ay, bx, by)) return true;
    if (Math.abs(side2) < 0.0001 && pointOnSegment(dx, dy, ax, ay, bx, by)) return true;
    if (Math.abs(side3) < 0.0001 && pointOnSegment(ax, ay, cx, cy, dx, dy)) return true;
    if (Math.abs(side4) < 0.0001 && pointOnSegment(bx, by, cx, cy, dx, dy)) return true;
    return (side1 > 0) !== (side2 > 0) && (side3 > 0) !== (side4 > 0);
}

function segmentSegmentDistanceSq(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): number {
    if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
    return Math.min(
        pointSegmentDistanceSq(ax, ay, cx, cy, dx, dy),
        pointSegmentDistanceSq(bx, by, cx, cy, dx, dy),
        pointSegmentDistanceSq(cx, cy, ax, ay, bx, by),
        pointSegmentDistanceSq(dx, dy, ax, ay, bx, by),
    );
}

function capsuleOverlapsAabb(ax: number, ay: number, bx: number, by: number, radius: number,
                             rectX: number, rectY: number, rectHw: number, rectHh: number): boolean {
    const radiusSq = radius * radius;
    if (segmentAabbIntersectionT(ax, ay, bx, by, rectX, rectY, rectHw, rectHh) !== null) return true;
    if (pointAabbDistanceSq(ax, ay, rectX, rectY, rectHw, rectHh) <= radiusSq) return true;
    if (pointAabbDistanceSq(bx, by, rectX, rectY, rectHw, rectHh) <= radiusSq) return true;

    const left = rectX - rectHw;
    const right = rectX + rectHw;
    const top = rectY - rectHh;
    const bottom = rectY + rectHh;
    return segmentSegmentDistanceSq(ax, ay, bx, by, left, top, right, top) <= radiusSq
        || segmentSegmentDistanceSq(ax, ay, bx, by, right, top, right, bottom) <= radiusSq
        || segmentSegmentDistanceSq(ax, ay, bx, by, right, bottom, left, bottom) <= radiusSq
        || segmentSegmentDistanceSq(ax, ay, bx, by, left, bottom, left, top) <= radiusSq;
}

function capsuleOverlapsCircle(ax: number, ay: number, bx: number, by: number, capsuleRadius: number,
                               circleX: number, circleY: number, circleRadius: number): boolean {
    const radius = capsuleRadius + circleRadius;
    return pointSegmentDistanceSq(circleX, circleY, ax, ay, bx, by) <= radius * radius;
}

function segmentAabbIntersectionT(ax: number, ay: number, bx: number, by: number,
                                  rectX: number, rectY: number, rectHw: number, rectHh: number): number | null {
    const dx = bx - ax;
    const dy = by - ay;
    let tMin = 0;
    let tMax = 1;

    const slabs: [number, number, number][] = [
        [ax, dx, rectX - rectHw],
        [ax, dx, rectX + rectHw],
        [ay, dy, rectY - rectHh],
        [ay, dy, rectY + rectHh],
    ];

    for (let i = 0; i < slabs.length; i += 2) {
        const origin = slabs[i][0];
        const delta = slabs[i][1];
        const min = slabs[i][2];
        const max = slabs[i + 1][2];

        if (Math.abs(delta) < 0.0001) {
            if (origin < min || origin > max) return null;
            continue;
        }

        let near = (min - origin) / delta;
        let far = (max - origin) / delta;
        if (near > far) [near, far] = [far, near];
        tMin = Math.max(tMin, near);
        tMax = Math.min(tMax, far);
        if (tMin > tMax) return null;
    }

    return tMin;
}

// ─── Enemy path data (identical to EnemyFlying.js) ────────────────────────────
const ENEMY_PATHS: [number, number][][] = [
    [[200, -50],  [1080, 160], [200, 340],  [1080, 520], [200, 700],  [1080, 780]],
    [[-50, 200],  [1330, 200], [1330, 400], [-50, 400],  [-50, 600],  [1330, 600]],
    [[-50, 360],  [640, 50],   [1180, 360], [640, 670],  [50, 360],   [640, 50],   [1180, 360], [640, 670], [-50, 360]],
    [[1330, 360], [640, 50],   [50, 360],   [640, 670],  [1180, 360], [640, 50],   [50, 360],   [640, 670], [1330, 360]],
];

// ─── Server-side (non-synced) private state ───────────────────────────────────
interface ServerPlayer {
    vx: number; vy: number;
    fireCounter: number;   // ms remaining until next allowed shot
    attackLockMs: number;
    attackLockX: number;
    attackLockY: number;
    attackCooldownMs: number;
    dashMs: number;
    dashDirX: number;
    dashDirY: number;
    dashCooldownMs: number;
    bowCharging: boolean;
    bowChargeMs: number;
    bowChargeX: number;
    bowChargeY: number;
    bowAimX: number;
    bowAimY: number;
    bowChargeMoveLeft: boolean;
    bowChargeMoveRight: boolean;
    bowChargeMoveUp: boolean;
    bowChargeMoveDown: boolean;
    bowVolleyActive: boolean;
    bowVolleyLockX: number;
    bowVolleyLockY: number;
    bowVolleyTargetX: number;
    bowVolleyTargetY: number;
    bowVolleyCooldownMs: number;
    axeWhirlwind: boolean;
    axeWhirlwindTickMs: number;
    axeWhirlwindElapsedMs: number;
    axeWhirlwindCooldownMs: number;
    shieldBlockCooldownMs: number;
    shieldRegenMs: number;
    pickupCheckMs: number;
    revivingTargetId: string | null;
    invulnerableUntilMs: number;
    input: { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean; interact: boolean };
    alive: boolean;
}
type EnemyMode = "chase" | "windup" | "attack" | "casterCharge" | "casterAttack" | "dkWalk" | "dkRush" | "dkAttack" | "dkCooldown" | "bossFuse" | "stun";
type DarkKnightTargetKind = "playerMark" | null;
interface PathCell { col: number; row: number; }
interface EnemyTarget {
    id: string;
    player: PlayerState;
    targetX: number;
    targetY: number;
    targetFootX: number;
    targetFootY: number;
    targetCell: PathCell;
    distanceSq: number;
}
type EnemyLineOfSightKind = "melee" | "caster" | "darkKnight";
interface EnemyFlowField {
    targetCell: PathCell;
    topologyVersion: number;
    dirX: Int8Array;
    dirY: Int8Array;
    distance: Int16Array;
}
interface ServerEnemy {
    mode: EnemyMode;
    modeMs: number;
    targetId: string | null;
    previousTargetId: string | null;
    bossBombId: string | null;
    bossBombX: number;
    bossBombY: number;
    bossBombRadius: number;
    darkKnightTargetKind: DarkKnightTargetKind;
    darkKnightMarkX: number;
    darkKnightMarkY: number;
    path: PathCell[];
    pathTargetCell: PathCell | null;
    pathTopologyVersion: number;
    repathMs: number;
    directPathFromCell: PathCell | null;
    directPathTargetCell: PathCell | null;
    directPathTopologyVersion: number;
    directPathCheckMs: number;
    directPathClear: boolean;
    lineOfSightFromCell: PathCell | null;
    lineOfSightTargetCell: PathCell | null;
    lineOfSightTopologyVersion: number;
    lineOfSightCheckMs: number;
    lineOfSightClear: boolean;
    lineOfSightTargetId: string | null;
    lineOfSightKind: EnemyLineOfSightKind | null;
    caltropsSlowMs: number;
    caltropsCheckMs: number;
    meleeAttackToken: number;
}
interface ServerBullet {
    vx: number;
    vy: number;
    rangeRemaining: number;
    kind: string;
    damage: number;
    pierceRemaining: number;
    hitEnemyIds: Set<string>;
}
interface ServerEnemyBullet {
    vx: number;
    vy: number;
    kind: string;
}
interface AttackOrigin {
    x: number;
    y: number;
}
interface AttackVector {
    x: number;
    y: number;
}
interface MapTileCollider {
    x: number;
    y: number;
    halfWidth: number;
    halfHeight: number;
}
interface CaltropsPoint {
    x: number;
    y: number;
}
interface ActiveAxeAttack {
    attackerId: string;
    direction: string;
    targetX: unknown;
    targetY: unknown;
    remainingMs: number;
    hitEnemyIds: Set<string>;
}
interface TreeHitPayload {
    treeId: string;
    attackerId: string;
    x: number;
    y: number;
    remainingHealth: number;
}
interface EnemyHitPayload {
    enemyId: string;
    attackerId: string;
    x: number;
    y: number;
    remainingHealth: number;
}
interface PlayerHurtPayload {
    playerId: string;
    attackerId: string;
    x: number;
    y: number;
    health: number;
}
interface PendingEnemySpawn {
    enemyType: number;
    edgeIndex: number;
    spawnAtMs: number;
}
interface TickMetrics {
    phases: Record<string, number>;
    playerSubphases: Record<string, number>;
    counters: Record<string, number>;
    enemySubphases: Record<string, number>;
    enemyCounters: Record<string, number>;
    spawnedEnemies: number;
    scheduledWaveIndex: number | null;
    scheduledEnemyCount: number;
    separationChecks: number;
    separationResolutions: number;
    slowestEnemy: {
        id: string;
        enemyType: number;
        mode: string;
        ms: number;
        x: number;
        y: number;
        pathLength: number;
        targetId: string | null;
    } | null;
    slowestPlayer: {
        id: string;
        ms: number;
        x: number;
        y: number;
        alive: boolean;
        dead: boolean;
        dashing: boolean;
        bowCharging: boolean;
        axeWhirlwind: boolean;
        input: string;
    } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _id = 0;
const nextId  = () => String(++_id);
const rndInt  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndReal = (min: number, max: number) => Math.random() * (max - min) + min;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

class MinHeap<T> {
    private items: T[] = [];

    constructor(private readonly compare: (a: T, b: T) => number) {}

    get length(): number {
        return this.items.length;
    }

    push(item: T): void {
        this.items.push(item);
        this.bubbleUp(this.items.length - 1);
    }

    pop(): T | undefined {
        if (this.items.length === 0) return undefined;
        const first = this.items[0];
        const last = this.items.pop()!;
        if (this.items.length > 0) {
            this.items[0] = last;
            this.bubbleDown(0);
        }
        return first;
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.compare(this.items[index], this.items[parent]) >= 0) break;
            [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]];
            index = parent;
        }
    }

    private bubbleDown(index: number): void {
        while (true) {
            const left = index * 2 + 1;
            const right = left + 1;
            let smallest = index;
            if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) {
                smallest = left;
            }
            if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) {
                smallest = right;
            }
            if (smallest === index) break;
            [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
            index = smallest;
        }
    }
}

function sanitizeDisplayName(value: unknown): string {
    const name = String(value ?? "")
        .toUpperCase()
        .replace(/[^A-Z ]/g, "")
        .replace(/ +/g, " ")
        .trim()
        .slice(0, 12)
        .trim();
    return name || "PLAYER";
}

function directionFromInput(inputX: number, inputY: number): string | null {
    if (Math.hypot(inputX, inputY) <= 0.0001) return null;

    const angle = Math.atan2(inputY, inputX);
    const octant = Math.round(angle / (Math.PI / 4));
    const index = (octant + 8) % 8;
    return ["E", "SE", "S", "SW", "W", "NW", "N", "NE"][index];
}

function normalizeAttackDirection(direction: unknown, fallback: string): string {
    return typeof direction === "string" && VALID_DIRECTIONS.has(direction) ? direction : fallback;
}

// ─── Room code registry (process-local) ──────────────────────────────────────
// Tracks codes in use to avoid collisions within the same server process.
const _usedCodes = new Set<string>();

interface ShmupRoomMetadata {
    mode: string;
    gameStarted: boolean;
    gameOver: boolean;
    activeMapName: string;
}

export class ShmupRoom extends Room<GameRoomState, ShmupRoomMetadata> {
    maxClients = 8;

    private serverPlayers       = new Map<string, ServerPlayer>();
    private serverEnemies       = new Map<string, ServerEnemy>();
    private serverPlayerBullets = new Map<string, ServerBullet>();
    private serverEnemyBullets  = new Map<string, ServerEnemyBullet>();
    private serverTreeHealth    = new Map<string, number>();
    private campfireOwners      = new Map<string, string>();
    private activeAxeAttacks: ActiveAxeAttack[] = [];
    private elapsedMs           = 0;
    private currentWaveIndex = -1;
    private pendingEnemySpawns: PendingEnemySpawn[] = [];
    private currentWaveStartedAtMs = 0;
    private currentWaveScheduledEnemyCount = 0;
    private currentWaveSpawnedEnemyCount = 0;
    private currentWaveMaxActiveEnemies = 0;
    private nextEnemySpawnAllowedAtMs = 0;
    private nextEnemyWaveStartMs: number | null = null;
    private nextWaveReadyPlayerIds = new Set<string>();
    private gameOverRetryReadyPlayerIds = new Set<string>();
    private nextEnemyDiagnosticAtMs = 0;
    private campfireHealElapsedMs = 0;
    private gameOverRestartMs   = 0;
    private mapTiles = new Map<string, { layer1: Uint16Array; layer2: Uint16Array }>();
    private mapTileCount = 0;
    private caltropsByBuildCell = new Map<string, CaltropsPoint[]>();
    private buildPathBlockedCells = new Set<string>();
    private buildPathBlockedGrid = new Uint8Array(BUILD_PATH_CELL_COUNT);
    private mapTopologyVersion = 0;
    private solidSegmentCache = new Map<string, boolean>();
    private enemyFlowFields = new Map<string, EnemyFlowField>();
    private enemyTargetCache = new Map<string, Omit<EnemyTarget, "id" | "player" | "distanceSq"> | null>();
    private enemyFlowBuildQueue = new Int32Array(BUILD_PATH_CELL_COUNT);
    private readonly mapStorage = new MapStorage();
    private activeTickMetrics: TickMetrics | null = null;
    private recordingEnemyMetrics = false;
    private enemyPathBuildsThisTick = 0;
    private enemyFlowBuildsThisTick = 0;
    private radioPlaylistOrder: number[] = [];
    private lastRadioTrackIndex = -1;

    private generateRoomCode(): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let code: string;
        do {
            code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 26)]).join("");
        } while (_usedCodes.has(code));
        _usedCodes.add(code);
        return code;
    }

    private logRoomEvent(event: string, fields: Record<string, string | number | boolean | null | undefined> = {}): void {
        const details = Object.entries(fields)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ");
        console.log(`[ShmupRoom ${this.roomId}] ${event}${details ? `: ${details}` : ""}`);
    }

    private updateRoomListingMetadata(): void {
        void this.setMetadata({
            mode: this.state.mode,
            gameStarted: this.state.gameStarted,
            gameOver: this.state.gameOver,
            activeMapName: this.state.activeMapName || "",
        }).catch((error) => {
            console.warn(`[ShmupRoom ${this.roomId}] unable to update room listing metadata:`, error);
        });
    }

    async onCreate(options: { mode?: unknown; mapName?: unknown } = {}) {
        this.roomId = this.generateRoomCode();
        const state = new GameRoomState();
        const mapEditorRequested = options.mode === MAP_EDITOR_MODE;
        const isProduction = isProductionEnv();
        const isMapEditor = mapEditorRequested && !isProduction;
        const requestedMapName = !isMapEditor
            ? isProduction
                ? PRODUCTION_GAME_MAP_NAME
                : normalizeMapName(options.mapName)
            : null;
        state.mode = isMapEditor ? MAP_EDITOR_MODE : "game";
        state.worldWidth = isMapEditor ? EDITOR_WORLD_WIDTH : WORLD_WIDTH;
        state.worldHeight = isMapEditor ? EDITOR_WORLD_HEIGHT : WORLD_HEIGHT;
        this.setState(state);
        if (requestedMapName) {
            try {
                await this.loadInitialGameMap(requestedMapName);
            } catch (error) {
                _usedCodes.delete(this.roomId);
                throw error;
            }
        }
        if (!isMapEditor) this.generateTrees();
        this.updateRoomListingMetadata();
        this.logRoomEvent("room created", {
            mode: state.mode,
            map: this.state.activeMapName || "none",
            requestedMap: requestedMapName || "none",
            nodeEnv: process.env.NODE_ENV || "unset",
            world: `${state.worldWidth}x${state.worldHeight}`,
            mapChunks: this.state.mapChunks.size,
            mapTiles: this.mapTileCount,
            trees: this.state.trees.size,
        });
        // 20 ticks per second
        this.setSimulationInterval((dt) => this.tick(dt), 50);

        this.onMessage("input", (client, data) => {
            const sp = this.serverPlayers.get(client.sessionId);
            if (!sp) return;
            if (!sp.alive) {
                sp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
                sp.vx = 0;
                sp.vy = 0;
                return;
            }
            const wasInteracting = sp.input.interact;
            const isInteracting = !!data.interact;
            sp.input.left  = !!data.left;
            sp.input.right = !!data.right;
            sp.input.up    = !!data.up;
            sp.input.down  = !!data.down;
            sp.input.fire  = !!data.fire;
            sp.input.interact = isInteracting;

            if (isInteracting && !wasInteracting) {
                if (this.tryStartRevive(client.sessionId, client)) {
                    return;
                }
            }
        });

        this.onMessage("attack", (client, data) => {
            const sp = this.serverPlayers.get(client.sessionId);
            const player = this.state.players.get(client.sessionId);
            if (!sp || !sp.alive || !player || this.state.gameOver) return;
            if (sp.attackCooldownMs > 0) return;
            if (player.activeItem !== ITEM_WOOD_AXE && !this.isShieldItem(player.activeItem)) return;
            this.cancelRevive(client.sessionId);

            const attackDirection = normalizeAttackDirection(data?.direction, player.facingDirection || "N");
            const attackItem = player.activeItem;
            player.facingDirection = attackDirection;
            player.attackDirection = attackDirection;
            player.attackItem = attackItem;
            player.attackSeq++;
            const targetX = data?.targetX;
            const targetY = data?.targetY;

            if (this.isShieldItem(attackItem)) {
                sp.attackCooldownMs = this.getPlayerShieldBashCooldownMs(player);
                this.applyShieldBash(client.sessionId, attackDirection, targetX, targetY);
                return;
            }

            sp.attackCooldownMs = this.getPlayerAxeCooldownMs(player);
            setTimeout(() => {
                this.applyDelayedTreeAttackImpact(client.sessionId, attackDirection, targetX, targetY);
            }, TREE_ATTACK_IMPACT_DELAY_MS);
            setTimeout(() => {
                this.startLingeringAxeEnemyAttack(client.sessionId, attackDirection, targetX, targetY);
            }, ENEMY_ATTACK_IMPACT_DELAY_MS);
        });

        this.onMessage("bowChargeStart", (client, data) => {
            this.startBowCharge(client.sessionId, data);
        });

        this.onMessage("bowAim", (client, data) => {
            this.updateBowAim(client.sessionId, data);
        });

        this.onMessage("bowCancel", (client) => {
            const sp = this.serverPlayers.get(client.sessionId);
            const player = this.state.players.get(client.sessionId);
            if (sp && player && !sp.bowVolleyActive) this.clearBowCharge(player, sp);
        });

        this.onMessage("bowVolleyStart", (client, data) => {
            this.startBowVolley(client.sessionId, data);
        });

        this.onMessage("bowVolleyAim", (client, data) => {
            this.updateBowVolleyAim(client.sessionId, data);
        });

        this.onMessage("bowVolleyRelease", (client, data) => {
            this.releaseBowVolley(client.sessionId, data);
        });

        this.onMessage("bowVolleyCancel", (client) => {
            this.cancelBowVolley(client.sessionId);
        });

        this.onMessage("dash", (client) => {
            this.tryDashPlayer(client.sessionId);
        });

        this.onMessage("axeWhirlwind", (client, data) => {
            this.setAxeWhirlwind(client.sessionId, !!(data as { active?: unknown })?.active);
        });

        this.onMessage("shieldBlockStart", (client) => {
            this.setShieldBlocking(client.sessionId, true);
        });

        this.onMessage("shieldBlockStop", (client) => {
            this.setShieldBlocking(client.sessionId, false);
        });

        this.onMessage("equipSlot", (client, data) => {
            this.equipPlayerSlot(client.sessionId, data);
        });

        this.onMessage("swapHotbarSlots", (client, data) => {
            this.swapPlayerHotbarSlots(client.sessionId, data);
        });

        this.onMessage("removeDeployable", (client, data) => {
            this.tryRemoveDeployable(client.sessionId, data);
        });

        this.onMessage("removeWoodBlock", (client, data) => {
            this.tryRemoveDeployable(client.sessionId, data);
        });

        this.onMessage("placeCampfire", (client, data) => {
            this.tryPlaceCampfire(client.sessionId, data);
        });

        this.onMessage("placeCaltrops", (client, data) => {
            this.tryPlaceCaltrops(client.sessionId, data);
        });

        this.onMessage("craftItem", (client, data) => {
            this.tryCraftItem(client, data);
        });

        this.onMessage("selectUpgrade", (client, data) => {
            this.selectUpgrade(client, data);
        });

        this.onMessage("refundUpgradeTree", (client, data) => {
            this.refundUpgradeTree(client, data);
        });

        this.onMessage("setOutfitColor", (client, data) => {
            this.setPlayerOutfitColor(client.sessionId, data);
        });

        this.onMessage("placeMapTile", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            this.placeMapTile(data);
        });

        this.onMessage("removeMapTile", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            this.removeMapTile(data);
        });

        this.onMessage("placeEnchantmentTable", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            this.placeEnchantmentTable(data);
        });

        this.onMessage("removeEnchantmentTable", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            this.removeEnchantmentTable(data);
        });

        this.onMessage("placeCraftingTable", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            this.placeCraftingTable(data);
        });

        this.onMessage("removeCraftingTable", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            this.removeCraftingTable(data);
        });

        this.onMessage("replaceMap", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            const accepted = this.replaceMap(data);
            client.send("mapImported", { accepted });
        });

        this.onMessage("saveMap", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            void this.saveMap(client, data);
        });

        this.onMessage("loadMap", (client, data) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            void this.loadMap(client, data);
        });

        this.onMessage("listMaps", (client) => {
            if (!this.isMapEditor() || !this.state.players.has(client.sessionId)) return;
            void this.sendMapList(client);
        });

        this.onMessage("debugSetRound", (client, data) => {
            this.debugSetRound(client, data);
        });

        this.onMessage("debugSetLevel", (client, data) => {
            this.debugSetLevel(client, data);
        });

        this.onMessage("readyForNextWave", (client) => {
            this.readyPlayerForNextWave(client.sessionId);
        });

        this.onMessage("retryGame", (client) => {
            this.readyPlayerForGameOverRetry(client.sessionId);
        });
    }

    private debugSetRound(client: Client, data: unknown) {
        const round = Number((data as { round?: unknown })?.round);
        const currentRound = this.currentWaveIndex + 1;
        const reject = (reason: string) => client.send("debugRoundResult", { accepted: false, reason });

        if (!this.state.players.has(client.sessionId) || !this.state.gameStarted || this.state.gameOver) {
            reject("The game is not active.");
            return;
        }
        if (!Number.isInteger(round) || round < 2 || round > DEBUG_MAX_ROUND) {
            reject(`Enter a whole round from 2 to ${DEBUG_MAX_ROUND}.`);
            return;
        }
        if (round <= currentRound) {
            reject(`Round must be later than ${currentRound}.`);
            return;
        }

        const targetWaveIndex = round - 1;
        this.state.enemies.clear();
        this.serverEnemies.clear();
        this.state.enemyBullets.clear();
        this.serverEnemyBullets.clear();
        this.pendingEnemySpawns = [];
        this.currentWaveIndex = targetWaveIndex - 1;
        this.nextEnemySpawnAllowedAtMs = this.elapsedMs;
        this.clearNextWaveReadyState();
        this.nextEnemyDiagnosticAtMs = 0;
        this.scheduleEnemyWave(targetWaveIndex);
        client.send("debugRoundResult", { accepted: true, round });
    }

    private debugSetLevel(client: Client, data: unknown) {
        const level = Number((data as { level?: unknown })?.level);
        const player = this.state.players.get(client.sessionId);
        const reject = (reason: string) => client.send("debugLevelResult", { accepted: false, reason });

        if (!player || !this.state.gameStarted || this.state.gameOver) {
            reject("The game is not active.");
            return;
        }
        if (player.isDead) {
            reject("You cannot set level while downed.");
            return;
        }
        if (!Number.isInteger(level) || level < 1 || level > DEBUG_MAX_PLAYER_LEVEL) {
            reject(`Enter a whole level from 1 to ${DEBUG_MAX_PLAYER_LEVEL}.`);
            return;
        }

        const previousLevel = Math.max(1, Math.floor(player.level || 1));
        const levelDelta = level - previousLevel;
        player.level = level;
        player.experience = 0;
        player.experienceToNext = this.getExperienceToNextLevel(level);
        player.pendingUpgradeChoices = Math.max(0, Math.floor(player.pendingUpgradeChoices || 0) + levelDelta);
        player.maxHealth = PLAYER_MAX_HEALTH + Math.max(0, level - 1);
        player.health = clamp(player.health, 1, player.maxHealth);
        if (levelDelta > 0) player.health = player.maxHealth;

        client.send("debugLevelResult", { accepted: true, level });
        if (levelDelta > 0) {
            this.broadcast("playerLevelUp", {
                playerId: client.sessionId,
                level: player.level,
                x: player.x,
                y: player.y,
            });
        }
    }

    private isMapEditor(): boolean {
        return this.state.mode === MAP_EDITOR_MODE;
    }

    private mapColumnCount(): number {
        return Math.floor(this.playableWorldWidth() / MAP_TILE_SIZE);
    }

    private mapRowCount(): number {
        return Math.floor(this.playableWorldHeight() / MAP_TILE_SIZE);
    }

    private playableWorldWidth(): number {
        return this.isMapEditor() ? WORLD_WIDTH : this.state.worldWidth;
    }

    private playableWorldHeight(): number {
        return this.isMapEditor() ? WORLD_HEIGHT : this.state.worldHeight;
    }

    private isMapCellInside(col: number, row: number): boolean {
        return Number.isInteger(col) && Number.isInteger(row)
            && col >= 0 && row >= 0
            && col < this.mapColumnCount() && row < this.mapRowCount();
    }

    private mapChunkKey(chunkCol: number, chunkRow: number): string {
        return `${chunkCol}:${chunkRow}`;
    }

    private parseMapChunkKey(value: unknown): { chunkCol: number; chunkRow: number } | null {
        if (typeof value !== "string") return null;
        const match = /^(\d+):(\d+)$/.exec(value);
        if (!match) return null;
        const chunkCol = Number(match[1]);
        const chunkRow = Number(match[2]);
        if (!Number.isSafeInteger(chunkCol) || !Number.isSafeInteger(chunkRow)) return null;
        const firstCol = chunkCol * MAP_CHUNK_SIZE;
        const firstRow = chunkRow * MAP_CHUNK_SIZE;
        if (!this.isMapCellInside(firstCol, firstRow)) return null;
        return { chunkCol, chunkRow };
    }

    private parseSourceChunkKey(value: unknown, sourceWidth: number, sourceHeight: number, sourceTileSize = MAP_TILE_SIZE): { chunkCol: number; chunkRow: number } | null {
        if (typeof value !== "string") return null;
        const match = /^(\d+):(\d+)$/.exec(value);
        if (!match) return null;
        const chunkCol = Number(match[1]);
        const chunkRow = Number(match[2]);
        if (!Number.isSafeInteger(chunkCol) || !Number.isSafeInteger(chunkRow)) return null;
        const firstCol = chunkCol * MAP_CHUNK_SIZE;
        const firstRow = chunkRow * MAP_CHUNK_SIZE;
        const sourceColumns = Math.floor(sourceWidth / sourceTileSize);
        const sourceRows = Math.floor(sourceHeight / sourceTileSize);
        if (firstCol < 0 || firstRow < 0 || firstCol >= sourceColumns || firstRow >= sourceRows) return null;
        return { chunkCol, chunkRow };
    }

    private encodeMapChunk(cells: Uint16Array): string {
        const buffer = Buffer.alloc(MAP_CHUNK_ENCODED_BYTES);
        for (let index = 0; index < MAP_CHUNK_CELL_COUNT; index++) {
            buffer.writeUInt16LE(cells[index], index * 2);
        }
        return buffer.toString("base64");
    }

    private decodeMapChunk(value: unknown): Uint16Array | null {
        if (typeof value !== "string" || value.length !== MAP_CHUNK_ENCODED_LENGTH) return null;
        let buffer: Buffer;
        try {
            buffer = Buffer.from(value, "base64");
        } catch (_error) {
            return null;
        }
        if (buffer.length !== MAP_CHUNK_ENCODED_BYTES) return null;
        const cells = new Uint16Array(MAP_CHUNK_CELL_COUNT);
        for (let index = 0; index < MAP_CHUNK_CELL_COUNT; index++) {
            const tile = buffer.readUInt16LE(index * 2);
            if (tile > MAP_FRAME_COUNT) return null;
            cells[index] = tile;
        }
        return cells;
    }

    private getMapChunkCells(chunkCol: number, chunkRow: number, layer: 1 | 2, create = false): Uint16Array | null {
        const key = this.mapChunkKey(chunkCol, chunkRow);
        let chunk = this.mapTiles.get(key);
        if (!chunk && create) {
            chunk = {
                layer1: new Uint16Array(MAP_CHUNK_CELL_COUNT),
                layer2: new Uint16Array(MAP_CHUNK_CELL_COUNT),
            };
            this.mapTiles.set(key, chunk);
        }
        return chunk ? (layer === 1 ? chunk.layer1 : chunk.layer2) : null;
    }

    private syncMapChunk(chunkCol: number, chunkRow: number): void {
        const key = this.mapChunkKey(chunkCol, chunkRow);
        const chunk = this.mapTiles.get(key);
        if (!chunk) {
            this.state.mapChunks.delete(key);
            return;
        }
        let stateChunk = this.state.mapChunks.get(key);
        if (!stateChunk) {
            stateChunk = new MapChunkState();
            this.state.mapChunks.set(key, stateChunk);
        }
        stateChunk.layer1 = this.encodeMapChunk(chunk.layer1);
        stateChunk.layer2 = this.encodeMapChunk(chunk.layer2);
    }

    private mapChunkHasTiles(cells: Uint16Array): boolean {
        return cells.some((value) => value !== 0);
    }

    private getMapTileValue(col: number, row: number, layer: 1 | 2): number {
        if (!this.isMapCellInside(col, row)) return 0;
        const chunkCol = Math.floor(col / MAP_CHUNK_SIZE);
        const chunkRow = Math.floor(row / MAP_CHUNK_SIZE);
        const cells = this.getMapChunkCells(chunkCol, chunkRow, layer);
        if (!cells) return 0;
        const localCol = col % MAP_CHUNK_SIZE;
        const localRow = row % MAP_CHUNK_SIZE;
        return cells[localRow * MAP_CHUNK_SIZE + localCol];
    }

    private isSolidMapFrame(frame: number): boolean {
        return SOLID_MAP_FRAMES.has(frame);
    }

    private getTopMapFrameAtWorldPoint(x: number, y: number): number | null {
        const col = Math.floor(x / MAP_TILE_SIZE);
        const row = Math.floor(y / MAP_TILE_SIZE);
        if (!this.isMapCellInside(col, row)) return null;
        const layer2 = this.getMapTileValue(col, row, 2);
        if (layer2 > 0) return layer2 - 1;
        const layer1 = this.getMapTileValue(col, row, 1);
        return layer1 > 0 ? layer1 - 1 : null;
    }

    private isTreeSpawnGroundCell(col: number, row: number): boolean {
        if (!this.isMapCellInside(col, row)) return false;
        const layer2 = this.getMapTileValue(col, row, 2);
        if (layer2 > 0) return TREE_SPAWN_GROUND_FRAMES.has(layer2 - 1);
        const layer1 = this.getMapTileValue(col, row, 1);
        return layer1 > 0 && TREE_SPAWN_GROUND_FRAMES.has(layer1 - 1);
    }

    private rebuildMapDerivedCaches(): void {
        this.rebuildCaltropsIndex();
        this.rebuildBuildPathBlockedCells();
        this.invalidateNavigationCaches();
    }

    private invalidateNavigationCaches(): void {
        this.mapTopologyVersion++;
        this.solidSegmentCache.clear();
        this.enemyFlowFields.clear();
        this.serverEnemies.forEach((se) => {
            se.path = [];
            se.pathTargetCell = null;
            se.pathTopologyVersion = this.mapTopologyVersion;
            se.repathMs = 0;
            se.directPathFromCell = null;
            se.directPathTargetCell = null;
            se.directPathTopologyVersion = this.mapTopologyVersion;
            se.directPathCheckMs = 0;
            se.directPathClear = false;
            se.lineOfSightFromCell = null;
            se.lineOfSightTargetCell = null;
            se.lineOfSightTopologyVersion = this.mapTopologyVersion;
            se.lineOfSightCheckMs = 0;
            se.lineOfSightClear = false;
            se.lineOfSightTargetId = null;
            se.lineOfSightKind = null;
        });
    }

    private updateMapCellDerivedCaches(col: number, row: number): void {
        this.rebuildCaltropsIndex();
        this.refreshBuildPathBlockedCellsNear(col, row);
        this.invalidateNavigationCaches();
    }

    private addCaltropsIndexPoint(x: number, y: number): void {
        const cell = this.worldToBuildCell(x, y);
        const key = this.buildCellKey(cell.col, cell.row);
        const bucket = this.caltropsByBuildCell.get(key);
        if (bucket) {
            bucket.push({ x, y });
        } else {
            this.caltropsByBuildCell.set(key, [{ x, y }]);
        }
    }

    private rebuildCaltropsIndex(): void {
        this.caltropsByBuildCell.clear();
        this.state.caltrops.forEach((caltrops) => {
            this.addCaltropsIndexPoint(caltrops.x, caltrops.y);
        });
        this.mapTiles.forEach((chunk, key) => {
            const position = this.parseMapChunkKey(key);
            if (!position) return;
            for (let localRow = 0; localRow < MAP_CHUNK_SIZE; localRow++) {
                for (let localCol = 0; localCol < MAP_CHUNK_SIZE; localCol++) {
                    const index = localRow * MAP_CHUNK_SIZE + localCol;
                    if (chunk.layer1[index] !== CALTROPS_FRAME + 1 && chunk.layer2[index] !== CALTROPS_FRAME + 1) continue;
                    const col = position.chunkCol * MAP_CHUNK_SIZE + localCol;
                    const row = position.chunkRow * MAP_CHUNK_SIZE + localRow;
                    if (!this.isMapCellInside(col, row)) continue;
                    this.addCaltropsIndexPoint(
                        col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5,
                        row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5,
                    );
                }
            }
        });
    }

    private rebuildBuildPathBlockedCells(): void {
        this.buildPathBlockedCells.clear();
        this.buildPathBlockedGrid.fill(0);
        const columns = this.buildPathColumnCount();
        const rows = this.buildPathRowCount();
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                if (this.computeBuildPathCellBlocked(col, row)) {
                    this.buildPathBlockedCells.add(this.buildCellKey(col, row));
                    this.buildPathBlockedGrid[this.buildCellIndex(col, row)] = 1;
                }
            }
        }
    }

    private refreshBuildPathBlockedCellsNear(mapCol: number, mapRow: number): void {
        for (let row = mapRow - 1; row <= mapRow + 1; row++) {
            for (let col = mapCol - 1; col <= mapCol + 1; col++) {
                if (!this.isBuildPathCellInside(col, row)) continue;
                const key = this.buildCellKey(col, row);
                const index = this.buildCellIndex(col, row);
                if (this.computeBuildPathCellBlocked(col, row)) {
                    this.buildPathBlockedCells.add(key);
                    this.buildPathBlockedGrid[index] = 1;
                } else {
                    this.buildPathBlockedCells.delete(key);
                    this.buildPathBlockedGrid[index] = 0;
                }
            }
        }
    }

    private buildPathColumnCount(): number {
        return BUILD_PATH_COLUMNS;
    }

    private buildPathRowCount(): number {
        return BUILD_PATH_ROWS;
    }

    private placeMapTile(data: unknown): void {
        const payload = data as { col?: unknown; row?: unknown; frame?: unknown; layer?: unknown } | null;
        const col = Number(payload?.col);
        const row = Number(payload?.row);
        const frame = Number(payload?.frame);
        const layer = Number(payload?.layer) === 2 ? 2 : 1;
        if (!this.isMapCellInside(col, row) || !Number.isInteger(frame) || frame < 0 || frame >= MAP_FRAME_COUNT) return;
        const nextValue = frame + 1;
        const previousValue = this.getMapTileValue(col, row, layer);
        if (previousValue === nextValue) return;
        if (previousValue === 0 && this.mapTileCount >= MAP_MAX_FILLED_CELLS) return;
        if (this.isSolidMapFrame(frame) && this.mapCellOverlapsPlayer(col, row, frame)) return;

        const chunkCol = Math.floor(col / MAP_CHUNK_SIZE);
        const chunkRow = Math.floor(row / MAP_CHUNK_SIZE);
        const cells = this.getMapChunkCells(chunkCol, chunkRow, layer, true)!;
        const index = (row % MAP_CHUNK_SIZE) * MAP_CHUNK_SIZE + (col % MAP_CHUNK_SIZE);
        cells[index] = nextValue;
        if (previousValue === 0) this.mapTileCount++;
        this.syncMapChunk(chunkCol, chunkRow);
        this.updateMapCellDerivedCaches(col, row);
    }

    private removeMapTile(data: unknown): void {
        const payload = data as { col?: unknown; row?: unknown; layer?: unknown } | null;
        const col = Number(payload?.col);
        const row = Number(payload?.row);
        const layer = Number(payload?.layer) === 2 ? 2 : 1;
        if (!this.isMapCellInside(col, row)) return;
        const previousValue = this.getMapTileValue(col, row, layer);
        if (previousValue === 0) return;
        const chunkCol = Math.floor(col / MAP_CHUNK_SIZE);
        const chunkRow = Math.floor(row / MAP_CHUNK_SIZE);
        const cells = this.getMapChunkCells(chunkCol, chunkRow, layer)!;
        const index = (row % MAP_CHUNK_SIZE) * MAP_CHUNK_SIZE + (col % MAP_CHUNK_SIZE);
        cells[index] = 0;
        this.mapTileCount--;
        const otherLayer = this.getMapChunkCells(chunkCol, chunkRow, layer === 1 ? 2 : 1)!;
        if (this.mapChunkHasTiles(cells) || this.mapChunkHasTiles(otherLayer)) {
            this.syncMapChunk(chunkCol, chunkRow);
        } else {
            this.mapTiles.delete(this.mapChunkKey(chunkCol, chunkRow));
            this.syncMapChunk(chunkCol, chunkRow);
        }
        this.updateMapCellDerivedCaches(col, row);
    }

    private placeEnchantmentTable(data: unknown): void {
        const cell = this.getMapObjectCellFromData(data);
        if (!cell || !this.isLayer3RowObjectCellInside(cell.col, cell.row)) return;
        if (this.layer3RowObjectOverlapsPlayer(cell.col, cell.row)) return;
        if (this.layer3RowObjectOverlapsAnyTable(cell.col, cell.row, this.getEnchantmentTableIdForCell(cell.col, cell.row))) return;

        const table = this.createEnchantmentTableState(cell.col, cell.row);
        this.state.enchantmentTables.set(table.id, table);
        this.rebuildBuildPathBlockedCells();
        this.invalidateNavigationCaches();
    }

    private removeEnchantmentTable(data: unknown): void {
        const cell = this.getMapObjectCellFromData(data);
        if (!cell) return;

        const directId = this.getEnchantmentTableIdForCell(cell.col, cell.row);
        if (this.state.enchantmentTables.delete(directId)) {
            this.rebuildBuildPathBlockedCells();
            this.invalidateNavigationCaches();
            return;
        }

        let removed = false;
        this.state.enchantmentTables.forEach((table, id) => {
            const insideX = cell.col >= table.col && cell.col <= table.col + 1;
            const insideY = cell.row === table.row;
            if (insideX && insideY) {
                this.state.enchantmentTables.delete(id);
                removed = true;
            }
        });
        if (removed) {
            this.rebuildBuildPathBlockedCells();
            this.invalidateNavigationCaches();
        }
    }

    private placeCraftingTable(data: unknown): void {
        const cell = this.getMapObjectCellFromData(data);
        if (!cell || !this.isLayer3RowObjectCellInside(cell.col, cell.row)) return;
        if (this.layer3RowObjectOverlapsPlayer(cell.col, cell.row)) return;
        if (this.layer3RowObjectOverlapsAnyTable(cell.col, cell.row, this.getCraftingTableIdForCell(cell.col, cell.row))) return;

        const table = this.createCraftingTableState(cell.col, cell.row);
        this.state.craftingTables.set(table.id, table);
        this.rebuildBuildPathBlockedCells();
        this.invalidateNavigationCaches();
    }

    private removeCraftingTable(data: unknown): void {
        const cell = this.getMapObjectCellFromData(data);
        if (!cell) return;

        const directId = this.getCraftingTableIdForCell(cell.col, cell.row);
        if (this.state.craftingTables.delete(directId)) {
            this.rebuildBuildPathBlockedCells();
            this.invalidateNavigationCaches();
            return;
        }

        let removed = false;
        this.state.craftingTables.forEach((table, id) => {
            const insideX = cell.col >= table.col && cell.col <= table.col + 1;
            const insideY = cell.row === table.row;
            if (insideX && insideY) {
                this.state.craftingTables.delete(id);
                removed = true;
            }
        });
        if (removed) {
            this.rebuildBuildPathBlockedCells();
            this.invalidateNavigationCaches();
        }
    }

    private getMapObjectCellFromData(data: unknown): { col: number; row: number } | null {
        const col = Number((data as { col?: unknown })?.col);
        const row = Number((data as { row?: unknown })?.row);
        if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
        return { col, row };
    }

    private isLayer3RowObjectCellInside(col: number, row: number): boolean {
        return this.isMapCellInside(col, row) && this.isMapCellInside(col + 1, row);
    }

    private getEnchantmentTableIdForCell(col: number, row: number): string {
        return `enchantment-table-${col}-${row}`;
    }

    private getCraftingTableIdForCell(col: number, row: number): string {
        return `crafting-table-${col}-${row}`;
    }

    private createEnchantmentTableState(col: number, row: number): EnchantmentTableState {
        const table = new EnchantmentTableState();
        table.id = this.getEnchantmentTableIdForCell(col, row);
        table.col = col;
        table.row = row;
        table.x = col * MAP_TILE_SIZE + MAP_TILE_SIZE;
        table.y = row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5;
        return table;
    }

    private createCraftingTableState(col: number, row: number): CraftingTableState {
        const table = new CraftingTableState();
        table.id = this.getCraftingTableIdForCell(col, row);
        table.col = col;
        table.row = row;
        table.x = col * MAP_TILE_SIZE + MAP_TILE_SIZE;
        table.y = row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5;
        return table;
    }

    private layer3RowObjectOverlapsPlayer(col: number, row: number): boolean {
        const x = col * MAP_TILE_SIZE + MAP_TILE_SIZE;
        const y = row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5;
        let overlapsPlayer = false;
        this.state.players.forEach((player) => {
            if (overlapsPlayer) return;
            overlapsPlayer = circleOverlapsAabb(
                player.x,
                player.y + PLAYER_TREE_Y_OFFSET,
                PLAYER_TREE_FOOT_RADIUS,
                x,
                y,
                LAYER3_ROW_OBJECT_HALF_WIDTH,
                LAYER3_ROW_OBJECT_HALF_HEIGHT,
            );
        });
        return overlapsPlayer;
    }

    private layer3RowObjectOverlapsAnyTable(col: number, row: number, movingId = ""): boolean {
        const x = col * MAP_TILE_SIZE + MAP_TILE_SIZE;
        const y = row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5;
        let overlapsTable = false;
        const testTable = (table: EnchantmentTableState | CraftingTableState, tableId: string) => {
            if (overlapsTable || tableId === movingId) return;
            overlapsTable = Math.abs(table.x - x) < LAYER3_ROW_OBJECT_HALF_WIDTH * 2
                && Math.abs(table.y - y) < LAYER3_ROW_OBJECT_HALF_HEIGHT * 2;
        };
        this.state.enchantmentTables.forEach(testTable);
        this.state.craftingTables.forEach(testTable);
        return overlapsTable;
    }

    private exportMapChunks(): Array<{ key: string; layer1: string; layer2: string }> {
        return [...this.mapTiles.entries()].map(([key, chunk]) => ({
            key,
            layer1: this.encodeMapChunk(chunk.layer1),
            layer2: this.encodeMapChunk(chunk.layer2),
        }));
    }

    private exportEnchantmentTables(): Array<{ col: number; row: number }> {
        return [...this.state.enchantmentTables.values()].map((table) => ({
            col: table.col,
            row: table.row,
        }));
    }

    private exportCraftingTables(): Array<{ col: number; row: number }> {
        return [...this.state.craftingTables.values()].map((table) => ({
            col: table.col,
            row: table.row,
        }));
    }

    private trimChunkToPlayableBounds(cells: Uint16Array, position: { chunkCol: number; chunkRow: number }): boolean {
        let trimmed = false;
        for (let localRow = 0; localRow < MAP_CHUNK_SIZE; localRow++) {
            for (let localCol = 0; localCol < MAP_CHUNK_SIZE; localCol++) {
                const index = localRow * MAP_CHUNK_SIZE + localCol;
                if (cells[index] === 0) continue;
                const col = position.chunkCol * MAP_CHUNK_SIZE + localCol;
                const row = position.chunkRow * MAP_CHUNK_SIZE + localRow;
                if (!this.isMapCellInside(col, row)) {
                    cells[index] = 0;
                    trimmed = true;
                }
            }
        }
        return trimmed;
    }

    private applyMapChunks(
        chunks: unknown[],
        trimOutOfBounds = false,
        sourceBounds = { width: this.state.worldWidth, height: this.state.worldHeight, tileSize: MAP_TILE_SIZE },
    ): { accepted: boolean; trimmed: boolean } {
        const nextTiles = new Map<string, { layer1: Uint16Array; layer2: Uint16Array }>();
        let tileCount = 0;
        let trimmed = false;
        for (const entry of chunks) {
            const key = (entry as { key?: unknown })?.key;
            const layer1Data = (entry as { layer1?: unknown })?.layer1;
            const layer2Data = (entry as { layer2?: unknown })?.layer2;
            const position = trimOutOfBounds
                ? this.parseSourceChunkKey(key, sourceBounds.width, sourceBounds.height, sourceBounds.tileSize)
                : this.parseMapChunkKey(key);
            const layer1 = this.decodeMapChunk(layer1Data);
            const layer2 = this.decodeMapChunk(layer2Data);
            if (!position || !layer1 || !layer2 || nextTiles.has(key as string)) return { accepted: false, trimmed: false };
            if (trimOutOfBounds) {
                trimmed = this.trimChunkToPlayableBounds(layer1, position) || trimmed;
                trimmed = this.trimChunkToPlayableBounds(layer2, position) || trimmed;
            }
            for (const value of layer1) tileCount += value === 0 ? 0 : 1;
            for (const value of layer2) tileCount += value === 0 ? 0 : 1;
            if (tileCount > MAP_MAX_FILLED_CELLS) return { accepted: false, trimmed: false };
            if (this.mapChunkHasTiles(layer1) || this.mapChunkHasTiles(layer2)) {
                nextTiles.set(key as string, { layer1, layer2 });
            }
        }

        this.mapTiles = nextTiles;
        this.mapTileCount = tileCount;
        this.state.mapChunks.clear();
        this.mapTiles.forEach((chunk, key) => {
            const stateChunk = new MapChunkState();
            stateChunk.layer1 = this.encodeMapChunk(chunk.layer1);
            stateChunk.layer2 = this.encodeMapChunk(chunk.layer2);
            this.state.mapChunks.set(key, stateChunk);
        });
        this.rebuildMapDerivedCaches();
        this.relocatePlayersFromSolidMapTiles();
        return { accepted: true, trimmed };
    }

    private applyEnchantmentTables(objects: unknown[] = []): boolean {
        const nextTables = new Map<string, EnchantmentTableState>();
        for (const object of objects) {
            const col = Number((object as { col?: unknown })?.col);
            const row = Number((object as { row?: unknown })?.row);
            if (!Number.isInteger(col) || !Number.isInteger(row)) return false;
            if (!this.isLayer3RowObjectCellInside(col, row)) return false;

            const table = this.createEnchantmentTableState(col, row);
            if (nextTables.has(table.id)) return false;
            nextTables.set(table.id, table);
        }

        this.state.enchantmentTables.clear();
        nextTables.forEach((table, id) => this.state.enchantmentTables.set(id, table));
        this.rebuildBuildPathBlockedCells();
        this.invalidateNavigationCaches();
        this.relocatePlayersFromSolidMapTiles();
        return true;
    }

    private applyCraftingTables(objects: unknown[] = []): boolean {
        const nextTables = new Map<string, CraftingTableState>();
        for (const object of objects) {
            const col = Number((object as { col?: unknown })?.col);
            const row = Number((object as { row?: unknown })?.row);
            if (!Number.isInteger(col) || !Number.isInteger(row)) return false;
            if (!this.isLayer3RowObjectCellInside(col, row)) return false;

            const table = this.createCraftingTableState(col, row);
            if (nextTables.has(table.id)) return false;
            nextTables.set(table.id, table);
        }

        this.state.craftingTables.clear();
        nextTables.forEach((table, id) => this.state.craftingTables.set(id, table));
        this.rebuildBuildPathBlockedCells();
        this.invalidateNavigationCaches();
        this.relocatePlayersFromSolidMapTiles();
        return true;
    }

    private replaceMap(data: unknown): boolean {
        const chunks = (data as { chunks?: unknown })?.chunks;
        const enchantmentTables = (data as { enchantmentTables?: unknown })?.enchantmentTables;
        const craftingTables = (data as { craftingTables?: unknown })?.craftingTables;
        if (!Array.isArray(chunks)) return false;
        const result = this.applyMapChunks(chunks);
        if (!result.accepted) return false;
        return this.applyEnchantmentTables(Array.isArray(enchantmentTables) ? enchantmentTables : [])
            && this.applyCraftingTables(Array.isArray(craftingTables) ? craftingTables : []);
    }

    private isStoredMapDocument(value: Partial<StoredMapDocument>, name: string): value is StoredMapDocument {
        return value.version === MAP_SAVE_VERSION
            && value.name === name
            && Number.isInteger(value.width)
            && Number.isInteger(value.height)
            && Array.isArray(value.chunks);
    }

    private canLoadDocumentIntoCurrentRoom(document: StoredMapDocument): boolean {
        if (document.width === this.state.worldWidth && document.height === this.state.worldHeight) return true;
        if (document.width === BASE_WORLD_WIDTH && document.height === BASE_WORLD_HEIGHT) return true;
        if (document.width === LEGACY_EDITOR_WORLD_WIDTH && document.height === LEGACY_EDITOR_WORLD_HEIGHT) return true;
        if (!this.isMapEditor() && document.width === EDITOR_WORLD_WIDTH && document.height === EDITOR_WORLD_HEIGHT) return true;
        return false;
    }

    private getSavedMapTileSize(document: StoredMapDocument): number {
        if (
            (document.width === BASE_WORLD_WIDTH && document.height === BASE_WORLD_HEIGHT)
            || (document.width === LEGACY_EDITOR_WORLD_WIDTH && document.height === LEGACY_EDITOR_WORLD_HEIGHT)
        ) {
            return BASE_TILE_SIZE;
        }
        return MAP_TILE_SIZE;
    }

    private async loadInitialGameMap(name: string): Promise<void> {
        const loadStartedAt = performance.now();
        try {
            const document = await this.mapStorage.load(name) as Partial<StoredMapDocument>;
            if (!this.isStoredMapDocument(document, name) || !this.canLoadDocumentIntoCurrentRoom(document)) {
                throw new Error(`Saved map '${name}' is invalid or incompatible.`);
            }

            const chunkResult = this.applyMapChunks(document.chunks, true, {
                width: document.width,
                height: document.height,
                tileSize: this.getSavedMapTileSize(document),
            });
            const appliedTables = chunkResult.accepted
                && this.applyEnchantmentTables(Array.isArray(document.enchantmentTables) ? document.enchantmentTables : [])
                && this.applyCraftingTables(Array.isArray(document.craftingTables) ? document.craftingTables : []);
            if (!appliedTables) throw new Error(`Saved map '${name}' is invalid or incompatible.`);

            this.state.activeMapName = name;
            this.logRoomEvent("map loaded", {
                name,
                sourceSize: `${document.width}x${document.height}`,
                sourceChunks: document.chunks.length,
                activeChunks: this.state.mapChunks.size,
                filledTiles: this.mapTileCount,
                enchantmentTables: this.state.enchantmentTables.size,
                craftingTables: this.state.craftingTables.size,
                trimmed: chunkResult.trimmed,
                ms: Math.round(performance.now() - loadStartedAt),
            });
        } catch (error) {
            console.error(`Unable to create room with map '${name}':`, error);
            throw new Error(`Unable to load saved map '${name}'.`);
        }
    }

    private async sendMapList(client: Client): Promise<void> {
        try {
            client.send("mapList", { names: await this.mapStorage.list() });
        } catch (error) {
            console.error("Unable to list saved maps:", error);
            client.send("mapStorageError", { message: "Unable to list saved maps." });
        }
    }

    private async saveMap(client: Client, data: unknown): Promise<void> {
        const name = normalizeMapName((data as { name?: unknown })?.name);
        const overwrite = !!(data as { overwrite?: unknown })?.overwrite;
        if (!name) {
            client.send("mapStorageError", { message: "Map names use letters, numbers, hyphens, and underscores." });
            return;
        }
        try {
            if (!overwrite && await this.mapStorage.exists(name)) {
                client.send("mapSaveConflict", { name });
                return;
            }
            const document: StoredMapDocument = {
                version: MAP_SAVE_VERSION,
                name,
                width: this.state.worldWidth,
                height: this.state.worldHeight,
                chunks: this.exportMapChunks(),
                enchantmentTables: this.exportEnchantmentTables(),
                craftingTables: this.exportCraftingTables(),
            };
            await this.mapStorage.save(document);
            client.send("mapSaved", { name });
            await this.sendMapList(client);
        } catch (error) {
            console.error(`Unable to save map '${name}':`, error);
            client.send("mapStorageError", { message: "Unable to save this map." });
        }
    }

    private async loadMap(client: Client, data: unknown): Promise<void> {
        const name = normalizeMapName((data as { name?: unknown })?.name);
        if (!name) {
            client.send("mapStorageError", { message: "Enter a valid saved map name." });
            return;
        }
        try {
            const document = await this.mapStorage.load(name) as Partial<StoredMapDocument>;
            const result = this.isStoredMapDocument(document, name)
                && this.canLoadDocumentIntoCurrentRoom(document)
                ? (() => {
                    const chunks = this.applyMapChunks(document.chunks, true, {
                        width: document.width,
                        height: document.height,
                        tileSize: this.getSavedMapTileSize(document),
                    });
                    if (!chunks.accepted) return chunks;
                    return this.applyEnchantmentTables(Array.isArray(document.enchantmentTables) ? document.enchantmentTables : [])
                        && this.applyCraftingTables(Array.isArray(document.craftingTables) ? document.craftingTables : [])
                        ? chunks
                        : { accepted: false, trimmed: false };
                })()
                : { accepted: false, trimmed: false };
            if (!result.accepted) {
                client.send("mapStorageError", { message: "That saved map is invalid or incompatible." });
                return;
            }
            client.send("mapLoaded", { name, trimmed: result.trimmed });
        } catch (error: unknown) {
            const message = (error as NodeJS.ErrnoException).code === "ENOENT"
                ? "Saved map not found."
                : "Unable to load that saved map.";
            if (message !== "Saved map not found.") console.error(`Unable to load map '${name}':`, error);
            client.send("mapStorageError", { message });
        }
    }

    private getMapTileCollider(col: number, row: number, frame: number): MapTileCollider {
        const topHalfCollider = CASTLE_TOP_PARTIAL_SUPPORT_FRAMES.has(frame);
        const narrowCollider = topHalfCollider || CASTLE_FULL_HEIGHT_PARTIAL_SUPPORT_FRAMES.has(frame);
        return {
            x: col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5,
            y: row * MAP_TILE_SIZE + (topHalfCollider ? MAP_TILE_SIZE * 0.25 : MAP_TILE_SIZE * 0.5),
            halfWidth: MAP_TILE_SIZE * (narrowCollider ? 0.25 : 0.5),
            halfHeight: MAP_TILE_SIZE * (topHalfCollider ? 0.25 : 0.5),
        };
    }

    private getMapTileFullCellCollider(col: number, row: number): MapTileCollider {
        return {
            x: col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5,
            y: row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5,
            halfWidth: MAP_TILE_SIZE * 0.5,
            halfHeight: MAP_TILE_SIZE * 0.5,
        };
    }

    private mapCellOverlapsPlayer(col: number, row: number, frame: number): boolean {
        const collider = this.getMapTileCollider(col, row, frame);
        let overlapsPlayer = false;
        this.state.players.forEach((player) => {
            if (overlapsPlayer) return;
            overlapsPlayer = circleOverlapsAabb(
                player.x,
                player.y + PLAYER_TREE_Y_OFFSET,
                PLAYER_TREE_FOOT_RADIUS,
                collider.x,
                collider.y,
                collider.halfWidth,
                collider.halfHeight,
            );
        });
        return overlapsPlayer;
    }

    private collidesWithMapTiles(playerX: number, playerY: number): boolean {
        return this.measurePlayerSubphase("playerMapCollision", () => {
            this.incrementTickCounter("playerMapCollisionChecks");
            const footX = playerX;
            const footY = playerY + PLAYER_TREE_Y_OFFSET;
            const startCol = Math.floor((footX - PLAYER_TREE_FOOT_RADIUS) / MAP_TILE_SIZE);
            const endCol = Math.floor((footX + PLAYER_TREE_FOOT_RADIUS) / MAP_TILE_SIZE);
            const startRow = Math.floor((footY - PLAYER_TREE_FOOT_RADIUS) / MAP_TILE_SIZE);
            const endRow = Math.floor((footY + PLAYER_TREE_FOOT_RADIUS) / MAP_TILE_SIZE);
            for (let row = startRow; row <= endRow; row++) {
                for (let col = startCol; col <= endCol; col++) {
                    for (const layer of [1, 2] as const) {
                        this.incrementTickCounter("playerMapTileChecks");
                        const value = this.getMapTileValue(col, row, layer);
                        if (value <= 0 || !this.isSolidMapFrame(value - 1)) continue;
                        this.incrementTickCounter("playerMapSolidTileChecks");
                        const collider = this.getMapTileCollider(col, row, value - 1);
                        if (circleOverlapsAabb(
                            footX,
                            footY,
                            PLAYER_TREE_FOOT_RADIUS,
                            collider.x,
                            collider.y,
                            collider.halfWidth,
                            collider.halfHeight,
                        )) {
                            this.incrementTickCounter("playerMapSolidHits");
                            return true;
                        }
                    }
                }
            }
            return false;
        });
    }

    private mapSolidOverlapsAabb(x: number, y: number, halfWidth: number, halfHeight: number): boolean {
        this.incrementTickCounter("solidAabbChecks");
        this.incrementEnemyCounter("solidAabbChecks");
        const startCol = Math.floor((x - halfWidth) / MAP_TILE_SIZE);
        const endCol = Math.floor((x + halfWidth) / MAP_TILE_SIZE);
        const startRow = Math.floor((y - halfHeight) / MAP_TILE_SIZE);
        const endRow = Math.floor((y + halfHeight) / MAP_TILE_SIZE);
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                for (const layer of [1, 2] as const) {
                    this.incrementTickCounter("solidTileChecks");
                    this.incrementEnemyCounter("solidTileChecks");
                    const value = this.getMapTileValue(col, row, layer);
                    if (value <= 0 || !this.isSolidMapFrame(value - 1)) continue;
                    this.incrementTickCounter("solidTileColliderChecks");
                    const collider = this.getMapTileCollider(col, row, value - 1);
                    if (overlaps(
                        x,
                        y,
                        halfWidth,
                        halfHeight,
                        collider.x,
                        collider.y,
                        collider.halfWidth,
                        collider.halfHeight,
                    )) {
                        this.incrementTickCounter("solidAabbHits");
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private treeOverlapsSolidMapTile(x: number, y: number): boolean {
        const hitbox = this.getTreeHitbox({ x, y, variant: TREE_VARIANT_TOPDOWN_3X3 });
        return this.mapSolidOverlapsAabb(
            hitbox.x,
            hitbox.y,
            hitbox.radius,
            hitbox.radius,
        );
    }

    private getTreeHitbox(tree: { x: number; y: number; variant?: string }): { x: number; y: number; radius: number } {
        if (tree.variant === TREE_VARIANT_TOPDOWN_3X3) {
            return {
                x: tree.x,
                y: tree.y - TOPDOWN_TREE_HALF_SIZE,
                radius: TOPDOWN_TREE_HITBOX_RADIUS,
            };
        }

        return {
            x: tree.x,
            y: tree.y + TREE_TRUNK_Y_OFFSET,
            radius: LEGACY_TREE_HITBOX_RADIUS,
        };
    }

    private topdownTreeHasSpawnSpace(x: number, y: number): boolean {
        const centerY = y - TOPDOWN_TREE_HALF_SIZE;
        const leftCol = Math.floor((x - TOPDOWN_TREE_HALF_SIZE) / MAP_TILE_SIZE);
        const topRow = Math.floor((y - TOPDOWN_TREE_HALF_SIZE * 2) / MAP_TILE_SIZE);
        if (
            x - TOPDOWN_TREE_HALF_SIZE < 0
            || x + TOPDOWN_TREE_HALF_SIZE > this.playableWorldWidth()
            || y - TOPDOWN_TREE_HALF_SIZE * 2 < 0
            || y > this.playableWorldHeight()
        ) {
            return false;
        }

        for (let row = 0; row < TOPDOWN_TREE_TILE_SPAN; row++) {
            for (let col = 0; col < TOPDOWN_TREE_TILE_SPAN; col++) {
                if (!this.isTreeSpawnGroundCell(leftCol + col, topRow + row)) return false;
            }
        }

        return !this.mapSolidOverlapsAabb(x, centerY, TOPDOWN_TREE_HALF_SIZE, TOPDOWN_TREE_HALF_SIZE)
            && !this.treeOverlapsSolidMapTile(x, y);
    }

    private snapTopdownTreeAnchor(x: number, y: number): { x: number; y: number } {
        const maxLeftCol = Math.max(0, this.mapColumnCount() - TOPDOWN_TREE_TILE_SPAN);
        const maxTopRow = Math.max(0, this.mapRowCount() - TOPDOWN_TREE_TILE_SPAN);
        const leftCol = clamp(Math.round((x - TOPDOWN_TREE_HALF_SIZE) / MAP_TILE_SIZE), 0, maxLeftCol);
        const topRow = clamp(Math.round((y - TOPDOWN_TREE_HALF_SIZE * 2) / MAP_TILE_SIZE), 0, maxTopRow);
        return {
            x: leftCol * MAP_TILE_SIZE + TOPDOWN_TREE_HALF_SIZE,
            y: topRow * MAP_TILE_SIZE + TOPDOWN_TREE_HALF_SIZE * 2,
        };
    }

    private relocatePlayersFromSolidMapTiles(): void {
        this.state.players.forEach((player) => {
            if (!this.collidesWithPlayerWorldColliders(player.x, player.y)) return;
            const position = this.findNearestOpenPlayerPosition(player.x, player.y);
            player.x = position.x;
            player.y = position.y;
        });
    }

    private playerHitboxCenterY(playerY: number): number {
        return playerY + PLAYER_HITBOX_Y_OFFSET;
    }

    private minPlayerY(): number {
        return PLAYER_HH - PLAYER_HITBOX_Y_OFFSET;
    }

    private maxPlayerY(): number {
        return this.playableWorldHeight() - PLAYER_HH - PLAYER_HITBOX_Y_OFFSET;
    }

    private findNearestOpenPlayerPosition(originX: number, originY: number): { x: number; y: number } {
        const clampedOriginX = clamp(originX, PLAYER_HW, this.playableWorldWidth() - PLAYER_HW);
        const clampedOriginY = clamp(originY, this.minPlayerY(), this.maxPlayerY());
        if (!this.collidesWithPlayerWorldColliders(clampedOriginX, clampedOriginY)) return { x: clampedOriginX, y: clampedOriginY };

        const originCol = Math.floor(clampedOriginX / MAP_TILE_SIZE);
        const originRow = Math.floor((clampedOriginY + PLAYER_TREE_Y_OFFSET) / MAP_TILE_SIZE);
        for (let radius = 1; radius <= 128; radius++) {
            for (let row = originRow - radius; row <= originRow + radius; row++) {
                for (let col = originCol - radius; col <= originCol + radius; col++) {
                    if (Math.max(Math.abs(col - originCol), Math.abs(row - originRow)) !== radius || !this.isMapCellInside(col, row)) continue;
                    const x = clamp(col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5, PLAYER_HW, this.playableWorldWidth() - PLAYER_HW);
                    const y = clamp(row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5 - PLAYER_TREE_Y_OFFSET, this.minPlayerY(), this.maxPlayerY());
                    if (!this.collidesWithPlayerWorldColliders(x, y)) return { x, y };
                }
            }
        }
        return { x: clampedOriginX, y: clampedOriginY };
    }

    private equipPlayerSlot(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.alive || player.isDead || this.state.gameOver) return;

        const slot = Number((data as { slot?: unknown })?.slot);
        if (!Number.isInteger(slot) || slot < 1 || slot > HOTBAR_SLOT_COUNT) return;

        const previousSlot = player.activeSlot;
        player.activeSlot = slot;
        player.activeItem = this.getHotbarItem(player, slot);
        if (player.activeItem !== ITEM_WOOD_BOW) {
            this.clearBowCharge(player, sp);
            this.clearBowVolley(sp);
        }
        if (player.activeItem !== ITEM_WOOD_AXE) {
            this.setAxeWhirlwind(sessionId, false);
        }
        if (!this.isShieldItem(player.activeItem)) {
            this.setShieldBlocking(sessionId, false);
        }
        if (player.shieldBlocking && slot !== previousSlot) {
            this.setShieldBlocking(sessionId, false);
        }
    }

    private swapPlayerHotbarSlots(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.alive || player.isDead || this.state.gameOver) return;

        const fromSlot = Number((data as { fromSlot?: unknown })?.fromSlot);
        const toSlot = Number((data as { toSlot?: unknown })?.toSlot);
        if (
            !Number.isInteger(fromSlot)
            || !Number.isInteger(toSlot)
            || fromSlot < 1
            || fromSlot > HOTBAR_SLOT_COUNT
            || toSlot < 1
            || toSlot > HOTBAR_SLOT_COUNT
            || fromSlot === toSlot
        ) {
            return;
        }

        this.normalizeHotbar(player);
        const fromIndex = fromSlot - 1;
        const toIndex = toSlot - 1;
        if (!player.hotbarItems[fromIndex]) return;

        const fromItem = player.hotbarItems[fromIndex];
        const fromCount = player.hotbarCounts[fromIndex] || EMPTY_HOTBAR_COUNT;
        const fromShieldHp = player.hotbarShieldHp[fromIndex] || 0;
        const fromShieldMaxHp = player.hotbarShieldMaxHp[fromIndex] || 0;
        player.hotbarItems[fromIndex] = player.hotbarItems[toIndex] || EMPTY_HOTBAR_ITEM;
        player.hotbarCounts[fromIndex] = player.hotbarCounts[toIndex] || EMPTY_HOTBAR_COUNT;
        player.hotbarShieldHp[fromIndex] = player.hotbarShieldHp[toIndex] || 0;
        player.hotbarShieldMaxHp[fromIndex] = player.hotbarShieldMaxHp[toIndex] || 0;
        player.hotbarItems[toIndex] = fromItem;
        player.hotbarCounts[toIndex] = fromCount;
        player.hotbarShieldHp[toIndex] = fromShieldHp;
        player.hotbarShieldMaxHp[toIndex] = fromShieldMaxHp;
        this.normalizeHotbarShieldSlot(player, fromIndex);
        this.normalizeHotbarShieldSlot(player, toIndex);

        if (player.activeSlot === fromSlot) {
            player.activeSlot = toSlot;
        } else if (player.activeSlot === toSlot) {
            player.activeSlot = fromSlot;
        }
        player.activeItem = this.getHotbarItem(player, player.activeSlot);
        if (player.activeItem !== ITEM_WOOD_BOW) {
            this.clearBowCharge(player, sp);
        }
        if (player.activeItem !== ITEM_WOOD_AXE) {
            this.setAxeWhirlwind(sessionId, false);
        }
        if (!this.isShieldItem(player.activeItem)) {
            this.setShieldBlocking(sessionId, false);
        }
        if (player.shieldBlocking && (player.activeSlot === fromSlot || player.activeSlot === toSlot)) {
            this.setShieldBlocking(sessionId, false);
        }
    }

    private setPlayerOutfitColor(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const outfitColor = Number((data as { outfitColor?: unknown })?.outfitColor);
        if (!player || !Number.isInteger(outfitColor) || outfitColor < 0 || outfitColor >= OUTFIT_COLOR_COUNT) return;

        player.outfitColor = outfitColor;
    }

    private selectUpgrade(client: Client, data: unknown) {
        const sessionId = client.sessionId;
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.alive || player.isDead || this.state.gameOver) return;

        const upgradeId = String((data as { upgradeId?: unknown })?.upgradeId || "");
        const item = String((data as { item?: unknown })?.item || "");
        const slot = Number((data as { slot?: unknown })?.slot);
        if (!UPGRADE_IDS.has(upgradeId) || player.pendingUpgradeChoices <= 0) return;
        if (!Number.isInteger(slot) || slot < 1 || slot > HOTBAR_SLOT_COUNT) return;
        if (!item || this.getHotbarItem(player, slot) !== item) return;
        if (!this.isPlayerNearEnchantmentTable(player)) return;

        const node = this.getUpgradeNodeForItem(item, upgradeId);
        if (!node) return;
        if (node.prerequisite && this.getPlayerUpgradeRank(player, node.prerequisite) <= 0) return;
        const maxRank = node.maxRank ?? Number.MAX_SAFE_INTEGER;
        if (this.getPlayerUpgradeRank(player, upgradeId) >= maxRank) return;

        switch (upgradeId) {
            case "axe_primary_attack_speed":
                player.axeSwingSpeedUpgrades++;
                break;
            case "axe_primary_damage":
                player.axePrimaryDamageUpgrades++;
                break;
            case "axe_whirlwind_cooldown":
                player.axeWhirlwindCooldownUpgrades++;
                break;
            case "axe_whirlwind_aoe":
                player.axeWhirlwindAoeUpgrades++;
                break;
            case "axe_whirlwind_damage":
                player.axeWhirlwindDamageUpgrades++;
                break;
            case "bow_primary_attack_speed":
                player.bowChargeTimeUpgrades++;
                break;
            case "bow_pierce":
                player.bowPierceUpgrades++;
                break;
            case "bow_damage":
                player.bowDamageUpgrades++;
                break;
            case "bow_volley_cooldown":
                player.bowVolleyCooldownUpgrades++;
                break;
            case "bow_volley_aoe":
                player.bowVolleyAoeUpgrades++;
                break;
            case "bow_volley_damage":
                player.bowVolleyDamageUpgrades++;
                break;
            case "shield_primary_attack_speed":
                player.shieldPrimaryAttackSpeedUpgrades++;
                break;
            case "shield_primary_damage":
                player.shieldPrimaryDamageUpgrades++;
                break;
            case "shield_max_hp":
                player.shieldMaxHpUpgrades++;
                this.refreshAllShieldSlotMaxHp(player, 3);
                break;
            case "shield_recharge":
                player.shieldRechargeUpgrades++;
                break;
            case "shield_size":
                player.shieldSizeUpgrades++;
                break;
            case "hammer_wood_gather":
                player.woodGatherUpgrades++;
                break;
            default:
                return;
        }

        player.pendingUpgradeChoices = Math.max(0, player.pendingUpgradeChoices - 1);
        client.send("upgradePicked", { upgradeId, item, slot });
    }

    private refundUpgradeTree(client: Client, data: unknown) {
        const sessionId = client.sessionId;
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.alive || player.isDead || this.state.gameOver || !this.state.gameStarted) return;

        const item = String((data as { item?: unknown })?.item || "");
        const slot = Number((data as { slot?: unknown })?.slot);
        if (!Number.isInteger(slot) || slot < 1 || slot > HOTBAR_SLOT_COUNT) return;
        if (!item || this.getHotbarItem(player, slot) !== item) return;
        if (!this.isPlayerNearEnchantmentTable(player)) return;

        const tree = UPGRADE_TREES_BY_ITEM[item];
        if (!tree || tree.length <= 0) return;

        const refundedPoints = tree.reduce((total, node) => total + this.getPlayerUpgradeRank(player, node.id), 0);
        if (refundedPoints <= 0) return;

        tree.forEach((node) => this.setPlayerUpgradeRank(player, node.id, 0));
        player.pendingUpgradeChoices = Math.max(0, Math.floor(player.pendingUpgradeChoices || 0)) + refundedPoints;
        if (this.isShieldItem(item)) this.refreshAllShieldSlotMaxHp(player, 0);

        client.send("upgradeTreeRefunded", { item, slot, refundedPoints });
    }

    private getUpgradeNodeForItem(item: string, upgradeId: string): UpgradeNodeConfig | null {
        return UPGRADE_TREES_BY_ITEM[item]?.find((node) => node.id === upgradeId) || null;
    }

    private getPlayerUpgradeRank(player: PlayerState, upgradeId: string): number {
        switch (upgradeId) {
            case "axe_primary_attack_speed":
                return Math.max(0, player.axeSwingSpeedUpgrades || 0);
            case "axe_primary_damage":
                return Math.max(0, player.axePrimaryDamageUpgrades || 0);
            case "axe_whirlwind_cooldown":
                return Math.max(0, player.axeWhirlwindCooldownUpgrades || 0);
            case "axe_whirlwind_aoe":
                return Math.max(0, player.axeWhirlwindAoeUpgrades || 0);
            case "axe_whirlwind_damage":
                return Math.max(0, player.axeWhirlwindDamageUpgrades || 0);
            case "bow_primary_attack_speed":
                return Math.max(0, player.bowChargeTimeUpgrades || 0);
            case "bow_pierce":
                return Math.max(0, player.bowPierceUpgrades || 0);
            case "bow_damage":
                return Math.max(0, player.bowDamageUpgrades || 0);
            case "bow_volley_cooldown":
                return Math.max(0, player.bowVolleyCooldownUpgrades || 0);
            case "bow_volley_aoe":
                return Math.max(0, player.bowVolleyAoeUpgrades || 0);
            case "bow_volley_damage":
                return Math.max(0, player.bowVolleyDamageUpgrades || 0);
            case "shield_primary_attack_speed":
                return Math.max(0, player.shieldPrimaryAttackSpeedUpgrades || 0);
            case "shield_primary_damage":
                return Math.max(0, player.shieldPrimaryDamageUpgrades || 0);
            case "shield_max_hp":
                return Math.max(0, player.shieldMaxHpUpgrades || 0);
            case "shield_recharge":
                return Math.max(0, player.shieldRechargeUpgrades || 0);
            case "shield_size":
                return Math.max(0, player.shieldSizeUpgrades || 0);
            case "hammer_wood_gather":
                return Math.max(0, player.woodGatherUpgrades || 0);
            default:
                return 0;
        }
    }

    private setPlayerUpgradeRank(player: PlayerState, upgradeId: string, rank: number): void {
        const nextRank = Math.max(0, Math.floor(rank));
        switch (upgradeId) {
            case "axe_primary_attack_speed":
                player.axeSwingSpeedUpgrades = nextRank;
                break;
            case "axe_primary_damage":
                player.axePrimaryDamageUpgrades = nextRank;
                break;
            case "axe_whirlwind_cooldown":
                player.axeWhirlwindCooldownUpgrades = nextRank;
                break;
            case "axe_whirlwind_aoe":
                player.axeWhirlwindAoeUpgrades = nextRank;
                break;
            case "axe_whirlwind_damage":
                player.axeWhirlwindDamageUpgrades = nextRank;
                break;
            case "bow_primary_attack_speed":
                player.bowChargeTimeUpgrades = nextRank;
                break;
            case "bow_pierce":
                player.bowPierceUpgrades = nextRank;
                break;
            case "bow_damage":
                player.bowDamageUpgrades = nextRank;
                break;
            case "bow_volley_cooldown":
                player.bowVolleyCooldownUpgrades = nextRank;
                break;
            case "bow_volley_aoe":
                player.bowVolleyAoeUpgrades = nextRank;
                break;
            case "bow_volley_damage":
                player.bowVolleyDamageUpgrades = nextRank;
                break;
            case "shield_primary_attack_speed":
                player.shieldPrimaryAttackSpeedUpgrades = nextRank;
                break;
            case "shield_primary_damage":
                player.shieldPrimaryDamageUpgrades = nextRank;
                break;
            case "shield_max_hp":
                player.shieldMaxHpUpgrades = nextRank;
                break;
            case "shield_recharge":
                player.shieldRechargeUpgrades = nextRank;
                break;
            case "shield_size":
                player.shieldSizeUpgrades = nextRank;
                break;
            case "hammer_wood_gather":
                player.woodGatherUpgrades = nextRank;
                break;
        }
    }

    private initializeHotbar(player: PlayerState) {
        player.hotbarItems.clear();
        player.hotbarCounts.clear();
        player.hotbarShieldHp.clear();
        player.hotbarShieldMaxHp.clear();
        player.hotbarItems.push(
            ITEM_WOOD_AXE,
            ITEM_WOOD_BOW,
            ITEM_HAMMER,
            EMPTY_HOTBAR_ITEM,
            EMPTY_HOTBAR_ITEM,
            EMPTY_HOTBAR_ITEM,
            EMPTY_HOTBAR_ITEM,
            EMPTY_HOTBAR_ITEM,
            EMPTY_HOTBAR_ITEM,
        );
        player.hotbarCounts.push(
            EMPTY_HOTBAR_COUNT,
            EMPTY_HOTBAR_COUNT,
            EMPTY_HOTBAR_COUNT,
            EMPTY_HOTBAR_COUNT,
            EMPTY_HOTBAR_COUNT,
            EMPTY_HOTBAR_COUNT,
            EMPTY_HOTBAR_COUNT,
            EMPTY_HOTBAR_COUNT,
            EMPTY_HOTBAR_COUNT,
        );
        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            player.hotbarShieldHp.push(0);
            player.hotbarShieldMaxHp.push(0);
        }
        player.activeSlot = 1;
        player.activeItem = ITEM_WOOD_AXE;
        player.attackItem = ITEM_WOOD_AXE;
        player.shieldBlocking = false;
        player.shieldBlockCooldownProgress = 0;
    }

    private normalizeHotbar(player: PlayerState) {
        while (player.hotbarItems.length < HOTBAR_SLOT_COUNT) {
            player.hotbarItems.push(EMPTY_HOTBAR_ITEM);
        }
        while (player.hotbarItems.length > HOTBAR_SLOT_COUNT) {
            player.hotbarItems.pop();
        }
        while (player.hotbarCounts.length < HOTBAR_SLOT_COUNT) {
            player.hotbarCounts.push(EMPTY_HOTBAR_COUNT);
        }
        while (player.hotbarCounts.length > HOTBAR_SLOT_COUNT) {
            player.hotbarCounts.pop();
        }
        while (player.hotbarShieldHp.length < HOTBAR_SLOT_COUNT) {
            player.hotbarShieldHp.push(0);
        }
        while (player.hotbarShieldHp.length > HOTBAR_SLOT_COUNT) {
            player.hotbarShieldHp.pop();
        }
        while (player.hotbarShieldMaxHp.length < HOTBAR_SLOT_COUNT) {
            player.hotbarShieldMaxHp.push(0);
        }
        while (player.hotbarShieldMaxHp.length > HOTBAR_SLOT_COUNT) {
            player.hotbarShieldMaxHp.pop();
        }
        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            if (!player.hotbarItems[i]) player.hotbarCounts[i] = EMPTY_HOTBAR_COUNT;
            this.normalizeHotbarShieldSlot(player, i);
        }
    }

    private normalizeHotbarShieldSlot(player: PlayerState, index: number) {
        const item = player.hotbarItems[index] || EMPTY_HOTBAR_ITEM;
        const maxHp = this.getShieldMaxHpForItem(item, player);
        if (maxHp <= 0) {
            player.hotbarShieldHp[index] = 0;
            player.hotbarShieldMaxHp[index] = 0;
            return;
        }

        const previousMaxHp = Math.max(0, Math.floor(player.hotbarShieldMaxHp[index] || 0));
        const currentHp = Math.max(0, Math.floor(player.hotbarShieldHp[index] || 0));
        player.hotbarShieldMaxHp[index] = maxHp;
        player.hotbarShieldHp[index] = previousMaxHp <= 0 ? maxHp : clamp(currentHp, 0, maxHp);
    }

    private getShieldMaxHpForItem(item: string, player: PlayerState): number {
        const bonusHp = 3 * clamp(Math.floor(player.shieldMaxHpUpgrades || 0), 0, SHIELD_MAX_HP_UPGRADE_MAX_RANK);
        if (item === ITEM_WOOD_SHIELD) return WOOD_SHIELD_MAX_HP + bonusHp;
        if (item === ITEM_BONE_SHIELD) return BONE_SHIELD_MAX_HP + bonusHp;
        return 0;
    }

    private refreshAllShieldSlotMaxHp(player: PlayerState, currentHpBonus: number = 0): void {
        this.normalizeHotbar(player);
        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            const item = player.hotbarItems[i] || EMPTY_HOTBAR_ITEM;
            const maxHp = this.getShieldMaxHpForItem(item, player);
            if (maxHp <= 0) {
                player.hotbarShieldHp[i] = 0;
                player.hotbarShieldMaxHp[i] = 0;
                continue;
            }
            const currentHp = Math.max(0, Math.floor(player.hotbarShieldHp[i] || 0));
            player.hotbarShieldMaxHp[i] = maxHp;
            player.hotbarShieldHp[i] = clamp(currentHp + Math.max(0, Math.floor(currentHpBonus)), 0, maxHp);
        }
    }

    private getHotbarItem(player: PlayerState, slot: number): string {
        this.normalizeHotbar(player);
        return player.hotbarItems[slot - 1] || EMPTY_HOTBAR_ITEM;
    }

    private setHotbarItem(player: PlayerState, slot: number, item: string) {
        this.normalizeHotbar(player);
        player.hotbarItems[slot - 1] = item;
        player.hotbarCounts[slot - 1] = item ? player.hotbarCounts[slot - 1] || EMPTY_HOTBAR_COUNT : EMPTY_HOTBAR_COUNT;
        this.initializeHotbarShieldSlot(player, slot - 1, item);
        if (player.activeSlot === slot) {
            player.activeItem = item;
        }
    }

    private getHotbarCount(player: PlayerState, slot: number): number {
        this.normalizeHotbar(player);
        return Math.max(0, Math.floor(player.hotbarCounts[slot - 1] || 0));
    }

    private setHotbarSlot(player: PlayerState, slot: number, item: string, count: number = 0) {
        this.normalizeHotbar(player);
        player.hotbarItems[slot - 1] = item;
        const maxCount = item === ITEM_WOOD
            ? WOOD_STACK_MAX
            : item === ITEM_BONE
                ? BONE_STACK_MAX
                : Number.MAX_SAFE_INTEGER;
        player.hotbarCounts[slot - 1] = item ? clamp(Math.floor(count), 0, maxCount) : EMPTY_HOTBAR_COUNT;
        this.initializeHotbarShieldSlot(player, slot - 1, item);
        if (player.activeSlot === slot) {
            player.activeItem = item;
        }
    }

    private initializeHotbarShieldSlot(player: PlayerState, index: number, item: string) {
        const maxHp = this.getShieldMaxHpForItem(item, player);
        player.hotbarShieldMaxHp[index] = maxHp;
        player.hotbarShieldHp[index] = maxHp;
    }

    private findFirstEmptyHotbarSlot(player: PlayerState): number {
        this.normalizeHotbar(player);
        const emptyIndex = player.hotbarItems.findIndex((item) => !item);
        return emptyIndex < 0 ? 0 : emptyIndex + 1;
    }

    private addWoodToHotbar(player: PlayerState, count: number): boolean {
        return this.addStackItemToHotbar(player, ITEM_WOOD, WOOD_STACK_MAX, count);
    }

    private addBoneToHotbar(player: PlayerState, count: number): boolean {
        return this.addStackItemToHotbar(player, ITEM_BONE, BONE_STACK_MAX, count);
    }

    private addStackItemToHotbar(player: PlayerState, stackItem: string, stackMax: number, count: number): boolean {
        this.normalizeHotbar(player);
        let remaining = Math.max(0, Math.floor(count));
        if (remaining <= 0) return false;

        let capacity = 0;
        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            if (player.hotbarItems[i] === stackItem) {
                capacity += stackMax - clamp(Math.floor(player.hotbarCounts[i] || 0), 0, stackMax);
            } else if (!player.hotbarItems[i]) {
                capacity += stackMax;
            }
        }
        if (capacity < remaining) return false;

        for (let i = 0; i < HOTBAR_SLOT_COUNT && remaining > 0; i++) {
            if (player.hotbarItems[i] !== stackItem) continue;
            const current = clamp(Math.floor(player.hotbarCounts[i] || 0), 0, stackMax);
            const room = stackMax - current;
            if (room <= 0) continue;
            const added = Math.min(room, remaining);
            player.hotbarCounts[i] = current + added;
            remaining -= added;
        }

        while (remaining > 0) {
            const slot = this.findFirstEmptyHotbarSlot(player);
            if (slot <= 0) return false;
            const added = Math.min(stackMax, remaining);
            this.setHotbarSlot(player, slot, stackItem, added);
            remaining -= added;
        }

        return true;
    }

    private consumeActiveWood(player: PlayerState, count: number): boolean {
        if (player.activeItem !== ITEM_WOOD) return false;
        const slot = player.activeSlot;
        const current = this.getHotbarCount(player, slot);
        if (current < count) return false;
        const next = current - count;
        if (next <= 0) {
            this.setHotbarSlot(player, slot, EMPTY_HOTBAR_ITEM, EMPTY_HOTBAR_COUNT);
        } else {
            player.hotbarCounts[slot - 1] = next;
        }
        return true;
    }

    private consumeHeldWood(player: PlayerState, count: number): boolean {
        return this.consumeHeldStackItem(player, ITEM_WOOD, count);
    }

    private consumeHeldBone(player: PlayerState, count: number): boolean {
        return this.consumeHeldStackItem(player, ITEM_BONE, count);
    }

    private consumeHeldStackItem(player: PlayerState, stackItem: string, count: number): boolean {
        this.normalizeHotbar(player);
        let remaining = Math.max(0, Math.floor(count));
        if (remaining <= 0) return false;
        if (this.getTotalHeldStackItem(player, stackItem) < remaining) return false;

        for (let i = 0; i < HOTBAR_SLOT_COUNT && remaining > 0; i++) {
            if (player.hotbarItems[i] !== stackItem) continue;
            const current = Math.max(0, Math.floor(player.hotbarCounts[i] || 0));
            const consumed = Math.min(current, remaining);
            const next = current - consumed;
            if (next <= 0) {
                this.setHotbarSlot(player, i + 1, EMPTY_HOTBAR_ITEM, EMPTY_HOTBAR_COUNT);
            } else {
                player.hotbarCounts[i] = next;
            }
            remaining -= consumed;
        }

        return remaining <= 0;
    }

    private getTotalHeldWood(player: PlayerState): number {
        return this.getTotalHeldStackItem(player, ITEM_WOOD);
    }

    private getTotalHeldBone(player: PlayerState): number {
        return this.getTotalHeldStackItem(player, ITEM_BONE);
    }

    private getTotalHeldStackItem(player: PlayerState, stackItem: string): number {
        this.normalizeHotbar(player);
        return player.hotbarItems.reduce((total, item, index) => {
            return item === stackItem ? total + Math.max(0, Math.floor(player.hotbarCounts[index] || 0)) : total;
        }, 0);
    }

    private grantCampfireItem(player: PlayerState) {
        player.pendingCampfireCharges++;
        this.fillPendingCampfireItems(player);
    }

    private grantHotbarItem(player: PlayerState, item: string): boolean {
        this.normalizeHotbar(player);
        const emptyIndex = player.hotbarItems.findIndex((slotItem) => !slotItem);
        if (emptyIndex < 0) return false;
        player.hotbarItems[emptyIndex] = item;
        player.hotbarCounts[emptyIndex] = EMPTY_HOTBAR_COUNT;
        this.initializeHotbarShieldSlot(player, emptyIndex, item);
        if (player.activeSlot === emptyIndex + 1) {
            player.activeItem = item;
        }
        return true;
    }

    private fillPendingCampfireItems(player: PlayerState) {
        this.normalizeHotbar(player);
        while (player.pendingCampfireCharges > 0) {
            if (!this.grantHotbarItem(player, ITEM_CAMPFIRE)) return;
            player.pendingCampfireCharges--;
        }
    }

    private getPlayerActiveCampfireLimit(player: PlayerState): number {
        return BASE_ACTIVE_CAMPFIRE_LIMIT;
    }

    private getPlayerActiveCampfireCount(sessionId: string): number {
        let count = 0;
        this.campfireOwners.forEach((ownerId, campfireId) => {
            if (ownerId === sessionId && this.state.campfires.has(campfireId)) count++;
        });
        return count;
    }

    private removeCampfire(campfireId: string): boolean {
        if (!this.state.campfires.has(campfireId)) return false;
        this.state.campfires.delete(campfireId);
        this.campfireOwners.delete(campfireId);
        return true;
    }

    private tryCraftItem(client: Client, data: unknown): boolean {
        const recipeId = String((data as { recipeId?: unknown })?.recipeId || "");
        const reject = (reason: string) => {
            client.send("craftResult", { accepted: false, recipeId, reason });
            return false;
        };

        const craft = recipeId === "campfire"
            ? { item: ITEM_CAMPFIRE, woodCost: CAMPFIRE_CRAFT_WOOD_COST, boneCost: 0 }
            : recipeId === "wood_caltrops"
                ? { item: ITEM_WOOD_CALTROPS, woodCost: CALTROPS_CRAFT_WOOD_COST, boneCost: 0 }
                : recipeId === "wood_shield"
                    ? { item: ITEM_WOOD_SHIELD, woodCost: WOOD_SHIELD_CRAFT_WOOD_COST, boneCost: 0 }
                    : recipeId === "bone_shield"
                        ? { item: ITEM_BONE_SHIELD, woodCost: 0, boneCost: BONE_SHIELD_CRAFT_BONE_COST }
                        : null;
        if (!craft) return reject("That recipe is not available yet.");

        const sp = this.serverPlayers.get(client.sessionId);
        const player = this.state.players.get(client.sessionId);
        if (!sp || !sp.alive || !player || player.isDead || this.state.gameOver || !this.state.gameStarted) {
            return reject("You cannot craft right now.");
        }
        if (!this.isPlayerNearWorkbench(player)) return reject("Move closer to a workbench.");
        if (this.getTotalHeldWood(player) < craft.woodCost) return reject("Not enough wood.");
        if (this.getTotalHeldBone(player) < craft.boneCost) return reject("Not enough bones.");
        if (!this.hasRoomForCraftedItem(player, craft.woodCost, craft.boneCost)) return reject("No empty hotbar slot.");
        if (craft.woodCost > 0 && !this.consumeHeldWood(player, craft.woodCost)) return reject("Not enough wood.");
        if (craft.boneCost > 0 && !this.consumeHeldBone(player, craft.boneCost)) return reject("Not enough bones.");

        player.wood = this.getTotalHeldWood(player);
        if (craft.item === ITEM_CAMPFIRE) {
            this.grantCampfireItem(player);
        } else if (!this.grantHotbarItem(player, craft.item)) {
            return reject("No empty hotbar slot.");
        }
        client.send("craftResult", { accepted: true, recipeId });
        this.broadcast("itemCrafted", { recipeId, playerId: client.sessionId });
        return true;
    }

    private hasRoomForCraftedItem(player: PlayerState, woodCost: number, boneCost: number = 0): boolean {
        this.normalizeHotbar(player);
        if (this.findFirstEmptyHotbarSlot(player) > 0) return true;

        let remainingCost = Math.max(0, Math.floor(woodCost)) + Math.max(0, Math.floor(boneCost));
        for (let i = 0; i < HOTBAR_SLOT_COUNT && remainingCost > 0; i++) {
            if (player.hotbarItems[i] !== ITEM_WOOD && player.hotbarItems[i] !== ITEM_BONE) continue;
            const current = Math.max(0, Math.floor(player.hotbarCounts[i] || 0));
            if (current <= remainingCost) return true;
            remainingCost -= current;
        }
        return false;
    }

    private isPlayerNearWorkbench(player: PlayerState): boolean {
        const footX = player.x;
        const footY = player.y + PLAYER_TREE_Y_OFFSET;
        const searchRadius = WORKBENCH_INTERACT_RANGE + MAP_TILE_SIZE;
        const startCol = Math.floor((footX - searchRadius) / MAP_TILE_SIZE);
        const endCol = Math.floor((footX + searchRadius) / MAP_TILE_SIZE);
        const startRow = Math.floor((footY - searchRadius) / MAP_TILE_SIZE);
        const endRow = Math.floor((footY + searchRadius) / MAP_TILE_SIZE);
        const rangeSq = WORKBENCH_INTERACT_RANGE * WORKBENCH_INTERACT_RANGE;

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                for (const layer of [1, 2] as const) {
                    if (!this.isWorkbenchLeftCell(col, row, layer)) continue;
                    const centerX = col * MAP_TILE_SIZE + MAP_TILE_SIZE;
                    const centerY = row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5;
                    const dx = footX - centerX;
                    const dy = footY - centerY;
                    if (dx * dx + dy * dy <= rangeSq) return true;
                }
            }
        }

        let nearCraftingTable = false;
        this.state.craftingTables.forEach((table) => {
            if (nearCraftingTable) return;
            const dx = footX - table.x;
            const dy = footY - table.y;
            nearCraftingTable = dx * dx + dy * dy <= rangeSq;
        });
        if (nearCraftingTable) return true;

        return false;
    }

    private isPlayerNearEnchantmentTable(player: PlayerState): boolean {
        const footX = player.x;
        const footY = player.y + PLAYER_TREE_Y_OFFSET;
        const rangeSq = WORKBENCH_INTERACT_RANGE * WORKBENCH_INTERACT_RANGE;
        let nearEnchantmentTable = false;

        this.state.enchantmentTables.forEach((table) => {
            if (nearEnchantmentTable) return;
            const dx = footX - table.x;
            const dy = footY - table.y;
            nearEnchantmentTable = dx * dx + dy * dy <= rangeSq;
        });

        return nearEnchantmentTable;
    }

    private isWorkbenchLeftCell(col: number, row: number, layer: 1 | 2): boolean {
        return this.getMapTileValue(col, row, layer) === WORKBENCH_LEFT_FRAME + 1
            && this.getMapTileValue(col + 1, row, layer) === WORKBENCH_RIGHT_FRAME + 1;
    }

    private getPlayerAxeCooldownMs(player: PlayerState): number {
        return ATTACK_COOLDOWN_MS / (1 + 0.25 * Math.max(0, player.axeSwingSpeedUpgrades || 0));
    }

    private getPlayerAxePrimaryDamage(player: PlayerState): number {
        const rank = clamp(Math.floor(player.axePrimaryDamageUpgrades || 0), 0, AXE_PRIMARY_DAMAGE_UPGRADE_MAX_RANK);
        return 1 + rank;
    }

    private getPlayerShieldBashCooldownMs(player: PlayerState): number {
        const rank = clamp(Math.floor(player.shieldPrimaryAttackSpeedUpgrades || 0), 0, UPGRADE_MAX_RANK);
        return SHIELD_BASH_COOLDOWN_MS / (1 + 0.25 * rank);
    }

    private getPlayerShieldBashDamage(player: PlayerState): number {
        const rank = clamp(Math.floor(player.shieldPrimaryDamageUpgrades || 0), 0, SHIELD_PRIMARY_DAMAGE_UPGRADE_MAX_RANK);
        return 1 + rank;
    }

    private getPlayerShieldRegenIntervalMs(player: PlayerState): number {
        const rank = clamp(Math.floor(player.shieldRechargeUpgrades || 0), 0, SHIELD_RECHARGE_UPGRADE_MAX_RANK);
        return SHIELD_REGEN_INTERVAL_MS / (1 + 0.10 * rank);
    }

    private getPlayerShieldBlockRadius(player: PlayerState): number {
        const rank = clamp(Math.floor(player.shieldSizeUpgrades || 0), 0, SHIELD_SIZE_UPGRADE_MAX_RANK);
        return SHIELD_BLOCK_RADIUS * (1 + 0.25 * rank);
    }

    private getPlayerAxeWhirlwindCooldownMs(player: PlayerState): number {
        const rank = clamp(Math.floor(player.axeWhirlwindCooldownUpgrades || 0), 0, UPGRADE_MAX_RANK);
        return Math.max(AXE_WHIRLWIND_COOLDOWN_MIN_MS, AXE_WHIRLWIND_COOLDOWN_MS - 2000 * rank);
    }

    private getPlayerAxeWhirlwindRadius(player: PlayerState): number {
        const rank = clamp(Math.floor(player.axeWhirlwindAoeUpgrades || 0), 0, AXE_WHIRLWIND_AOE_UPGRADE_MAX_RANK);
        return AXE_WHIRLWIND_RADIUS * (1 + 0.5 * rank);
    }

    private getPlayerAxeWhirlwindDamage(player: PlayerState): number {
        const rank = clamp(Math.floor(player.axeWhirlwindDamageUpgrades || 0), 0, AXE_WHIRLWIND_DAMAGE_UPGRADE_MAX_RANK);
        return AXE_WHIRLWIND_DAMAGE + rank;
    }

    private getPlayerBowChargeMs(player: PlayerState): number {
        const rank = clamp(Math.floor(player.bowChargeTimeUpgrades || 0), 0, BOW_PRIMARY_UPGRADE_MAX_RANK);
        return Math.max(MIN_BOW_CHARGE_MS, BOW_CHARGE_MS / (1 + 0.20 * rank));
    }

    private getPlayerBowVolleyCooldownMs(player: PlayerState): number {
        const rank = clamp(Math.floor(player.bowVolleyCooldownUpgrades || 0), 0, BOW_VOLLEY_COOLDOWN_UPGRADE_MAX_RANK);
        return Math.max(0, BOW_VOLLEY_COOLDOWN_MS - 1000 * rank);
    }

    private getPlayerBowVolleyRadius(player: PlayerState): number {
        const rank = clamp(Math.floor(player.bowVolleyAoeUpgrades || 0), 0, BOW_VOLLEY_AOE_UPGRADE_MAX_RANK);
        return BOW_VOLLEY_RADIUS * (1 + 0.25 * rank);
    }

    private getPlayerBowVolleyDamage(player: PlayerState): number {
        const rank = clamp(Math.floor(player.bowVolleyDamageUpgrades || 0), 0, BOW_VOLLEY_DAMAGE_UPGRADE_MAX_RANK);
        return BOW_VOLLEY_DAMAGE + rank;
    }

    private startBowCharge(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.alive || player.isDead || this.state.gameOver) return;
        if (player.activeItem !== ITEM_WOOD_BOW || sp.bowCharging || sp.bowVolleyActive) return;

        this.cancelRevive(sessionId);
        const vector = this.getBowAimVector(player, data);
        const direction = directionFromInput(vector.x, vector.y) || player.facingDirection || "N";
        sp.bowCharging = true;
        sp.bowChargeMs = 0;
        sp.bowChargeX = player.x;
        sp.bowChargeY = player.y;
        sp.bowAimX = vector.x;
        sp.bowAimY = vector.y;
        sp.bowChargeMoveLeft = sp.input.left;
        sp.bowChargeMoveRight = sp.input.right;
        sp.bowChargeMoveUp = sp.input.up;
        sp.bowChargeMoveDown = sp.input.down;
        sp.vx = 0;
        sp.vy = 0;
        sp.attackLockMs = 0;
        player.bowCharging = true;
        player.bowChargeProgress = 0;
        player.bowChargeSeq++;
        player.facingDirection = direction;
        player.attackDirection = direction;
        player.attackItem = ITEM_WOOD_BOW;
    }

    private updateBowAim(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.bowCharging || player.isDead) return;

        const vector = this.getBowAimVector(player, data);
        const direction = directionFromInput(vector.x, vector.y) || player.facingDirection || "N";
        sp.bowAimX = vector.x;
        sp.bowAimY = vector.y;
        player.facingDirection = direction;
        player.attackDirection = direction;
    }

    private fireBowCharge(sessionId: string) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.bowCharging || !sp.alive || player.isDead || this.state.gameOver) return;

        if (player.bowChargeProgress < 1) return;
        const origin = { x: player.x, y: player.y + ATTACK_HIT_ORIGIN_Y_OFFSET };
        const vector = { x: sp.bowAimX, y: sp.bowAimY };
        const direction = directionFromInput(vector.x, vector.y) || player.facingDirection || "N";
        this.clearBowCharge(player, sp);

        player.facingDirection = direction;
        player.attackDirection = direction;
        player.attackItem = ITEM_WOOD_BOW;
        player.attackSeq++;
        this.spawnArrow(origin.x, origin.y, vector.x, vector.y, sessionId);
    }

    private clearBowCharge(player: PlayerState, sp: ServerPlayer) {
        sp.bowCharging = false;
        sp.bowChargeMs = 0;
        sp.bowChargeX = player.x;
        sp.bowChargeY = player.y;
        sp.bowChargeMoveLeft = false;
        sp.bowChargeMoveRight = false;
        sp.bowChargeMoveUp = false;
        sp.bowChargeMoveDown = false;
        player.bowCharging = false;
        player.bowChargeProgress = 0;
    }

    private startBowVolley(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.alive || player.isDead || this.state.gameOver) return;
        if (player.activeItem !== ITEM_WOOD_BOW || sp.bowCharging || sp.bowVolleyActive || sp.bowVolleyCooldownMs > 0 || sp.dashMs > 0 || sp.axeWhirlwind) return;

        this.cancelRevive(sessionId);
        this.clearBowCharge(player, sp);
        const target = this.getBowVolleyTarget(player, data);
        const direction = directionFromInput(target.x - player.x, target.y - player.y) || player.facingDirection || "N";
        sp.bowVolleyActive = true;
        sp.bowVolleyLockX = player.x;
        sp.bowVolleyLockY = player.y;
        sp.bowVolleyTargetX = target.x;
        sp.bowVolleyTargetY = target.y;
        sp.bowChargeMs = 0;
        sp.bowChargeX = player.x;
        sp.bowChargeY = player.y;
        sp.bowChargeMoveLeft = sp.input.left;
        sp.bowChargeMoveRight = sp.input.right;
        sp.bowChargeMoveUp = sp.input.up;
        sp.bowChargeMoveDown = sp.input.down;
        sp.vx = 0;
        sp.vy = 0;
        sp.attackLockMs = 0;
        player.bowCharging = true;
        player.bowChargeProgress = 0;
        player.bowChargeSeq++;
        player.facingDirection = direction;
        player.attackDirection = direction;
        player.attackItem = ITEM_WOOD_BOW;
    }

    private updateBowVolleyAim(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.bowVolleyActive || player.isDead) return;

        const target = this.getBowVolleyTarget(player, data);
        const direction = directionFromInput(target.x - player.x, target.y - player.y) || player.facingDirection || "N";
        sp.bowVolleyTargetX = target.x;
        sp.bowVolleyTargetY = target.y;
        player.facingDirection = direction;
        player.attackDirection = direction;
    }

    private releaseBowVolley(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.bowVolleyActive) return;

        const target = this.getBowVolleyTarget(player, data);
        const fullyCharged = player.bowChargeProgress >= 1;
        this.clearBowVolley(sp);
        this.clearBowCharge(player, sp);
        if (!fullyCharged) return;
        if (!sp.alive || player.isDead || this.state.gameOver || player.activeItem !== ITEM_WOOD_BOW) return;

        const radius = this.getPlayerBowVolleyRadius(player);
        const cooldownMs = this.getPlayerBowVolleyCooldownMs(player);
        sp.bowVolleyCooldownMs = cooldownMs;
        player.bowVolleyCooldownProgress = cooldownMs > 0 ? 1 : 0;
        const id = `bow-volley-${nextId()}`;
        this.broadcast("bowVolleyTelegraph", {
            id,
            attackerId: sessionId,
            x: target.x,
            y: target.y,
            radius,
            impactDelayMs: BOW_VOLLEY_IMPACT_DELAY_MS,
        });
        setTimeout(() => {
            this.applyBowVolleyImpact(id, sessionId, target.x, target.y, radius);
        }, BOW_VOLLEY_IMPACT_DELAY_MS);
    }

    private cancelBowVolley(sessionId: string) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!sp) return;
        this.clearBowVolley(sp);
        if (player) this.clearBowCharge(player, sp);
    }

    private clearBowVolley(sp: ServerPlayer) {
        sp.bowVolleyActive = false;
        sp.bowVolleyLockX = 0;
        sp.bowVolleyLockY = 0;
        sp.bowVolleyTargetX = 0;
        sp.bowVolleyTargetY = 0;
    }

    private updateBowVolleyCooldown(player: PlayerState, sp: ServerPlayer, dtMs: number) {
        if (sp.bowVolleyCooldownMs <= 0) {
            if (player.bowVolleyCooldownProgress !== 0) player.bowVolleyCooldownProgress = 0;
            return;
        }

        const cooldownMs = this.getPlayerBowVolleyCooldownMs(player);
        if (cooldownMs <= 0) {
            sp.bowVolleyCooldownMs = 0;
            player.bowVolleyCooldownProgress = 0;
            return;
        }
        sp.bowVolleyCooldownMs = Math.max(0, sp.bowVolleyCooldownMs - dtMs);
        player.bowVolleyCooldownProgress = clamp(sp.bowVolleyCooldownMs / cooldownMs, 0, 1);
    }

    private getBowVolleyTarget(player: PlayerState, data: unknown): { x: number; y: number } {
        const payload = data as { targetX?: unknown; targetY?: unknown } | null;
        let x = typeof payload?.targetX === "number" && Number.isFinite(payload.targetX) ? payload.targetX : player.x;
        let y = typeof payload?.targetY === "number" && Number.isFinite(payload.targetY) ? payload.targetY : player.y;
        x = clamp(x, 0, WORLD_WIDTH);
        y = clamp(y, 0, WORLD_HEIGHT);

        const dx = x - player.x;
        const dy = y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > BOW_VOLLEY_RANGE) {
            x = player.x + (dx / distance) * BOW_VOLLEY_RANGE;
            y = player.y + (dy / distance) * BOW_VOLLEY_RANGE;
        }

        return {
            x: clamp(x, 0, WORLD_WIDTH),
            y: clamp(y, 0, WORLD_HEIGHT),
        };
    }

    private didPressMovementAfterBowCharge(sp: ServerPlayer, left: boolean, right: boolean, up: boolean, down: boolean): boolean {
        const pressed = (left && !sp.bowChargeMoveLeft)
            || (right && !sp.bowChargeMoveRight)
            || (up && !sp.bowChargeMoveUp)
            || (down && !sp.bowChargeMoveDown);
        sp.bowChargeMoveLeft = left;
        sp.bowChargeMoveRight = right;
        sp.bowChargeMoveUp = up;
        sp.bowChargeMoveDown = down;
        return pressed;
    }

    private tryDashPlayer(sessionId: string) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.alive || player.isDead || this.state.gameOver) return;
        if (sp.attackLockMs > 0 || sp.bowCharging || sp.bowVolleyActive || sp.dashMs > 0 || sp.dashCooldownMs > 0) return;

        const vector = DIRECTION_VECTORS[player.facingDirection] || DIRECTION_VECTORS.N;
        sp.vx = 0;
        sp.vy = 0;
        sp.dashMs = PLAYER_DASH_DURATION_MS;
        sp.dashDirX = vector.x;
        sp.dashDirY = vector.y;
        sp.dashCooldownMs = PLAYER_DASH_COOLDOWN_MS;
        player.dashing = true;
        player.dashCooldownProgress = 1;
    }

    private setAxeWhirlwind(sessionId: string, active: boolean) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp) return;

        if (!active) {
            this.endAxeWhirlwind(player, sp, true);
            return;
        }
        if (!sp.alive || player.isDead || this.state.gameOver || player.activeItem !== ITEM_WOOD_AXE) return;
        if (sp.axeWhirlwind || sp.axeWhirlwindCooldownMs > 0) return;

        this.cancelRevive(sessionId);
        this.clearBowCharge(player, sp);
        this.clearBowVolley(sp);
        sp.axeWhirlwind = true;
        sp.axeWhirlwindTickMs = 0;
        sp.axeWhirlwindElapsedMs = 0;
        player.axeWhirlwind = true;
        player.axeWhirlwindProgress = 1;
        player.axeWhirlwindCooldownProgress = 0;
        player.attackItem = ITEM_WOOD_AXE;
    }

    private endAxeWhirlwind(player: PlayerState, sp: ServerPlayer, startCooldown: boolean) {
        const wasActive = sp.axeWhirlwind || player.axeWhirlwind;
        sp.axeWhirlwind = false;
        sp.axeWhirlwindTickMs = 0;
        sp.axeWhirlwindElapsedMs = 0;
        player.axeWhirlwind = false;
        player.axeWhirlwindProgress = 0;
        if (!wasActive) return;

        sp.axeWhirlwindCooldownMs = startCooldown ? this.getPlayerAxeWhirlwindCooldownMs(player) : 0;
        player.axeWhirlwindCooldownProgress = startCooldown ? 1 : 0;
    }

    private clearAxeWhirlwindState(player: PlayerState, sp: ServerPlayer) {
        sp.axeWhirlwind = false;
        sp.axeWhirlwindTickMs = 0;
        sp.axeWhirlwindElapsedMs = 0;
        sp.axeWhirlwindCooldownMs = 0;
        player.axeWhirlwind = false;
        player.axeWhirlwindProgress = 0;
        player.axeWhirlwindCooldownProgress = 0;
    }

    private setShieldBlocking(sessionId: string, active: boolean) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp) return;

        if (!active) {
            player.shieldBlocking = false;
            return;
        }
        if (!sp.alive || player.isDead || this.state.gameOver || !this.isShieldItem(player.activeItem)) return;
        this.normalizeHotbar(player);
        const shieldIndex = player.activeSlot - 1;
        if (shieldIndex < 0 || shieldIndex >= HOTBAR_SLOT_COUNT) return;
        if ((player.hotbarShieldHp[shieldIndex] || 0) <= 0 || sp.shieldBlockCooldownMs > 0) return;

        this.cancelRevive(sessionId);
        this.clearBowCharge(player, sp);
        this.clearBowVolley(sp);
        this.setAxeWhirlwind(sessionId, false);
        player.shieldBlocking = true;
        player.attackItem = player.activeItem;
    }

    private updateShieldBlockCooldown(player: PlayerState, sp: ServerPlayer, dtMs: number) {
        if (sp.shieldBlockCooldownMs <= 0) {
            if (player.shieldBlockCooldownProgress !== 0) player.shieldBlockCooldownProgress = 0;
            return;
        }

        sp.shieldBlockCooldownMs = Math.max(0, sp.shieldBlockCooldownMs - dtMs);
        player.shieldBlockCooldownProgress = clamp(sp.shieldBlockCooldownMs / SHIELD_BLOCK_BREAK_COOLDOWN_MS, 0, 1);
    }

    private updateShieldRegeneration(player: PlayerState, sp: ServerPlayer, dtMs: number) {
        this.normalizeHotbar(player);
        const regenIntervalMs = this.getPlayerShieldRegenIntervalMs(player);
        sp.shieldRegenMs += dtMs;
        if (sp.shieldRegenMs < regenIntervalMs) return;

        const regenSteps = Math.floor(sp.shieldRegenMs / regenIntervalMs);
        sp.shieldRegenMs -= regenSteps * regenIntervalMs;
        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            const maxHp = Math.max(0, Math.floor(player.hotbarShieldMaxHp[i] || 0));
            if (maxHp <= 0) continue;
            const currentHp = clamp(Math.floor(player.hotbarShieldHp[i] || 0), 0, maxHp);
            player.hotbarShieldHp[i] = Math.min(maxHp, currentHp + regenSteps);
        }
    }

    private updateAxeWhirlwindCooldown(player: PlayerState, sp: ServerPlayer, dtMs: number) {
        if (sp.axeWhirlwindCooldownMs <= 0) {
            if (player.axeWhirlwindCooldownProgress !== 0) player.axeWhirlwindCooldownProgress = 0;
            return;
        }

        sp.axeWhirlwindCooldownMs = Math.max(0, sp.axeWhirlwindCooldownMs - dtMs);
        player.axeWhirlwindCooldownProgress = clamp(sp.axeWhirlwindCooldownMs / this.getPlayerAxeWhirlwindCooldownMs(player), 0, 1);
    }

    private getBowAimVector(player: PlayerState, data: unknown): AttackVector {
        const vector = this.getAttackVector(
            { x: player.x, y: player.y },
            player.facingDirection || "N",
            (data as { targetX?: unknown })?.targetX,
            (data as { targetY?: unknown })?.targetY,
        );
        const length = Math.hypot(vector.x, vector.y);
        if (length <= 0.0001) return DIRECTION_VECTORS[player.facingDirection] || DIRECTION_VECTORS.N;
        return { x: vector.x / length, y: vector.y / length };
    }

    onJoin(client: Client, options: { displayName?: unknown } = {}) {
        const ps = new PlayerState();
        ps.sessionId = client.sessionId;
        ps.displayName = sanitizeDisplayName(options.displayName);
        ps.x = this.playableWorldWidth() / 2;
        ps.y = this.playableWorldHeight() / 2;
        const spawn = this.findNearestOpenPlayerPosition(ps.x, ps.y);
        ps.x = spawn.x;
        ps.y = spawn.y;
        ps.maxHealth = PLAYER_MAX_HEALTH;
        ps.health = PLAYER_MAX_HEALTH;
        this.triggerPlayerDamageFlash(ps, PLAYER_SPAWN_INVULNERABILITY_MS, PLAYER_INVULNERABILITY_FLASH_BLINK_MS);
        ps.kills = 0;
        ps.level = 1;
        ps.experience = 0;
        ps.experienceToNext = FIRST_LEVEL_UP_XP;
        ps.wood = 0;
        ps.facingDirection = "N";
        ps.attackDirection = "N";
        this.initializeHotbar(ps);
        ps.attackSeq = 0;
        ps.axeAttackHitboxActive = false;
        ps.dashing = false;
        ps.dashCooldownProgress = 0;
        ps.axeWhirlwind = false;
        ps.axeWhirlwindProgress = 0;
        ps.axeWhirlwindCooldownProgress = 0;
        ps.axeWhirlwindHitSeq = 0;
        ps.bowCharging = false;
        ps.bowChargeProgress = 0;
        ps.bowChargeSeq = 0;
        ps.bowVolleyCooldownProgress = 0;
        this.state.players.set(client.sessionId, ps);

        this.serverPlayers.set(client.sessionId, {
            vx: 0, vy: 0,
            fireCounter: 0,
            attackLockMs: 0,
            attackLockX: ps.x,
            attackLockY: ps.y,
            attackCooldownMs: 0,
            dashMs: 0,
            dashDirX: 0,
            dashDirY: 0,
            dashCooldownMs: 0,
            bowCharging: false,
            bowChargeMs: 0,
            bowChargeX: ps.x,
            bowChargeY: ps.y,
            bowAimX: 0,
            bowAimY: -1,
            bowChargeMoveLeft: false,
            bowChargeMoveRight: false,
            bowChargeMoveUp: false,
            bowChargeMoveDown: false,
            bowVolleyActive: false,
            bowVolleyLockX: ps.x,
            bowVolleyLockY: ps.y,
            bowVolleyTargetX: ps.x,
            bowVolleyTargetY: ps.y,
            bowVolleyCooldownMs: 0,
            axeWhirlwind: false,
            axeWhirlwindTickMs: 0,
            axeWhirlwindElapsedMs: 0,
            axeWhirlwindCooldownMs: 0,
            shieldBlockCooldownMs: 0,
            shieldRegenMs: 0,
            pickupCheckMs: 0,
            revivingTargetId: null,
            invulnerableUntilMs: this.elapsedMs + PLAYER_SPAWN_INVULNERABILITY_MS,
            input: { left: false, right: false, up: false, down: false, fire: false, interact: false },
            alive: true,
        });

        if (!this.state.gameStarted) {
            this.state.gameStarted = true;
            this.elapsedMs = 0;
            this.campfireHealElapsedMs = 0;
            this.state.elapsedSeconds = 0;
            this.state.waveNumber = 0;
            this.state.gameOverCountdown = 0;
            if (!this.isMapEditor()) this.startEnemyWaveSchedule();
            this.updateRoomListingMetadata();
            this.logRoomEvent("game started", {
                players: this.state.players.size,
                mode: this.state.mode,
                map: this.state.activeMapName || "none",
            });
        }
        this.updateRoomListingMetadata();
        if (this.nextEnemyWaveStartMs !== null) this.updateNextWaveReadyState();
        this.logRoomEvent("player joined", {
            playerId: client.sessionId,
            players: this.state.players.size,
            gameStarted: this.state.gameStarted,
            gameOver: this.state.gameOver,
        });
    }

    // ─── Reset game state (called when a player rejoins after game over) ──────
    private resetLevel() {
        this.logRoomEvent("level reset", {
            players: this.state.players.size,
            previousWave: this.currentWaveIndex + 1,
            elapsedSeconds: this.state.elapsedSeconds,
            enemies: this.state.enemies.size,
            playerBullets: this.state.playerBullets.size,
            enemyBullets: this.state.enemyBullets.size,
            score: this.state.teamScore,
        });
        this.broadcast("levelReset", {});
        this.state.enemies.clear();
        this.serverEnemies.clear();
        this.state.playerBullets.clear();
        this.serverPlayerBullets.clear();
        this.state.enemyBullets.clear();
        this.serverEnemyBullets.clear();
        this.activeAxeAttacks = [];
        this.clearNextWaveReadyState();
        this.state.logs.clear();
        this.state.boneDrops.clear();
        this.state.campfires.clear();
        this.campfireOwners.clear();
        this.state.caltrops.clear();
        this.rebuildCaltropsIndex();
        this.generateTrees();

        this.state.players.forEach((player, sid) => {
            const spawn = this.findNearestOpenPlayerPosition(this.playableWorldWidth() / 2, this.playableWorldHeight() / 2);
            player.x = spawn.x;
            player.y = spawn.y;
            player.maxHealth = PLAYER_MAX_HEALTH;
            player.health = PLAYER_MAX_HEALTH;
            this.triggerPlayerDamageFlash(player, PLAYER_SPAWN_INVULNERABILITY_MS, PLAYER_INVULNERABILITY_FLASH_BLINK_MS);
            player.kills = 0;
            player.level = 1;
            player.experience = 0;
            player.experienceToNext = FIRST_LEVEL_UP_XP;
            player.isDead = false;
            player.reviveProgress = 0;
            player.facingDirection = "N";
            player.attackDirection = "N";
            this.initializeHotbar(player);
            player.attackSeq = 0;
            player.axeAttackHitboxActive = false;
            player.dashing = false;
            player.dashCooldownProgress = 0;
            player.axeWhirlwind = false;
            player.axeWhirlwindProgress = 0;
            player.axeWhirlwindCooldownProgress = 0;
            player.axeWhirlwindHitSeq = 0;
            player.bowCharging = false;
            player.bowChargeProgress = 0;
            player.bowChargeSeq = 0;
            player.bowVolleyCooldownProgress = 0;
            player.shieldBlocking = false;
            player.shieldBlockCooldownProgress = 0;
            player.pendingUpgradeChoices = 0;
            player.axeSwingSpeedUpgrades = 0;
            player.axePrimaryDamageUpgrades = 0;
            player.axeTreeDamageUpgrades = 0;
            player.axeEnemyDamageUpgrades = 0;
            player.axeWoodGainUpgrades = 0;
            player.axeCampfireMaxUpgrades = 0;
            player.axeWhirlwindCooldownUpgrades = 0;
            player.axeWhirlwindAoeUpgrades = 0;
            player.axeWhirlwindDamageUpgrades = 0;
            player.bowDamageUpgrades = 0;
            player.bowPierceUpgrades = 0;
            player.bowChargeTimeUpgrades = 0;
            player.bowVolleyCooldownUpgrades = 0;
            player.bowVolleyAoeUpgrades = 0;
            player.bowVolleyDamageUpgrades = 0;
            player.shieldPrimaryAttackSpeedUpgrades = 0;
            player.shieldPrimaryDamageUpgrades = 0;
            player.shieldMaxHpUpgrades = 0;
            player.shieldRechargeUpgrades = 0;
            player.shieldSizeUpgrades = 0;
            player.woodGatherUpgrades = 0;
            player.campfireUpgrades = 0;
            player.pendingCampfireCharges = 0;

            const sp = this.serverPlayers.get(sid);
            if (!sp) return;
            sp.vx = 0;
            sp.vy = 0;
            sp.fireCounter = 0;
            sp.attackLockMs = 0;
            sp.attackLockX = player.x;
            sp.attackLockY = player.y;
            sp.attackCooldownMs = 0;
            sp.dashMs = 0;
            sp.dashDirX = 0;
            sp.dashDirY = 0;
            sp.dashCooldownMs = 0;
            sp.bowCharging = false;
            sp.bowChargeMs = 0;
            sp.bowChargeX = player.x;
            sp.bowChargeY = player.y;
            sp.bowAimX = 0;
            sp.bowAimY = -1;
            sp.bowChargeMoveLeft = false;
            sp.bowChargeMoveRight = false;
            sp.bowChargeMoveUp = false;
            sp.bowChargeMoveDown = false;
            sp.bowVolleyActive = false;
            sp.bowVolleyLockX = player.x;
            sp.bowVolleyLockY = player.y;
            sp.bowVolleyTargetX = player.x;
            sp.bowVolleyTargetY = player.y;
            sp.bowVolleyCooldownMs = 0;
            sp.axeWhirlwind = false;
            sp.axeWhirlwindTickMs = 0;
            sp.axeWhirlwindElapsedMs = 0;
            sp.axeWhirlwindCooldownMs = 0;
            sp.shieldBlockCooldownMs = 0;
            sp.shieldRegenMs = 0;
            sp.pickupCheckMs = 0;
            sp.revivingTargetId = null;
            sp.invulnerableUntilMs = PLAYER_SPAWN_INVULNERABILITY_MS;
            sp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
            sp.alive = true;
        });

        this.state.teamScore = 0;
        this.elapsedMs = 0;
        this.campfireHealElapsedMs = 0;
        this.state.elapsedSeconds = 0;
        this.state.waveNumber = 0;
        this.state.gameOver = false;
        this.state.gameOverCountdown = 0;
        this.clearGameOverRetryReadyState();
        this.gameOverRestartMs = 0;
        if (this.state.gameStarted && this.state.players.size > 0) this.startEnemyWaveSchedule();
        this.updateRoomListingMetadata();
    }

    onLeave(client: Client) {
        this.cancelRevive(client.sessionId);
        this.cancelRevivesTargeting(client.sessionId);
        this.state.players.delete(client.sessionId);
        this.serverPlayers.delete(client.sessionId);
        this.nextWaveReadyPlayerIds.delete(client.sessionId);
        this.gameOverRetryReadyPlayerIds.delete(client.sessionId);
        if (this.nextEnemyWaveStartMs !== null) {
            this.updateNextWaveReadyState();
            if (this.areAllPlayersReadyForNextWave()) {
                this.nextEnemyWaveStartMs = this.elapsedMs;
                this.state.nextWaveCountdown = 0;
            }
        }
        this.updateGameOverRetryReadyState();
        this.logRoomEvent("player left", {
            playerId: client.sessionId,
            players: this.state.players.size,
            gameStarted: this.state.gameStarted,
            gameOver: this.state.gameOver,
        });
        this.checkAllDead();
        this.updateRoomListingMetadata();
    }

    onDispose() {
        this.logRoomEvent("room disposed", {
            players: this.state.players.size,
            elapsedSeconds: this.state.elapsedSeconds,
            wave: this.currentWaveIndex + 1,
            enemies: this.state.enemies.size,
            map: this.state.activeMapName || "none",
        });
        _usedCodes.delete(this.roomId);
    }

    private generateTrees() {
        this.state.trees.clear();
        this.serverTreeHealth.clear();

        const usableWidth = WORLD_WIDTH - TREE_EDGE_PADDING * 2;
        const usableHeight = WORLD_HEIGHT - TREE_EDGE_PADDING * 2;
        const cellWidth = usableWidth / TREE_GRID_COLS;
        const cellHeight = usableHeight / TREE_GRID_ROWS;
        const spawnX = WORLD_WIDTH / 2;
        const spawnY = WORLD_HEIGHT / 2;

        let treeIndex = 0;
        for (let row = 0; row < TREE_GRID_ROWS; row++) {
            for (let col = 0; col < TREE_GRID_COLS; col++) {
                let x = 0;
                let y = 0;

                for (let attempt = 0; attempt < 24; attempt++) {
                    x = TREE_EDGE_PADDING + col * cellWidth + rndReal(cellWidth * 0.2, cellWidth * 0.8);
                    y = TREE_EDGE_PADDING + row * cellHeight + rndReal(cellHeight * 0.2, cellHeight * 0.8);
                    const snapped = this.snapTopdownTreeAnchor(x, y);
                    x = snapped.x;
                    y = snapped.y;

                    if (
                        Math.hypot(x - spawnX, y - spawnY) >= TREE_SPAWN_CLEAR_RADIUS
                        && this.topdownTreeHasSpawnSpace(x, y)
                    ) break;
                }

                if (Math.hypot(x - spawnX, y - spawnY) < TREE_SPAWN_CLEAR_RADIUS) {
                    const dx = x - spawnX || 1;
                    const dy = y - spawnY || 0;
                    const length = Math.hypot(dx, dy);
                    x = spawnX + (dx / length) * TREE_SPAWN_CLEAR_RADIUS;
                    y = spawnY + (dy / length) * TREE_SPAWN_CLEAR_RADIUS;
                    x = clamp(x, TREE_EDGE_PADDING, WORLD_WIDTH - TREE_EDGE_PADDING);
                    y = clamp(y, TREE_EDGE_PADDING, WORLD_HEIGHT - TREE_EDGE_PADDING);
                    const snapped = this.snapTopdownTreeAnchor(x, y);
                    x = snapped.x;
                    y = snapped.y;
                }

                if (!this.topdownTreeHasSpawnSpace(x, y)) {
                    let relocated = false;
                    for (let attempt = 0; attempt < 64; attempt++) {
                        const candidateX = rndReal(TREE_EDGE_PADDING, WORLD_WIDTH - TREE_EDGE_PADDING);
                        const candidateY = rndReal(TREE_EDGE_PADDING, WORLD_HEIGHT - TREE_EDGE_PADDING);
                        const snapped = this.snapTopdownTreeAnchor(candidateX, candidateY);
                        if (
                            Math.hypot(snapped.x - spawnX, snapped.y - spawnY) < TREE_SPAWN_CLEAR_RADIUS
                            || !this.topdownTreeHasSpawnSpace(snapped.x, snapped.y)
                        ) continue;
                        x = snapped.x;
                        y = snapped.y;
                        relocated = true;
                        break;
                    }
                    if (!relocated) continue;
                }

                const tree = new TreeState();
                tree.id = `tree-${++treeIndex}`;
                tree.x = x;
                tree.y = y;
                tree.variant = TREE_VARIANT_TOPDOWN_3X3;
                this.state.trees.set(tree.id, tree);
                this.serverTreeHealth.set(tree.id, TREE_HEALTH);
            }
        }
    }

    private shouldReplenishTreesAfterWave(waveNumber: number): boolean {
        return waveNumber >= TREE_REPLENISH_FIRST_COMPLETED_WAVE
            && (waveNumber - TREE_REPLENISH_FIRST_COMPLETED_WAVE) % TREE_REPLENISH_WAVE_INTERVAL === 0;
    }

    private replenishTreesAfterWaveClear(waveNumber: number): void {
        if (!this.shouldReplenishTreesAfterWave(waveNumber)) return;

        const neededTrees = Math.max(0, TREE_COUNT - this.state.trees.size);
        let addedTrees = 0;

        for (let treeNumber = 0; treeNumber < neededTrees; treeNumber++) {
            const spot = this.findRandomTreeSpawnSpot();
            if (!spot) break;

            const tree = new TreeState();
            tree.id = `tree-${nextId()}`;
            tree.x = spot.x;
            tree.y = spot.y;
            tree.variant = TREE_VARIANT_TOPDOWN_3X3;
            this.state.trees.set(tree.id, tree);
            this.serverTreeHealth.set(tree.id, TREE_HEALTH);
            addedTrees++;
        }

        if (addedTrees <= 0) return;

        this.broadcast("treesReplenished", {
            waveNumber,
            addedTrees,
            totalTrees: this.state.trees.size,
        });
        this.logRoomEvent("trees replenished", {
            wave: waveNumber,
            addedTrees,
            totalTrees: this.state.trees.size,
        });
    }

    private findRandomTreeSpawnSpot(): { x: number; y: number } | null {
        const spawnX = WORLD_WIDTH / 2;
        const spawnY = WORLD_HEIGHT / 2;

        for (let attempt = 0; attempt < TREE_REPLENISH_MAX_ATTEMPTS_PER_TREE; attempt++) {
            const candidateX = rndReal(TREE_EDGE_PADDING, WORLD_WIDTH - TREE_EDGE_PADDING);
            const candidateY = rndReal(TREE_EDGE_PADDING, WORLD_HEIGHT - TREE_EDGE_PADDING);
            const snapped = this.snapTopdownTreeAnchor(candidateX, candidateY);
            if (
                Math.hypot(snapped.x - spawnX, snapped.y - spawnY) < TREE_SPAWN_CLEAR_RADIUS
                || !this.topdownTreeHasSpawnSpace(snapped.x, snapped.y)
                || this.treeOverlapsExistingTree(snapped.x, snapped.y)
            ) continue;

            return snapped;
        }

        return null;
    }

    private treeOverlapsExistingTree(x: number, y: number): boolean {
        const hitbox = this.getTreeHitbox({ x, y, variant: TREE_VARIANT_TOPDOWN_3X3 });
        let overlaps = false;
        this.state.trees.forEach((tree) => {
            if (overlaps) return;
            const otherHitbox = this.getTreeHitbox(tree);
            const radius = hitbox.radius + otherHitbox.radius;
            const dx = hitbox.x - otherHitbox.x;
            const dy = hitbox.y - otherHitbox.y;
            overlaps = dx * dx + dy * dy < radius * radius;
        });
        return overlaps;
    }

    private applyDelayedTreeAttackImpact(attackerId: string, direction: string, targetX: unknown, targetY: unknown) {
        const sp = this.serverPlayers.get(attackerId);
        const player = this.state.players.get(attackerId);
        if (!sp || !sp.alive || !player || this.state.gameOver) return;

        const attackOrigin = { x: player.x, y: player.y };
        const treeHit = this.damageTreeFromAttack(attackOrigin, attackerId, direction, targetX, targetY);
        if (treeHit) this.broadcast("treeHit", treeHit);
    }

    private startLingeringAxeEnemyAttack(attackerId: string, direction: string, targetX: unknown, targetY: unknown) {
        const sp = this.serverPlayers.get(attackerId);
        const player = this.state.players.get(attackerId);
        if (!sp || !sp.alive || !player || this.state.gameOver) return;

        const attack: ActiveAxeAttack = {
            attackerId,
            direction,
            targetX,
            targetY,
            remainingMs: AXE_ATTACK_LINGER_MS,
            hitEnemyIds: new Set<string>(),
        };
        player.axeAttackHitboxActive = true;
        this.applyLingeringAxeEnemyAttackImpact(attack);
        this.activeAxeAttacks.push(attack);
    }

    private applyLingeringAxeEnemyAttackImpact(attack: ActiveAxeAttack): boolean {
        const sp = this.serverPlayers.get(attack.attackerId);
        const player = this.state.players.get(attack.attackerId);
        if (!sp || !sp.alive || !player || player.isDead || this.state.gameOver) return false;

        const attackOrigin = { x: player.x, y: player.y };
        const enemyHits = this.damageEnemiesFromAttack(
            attackOrigin,
            attack.attackerId,
            attack.direction,
            attack.targetX,
            attack.targetY,
            attack.hitEnemyIds,
        );
        enemyHits.forEach((enemyHit) => this.broadcast("enemyHit", enemyHit));
        return true;
    }

    private tickActiveAxeAttacks(dtMs: number) {
        if (this.activeAxeAttacks.length <= 0) {
            this.clearInactiveAxeAttackHitboxFlags(new Set<string>());
            return;
        }

        const activeAttacks: ActiveAxeAttack[] = [];
        const activeAttackerIds = new Set<string>();
        this.activeAxeAttacks.forEach((attack) => {
            attack.remainingMs -= dtMs;
            if (attack.remainingMs <= 0) return;
            if (!this.applyLingeringAxeEnemyAttackImpact(attack)) return;
            activeAttacks.push(attack);
            activeAttackerIds.add(attack.attackerId);
        });
        this.activeAxeAttacks = activeAttacks;
        this.clearInactiveAxeAttackHitboxFlags(activeAttackerIds);
    }

    private clearInactiveAxeAttackHitboxFlags(activeAttackerIds: Set<string>) {
        this.state.players.forEach((player, playerId) => {
            player.axeAttackHitboxActive = activeAttackerIds.has(playerId);
        });
    }

    private damageTreeFromAttack(attackOrigin: AttackOrigin, attackerId: string, direction: string, targetX: unknown, targetY: unknown): TreeHitPayload | null {
        const hitTreeId = this.findTreeHitByAttack(attackOrigin, direction, targetX, targetY);
        if (!hitTreeId) return null;

        const tree = this.state.trees.get(hitTreeId);
        if (!tree) {
            this.serverTreeHealth.delete(hitTreeId);
            return null;
        }

        const attacker = this.state.players.get(attackerId);
        const damage = attacker ? this.getPlayerAxePrimaryDamage(attacker) : 1;
        const nextHealth = Math.max(0, (this.serverTreeHealth.get(hitTreeId) ?? TREE_HEALTH) - damage);
        const hitPayload = {
            treeId: hitTreeId,
            attackerId,
            x: tree.x,
            y: tree.y,
            remainingHealth: nextHealth,
        };

        if (nextHealth > 0) {
            this.serverTreeHealth.set(hitTreeId, nextHealth);
            return hitPayload;
        }

        this.spawnLogsForTree(tree);
        this.awardPlayerExperience(attackerId, 1);
        this.state.trees.delete(hitTreeId);
        this.serverTreeHealth.delete(hitTreeId);
        return hitPayload;
    }

    private applyAxeWhirlwindImpact(attackerId: string) {
        const sp = this.serverPlayers.get(attackerId);
        const player = this.state.players.get(attackerId);
        if (!sp || !sp.alive || !player || player.isDead || this.state.gameOver || player.activeItem !== ITEM_WOOD_AXE) {
            if (player && sp) this.setAxeWhirlwind(attackerId, false);
            return;
        }

        player.axeWhirlwindHitSeq++;
        const treeHits = this.damageTreesFromAxeWhirlwind(player.x, player.y, attackerId);
        treeHits.forEach((treeHit) => this.broadcast("treeHit", treeHit));

        const enemyHits = this.damageEnemiesFromAxeWhirlwind(player.x, player.y, attackerId);
        enemyHits.forEach((enemyHit) => this.broadcast("enemyHit", enemyHit));
    }

    private isShieldItem(item: string): boolean {
        return item === ITEM_WOOD_SHIELD || item === ITEM_BONE_SHIELD;
    }

    private applyShieldBash(attackerId: string, direction: string, targetX: unknown, targetY: unknown) {
        const sp = this.serverPlayers.get(attackerId);
        const player = this.state.players.get(attackerId);
        if (!sp || !sp.alive || !player || player.isDead || this.state.gameOver || !this.isShieldItem(player.activeItem)) return;

        const origin = { x: player.x, y: player.y };
        const vector = this.getAttackVector(origin, direction, targetX, targetY);
        const hitX = player.x + vector.x * SHIELD_BASH_FORWARD_OFFSET;
        const hitY = player.y + ATTACK_HIT_ORIGIN_Y_OFFSET + vector.y * SHIELD_BASH_FORWARD_OFFSET;
        const hitEnemyIds: string[] = [];

        this.state.enemies.forEach((enemy, enemyId) => {
            if (enemy.isDead) return;
            if (!circleOverlapsAabb(
                hitX,
                hitY,
                SHIELD_BASH_RADIUS,
                enemy.x,
                enemy.y,
                ENEMY_MELEE_HIT_HW,
                ENEMY_MELEE_HIT_HH,
            )) return;
            hitEnemyIds.push(enemyId);
        });

        hitEnemyIds.forEach((enemyId) => {
            const enemyHit = this.damageEnemyFromBowAttack(enemyId, attackerId, this.getPlayerShieldBashDamage(player));
            if (enemyHit) this.broadcast("enemyHit", enemyHit);
        });
    }

    private damageTreesFromAxeWhirlwind(x: number, y: number, attackerId: string): TreeHitPayload[] {
        const hitPayloads: TreeHitPayload[] = [];
        const hitTreeIds: string[] = [];
        const attacker = this.state.players.get(attackerId);
        const whirlwindRadius = attacker ? this.getPlayerAxeWhirlwindRadius(attacker) : AXE_WHIRLWIND_RADIUS;
        const whirlwindDamage = attacker ? this.getPlayerAxeWhirlwindDamage(attacker) : AXE_WHIRLWIND_DAMAGE;

        this.state.trees.forEach((tree, id) => {
            const hitbox = this.getTreeHitbox(tree);
            const dx = x - hitbox.x;
            const dy = y - hitbox.y;
            const radius = whirlwindRadius + hitbox.radius;
            if (dx * dx + dy * dy <= radius * radius) hitTreeIds.push(id);
        });

        hitTreeIds.forEach((treeId) => {
            const tree = this.state.trees.get(treeId);
            if (!tree) {
                this.serverTreeHealth.delete(treeId);
                return;
            }

            const nextHealth = Math.max(0, (this.serverTreeHealth.get(treeId) ?? TREE_HEALTH) - whirlwindDamage);
            hitPayloads.push({
                treeId,
                attackerId,
                x: tree.x,
                y: tree.y,
                remainingHealth: nextHealth,
            });

            if (nextHealth > 0) {
                this.serverTreeHealth.set(treeId, nextHealth);
                return;
            }

            this.spawnLogsForTree(tree);
            this.awardPlayerExperience(attackerId, 1);
            this.state.trees.delete(treeId);
            this.serverTreeHealth.delete(treeId);
        });

        return hitPayloads;
    }

    private damageEnemiesFromAxeWhirlwind(x: number, y: number, attackerId: string): EnemyHitPayload[] {
        const hitPayloads: EnemyHitPayload[] = [];
        const hitEnemyIds: string[] = [];
        const attacker = this.state.players.get(attackerId);
        const whirlwindRadius = attacker ? this.getPlayerAxeWhirlwindRadius(attacker) : AXE_WHIRLWIND_RADIUS;
        const whirlwindDamage = attacker ? this.getPlayerAxeWhirlwindDamage(attacker) : AXE_WHIRLWIND_DAMAGE;

        this.state.enemies.forEach((enemy, id) => {
            if (enemy.isDead) return;
            if (!circleOverlapsAabb(
                x,
                y,
                whirlwindRadius,
                enemy.x,
                enemy.y,
                ENEMY_MELEE_HIT_HW,
                ENEMY_MELEE_HIT_HH,
            )) return;
            hitEnemyIds.push(id);
        });

        hitEnemyIds.forEach((enemyId) => {
            const enemy = this.state.enemies.get(enemyId);
            if (!enemy) {
                this.serverEnemies.delete(enemyId);
                return;
            }
            if (enemy.isDead) return;

            enemy.health = Math.max(0, enemy.health - whirlwindDamage);
            if (enemy.health > 0) {
                enemy.damageSeq++;
                const se = this.serverEnemies.get(enemyId);
                if (se && !this.shouldPreserveDarkKnightAttackCooldown(enemy)) {
                    this.applyEnemyHitStun(enemy, se);
                }
            }

            hitPayloads.push({
                enemyId,
                attackerId,
                x: enemy.x,
                y: enemy.y,
                remainingHealth: enemy.health,
            });

            if (enemy.health <= 0) {
                this.awardPlayerKill(attackerId, enemy);
                this.state.teamScore += 10;
                this.killEnemy(enemyId, enemy);
            }
        });

        return hitPayloads;
    }

    private findTreeHitByAttack(attackOrigin: AttackOrigin, direction: string, targetX: unknown, targetY: unknown): string | null {
        const vector = this.getAttackVector(attackOrigin, direction, targetX, targetY);
        const originX = attackOrigin.x;
        const originY = attackOrigin.y + ATTACK_HIT_ORIGIN_Y_OFFSET;
        const attackStartX = originX + vector.x * ATTACK_HIT_START_OFFSET;
        const attackStartY = originY + vector.y * ATTACK_HIT_START_OFFSET;
        const attackEndX = originX + vector.x * ATTACK_HIT_END_OFFSET;
        const attackEndY = originY + vector.y * ATTACK_HIT_END_OFFSET;
        let closestTreeId: string | null = null;
        let closestDistanceSq = Number.POSITIVE_INFINITY;

        this.state.trees.forEach((tree, id) => {
            const hitbox = this.getTreeHitbox(tree);
            if (!capsuleOverlapsCircle(
                attackStartX,
                attackStartY,
                attackEndX,
                attackEndY,
                ATTACK_HIT_RADIUS,
                hitbox.x,
                hitbox.y,
                hitbox.radius,
            )) return;

            const dx = attackEndX - hitbox.x;
            const dy = attackEndY - hitbox.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq < closestDistanceSq) {
                closestDistanceSq = distanceSq;
                closestTreeId = id;
            }
        });

        return closestTreeId;
    }

    private damageEnemiesFromAttack(
        attackOrigin: AttackOrigin,
        attackerId: string,
        direction: string,
        targetX: unknown,
        targetY: unknown,
        hitEnemyIdsForAttack: Set<string> = new Set<string>(),
    ): EnemyHitPayload[] {
        const hitEnemyIds = this.findEnemyHitsByAttack(attackOrigin, direction, targetX, targetY);
        const hitPayloads: EnemyHitPayload[] = [];

        hitEnemyIds.forEach((enemyId) => {
            if (hitEnemyIdsForAttack.has(enemyId)) return;
            const enemy = this.state.enemies.get(enemyId);
            if (!enemy) {
                this.serverEnemies.delete(enemyId);
                return;
            }
            if (enemy.isDead) return;

            hitEnemyIdsForAttack.add(enemyId);
            const attacker = this.state.players.get(attackerId);
            const damage = attacker ? this.getPlayerAxePrimaryDamage(attacker) : 1;
            enemy.health = Math.max(0, enemy.health - damage);
            if (enemy.health > 0) {
                enemy.damageSeq++;
                const se = this.serverEnemies.get(enemyId);
                if (se && !this.shouldPreserveDarkKnightAttackCooldown(enemy)) {
                    this.applyEnemyHitStun(enemy, se);
                }
            }
            hitPayloads.push({
                enemyId,
                attackerId,
                x: enemy.x,
                y: enemy.y,
                remainingHealth: enemy.health,
            });

            if (enemy.health <= 0) {
                this.awardPlayerKill(attackerId, enemy);
                this.state.teamScore += 10;
                this.killEnemy(enemyId, enemy);
            }
        });

        return hitPayloads;
    }

    private damageEnemyFromBowAttack(enemyId: string, attackerId: string, damage: number = 1): EnemyHitPayload | null {
        const enemy = this.state.enemies.get(enemyId);
        if (!enemy) {
            this.serverEnemies.delete(enemyId);
            return null;
        }
        if (enemy.isDead) return null;

        enemy.health = Math.max(0, enemy.health - Math.max(1, Math.floor(damage)));
        if (enemy.health > 0) {
            enemy.damageSeq++;
            const se = this.serverEnemies.get(enemyId);
            if (se && !this.shouldPreserveDarkKnightAttackCooldown(enemy)) {
                this.applyEnemyHitStun(enemy, se);
            }
        }

        const hitPayload = {
            enemyId,
            attackerId,
            x: enemy.x,
            y: enemy.y,
            remainingHealth: enemy.health,
        };

        if (enemy.health <= 0) {
            this.awardPlayerKill(attackerId, enemy);
            this.state.teamScore += 10;
            this.killEnemy(enemyId, enemy);
        }

        return hitPayload;
    }

    private applyBowVolleyImpact(volleyId: string, attackerId: string, x: number, y: number, radius: number) {
        this.broadcast("bowVolleyImpact", { id: volleyId, attackerId, x, y, radius });
        if (this.state.gameOver || !this.state.players.has(attackerId)) return;

        const hitEnemyIds: string[] = [];
        this.state.enemies.forEach((enemy, enemyId) => {
            if (enemy.isDead) return;
            if (!circleOverlapsAabb(
                x,
                y,
                radius,
                enemy.x,
                enemy.y,
                ENEMY_HW,
                ENEMY_HH,
            )) return;
            hitEnemyIds.push(enemyId);
        });

        const attacker = this.state.players.get(attackerId);
        const damage = attacker ? this.getPlayerBowVolleyDamage(attacker) : BOW_VOLLEY_DAMAGE;
        hitEnemyIds.forEach((enemyId) => {
            const enemyHit = this.damageEnemyFromBowAttack(enemyId, attackerId, damage);
            if (enemyHit) this.broadcast("enemyHit", enemyHit);
        });
    }

    private shouldPreserveDarkKnightAttackCooldown(enemy: EnemyState): boolean {
        const se = this.serverEnemies.get(enemy.id);
        if (enemy.enemyType === ENEMY_TYPE_BOSS1) return se?.mode === "bossFuse";
        if (enemy.enemyType !== ENEMY_TYPE_DARK_KNIGHT) return false;
        return se?.mode === "dkRush" || se?.mode === "dkAttack" || se?.mode === "dkCooldown";
    }

    private applyEnemyHitStun(enemy: EnemyState, se: ServerEnemy): void {
        se.meleeAttackToken++;
        se.mode = "stun";
        se.modeMs = this.getEnemyHitStunMs(enemy);
        enemy.action = "idle";
    }

    private getEnemyHitStunMs(enemy: EnemyState): number {
        if (enemy.enemyType === ENEMY_TYPE_DARK_KNIGHT) {
            return Math.max(1, Math.round(ENEMY_HIT_STUN_MS * DARK_KNIGHT_HIT_STUN_MULTIPLIER));
        }
        return ENEMY_HIT_STUN_MS;
    }

    private findEnemyHitsByAttack(attackOrigin: AttackOrigin, direction: string, targetX: unknown, targetY: unknown): string[] {
        const vector = this.getAttackVector(attackOrigin, direction, targetX, targetY);
        const originX = attackOrigin.x;
        const originY = attackOrigin.y + ATTACK_HIT_ORIGIN_Y_OFFSET;
        const attackStartX = originX + vector.x * ATTACK_HIT_START_OFFSET;
        const attackStartY = originY + vector.y * ATTACK_HIT_START_OFFSET;
        const attackEndX = originX + vector.x * ATTACK_HIT_END_OFFSET;
        const attackEndY = originY + vector.y * ATTACK_HIT_END_OFFSET;
        const hitEnemyIds: string[] = [];

        this.state.enemies.forEach((enemy, id) => {
            if (!capsuleOverlapsAabb(
                attackStartX,
                attackStartY,
                attackEndX,
                attackEndY,
                ATTACK_HIT_RADIUS,
                enemy.x,
                enemy.y,
                ENEMY_MELEE_HIT_HW,
                ENEMY_MELEE_HIT_HH,
            )) return;

            hitEnemyIds.push(id);
        });

        return hitEnemyIds;
    }

    private killEnemy(enemyId: string, enemy: EnemyState) {
        if (enemy.isDead) return;

        enemy.isDead = true;
        enemy.action = "dead";
        enemy.deathSeq++;
        this.serverEnemies.delete(enemyId);

        setTimeout(() => {
            const current = this.state.enemies.get(enemyId);
            if (current?.isDead) {
                this.state.enemies.delete(enemyId);
            }
        }, ENEMY_DEATH_REMOVE_MS);
    }

    private awardPlayerKill(playerId: string, enemy: EnemyState) {
        const player = this.state.players.get(playerId);
        if (!player) return;

        player.kills++;
        this.maybeSpawnBoneDrop(enemy);
        if (enemy.enemyType === ENEMY_TYPE_BOSS1 || enemy.enemyType === ENEMY_TYPE_DARK_KNIGHT) {
            const experience = enemy.enemyType === ENEMY_TYPE_BOSS1 ? BOSS1_XP : 2;
            this.awardAllPlayersExperience(experience);
            return;
        }

        const experience = enemy.enemyType === ENEMY_TYPE_CASTER ? 2 : 1;
        this.awardPlayerExperience(playerId, experience);
    }

    private awardAllPlayersExperience(amount: number) {
        this.state.players.forEach((_player, playerId) => {
            this.awardPlayerExperience(playerId, amount);
        });
    }

    private awardPlayerExperience(playerId: string, amount: number) {
        const player = this.state.players.get(playerId);
        if (!player) return;
        if (!Number.isFinite(amount) || amount <= 0) return;

        player.experience += Math.floor(amount);

        let levelUps = 0;
        while (player.experience >= player.experienceToNext) {
            player.level++;
            player.experienceToNext = this.getExperienceToNextLevel(player.level);
            levelUps++;
        }

        if (levelUps > 0) {
            player.pendingUpgradeChoices += levelUps;
            player.maxHealth += levelUps;
            player.health = player.maxHealth;
            this.broadcast("playerLevelUp", {
                playerId,
                level: player.level,
                x: player.x,
                y: player.y,
            });
        }
    }

    private getExperienceToNextLevel(level: number): number {
        const levelNumber = Math.max(1, Math.floor(level));
        let totalExperience = 0;
        for (let currentLevel = 1; currentLevel <= levelNumber; currentLevel++) {
            totalExperience += Math.ceil(FIRST_LEVEL_UP_XP * Math.pow(LEVEL_XP_GROWTH_FACTOR, currentLevel - 1));
            if (totalExperience >= INT32_MAX) return INT32_MAX;
        }
        return totalExperience;
    }

    private getAttackVector(attackOrigin: AttackOrigin, direction: string, targetX: unknown, targetY: unknown): { x: number; y: number } {
        if (typeof targetX === "number" && typeof targetY === "number" && Number.isFinite(targetX) && Number.isFinite(targetY)) {
            const clampedTargetX = clamp(targetX, 0, WORLD_WIDTH);
            const clampedTargetY = clamp(targetY, 0, WORLD_HEIGHT);
            const dx = clampedTargetX - attackOrigin.x;
            const dy = clampedTargetY - (attackOrigin.y + ATTACK_HIT_ORIGIN_Y_OFFSET);
            const distance = Math.hypot(dx, dy);
            if (distance >= ATTACK_TARGET_MIN_DISTANCE) {
                return { x: dx / distance, y: dy / distance };
            }
        }

        return DIRECTION_VECTORS[direction] || DIRECTION_VECTORS.N;
    }

    private spawnLogsForTree(tree: TreeState) {
        const log = new LogState();
        log.id = `log-${nextId()}`;
        log.x = clamp(tree.x, LOG_WORLD_PADDING, WORLD_WIDTH - LOG_WORLD_PADDING);
        log.y = clamp(tree.y - 8, LOG_WORLD_PADDING, WORLD_HEIGHT - LOG_WORLD_PADDING);
        log.amount = WOOD_PILE_AMOUNT;
        this.state.logs.set(log.id, log);
    }

    private maybeSpawnBoneDrop(enemy: EnemyState): void {
        if (Math.random() >= BONE_DROP_CHANCE) return;

        const bone = new BoneDropState();
        bone.id = `bone-${nextId()}`;
        bone.x = clamp(enemy.x, LOG_WORLD_PADDING, WORLD_WIDTH - LOG_WORLD_PADDING);
        bone.y = clamp(enemy.y, LOG_WORLD_PADDING, WORLD_HEIGHT - LOG_WORLD_PADDING);
        bone.amount = BONE_DROP_AMOUNT;
        this.state.boneDrops.set(bone.id, bone);
    }

    private tryPickupBone(sessionId: string): number {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver) return 0;

        const pickupX = player.x;
        const pickupY = player.y;
        const pickupRadiusSq = BONE_PICKUP_RADIUS * BONE_PICKUP_RADIUS;
        let closestBoneId: string | null = null;
        let closestDistanceSq = Number.POSITIVE_INFINITY;

        this.state.boneDrops.forEach((bone, id) => {
            const dx = pickupX - bone.x;
            const dy = pickupY - bone.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq <= pickupRadiusSq && distanceSq < closestDistanceSq) {
                closestDistanceSq = distanceSq;
                closestBoneId = id;
            }
        });

        if (!closestBoneId) return 0;

        const bone = this.state.boneDrops.get(closestBoneId);
        if (!bone) return 0;

        const amount = Math.max(1, Math.floor(bone.amount || BONE_DROP_AMOUNT));
        if (!this.addBoneToHotbar(player, amount)) return 0;
        this.state.boneDrops.delete(closestBoneId);
        return amount;
    }

    private tryPickupWood(sessionId: string): number {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver) return 0;

        const pickupX = player.x;
        const pickupY = player.y;
        const pickupRadiusSq = WOOD_PICKUP_RADIUS * WOOD_PICKUP_RADIUS;
        let closestLogId: string | null = null;
        let closestDistanceSq = Number.POSITIVE_INFINITY;

        this.state.logs.forEach((log, id) => {
            const dx = pickupX - log.x;
            const dy = pickupY - log.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq <= pickupRadiusSq && distanceSq < closestDistanceSq) {
                closestDistanceSq = distanceSq;
                closestLogId = id;
            }
        });

        if (!closestLogId) return 0;

        const log = this.state.logs.get(closestLogId);
        if (!log) return 0;

        const hammerBonus = 0.5 * Math.max(0, player.woodGatherUpgrades || 0);
        const amount = Math.ceil((log.amount || WOOD_PILE_AMOUNT) * (1 + hammerBonus));
        if (!this.addWoodToHotbar(player, amount)) return 0;
        player.wood = this.getTotalHeldWood(player);
        this.state.logs.delete(closestLogId);
        return amount;
    }

    private tryAutoPickupResources(sessionId: string, sp: ServerPlayer, dtMs: number): void {
        if (this.state.logs.size === 0 && this.state.boneDrops.size === 0) return;

        sp.pickupCheckMs = Math.max(0, sp.pickupCheckMs - dtMs);
        if (sp.pickupCheckMs > 0) return;
        sp.pickupCheckMs = RESOURCE_PICKUP_CHECK_MS;

        const client = this.clients.find((candidate) => candidate.sessionId === sessionId);
        const bonePickupAmount = this.tryPickupBone(sessionId);
        if (bonePickupAmount > 0) {
            client?.send("bonePickup", { amount: bonePickupAmount });
            return;
        }

        const woodPickupAmount = this.tryPickupWood(sessionId);
        if (woodPickupAmount > 0) {
            client?.send("woodPickup", { amount: woodPickupAmount });
        }
    }

    private tryRemoveDeployable(sessionId: string, data: unknown): boolean {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver || !this.state.gameStarted) return false;
        if (player.activeItem !== ITEM_HAMMER) return false;

        const cell = this.getBuildCellFromData(data);
        if (!cell || !this.isBuildCellInRange(player, cell.x, cell.y)) return false;

        const campfireId = this.getCampfireIdForCell(cell);
        if (this.removeCampfire(campfireId)) {
            this.grantCampfireItem(player);
            return true;
        }

        const caltropsId = this.getCaltropsIdForCell(cell);
        if (!this.state.caltrops.has(caltropsId)) return false;
        if (!this.grantHotbarItem(player, ITEM_WOOD_CALTROPS)) return false;
        this.state.caltrops.delete(caltropsId);
        this.rebuildCaltropsIndex();
        return true;
    }

    private tryPlaceCampfire(sessionId: string, data: unknown): boolean {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver || !this.state.gameStarted) return false;
        if (player.activeItem !== ITEM_CAMPFIRE || this.getHotbarItem(player, player.activeSlot) !== ITEM_CAMPFIRE) return false;

        const cell = this.getBuildCellFromData(data);
        if (!cell || !this.isBuildCellInRange(player, cell.x, cell.y)) return false;
        if (this.isBuildCellOccupied(cell, cell.x, cell.y)) return false;
        if (this.getPlayerActiveCampfireCount(sessionId) >= this.getPlayerActiveCampfireLimit(player)) return false;

        const campfire = new CampfireState();
        campfire.id = this.getCampfireIdForCell(cell);
        campfire.x = cell.x;
        campfire.y = cell.y;
        campfire.healProgress = Math.floor((this.campfireHealElapsedMs / CAMPFIRE_HEAL_INTERVAL_MS) * 100);
        this.state.campfires.set(campfire.id, campfire);
        this.campfireOwners.set(campfire.id, sessionId);
        this.setHotbarItem(player, player.activeSlot, EMPTY_HOTBAR_ITEM);
        this.fillPendingCampfireItems(player);
        return true;
    }

    private tryPlaceCaltrops(sessionId: string, data: unknown): boolean {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver || !this.state.gameStarted) return false;
        if (player.activeItem !== ITEM_WOOD_CALTROPS || this.getHotbarItem(player, player.activeSlot) !== ITEM_WOOD_CALTROPS) return false;

        const cell = this.getBuildCellFromData(data);
        if (!cell || !this.isBuildCellInRange(player, cell.x, cell.y)) return false;
        if (this.isBuildCellOccupied(cell, cell.x, cell.y)) return false;

        const caltrops = new CaltropState();
        caltrops.id = this.getCaltropsIdForCell(cell);
        caltrops.x = cell.x;
        caltrops.y = cell.y;
        this.state.caltrops.set(caltrops.id, caltrops);
        this.rebuildCaltropsIndex();
        this.setHotbarItem(player, player.activeSlot, EMPTY_HOTBAR_ITEM);
        return true;
    }

    private getBuildCellFromData(data: unknown): { id: string; col: number; row: number; x: number; y: number } | null {
        const maybePoint = data as { x?: unknown; y?: unknown } | null;
        if (!maybePoint || typeof maybePoint.x !== "number" || typeof maybePoint.y !== "number") return null;
        if (!Number.isFinite(maybePoint.x) || !Number.isFinite(maybePoint.y)) return null;

        const col = Math.floor(clamp(maybePoint.x, 0, WORLD_WIDTH - 1) / BUILD_GRID_SIZE);
        const row = Math.floor(clamp(maybePoint.y, 0, WORLD_HEIGHT - 1) / BUILD_GRID_SIZE);
        const x = col * BUILD_GRID_SIZE + BUILD_BLOCK_HALF_SIZE;
        const y = row * BUILD_GRID_SIZE + BUILD_BLOCK_HALF_SIZE;
        if (x < BUILD_BLOCK_HALF_SIZE || y < BUILD_BLOCK_HALF_SIZE) return null;
        if (x > WORLD_WIDTH - BUILD_BLOCK_HALF_SIZE || y > WORLD_HEIGHT - BUILD_BLOCK_HALF_SIZE) return null;

        return { id: `${col}-${row}`, col, row, x, y };
    }

    private getCampfireIdForCell(cell: { col: number; row: number }): string {
        return `campfire-${cell.col}-${cell.row}`;
    }

    private getCaltropsIdForCell(cell: { col: number; row: number }): string {
        return `caltrops-${cell.col}-${cell.row}`;
    }

    private isBuildCellInRange(player: PlayerState, blockX: number, blockY: number): boolean {
        const dx = player.x - blockX;
        const dy = (player.y + PLAYER_TREE_Y_OFFSET) - blockY;
        return dx * dx + dy * dy <= BUILD_RANGE * BUILD_RANGE;
    }

    private isBuildCellOccupied(cell: { col: number; row: number }, blockX: number, blockY: number): boolean {
        if (this.state.campfires.has(this.getCampfireIdForCell(cell))) return true;
        if (this.state.caltrops.has(this.getCaltropsIdForCell(cell))) return true;
        if (this.collidesWithLayer3TableFoot(blockX, blockY, BUILD_BLOCK_HALF_SIZE)) return true;

        let occupied = false;
        this.state.players.forEach((player, playerId) => {
            if (occupied) return;
            const sp = this.serverPlayers.get(playerId);
            if (!sp || !sp.alive || player.isDead) return;
            occupied = circleOverlapsAabb(
                player.x,
                player.y + PLAYER_TREE_Y_OFFSET,
                PLAYER_TREE_FOOT_RADIUS,
                blockX,
                blockY,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
            );
        });
        if (occupied) return true;

        this.state.enemies.forEach((enemy) => {
            if (occupied || enemy.isDead) return;
            occupied = circleOverlapsAabb(
                enemy.x,
                enemy.y + ENEMY_FOOT_Y_OFFSET,
                ENEMY_FOOT_RADIUS,
                blockX,
                blockY,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
            );
        });
        if (occupied) return true;

        this.state.trees.forEach((tree) => {
            if (occupied) return;
            const hitbox = this.getTreeHitbox(tree);
            occupied = circleOverlapsAabb(
                hitbox.x,
                hitbox.y,
                hitbox.radius,
                blockX,
                blockY,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
            );
        });

        return occupied;
    }

    private tryStartRevive(sessionId: string, client: Client): boolean {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver) return false;

        const reviverX = player.x;
        const reviverY = player.y + PLAYER_TREE_Y_OFFSET;
        const radiusSq = REVIVE_RADIUS * REVIVE_RADIUS;
        let closestTargetId: string | null = null;
        let closestDistanceSq = Number.POSITIVE_INFINITY;

        this.state.players.forEach((target, targetId) => {
            if (targetId === sessionId || !target.isDead) return;
            if (this.isPlayerBeingRevived(targetId)) return;

            const dx = reviverX - target.x;
            const dy = reviverY - (target.y + PLAYER_TREE_Y_OFFSET);
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq <= radiusSq && distanceSq < closestDistanceSq) {
                closestDistanceSq = distanceSq;
                closestTargetId = targetId;
            }
        });

        if (!closestTargetId) return false;

        this.cancelRevive(sessionId);
        sp.revivingTargetId = closestTargetId;
        const target = this.state.players.get(closestTargetId);
        if (target) target.reviveProgress = 0;
        client.send("reviveStarted", { targetId: closestTargetId, durationMs: REVIVE_DURATION_MS });
        return true;
    }

    private isPlayerBeingRevived(targetId: string): boolean {
        for (const sp of this.serverPlayers.values()) {
            if (sp.revivingTargetId === targetId) return true;
        }
        return false;
    }

    private cancelRevive(sessionId: string) {
        const sp = this.serverPlayers.get(sessionId);
        if (!sp?.revivingTargetId) return;

        const target = this.state.players.get(sp.revivingTargetId);
        if (target) target.reviveProgress = 0;
        sp.revivingTargetId = null;
    }

    private cancelRevivesTargeting(targetId: string) {
        this.serverPlayers.forEach((sp) => {
            if (sp.revivingTargetId === targetId) {
                sp.revivingTargetId = null;
            }
        });
        const target = this.state.players.get(targetId);
        if (target) target.reviveProgress = 0;
    }

    // ─── Main tick ────────────────────────────────────────────────────────────
    private tick(dt: number) {
        if (this.state.gameOver) {
            this.tickGameOverRestart(dt);
            return;
        }
        if (!this.state.gameStarted) return;
        const tickStartedAt = performance.now();
        const tickMetrics = this.createTickMetrics();
        const dtSec = dt / 1000;

        if (this.isMapEditor()) {
            this.tickPlayers(dtSec, dt);
            return;
        }

        this.activeTickMetrics = tickMetrics;
        try {
            this.measureTickPhase(tickMetrics, "elapsed", () => this.tickElapsedTime(dt));
            this.measureTickPhase(tickMetrics, "players", () => this.tickPlayers(dtSec, dt));
            this.measureTickPhase(tickMetrics, "axeAttacks", () => this.tickActiveAxeAttacks(dt));
            this.measureTickPhase(tickMetrics, "revives", () => this.tickRevives(dt));
            this.measureTickPhase(tickMetrics, "playerBullets", () => this.tickPlayerBullets(dtSec));
            this.measureTickPhase(tickMetrics, "waves", () => this.tickEnemyWaves(tickMetrics));
            this.recordingEnemyMetrics = true;
            try {
                this.measureTickPhase(tickMetrics, "enemyAI", () => this.tickEnemies(dtSec, dt));
            } finally {
                this.recordingEnemyMetrics = false;
            }
            this.measureTickPhase(tickMetrics, "enemySeparation", () => this.separateEnemyFeet(tickMetrics));
            this.measureTickPhase(tickMetrics, "enemyBullets", () => this.tickEnemyBullets(dtSec));
            this.measureTickPhase(tickMetrics, "collisions", () => this.tickCollisions());
            this.measureTickPhase(tickMetrics, "campfires", () => this.tickCampfires(dt));
        } finally {
            this.activeTickMetrics = null;
        }
        this.reportEnemySimulationStats(tickStartedAt, tickMetrics);
    }

    private createTickMetrics(): TickMetrics {
        return {
            phases: {},
            playerSubphases: {},
            counters: {},
            enemySubphases: {},
            enemyCounters: {},
            spawnedEnemies: 0,
            scheduledWaveIndex: null,
            scheduledEnemyCount: 0,
            separationChecks: 0,
            separationResolutions: 0,
            slowestEnemy: null,
            slowestPlayer: null,
        };
    }

    private measureTickPhase<T>(metrics: TickMetrics, label: string, run: () => T): T {
        const startedAt = performance.now();
        try {
            return run();
        } finally {
            metrics.phases[label] = (metrics.phases[label] || 0) + (performance.now() - startedAt);
        }
    }

    private measureEnemySubphase<T>(label: string, run: () => T): T {
        const metrics = this.activeTickMetrics;
        if (!metrics) return run();

        const startedAt = performance.now();
        try {
            return run();
        } finally {
            metrics.enemySubphases[label] = (metrics.enemySubphases[label] || 0) + (performance.now() - startedAt);
        }
    }

    private measurePlayerSubphase<T>(label: string, run: () => T): T {
        const metrics = this.activeTickMetrics;
        if (!metrics) return run();

        const startedAt = performance.now();
        try {
            return run();
        } finally {
            metrics.playerSubphases[label] = (metrics.playerSubphases[label] || 0) + (performance.now() - startedAt);
        }
    }

    private incrementTickCounter(label: string, amount = 1): void {
        const metrics = this.activeTickMetrics;
        if (!metrics) return;
        metrics.counters[label] = (metrics.counters[label] || 0) + amount;
    }

    private incrementEnemyCounter(label: string, amount = 1): void {
        const metrics = this.activeTickMetrics;
        if (!metrics || !this.recordingEnemyMetrics) return;
        metrics.enemyCounters[label] = (metrics.enemyCounters[label] || 0) + amount;
    }

    private recordPlayerTickDuration(id: string, player: PlayerState, sp: ServerPlayer, elapsedMs: number): void {
        const metrics = this.activeTickMetrics;
        if (!metrics || (metrics.slowestPlayer && elapsedMs <= metrics.slowestPlayer.ms)) return;

        const input = [
            sp.input.left ? "L" : "",
            sp.input.right ? "R" : "",
            sp.input.up ? "U" : "",
            sp.input.down ? "D" : "",
            sp.input.fire ? "F" : "",
            sp.input.interact ? "I" : "",
        ].join("") || "none";
        metrics.slowestPlayer = {
            id,
            ms: elapsedMs,
            x: player.x,
            y: player.y,
            alive: sp.alive,
            dead: player.isDead,
            dashing: sp.dashMs > 0,
            bowCharging: sp.bowCharging,
            axeWhirlwind: sp.axeWhirlwind,
            input,
        };
    }

    private recordEnemyTickDuration(id: string, enemy: EnemyState, se: ServerEnemy, elapsedMs: number): void {
        const metrics = this.activeTickMetrics;
        if (!metrics || (metrics.slowestEnemy && elapsedMs <= metrics.slowestEnemy.ms)) return;

        metrics.slowestEnemy = {
            id,
            enemyType: enemy.enemyType,
            mode: se.mode,
            ms: elapsedMs,
            x: enemy.x,
            y: enemy.y,
            pathLength: se.path.length,
            targetId: se.targetId,
        };
    }

    private tickGameOverRestart(dtMs: number) {
        if (this.gameOverRestartMs <= 0) return;

        this.gameOverRestartMs = Math.max(0, this.gameOverRestartMs - dtMs);
        this.state.gameOverCountdown = Math.ceil(this.gameOverRestartMs / 1000);
        if (this.gameOverRestartMs === 0) {
            this.resetLevel();
        }
    }

    private tickElapsedTime(dtMs: number) {
        this.elapsedMs += dtMs;
        this.state.elapsedSeconds = Math.floor(this.elapsedMs / 1000);
    }

    private tickCampfires(dtMs: number) {
        if (this.state.campfires.size <= 0) {
            this.campfireHealElapsedMs = 0;
            return;
        }

        this.campfireHealElapsedMs += dtMs;
        while (this.campfireHealElapsedMs >= CAMPFIRE_HEAL_INTERVAL_MS) {
            this.campfireHealElapsedMs -= CAMPFIRE_HEAL_INTERVAL_MS;
            this.applyCampfireHealing();
        }

        const healProgress = Math.floor((this.campfireHealElapsedMs / CAMPFIRE_HEAL_INTERVAL_MS) * 100);
        this.state.campfires.forEach((campfire) => {
            campfire.healProgress = healProgress;
        });
    }

    private applyCampfireHealing() {
        const radiusSq = CAMPFIRE_HEAL_RADIUS * CAMPFIRE_HEAL_RADIUS;
        this.state.campfires.forEach((campfire) => {
            this.state.players.forEach((player, playerId) => {
                const sp = this.serverPlayers.get(playerId);
                if (!sp?.alive || player.isDead || player.health >= player.maxHealth) return;
                const dx = player.x - campfire.x;
                const dy = (player.y + PLAYER_TREE_Y_OFFSET) - campfire.y;
                if (dx * dx + dy * dy > radiusSq) return;
                player.health = Math.min(player.maxHealth, player.health + CAMPFIRE_HEAL_AMOUNT);
            });
        });
    }

    private tickRevives(dtMs: number) {
        this.serverPlayers.forEach((sp, reviverId) => {
            if (!sp.revivingTargetId) return;

            const reviver = this.state.players.get(reviverId);
            const target = this.state.players.get(sp.revivingTargetId);
            if (!sp.alive || !reviver || !target || !target.isDead) {
                this.cancelRevive(reviverId);
                return;
            }

            const dx = reviver.x - target.x;
            const dy = (reviver.y + PLAYER_TREE_Y_OFFSET) - (target.y + PLAYER_TREE_Y_OFFSET);
            if (dx * dx + dy * dy > REVIVE_RADIUS * REVIVE_RADIUS) {
                this.cancelRevive(reviverId);
                return;
            }

            target.reviveProgress = clamp(target.reviveProgress + dtMs / REVIVE_DURATION_MS, 0, 1);
            if (target.reviveProgress >= 1) {
                this.completeRevive(reviverId, sp.revivingTargetId);
            }
        });
    }

    private completeRevive(reviverId: string, targetId: string) {
        const reviver = this.serverPlayers.get(reviverId);
        const targetSp = this.serverPlayers.get(targetId);
        const target = this.state.players.get(targetId);
        if (!reviver || !targetSp || !target) return;

        reviver.revivingTargetId = null;
        targetSp.alive = true;
        targetSp.vx = 0;
        targetSp.vy = 0;
        targetSp.attackLockMs = 0;
        targetSp.attackCooldownMs = 0;
        targetSp.dashMs = 0;
        targetSp.dashDirX = 0;
        targetSp.dashDirY = 0;
        targetSp.dashCooldownMs = 0;
        targetSp.revivingTargetId = null;
        targetSp.bowCharging = false;
        targetSp.bowChargeMs = 0;
        targetSp.bowChargeX = target.x;
        targetSp.bowChargeY = target.y;
        targetSp.bowAimX = 0;
        targetSp.bowAimY = -1;
        targetSp.bowChargeMoveLeft = false;
        targetSp.bowChargeMoveRight = false;
        targetSp.bowChargeMoveUp = false;
        targetSp.bowChargeMoveDown = false;
        targetSp.bowVolleyActive = false;
        targetSp.bowVolleyLockX = target.x;
        targetSp.bowVolleyLockY = target.y;
        targetSp.bowVolleyTargetX = target.x;
        targetSp.bowVolleyTargetY = target.y;
        targetSp.bowVolleyCooldownMs = 0;
        targetSp.axeWhirlwind = false;
        targetSp.axeWhirlwindTickMs = 0;
        targetSp.axeWhirlwindElapsedMs = 0;
        targetSp.axeWhirlwindCooldownMs = 0;
        targetSp.shieldBlockCooldownMs = 0;
        targetSp.shieldRegenMs = 0;
        targetSp.pickupCheckMs = 0;
        targetSp.invulnerableUntilMs = this.elapsedMs + PLAYER_SPAWN_INVULNERABILITY_MS;
        targetSp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
        target.health = REVIVE_HEALTH;
        target.isDead = false;
        target.reviveProgress = 0;
        this.triggerPlayerDamageFlash(target, PLAYER_SPAWN_INVULNERABILITY_MS, PLAYER_INVULNERABILITY_FLASH_BLINK_MS);
        target.axeAttackHitboxActive = false;
        target.dashing = false;
        target.dashCooldownProgress = 0;
        target.axeWhirlwind = false;
        target.axeWhirlwindProgress = 0;
        target.axeWhirlwindCooldownProgress = 0;
        target.axeWhirlwindHitSeq = 0;
        target.bowCharging = false;
        target.bowChargeProgress = 0;
        target.bowVolleyCooldownProgress = 0;
        target.shieldBlocking = false;
        target.shieldBlockCooldownProgress = 0;
    }

    // ─── Player movement & firing ─────────────────────────────────────────────
    private tickPlayers(dtSec: number, dtMs: number) {
        this.state.players.forEach((player, sid) => {
            this.incrementTickCounter("playerLoops");
            const playerStartedAt = performance.now();
            const sp = this.serverPlayers.get(sid);
            try {
                if (!sp || !sp.alive) return;
                const { left, right, up, down, fire } = sp.input;
                const isAttackLocked = sp.attackLockMs > 0;
                this.measurePlayerSubphase("playerCooldowns", () => {
                    sp.attackLockMs = Math.max(0, sp.attackLockMs - dtMs);
                    sp.attackCooldownMs = Math.max(0, sp.attackCooldownMs - dtMs);
                    sp.dashCooldownMs = Math.max(0, sp.dashCooldownMs - dtMs);
                    player.dashCooldownProgress = sp.dashCooldownMs > 0
                        ? clamp(sp.dashCooldownMs / PLAYER_DASH_COOLDOWN_MS, 0, 1)
                        : 0;
                    this.updateBowVolleyCooldown(player, sp, dtMs);
                    this.updateAxeWhirlwindCooldown(player, sp, dtMs);
                    this.updateShieldBlockCooldown(player, sp, dtMs);
                    this.updateShieldRegeneration(player, sp, dtMs);
                });

                const inputX = Number(right) - Number(left);
                const inputY = Number(down) - Number(up);
                const inputLength = Math.hypot(inputX, inputY);

                if (sp.bowCharging) {
                    const bowChargeStillActive = this.measurePlayerSubphase("playerBowCharge", () => {
                        if (player.activeItem !== ITEM_WOOD_BOW || this.didPressMovementAfterBowCharge(sp, left, right, up, down)) {
                            this.clearBowCharge(player, sp);
                            return false;
                        }
                        const chargeMs = this.getPlayerBowChargeMs(player);
                        sp.bowChargeMs = Math.min(chargeMs, sp.bowChargeMs + dtMs);
                        player.bowChargeProgress = clamp(sp.bowChargeMs / chargeMs, 0, 1);
                        sp.vx = 0;
                        sp.vy = 0;
                        player.x = sp.bowChargeX;
                        player.y = sp.bowChargeY;
                        if (sp.bowChargeMs >= chargeMs) this.fireBowCharge(sid);
                        return true;
                    });
                    if (bowChargeStillActive) return;
                }

                if (sp.bowVolleyActive) {
                    this.measurePlayerSubphase("playerBowVolley", () => {
                        if (player.activeItem !== ITEM_WOOD_BOW || player.isDead || this.state.gameOver || this.didPressMovementAfterBowCharge(sp, left, right, up, down)) {
                            this.clearBowVolley(sp);
                            this.clearBowCharge(player, sp);
                            return;
                        }
                        const chargeMs = this.getPlayerBowChargeMs(player);
                        sp.bowChargeMs = Math.min(chargeMs, sp.bowChargeMs + dtMs);
                        player.bowChargeProgress = clamp(sp.bowChargeMs / chargeMs, 0, 1);
                        sp.vx = 0;
                        sp.vy = 0;
                        player.x = sp.bowVolleyLockX;
                        player.y = sp.bowVolleyLockY;
                        if (sp.bowChargeMs >= chargeMs) this.releaseBowVolley(sid, {
                            targetX: sp.bowVolleyTargetX,
                            targetY: sp.bowVolleyTargetY,
                        });
                    });
                    return;
                }

                if (sp.axeWhirlwind && (player.activeItem !== ITEM_WOOD_AXE || player.isDead || this.state.gameOver)) {
                    this.setAxeWhirlwind(sid, false);
                }

                if (sp.dashMs > 0) {
                    this.measurePlayerSubphase("playerDashMove", () => {
                        const dashStepMs = Math.min(dtMs, sp.dashMs);
                        const dashDistance = PLAYER_DASH_DISTANCE * (dashStepMs / PLAYER_DASH_DURATION_MS);
                        const nextX = player.x + sp.dashDirX * dashDistance;
                        const nextY = player.y + sp.dashDirY * dashDistance;
                        const resolved = this.movePlayerWithWorldColliders(player, nextX, nextY);
                        sp.vx = dashStepMs > 0 ? ((resolved.x - player.x) / (dashStepMs / 1000)) : 0;
                        sp.vy = dashStepMs > 0 ? ((resolved.y - player.y) / (dashStepMs / 1000)) : 0;
                        const blocked = (resolved.x === player.x && nextX !== player.x) || (resolved.y === player.y && nextY !== player.y);
                        if (blocked) this.incrementTickCounter("playerDashBlocked");
                        player.x = resolved.x;
                        player.y = resolved.y;
                        sp.dashMs = blocked ? 0 : Math.max(0, sp.dashMs - dashStepMs);
                        if (sp.dashMs <= 0) player.dashing = false;
                    });
                } else if (isAttackLocked) {
                    sp.vx = 0;
                    sp.vy = 0;
                    player.x = sp.attackLockX;
                    player.y = sp.attackLockY;
                } else {
                    this.measurePlayerSubphase("playerNormalMove", () => {
                        const facingDirection = directionFromInput(inputX, inputY);
                        if (facingDirection) player.facingDirection = facingDirection;

                        sp.vx = inputLength > 0 ? (inputX / inputLength) * PLAYER_MAX_VEL : 0;
                        sp.vy = inputLength > 0 ? (inputY / inputLength) * PLAYER_MAX_VEL : 0;

                        const nextX = player.x + sp.vx * dtSec;
                        const nextY = player.y + sp.vy * dtSec;
                        const resolved = this.movePlayerWithWorldColliders(player, nextX, nextY);
                        if (resolved.x === player.x && nextX !== player.x) {
                            sp.vx = 0;
                            this.incrementTickCounter("playerMoveBlockedX");
                        }
                        if (resolved.y === player.y && nextY !== player.y) {
                            sp.vy = 0;
                            this.incrementTickCounter("playerMoveBlockedY");
                        }
                        player.x = resolved.x;
                        player.y = resolved.y;
                    });
                }

                if (sp.axeWhirlwind) {
                    this.measurePlayerSubphase("playerAxeWhirlwind", () => {
                        sp.axeWhirlwindElapsedMs += dtMs;
                        player.axeWhirlwindProgress = clamp(1 - (sp.axeWhirlwindElapsedMs / AXE_WHIRLWIND_MAX_DURATION_MS), 0, 1);
                        sp.axeWhirlwindTickMs -= dtMs;
                        while (sp.axeWhirlwind && sp.axeWhirlwindTickMs <= 0) {
                            this.applyAxeWhirlwindImpact(sid);
                            sp.axeWhirlwindTickMs += AXE_WHIRLWIND_TICK_MS;
                        }
                        if (sp.axeWhirlwind && sp.axeWhirlwindElapsedMs >= AXE_WHIRLWIND_MAX_DURATION_MS) {
                            this.endAxeWhirlwind(player, sp, true);
                        }
                    });
                }

                this.measurePlayerSubphase("playerResourcePickup", () => {
                    this.tryAutoPickupResources(sid, sp, dtMs);
                });

                this.measurePlayerSubphase("playerFire", () => {
                    sp.fireCounter = Math.max(0, sp.fireCounter - dtMs);
                    if (!this.isMapEditor() && fire && sp.fireCounter === 0) {
                        sp.fireCounter = FIRE_RATE_MS;
                        this.spawnPlayerBullet(player.x, player.y - PLAYER_BULLET_Y_OFFSET, 1, sid);
                    }
                });
            } finally {
                if (sp) this.recordPlayerTickDuration(sid, player, sp, performance.now() - playerStartedAt);
            }
        });
    }

    private collidesWithTestTreeTrunk(playerX: number, playerY: number): boolean {
        this.incrementTickCounter("playerTreeCollisionChecks");
        let collides = false;
        this.state.trees.forEach((tree) => {
            if (collides) return;
            this.incrementTickCounter("playerTreeObjectChecks");
            const hitbox = this.getTreeHitbox(tree);
            const dx = playerX - hitbox.x;
            const dy = (playerY + PLAYER_TREE_Y_OFFSET) - hitbox.y;
            const radius = PLAYER_TREE_FOOT_RADIUS + hitbox.radius;
            collides = dx * dx + dy * dy < radius * radius;
            if (collides) this.incrementTickCounter("playerTreeCollisionHits");
        });

        return collides;
    }

    private collidesWithLayer3TableFoot(x: number, y: number, radius: number): boolean {
        this.incrementTickCounter("tableCollisionChecks");
        let collides = false;
        const testTable = (table: EnchantmentTableState | CraftingTableState) => {
            if (collides) return;
            this.incrementTickCounter("tableObjectChecks");
            collides = circleOverlapsAabb(
                x,
                y,
                radius,
                table.x,
                table.y,
                LAYER3_ROW_OBJECT_HALF_WIDTH,
                LAYER3_ROW_OBJECT_HALF_HEIGHT,
            );
            if (collides) this.incrementTickCounter("tableCollisionHits");
        };
        this.state.enchantmentTables.forEach(testTable);
        this.state.craftingTables.forEach(testTable);

        return collides;
    }

    private collidesWithEnemyWorldFoot(x: number, y: number, radius: number): boolean {
        this.incrementEnemyCounter("enemyWorldCollisionChecks");
        return this.collidesWithLayer3TableFoot(x, y, radius)
            || this.mapSolidOverlapsAabb(x, y, radius, radius);
    }

    private collidesWithPlayerWorldColliders(playerX: number, playerY: number): boolean {
        this.incrementTickCounter("playerWorldCollisionChecks");
        const footX = playerX;
        const footY = playerY + PLAYER_TREE_Y_OFFSET;
        return this.collidesWithTestTreeTrunk(playerX, playerY)
            || this.collidesWithLayer3TableFoot(footX, footY, PLAYER_TREE_FOOT_RADIUS)
            || this.collidesWithMapTiles(playerX, playerY);
    }

    private movePlayerWithWorldColliders(player: PlayerState, nextX: number, nextY: number): { x: number; y: number } {
        return this.measurePlayerSubphase("playerMovementCollision", () => {
            this.incrementTickCounter("playerMoveCalls");
            const dx = nextX - player.x;
            const dy = nextY - player.y;
            const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_PLAYER_MOVE_STEP));
            this.incrementTickCounter("playerMoveSteps", steps);
            const stepX = dx / steps;
            const stepY = dy / steps;
            let resolvedX = player.x;
            let resolvedY = player.y;

            for (let i = 0; i < steps; i++) {
                const candidateX = clamp(resolvedX + stepX, PLAYER_HW, this.playableWorldWidth() - PLAYER_HW);
                if (!this.collidesWithPlayerWorldColliders(candidateX, resolvedY)) {
                    resolvedX = candidateX;
                } else {
                    this.incrementTickCounter("playerMoveStepBlockedX");
                }

                const candidateY = clamp(resolvedY + stepY, this.minPlayerY(), this.maxPlayerY());
                if (!this.collidesWithPlayerWorldColliders(resolvedX, candidateY)) {
                    resolvedY = candidateY;
                } else {
                    this.incrementTickCounter("playerMoveStepBlockedY");
                }
            }

            return { x: resolvedX, y: resolvedY };
        });
    }

    // ─── Player bullets ───────────────────────────────────────────────────────
    private spawnPlayerBullet(x: number, y: number, power: number, ownerId: string) {
        const id = nextId();
        const b  = new PlayerBulletState();
        b.id = id; b.x = x; b.y = y; b.power = power; b.ownerId = ownerId;
        b.kind = "bullet";
        b.angle = -Math.PI / 2;
        this.state.playerBullets.set(id, b);
        this.serverPlayerBullets.set(id, {
            vx: 0,
            vy: -P_BULLET_VEL,
            rangeRemaining: Number.POSITIVE_INFINITY,
            kind: "bullet",
            damage: power,
            pierceRemaining: 1,
            hitEnemyIds: new Set<string>(),
        });
    }

    private spawnArrow(x: number, y: number, dx: number, dy: number, ownerId: string) {
        const owner = this.state.players.get(ownerId);
        const length = Math.hypot(dx, dy);
        const vx = length > 0 ? (dx / length) * ARROW_SPEED : 0;
        const vy = length > 0 ? (dy / length) * ARROW_SPEED : -ARROW_SPEED;
        const id = nextId();
        const damageRank = clamp(Math.floor(owner?.bowDamageUpgrades || 0), 0, BOW_PRIMARY_DAMAGE_UPGRADE_MAX_RANK);
        const pierceRank = clamp(Math.floor(owner?.bowPierceUpgrades || 0), 0, BOW_PRIMARY_PIERCE_UPGRADE_MAX_RANK);
        const damage = ARROW_DAMAGE + damageRank;
        const pierce = 1 + pierceRank;
        const arrow = new PlayerBulletState();
        arrow.id = id;
        arrow.x = x;
        arrow.y = y;
        arrow.power = damage;
        arrow.ownerId = ownerId;
        arrow.kind = "arrow";
        arrow.angle = Math.atan2(vy, vx);
        this.state.playerBullets.set(id, arrow);
        this.serverPlayerBullets.set(id, {
            vx,
            vy,
            rangeRemaining: ARROW_RANGE,
            kind: "arrow",
            damage,
            pierceRemaining: pierce,
            hitEnemyIds: new Set<string>(),
        });
    }

    private tickPlayerBullets(dtSec: number) {
        const dead: string[] = [];
        this.state.playerBullets.forEach((b, id) => {
            const sb = this.serverPlayerBullets.get(id);
            if (!sb) { dead.push(id); return; }
            const prevX = b.x;
            const prevY = b.y;
            const distance = Math.hypot(sb.vx * dtSec, sb.vy * dtSec);
            b.x += sb.vx * dtSec;
            b.y += sb.vy * dtSec;
            b.angle = Math.atan2(sb.vy, sb.vx);
            if (Number.isFinite(sb.rangeRemaining)) sb.rangeRemaining -= distance;
            if (this.segmentOverlapsSolidMapTile(prevX, prevY, b.x, b.y, Math.max(PB_HW, PB_HH))) {
                dead.push(id);
                return;
            }
            if (sb.kind === "arrow") {
                const enemyId = this.findEnemyHitByArrowSegment(prevX, prevY, b.x, b.y, sb.hitEnemyIds);
                if (enemyId) {
                    sb.hitEnemyIds.add(enemyId);
                    const enemyHit = this.damageEnemyFromBowAttack(enemyId, b.ownerId, sb.damage);
                    if (enemyHit) this.broadcast("enemyHit", enemyHit);
                    sb.pierceRemaining--;
                    if (sb.pierceRemaining <= 0) dead.push(id);
                    return;
                }
            }
            if (sb.rangeRemaining <= 0) dead.push(id);
            if (b.y < -PB_HH || b.y > WORLD_HEIGHT + PB_HH || b.x < -PB_HW || b.x > WORLD_WIDTH + PB_HW) dead.push(id);
        });
        dead.forEach(id => { this.state.playerBullets.delete(id); this.serverPlayerBullets.delete(id); });
    }

    private findEnemyHitByArrowSegment(fromX: number, fromY: number, toX: number, toY: number, ignoredEnemyIds: Set<string>): string | null {
        let closestEnemyId: string | null = null;
        let closestT = Number.POSITIVE_INFINITY;

        this.state.enemies.forEach((enemy, id) => {
            if (enemy.isDead || ignoredEnemyIds.has(id)) return;
            const t = segmentAabbIntersectionT(
                fromX,
                fromY,
                toX,
                toY,
                enemy.x,
                enemy.y,
                ENEMY_HW,
                ENEMY_HH,
            );
            if (t === null || t >= closestT) return;
            closestEnemyId = id;
            closestT = t;
        });

        return closestEnemyId;
    }

    // ─── Enemies ──────────────────────────────────────────────────────────────
    private startEnemyWaveSchedule() {
        this.state.enemies.clear();
        this.serverEnemies.clear();
        this.pendingEnemySpawns = [];
        this.currentWaveIndex = -1;
        this.currentWaveStartedAtMs = 0;
        this.currentWaveScheduledEnemyCount = 0;
        this.currentWaveSpawnedEnemyCount = 0;
        this.currentWaveMaxActiveEnemies = 0;
        this.clearNextWaveReadyState();
        this.nextEnemyDiagnosticAtMs = 0;
        this.state.waveNumber = 0;
        this.state.currentRadioTrackIndex = -1;
        this.state.currentRadioStartUnixMs = 0;
        this.shuffleRadioPlaylist();
        this.startNextWaveReadyCountdown();
    }

    private shuffleRadioPlaylist(): void {
        const order = Array.from({ length: RADIO_TRACK_COUNT }, (_, index) => index);
        for (let i = order.length - 1; i > 0; i--) {
            const j = rndInt(0, i);
            [order[i], order[j]] = [order[j], order[i]];
        }
        if (order.length > 1 && order[0] === this.lastRadioTrackIndex) {
            const swapIndex = order.findIndex((trackIndex) => trackIndex !== this.lastRadioTrackIndex);
            if (swapIndex > 0) [order[0], order[swapIndex]] = [order[swapIndex], order[0]];
        }
        this.radioPlaylistOrder = order;
    }

    private getRadioTrackIndexForWave(waveIndex: number): number {
        if (this.radioPlaylistOrder.length !== RADIO_TRACK_COUNT) this.shuffleRadioPlaylist();
        const trackIndex = this.radioPlaylistOrder[waveIndex % this.radioPlaylistOrder.length] ?? 0;
        this.lastRadioTrackIndex = trackIndex;
        return trackIndex;
    }

    private tickEnemyWaves(metrics?: TickMetrics) {
        let spawnedThisTick = 0;
        while (
            this.pendingEnemySpawns.length > 0
            && this.elapsedMs >= this.nextEnemySpawnAllowedAtMs
            && this.pendingEnemySpawns[0]?.spawnAtMs <= this.elapsedMs
            && this.state.enemies.size < MAX_ACTIVE_ENEMIES
            && spawnedThisTick < ENEMY_WAVE_MAX_SPAWNS_PER_TICK
        ) {
            const pendingSpawn = this.pendingEnemySpawns.shift();
            if (pendingSpawn) {
                this.spawnEnemy(pendingSpawn.enemyType, pendingSpawn.edgeIndex);
                spawnedThisTick++;
                this.currentWaveSpawnedEnemyCount++;
                if (metrics) metrics.spawnedEnemies++;
                this.nextEnemySpawnAllowedAtMs = this.elapsedMs + ENEMY_WAVE_SPAWN_INTERVAL_MS;
            }
        }
        this.currentWaveMaxActiveEnemies = Math.max(this.currentWaveMaxActiveEnemies, this.state.enemies.size);

        if (this.pendingEnemySpawns.length > 0) return;
        if (this.hasLivingEnemies()) return;
        if (this.nextEnemyWaveStartMs === null) {
            this.replenishTreesAfterWaveClear(this.currentWaveIndex + 1);
            this.logRoomEvent("wave cleared", {
                wave: this.currentWaveIndex + 1,
                durationSeconds: Math.round((this.elapsedMs - this.currentWaveStartedAtMs) / 1000),
                scheduledEnemies: this.currentWaveScheduledEnemyCount,
                spawnedEnemies: this.currentWaveSpawnedEnemyCount,
                maxActiveEnemies: this.currentWaveMaxActiveEnemies,
                score: this.state.teamScore,
                players: this.state.players.size,
            });
            this.startNextWaveReadyCountdown();
            return;
        }
        this.updateNextWaveReadyCountdown();
        if (this.nextEnemyWaveStartMs !== null && this.elapsedMs < this.nextEnemyWaveStartMs) return;
        this.scheduleEnemyWave(this.currentWaveIndex + 1, metrics);
    }

    private startNextWaveReadyCountdown(): void {
        this.nextEnemyWaveStartMs = this.elapsedMs + ENEMY_NEXT_WAVE_DELAY_MS;
        this.nextWaveReadyPlayerIds.clear();
        this.updateNextWaveReadyState();
    }

    private clearNextWaveReadyState(): void {
        this.nextEnemyWaveStartMs = null;
        this.nextWaveReadyPlayerIds.clear();
        if (this.state.nextWaveCountdown !== 0) this.state.nextWaveCountdown = 0;
        if (this.state.nextWaveReadyPlayers !== 0) this.state.nextWaveReadyPlayers = 0;
        if (this.state.nextWaveTotalPlayers !== 0) this.state.nextWaveTotalPlayers = 0;
    }

    private readyPlayerForNextWave(sessionId: string): void {
        if (this.nextEnemyWaveStartMs === null || this.isMapEditor() || this.state.gameOver) return;
        if (!this.state.players.has(sessionId)) return;

        this.nextWaveReadyPlayerIds.add(sessionId);
        this.updateNextWaveReadyState();
        if (this.areAllPlayersReadyForNextWave()) {
            this.nextEnemyWaveStartMs = this.elapsedMs;
            this.state.nextWaveCountdown = 0;
        }
    }

    private updateNextWaveReadyCountdown(): void {
        if (this.nextEnemyWaveStartMs === null) return;
        this.updateNextWaveReadyState();
    }

    private updateNextWaveReadyState(): void {
        for (const sessionId of this.nextWaveReadyPlayerIds) {
            if (!this.state.players.has(sessionId)) this.nextWaveReadyPlayerIds.delete(sessionId);
        }

        const totalPlayers = this.state.players.size;
        const readyPlayers = Math.min(this.nextWaveReadyPlayerIds.size, totalPlayers);
        this.state.nextWaveTotalPlayers = Math.min(totalPlayers, 127);
        this.state.nextWaveReadyPlayers = Math.min(readyPlayers, 127);
        this.state.nextWaveCountdown = this.nextEnemyWaveStartMs === null
            ? 0
            : clamp(Math.ceil(Math.max(0, this.nextEnemyWaveStartMs - this.elapsedMs) / 1000), 0, 127);
    }

    private areAllPlayersReadyForNextWave(): boolean {
        const totalPlayers = this.state.players.size;
        return totalPlayers > 0 && this.nextWaveReadyPlayerIds.size >= totalPlayers;
    }

    private clearGameOverRetryReadyState(): void {
        this.gameOverRetryReadyPlayerIds.clear();
        if (this.state.gameOverRetryReadyPlayers !== 0) this.state.gameOverRetryReadyPlayers = 0;
        if (this.state.gameOverRetryTotalPlayers !== 0) this.state.gameOverRetryTotalPlayers = 0;
    }

    private updateGameOverRetryReadyState(): void {
        for (const sessionId of this.gameOverRetryReadyPlayerIds) {
            if (!this.state.players.has(sessionId)) this.gameOverRetryReadyPlayerIds.delete(sessionId);
        }

        const totalPlayers = this.state.players.size;
        const readyPlayers = Math.min(this.gameOverRetryReadyPlayerIds.size, totalPlayers);
        this.state.gameOverRetryTotalPlayers = Math.min(totalPlayers, 127);
        this.state.gameOverRetryReadyPlayers = Math.min(readyPlayers, 127);
    }

    private readyPlayerForGameOverRetry(sessionId: string): void {
        if (!this.state.gameOver || this.isMapEditor()) return;
        if (!this.state.players.has(sessionId)) return;

        const totalPlayers = this.state.players.size;
        if (totalPlayers <= 1) {
            this.resetLevel();
            return;
        }

        this.gameOverRetryReadyPlayerIds.add(sessionId);
        this.updateGameOverRetryReadyState();
        if (this.gameOverRetryReadyPlayerIds.size >= totalPlayers) {
            this.resetLevel();
        }
    }

    private hasLivingEnemies(): boolean {
        let livingEnemyFound = false;
        this.state.enemies.forEach((enemy) => {
            if (!enemy.isDead) livingEnemyFound = true;
        });
        return livingEnemyFound;
    }

    private scheduleEnemyWave(waveIndex: number, metrics?: TickMetrics) {
        const waveStartMs = this.elapsedMs;
        const customEnemyTypes = this.getCustomWaveEnemyTypes(waveIndex);
        let meleeCount = 0;
        let casterCount = 0;
        let darkKnightCount = 0;
        let boss1Count = 0;
        if (customEnemyTypes) {
            customEnemyTypes.forEach((enemyType) => {
                if (enemyType === ENEMY_TYPE_CASTER) casterCount++;
                else if (enemyType === ENEMY_TYPE_DARK_KNIGHT) darkKnightCount++;
                else if (enemyType === ENEMY_TYPE_BOSS1) boss1Count++;
                else meleeCount++;
            });
        } else {
            meleeCount = waveIndex === 0 ? INITIAL_MELEE_WAVE_COUNT : waveIndex * MELEE_PER_MINUTE;
            casterCount = waveIndex === 0 ? 0 : waveIndex < DARK_KNIGHT_WAVE_INTERVAL_MINUTES ? 1 : 2;
            darkKnightCount = waveIndex > 0 && waveIndex % DARK_KNIGHT_WAVE_INTERVAL_MINUTES === 0
                ? waveIndex / DARK_KNIGHT_WAVE_INTERVAL_MINUTES
                : 0;
            boss1Count = waveIndex + 1 === BOSS1_WAVE_NUMBER ? 1 : 0;
        }

        const waveNumber = waveIndex + 1;
        this.state.waveNumber = waveNumber;
        const startedAtUnixMs = Date.now();
        const radioTrackIndex = this.getRadioTrackIndexForWave(waveIndex);
        const radioStartUnixMs = startedAtUnixMs + 1000;
        this.state.currentRadioTrackIndex = radioTrackIndex;
        this.state.currentRadioStartUnixMs = radioStartUnixMs;
        this.broadcast("enemyWaveStarted", {
            minute: waveIndex,
            waveIndex,
            waveNumber,
            startedAtUnixMs,
            radioTrackIndex,
            radioStartUnixMs,
        });

        let spawnIndex = 0;
        if (customEnemyTypes) {
            customEnemyTypes.forEach((enemyType) => {
                this.queueEnemySpawn(enemyType, waveStartMs, spawnIndex++);
            });
        } else {
            for (let i = 0; i < meleeCount; i++) {
                this.queueEnemySpawn(rndInt(1, 2), waveStartMs, spawnIndex++);
            }
            for (let i = 0; i < casterCount; i++) {
                this.queueEnemySpawn(ENEMY_TYPE_CASTER, waveStartMs, spawnIndex++);
            }
            for (let i = 0; i < darkKnightCount; i++) {
                this.queueEnemySpawn(ENEMY_TYPE_DARK_KNIGHT, waveStartMs, spawnIndex++);
            }
            for (let i = 0; i < boss1Count; i++) {
                this.queueEnemySpawn(ENEMY_TYPE_BOSS1, waveStartMs, spawnIndex++);
            }
        }

        const scheduledEnemyCount = spawnIndex;
        this.pendingEnemySpawns.sort((a, b) => a.spawnAtMs - b.spawnAtMs);
        this.currentWaveIndex = waveIndex;
        this.currentWaveStartedAtMs = this.elapsedMs;
        this.currentWaveScheduledEnemyCount = scheduledEnemyCount;
        this.currentWaveSpawnedEnemyCount = 0;
        this.currentWaveMaxActiveEnemies = this.state.enemies.size;
        this.clearNextWaveReadyState();
        this.nextEnemySpawnAllowedAtMs = waveStartMs;
        if (metrics) {
            metrics.scheduledWaveIndex = waveIndex;
            metrics.scheduledEnemyCount = scheduledEnemyCount;
        }
        console.log(
            `[ShmupRoom ${this.roomId}] wave ${waveIndex} scheduled: total=${scheduledEnemyCount}, `
            + `melee=${meleeCount}, casters=${casterCount}, darkKnights=${darkKnightCount}, boss1=${boss1Count}, `
            + `spawnInterval=${ENEMY_WAVE_SPAWN_INTERVAL_MS}ms, active=${this.state.enemies.size}, `
            + `queued=${this.pendingEnemySpawns.length}`,
        );
    }

    private getCustomWaveEnemyTypes(waveIndex: number): number[] | null {
        switch (waveIndex + 1) {
            case 1:
                return [
                    ...Array(10).fill(1),
                    ...Array(5).fill(2),
                ];
            case 2:
                return [
                    ...Array(12).fill(2),
                    ENEMY_TYPE_CASTER,
                    ...Array(13).fill(2),
                ];
            case 3:
                return [
                    ...Array(10).fill(1),
                    ENEMY_TYPE_CASTER,
                    ENEMY_TYPE_CASTER,
                    ENEMY_TYPE_DARK_KNIGHT,
                ];
            case 4:
                return [
                    ...Array(13).fill(1),
                    ...Array(13).fill(2),
                    ...Array(13).fill(ENEMY_TYPE_CASTER),
                ];
            case 5:
                return [
                    ENEMY_TYPE_BOSS1,
                    ...Array(25).fill(2),
                    ...Array(20).fill(1),
                ];
            case 10:
                return [
                    ENEMY_TYPE_BOSS1,
                    ENEMY_TYPE_BOSS1,
                    ...Array(20).fill(1),
                    ENEMY_TYPE_CASTER,
                    ENEMY_TYPE_CASTER,
                    ...Array(20).fill(2),
                    ENEMY_TYPE_DARK_KNIGHT,
                ];
            default:
                return null;
        }
    }

    private queueEnemySpawn(enemyType: number, waveStartMs: number, spawnIndex: number) {
        this.pendingEnemySpawns.push({
            enemyType,
            edgeIndex: rndInt(0, 3),
            spawnAtMs: waveStartMs + spawnIndex * ENEMY_WAVE_SPAWN_INTERVAL_MS,
        });
    }

    private reportEnemySimulationStats(tickStartedAt: number, metrics: TickMetrics) {
        const tickDurationMs = performance.now() - tickStartedAt;
        const isSlowTick = tickDurationMs >= SLOW_TICK_LOG_THRESHOLD_MS;
        const shouldLogDiagnostic = ENABLE_ENEMY_DIAGNOSTICS && this.elapsedMs >= this.nextEnemyDiagnosticAtMs;
        if (!isSlowTick && !shouldLogDiagnostic) return;

        if (shouldLogDiagnostic) this.nextEnemyDiagnosticAtMs = this.elapsedMs + ENEMY_DIAGNOSTIC_INTERVAL_MS;
        const phaseText = Object.entries(metrics.phases)
            .filter(([, ms]) => ms >= TICK_PHASE_LOG_MIN_MS)
            .map(([label, ms]) => `${label}=${ms.toFixed(1)}ms`)
            .join(", ");
        const enemySubphaseText = Object.entries(metrics.enemySubphases)
            .filter(([, ms]) => ms >= TICK_PHASE_LOG_MIN_MS)
            .sort(([, a], [, b]) => b - a)
            .map(([label, ms]) => `${label}=${ms.toFixed(1)}ms`)
            .join(", ");
        const playerSubphaseText = Object.entries(metrics.playerSubphases)
            .filter(([, ms]) => ms >= TICK_PHASE_LOG_MIN_MS)
            .sort(([, a], [, b]) => b - a)
            .map(([label, ms]) => `${label}=${ms.toFixed(1)}ms`)
            .join(", ");
        const counterText = Object.entries(metrics.counters)
            .filter(([, count]) => count > 0)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, count]) => `${label}=${count}`)
            .join(", ");
        const enemyCounterText = Object.entries(metrics.enemyCounters)
            .filter(([, count]) => count > 0)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, count]) => `${label}=${count}`)
            .join(", ");
        const slowestPlayer = metrics.slowestPlayer
            ? `slowPlayer=[id=${metrics.slowestPlayer.id}, ms=${metrics.slowestPlayer.ms.toFixed(1)}, `
                + `alive=${metrics.slowestPlayer.alive}, dead=${metrics.slowestPlayer.dead}, `
                + `dash=${metrics.slowestPlayer.dashing}, bow=${metrics.slowestPlayer.bowCharging}, `
                + `axeWhirl=${metrics.slowestPlayer.axeWhirlwind}, input=${metrics.slowestPlayer.input}, `
                + `pos=${metrics.slowestPlayer.x.toFixed(0)}:${metrics.slowestPlayer.y.toFixed(0)}]`
            : "slowPlayer=none";
        const slowestEnemy = metrics.slowestEnemy
            ? `slowEnemy=[id=${metrics.slowestEnemy.id}, type=${metrics.slowestEnemy.enemyType}, mode=${metrics.slowestEnemy.mode}, `
                + `ms=${metrics.slowestEnemy.ms.toFixed(1)}, path=${metrics.slowestEnemy.pathLength}, `
                + `target=${metrics.slowestEnemy.targetId ?? "none"}, `
                + `pos=${metrics.slowestEnemy.x.toFixed(0)}:${metrics.slowestEnemy.y.toFixed(0)}]`
            : "slowEnemy=none";
        const log = isSlowTick ? console.warn : console.log;
        log(
            `[ShmupRoom ${this.roomId}] ${isSlowTick ? "slow tick" : "enemy simulation"}: `
            + `tick=${tickDurationMs.toFixed(1)}ms, active=${this.state.enemies.size}/${MAX_ACTIVE_ENEMIES}, `
            + `queued=${this.pendingEnemySpawns.length}, players=${this.state.players.size}, `
            + `playerBullets=${this.state.playerBullets.size}, enemyBullets=${this.state.enemyBullets.size}, `
            + `spawned=${metrics.spawnedEnemies}, `
            + `scheduledWave=${metrics.scheduledWaveIndex ?? "none"}, scheduledEnemies=${metrics.scheduledEnemyCount}, `
            + `separationChecks=${metrics.separationChecks}, separationResolutions=${metrics.separationResolutions}, `
            + `phases=[${phaseText || "none"}], playerDetails=[${playerSubphaseText || "none"}], `
            + `enemyDetails=[${enemySubphaseText || "none"}], ops=[${counterText || "none"}], `
            + `enemyOps=[${enemyCounterText || "none"}], ${slowestPlayer}, ${slowestEnemy}`,
        );
    }

    private spawnEnemy(enemyType: number, edgeIndex: number) {
        const id = nextId();
        const edge = edgeIndex % 4;
        const e = new EnemyState();
        e.id = id;
        e.shipId = 0;
        e.enemyType = enemyType;
        e.power = 1;
        e.maxHealth = this.getEnemyMaxHealth(enemyType);
        e.health = e.maxHealth;
        e.action = enemyType === ENEMY_TYPE_DARK_KNIGHT ? "walk" : "run";
        e.isDead = false;
        e.deathSeq = 0;

        if (edge === 0) {
            e.x = rndReal(ENEMY1_EDGE_OFFSET, WORLD_WIDTH - ENEMY1_EDGE_OFFSET);
            e.y = -ENEMY1_EDGE_OFFSET;
        } else if (edge === 1) {
            e.x = WORLD_WIDTH + ENEMY1_EDGE_OFFSET;
            e.y = rndReal(ENEMY1_EDGE_OFFSET, WORLD_HEIGHT - ENEMY1_EDGE_OFFSET);
        } else if (edge === 2) {
            e.x = rndReal(ENEMY1_EDGE_OFFSET, WORLD_WIDTH - ENEMY1_EDGE_OFFSET);
            e.y = WORLD_HEIGHT + ENEMY1_EDGE_OFFSET;
        } else {
            e.x = -ENEMY1_EDGE_OFFSET;
            e.y = rndReal(ENEMY1_EDGE_OFFSET, WORLD_HEIGHT - ENEMY1_EDGE_OFFSET);
        }

        const target = this.findNearestAlivePlayer(e.x, e.y);
        if (target) {
            e.facingDirection = directionFromInput(target.targetX - e.x, target.targetY - e.y) || "S";
        }

        this.state.enemies.set(id, e);
        this.serverEnemies.set(id, {
            mode: enemyType === ENEMY_TYPE_DARK_KNIGHT ? "dkWalk" : "chase",
            modeMs: 0,
            targetId: target?.id || null,
            previousTargetId: null,
            bossBombId: null,
            bossBombX: 0,
            bossBombY: 0,
            bossBombRadius: BOSS1_BOMB_RADIUS,
            darkKnightTargetKind: null,
            darkKnightMarkX: e.x,
            darkKnightMarkY: e.y,
            path: [],
            pathTargetCell: null,
            pathTopologyVersion: this.mapTopologyVersion,
            repathMs: 0,
            directPathFromCell: null,
            directPathTargetCell: null,
            directPathTopologyVersion: this.mapTopologyVersion,
            directPathCheckMs: 0,
            directPathClear: false,
            lineOfSightFromCell: null,
            lineOfSightTargetCell: null,
            lineOfSightTopologyVersion: this.mapTopologyVersion,
            lineOfSightCheckMs: 0,
            lineOfSightClear: false,
            lineOfSightTargetId: null,
            lineOfSightKind: null,
            caltropsSlowMs: 0,
            caltropsCheckMs: rndInt(0, CALTROPS_CHECK_INTERVAL_MS),
            meleeAttackToken: 0,
        });
    }

    private tickEnemies(dtSec: number, dtMs: number) {
        const dead: string[] = [];
        this.enemyPathBuildsThisTick = 0;
        this.enemyFlowBuildsThisTick = 0;
        this.enemyTargetCache.clear();
        this.pruneEnemyFlowFields();
        this.state.enemies.forEach((enemy, id) => {
            this.incrementEnemyCounter("enemyLoops");
            if (enemy.isDead) return;

            const enemyStartedAt = performance.now();
            const se = this.serverEnemies.get(id);
            if (!se) { dead.push(id); return; }

            try {
                this.tickEnemyCaltropsSlow(enemy, se, dtMs);
                se.repathMs = Math.max(0, se.repathMs - dtMs);
                se.directPathCheckMs = Math.max(0, se.directPathCheckMs - dtMs);
                se.lineOfSightCheckMs = Math.max(0, se.lineOfSightCheckMs - dtMs);
                if (se.mode === "stun") {
                    enemy.action = "idle";
                    se.modeMs = Math.max(0, se.modeMs - dtMs);
                    if (se.modeMs === 0) {
                        se.mode = enemy.enemyType === ENEMY_TYPE_DARK_KNIGHT ? "dkWalk" : "chase";
                    }
                    return;
                }

                const target = this.findNearestAlivePlayer(enemy.x, enemy.y);
                if (!target) {
                    enemy.action = "idle";
                    se.targetId = null;
                    se.path = [];
                    return;
                }

                se.targetId = target.id;
                const dx = target.targetX - enemy.x;
                const dy = target.targetY - enemy.y;
                const distance = Math.hypot(dx, dy);

                if (enemy.enemyType === ENEMY_TYPE_BOSS1) {
                    this.tickBoss1Enemy(id, enemy, se, target, dx, dy, distance, dtSec, dtMs);
                    return;
                }

                if (enemy.enemyType === ENEMY_TYPE_CASTER) {
                    this.tickCasterEnemy(id, enemy, se, target, dx, dy, distance, dtSec, dtMs);
                    return;
                }

                if (enemy.enemyType === ENEMY_TYPE_DARK_KNIGHT) {
                    this.tickDarkKnightEnemy(id, enemy, se, target, dx, dy, distance, dtSec, dtMs);
                    return;
                }

                const attackOrigin = { x: enemy.x, y: enemy.y };
                const attackDirection = enemy.facingDirection || "S";
                const meleeReachVector = this.findEnemyMeleeReachVector(attackOrigin, target.player);
                const canMeleeReachPlayer = !!meleeReachVector;
                const canStartMeleeAttack = canMeleeReachPlayer;

                if (se.mode === "attack") {
                    enemy.action = "attack";
                    se.modeMs = Math.max(0, se.modeMs - dtMs);
                    if (se.modeMs === 0) {
                        se.mode = canStartMeleeAttack ? "windup" : "chase";
                        se.modeMs = se.mode === "windup" ? ENEMY1_WINDUP_MS : 0;
                        enemy.action = se.mode === "windup" ? "idle" : "run";
                    }
                    return;
                }

                if (canStartMeleeAttack) {
                    this.faceEnemyTowardPoint(enemy, target.player.x, this.playerHitboxCenterY(target.player.y));
                    enemy.action = "idle";
                    if (se.mode !== "windup") {
                        se.mode = "windup";
                        se.modeMs = ENEMY1_WINDUP_MS;
                        return;
                    }

                    se.modeMs = Math.max(0, se.modeMs - dtMs);
                    if (se.modeMs === 0) {
                        se.mode = "attack";
                        se.modeMs = ENEMY1_ATTACK_MS;
                        enemy.action = "attack";
                        enemy.attackSeq++;
                        const attackToken = ++se.meleeAttackToken;
                        const attackVector = meleeReachVector || this.getEnemyMeleeAttackVector(attackOrigin, target, attackDirection);
                        setTimeout(() => {
                            this.applyEnemyAttackImpact(id, attackToken, attackOrigin, attackVector);
                        }, ENEMY1_DAMAGE_IMPACT_DELAY_MS);
                    }
                    return;
                }

                se.mode = "chase";
                se.modeMs = 0;
                enemy.action = "run";
                if (distance <= 0) return;

                const remainingDistance = canMeleeReachPlayer ? Math.max(0, distance - ENEMY1_PLAYER_ATTACK_RANGE) : distance;
                if (remainingDistance <= ENEMY1_MIN_CHASE_STEP) {
                    enemy.action = "idle";
                    se.path = [];
                    if (canMeleeReachPlayer) {
                        se.mode = "windup";
                        se.modeMs = ENEMY1_WINDUP_MS;
                    }
                    return;
                }

                const move = Math.min(this.getEnemyMoveSpeed(enemy.enemyType) * this.getEnemyCaltropsSpeedMultiplier(enemy) * dtSec, remainingDistance);
                if (!this.moveEnemyUsingFlowField(enemy, se, target, move, dx, dy, distance)) {
                    enemy.action = "idle";
                }
            } finally {
                this.recordEnemyTickDuration(id, enemy, se, performance.now() - enemyStartedAt);
            }
        });
        this.enemyTargetCache.clear();
        dead.forEach(id => { this.state.enemies.delete(id); this.serverEnemies.delete(id); });
    }

    private getEnemyMaxHealth(enemyType: number): number {
        if (enemyType === ENEMY_TYPE_BOSS1) return this.getBoss1MaxHealth();
        if (enemyType === ENEMY_TYPE_DARK_KNIGHT) return this.getDarkKnightMaxHealth();
        if (enemyType === ENEMY_TYPE_CASTER) return CASTER_HEALTH;
        if (enemyType === 1) return ENEMY1_HEALTH;
        return DEFAULT_ENEMY_HEALTH;
    }

    private getDarkKnightMaxHealth(): number {
        return DARK_KNIGHT_BASE_HEALTH + Math.max(1, this.state.players.size) * DARK_KNIGHT_HEALTH_PER_PLAYER;
    }

    private getBoss1MaxHealth(): number {
        return BOSS1_BASE_HEALTH + Math.max(1, this.state.players.size) * BOSS1_HEALTH_PER_PLAYER;
    }

    private getEnemyMoveSpeed(enemyType: number): number {
        if (enemyType === ENEMY_TYPE_BOSS1) return BOSS1_SPEED;
        if (enemyType === 1) return ENEMY1_SPEED;
        if (enemyType === 2) return ENEMY2_SPEED;
        return ENEMY2_SPEED;
    }

    private pruneEnemyFlowFields(): void {
        for (const playerId of this.enemyFlowFields.keys()) {
            if (!this.state.players.has(playerId)) this.enemyFlowFields.delete(playerId);
        }
    }

    private tickBoss1Enemy(
        enemyId: string,
        enemy: EnemyState,
        se: ServerEnemy,
        target: EnemyTarget,
        dx: number,
        dy: number,
        distance: number,
        dtSec: number,
        dtMs: number,
    ) {
        if (se.mode === "bossFuse") {
            enemy.action = "idle";
            se.modeMs = Math.max(0, se.modeMs - dtMs);
            return;
        }

        const preferredTarget = this.findNearestAlivePlayerExcluding(enemy.x, enemy.y, se.previousTargetId) || target;
        se.targetId = preferredTarget.id;
        const targetDx = preferredTarget.targetX - enemy.x;
        const targetDy = preferredTarget.targetY - enemy.y;
        const targetDistance = preferredTarget === target ? distance : Math.hypot(targetDx, targetDy);

        if (targetDistance <= CASTER_CAST_RANGE) {
            this.startBoss1Bomb(enemyId, enemy, se, preferredTarget);
            return;
        }

        se.mode = "chase";
        se.modeMs = 0;
        enemy.action = "run";
        if (targetDistance <= 0) return;

        const remainingDistance = Math.max(0, targetDistance - CASTER_CAST_RANGE);
        const move = Math.min(this.getEnemyMoveSpeed(enemy.enemyType) * this.getEnemyCaltropsSpeedMultiplier(enemy) * dtSec, remainingDistance);
        if (move <= 0) {
            this.startBoss1Bomb(enemyId, enemy, se, preferredTarget);
            return;
        }

        if (!this.moveEnemyUsingFlowField(enemy, se, preferredTarget, move, targetDx, targetDy, targetDistance)) {
            enemy.action = "idle";
        }
    }

    private startBoss1Bomb(enemyId: string, enemy: EnemyState, se: ServerEnemy, target: EnemyTarget): void {
        this.faceEnemyTowardPoint(enemy, target.targetX, target.targetY);
        se.mode = "bossFuse";
        se.modeMs = BOSS1_BOMB_FUSE_MS;
        se.targetId = target.id;
        se.previousTargetId = target.id;
        se.path = [];
        enemy.action = "idle";

        const bombId = `boss-bomb-${nextId()}`;
        const bombX = target.player.x;
        const bombY = target.player.y;
        const radius = BOSS1_BOMB_RADIUS;
        se.bossBombId = bombId;
        se.bossBombX = bombX;
        se.bossBombY = bombY;
        se.bossBombRadius = radius;

        this.broadcast("bossBombTelegraph", {
            id: bombId,
            enemyId,
            targetId: target.id,
            x: bombX,
            y: bombY,
            radius,
            impactDelayMs: BOSS1_BOMB_FUSE_MS,
        });

        setTimeout(() => {
            this.applyBoss1BombImpact(enemyId, bombId, bombX, bombY, radius, target.id);
        }, BOSS1_BOMB_FUSE_MS);
    }

    private tickCasterEnemy(
        enemyId: string,
        enemy: EnemyState,
        se: ServerEnemy,
        target: EnemyTarget,
        dx: number,
        dy: number,
        distance: number,
        dtSec: number,
        dtMs: number,
    ) {
        const isInCastRange = distance <= CASTER_CAST_RANGE;
        const hasLineOfSight = this.hasCasterLineOfSightToPlayer(enemy, se, target);
        const canStartCast = isInCastRange && hasLineOfSight;

        if (se.mode === "casterAttack") {
            enemy.action = "attack";
            se.modeMs = Math.max(0, se.modeMs - dtMs);
            if (se.modeMs === 0) {
                se.mode = canStartCast ? "casterCharge" : "chase";
                se.modeMs = canStartCast ? CASTER_CHARGE_MS : 0;
                enemy.action = canStartCast ? "charge" : "run";
            }
            return;
        }

        if (se.mode === "casterCharge") {
            if (!hasLineOfSight) {
                se.mode = "chase";
                se.modeMs = 0;
                enemy.action = "run";
            } else {
                this.faceEnemyTowardPoint(enemy, target.targetX, target.targetY);
                enemy.action = "charge";
                se.modeMs = Math.max(0, se.modeMs - dtMs);
                if (se.modeMs === 0) {
                    const launchTarget = this.findNearestAlivePlayer(enemy.x, enemy.y);
                    if (!launchTarget || !this.hasCasterLineOfSightToPlayer(enemy, se, launchTarget)) {
                        se.mode = "chase";
                        enemy.action = "run";
                        return;
                    }

                    const launchX = launchTarget.player.x;
                    const launchY = this.playerHitboxCenterY(launchTarget.player.y);
                    const launchDx = launchX - enemy.x;
                    const launchDy = launchY - enemy.y;
                    const launchDirection = directionFromInput(launchDx, launchDy);
                    if (launchDirection) enemy.facingDirection = launchDirection;

                    se.mode = "casterAttack";
                    se.modeMs = CASTER_ATTACK_MS;
                    enemy.action = "attack";
                    enemy.attackSeq++;
                    this.spawnCasterFireball(enemy.x, enemy.y, launchX, launchY);
                }
                return;
            }
        }

        if (canStartCast) {
            this.faceEnemyTowardPoint(enemy, target.targetX, target.targetY);
            se.path = [];
            enemy.action = "charge";
            se.mode = "casterCharge";
            se.modeMs = CASTER_CHARGE_MS;
            return;
        }

        se.mode = "chase";
        se.modeMs = 0;
        enemy.action = "run";
        if (distance <= 0) return;

        const remainingDistance = hasLineOfSight ? Math.max(0, distance - CASTER_CAST_RANGE) : distance;
        const move = Math.min(ENEMY1_SPEED * this.getEnemyCaltropsSpeedMultiplier(enemy) * dtSec, remainingDistance);
        if (move <= 0) {
            if (hasLineOfSight) {
                enemy.action = "charge";
                se.mode = "casterCharge";
                se.modeMs = CASTER_CHARGE_MS;
            }
            return;
        }

        if (!this.moveEnemyUsingFlowField(enemy, se, target, move, dx, dy, distance)) {
            enemy.action = "idle";
        }
    }

    private hasCasterLineOfSightToPlayer(enemy: EnemyState, se: ServerEnemy, target: EnemyTarget): boolean {
        return this.hasCachedEnemyLineOfSight(enemy, se, target, "caster");
    }

    private tickDarkKnightEnemy(
        enemyId: string,
        enemy: EnemyState,
        se: ServerEnemy,
        target: EnemyTarget,
        dx: number,
        dy: number,
        distance: number,
        dtSec: number,
        dtMs: number,
    ) {
        if (se.mode === "dkAttack") {
            enemy.action = "attack";
            se.modeMs = Math.max(0, se.modeMs - dtMs);
            if (se.modeMs === 0) {
                se.mode = "dkCooldown";
                se.modeMs = DARK_KNIGHT_COOLDOWN_MS;
                enemy.action = "idle";
            }
            return;
        }

        if (se.mode === "dkCooldown") {
            enemy.action = "idle";
            se.modeMs = Math.max(0, se.modeMs - dtMs);
            if (se.modeMs === 0) {
                se.mode = "dkWalk";
                se.darkKnightTargetKind = null;
                enemy.action = "walk";
            }
            return;
        }

        if (se.mode === "dkRush") {
            enemy.action = "run";
            if (this.tickDarkKnightRush(enemyId, enemy, se, dtSec, dtMs)) return;
            se.mode = "dkWalk";
            se.darkKnightTargetKind = null;
        }

        if (distance <= DARK_KNIGHT_DETECTION_RANGE && this.hasDarkKnightLineOfSightToPlayer(enemy, se, target)) {
            this.startDarkKnightRush(enemy, se, target);
            return;
        }

        enemy.action = "walk";
        se.mode = "dkWalk";
        se.modeMs = 0;
        if (distance <= 0) return;

        const move = Math.min(DARK_KNIGHT_WALK_SPEED * this.getEnemyCaltropsSpeedMultiplier(enemy) * dtSec, distance);
        if (!this.moveEnemyUsingFlowField(enemy, se, target, move, dx, dy, distance)) {
            enemy.action = "idle";
        }
    }

    private hasDarkKnightLineOfSightToPlayer(enemy: EnemyState, se: ServerEnemy, target: EnemyTarget): boolean {
        return this.hasCachedEnemyLineOfSight(enemy, se, target, "darkKnight");
    }

    private startDarkKnightRush(enemy: EnemyState, se: ServerEnemy, target: EnemyTarget) {
        se.mode = "dkRush";
        se.modeMs = DARK_KNIGHT_MIN_RUSH_MS;
        se.darkKnightMarkX = target.targetX;
        se.darkKnightMarkY = target.targetY;
        se.darkKnightTargetKind = "playerMark";
        se.path = [];

        const direction = directionFromInput(target.targetX - enemy.x, target.targetY - enemy.y);
        if (direction) enemy.facingDirection = direction;
        enemy.action = "run";
    }

    private tickDarkKnightRush(enemyId: string, enemy: EnemyState, se: ServerEnemy, dtSec: number, dtMs: number): boolean {
        se.modeMs = Math.max(0, se.modeMs - dtMs);
        const canAttack = se.modeMs === 0;
        const targetX = se.darkKnightMarkX;
        const targetY = se.darkKnightMarkY;

        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= DARK_KNIGHT_MARK_REACH_RADIUS) {
            if (!canAttack) return true;
            this.startDarkKnightAttack(enemyId, enemy, se);
            return true;
        }

        const move = Math.min(DARK_KNIGHT_RUSH_SPEED * this.getEnemyCaltropsSpeedMultiplier(enemy) * dtSec, distance);
        const prevX = enemy.x;
        const prevY = enemy.y;
        const resolved = this.moveEnemyWithWorldColliders(
            enemy,
            enemy.x + (dx / distance) * move,
            enemy.y + (dy / distance) * move,
        );
        const moved = Math.hypot(resolved.x - enemy.x, resolved.y - enemy.y) > 0.1;
        enemy.x = resolved.x;
        enemy.y = resolved.y;
        this.setEnemyFacingFromMovement(enemy, prevX, prevY);

        return moved;
    }

    private startDarkKnightAttack(enemyId: string, enemy: EnemyState, se: ServerEnemy) {
        se.mode = "dkAttack";
        se.modeMs = DARK_KNIGHT_ATTACK_MS;
        enemy.action = "attack";
        enemy.attackSeq++;
        const attackOrigin = { x: enemy.x, y: enemy.y };
        setTimeout(() => {
            this.applyDarkKnightAoeImpact(enemyId, attackOrigin);
        }, DARK_KNIGHT_ATTACK_IMPACT_DELAY_MS);
    }

    private moveEnemyWithWorldColliders(enemy: EnemyState, nextX: number, nextY: number): { x: number; y: number } {
        return this.measureEnemySubphase("movement", () => {
            this.incrementEnemyCounter("movementCalls");
            let resolvedX = clamp(nextX, -ENEMY1_EDGE_OFFSET, WORLD_WIDTH + ENEMY1_EDGE_OFFSET);
            let resolvedY = enemy.y;

            if (this.collidesWithEnemyWorldFoot(resolvedX, resolvedY + ENEMY_FOOT_Y_OFFSET, ENEMY_FOOT_RADIUS)) {
                resolvedX = enemy.x;
            }

            const candidateY = clamp(nextY, -ENEMY1_EDGE_OFFSET, WORLD_HEIGHT + ENEMY1_EDGE_OFFSET);
            if (!this.collidesWithEnemyWorldFoot(resolvedX, candidateY + ENEMY_FOOT_Y_OFFSET, ENEMY_FOOT_RADIUS)) {
                resolvedY = candidateY;
            }

            return { x: resolvedX, y: resolvedY };
        });
    }

    private moveEnemyDirectlyToward(
        enemy: EnemyState,
        se: ServerEnemy,
        dx: number,
        dy: number,
        distance: number,
        move: number,
    ): void {
        const prevX = enemy.x;
        const prevY = enemy.y;
        const resolved = this.moveEnemyWithWorldColliders(
            enemy,
            enemy.x + (dx / distance) * move,
            enemy.y + (dy / distance) * move,
        );
        const moved = Math.hypot(resolved.x - enemy.x, resolved.y - enemy.y) > 0.1;
        enemy.x = resolved.x;
        enemy.y = resolved.y;
        this.setEnemyFacingFromMovement(enemy, prevX, prevY);
        if (!moved) {
            se.directPathClear = false;
            se.directPathCheckMs = 0;
        }
    }

    private moveEnemyUsingFlowField(
        enemy: EnemyState,
        se: ServerEnemy,
        target: EnemyTarget,
        moveDistance: number,
        directDx: number,
        directDy: number,
        directDistance: number,
    ): boolean {
        return this.measureEnemySubphase("flowMove", () => {
            this.incrementEnemyCounter("flowMoveCalls");
            if (se.path.length > 0) se.path.length = 0;
            se.pathTargetCell = null;

            const field = this.getEnemyFlowFieldForTarget(target);
            if (field) {
                const currentCell = this.worldToBuildCell(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET);
                const currentIndex = this.buildCellIndex(currentCell.col, currentCell.row);
                const dirX = field.dirX[currentIndex] ?? 0;
                const dirY = field.dirY[currentIndex] ?? 0;
                if (dirX !== 0 || dirY !== 0) {
                    const nextCell = { col: currentCell.col + dirX, row: currentCell.row + dirY };
                    const waypoint = this.buildCellCenter(nextCell);
                    if (this.moveEnemyTowardPoint(enemy, waypoint.x, waypoint.y - ENEMY_FOOT_Y_OFFSET, moveDistance)) {
                        this.incrementEnemyCounter("flowMoveFieldMoves");
                        return true;
                    }
                    this.incrementEnemyCounter("flowMoveFieldBlocked");
                } else {
                    this.incrementEnemyCounter("flowMoveNoDirection");
                }

                if (this.moveEnemyWithLocalFallback(enemy, field.targetCell, moveDistance, directDx, directDy, directDistance)) {
                    return true;
                }
            }

            return this.moveEnemyWithLocalFallback(
                enemy,
                target.targetCell,
                moveDistance,
                directDx,
                directDy,
                directDistance,
            );
        });
    }

    private moveEnemyTowardPoint(enemy: EnemyState, targetX: number, targetY: number, moveDistance: number): boolean {
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= 0 || moveDistance <= 0) return false;

        const step = Math.min(moveDistance, distance);
        const prevX = enemy.x;
        const prevY = enemy.y;
        const resolved = this.moveEnemyWithWorldColliders(
            enemy,
            enemy.x + (dx / distance) * step,
            enemy.y + (dy / distance) * step,
        );
        const moved = Math.hypot(resolved.x - enemy.x, resolved.y - enemy.y) > 0.1;
        enemy.x = resolved.x;
        enemy.y = resolved.y;
        this.setEnemyFacingFromMovement(enemy, prevX, prevY);
        return moved;
    }

    private moveEnemyWithLocalFallback(
        enemy: EnemyState,
        targetCell: PathCell,
        moveDistance: number,
        directDx: number,
        directDy: number,
        directDistance: number,
    ): boolean {
        this.incrementEnemyCounter("flowMoveFallbackCalls");
        if (directDistance > 0 && this.moveEnemyTowardPoint(enemy, enemy.x + directDx, enemy.y + directDy, moveDistance)) {
            this.incrementEnemyCounter("flowMoveFallbackDirect");
            return true;
        }

        const currentCell = this.worldToBuildCell(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET);
        let usedMask = 0;
        for (let attempt = 0; attempt < ENEMY_FLOW_DIRECTIONS.length; attempt++) {
            let bestDirectionIndex = -1;
            let bestDistanceSq = Number.POSITIVE_INFINITY;
            for (let index = 0; index < ENEMY_FLOW_DIRECTIONS.length; index++) {
                if ((usedMask & (1 << index)) !== 0) continue;
                const [dirX, dirY] = ENEMY_FLOW_DIRECTIONS[index];
                const col = currentCell.col + dirX;
                const row = currentCell.row + dirY;
                if (!this.isBuildPathCellInside(col, row) || this.isBuildPathCellBlocked(col, row)) continue;
                if (!this.isBuildPathStepAllowed(currentCell.col, currentCell.row, col, row)) continue;

                const dx = targetCell.col - col;
                const dy = targetCell.row - row;
                const distanceSq = dx * dx + dy * dy;
                if (distanceSq < bestDistanceSq) {
                    bestDistanceSq = distanceSq;
                    bestDirectionIndex = index;
                }
            }

            if (bestDirectionIndex < 0) break;
            usedMask |= 1 << bestDirectionIndex;
            const [dirX, dirY] = ENEMY_FLOW_DIRECTIONS[bestDirectionIndex];
            const waypoint = this.buildCellCenter({ col: currentCell.col + dirX, row: currentCell.row + dirY });
            if (this.moveEnemyTowardPoint(enemy, waypoint.x, waypoint.y - ENEMY_FOOT_Y_OFFSET, moveDistance)) {
                this.incrementEnemyCounter("flowMoveFallbackNeighbor");
                return true;
            }
        }

        this.incrementEnemyCounter("flowMoveFallbackBlocked");
        return false;
    }

    private getEnemyFlowFieldForTarget(target: EnemyTarget): EnemyFlowField | null {
        const targetCell = target.targetCell;
        if (!targetCell) {
            this.incrementEnemyCounter("flowFieldNoTargetCell");
            return null;
        }

        const existing = this.enemyFlowFields.get(target.id);
        if (existing
            && existing.topologyVersion === this.mapTopologyVersion
            && existing.targetCell.col === targetCell.col
            && existing.targetCell.row === targetCell.row) {
            this.incrementEnemyCounter("flowFieldCacheHits");
            return existing;
        }

        if (this.enemyFlowBuildsThisTick >= ENEMY_FLOW_FIELD_MAX_BUILDS_PER_TICK) {
            if (existing && existing.topologyVersion === this.mapTopologyVersion) {
                this.incrementEnemyCounter("flowFieldStaleBudgetHits");
                return existing;
            }
            this.incrementEnemyCounter("flowFieldBuildSkippedBudget");
            return null;
        }

        this.enemyFlowBuildsThisTick++;
        const field = this.buildEnemyFlowField(targetCell, existing);
        this.enemyFlowFields.set(target.id, field);
        return field;
    }

    private buildEnemyFlowField(targetCell: PathCell, reusable?: EnemyFlowField): EnemyFlowField {
        return this.measureEnemySubphase("flowBuild", () => {
            this.incrementEnemyCounter("flowFieldBuilds");
            const columns = BUILD_PATH_COLUMNS;
            const rows = BUILD_PATH_ROWS;
            const totalCells = BUILD_PATH_CELL_COUNT;
            const blocked = this.buildPathBlockedGrid;
            const distance = reusable?.distance ?? new Int16Array(totalCells);
            distance.fill(-1);
            const dirX = reusable?.dirX ?? new Int8Array(totalCells);
            const dirY = reusable?.dirY ?? new Int8Array(totalCells);
            dirX.fill(0);
            dirY.fill(0);
            const queue = this.enemyFlowBuildQueue;
            let readIndex = 0;
            let writeIndex = 0;
            let visited = 0;

            const targetIndex = this.buildCellIndex(targetCell.col, targetCell.row);
            distance[targetIndex] = 0;
            queue[writeIndex++] = targetIndex;

            while (readIndex < writeIndex) {
                const currentIndex = queue[readIndex++];
                const currentCol = currentIndex % columns;
                const currentRow = Math.floor(currentIndex / columns);
                const currentDistance = distance[currentIndex];
                visited++;

                for (let directionIndex = 0; directionIndex < ENEMY_FLOW_DIRECTION_COLS.length; directionIndex++) {
                    const offsetCol = ENEMY_FLOW_DIRECTION_COLS[directionIndex];
                    const offsetRow = ENEMY_FLOW_DIRECTION_ROWS[directionIndex];
                    const nextCol = currentCol + offsetCol;
                    const nextRow = currentRow + offsetRow;
                    if (nextCol < 0 || nextRow < 0 || nextCol >= columns || nextRow >= rows) continue;
                    const nextIndex = nextRow * columns + nextCol;
                    if (blocked[nextIndex] !== 0) continue;
                    if (offsetCol !== 0 && offsetRow !== 0
                        && (blocked[nextRow * columns + currentCol] !== 0
                            || blocked[currentRow * columns + nextCol] !== 0)) {
                        continue;
                    }
                    if (distance[nextIndex] >= 0) continue;

                    distance[nextIndex] = currentDistance + 1;
                    dirX[nextIndex] = currentCol - nextCol;
                    dirY[nextIndex] = currentRow - nextRow;
                    queue[writeIndex++] = nextIndex;
                }
            }
            this.incrementEnemyCounter("flowFieldCellsVisited", visited);

            return {
                targetCell,
                topologyVersion: this.mapTopologyVersion,
                dirX,
                dirY,
                distance,
            };
        });
    }

    private shouldUseDirectEnemyPath(enemy: EnemyState, se: ServerEnemy, target: EnemyTarget): boolean {
        const fromCell = this.worldToBuildCell(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET);
        const targetCell = target.targetCell;
        const topologyChanged = se.directPathTopologyVersion !== this.mapTopologyVersion;
        const fromChanged = !se.directPathFromCell
            || se.directPathFromCell.col !== fromCell.col
            || se.directPathFromCell.row !== fromCell.row;
        const targetChanged = !se.directPathTargetCell
            || se.directPathTargetCell.col !== targetCell.col
            || se.directPathTargetCell.row !== targetCell.row;

        if (!topologyChanged && !fromChanged && !targetChanged && se.directPathCheckMs > 0) {
            this.incrementEnemyCounter(se.directPathClear ? "directPathCacheClear" : "directPathCacheBlocked");
            return se.directPathClear;
        }

        const clear = this.hasDirectEnemyPath(
            enemy.x,
            enemy.y + ENEMY_FOOT_Y_OFFSET,
            target.targetFootX,
            target.targetFootY,
        );
        se.directPathFromCell = fromCell;
        se.directPathTargetCell = targetCell;
        se.directPathTopologyVersion = this.mapTopologyVersion;
        se.directPathCheckMs = ENEMY_DIRECT_PATH_RECHECK_MS;
        se.directPathClear = clear;
        return clear;
    }

    private hasDirectEnemyPath(fromX: number, fromY: number, toX: number, toY: number): boolean {
        return this.measureEnemySubphase("directPath", () => {
            this.incrementEnemyCounter("directPathChecks");
            let clear = true;
            const testTable = (table: EnchantmentTableState | CraftingTableState) => {
                if (!clear) return;
                clear = !capsuleOverlapsAabb(
                    fromX,
                    fromY,
                    toX,
                    toY,
                    ENEMY_FOOT_RADIUS,
                    table.x,
                    table.y,
                    LAYER3_ROW_OBJECT_HALF_WIDTH,
                    LAYER3_ROW_OBJECT_HALF_HEIGHT,
                );
            };
            this.state.enchantmentTables.forEach(testTable);
            this.state.craftingTables.forEach(testTable);
            if (!clear) {
                this.incrementEnemyCounter("directPathBlockedByLayer3Object");
                return false;
            }

            clear = !this.segmentOverlapsSolidMapTile(fromX, fromY, toX, toY, ENEMY_FOOT_RADIUS);
            this.incrementEnemyCounter(clear ? "directPathClear" : "directPathBlockedByMap");
            return clear;
        });
    }

    private segmentOverlapsLayer3Table(fromX: number, fromY: number, toX: number, toY: number, radius: number): boolean {
        let blocked = false;
        const testTable = (table: EnchantmentTableState | CraftingTableState) => {
            if (blocked) return;
            blocked = capsuleOverlapsAabb(
                fromX,
                fromY,
                toX,
                toY,
                radius,
                table.x,
                table.y,
                LAYER3_ROW_OBJECT_HALF_WIDTH,
                LAYER3_ROW_OBJECT_HALF_HEIGHT,
            );
        };
        this.state.enchantmentTables.forEach(testTable);
        this.state.craftingTables.forEach(testTable);
        return blocked;
    }

    private segmentOverlapsEnemyLineBlocker(
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        radius: number,
    ): boolean {
        if (this.segmentOverlapsLayer3Table(fromX, fromY, toX, toY, radius)) {
            this.incrementEnemyCounter("lineOfSightBlockedByLayer3Object");
            return true;
        }
        return this.segmentOverlapsSolidMapTile(fromX, fromY, toX, toY, radius, true);
    }

    private segmentOverlapsSolidMapTile(
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        radius: number,
        useFullCellCollider: boolean = false,
    ): boolean {
        const cacheKey = [
            this.mapTopologyVersion,
            Math.round(fromX),
            Math.round(fromY),
            Math.round(toX),
            Math.round(toY),
            Math.round(radius),
            useFullCellCollider ? "full" : "shape",
        ].join(":");
        const cached = this.solidSegmentCache.get(cacheKey);
        if (cached !== undefined) return cached;
        if (this.solidSegmentCache.size > 4096) this.solidSegmentCache.clear();

        this.incrementEnemyCounter("solidSegmentChecks");
        const candidateCells = this.getSolidMapSegmentCandidateCells(fromX, fromY, toX, toY, radius);
        this.incrementEnemyCounter("solidSegmentSamples", candidateCells.size);
        for (const key of candidateCells) {
            const [col, row] = key.split(":").map(Number);
            for (const layer of [1, 2] as const) {
                this.incrementEnemyCounter("solidTileChecks");
                const value = this.getMapTileValue(col, row, layer);
                if (value <= 0 || !this.isSolidMapFrame(value - 1)) continue;
                const collider = useFullCellCollider
                    ? this.getMapTileFullCellCollider(col, row)
                    : this.getMapTileCollider(col, row, value - 1);
                if (capsuleOverlapsAabb(
                    fromX,
                    fromY,
                    toX,
                    toY,
                    radius,
                    collider.x,
                    collider.y,
                    collider.halfWidth,
                    collider.halfHeight,
                )) {
                    this.incrementEnemyCounter("solidSegmentHits");
                    this.solidSegmentCache.set(cacheKey, true);
                    return true;
                }
            }
        }
        this.solidSegmentCache.set(cacheKey, false);
        return false;
    }

    private hasEnemyLineOfSightToPlayer(enemy: EnemyState, se: ServerEnemy, target: EnemyTarget): boolean {
        return this.hasCachedEnemyLineOfSight(enemy, se, target, "melee");
    }

    private hasCachedEnemyLineOfSight(
        enemy: EnemyState,
        se: ServerEnemy,
        target: EnemyTarget,
        kind: EnemyLineOfSightKind,
    ): boolean {
        const fromY = kind === "caster" ? enemy.y : enemy.y + ENEMY_FOOT_Y_OFFSET;
        const fromCell = this.worldToBuildCell(enemy.x, fromY);
        const targetCell = target.targetCell;
        const cacheValid = se.lineOfSightTopologyVersion === this.mapTopologyVersion
            && se.lineOfSightTargetId === target.id
            && se.lineOfSightKind === kind
            && se.lineOfSightFromCell?.col === fromCell.col
            && se.lineOfSightFromCell?.row === fromCell.row
            && se.lineOfSightTargetCell?.col === targetCell.col
            && se.lineOfSightTargetCell?.row === targetCell.row
            && se.lineOfSightCheckMs > 0;
        if (cacheValid) {
            this.incrementEnemyCounter(se.lineOfSightClear ? "lineOfSightCacheClear" : "lineOfSightCacheBlocked");
            return se.lineOfSightClear;
        }

        return this.measureEnemySubphase("lineOfSight", () => {
            this.incrementEnemyCounter("lineOfSightChecks");
            let clear = !this.segmentOverlapsEnemyLineBlocker(
                enemy.x,
                fromY,
                target.targetFootX,
                target.targetFootY,
                1,
            );
            if (clear && (kind === "melee" || kind === "caster")) {
                clear = !this.segmentOverlapsEnemyLineBlocker(
                    enemy.x,
                    fromY,
                    target.player.x,
                    this.playerHitboxCenterY(target.player.y),
                    1,
                );
            }
            if (clear && (kind === "melee" || kind === "caster")) {
                clear = !this.segmentOverlapsEnemyLineBlocker(
                    enemy.x,
                    fromY,
                    target.player.x,
                    target.player.y + PLAYER_TREE_Y_OFFSET,
                    1,
                );
            }
            se.lineOfSightFromCell = fromCell;
            se.lineOfSightTargetCell = targetCell;
            se.lineOfSightTopologyVersion = this.mapTopologyVersion;
            se.lineOfSightCheckMs = ENEMY_LOS_RECHECK_MS;
            se.lineOfSightClear = clear;
            se.lineOfSightTargetId = target.id;
            se.lineOfSightKind = kind;
            return clear;
        });
    }

    private faceEnemyTowardPoint(enemy: EnemyState, x: number, y: number): void {
        const direction = directionFromInput(x - enemy.x, y - enemy.y);
        if (direction) enemy.facingDirection = direction;
    }

    private setEnemyFacingFromMovement(enemy: EnemyState, previousX: number, previousY: number): void {
        const direction = directionFromInput(enemy.x - previousX, enemy.y - previousY);
        if (direction) enemy.facingDirection = direction;
    }

    private getEnemyCaltropsSpeedMultiplier(enemy: EnemyState): number {
        return (this.serverEnemies.get(enemy.id)?.caltropsSlowMs ?? 0) > 0 ? CALTROPS_SPEED_MULTIPLIER : 1;
    }

    private tickEnemyCaltropsSlow(enemy: EnemyState, se: ServerEnemy, dtMs: number): void {
        se.caltropsSlowMs = Math.max(0, se.caltropsSlowMs - dtMs);
        se.caltropsCheckMs = Math.max(0, se.caltropsCheckMs - dtMs);
        if (se.caltropsCheckMs > 0) return;

        se.caltropsCheckMs = CALTROPS_CHECK_INTERVAL_MS;
        if (this.isEnemyTouchingIndexedCaltrops(enemy)) {
            se.caltropsSlowMs = CALTROPS_SLOW_MS;
        }
    }

    private isEnemyTouchingIndexedCaltrops(enemy: EnemyState): boolean {
        return this.measureEnemySubphase("caltrops", () => {
            this.incrementEnemyCounter("caltropsChecks");
            if (this.caltropsByBuildCell.size === 0) return false;

            const footX = enemy.x;
            const footY = enemy.y + ENEMY_FOOT_Y_OFFSET;
            const radius = CALTROPS_SLOW_RADIUS + ENEMY_FOOT_RADIUS;
            const radiusSq = radius * radius;

            const startCol = Math.floor((footX - radius) / BUILD_GRID_SIZE);
            const endCol = Math.floor((footX + radius) / BUILD_GRID_SIZE);
            const startRow = Math.floor((footY - radius) / BUILD_GRID_SIZE);
            const endRow = Math.floor((footY + radius) / BUILD_GRID_SIZE);
            for (let row = startRow; row <= endRow; row++) {
                for (let col = startCol; col <= endCol; col++) {
                    this.incrementEnemyCounter("caltropsCellChecks");
                    const bucket = this.caltropsByBuildCell.get(this.buildCellKey(col, row));
                    if (!bucket) continue;
                    for (const caltrops of bucket) {
                        this.incrementEnemyCounter("caltropsObjectChecks");
                        const dx = footX - caltrops.x;
                        const dy = footY - caltrops.y;
                        if (dx * dx + dy * dy <= radiusSq) return true;
                    }
                }
            }

            return false;
        });
    }

    private getNearestWalkableBuildCell(center: PathCell, maxRadius: number): PathCell | null {
        for (let radius = 0; radius <= maxRadius; radius++) {
            let best: PathCell | null = null;
            let bestDistance = Number.POSITIVE_INFINITY;
            for (let row = center.row - radius; row <= center.row + radius; row++) {
                for (let col = center.col - radius; col <= center.col + radius; col++) {
                    if (Math.max(Math.abs(col - center.col), Math.abs(row - center.row)) !== radius) continue;
                    if (!this.isBuildPathCellInside(col, row) || this.isBuildPathCellBlocked(col, row)) continue;
                    const distance = Math.hypot(col - center.col, row - center.row);
                    if (distance < bestDistance) {
                        best = { col, row };
                        bestDistance = distance;
                    }
                }
            }
            if (best) return best;
        }
        return null;
    }

    private getNearestWalkableBuildCellToWorldPoint(center: PathCell, worldX: number, worldY: number, maxRadius: number): PathCell | null {
        for (let radius = 0; radius <= maxRadius; radius++) {
            let best: PathCell | null = null;
            let bestDistanceSq = Number.POSITIVE_INFINITY;
            for (let row = center.row - radius; row <= center.row + radius; row++) {
                for (let col = center.col - radius; col <= center.col + radius; col++) {
                    if (Math.max(Math.abs(col - center.col), Math.abs(row - center.row)) !== radius) continue;
                    if (!this.isBuildPathCellInside(col, row) || this.isBuildPathCellBlocked(col, row)) continue;
                    const cellCenter = this.buildCellCenter({ col, row });
                    const dx = cellCenter.x - worldX;
                    const dy = cellCenter.y - worldY;
                    const distanceSq = dx * dx + dy * dy;
                    if (distanceSq < bestDistanceSq) {
                        best = { col, row };
                        bestDistanceSq = distanceSq;
                    }
                }
            }
            if (best) return best;
        }
        return null;
    }

    private followEnemyPathToTarget(enemy: EnemyState, se: ServerEnemy, target: EnemyTarget, moveDistance: number): boolean {
        return this.measureEnemySubphase("pathFollow", () => {
            this.incrementEnemyCounter("pathFollowCalls");
            const targetCell = target.targetCell;
            if (!targetCell) {
                this.incrementEnemyCounter("pathNoRoute");
                se.path = [];
                se.pathTargetCell = null;
                se.repathMs = ENEMY_PATH_FAILED_RETRY_MS;
                return false;
            }

            const targetChanged = !se.pathTargetCell
                || se.pathTargetCell.col !== targetCell.col
                || se.pathTargetCell.row !== targetCell.row;
            const topologyChanged = se.pathTopologyVersion !== this.mapTopologyVersion;
            const shouldBuild = topologyChanged || targetChanged || se.path.length === 0;
            if (shouldBuild) {
                if (se.repathMs > 0 && se.path.length === 0 && !topologyChanged && !targetChanged) {
                    return false;
                }
                if (this.enemyPathBuildsThisTick >= ENEMY_PATH_MAX_BUILDS_PER_TICK) {
                    this.incrementEnemyCounter("pathBuildSkippedBudget");
                    return false;
                }

                const startCell = this.getNearestWalkableBuildCell(
                    this.worldToBuildCell(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET),
                    ENEMY_PATH_TARGET_SEARCH_RADIUS,
                );
                if (!startCell) {
                    this.incrementEnemyCounter("pathNoRoute");
                    se.path = [];
                    se.pathTargetCell = targetCell;
                    se.pathTopologyVersion = this.mapTopologyVersion;
                    se.repathMs = ENEMY_PATH_FAILED_RETRY_MS;
                    return false;
                }

                this.enemyPathBuildsThisTick++;
                this.incrementEnemyCounter("pathBuilds");
                const path = this.buildEnemyPath(startCell, targetCell);
                se.pathTargetCell = targetCell;
                se.pathTopologyVersion = this.mapTopologyVersion;
                if (!path) {
                    se.path = [];
                    se.repathMs = ENEMY_PATH_FAILED_RETRY_MS;
                    return false;
                }
                se.repathMs = ENEMY_PATH_REPATH_MS;
                se.path = path;
            }

            return this.followEnemyPath(enemy, se, moveDistance);
        });
    }

    private buildEnemyPath(start: PathCell, goal: PathCell): PathCell[] | null {
        const startKey = this.buildCellKey(start.col, start.row);
        const goalKey = this.buildCellKey(goal.col, goal.row);
        if (startKey === goalKey) {
            this.incrementEnemyCounter("pathFound");
            return [];
        }

        const open = new MinHeap<PathCell & { g: number; f: number }>((a, b) => a.f - b.f);
        open.push({
            ...start,
            g: 0,
            f: this.enemyPathHeuristic(start, goal),
        });
        const cameFrom = new Map<string, string>();
        const gScore = new Map<string, number>([[startKey, 0]]);
        const closed = new Set<string>();
        let visited = 0;

        while (open.length > 0) {
            const current = open.pop();
            if (!current) break;
            const currentKey = this.buildCellKey(current.col, current.row);
            if (closed.has(currentKey)) continue;
            closed.add(currentKey);
            visited++;
            this.incrementEnemyCounter("pathCellsVisited");

            if (currentKey === goalKey) {
                this.incrementEnemyCounter("pathFound");
                return this.reconstructEnemyPath(cameFrom, startKey, goalKey);
            }
            if (visited >= ENEMY_PATH_MAX_EXPANSIONS) {
                this.incrementEnemyCounter("pathExpansionLimit");
                return null;
            }

            for (const neighbor of this.getEnemyPathNeighbors(current.col, current.row)) {
                const neighborKey = this.buildCellKey(neighbor.col, neighbor.row);
                if (closed.has(neighborKey)) continue;

                const tentativeG = current.g + neighbor.cost;
                if (tentativeG >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) continue;

                cameFrom.set(neighborKey, currentKey);
                gScore.set(neighborKey, tentativeG);
                open.push({
                    col: neighbor.col,
                    row: neighbor.row,
                    g: tentativeG,
                    f: tentativeG + this.enemyPathHeuristic(neighbor, goal),
                });
            }
        }

        this.incrementEnemyCounter("pathNoRoute");
        return null;
    }

    private getEnemyPathNeighbors(col: number, row: number): Array<PathCell & { cost: number }> {
        const neighbors: Array<PathCell & { cost: number }> = [];
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
            for (let colOffset = -1; colOffset <= 1; colOffset++) {
                if (colOffset === 0 && rowOffset === 0) continue;
                const nextCol = col + colOffset;
                const nextRow = row + rowOffset;
                if (!this.isBuildPathCellInside(nextCol, nextRow) || this.isBuildPathCellBlocked(nextCol, nextRow)) continue;
                if (colOffset !== 0 && rowOffset !== 0
                    && (this.isBuildPathCellBlocked(col + colOffset, row) || this.isBuildPathCellBlocked(col, row + rowOffset))) {
                    continue;
                }
                neighbors.push({
                    col: nextCol,
                    row: nextRow,
                    cost: colOffset !== 0 && rowOffset !== 0 ? ENEMY_PATH_DIAGONAL_COST : 1,
                });
            }
        }
        return neighbors;
    }

    private enemyPathHeuristic(from: PathCell, to: PathCell): number {
        const dx = Math.abs(from.col - to.col);
        const dy = Math.abs(from.row - to.row);
        const diagonal = Math.min(dx, dy);
        const straight = Math.max(dx, dy) - diagonal;
        return straight + diagonal * ENEMY_PATH_DIAGONAL_COST;
    }

    private reconstructEnemyPath(cameFrom: Map<string, string>, startKey: string, goalKey: string): PathCell[] {
        const path: PathCell[] = [];
        let currentKey = goalKey;
        while (currentKey !== startKey) {
            const [col, row] = currentKey.split(":").map(Number);
            path.push({ col, row });
            const previousKey = cameFrom.get(currentKey);
            if (!previousKey) return [];
            currentKey = previousKey;
        }
        path.reverse();
        return path;
    }

    private followEnemyPath(enemy: EnemyState, se: ServerEnemy, moveDistance: number): boolean {
        while (se.path.length > 0) {
            const nextCell = se.path[0];
            const waypoint = this.buildCellCenter(nextCell);
            const targetX = waypoint.x;
            const targetY = waypoint.y - ENEMY_FOOT_Y_OFFSET;
            const dx = targetX - enemy.x;
            const dy = targetY - enemy.y;
            const distance = Math.hypot(dx, dy);

            if (distance <= ENEMY_PATH_WAYPOINT_RADIUS) {
                se.path.shift();
                this.incrementEnemyCounter("pathWaypointsConsumed");
                continue;
            }

            const step = Math.min(moveDistance, distance);
            const prevX = enemy.x;
            const prevY = enemy.y;
            const resolved = this.moveEnemyWithWorldColliders(
                enemy,
                enemy.x + (dx / distance) * step,
                enemy.y + (dy / distance) * step,
            );
            const moved = Math.hypot(resolved.x - enemy.x, resolved.y - enemy.y) > 0.1;
            enemy.x = resolved.x;
            enemy.y = resolved.y;
            this.setEnemyFacingFromMovement(enemy, prevX, prevY);
            this.incrementEnemyCounter(moved ? "pathFollowMoves" : "pathFollowBlocked");
            if (!moved) {
                se.path = [];
                se.repathMs = 0;
            }
            return moved;
        }

        return false;
    }

    private applyDarkKnightAoeImpact(enemyId: string, attackOrigin: AttackOrigin) {
        if (this.state.gameOver) return;
        const enemy = this.state.enemies.get(enemyId);
        if (!enemy || enemy.isDead) return;

        const impactX = Number.isFinite(enemy.x) ? enemy.x : attackOrigin.x;
        const impactY = Number.isFinite(enemy.y) ? enemy.y : attackOrigin.y;
        this.state.players.forEach((player, playerId) => {
            const sp = this.serverPlayers.get(playerId);
            if (!sp || !sp.alive || player.isDead) return;

            if (!circleOverlapsAabb(
                impactX,
                impactY,
                DARK_KNIGHT_AOE_RADIUS,
                player.x,
                this.playerHitboxCenterY(player.y),
                PLAYER_HW,
                PLAYER_HH,
            )) return;
            if (this.segmentOverlapsSolidMapTile(impactX, impactY, player.x, this.playerHitboxCenterY(player.y), 1, true)) return;

            const hurt = this.damagePlayer(playerId, sp, player, DARK_KNIGHT_ATTACK_DAMAGE, enemyId);
            if (hurt) this.broadcast("playerHurt", hurt);
        });

    }

    private getSolidMapSegmentCandidateCells(fromX: number, fromY: number, toX: number, toY: number, radius: number): Set<string> {
        const candidates = new Set<string>();
        const distance = Math.hypot(toX - fromX, toY - fromY);
        const steps = Math.max(1, Math.ceil(distance / (MAP_TILE_SIZE * 0.5)));
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            const startCol = Math.floor((x - radius) / MAP_TILE_SIZE);
            const endCol = Math.floor((x + radius) / MAP_TILE_SIZE);
            const startRow = Math.floor((y - radius) / MAP_TILE_SIZE);
            const endRow = Math.floor((y + radius) / MAP_TILE_SIZE);
            for (let row = startRow; row <= endRow; row++) {
                for (let col = startCol; col <= endCol; col++) {
                    if (this.isMapCellInside(col, row)) candidates.add(this.buildCellKey(col, row));
                }
            }
        }
        return candidates;
    }

    private worldToBuildCell(x: number, y: number): PathCell {
        return {
            col: Math.floor(clamp(x, 0, WORLD_WIDTH - 1) / BUILD_GRID_SIZE),
            row: Math.floor(clamp(y, 0, WORLD_HEIGHT - 1) / BUILD_GRID_SIZE),
        };
    }

    private buildCellCenter(cell: PathCell): { x: number; y: number } {
        return {
            x: cell.col * BUILD_GRID_SIZE + BUILD_BLOCK_HALF_SIZE,
            y: cell.row * BUILD_GRID_SIZE + BUILD_BLOCK_HALF_SIZE,
        };
    }

    private buildCellKey(col: number, row: number): string {
        return `${col}:${row}`;
    }

    private buildCellIndex(col: number, row: number): number {
        return row * BUILD_PATH_COLUMNS + col;
    }

    private isBuildPathCellInside(col: number, row: number): boolean {
        return col >= 0 && row >= 0
            && col < BUILD_PATH_COLUMNS
            && row < BUILD_PATH_ROWS;
    }

    private isBuildPathCellBlocked(col: number, row: number): boolean {
        return this.buildPathBlockedGrid[this.buildCellIndex(col, row)] !== 0;
    }

    private isBuildPathStepAllowed(fromCol: number, fromRow: number, toCol: number, toRow: number): boolean {
        const colOffset = toCol - fromCol;
        const rowOffset = toRow - fromRow;
        if (Math.abs(colOffset) > 1 || Math.abs(rowOffset) > 1) return false;
        if (colOffset === 0 && rowOffset === 0) return true;
        if (this.isBuildPathCellBlocked(toCol, toRow)) return false;
        return colOffset === 0 || rowOffset === 0
            || (!this.isBuildPathCellBlocked(fromCol + colOffset, fromRow)
                && !this.isBuildPathCellBlocked(fromCol, fromRow + rowOffset));
    }

    private computeBuildPathCellBlocked(col: number, row: number): boolean {
        const center = this.buildCellCenter({ col, row });
        if (this.collidesWithLayer3TableFoot(center.x, center.y, ENEMY_FOOT_RADIUS)) return true;
        return this.isMapTileFullyBlockedForEnemyNav(col, row);
    }

    private isMapTileFullyBlockedForEnemyNav(col: number, row: number): boolean {
        if (!this.isMapCellInside(col, row)) return true;
        const layer2 = this.getMapTileValue(col, row, 2);
        if (layer2 > 0 && this.isSolidMapFrame(layer2 - 1)) return true;
        const layer1 = this.getMapTileValue(col, row, 1);
        return layer1 > 0 && this.isSolidMapFrame(layer1 - 1);
    }

    private separateEnemyFeet(metrics?: TickMetrics) {
        const enemies = [...this.state.enemies.entries()].filter(([id]) => this.serverEnemies.has(id));
        if (enemies.length < 2) return;

        const minDistance = ENEMY_FOOT_RADIUS * 2;
        const minDistanceSq = minDistance * minDistance;

        for (let iteration = 0; iteration < ENEMY_SEPARATION_ITERATIONS; iteration++) {
            const buckets = new Map<string, Array<[string, EnemyState]>>();
            enemies.forEach(([id, enemy]) => {
                const col = Math.floor(enemy.x / ENEMY_SEPARATION_GRID_CELL_SIZE);
                const row = Math.floor((enemy.y + ENEMY_FOOT_Y_OFFSET) / ENEMY_SEPARATION_GRID_CELL_SIZE);
                const key = `${col}:${row}`;
                const bucket = buckets.get(key);
                if (bucket) {
                    bucket.push([id, enemy]);
                } else {
                    buckets.set(key, [[id, enemy]]);
                }
            });

            const checkedPairs = new Set<string>();
            buckets.forEach((bucket, key) => {
                const [col, row] = key.split(":").map(Number);
                for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                    for (let colOffset = -1; colOffset <= 1; colOffset++) {
                        const neighbor = buckets.get(`${col + colOffset}:${row + rowOffset}`);
                        if (!neighbor) continue;

                        bucket.forEach(([idA, enemyA]) => {
                            neighbor.forEach(([idB, enemyB]) => {
                                if (idA === idB) return;
                                const pairKey = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
                                if (checkedPairs.has(pairKey)) return;
                                checkedPairs.add(pairKey);
                                if (metrics) metrics.separationChecks++;
                                if (this.separateEnemyPair(idA, enemyA, idB, enemyB, minDistance, minDistanceSq)) {
                                    if (metrics) metrics.separationResolutions++;
                                }
                            });
                        });
                    }
                }
            });
        }
    }

    private separateEnemyPair(
        idA: string,
        enemyA: EnemyState,
        idB: string,
        enemyB: EnemyState,
        minDistance: number,
        minDistanceSq: number,
    ): boolean {
        const footAx = enemyA.x;
        const footAy = enemyA.y + ENEMY_FOOT_Y_OFFSET;
        const footBx = enemyB.x;
        const footBy = enemyB.y + ENEMY_FOOT_Y_OFFSET;
        let dx = footBx - footAx;
        let dy = footBy - footAy;
        let distanceSq = dx * dx + dy * dy;
        if (distanceSq >= minDistanceSq) return false;

        if (distanceSq === 0) {
            dx = idA < idB ? 1 : -1;
            dy = 0;
            distanceSq = 1;
        }

        const distance = Math.sqrt(distanceSq);
        const push = (minDistance - distance) * 0.5;
        const nx = dx / distance;
        const ny = dy / distance;

        const nextAx = clamp(enemyA.x - nx * push, -ENEMY1_EDGE_OFFSET, WORLD_WIDTH + ENEMY1_EDGE_OFFSET);
        const nextAy = clamp(enemyA.y - ny * push, -ENEMY1_EDGE_OFFSET, WORLD_HEIGHT + ENEMY1_EDGE_OFFSET);
        const nextBx = clamp(enemyB.x + nx * push, -ENEMY1_EDGE_OFFSET, WORLD_WIDTH + ENEMY1_EDGE_OFFSET);
        const nextBy = clamp(enemyB.y + ny * push, -ENEMY1_EDGE_OFFSET, WORLD_HEIGHT + ENEMY1_EDGE_OFFSET);

        if (!this.collidesWithEnemyWorldFoot(nextAx, nextAy + ENEMY_FOOT_Y_OFFSET, ENEMY_FOOT_RADIUS)) {
            enemyA.x = nextAx;
            enemyA.y = nextAy;
        }
        if (!this.collidesWithEnemyWorldFoot(nextBx, nextBy + ENEMY_FOOT_Y_OFFSET, ENEMY_FOOT_RADIUS)) {
            enemyB.x = nextBx;
            enemyB.y = nextBy;
        }

        return true;
    }

    private resolveEnemyTargetForPlayer(playerId: string, player: PlayerState): Omit<EnemyTarget, "id" | "player" | "distanceSq"> | null {
        if (this.enemyTargetCache.has(playerId)) return this.enemyTargetCache.get(playerId) || null;

        const playerFootX = player.x;
        const playerFootY = player.y + PLAYER_TREE_Y_OFFSET;
        const targetCell = this.getNearestWalkableBuildCellToWorldPoint(
            this.worldToBuildCell(playerFootX, playerFootY),
            playerFootX,
            playerFootY,
            ENEMY_PATH_TARGET_SEARCH_RADIUS,
        );
        if (!targetCell) {
            this.enemyTargetCache.set(playerId, null);
            return null;
        }

        const targetCenter = this.buildCellCenter(targetCell);
        const resolvedTarget = {
            targetX: targetCenter.x,
            targetY: targetCenter.y - PLAYER_TREE_Y_OFFSET,
            targetFootX: targetCenter.x,
            targetFootY: targetCenter.y,
            targetCell,
        };
        this.enemyTargetCache.set(playerId, resolvedTarget);
        return resolvedTarget;
    }

    private findNearestAlivePlayer(x: number, y: number): EnemyTarget | null {
        return this.measureEnemySubphase("targeting", () => {
            this.incrementEnemyCounter("targetSearches");
            let nearest: EnemyTarget | null = null;

            this.state.players.forEach((player, id) => {
                this.incrementEnemyCounter("targetPlayerChecks");
                const sp = this.serverPlayers.get(id);
                if (!sp || !sp.alive || player.isDead) return;
                const resolvedTarget = this.resolveEnemyTargetForPlayer(id, player);
                if (!resolvedTarget) return;

                const dx = resolvedTarget.targetX - x;
                const dy = resolvedTarget.targetY - y;
                const target: EnemyTarget = {
                    id,
                    player,
                    ...resolvedTarget,
                    distanceSq: dx * dx + dy * dy,
                };
                if (!nearest || target.distanceSq < nearest.distanceSq) {
                    nearest = target;
                }
            });

            return nearest;
        });
    }

    // ─── Enemy bullets ────────────────────────────────────────────────────────
    private findNearestAlivePlayerExcluding(x: number, y: number, excludedId: string | null): EnemyTarget | null {
        if (!excludedId) return this.findNearestAlivePlayer(x, y);

        return this.measureEnemySubphase("targeting", () => {
            this.incrementEnemyCounter("targetSearches");
            let nearest: EnemyTarget | null = null;

            this.state.players.forEach((player, id) => {
                if (id === excludedId) return;
                this.incrementEnemyCounter("targetPlayerChecks");
                const sp = this.serverPlayers.get(id);
                if (!sp || !sp.alive || player.isDead) return;
                const resolvedTarget = this.resolveEnemyTargetForPlayer(id, player);
                if (!resolvedTarget) return;

                const dx = resolvedTarget.targetX - x;
                const dy = resolvedTarget.targetY - y;
                const target: EnemyTarget = {
                    id,
                    player,
                    ...resolvedTarget,
                    distanceSq: dx * dx + dy * dy,
                };
                if (!nearest || target.distanceSq < nearest.distanceSq) {
                    nearest = target;
                }
            });

            return nearest;
        });
    }

    private applyBoss1BombImpact(enemyId: string, bombId: string, x: number, y: number, radius: number, previousTargetId: string): void {
        this.broadcast("bossBombImpact", { id: bombId, enemyId, x, y, radius });
        if (this.state.gameOver) return;

        this.state.players.forEach((player, playerId) => {
            const sp = this.serverPlayers.get(playerId);
            if (!sp || !sp.alive || player.isDead) return;
            if (!circleOverlapsAabb(
                x,
                y,
                radius,
                player.x,
                this.playerHitboxCenterY(player.y),
                PLAYER_HW,
                PLAYER_HH,
            )) return;

            const hurt = this.damagePlayer(playerId, sp, player, BOSS1_BOMB_DAMAGE, enemyId);
            if (hurt) this.broadcast("playerHurt", hurt);
        });

        const boss = this.state.enemies.get(enemyId);
        const se = this.serverEnemies.get(enemyId);
        if (!boss || boss.isDead || !se || se.bossBombId !== bombId) return;

        se.bossBombId = null;
        se.bossBombX = 0;
        se.bossBombY = 0;
        se.bossBombRadius = BOSS1_BOMB_RADIUS;
        se.previousTargetId = previousTargetId;
        se.mode = "chase";
        se.modeMs = 0;
        boss.action = "run";
        const nextTarget = this.findNearestAlivePlayerExcluding(boss.x, boss.y, previousTargetId)
            || this.findNearestAlivePlayer(boss.x, boss.y);
        se.targetId = nextTarget?.id || null;
        if (nextTarget) {
            this.faceEnemyTowardPoint(boss, nextTarget.targetX, nextTarget.targetY);
        }
    }

    private applyEnemyAttackImpact(enemyId: string, attackToken: number, attackOrigin: AttackOrigin, vector: AttackVector) {
        if (this.state.gameOver || !this.state.enemies.has(enemyId)) return;
        const se = this.serverEnemies.get(enemyId);
        if (!se || se.mode !== "attack" || se.meleeAttackToken !== attackToken) return;

        const hitX = attackOrigin.x + vector.x * ENEMY1_ATTACK_HIT_OFFSET;
        const hitY = attackOrigin.y + vector.y * ENEMY1_ATTACK_HIT_OFFSET;

        this.state.players.forEach((player, playerId) => {
            const sp = this.serverPlayers.get(playerId);
            if (!sp || !sp.alive || player.isDead) return;

            if (!circleOverlapsAabb(hitX, hitY, ENEMY1_ATTACK_HIT_RADIUS, player.x, this.playerHitboxCenterY(player.y), PLAYER_HW, PLAYER_HH)) return;
            if (this.segmentOverlapsSolidMapTile(attackOrigin.x, attackOrigin.y, player.x, this.playerHitboxCenterY(player.y), 1, true)) {
                if (!this.findEnemyMeleeReachVector(attackOrigin, player)) return;
                this.incrementEnemyCounter("meleeCornerReachHits");
            }

            const hurt = this.damagePlayer(playerId, sp, player, ENEMY1_ATTACK_DAMAGE, enemyId);
            if (hurt) this.broadcast("playerHurt", hurt);
        });
    }

    private findEnemyMeleeReachVector(attackOrigin: AttackOrigin, player: PlayerState): AttackVector | null {
        const playerHitboxY = this.playerHitboxCenterY(player.y);

        const reachRadius = ENEMY1_PLAYER_ATTACK_RANGE + ENEMY1_ATTACK_TRIGGER_EPSILON;
        if (!circleOverlapsAabb(attackOrigin.x, attackOrigin.y, reachRadius, player.x, playerHitboxY, PLAYER_HW, PLAYER_HH)) {
            return null;
        }

        const sampleInsetX = Math.max(1, PLAYER_HW - 1);
        const sampleInsetY = Math.max(1, PLAYER_HH - 1);
        const samples = [
            { x: player.x, y: playerHitboxY },
            { x: player.x - sampleInsetX, y: playerHitboxY },
            { x: player.x + sampleInsetX, y: playerHitboxY },
            { x: player.x, y: playerHitboxY - sampleInsetY },
            { x: player.x, y: playerHitboxY + sampleInsetY },
            { x: player.x - sampleInsetX, y: playerHitboxY - sampleInsetY },
            { x: player.x + sampleInsetX, y: playerHitboxY - sampleInsetY },
            { x: player.x - sampleInsetX, y: playerHitboxY + sampleInsetY },
            { x: player.x + sampleInsetX, y: playerHitboxY + sampleInsetY },
        ];

        for (const sample of samples) {
            const dx = sample.x - attackOrigin.x;
            const dy = sample.y - attackOrigin.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= 0.0001) continue;
            const vector = { x: dx / distance, y: dy / distance };
            const hitX = attackOrigin.x + vector.x * ENEMY1_ATTACK_HIT_OFFSET;
            const hitY = attackOrigin.y + vector.y * ENEMY1_ATTACK_HIT_OFFSET;
            if (!circleOverlapsAabb(hitX, hitY, ENEMY1_ATTACK_HIT_RADIUS, player.x, playerHitboxY, PLAYER_HW, PLAYER_HH)) continue;
            if (this.segmentOverlapsLayer3Table(attackOrigin.x, attackOrigin.y, sample.x, sample.y, 1)) continue;
            if (!this.segmentOverlapsSolidMapTile(attackOrigin.x, attackOrigin.y, sample.x, sample.y, 1)) return vector;
        }
        return null;
    }

    private getEnemyAttackVector(attackOrigin: AttackOrigin, target: EnemyTarget, fallbackDirection: string): AttackVector {
        const dx = target.targetX - attackOrigin.x;
        const dy = target.targetY - attackOrigin.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0) return { x: dx / distance, y: dy / distance };
        return DIRECTION_VECTORS[fallbackDirection] || DIRECTION_VECTORS.S;
    }

    private getEnemyMeleeAttackVector(attackOrigin: AttackOrigin, target: EnemyTarget, fallbackDirection: string): AttackVector {
        const dx = target.player.x - attackOrigin.x;
        const dy = this.playerHitboxCenterY(target.player.y) - attackOrigin.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0) return { x: dx / distance, y: dy / distance };
        return DIRECTION_VECTORS[fallbackDirection] || DIRECTION_VECTORS.S;
    }

    private spawnEnemyBullet(x: number, y: number, power: number) {
        const id = nextId();
        const b  = new EnemyBulletState();
        b.id = id; b.x = x; b.y = y; b.power = power;
        this.state.enemyBullets.set(id, b);
        this.serverEnemyBullets.set(id, { vx: 0, vy: 200 * power * 0.5, kind: "bullet" });
    }

    private spawnCasterFireball(x: number, y: number, targetX: number, targetY: number) {
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.hypot(dx, dy);
        const vector = distance > 0
            ? { x: dx / distance, y: dy / distance }
            : DIRECTION_VECTORS.S;
        const id = nextId();
        const b = new EnemyBulletState();
        b.id = id;
        b.x = x;
        b.y = y;
        b.power = CASTER_FIREBALL_DAMAGE;
        b.kind = "fireball";
        b.angle = Math.atan2(vector.y, vector.x);
        this.state.enemyBullets.set(id, b);
        this.serverEnemyBullets.set(id, {
            vx: vector.x * CASTER_FIREBALL_SPEED,
            vy: vector.y * CASTER_FIREBALL_SPEED,
            kind: "fireball",
        });
    }

    private tickEnemyBullets(dtSec: number) {
        const dead: string[] = [];
        this.state.enemyBullets.forEach((b, id) => {
            const sb = this.serverEnemyBullets.get(id);
            if (!sb) { dead.push(id); return; }
            const prevX = b.x;
            const prevY = b.y;
            b.x += sb.vx * dtSec;
            b.y += sb.vy * dtSec;
            if (b.kind === "fireball" && this.segmentOverlapsSolidMapTile(prevX, prevY, b.x, b.y, Math.max(EB_HW, EB_HH))) {
                dead.push(id);
                return;
            }
            if (b.y > WORLD_HEIGHT + EB_HH || b.y < -EB_HH || b.x < -EB_HW || b.x > WORLD_WIDTH + EB_HW) dead.push(id);
        });
        dead.forEach(id => { this.state.enemyBullets.delete(id); this.serverEnemyBullets.delete(id); });
    }

    // ─── Collision detection (AABB) ───────────────────────────────────────────
    private tickCollisions() {
        const deadBullets:  string[] = [];
        const deadEnemies:  string[] = [];

        // Player bullets vs enemies
        this.state.playerBullets.forEach((bullet, bid) => {
            if (deadBullets.includes(bid)) return;
            if (bullet.kind === "arrow") return;
            this.state.enemies.forEach((enemy, eid) => {
                if (deadBullets.includes(bid) || deadEnemies.includes(eid)) return;
                if (enemy.isDead) return;
                if (overlaps(bullet.x, bullet.y, PB_HW, PB_HH, enemy.x, enemy.y, ENEMY_HW, ENEMY_HH)) {
                    this.awardPlayerKill(bullet.ownerId, enemy);
                    this.state.teamScore += 10;
                    deadBullets.push(bid);
                    enemy.health -= bullet.power;
                    if (enemy.health <= 0) deadEnemies.push(eid);
                }
            });
        });

        deadBullets.forEach(id => { this.state.playerBullets.delete(id); this.serverPlayerBullets.delete(id); });
        deadEnemies.forEach(id => {
            const enemy = this.state.enemies.get(id);
            if (enemy) this.killEnemy(id, enemy);
        });

        // Enemy bullets vs players. Enemy body/attack damage is disabled for now.
        this.state.players.forEach((player, sid) => {
            const sp = this.serverPlayers.get(sid);
            if (!sp || !sp.alive) return;

            const deadEB: string[] = [];

            this.state.enemyBullets.forEach((bullet, bid) => {
                if (!sp.alive || deadEB.includes(bid)) return;
                if (overlaps(player.x, this.playerHitboxCenterY(player.y), PLAYER_HW, PLAYER_HH, bullet.x, bullet.y, EB_HW, EB_HH)) {
                    deadEB.push(bid);
                    const hurt = this.damagePlayer(sid, sp, player, bullet.power || ENEMY1_ATTACK_DAMAGE, bid);
                    if (hurt) this.broadcast("playerHurt", hurt);
                }
            });

            deadEB.forEach(id => { this.state.enemyBullets.delete(id); this.serverEnemyBullets.delete(id); });
        });
    }

    // ─── Player death ─────────────────────────────────────────────────────────
    private triggerPlayerDamageFlash(player: PlayerState, durationMs: number, blinkMs: number = PLAYER_DAMAGE_FLASH_BLINK_MS) {
        player.damageFlashSeq++;
        player.damageFlashDurationMs = durationMs;
        player.damageFlashBlinkMs = blinkMs;
    }

    private findShieldAbsorberForPlayer(targetId: string, target: PlayerState): { id: string; sp: ServerPlayer; player: PlayerState } | null {
        const ownSp = this.serverPlayers.get(targetId);
        if (ownSp && this.canPlayerShieldAbsorb(target, ownSp)) {
            return { id: targetId, sp: ownSp, player: target };
        }

        let closestAbsorber: { id: string; sp: ServerPlayer; player: PlayerState; distanceSq: number } | null = null;
        const targetHitboxY = this.playerHitboxCenterY(target.y);
        this.state.players.forEach((candidate, candidateId) => {
            if (candidateId === targetId) return;
            const candidateSp = this.serverPlayers.get(candidateId);
            if (!candidateSp || !this.canPlayerShieldAbsorb(candidate, candidateSp)) return;

            const radius = this.getPlayerShieldBlockRadius(candidate);
            if (!circleOverlapsAabb(candidate.x, this.playerHitboxCenterY(candidate.y), radius, target.x, targetHitboxY, PLAYER_HW, PLAYER_HH)) return;

            const dx = candidate.x - target.x;
            const dy = this.playerHitboxCenterY(candidate.y) - targetHitboxY;
            const distanceSq = dx * dx + dy * dy;
            if (!closestAbsorber || distanceSq < closestAbsorber.distanceSq) {
                closestAbsorber = { id: candidateId, sp: candidateSp, player: candidate, distanceSq };
            }
        });

        return closestAbsorber;
    }

    private canPlayerShieldAbsorb(player: PlayerState, sp: ServerPlayer): boolean {
        if (!sp.alive || player.isDead || !player.shieldBlocking || !this.isShieldItem(player.activeItem)) return false;
        this.normalizeHotbar(player);
        const shieldIndex = player.activeSlot - 1;
        return shieldIndex >= 0
            && shieldIndex < HOTBAR_SLOT_COUNT
            && Math.max(0, Math.floor(player.hotbarShieldHp[shieldIndex] || 0)) > 0;
    }

    private absorbDamageWithShield(
        absorberId: string,
        absorberSp: ServerPlayer,
        absorber: PlayerState,
        damage: number,
        attackerId: string,
    ): number {
        this.normalizeHotbar(absorber);
        const shieldIndex = absorber.activeSlot - 1;
        if (shieldIndex < 0 || shieldIndex >= HOTBAR_SLOT_COUNT) return damage;

        const shieldHp = Math.max(0, Math.floor(absorber.hotbarShieldHp[shieldIndex] || 0));
        if (shieldHp <= 0) {
            absorber.shieldBlocking = false;
            return damage;
        }

        const absorbed = Math.min(shieldHp, damage);
        const nextShieldHp = shieldHp - absorbed;
        absorber.hotbarShieldHp[shieldIndex] = nextShieldHp;
        this.broadcast("shieldBlock", {
            playerId: absorberId,
            attackerId,
            x: absorber.x,
            y: absorber.y,
            absorbed,
            shieldHp: nextShieldHp,
            shieldMaxHp: absorber.hotbarShieldMaxHp[shieldIndex] || 0,
        });

        if (nextShieldHp <= 0) {
            absorber.shieldBlocking = false;
            absorberSp.shieldBlockCooldownMs = SHIELD_BLOCK_BREAK_COOLDOWN_MS;
            absorber.shieldBlockCooldownProgress = 1;
            this.broadcast("shieldBreak", {
                playerId: absorberId,
                attackerId,
                x: absorber.x,
                y: absorber.y,
            });
        }

        return damage - absorbed;
    }

    private damagePlayer(sid: string, sp: ServerPlayer, player: PlayerState, damage: number, attackerId: string): PlayerHurtPayload | null {
        if (!sp.alive || player.isDead || damage <= 0) return null;
        if (this.elapsedMs < sp.invulnerableUntilMs) return null;

        let remainingDamage = Math.max(0, Math.floor(damage));
        const absorber = this.findShieldAbsorberForPlayer(sid, player);
        if (absorber) {
            remainingDamage = this.absorbDamageWithShield(absorber.id, absorber.sp, absorber.player, remainingDamage, attackerId);
        }

        if (remainingDamage <= 0) return null;

        player.health = Math.max(0, player.health - remainingDamage);
        sp.invulnerableUntilMs = this.elapsedMs + PLAYER_HIT_INVULNERABILITY_MS;
        this.triggerPlayerDamageFlash(player, PLAYER_DAMAGE_FLASH_MS);
        const payload = {
            playerId: sid,
            attackerId,
            x: player.x,
            y: player.y,
            health: player.health,
        };

        if (player.health <= 0) {
            this.killPlayer(sid, sp, player);
        }

        return payload;
    }

    private killPlayer(sid: string, sp: ServerPlayer, player: PlayerState) {
        if (!sp.alive) return;
        sp.alive   = false;
        sp.vx = 0;
        sp.vy = 0;
        sp.dashMs = 0;
        sp.dashDirX = 0;
        sp.dashDirY = 0;
        sp.dashCooldownMs = 0;
        sp.invulnerableUntilMs = 0;
        this.clearBowCharge(player, sp);
        this.clearBowVolley(sp);
        sp.bowVolleyCooldownMs = 0;
        this.clearAxeWhirlwindState(player, sp);
        sp.shieldBlockCooldownMs = 0;
        player.shieldBlocking = false;
        player.shieldBlockCooldownProgress = 0;
        sp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
        player.isDead = true;
        player.health = 0;
        player.reviveProgress = 0;
        player.axeAttackHitboxActive = false;
        player.dashing = false;
        player.dashCooldownProgress = 0;
        player.bowVolleyCooldownProgress = 0;
        player.axeWhirlwindHitSeq = 0;
        player.axeWhirlwindProgress = 0;
        this.cancelRevive(sid);
        this.checkAllDead();
    }

    private checkAllDead() {
        if (this.state.gameOver) return;
        if (this.state.players.size === 0) return;
        const anyAlive = [...this.serverPlayers.values()].some(sp => sp.alive);
        if (!anyAlive) this.startGameOverCountdown();
    }

    private startGameOverCountdown() {
        this.logRoomEvent("game over", {
            players: this.state.players.size,
            elapsedSeconds: this.state.elapsedSeconds,
            wave: this.currentWaveIndex + 1,
            score: this.state.teamScore,
            enemies: this.state.enemies.size,
            queuedEnemies: this.pendingEnemySpawns.length,
            playerBullets: this.state.playerBullets.size,
            enemyBullets: this.state.enemyBullets.size,
        });
        this.state.gameOver = true;
        this.activeAxeAttacks = [];
        this.gameOverRetryReadyPlayerIds.clear();
        this.updateGameOverRetryReadyState();
        this.gameOverRestartMs = GAME_OVER_RESTART_SECONDS * 1000;
        this.state.gameOverCountdown = GAME_OVER_RESTART_SECONDS;
        this.updateRoomListingMetadata();
        this.serverPlayers.forEach((sp) => {
            sp.vx = 0;
            sp.vy = 0;
            sp.bowCharging = false;
            sp.bowChargeMs = 0;
            sp.bowChargeMoveLeft = false;
            sp.bowChargeMoveRight = false;
            sp.bowChargeMoveUp = false;
            sp.bowChargeMoveDown = false;
            sp.bowVolleyActive = false;
            sp.bowVolleyLockX = 0;
            sp.bowVolleyLockY = 0;
            sp.bowVolleyTargetX = 0;
            sp.bowVolleyTargetY = 0;
            sp.bowVolleyCooldownMs = 0;
            sp.dashMs = 0;
            sp.dashDirX = 0;
            sp.dashDirY = 0;
            sp.dashCooldownMs = 0;
            sp.axeWhirlwind = false;
            sp.axeWhirlwindTickMs = 0;
            sp.axeWhirlwindElapsedMs = 0;
            sp.axeWhirlwindCooldownMs = 0;
            sp.shieldBlockCooldownMs = 0;
            sp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
            sp.revivingTargetId = null;
            sp.invulnerableUntilMs = 0;
        });
        this.state.players.forEach((player) => {
            player.axeAttackHitboxActive = false;
            player.dashing = false;
            player.dashCooldownProgress = 0;
            player.axeWhirlwind = false;
            player.axeWhirlwindProgress = 0;
            player.axeWhirlwindCooldownProgress = 0;
            player.shieldBlocking = false;
            player.shieldBlockCooldownProgress = 0;
            player.axeWhirlwindHitSeq = 0;
            player.bowCharging = false;
            player.bowChargeProgress = 0;
            player.bowVolleyCooldownProgress = 0;
        });
    }
}
