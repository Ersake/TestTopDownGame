import { Room, Client } from "colyseus";
import {
    GameRoomState,
    PlayerState,
    EnemyState,
    PlayerBulletState,
    EnemyBulletState,
    TreeState,
    LogState,
    WoodBlockState,
    CampfireState,
    MapChunkState,
} from "../schema/GameState";
import { MapStorage, normalizeMapName, StoredMapDocument } from "../maps/MapStorage";

// ─── Physics constants (mirror the Phaser client values) ──────────────────────
const PLAYER_MAX_VEL  = 255;   // px/s
const PLAYER_MAX_HEALTH = 5;
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
const TREE_COUNT = 25;
const TREE_GRID_COLS = 5;
const TREE_GRID_ROWS = 5;
const TREE_EDGE_PADDING = 192;
const TREE_SPAWN_CLEAR_RADIUS = 300;
const TREE_TRUNK_Y_OFFSET = -18;

// Half-extents used for AABB collision detection
const PLAYER_HW  = 17;  const PLAYER_HH  = 17;
const ENEMY_HW   = 28;  const ENEMY_HH   = 28;
const PB_HW      = 6;   const PB_HH      = 16;  // player bullet
const EB_HW      = 8;   const EB_HH      = 12;  // enemy bullet
const PLAYER_TREE_FOOT_RADIUS = 5;
const PLAYER_TREE_Y_OFFSET = 36;
const PLAYER_BULLET_Y_OFFSET = 56;
const TREE_TRUNK_HW = 5;
const TREE_TRUNK_HH = 18;
const MAX_PLAYER_MOVE_STEP = 3;
const ATTACK_LOCK_MS = 350;
const ATTACK_COOLDOWN_MS = 850;
const TREE_ATTACK_IMPACT_DELAY_MS = 100;
const ENEMY_ATTACK_IMPACT_DELAY_MS = 100;
const BOW_CHARGE_MS = 1000;
const ARROW_SPEED = 900;
const ARROW_RANGE = 1200;
const ARROW_DAMAGE = 1;
const TREE_HEALTH = 4;
const WOOD_PILE_AMOUNT = 5;
const WOOD_PICKUP_RADIUS = 80;
const BUILD_GRID_SIZE = BASE_TILE_SIZE * TILE_WORLD_SCALE;
const BUILD_BLOCK_HALF_SIZE = BUILD_GRID_SIZE / 2;
const BUILD_BLOCK_COST = 1;
const BUILD_RANGE = 192;
const WOOD_BLOCK_HEALTH = 5;
const FIRST_LEVEL_UP_KILLS = 5;
const REVIVE_DURATION_MS = 2500;
const REVIVE_RADIUS = 64;
const REVIVE_HEALTH = 3;
const ATTACK_HIT_RADIUS = 44;
const ATTACK_HIT_START_OFFSET = 10;
const ATTACK_HIT_END_OFFSET = 40;
const ATTACK_HIT_ORIGIN_Y_OFFSET = 18;
const ATTACK_TARGET_MIN_DISTANCE = 4;
const LOG_WORLD_PADDING = 16;
const ENEMY_WAVE_INTERVAL_MS = 60000;
const ENEMY_WAVE_SPAWN_WINDOW_MS = 10000;
const DEBUG_MAX_ROUND = 99;
const MAX_ACTIVE_ENEMIES = 100;
const MAX_ENEMY_SPAWNS_PER_TICK = 2;
const ENEMY_DIAGNOSTIC_INTERVAL_MS = 5000;
const ENABLE_ENEMY_DIAGNOSTICS = process.env.NODE_ENV !== "production";
const INITIAL_MELEE_WAVE_COUNT = 3;
const MELEE_PER_MINUTE = 5;
const DARK_KNIGHT_WAVE_INTERVAL_MINUTES = 3;
const ENEMY_TYPE_CASTER = 3;
const ENEMY_TYPE_DARK_KNIGHT = 4;
const MIN_BOW_CHARGE_MS = 100;
const BASE_CASTER_CAST_RANGE = 360;
const CASTER_CAST_RANGE = BASE_CASTER_CAST_RANGE;
const CASTER_CHARGE_MS = 1000 / 1.25;
const CASTER_ATTACK_MS = 500;
const CASTER_FIREBALL_SPEED = 225;
const CASTER_FIREBALL_DAMAGE = 1;
const DARK_KNIGHT_HEALTH = 10;
const DARK_KNIGHT_DETECTION_RANGE = BASE_CASTER_CAST_RANGE;
const DARK_KNIGHT_WALK_SPEED = 88;
const DARK_KNIGHT_RUSH_SPEED = 230;
const DARK_KNIGHT_MIN_RUSH_MS = 500;
const DARK_KNIGHT_MARK_REACH_RADIUS = 12;
const DARK_KNIGHT_WOOD_REACH_RANGE = 14;
const DARK_KNIGHT_ATTACK_MS = 900;
const DARK_KNIGHT_ATTACK_IMPACT_DELAY_MS = 600;
const DARK_KNIGHT_COOLDOWN_MS = 1560;
const DARK_KNIGHT_AOE_RADIUS = 88;
const DARK_KNIGHT_ATTACK_DAMAGE = 2;
const ENEMY1_SPEED = 114.75;
const ENEMY1_ATTACK_RANGE = 20;
const ENEMY1_PLAYER_ATTACK_RANGE = 72;
const ENEMY1_ATTACK_TRIGGER_EPSILON = 6;
const ENEMY1_MIN_CHASE_STEP = 1;
const ENEMY1_WINDUP_MS = 175;
const ENEMY1_ATTACK_MS = 850;
const ENEMY_DEATH_REMOVE_MS = 850;
const ENEMY_HIT_STUN_MS = 250;
const ENEMY1_EDGE_OFFSET = 96;
const ENEMY1_DAMAGE_IMPACT_DELAY_MS = 450;
const ENEMY1_ATTACK_DAMAGE = 1;
const ENEMY1_ATTACK_HIT_OFFSET = 28;
const ENEMY1_ATTACK_HIT_HW = 42;
const ENEMY1_ATTACK_HIT_HH = 36;
const ENEMY_ATTACK_WOOD_BLOCK_PADDING = 2;
const ENEMY_WOOD_BLOCK_ATTACK_DAMAGE = 1;
const ENEMY_MELEE_HIT_HW = 34;
const ENEMY_MELEE_HIT_HH = 44;
const ENEMY_FOOT_RADIUS = 7;
const ENEMY_FOOT_Y_OFFSET = 34;
const ENEMY_SEPARATION_ITERATIONS = 2;
const ENEMY_PATH_REFRESH_MS = 1500;
const ENEMY_PATH_WAYPOINT_RADIUS = 12;
const ENEMY_PATH_TARGET_REFRESH_CELLS = 2;
const ENEMY_PATH_MAX_VISITED_CELLS = 2000;
const GAME_OVER_RESTART_SECONDS = 10;
const ITEM_WOOD_AXE = "wood_axe";
const ITEM_WOOD_BOW = "wood_bow";
const ITEM_HAMMER = "hammer";
const ITEM_CAMPFIRE = "campfire";
const ITEM_WOOD = "wood";
const HOTBAR_SLOT_COUNT = 9;
const OUTFIT_COLOR_COUNT = 5;
const EMPTY_HOTBAR_ITEM = "";
const EMPTY_HOTBAR_COUNT = 0;
const WOOD_STACK_MAX = 99;
const WOOD_BLOCK_REPAIR_AMOUNT = 1;
const CAMPFIRE_HEAL_RADIUS = 320;
const CAMPFIRE_HEAL_INTERVAL_MS = 10000;
const CAMPFIRE_HEAL_AMOUNT = 1;
const UPGRADE_IDS = new Set([
    "axe_swing_speed",
    "axe_tree_damage",
    "axe_enemy_damage",
    "bow_damage",
    "bow_pierce",
    "bow_charge_time",
    "hammer_barricade_hp",
    "hammer_wood_gather",
    "hammer_campfire",
]);
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
const GREEN_TILE_REGIONS = [
    { x: 0, y: 4, width: 7, height: 2 }, // Floor/Grass
    { x: 0, y: 6, width: 8, height: 2 }, // Grass variants
    { x: 0, y: 8, width: 8, height: 2 }, // Garden/ground variants
    { x: 0, y: 10, width: 8, height: 2 }, // Garden/ground variants
];
const GREEN_MAP_FRAMES = new Set<number>();
for (const region of GREEN_TILE_REGIONS) {
    for (let row = region.y; row < region.y + region.height; row++) {
        for (let col = region.x; col < region.x + region.width; col++) {
            GREEN_MAP_FRAMES.add(row * 32 + col);
        }
    }
}

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

function pointAabbDistanceSq(px: number, py: number,
                             bx: number, by: number, bhw: number, bhh: number): number {
    const closestX = clamp(px, bx - bhw, bx + bhw);
    const closestY = clamp(py, by - bhh, by + bhh);
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy;
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

function capsuleOverlapsAabb(ax: number, ay: number, bx: number, by: number, radius: number,
                             rectX: number, rectY: number, rectHw: number, rectHh: number): boolean {
    const closestCenterX = clamp((ax + bx) * 0.5, rectX - rectHw, rectX + rectHw);
    const closestCenterY = clamp((ay + by) * 0.5, rectY - rectHh, rectY + rectHh);

    const candidates: [number, number][] = [
        [closestCenterX, closestCenterY],
        [rectX - rectHw, rectY - rectHh],
        [rectX + rectHw, rectY - rectHh],
        [rectX - rectHw, rectY + rectHh],
        [rectX + rectHw, rectY + rectHh],
    ];

    const radiusSq = radius * radius;
    return candidates.some(([x, y]) => pointSegmentDistanceSq(x, y, ax, ay, bx, by) <= radiusSq);
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
    bowCharging: boolean;
    bowChargeMs: number;
    bowChargeX: number;
    bowChargeY: number;
    bowAimX: number;
    bowAimY: number;
    revivingTargetId: string | null;
    input: { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean; interact: boolean };
    alive: boolean;
}
type EnemyMode = "chase" | "windup" | "attack" | "casterCharge" | "casterAttack" | "woodWindup" | "woodAttack" | "dkWalk" | "dkRush" | "dkAttack" | "dkCooldown" | "stun";
type DarkKnightTargetKind = "playerMark" | "woodBlock" | null;
interface PathCell { col: number; row: number; }
interface ServerEnemy {
    mode: EnemyMode;
    modeMs: number;
    targetId: string | null;
    targetWoodBlockId: string | null;
    darkKnightTargetKind: DarkKnightTargetKind;
    darkKnightMarkX: number;
    darkKnightMarkY: number;
    pathRefreshMs: number;
    pathTargetCell: PathCell | null;
    path: PathCell[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _id = 0;
const nextId  = () => String(++_id);
const rndInt  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndReal = (min: number, max: number) => Math.random() * (max - min) + min;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
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

export class ShmupRoom extends Room<GameRoomState> {
    maxClients = 8;

    private serverPlayers       = new Map<string, ServerPlayer>();
    private serverEnemies       = new Map<string, ServerEnemy>();
    private serverPlayerBullets = new Map<string, ServerBullet>();
    private serverEnemyBullets  = new Map<string, ServerEnemyBullet>();
    private serverTreeHealth    = new Map<string, number>();
    private elapsedMs           = 0;
    private lastScheduledEnemyWaveMinute = -1;
    private pendingEnemySpawns: PendingEnemySpawn[] = [];
    private nextEnemyDiagnosticAtMs = 0;
    private campfireHealElapsedMs = 0;
    private gameOverRestartMs   = 0;
    private mapTiles = new Map<string, { layer1: Uint16Array; layer2: Uint16Array }>();
    private mapTileCount = 0;
    private readonly mapStorage = new MapStorage();

    private generateRoomCode(): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let code: string;
        do {
            code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 26)]).join("");
        } while (_usedCodes.has(code));
        _usedCodes.add(code);
        return code;
    }

    async onCreate(options: { mode?: unknown; mapName?: unknown } = {}) {
        this.roomId = this.generateRoomCode();
        const state = new GameRoomState();
        const mapEditorRequested = options.mode === MAP_EDITOR_MODE;
        const isMapEditor = mapEditorRequested && process.env.NODE_ENV !== "production";
        const requestedMapName = !isMapEditor && process.env.NODE_ENV !== "production"
            ? normalizeMapName(options.mapName)
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
                const woodPickupAmount = this.tryPickupWood(client.sessionId);
                if (woodPickupAmount > 0) {
                    client.send("woodPickup", { amount: woodPickupAmount });
                }
            }
        });

        this.onMessage("attack", (client, data) => {
            const sp = this.serverPlayers.get(client.sessionId);
            const player = this.state.players.get(client.sessionId);
            if (!sp || !sp.alive || !player || this.state.gameOver) return;
            if (sp.attackCooldownMs > 0) return;
            if (player.activeItem !== ITEM_WOOD_AXE) return;
            this.cancelRevive(client.sessionId);

            const attackDirection = normalizeAttackDirection(data?.direction, player.facingDirection || "N");
            const attackItem = ITEM_WOOD_AXE;
            player.facingDirection = attackDirection;
            player.attackDirection = attackDirection;
            player.attackItem = attackItem;
            player.attackSeq++;
            sp.attackLockMs = ATTACK_LOCK_MS;
            sp.attackLockX = player.x;
            sp.attackLockY = player.y;
            sp.attackCooldownMs = this.getPlayerAxeCooldownMs(player);
            sp.vx = 0;
            sp.vy = 0;
            const attackOrigin = { x: player.x, y: player.y };
            const targetX = data?.targetX;
            const targetY = data?.targetY;

            setTimeout(() => {
                this.applyDelayedTreeAttackImpact(client.sessionId, attackOrigin, attackDirection, targetX, targetY);
            }, TREE_ATTACK_IMPACT_DELAY_MS);
            setTimeout(() => {
            this.applyDelayedEnemyAttackImpact(client.sessionId, attackOrigin, attackDirection, targetX, targetY);
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
            if (sp && player) this.clearBowCharge(player, sp);
        });

        this.onMessage("equipSlot", (client, data) => {
            this.equipPlayerSlot(client.sessionId, data);
        });

        this.onMessage("buildWoodBlock", (client, data) => {
            this.tryBuildWoodBlock(client.sessionId, data);
        });

        this.onMessage("removeWoodBlock", (client, data) => {
            this.tryRemoveWoodBlock(client.sessionId, data);
        });

        this.onMessage("repairWoodBlock", (client, data) => {
            this.tryRepairWoodBlock(client.sessionId, data);
        });

        this.onMessage("placeCampfire", (client, data) => {
            this.tryPlaceCampfire(client.sessionId, data);
        });

        this.onMessage("selectUpgrade", (client, data) => {
            this.selectUpgrade(client.sessionId, data);
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

        if (process.env.NODE_ENV !== "production") {
            this.onMessage("debugSetRound", (client, data) => {
                this.debugSetRound(client, data);
            });
        }
    }

    private debugSetRound(client: Client, data: unknown) {
        const round = Number((data as { round?: unknown })?.round);
        const currentRound = Math.floor(this.elapsedMs / ENEMY_WAVE_INTERVAL_MS) + 1;
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

        const targetMinute = round - 1;
        this.elapsedMs = targetMinute * ENEMY_WAVE_INTERVAL_MS;
        this.state.elapsedSeconds = Math.floor(this.elapsedMs / 1000);
        this.state.enemies.clear();
        this.serverEnemies.clear();
        this.state.enemyBullets.clear();
        this.serverEnemyBullets.clear();
        this.pendingEnemySpawns = [];
        this.lastScheduledEnemyWaveMinute = targetMinute - 1;
        this.nextEnemyDiagnosticAtMs = 0;
        this.scheduleEnemyWave(targetMinute);
        client.send("debugRoundResult", { accepted: true, round });
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

    private isGreenMapFrame(frame: number): boolean {
        return GREEN_MAP_FRAMES.has(frame);
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

    private isGreenMapTileAtWorldPoint(x: number, y: number): boolean {
        const frame = this.getTopMapFrameAtWorldPoint(x, y);
        return frame !== null && this.isGreenMapFrame(frame);
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
        if (this.isSolidMapFrame(frame) && this.mapCellOverlapsPlayer(col, row)) return;

        const chunkCol = Math.floor(col / MAP_CHUNK_SIZE);
        const chunkRow = Math.floor(row / MAP_CHUNK_SIZE);
        const cells = this.getMapChunkCells(chunkCol, chunkRow, layer, true)!;
        const index = (row % MAP_CHUNK_SIZE) * MAP_CHUNK_SIZE + (col % MAP_CHUNK_SIZE);
        cells[index] = nextValue;
        if (previousValue === 0) this.mapTileCount++;
        this.syncMapChunk(chunkCol, chunkRow);
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
    }

    private exportMapChunks(): Array<{ key: string; layer1: string; layer2: string }> {
        return [...this.mapTiles.entries()].map(([key, chunk]) => ({
            key,
            layer1: this.encodeMapChunk(chunk.layer1),
            layer2: this.encodeMapChunk(chunk.layer2),
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
        this.relocatePlayersFromSolidMapTiles();
        return { accepted: true, trimmed };
    }

    private replaceMap(data: unknown): boolean {
        const chunks = (data as { chunks?: unknown })?.chunks;
        return Array.isArray(chunks) && this.applyMapChunks(chunks).accepted;
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
        try {
            const document = await this.mapStorage.load(name) as Partial<StoredMapDocument>;
            if (
                !this.isStoredMapDocument(document, name)
                || !this.canLoadDocumentIntoCurrentRoom(document)
                || !this.applyMapChunks(document.chunks, true, {
                    width: document.width,
                    height: document.height,
                    tileSize: this.getSavedMapTileSize(document),
                }).accepted
            ) {
                throw new Error(`Saved map '${name}' is invalid or incompatible.`);
            }
            this.state.activeMapName = name;
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
                ? this.applyMapChunks(document.chunks, true, {
                    width: document.width,
                    height: document.height,
                    tileSize: this.getSavedMapTileSize(document),
                })
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

    private mapCellOverlapsPlayer(col: number, row: number): boolean {
        const x = col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5;
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
                MAP_TILE_SIZE * 0.5,
                MAP_TILE_SIZE * 0.5,
            );
        });
        return overlapsPlayer;
    }

    private collidesWithMapTiles(playerX: number, playerY: number): boolean {
        const footX = playerX;
        const footY = playerY + PLAYER_TREE_Y_OFFSET;
        const startCol = Math.floor((footX - PLAYER_TREE_FOOT_RADIUS) / MAP_TILE_SIZE);
        const endCol = Math.floor((footX + PLAYER_TREE_FOOT_RADIUS) / MAP_TILE_SIZE);
        const startRow = Math.floor((footY - PLAYER_TREE_FOOT_RADIUS) / MAP_TILE_SIZE);
        const endRow = Math.floor((footY + PLAYER_TREE_FOOT_RADIUS) / MAP_TILE_SIZE);
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                for (const layer of [1, 2] as const) {
                    const value = this.getMapTileValue(col, row, layer);
                    if (value > 0 && this.isSolidMapFrame(value - 1)) return true;
                }
            }
        }
        return false;
    }

    private mapSolidOverlapsAabb(x: number, y: number, halfWidth: number, halfHeight: number): boolean {
        const startCol = Math.floor((x - halfWidth) / MAP_TILE_SIZE);
        const endCol = Math.floor((x + halfWidth) / MAP_TILE_SIZE);
        const startRow = Math.floor((y - halfHeight) / MAP_TILE_SIZE);
        const endRow = Math.floor((y + halfHeight) / MAP_TILE_SIZE);
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                for (const layer of [1, 2] as const) {
                    const value = this.getMapTileValue(col, row, layer);
                    if (value > 0 && this.isSolidMapFrame(value - 1)) return true;
                }
            }
        }
        return false;
    }

    private treeOverlapsSolidMapTile(x: number, y: number): boolean {
        return this.mapSolidOverlapsAabb(
            x,
            y + TREE_TRUNK_Y_OFFSET,
            TREE_TRUNK_HW,
            TREE_TRUNK_HH,
        );
    }

    private relocatePlayersFromSolidMapTiles(): void {
        this.state.players.forEach((player) => {
            if (!this.collidesWithMapTiles(player.x, player.y)) return;
            const position = this.findNearestOpenPlayerPosition(player.x, player.y);
            player.x = position.x;
            player.y = position.y;
        });
    }

    private findNearestOpenPlayerPosition(originX: number, originY: number): { x: number; y: number } {
        const clampedOriginX = clamp(originX, PLAYER_HW, this.playableWorldWidth() - PLAYER_HW);
        const clampedOriginY = clamp(originY, PLAYER_HH, this.playableWorldHeight() - PLAYER_HH);
        if (!this.collidesWithMapTiles(clampedOriginX, clampedOriginY)) return { x: clampedOriginX, y: clampedOriginY };

        const originCol = Math.floor(clampedOriginX / MAP_TILE_SIZE);
        const originRow = Math.floor((clampedOriginY + PLAYER_TREE_Y_OFFSET) / MAP_TILE_SIZE);
        for (let radius = 1; radius <= 128; radius++) {
            for (let row = originRow - radius; row <= originRow + radius; row++) {
                for (let col = originCol - radius; col <= originCol + radius; col++) {
                    if (Math.max(Math.abs(col - originCol), Math.abs(row - originRow)) !== radius || !this.isMapCellInside(col, row)) continue;
                    const x = clamp(col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5, PLAYER_HW, this.playableWorldWidth() - PLAYER_HW);
                    const y = clamp(row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5 - PLAYER_TREE_Y_OFFSET, PLAYER_HH, this.playableWorldHeight() - PLAYER_HH);
                    if (!this.collidesWithMapTiles(x, y)) return { x, y };
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

        player.activeSlot = slot;
        player.activeItem = this.getHotbarItem(player, slot);
        if (player.activeItem !== ITEM_WOOD_BOW) {
            this.clearBowCharge(player, sp);
        }
    }

    private setPlayerOutfitColor(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const outfitColor = Number((data as { outfitColor?: unknown })?.outfitColor);
        if (!player || !Number.isInteger(outfitColor) || outfitColor < 0 || outfitColor >= OUTFIT_COLOR_COUNT) return;

        player.outfitColor = outfitColor;
    }

    private selectUpgrade(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        if (!player || this.state.gameOver) return;

        const upgradeId = String((data as { upgradeId?: unknown })?.upgradeId || "");
        if (!UPGRADE_IDS.has(upgradeId) || player.pendingUpgradeChoices <= 0) return;

        switch (upgradeId) {
            case "axe_swing_speed":
                player.axeSwingSpeedUpgrades++;
                break;
            case "axe_tree_damage":
                player.axeTreeDamageUpgrades++;
                break;
            case "axe_enemy_damage":
                player.axeEnemyDamageUpgrades++;
                break;
            case "bow_damage":
                player.bowDamageUpgrades++;
                break;
            case "bow_pierce":
                player.bowPierceUpgrades++;
                break;
            case "bow_charge_time":
                player.bowChargeTimeUpgrades++;
                break;
            case "hammer_barricade_hp":
                player.barricadeHealthUpgrades++;
                break;
            case "hammer_wood_gather":
                player.woodGatherUpgrades++;
                break;
            case "hammer_campfire":
                player.campfireUpgrades++;
                this.grantCampfireItem(player);
                break;
            default:
                return;
        }

        player.pendingUpgradeChoices = Math.max(0, player.pendingUpgradeChoices - 1);
    }

    private initializeHotbar(player: PlayerState) {
        player.hotbarItems.clear();
        player.hotbarCounts.clear();
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
        player.activeSlot = 1;
        player.activeItem = ITEM_WOOD_AXE;
        player.attackItem = ITEM_WOOD_AXE;
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
        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            if (!player.hotbarItems[i]) player.hotbarCounts[i] = EMPTY_HOTBAR_COUNT;
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
        const maxCount = item === ITEM_WOOD ? WOOD_STACK_MAX : Number.MAX_SAFE_INTEGER;
        player.hotbarCounts[slot - 1] = item ? clamp(Math.floor(count), 0, maxCount) : EMPTY_HOTBAR_COUNT;
        if (player.activeSlot === slot) {
            player.activeItem = item;
        }
    }

    private findFirstEmptyHotbarSlot(player: PlayerState): number {
        this.normalizeHotbar(player);
        const emptyIndex = player.hotbarItems.findIndex((item) => !item);
        return emptyIndex < 0 ? 0 : emptyIndex + 1;
    }

    private addWoodToHotbar(player: PlayerState, count: number): boolean {
        this.normalizeHotbar(player);
        let remaining = Math.max(0, Math.floor(count));
        if (remaining <= 0) return false;

        let capacity = 0;
        for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
            if (player.hotbarItems[i] === ITEM_WOOD) {
                capacity += WOOD_STACK_MAX - clamp(Math.floor(player.hotbarCounts[i] || 0), 0, WOOD_STACK_MAX);
            } else if (!player.hotbarItems[i]) {
                capacity += WOOD_STACK_MAX;
            }
        }
        if (capacity < remaining) return false;

        for (let i = 0; i < HOTBAR_SLOT_COUNT && remaining > 0; i++) {
            if (player.hotbarItems[i] !== ITEM_WOOD) continue;
            const current = clamp(Math.floor(player.hotbarCounts[i] || 0), 0, WOOD_STACK_MAX);
            const room = WOOD_STACK_MAX - current;
            if (room <= 0) continue;
            const added = Math.min(room, remaining);
            player.hotbarCounts[i] = current + added;
            remaining -= added;
        }

        while (remaining > 0) {
            const slot = this.findFirstEmptyHotbarSlot(player);
            if (slot <= 0) return false;
            const added = Math.min(WOOD_STACK_MAX, remaining);
            this.setHotbarSlot(player, slot, ITEM_WOOD, added);
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

    private getTotalHeldWood(player: PlayerState): number {
        this.normalizeHotbar(player);
        return player.hotbarItems.reduce((total, item, index) => {
            return item === ITEM_WOOD ? total + Math.max(0, Math.floor(player.hotbarCounts[index] || 0)) : total;
        }, 0);
    }

    private grantCampfireItem(player: PlayerState) {
        player.pendingCampfireCharges++;
        this.fillPendingCampfireItems(player);
    }

    private fillPendingCampfireItems(player: PlayerState) {
        this.normalizeHotbar(player);
        while (player.pendingCampfireCharges > 0) {
            const emptyIndex = player.hotbarItems.findIndex((item) => !item);
            if (emptyIndex < 0) return;
            player.hotbarItems[emptyIndex] = ITEM_CAMPFIRE;
            player.hotbarCounts[emptyIndex] = EMPTY_HOTBAR_COUNT;
            player.pendingCampfireCharges--;
            if (player.activeSlot === emptyIndex + 1) {
                player.activeItem = ITEM_CAMPFIRE;
            }
        }
    }

    private getPlayerAxeCooldownMs(player: PlayerState): number {
        return ATTACK_COOLDOWN_MS / (1 + 0.25 * Math.max(0, player.axeSwingSpeedUpgrades || 0));
    }

    private getPlayerBowChargeMs(player: PlayerState): number {
        return Math.max(MIN_BOW_CHARGE_MS, BOW_CHARGE_MS * Math.pow(0.75, Math.max(0, player.bowChargeTimeUpgrades || 0)));
    }

    private startBowCharge(sessionId: string, data: unknown) {
        const player = this.state.players.get(sessionId);
        const sp = this.serverPlayers.get(sessionId);
        if (!player || !sp || !sp.alive || player.isDead || this.state.gameOver) return;
        if (player.activeItem !== ITEM_WOOD_BOW || sp.bowCharging) return;

        this.cancelRevive(sessionId);
        const vector = this.getBowAimVector(player, data);
        const direction = directionFromInput(vector.x, vector.y) || player.facingDirection || "N";
        sp.bowCharging = true;
        sp.bowChargeMs = 0;
        sp.bowChargeX = player.x;
        sp.bowChargeY = player.y;
        sp.bowAimX = vector.x;
        sp.bowAimY = vector.y;
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
        player.bowCharging = false;
        player.bowChargeProgress = 0;
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
        ps.kills = 0;
        ps.level = 1;
        ps.experience = 0;
        ps.experienceToNext = FIRST_LEVEL_UP_KILLS;
        ps.wood = 0;
        ps.facingDirection = "N";
        ps.attackDirection = "N";
        this.initializeHotbar(ps);
        ps.attackSeq = 0;
        ps.bowCharging = false;
        ps.bowChargeProgress = 0;
        ps.bowChargeSeq = 0;
        this.state.players.set(client.sessionId, ps);

        this.serverPlayers.set(client.sessionId, {
            vx: 0, vy: 0,
            fireCounter: 0,
            attackLockMs: 0,
            attackLockX: ps.x,
            attackLockY: ps.y,
            attackCooldownMs: 0,
            bowCharging: false,
            bowChargeMs: 0,
            bowChargeX: ps.x,
            bowChargeY: ps.y,
            bowAimX: 0,
            bowAimY: -1,
            revivingTargetId: null,
            input: { left: false, right: false, up: false, down: false, fire: false, interact: false },
            alive: true,
        });

        if (!this.state.gameStarted) {
            this.state.gameStarted = true;
            this.elapsedMs = 0;
            this.campfireHealElapsedMs = 0;
            this.state.elapsedSeconds = 0;
            this.state.gameOverCountdown = 0;
            if (!this.isMapEditor()) this.startEnemyWaveSchedule();
        }
    }

    // ─── Reset game state (called when a player rejoins after game over) ──────
    private resetLevel() {
        this.broadcast("levelReset", {});
        this.state.enemies.clear();
        this.serverEnemies.clear();
        this.state.playerBullets.clear();
        this.serverPlayerBullets.clear();
        this.state.enemyBullets.clear();
        this.serverEnemyBullets.clear();
        this.state.logs.clear();
        this.state.woodBlocks.clear();
        this.state.campfires.clear();
        this.generateTrees();

        this.state.players.forEach((player, sid) => {
            const spawn = this.findNearestOpenPlayerPosition(this.playableWorldWidth() / 2, this.playableWorldHeight() / 2);
            player.x = spawn.x;
            player.y = spawn.y;
            player.maxHealth = PLAYER_MAX_HEALTH;
            player.health = PLAYER_MAX_HEALTH;
            player.kills = 0;
            player.level = 1;
            player.experience = 0;
            player.experienceToNext = FIRST_LEVEL_UP_KILLS;
            player.isDead = false;
            player.reviveProgress = 0;
            player.facingDirection = "N";
            player.attackDirection = "N";
            this.initializeHotbar(player);
            player.attackSeq = 0;
            player.bowCharging = false;
            player.bowChargeProgress = 0;
            player.bowChargeSeq = 0;
            player.pendingUpgradeChoices = 0;
            player.axeSwingSpeedUpgrades = 0;
            player.axeTreeDamageUpgrades = 0;
            player.axeEnemyDamageUpgrades = 0;
            player.bowDamageUpgrades = 0;
            player.bowPierceUpgrades = 0;
            player.bowChargeTimeUpgrades = 0;
            player.barricadeHealthUpgrades = 0;
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
            sp.bowCharging = false;
            sp.bowChargeMs = 0;
            sp.bowChargeX = player.x;
            sp.bowChargeY = player.y;
            sp.bowAimX = 0;
            sp.bowAimY = -1;
            sp.revivingTargetId = null;
            sp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
            sp.alive = true;
        });

        this.state.teamScore = 0;
        this.elapsedMs = 0;
        this.campfireHealElapsedMs = 0;
        this.state.elapsedSeconds = 0;
        this.state.gameOver = false;
        this.state.gameOverCountdown = 0;
        this.gameOverRestartMs = 0;
        if (this.state.gameStarted && this.state.players.size > 0) this.startEnemyWaveSchedule();
    }

    onLeave(client: Client) {
        this.cancelRevive(client.sessionId);
        this.cancelRevivesTargeting(client.sessionId);
        this.state.players.delete(client.sessionId);
        this.serverPlayers.delete(client.sessionId);
        this.checkAllDead();
    }

    onDispose() {
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

                    if (
                        Math.hypot(x - spawnX, y - spawnY) >= TREE_SPAWN_CLEAR_RADIUS
                        && !this.treeOverlapsSolidMapTile(x, y)
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
                }

                if (this.treeOverlapsSolidMapTile(x, y)) {
                    let relocated = false;
                    for (let attempt = 0; attempt < 64; attempt++) {
                        const candidateX = rndReal(TREE_EDGE_PADDING, WORLD_WIDTH - TREE_EDGE_PADDING);
                        const candidateY = rndReal(TREE_EDGE_PADDING, WORLD_HEIGHT - TREE_EDGE_PADDING);
                        if (
                            Math.hypot(candidateX - spawnX, candidateY - spawnY) < TREE_SPAWN_CLEAR_RADIUS
                            || this.treeOverlapsSolidMapTile(candidateX, candidateY)
                        ) continue;
                        x = candidateX;
                        y = candidateY;
                        relocated = true;
                        break;
                    }
                    if (!relocated) continue;
                }

                const tree = new TreeState();
                tree.id = `tree-${++treeIndex}`;
                tree.x = x;
                tree.y = y;
                this.state.trees.set(tree.id, tree);
                this.serverTreeHealth.set(tree.id, TREE_HEALTH);
            }
        }
    }

    private applyDelayedTreeAttackImpact(attackerId: string, attackOrigin: AttackOrigin, direction: string, targetX: unknown, targetY: unknown) {
        const sp = this.serverPlayers.get(attackerId);
        const player = this.state.players.get(attackerId);
        if (!sp || !sp.alive || !player || this.state.gameOver) return;

        const treeHit = this.damageTreeFromAttack(attackOrigin, attackerId, direction, targetX, targetY);
        if (treeHit) this.broadcast("treeHit", treeHit);
    }

    private applyDelayedEnemyAttackImpact(attackerId: string, attackOrigin: AttackOrigin, direction: string, targetX: unknown, targetY: unknown) {
        const sp = this.serverPlayers.get(attackerId);
        const player = this.state.players.get(attackerId);
        if (!sp || !sp.alive || !player || this.state.gameOver) return;

        const enemyHits = this.damageEnemiesFromAttack(attackOrigin, attackerId, direction, targetX, targetY);
        enemyHits.forEach((enemyHit) => this.broadcast("enemyHit", enemyHit));
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
        const damage = 1 + Math.max(0, attacker?.axeTreeDamageUpgrades || 0);
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
            if (!capsuleOverlapsAabb(
                attackStartX,
                attackStartY,
                attackEndX,
                attackEndY,
                ATTACK_HIT_RADIUS,
                tree.x,
                tree.y + TREE_TRUNK_Y_OFFSET,
                TREE_TRUNK_HW,
                TREE_TRUNK_HH,
            )) return;

            const dx = attackEndX - tree.x;
            const dy = attackEndY - (tree.y + TREE_TRUNK_Y_OFFSET);
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq < closestDistanceSq) {
                closestDistanceSq = distanceSq;
                closestTreeId = id;
            }
        });

        return closestTreeId;
    }

    private damageEnemiesFromAttack(attackOrigin: AttackOrigin, attackerId: string, direction: string, targetX: unknown, targetY: unknown): EnemyHitPayload[] {
        const hitEnemyIds = this.findEnemyHitsByAttack(attackOrigin, direction, targetX, targetY);
        const hitPayloads: EnemyHitPayload[] = [];

        hitEnemyIds.forEach((enemyId) => {
            const enemy = this.state.enemies.get(enemyId);
            if (!enemy) {
                this.serverEnemies.delete(enemyId);
                return;
            }
            if (enemy.isDead) return;

            const attacker = this.state.players.get(attackerId);
            const damage = 1 + Math.max(0, attacker?.axeEnemyDamageUpgrades || 0);
            enemy.health = Math.max(0, enemy.health - damage);
            if (enemy.health > 0) {
                enemy.damageSeq++;
                const se = this.serverEnemies.get(enemyId);
                if (se && !this.shouldPreserveDarkKnightAttackCooldown(enemy)) {
                    se.mode = "stun";
                    se.modeMs = ENEMY_HIT_STUN_MS;
                    enemy.action = "idle";
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
                se.mode = "stun";
                se.modeMs = ENEMY_HIT_STUN_MS;
                enemy.action = "idle";
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

    private shouldPreserveDarkKnightAttackCooldown(enemy: EnemyState): boolean {
        if (enemy.enemyType !== ENEMY_TYPE_DARK_KNIGHT) return false;
        const se = this.serverEnemies.get(enemy.id);
        return se?.mode === "dkAttack" || se?.mode === "dkCooldown";
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
        const experience = enemy.enemyType === ENEMY_TYPE_DARK_KNIGHT ? 2 : 1;
        this.awardPlayerExperience(playerId, experience);
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
        return FIRST_LEVEL_UP_KILLS * Math.pow(2, Math.max(0, level - 1));
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
        const position = this.findWoodDropPosition(tree.x, tree.y - 8);
        if (!position) return;
        const log = new LogState();
        log.id = `log-${nextId()}`;
        log.x = position.x;
        log.y = position.y;
        log.amount = WOOD_PILE_AMOUNT;
        this.state.logs.set(log.id, log);
    }

    private findWoodDropPosition(originX: number, originY: number): { x: number; y: number } | null {
        const x = clamp(originX, LOG_WORLD_PADDING, WORLD_WIDTH - LOG_WORLD_PADDING);
        const y = clamp(originY, LOG_WORLD_PADDING, WORLD_HEIGHT - LOG_WORLD_PADDING);
        if (this.state.activeMapName === "") return { x, y };
        if (this.isGreenMapTileAtWorldPoint(x, y)) return { x, y };

        const originCol = Math.floor(x / MAP_TILE_SIZE);
        const originRow = Math.floor(y / MAP_TILE_SIZE);
        for (let radius = 1; radius <= 8; radius++) {
            for (let row = originRow - radius; row <= originRow + radius; row++) {
                for (let col = originCol - radius; col <= originCol + radius; col++) {
                    if (Math.max(Math.abs(col - originCol), Math.abs(row - originRow)) !== radius || !this.isMapCellInside(col, row)) continue;
                    const candidateX = clamp(col * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5, LOG_WORLD_PADDING, WORLD_WIDTH - LOG_WORLD_PADDING);
                    const candidateY = clamp(row * MAP_TILE_SIZE + MAP_TILE_SIZE * 0.5, LOG_WORLD_PADDING, WORLD_HEIGHT - LOG_WORLD_PADDING);
                    if (this.isGreenMapTileAtWorldPoint(candidateX, candidateY)) return { x: candidateX, y: candidateY };
                }
            }
        }

        return null;
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

        const amount = Math.ceil((log.amount || WOOD_PILE_AMOUNT) * (1 + 0.5 * Math.max(0, player.woodGatherUpgrades || 0)));
        if (!this.addWoodToHotbar(player, amount)) return 0;
        player.wood = this.getTotalHeldWood(player);
        this.state.logs.delete(closestLogId);
        return amount;
    }

    private tryBuildWoodBlock(sessionId: string, data: unknown): boolean {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver || !this.state.gameStarted) return false;
        if (player.activeItem !== ITEM_WOOD || this.getHotbarCount(player, player.activeSlot) < BUILD_BLOCK_COST) return false;

        const cell = this.getBuildCellFromData(data);
        if (!cell || !this.isBuildCellInRange(player, cell.x, cell.y)) return false;
        if (this.isBuildCellOccupied(cell, cell.x, cell.y)) return false;

        const block = new WoodBlockState();
        const maxHealth = WOOD_BLOCK_HEALTH + 5 * Math.max(0, player.barricadeHealthUpgrades || 0);
        block.id = this.getWoodBlockIdForCell(cell);
        block.x = cell.x;
        block.y = cell.y;
        block.health = maxHealth;
        block.maxHealth = maxHealth;
        this.state.woodBlocks.set(block.id, block);
        this.consumeActiveWood(player, BUILD_BLOCK_COST);
        player.wood = this.getTotalHeldWood(player);
        return true;
    }

    private tryRemoveWoodBlock(sessionId: string, data: unknown): boolean {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver || !this.state.gameStarted) return false;
        if (player.activeItem !== ITEM_HAMMER && player.activeItem !== ITEM_WOOD) return false;

        const cell = this.getBuildCellFromData(data);
        if (!cell || !this.isBuildCellInRange(player, cell.x, cell.y)) return false;

        const woodBlockId = this.getWoodBlockIdForCell(cell);
        if (this.state.woodBlocks.has(woodBlockId)) {
            if (!this.addWoodToHotbar(player, BUILD_BLOCK_COST)) return false;
            this.state.woodBlocks.delete(woodBlockId);
            player.wood = this.getTotalHeldWood(player);
            return true;
        }

        if (player.activeItem !== ITEM_HAMMER) return false;
        const campfireId = this.getCampfireIdForCell(cell);
        if (!this.state.campfires.has(campfireId)) return false;
        this.state.campfires.delete(campfireId);
        this.grantCampfireItem(player);
        return true;
    }

    private tryRepairWoodBlock(sessionId: string, data: unknown): boolean {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver || !this.state.gameStarted) return false;
        if (player.activeItem !== ITEM_HAMMER) return false;

        const cell = this.getBuildCellFromData(data);
        if (!cell || !this.isBuildCellInRange(player, cell.x, cell.y)) return false;

        const block = this.state.woodBlocks.get(this.getWoodBlockIdForCell(cell));
        if (!block || block.health >= block.maxHealth) return false;
        block.health = Math.min(block.maxHealth, block.health + WOOD_BLOCK_REPAIR_AMOUNT);
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

        const campfire = new CampfireState();
        campfire.id = this.getCampfireIdForCell(cell);
        campfire.x = cell.x;
        campfire.y = cell.y;
        campfire.healProgress = Math.floor((this.campfireHealElapsedMs / CAMPFIRE_HEAL_INTERVAL_MS) * 100);
        this.state.campfires.set(campfire.id, campfire);
        this.setHotbarItem(player, player.activeSlot, EMPTY_HOTBAR_ITEM);
        this.fillPendingCampfireItems(player);
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

    private getWoodBlockIdForCell(cell: { col: number; row: number }): string {
        return `wood-${cell.col}-${cell.row}`;
    }

    private getCampfireIdForCell(cell: { col: number; row: number }): string {
        return `campfire-${cell.col}-${cell.row}`;
    }

    private isBuildCellInRange(player: PlayerState, blockX: number, blockY: number): boolean {
        const dx = player.x - blockX;
        const dy = (player.y + PLAYER_TREE_Y_OFFSET) - blockY;
        return dx * dx + dy * dy <= BUILD_RANGE * BUILD_RANGE;
    }

    private isBuildCellOccupied(cell: { col: number; row: number }, blockX: number, blockY: number): boolean {
        if (this.state.woodBlocks.has(this.getWoodBlockIdForCell(cell))) return true;
        if (this.state.campfires.has(this.getCampfireIdForCell(cell))) return true;

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
            occupied = overlaps(
                blockX,
                blockY,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
                tree.x,
                tree.y + TREE_TRUNK_Y_OFFSET,
                TREE_TRUNK_HW,
                TREE_TRUNK_HH,
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
        const tickStartedAt = ENABLE_ENEMY_DIAGNOSTICS ? performance.now() : 0;
        const dtSec = dt / 1000;

        if (this.isMapEditor()) {
            this.tickPlayers(dtSec, dt);
            return;
        }

        this.tickElapsedTime(dt);
        this.tickPlayers(dtSec, dt);
        this.tickRevives(dt);
        this.tickPlayerBullets(dtSec);
        this.tickEnemyWaves();
        this.tickEnemies(dtSec, dt);
        this.tickEnemyBullets(dtSec);
        this.tickCollisions();
        this.tickCampfires(dt);
        this.reportEnemySimulationStats(tickStartedAt);
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
        targetSp.revivingTargetId = null;
        targetSp.bowCharging = false;
        targetSp.bowChargeMs = 0;
        targetSp.bowChargeX = target.x;
        targetSp.bowChargeY = target.y;
        targetSp.bowAimX = 0;
        targetSp.bowAimY = -1;
        targetSp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
        target.health = REVIVE_HEALTH;
        target.isDead = false;
        target.reviveProgress = 0;
        target.bowCharging = false;
        target.bowChargeProgress = 0;
    }

    // ─── Player movement & firing ─────────────────────────────────────────────
    private tickPlayers(dtSec: number, dtMs: number) {
        this.state.players.forEach((player, sid) => {
            const sp = this.serverPlayers.get(sid);
            if (!sp || !sp.alive) return;
            const { left, right, up, down, fire } = sp.input;
            const isAttackLocked = sp.attackLockMs > 0;
            sp.attackLockMs = Math.max(0, sp.attackLockMs - dtMs);
            sp.attackCooldownMs = Math.max(0, sp.attackCooldownMs - dtMs);

            const inputX = Number(right) - Number(left);
            const inputY = Number(down) - Number(up);
            const inputLength = Math.hypot(inputX, inputY);

            if (sp.bowCharging) {
                if (player.activeItem !== ITEM_WOOD_BOW) {
                    this.clearBowCharge(player, sp);
                } else {
                    const chargeMs = this.getPlayerBowChargeMs(player);
                    sp.bowChargeMs = Math.min(chargeMs, sp.bowChargeMs + dtMs);
                    player.bowChargeProgress = clamp(sp.bowChargeMs / chargeMs, 0, 1);
                    sp.vx = 0;
                    sp.vy = 0;
                    player.x = sp.bowChargeX;
                    player.y = sp.bowChargeY;
                    if (sp.bowChargeMs >= chargeMs) this.fireBowCharge(sid);
                    return;
                }
            }

            if (isAttackLocked) {
                sp.vx = 0;
                sp.vy = 0;
                player.x = sp.attackLockX;
                player.y = sp.attackLockY;
            } else {
                const facingDirection = directionFromInput(inputX, inputY);
                if (facingDirection) player.facingDirection = facingDirection;

                sp.vx = inputLength > 0 ? (inputX / inputLength) * PLAYER_MAX_VEL : 0;
                sp.vy = inputLength > 0 ? (inputY / inputLength) * PLAYER_MAX_VEL : 0;

                const nextX = player.x + sp.vx * dtSec;
                const nextY = player.y + sp.vy * dtSec;
                const resolved = this.movePlayerWithWorldColliders(player, nextX, nextY);
                if (resolved.x === player.x && nextX !== player.x) sp.vx = 0;
                if (resolved.y === player.y && nextY !== player.y) sp.vy = 0;
                player.x = resolved.x;
                player.y = resolved.y;
            }

            sp.fireCounter = Math.max(0, sp.fireCounter - dtMs);
            if (!this.isMapEditor() && fire && sp.fireCounter === 0) {
                sp.fireCounter = FIRE_RATE_MS;
                this.spawnPlayerBullet(player.x, player.y - PLAYER_BULLET_Y_OFFSET, 1, sid);
            }
        });
    }

    private collidesWithTestTreeTrunk(playerX: number, playerY: number): boolean {
        let collides = false;
        this.state.trees.forEach((tree) => {
            if (collides) return;
            collides = circleOverlapsAabb(
                playerX,
                playerY + PLAYER_TREE_Y_OFFSET,
                PLAYER_TREE_FOOT_RADIUS,
                tree.x,
                tree.y + TREE_TRUNK_Y_OFFSET,
                TREE_TRUNK_HW,
                TREE_TRUNK_HH,
            );
        });

        return collides;
    }

    private collidesWithWoodBlockFoot(x: number, y: number, radius: number): boolean {
        let collides = false;
        this.state.woodBlocks.forEach((block) => {
            if (collides) return;
            collides = circleOverlapsAabb(
                x,
                y,
                radius,
                block.x,
                block.y,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
            );
        });

        return collides;
    }

    private collidesWithEnemyWorldFoot(x: number, y: number, radius: number): boolean {
        return this.collidesWithWoodBlockFoot(x, y, radius)
            || this.mapSolidOverlapsAabb(x, y, radius, radius);
    }

    private collidesWithPlayerWorldColliders(playerX: number, playerY: number): boolean {
        const footX = playerX;
        const footY = playerY + PLAYER_TREE_Y_OFFSET;
        return this.collidesWithTestTreeTrunk(playerX, playerY)
            || this.collidesWithWoodBlockFoot(footX, footY, PLAYER_TREE_FOOT_RADIUS)
            || this.collidesWithMapTiles(playerX, playerY);
    }

    private movePlayerWithWorldColliders(player: PlayerState, nextX: number, nextY: number): { x: number; y: number } {
        const dx = nextX - player.x;
        const dy = nextY - player.y;
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_PLAYER_MOVE_STEP));
        const stepX = dx / steps;
        const stepY = dy / steps;
        let resolvedX = player.x;
        let resolvedY = player.y;

        for (let i = 0; i < steps; i++) {
            const candidateX = clamp(resolvedX + stepX, PLAYER_HW, this.playableWorldWidth() - PLAYER_HW);
            if (!this.collidesWithPlayerWorldColliders(candidateX, resolvedY)) {
                resolvedX = candidateX;
            }

            const candidateY = clamp(resolvedY + stepY, PLAYER_HH, this.playableWorldHeight() - PLAYER_HH);
            if (!this.collidesWithPlayerWorldColliders(resolvedX, candidateY)) {
                resolvedY = candidateY;
            }
        }

        return { x: resolvedX, y: resolvedY };
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
        const damage = ARROW_DAMAGE + Math.max(0, owner?.bowDamageUpgrades || 0);
        const pierce = 1 + Math.max(0, owner?.bowPierceUpgrades || 0);
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
        this.lastScheduledEnemyWaveMinute = -1;
        this.nextEnemyDiagnosticAtMs = 0;
        this.scheduleEnemyWave(0);
    }

    private tickEnemyWaves() {
        const currentMinute = Math.floor(this.elapsedMs / ENEMY_WAVE_INTERVAL_MS);
        while (this.lastScheduledEnemyWaveMinute < currentMinute) {
            this.scheduleEnemyWave(this.lastScheduledEnemyWaveMinute + 1);
        }

        let spawnedThisTick = 0;
        while (
            spawnedThisTick < MAX_ENEMY_SPAWNS_PER_TICK
            && this.state.enemies.size < MAX_ACTIVE_ENEMIES
            && this.pendingEnemySpawns[0]?.spawnAtMs <= this.elapsedMs
        ) {
            const pendingSpawn = this.pendingEnemySpawns.shift();
            if (!pendingSpawn) break;
            this.spawnEnemy(pendingSpawn.enemyType, pendingSpawn.edgeIndex);
            spawnedThisTick++;
        }
    }

    private scheduleEnemyWave(minute: number) {
        const waveStartMs = minute * ENEMY_WAVE_INTERVAL_MS;
        const meleeCount = minute === 0 ? INITIAL_MELEE_WAVE_COUNT : minute * MELEE_PER_MINUTE;
        const casterCount = minute === 0 ? 0 : minute < DARK_KNIGHT_WAVE_INTERVAL_MINUTES ? 1 : 2;
        const darkKnightCount = minute > 0 && minute % DARK_KNIGHT_WAVE_INTERVAL_MINUTES === 0
            ? minute / DARK_KNIGHT_WAVE_INTERVAL_MINUTES
            : 0;

        this.broadcast("enemyWaveStarted", { minute, startedAtUnixMs: Date.now() });

        for (let i = 0; i < meleeCount; i++) {
            this.queueEnemySpawn(rndInt(1, 2), waveStartMs);
        }
        for (let i = 0; i < casterCount; i++) {
            this.queueEnemySpawn(ENEMY_TYPE_CASTER, waveStartMs);
        }
        for (let i = 0; i < darkKnightCount; i++) {
            this.queueEnemySpawn(ENEMY_TYPE_DARK_KNIGHT, waveStartMs);
        }

        this.pendingEnemySpawns.sort((a, b) => a.spawnAtMs - b.spawnAtMs);
        this.lastScheduledEnemyWaveMinute = minute;
    }

    private queueEnemySpawn(enemyType: number, waveStartMs: number) {
        this.pendingEnemySpawns.push({
            enemyType,
            edgeIndex: rndInt(0, 3),
            spawnAtMs: waveStartMs + rndReal(0, ENEMY_WAVE_SPAWN_WINDOW_MS),
        });
    }

    private reportEnemySimulationStats(tickStartedAt: number) {
        if (!ENABLE_ENEMY_DIAGNOSTICS || this.elapsedMs < this.nextEnemyDiagnosticAtMs) return;

        this.nextEnemyDiagnosticAtMs = this.elapsedMs + ENEMY_DIAGNOSTIC_INTERVAL_MS;
        const tickDurationMs = performance.now() - tickStartedAt;
        console.log(
            `[ShmupRoom ${this.roomId}] enemy simulation: active=${this.state.enemies.size}/${MAX_ACTIVE_ENEMIES}, `
            + `queued=${this.pendingEnemySpawns.length}, tick=${tickDurationMs.toFixed(1)}ms`,
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
        e.maxHealth = enemyType === ENEMY_TYPE_DARK_KNIGHT ? DARK_KNIGHT_HEALTH : 3;
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
            e.facingDirection = directionFromInput(target.player.x - e.x, target.player.y - e.y) || "S";
        }

        this.state.enemies.set(id, e);
        this.serverEnemies.set(id, {
            mode: enemyType === ENEMY_TYPE_DARK_KNIGHT ? "dkWalk" : "chase",
            modeMs: 0,
            targetId: target?.id || null,
            targetWoodBlockId: null,
            darkKnightTargetKind: null,
            darkKnightMarkX: e.x,
            darkKnightMarkY: e.y,
            pathRefreshMs: 0,
            pathTargetCell: null,
            path: [],
        });
    }

    private tickEnemies(dtSec: number, dtMs: number) {
        const dead: string[] = [];
        this.state.enemies.forEach((enemy, id) => {
            if (enemy.isDead) return;
            const se = this.serverEnemies.get(id);
            if (!se) { dead.push(id); return; }

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
                se.targetWoodBlockId = null;
                se.path = [];
                se.pathTargetCell = null;
                return;
            }

            se.targetId = target.id;
            const dx = target.player.x - enemy.x;
            const dy = target.player.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            const direction = directionFromInput(dx, dy);
            if (direction) enemy.facingDirection = direction;
            const isInAttackRange = distance <= ENEMY1_PLAYER_ATTACK_RANGE + ENEMY1_ATTACK_TRIGGER_EPSILON;

            if (enemy.enemyType === ENEMY_TYPE_CASTER) {
                this.tickCasterEnemy(id, enemy, se, target, dx, dy, distance, dtSec, dtMs);
                return;
            }

            if (enemy.enemyType === ENEMY_TYPE_DARK_KNIGHT) {
                this.tickDarkKnightEnemy(id, enemy, se, target, dx, dy, distance, dtSec, dtMs);
                return;
            }

            if (se.mode === "woodAttack" || se.mode === "woodWindup") {
                const block = se.targetWoodBlockId ? this.state.woodBlocks.get(se.targetWoodBlockId) : undefined;
                se.pathRefreshMs = Math.max(0, se.pathRefreshMs - dtMs);
                const routeOpened = this.hasDirectWoodBlockPath(
                    enemy.x,
                    enemy.y + ENEMY_FOOT_Y_OFFSET,
                    target.player.x,
                    target.player.y + PLAYER_TREE_Y_OFFSET,
                );

                if (!routeOpened) {
                    if (this.shouldRefreshEnemyPath(se, target.player)) {
                        this.refreshEnemyWoodBlockPath(enemy, se, target.player);
                    }
                }

                if (!block || routeOpened || se.path.length > 0) {
                    se.mode = "chase";
                    se.modeMs = 0;
                    se.targetWoodBlockId = null;
                    enemy.action = "run";
                } else {
                    this.tickEnemyWoodBlockAttack(id, enemy, se, block, dtMs);
                    return;
                }
            }

            if (se.mode === "attack") {
                enemy.action = "attack";
                se.modeMs = Math.max(0, se.modeMs - dtMs);
                if (se.modeMs === 0) {
                    se.mode = isInAttackRange ? "windup" : "chase";
                    se.modeMs = se.mode === "windup" ? ENEMY1_WINDUP_MS : 0;
                    enemy.action = se.mode === "windup" ? "idle" : "run";
                }
                return;
            }

            if (isInAttackRange) {
                se.targetWoodBlockId = null;
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
                    const attackOrigin = { x: enemy.x, y: enemy.y };
                    const attackDirection = enemy.facingDirection || "S";
                    const attackVector = this.getEnemyAttackVector(attackOrigin, target.player, attackDirection);
                    setTimeout(() => {
                        this.applyEnemyAttackImpact(id, attackOrigin, attackVector);
                    }, ENEMY1_DAMAGE_IMPACT_DELAY_MS);
                }
                return;
            }

            se.mode = "chase";
            se.modeMs = 0;
            enemy.action = "run";
            if (distance <= 0) return;

            const remainingDistance = Math.max(0, distance - ENEMY1_PLAYER_ATTACK_RANGE);
            if (remainingDistance <= ENEMY1_MIN_CHASE_STEP) {
                enemy.action = "idle";
                se.mode = "windup";
                se.modeMs = ENEMY1_WINDUP_MS;
                se.path = [];
                se.pathTargetCell = null;
                return;
            }

            const move = Math.min(ENEMY1_SPEED * dtSec, remainingDistance);
            if (this.hasDirectWoodBlockPath(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET, target.player.x, target.player.y + PLAYER_TREE_Y_OFFSET)) {
                se.path = [];
                se.pathTargetCell = null;
                se.pathRefreshMs = 0;
                se.targetWoodBlockId = null;
                const resolved = this.moveEnemyWithWoodBlocks(
                    enemy,
                    enemy.x + (dx / distance) * move,
                    enemy.y + (dy / distance) * move,
                );
                enemy.x = resolved.x;
                enemy.y = resolved.y;
                return;
            }

            const directResolved = this.moveEnemyWithWoodBlocks(
                enemy,
                enemy.x + (dx / distance) * move,
                enemy.y + (dy / distance) * move,
            );

            se.pathRefreshMs = Math.max(0, se.pathRefreshMs - dtMs);
            if (this.shouldRefreshEnemyPath(se, target.player)) {
                this.refreshEnemyWoodBlockPath(enemy, se, target.player);
            }

            const pathMoved = this.followEnemyPath(enemy, se, move);
            if (pathMoved) return;

            const blockingBlock = this.findEnemyBlockingWoodBlock(enemy, target.player)
                || this.findNearestEnemyWoodBlockInAttackRange(enemy);
            if (blockingBlock && this.tickEnemyWoodBlockAttack(id, enemy, se, blockingBlock, dtMs, move)) return;

            enemy.x = directResolved.x;
            enemy.y = directResolved.y;
        });
        dead.forEach(id => { this.state.enemies.delete(id); this.serverEnemies.delete(id); });
        this.separateEnemyFeet();
    }

    private tickCasterEnemy(
        enemyId: string,
        enemy: EnemyState,
        se: ServerEnemy,
        target: { id: string; player: PlayerState; distanceSq: number },
        dx: number,
        dy: number,
        distance: number,
        dtSec: number,
        dtMs: number,
    ) {
        const isInCastRange = distance <= CASTER_CAST_RANGE;
        const hasLineOfSight = this.hasCasterLineOfSightToPlayer(enemy, target.player);
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
                enemy.action = "charge";
                se.modeMs = Math.max(0, se.modeMs - dtMs);
                if (se.modeMs === 0) {
                    const launchTarget = this.findNearestAlivePlayer(enemy.x, enemy.y);
                    if (!launchTarget || !this.hasCasterLineOfSightToPlayer(enemy, launchTarget.player)) {
                        se.mode = "chase";
                        enemy.action = "run";
                        return;
                    }

                    const launchDx = launchTarget.player.x - enemy.x;
                    const launchDy = launchTarget.player.y - enemy.y;
                    const launchDirection = directionFromInput(launchDx, launchDy);
                    if (launchDirection) enemy.facingDirection = launchDirection;

                    se.mode = "casterAttack";
                    se.modeMs = CASTER_ATTACK_MS;
                    enemy.action = "attack";
                    enemy.attackSeq++;
                    this.spawnCasterFireball(enemy.x, enemy.y, launchTarget.player);
                }
                return;
            }
        }

        if (canStartCast) {
            se.targetWoodBlockId = null;
            se.path = [];
            se.pathTargetCell = null;
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
        const move = Math.min(ENEMY1_SPEED * dtSec, remainingDistance);
        if (move <= 0) {
            if (hasLineOfSight) {
                enemy.action = "charge";
                se.mode = "casterCharge";
                se.modeMs = CASTER_CHARGE_MS;
            }
            return;
        }

        if (this.hasDirectWoodBlockPath(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET, target.player.x, target.player.y + PLAYER_TREE_Y_OFFSET)) {
            se.path = [];
            se.pathTargetCell = null;
            se.pathRefreshMs = 0;
            se.targetWoodBlockId = null;
            const resolved = this.moveEnemyWithWoodBlocks(
                enemy,
                enemy.x + (dx / distance) * move,
                enemy.y + (dy / distance) * move,
            );
            enemy.x = resolved.x;
            enemy.y = resolved.y;
            return;
        }

        const directResolved = this.moveEnemyWithWoodBlocks(
            enemy,
            enemy.x + (dx / distance) * move,
            enemy.y + (dy / distance) * move,
        );

        se.pathRefreshMs = Math.max(0, se.pathRefreshMs - dtMs);
        if (this.shouldRefreshEnemyPath(se, target.player)) {
            this.refreshEnemyWoodBlockPath(enemy, se, target.player);
        }

        const pathMoved = this.followEnemyPath(enemy, se, move);
        if (pathMoved) return;

        enemy.x = directResolved.x;
        enemy.y = directResolved.y;
    }

    private hasCasterLineOfSightToPlayer(enemy: EnemyState, player: PlayerState): boolean {
        return !this.segmentOverlapsSolidMapTile(
            enemy.x,
            enemy.y,
            player.x,
            player.y + PLAYER_TREE_Y_OFFSET,
            1,
        );
    }

    private tickDarkKnightEnemy(
        enemyId: string,
        enemy: EnemyState,
        se: ServerEnemy,
        target: { id: string; player: PlayerState; distanceSq: number },
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
                se.targetWoodBlockId = null;
                se.darkKnightTargetKind = null;
                enemy.action = "walk";
            }
            return;
        }

        if (se.mode === "dkRush") {
            enemy.action = "run";
            if (this.tickDarkKnightRush(enemyId, enemy, se, dtSec, dtMs)) return;
            se.mode = "dkWalk";
            se.targetWoodBlockId = null;
            se.darkKnightTargetKind = null;
        }

        if (distance <= DARK_KNIGHT_DETECTION_RANGE && this.hasDarkKnightLineOfSightToPlayer(enemy, target.player)) {
            this.startDarkKnightRush(enemy, se, target.player);
            return;
        }

        enemy.action = "walk";
        se.mode = "dkWalk";
        se.modeMs = 0;
        if (distance <= 0) return;

        const move = Math.min(DARK_KNIGHT_WALK_SPEED * dtSec, distance);
        if (this.hasDirectWoodBlockPath(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET, target.player.x, target.player.y + PLAYER_TREE_Y_OFFSET)) {
            se.path = [];
            se.pathTargetCell = null;
            se.pathRefreshMs = 0;
            se.targetWoodBlockId = null;
            const resolved = this.moveEnemyWithWoodBlocks(
                enemy,
                enemy.x + (dx / distance) * move,
                enemy.y + (dy / distance) * move,
            );
            enemy.x = resolved.x;
            enemy.y = resolved.y;
            return;
        }

        const directResolved = this.moveEnemyWithWoodBlocks(
            enemy,
            enemy.x + (dx / distance) * move,
            enemy.y + (dy / distance) * move,
        );

        se.pathRefreshMs = Math.max(0, se.pathRefreshMs - dtMs);
        if (this.shouldRefreshEnemyPath(se, target.player)) {
            this.refreshEnemyWoodBlockPath(enemy, se, target.player);
        }

        const pathMoved = this.followEnemyPath(enemy, se, move);
        if (pathMoved) return;

        enemy.x = directResolved.x;
        enemy.y = directResolved.y;
    }

    private hasDarkKnightLineOfSightToPlayer(enemy: EnemyState, player: PlayerState): boolean {
        return !this.segmentOverlapsSolidMapTile(
            enemy.x,
            enemy.y + ENEMY_FOOT_Y_OFFSET,
            player.x,
            player.y + PLAYER_TREE_Y_OFFSET,
            1,
        );
    }

    private startDarkKnightRush(enemy: EnemyState, se: ServerEnemy, target: PlayerState) {
        se.mode = "dkRush";
        se.modeMs = DARK_KNIGHT_MIN_RUSH_MS;
        se.darkKnightMarkX = target.x;
        se.darkKnightMarkY = target.y;
        se.targetWoodBlockId = null;
        se.darkKnightTargetKind = "playerMark";
        se.path = [];
        se.pathTargetCell = null;
        se.pathRefreshMs = 0;

        const blockingBlock = this.findBlockingWoodBlockToPoint(
            enemy.x,
            enemy.y + ENEMY_FOOT_Y_OFFSET,
            target.x,
            target.y + PLAYER_TREE_Y_OFFSET,
        );
        if (blockingBlock) {
            se.targetWoodBlockId = blockingBlock.id;
            se.darkKnightTargetKind = "woodBlock";
        }

        const direction = directionFromInput(
            (blockingBlock?.x ?? target.x) - enemy.x,
            ((blockingBlock?.y ?? target.y) - enemy.y),
        );
        if (direction) enemy.facingDirection = direction;
        enemy.action = "run";
    }

    private tickDarkKnightRush(enemyId: string, enemy: EnemyState, se: ServerEnemy, dtSec: number, dtMs: number): boolean {
        se.modeMs = Math.max(0, se.modeMs - dtMs);
        const canAttack = se.modeMs === 0;
        let targetX = se.darkKnightMarkX;
        let targetY = se.darkKnightMarkY;

        if (se.darkKnightTargetKind === "woodBlock") {
            const block = se.targetWoodBlockId ? this.state.woodBlocks.get(se.targetWoodBlockId) : undefined;
            if (!block) return false;

            const footX = enemy.x;
            const footY = enemy.y + ENEMY_FOOT_Y_OFFSET;
            const distanceSq = pointAabbDistanceSq(
                footX,
                footY,
                block.x,
                block.y,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
            );
            if (distanceSq <= DARK_KNIGHT_WOOD_REACH_RANGE * DARK_KNIGHT_WOOD_REACH_RANGE) {
                if (!canAttack) return true;
                this.startDarkKnightAttack(enemyId, enemy, se);
                return true;
            }

            targetX = block.x;
            targetY = block.y - ENEMY_FOOT_Y_OFFSET;
        } else {
            const blockingBlock = this.findBlockingWoodBlockToPoint(
                enemy.x,
                enemy.y + ENEMY_FOOT_Y_OFFSET,
                se.darkKnightMarkX,
                se.darkKnightMarkY + PLAYER_TREE_Y_OFFSET,
            );
            if (blockingBlock) {
                se.targetWoodBlockId = blockingBlock.id;
                se.darkKnightTargetKind = "woodBlock";
                targetX = blockingBlock.x;
                targetY = blockingBlock.y - ENEMY_FOOT_Y_OFFSET;
            }
        }

        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= DARK_KNIGHT_MARK_REACH_RADIUS) {
            if (!canAttack) return true;
            this.startDarkKnightAttack(enemyId, enemy, se);
            return true;
        }

        const direction = directionFromInput(dx, dy);
        if (direction) enemy.facingDirection = direction;

        const move = Math.min(DARK_KNIGHT_RUSH_SPEED * dtSec, distance);
        const resolved = this.moveEnemyWithWoodBlocks(
            enemy,
            enemy.x + (dx / distance) * move,
            enemy.y + (dy / distance) * move,
        );
        const moved = Math.hypot(resolved.x - enemy.x, resolved.y - enemy.y) > 0.1;
        enemy.x = resolved.x;
        enemy.y = resolved.y;

        if (!moved && se.darkKnightTargetKind !== "woodBlock") {
            const blockingBlock = this.findNearestEnemyWoodBlockInAttackRange(enemy)
                || this.findBlockingWoodBlockToPoint(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET, targetX, targetY + ENEMY_FOOT_Y_OFFSET);
            if (blockingBlock) {
                se.targetWoodBlockId = blockingBlock.id;
                se.darkKnightTargetKind = "woodBlock";
            } else {
                return false;
            }
        }

        return true;
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

    private moveEnemyWithWoodBlocks(enemy: EnemyState, nextX: number, nextY: number): { x: number; y: number } {
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
    }

    private hasDirectWoodBlockPath(fromX: number, fromY: number, toX: number, toY: number): boolean {
        let clear = true;
        this.state.woodBlocks.forEach((block) => {
            if (!clear) return;
            clear = !capsuleOverlapsAabb(
                fromX,
                fromY,
                toX,
                toY,
                ENEMY_FOOT_RADIUS,
                block.x,
                block.y,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
            );
        });

        if (!clear) return false;
        clear = !this.segmentOverlapsSolidMapTile(fromX, fromY, toX, toY, ENEMY_FOOT_RADIUS);
        return clear;
    }

    private segmentOverlapsSolidMapTile(fromX: number, fromY: number, toX: number, toY: number, radius: number): boolean {
        const distance = Math.hypot(toX - fromX, toY - fromY);
        const steps = Math.max(1, Math.ceil(distance / (MAP_TILE_SIZE * 0.5)));
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const x = fromX + (toX - fromX) * t;
            const y = fromY + (toY - fromY) * t;
            if (this.mapSolidOverlapsAabb(x, y, radius, radius)) return true;
        }
        return false;
    }

    private shouldRefreshEnemyPath(se: ServerEnemy, target: PlayerState): boolean {
        if (!se.pathTargetCell || se.pathRefreshMs === 0) return true;

        const targetCell = this.worldToBuildCell(target.x, target.y + PLAYER_TREE_Y_OFFSET);
        return this.gridDistance(se.pathTargetCell, targetCell) >= ENEMY_PATH_TARGET_REFRESH_CELLS;
    }

    private refreshEnemyWoodBlockPath(enemy: EnemyState, se: ServerEnemy, target: PlayerState): boolean {
        const targetCell = this.worldToBuildCell(target.x, target.y + PLAYER_TREE_Y_OFFSET);
        se.path = this.findEnemyWoodBlockPath(enemy, target);
        se.pathRefreshMs = ENEMY_PATH_REFRESH_MS;
        se.pathTargetCell = targetCell;
        return se.path.length > 0;
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
                continue;
            }

            const step = Math.min(moveDistance, distance);
            const resolved = this.moveEnemyWithWoodBlocks(
                enemy,
                enemy.x + (dx / distance) * step,
                enemy.y + (dy / distance) * step,
            );
            const moved = Math.hypot(resolved.x - enemy.x, resolved.y - enemy.y) > 0.1;
            enemy.x = resolved.x;
            enemy.y = resolved.y;
            return moved;
        }

        return false;
    }

    private tickEnemyWoodBlockAttack(enemyId: string, enemy: EnemyState, se: ServerEnemy, block: WoodBlockState, dtMs: number, moveDistance = 0): boolean {
        se.targetWoodBlockId = block.id;
        const footX = enemy.x;
        const footY = enemy.y + ENEMY_FOOT_Y_OFFSET;
        const distanceSq = pointAabbDistanceSq(
            footX,
            footY,
            block.x,
            block.y,
            BUILD_BLOCK_HALF_SIZE,
            BUILD_BLOCK_HALF_SIZE,
        );
        const attackRange = ENEMY1_ATTACK_RANGE + ENEMY1_ATTACK_TRIGGER_EPSILON + ENEMY_FOOT_RADIUS;
        const direction = directionFromInput(block.x - enemy.x, block.y - enemy.y);
        if (direction) enemy.facingDirection = direction;

        if (distanceSq > attackRange * attackRange) {
            se.mode = "chase";
            se.modeMs = 0;
            enemy.action = "run";
            if (moveDistance > 0) {
                const dx = block.x - footX;
                const dy = block.y - footY;
                const distance = Math.hypot(dx, dy);
                if (distance > 0) {
                    const resolved = this.moveEnemyWithWoodBlocks(
                        enemy,
                        enemy.x + (dx / distance) * moveDistance,
                        enemy.y + (dy / distance) * moveDistance,
                    );
                    enemy.x = resolved.x;
                    enemy.y = resolved.y;
                }
            }
            return true;
        }

        se.path = [];
        if (se.mode === "woodAttack") {
            enemy.action = "attack";
            se.modeMs = Math.max(0, se.modeMs - dtMs);
            if (se.modeMs === 0) {
                se.mode = "woodWindup";
                se.modeMs = ENEMY1_WINDUP_MS;
                enemy.action = "idle";
            }
            return true;
        }

        enemy.action = "idle";
        if (se.mode !== "woodWindup") {
            se.mode = "woodWindup";
            se.modeMs = ENEMY1_WINDUP_MS;
            return true;
        }

        se.modeMs = Math.max(0, se.modeMs - dtMs);
        if (se.modeMs === 0) {
            se.mode = "woodAttack";
            se.modeMs = ENEMY1_ATTACK_MS;
            enemy.action = "attack";
            enemy.attackSeq++;
            const targetBlockId = block.id;
            setTimeout(() => {
                this.applyEnemyWoodBlockImpact(enemyId, targetBlockId);
            }, ENEMY1_DAMAGE_IMPACT_DELAY_MS);
        }

        return true;
    }

    private findEnemyBlockingWoodBlock(enemy: EnemyState, target: PlayerState): WoodBlockState | null {
        return this.findBlockingWoodBlockToPoint(
            enemy.x,
            enemy.y + ENEMY_FOOT_Y_OFFSET,
            target.x,
            target.y + PLAYER_TREE_Y_OFFSET,
        );
    }

    private findBlockingWoodBlockToPoint(fromX: number, fromY: number, toX: number, toY: number): WoodBlockState | null {
        let nearestBlock: WoodBlockState | null = null;
        let nearestT = Number.POSITIVE_INFINITY;

        this.state.woodBlocks.forEach((block) => {
            const t = segmentAabbIntersectionT(
                fromX,
                fromY,
                toX,
                toY,
                block.x,
                block.y,
                BUILD_BLOCK_HALF_SIZE + ENEMY_ATTACK_WOOD_BLOCK_PADDING,
                BUILD_BLOCK_HALF_SIZE + ENEMY_ATTACK_WOOD_BLOCK_PADDING,
            );
            if (t === null) return;
            if (t < nearestT) {
                nearestBlock = block;
                nearestT = t;
            }
        });

        return nearestBlock;
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
                player.y,
                PLAYER_HW,
                PLAYER_HH,
            )) return;

            const hurt = this.damagePlayer(playerId, sp, player, DARK_KNIGHT_ATTACK_DAMAGE, enemyId);
            if (hurt) this.broadcast("playerHurt", hurt);
        });

        const destroyedWoodBlockIds: string[] = [];
        this.state.woodBlocks.forEach((block, blockId) => {
            if (!circleOverlapsAabb(
                impactX,
                impactY,
                DARK_KNIGHT_AOE_RADIUS,
                block.x,
                block.y,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
            )) return;

            block.health = Math.max(0, block.health - DARK_KNIGHT_ATTACK_DAMAGE);
            if (block.health <= 0) destroyedWoodBlockIds.push(blockId);
        });
        destroyedWoodBlockIds.forEach((blockId) => this.state.woodBlocks.delete(blockId));
    }

    private findNearestEnemyWoodBlockInAttackRange(enemy: EnemyState): WoodBlockState | null {
        const footX = enemy.x;
        const footY = enemy.y + ENEMY_FOOT_Y_OFFSET;
        const attackRange = ENEMY1_ATTACK_RANGE + ENEMY1_ATTACK_TRIGGER_EPSILON + ENEMY_FOOT_RADIUS;
        const attackRangeSq = attackRange * attackRange;
        let nearestBlock: WoodBlockState | null = null;
        let nearestDistanceSq = Number.POSITIVE_INFINITY;

        this.state.woodBlocks.forEach((block) => {
            const distanceSq = pointAabbDistanceSq(
                footX,
                footY,
                block.x,
                block.y,
                BUILD_BLOCK_HALF_SIZE,
                BUILD_BLOCK_HALF_SIZE,
            );
            if (distanceSq > attackRangeSq || distanceSq >= nearestDistanceSq) return;
            nearestBlock = block;
            nearestDistanceSq = distanceSq;
        });

        return nearestBlock;
    }

    private applyEnemyWoodBlockImpact(enemyId: string, blockId: string) {
        if (this.state.gameOver) return;
        const enemy = this.state.enemies.get(enemyId);
        const block = this.state.woodBlocks.get(blockId);
        if (!enemy || enemy.isDead || !block) return;

        const attackRange = ENEMY1_ATTACK_RANGE + ENEMY1_ATTACK_TRIGGER_EPSILON + ENEMY_FOOT_RADIUS;
        const distanceSq = pointAabbDistanceSq(
            enemy.x,
            enemy.y + ENEMY_FOOT_Y_OFFSET,
            block.x,
            block.y,
            BUILD_BLOCK_HALF_SIZE,
            BUILD_BLOCK_HALF_SIZE,
        );
        if (distanceSq > attackRange * attackRange) return;

        block.health = Math.max(0, block.health - ENEMY_WOOD_BLOCK_ATTACK_DAMAGE);
        if (block.health <= 0) {
            this.state.woodBlocks.delete(blockId);
        }
    }

    private findEnemyWoodBlockPath(enemy: EnemyState, target: PlayerState): PathCell[] {
        const start = this.worldToBuildCell(enemy.x, enemy.y + ENEMY_FOOT_Y_OFFSET);
        const targetCenter = this.worldToBuildCell(target.x, target.y + PLAYER_TREE_Y_OFFSET);
        if (this.isBuildPathCellBlocked(start.col, start.row)) return [];

        const targetCells: PathCell[] = [];
        for (let radius = 0; radius <= 3; radius++) {
            for (let row = targetCenter.row - radius; row <= targetCenter.row + radius; row++) {
                for (let col = targetCenter.col - radius; col <= targetCenter.col + radius; col++) {
                    if (Math.max(Math.abs(col - targetCenter.col), Math.abs(row - targetCenter.row)) !== radius) continue;
                    if (!this.isBuildPathCellInside(col, row) || this.isBuildPathCellBlocked(col, row)) continue;
                    targetCells.push({ col, row });
                }
            }
            if (targetCells.length > 0) break;
        }

        if (targetCells.length === 0) return [];
        targetCells.sort((a, b) => this.gridDistance(start, a) - this.gridDistance(start, b));
        const targetKeys = new Set(targetCells.map(cell => this.buildCellKey(cell.col, cell.row)));

        const open: Array<PathCell & { g: number; f: number }> = [{ ...start, g: 0, f: this.pathHeuristic(start, targetCells) }];
        const cameFrom = new Map<string, string>();
        const bestG = new Map<string, number>([[this.buildCellKey(start.col, start.row), 0]]);
        const closed = new Set<string>();
        let visited = 0;

        while (open.length > 0 && visited < ENEMY_PATH_MAX_VISITED_CELLS) {
            open.sort((a, b) => a.f - b.f);
            const current = open.shift();
            if (!current) break;

            const currentKey = this.buildCellKey(current.col, current.row);
            if (closed.has(currentKey)) continue;
            closed.add(currentKey);
            visited++;

            if (targetKeys.has(currentKey)) {
                return this.reconstructBuildPath(cameFrom, currentKey).slice(1);
            }

            for (const neighbor of this.getBuildPathNeighbors(current.col, current.row)) {
                const neighborKey = this.buildCellKey(neighbor.col, neighbor.row);
                if (closed.has(neighborKey)) continue;

                const tentativeG = current.g + 1;
                if (tentativeG >= (bestG.get(neighborKey) ?? Number.POSITIVE_INFINITY)) continue;

                cameFrom.set(neighborKey, currentKey);
                bestG.set(neighborKey, tentativeG);
                open.push({
                    ...neighbor,
                    g: tentativeG,
                    f: tentativeG + this.pathHeuristic(neighbor, targetCells),
                });
            }
        }

        return [];
    }

    private getBuildPathNeighbors(col: number, row: number): PathCell[] {
        const candidates = [
            { col: col + 1, row },
            { col: col - 1, row },
            { col, row: row + 1 },
            { col, row: row - 1 },
        ];

        return candidates.filter(cell => this.isBuildPathCellInside(cell.col, cell.row)
            && !this.isBuildPathCellBlocked(cell.col, cell.row));
    }

    private reconstructBuildPath(cameFrom: Map<string, string>, endKey: string): PathCell[] {
        const pathKeys = [endKey];
        let currentKey = endKey;
        while (cameFrom.has(currentKey)) {
            currentKey = cameFrom.get(currentKey)!;
            pathKeys.push(currentKey);
        }

        return pathKeys.reverse().map(key => {
            const [col, row] = key.split(":").map(Number);
            return { col, row };
        });
    }

    private pathHeuristic(cell: PathCell, targets: PathCell[]): number {
        return Math.min(...targets.map(target => this.gridDistance(cell, target)));
    }

    private gridDistance(a: PathCell, b: PathCell): number {
        return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
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

    private isBuildPathCellInside(col: number, row: number): boolean {
        return col >= 0 && row >= 0
            && col < Math.ceil(WORLD_WIDTH / BUILD_GRID_SIZE)
            && row < Math.ceil(WORLD_HEIGHT / BUILD_GRID_SIZE);
    }

    private isBuildPathCellBlocked(col: number, row: number): boolean {
        if (this.state.woodBlocks.has(`wood-${col}-${row}`)) return true;
        const center = this.buildCellCenter({ col, row });
        return this.mapSolidOverlapsAabb(center.x, center.y, ENEMY_FOOT_RADIUS, ENEMY_FOOT_RADIUS);
    }

    private separateEnemyFeet() {
        const enemies = [...this.state.enemies.entries()];
        const minDistance = ENEMY_FOOT_RADIUS * 2;
        const minDistanceSq = minDistance * minDistance;

        for (let iteration = 0; iteration < ENEMY_SEPARATION_ITERATIONS; iteration++) {
            for (let i = 0; i < enemies.length; i++) {
                const [idA, enemyA] = enemies[i];
                const serverA = this.serverEnemies.get(idA);
                if (!serverA) continue;

                for (let j = i + 1; j < enemies.length; j++) {
                    const [idB, enemyB] = enemies[j];
                    const serverB = this.serverEnemies.get(idB);
                    if (!serverB) continue;

                    const footAx = enemyA.x;
                    const footAy = enemyA.y + ENEMY_FOOT_Y_OFFSET;
                    const footBx = enemyB.x;
                    const footBy = enemyB.y + ENEMY_FOOT_Y_OFFSET;
                    let dx = footBx - footAx;
                    let dy = footBy - footAy;
                    let distanceSq = dx * dx + dy * dy;
                    if (distanceSq >= minDistanceSq) continue;

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
                }
            }
        }
    }

    private findNearestAlivePlayer(x: number, y: number): { id: string; player: PlayerState; distanceSq: number } | null {
        let nearest: { id: string; player: PlayerState; distanceSq: number } | null = null;

        this.state.players.forEach((player, id) => {
            const sp = this.serverPlayers.get(id);
            if (!sp || !sp.alive || player.isDead) return;

            const dx = player.x - x;
            const dy = player.y - y;
            const distanceSq = dx * dx + dy * dy;
            if (!nearest || distanceSq < nearest.distanceSq) {
                nearest = { id, player, distanceSq };
            }
        });

        return nearest;
    }

    // ─── Enemy bullets ────────────────────────────────────────────────────────
    private applyEnemyAttackImpact(enemyId: string, attackOrigin: AttackOrigin, vector: AttackVector) {
        if (this.state.gameOver || !this.state.enemies.has(enemyId)) return;

        const hitX = attackOrigin.x + vector.x * ENEMY1_ATTACK_HIT_OFFSET;
        const hitY = attackOrigin.y + vector.y * ENEMY1_ATTACK_HIT_OFFSET;

        this.state.players.forEach((player, playerId) => {
            const sp = this.serverPlayers.get(playerId);
            if (!sp || !sp.alive || player.isDead) return;

            if (!overlaps(player.x, player.y, PLAYER_HW, PLAYER_HH, hitX, hitY, ENEMY1_ATTACK_HIT_HW, ENEMY1_ATTACK_HIT_HH)) return;
            if (this.isEnemyAttackBlockedByWood(attackOrigin, player)) return;

            const hurt = this.damagePlayer(playerId, sp, player, ENEMY1_ATTACK_DAMAGE, enemyId);
            if (hurt) this.broadcast("playerHurt", hurt);
        });
    }

    private isEnemyAttackBlockedByWood(attackOrigin: AttackOrigin, player: PlayerState): boolean {
        let nearestBlockT = Number.POSITIVE_INFINITY;

        this.state.woodBlocks.forEach((block) => {
            const t = segmentAabbIntersectionT(
                attackOrigin.x,
                attackOrigin.y,
                player.x,
                player.y,
                block.x,
                block.y,
                BUILD_BLOCK_HALF_SIZE + ENEMY_ATTACK_WOOD_BLOCK_PADDING,
                BUILD_BLOCK_HALF_SIZE + ENEMY_ATTACK_WOOD_BLOCK_PADDING,
            );
            if (t !== null && t < nearestBlockT) nearestBlockT = t;
        });

        return nearestBlockT < 1;
    }

    private getEnemyAttackVector(attackOrigin: AttackOrigin, target: PlayerState, fallbackDirection: string): AttackVector {
        const dx = target.x - attackOrigin.x;
        const dy = target.y - attackOrigin.y;
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

    private spawnCasterFireball(x: number, y: number, target: PlayerState) {
        const dx = target.x - x;
        const dy = target.y - y;
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
                if (overlaps(player.x, player.y, PLAYER_HW, PLAYER_HH, bullet.x, bullet.y, EB_HW, EB_HH)) {
                    deadEB.push(bid);
                    const hurt = this.damagePlayer(sid, sp, player, bullet.power || ENEMY1_ATTACK_DAMAGE, bid);
                    if (hurt) this.broadcast("playerHurt", hurt);
                }
            });

            deadEB.forEach(id => { this.state.enemyBullets.delete(id); this.serverEnemyBullets.delete(id); });
        });
    }

    // ─── Player death ─────────────────────────────────────────────────────────
    private damagePlayer(sid: string, sp: ServerPlayer, player: PlayerState, damage: number, attackerId: string): PlayerHurtPayload | null {
        if (!sp.alive || player.isDead || damage <= 0) return null;

        player.health = Math.max(0, player.health - damage);
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
        this.clearBowCharge(player, sp);
        sp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
        player.isDead = true;
        player.health = 0;
        player.reviveProgress = 0;
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
        this.state.gameOver = true;
        this.gameOverRestartMs = GAME_OVER_RESTART_SECONDS * 1000;
        this.state.gameOverCountdown = GAME_OVER_RESTART_SECONDS;
        this.serverPlayers.forEach((sp) => {
            sp.vx = 0;
            sp.vy = 0;
            sp.bowCharging = false;
            sp.bowChargeMs = 0;
            sp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
            sp.revivingTargetId = null;
        });
        this.state.players.forEach((player) => {
            player.bowCharging = false;
            player.bowChargeProgress = 0;
        });
    }
}
