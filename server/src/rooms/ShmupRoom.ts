import { Room, Client } from "colyseus";
import {
    GameRoomState,
    PlayerState,
    EnemyState,
    PlayerBulletState,
    EnemyBulletState,
    TreeState,
    LogState,
} from "../schema/GameState";

// ─── Physics constants (mirror the Phaser client values) ──────────────────────
const PLAYER_MAX_VEL  = 300;   // px/s
const FIRE_RATE_MS    = 167;   // ≈ 10 frames at 60 fps
const P_BULLET_VEL    = 1000;  // px/s upward
const VIEW_WIDTH      = 1280;
const VIEW_HEIGHT     = 720;
const WORLD_WIDTH     = VIEW_WIDTH * 3;
const WORLD_HEIGHT    = VIEW_HEIGHT * 3;
const TREE_COUNT = 25;
const TREE_GRID_COLS = 5;
const TREE_GRID_ROWS = 5;
const TREE_EDGE_PADDING = 192;
const TREE_SPAWN_CLEAR_RADIUS = 300;
const TREE_TRUNK_Y_OFFSET = -18;

// Half-extents used for AABB collision detection
const PLAYER_HW  = 56;  const PLAYER_HH  = 56;
const ENEMY_HW   = 28;  const ENEMY_HH   = 28;
const PB_HW      = 6;   const PB_HH      = 16;  // player bullet
const EB_HW      = 8;   const EB_HH      = 12;  // enemy bullet
const PLAYER_TREE_FOOT_RADIUS = 5;
const PLAYER_TREE_Y_OFFSET = 36;
const TREE_TRUNK_HW = 5;
const TREE_TRUNK_HH = 18;
const MAX_PLAYER_MOVE_STEP = 3;
const ATTACK_LOCK_MS = 250;
const ATTACK_COOLDOWN_MS = 850;
const TREE_HEALTH = 4;
const ATTACK_HIT_RADIUS = 36;
const ATTACK_HIT_OFFSET = 36;
const ATTACK_HIT_ORIGIN_Y_OFFSET = 18;
const LOG_WORLD_PADDING = 16;
const LOG_DROP_OFFSETS: [number, number][] = [
    [-18, -6],
    [0, -10],
    [18, -6],
    [-9, 10],
    [11, 8],
];
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
    input: { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean };
    alive: boolean;
}
interface ServerEnemy   { pathIndex: number; pathSpeed: number; pathId: number; fireCounter: number; power: number; }
interface ServerBullet  { vy: number; }
interface TreeHitPayload {
    treeId: string;
    attackerId: string;
    x: number;
    y: number;
    remainingHealth: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _id = 0;
const nextId  = () => String(++_id);
const rndInt  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndReal = (min: number, max: number) => Math.random() * (max - min) + min;

const INITIAL_SPAWN_DELAY = 500; // ms before the first enemy wave

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function directionFromInput(inputX: number, inputY: number): string | null {
    const horizontal = inputX > 0 ? "E" : inputX < 0 ? "W" : "";
    const vertical = inputY > 0 ? "S" : inputY < 0 ? "N" : "";

    if (!horizontal && !vertical) return null;
    if (horizontal && vertical) return `${vertical}${horizontal}`;
    return horizontal || vertical;
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
    private serverEnemyBullets  = new Map<string, ServerBullet>();
    private serverTreeHealth    = new Map<string, number>();
    private spawnTimer          = 0; // ms until next enemy wave

    private generateRoomCode(): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let code: string;
        do {
            code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 26)]).join("");
        } while (_usedCodes.has(code));
        _usedCodes.add(code);
        return code;
    }

    onCreate() {
        this.roomId = this.generateRoomCode();
        const state = new GameRoomState();
        state.worldWidth = WORLD_WIDTH;
        state.worldHeight = WORLD_HEIGHT;
        this.setState(state);
        this.generateTrees();
        // 20 ticks per second
        this.setSimulationInterval((dt) => this.tick(dt), 50);

        this.onMessage("input", (client, data) => {
            const sp = this.serverPlayers.get(client.sessionId);
            if (!sp) return;
            sp.input.left  = !!data.left;
            sp.input.right = !!data.right;
            sp.input.up    = !!data.up;
            sp.input.down  = !!data.down;
            sp.input.fire  = !!data.fire;
        });

        this.onMessage("attack", (client, data) => {
            const sp = this.serverPlayers.get(client.sessionId);
            const player = this.state.players.get(client.sessionId);
            if (!sp || !sp.alive || !player || this.state.gameOver) return;
            if (sp.attackCooldownMs > 0) return;

            const attackDirection = normalizeAttackDirection(data?.direction, player.facingDirection || "N");
            player.facingDirection = attackDirection;
            player.attackDirection = attackDirection;
            player.attackSeq++;
            sp.attackLockMs = ATTACK_LOCK_MS;
            sp.attackLockX = player.x;
            sp.attackLockY = player.y;
            sp.attackCooldownMs = ATTACK_COOLDOWN_MS;
            sp.vx = 0;
            sp.vy = 0;
            const treeHit = this.damageTreeFromAttack(player, client.sessionId, attackDirection);
            if (treeHit) this.broadcast("treeHit", treeHit);
        });
    }

    onJoin(client: Client) {
        // When the previous game ended, reset everything so the rejoining
        // player (or a fresh page-load) starts a clean new game.
        if (this.state.gameOver) {
            this.resetGame();
        }

        const ps = new PlayerState();
        ps.sessionId = client.sessionId;
        ps.x = WORLD_WIDTH / 2;
        ps.y = WORLD_HEIGHT / 2;
        ps.health = 1;
        ps.facingDirection = "N";
        ps.attackDirection = "N";
        ps.attackSeq = 0;
        this.state.players.set(client.sessionId, ps);

        this.serverPlayers.set(client.sessionId, {
            vx: 0, vy: 0,
            fireCounter: 0,
            attackLockMs: 0,
            attackLockX: ps.x,
            attackLockY: ps.y,
            attackCooldownMs: 0,
            input: { left: false, right: false, up: false, down: false, fire: false },
            alive: true,
        });

        if (!this.state.gameStarted) {
            this.state.gameStarted = true;
            this.spawnTimer = INITIAL_SPAWN_DELAY; // first wave shortly after start
        }
    }

    // ─── Reset game state (called when a player rejoins after game over) ──────
    private resetGame() {
        this.state.players.clear();
        this.serverPlayers.clear();
        this.state.enemies.clear();
        this.serverEnemies.clear();
        this.state.playerBullets.clear();
        this.serverPlayerBullets.clear();
        this.state.enemyBullets.clear();
        this.serverEnemyBullets.clear();
        this.state.logs.clear();
        this.generateTrees();

        this.state.teamScore = 0;
        this.state.gameOver  = false;
        this.spawnTimer      = INITIAL_SPAWN_DELAY;
    }

    onLeave(client: Client) {
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

                for (let attempt = 0; attempt < 12; attempt++) {
                    x = TREE_EDGE_PADDING + col * cellWidth + rndReal(cellWidth * 0.2, cellWidth * 0.8);
                    y = TREE_EDGE_PADDING + row * cellHeight + rndReal(cellHeight * 0.2, cellHeight * 0.8);

                    if (Math.hypot(x - spawnX, y - spawnY) >= TREE_SPAWN_CLEAR_RADIUS) break;
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

                const tree = new TreeState();
                tree.id = `tree-${++treeIndex}`;
                tree.x = x;
                tree.y = y;
                this.state.trees.set(tree.id, tree);
                this.serverTreeHealth.set(tree.id, TREE_HEALTH);
            }
        }
    }

    private damageTreeFromAttack(player: PlayerState, attackerId: string, direction: string): TreeHitPayload | null {
        const hitTreeId = this.findTreeHitByAttack(player, direction);
        if (!hitTreeId) return null;

        const tree = this.state.trees.get(hitTreeId);
        if (!tree) {
            this.serverTreeHealth.delete(hitTreeId);
            return null;
        }

        const nextHealth = Math.max(0, (this.serverTreeHealth.get(hitTreeId) ?? TREE_HEALTH) - 1);
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
        this.state.trees.delete(hitTreeId);
        this.serverTreeHealth.delete(hitTreeId);
        return hitPayload;
    }

    private findTreeHitByAttack(player: PlayerState, direction: string): string | null {
        const vector = DIRECTION_VECTORS[direction] || DIRECTION_VECTORS.N;
        const attackX = player.x + vector.x * ATTACK_HIT_OFFSET;
        const attackY = player.y + ATTACK_HIT_ORIGIN_Y_OFFSET + vector.y * ATTACK_HIT_OFFSET;
        let closestTreeId: string | null = null;
        let closestDistanceSq = Number.POSITIVE_INFINITY;

        this.state.trees.forEach((tree, id) => {
            if (!circleOverlapsAabb(
                attackX,
                attackY,
                ATTACK_HIT_RADIUS,
                tree.x,
                tree.y + TREE_TRUNK_Y_OFFSET,
                TREE_TRUNK_HW,
                TREE_TRUNK_HH,
            )) return;

            const dx = attackX - tree.x;
            const dy = attackY - (tree.y + TREE_TRUNK_Y_OFFSET);
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq < closestDistanceSq) {
                closestDistanceSq = distanceSq;
                closestTreeId = id;
            }
        });

        return closestTreeId;
    }

    private spawnLogsForTree(tree: TreeState) {
        LOG_DROP_OFFSETS.forEach(([offsetX, offsetY]) => {
            const log = new LogState();
            log.id = `log-${nextId()}`;
            log.x = clamp(tree.x + offsetX, LOG_WORLD_PADDING, WORLD_WIDTH - LOG_WORLD_PADDING);
            log.y = clamp(tree.y - 8 + offsetY, LOG_WORLD_PADDING, WORLD_HEIGHT - LOG_WORLD_PADDING);
            this.state.logs.set(log.id, log);
        });
    }

    // ─── Main tick ────────────────────────────────────────────────────────────
    private tick(dt: number) {
        if (!this.state.gameStarted || this.state.gameOver) return;
        const dtSec = dt / 1000;

        this.tickPlayers(dtSec, dt);
        this.tickPlayerBullets(dtSec);
        this.tickEnemies(dtSec, dt);
        this.tickEnemyBullets(dtSec);
        this.tickCollisions();

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
                const resolved = this.movePlayerWithTestTree(player, nextX, nextY);
                if (resolved.x === player.x && nextX !== player.x) sp.vx = 0;
                if (resolved.y === player.y && nextY !== player.y) sp.vy = 0;
                player.x = resolved.x;
                player.y = resolved.y;
            }

            sp.fireCounter = Math.max(0, sp.fireCounter - dtMs);
            if (fire && sp.fireCounter === 0) {
                sp.fireCounter = FIRE_RATE_MS;
                this.spawnPlayerBullet(player.x, player.y - PLAYER_HH, 1, sid);
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

    private movePlayerWithTestTree(player: PlayerState, nextX: number, nextY: number): { x: number; y: number } {
        const dx = nextX - player.x;
        const dy = nextY - player.y;
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_PLAYER_MOVE_STEP));
        const stepX = dx / steps;
        const stepY = dy / steps;
        let resolvedX = player.x;
        let resolvedY = player.y;

        for (let i = 0; i < steps; i++) {
            const candidateX = clamp(resolvedX + stepX, PLAYER_HW, WORLD_WIDTH - PLAYER_HW);
            if (!this.collidesWithTestTreeTrunk(candidateX, resolvedY)) {
                resolvedX = candidateX;
            }

            const candidateY = clamp(resolvedY + stepY, PLAYER_HH, WORLD_HEIGHT - PLAYER_HH);
            if (!this.collidesWithTestTreeTrunk(resolvedX, candidateY)) {
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
        this.state.playerBullets.set(id, b);
        this.serverPlayerBullets.set(id, { vy: -P_BULLET_VEL });
    }

    private tickPlayerBullets(dtSec: number) {
        const dead: string[] = [];
        this.state.playerBullets.forEach((b, id) => {
            const sb = this.serverPlayerBullets.get(id);
            if (!sb) { dead.push(id); return; }
            b.y += sb.vy * dtSec;
            if (b.y < -PB_HH || b.y > WORLD_HEIGHT + PB_HH || b.x < -PB_HW || b.x > WORLD_WIDTH + PB_HW) dead.push(id);
        });
        dead.forEach(id => { this.state.playerBullets.delete(id); this.serverPlayerBullets.delete(id); });
    }

    // ─── Enemies ──────────────────────────────────────────────────────────────
    private spawnWave() {
        const count    = rndInt(5, 15);
        const interval = rndInt(800, 1200);
        const pathId   = rndInt(0, 3);
        const shipId   = rndInt(0, 11);
        const power    = rndInt(1, 4);
        const speed    = rndReal(0.0001, 0.001);

        this.spawnTimer = rndInt(5, 8) * 1000; // schedule next wave

        let spawned = 0;
        const spawnOne = () => {
            if (spawned >= count || this.state.gameOver) return;
            spawned++;
            this.spawnEnemy(shipId, pathId, speed, power);
            if (spawned < count) setTimeout(spawnOne, interval);
        };
        spawnOne();
    }

    private spawnEnemy(shipId: number, pathId: number, speed: number, power: number) {
        const id  = nextId();
        const pt  = splineGetPoint(ENEMY_PATHS[pathId], 0);
        const e   = new EnemyState();
        e.id = id; e.x = pt.x; e.y = pt.y; e.shipId = shipId; e.power = power; e.health = 1;
        this.state.enemies.set(id, e);
        this.serverEnemies.set(id, {
            pathIndex: 0, pathSpeed: speed, pathId, power,
            fireCounter: rndInt(100, 300) * (1000 / 60),
        });
    }

    private tickEnemies(dtSec: number, dtMs: number) {
        const dead: string[] = [];
        this.state.enemies.forEach((enemy, id) => {
            const se = this.serverEnemies.get(id);
            if (!se) { dead.push(id); return; }

            // pathSpeed is per-frame at 60 fps — normalise to current dt
            se.pathIndex += se.pathSpeed * 60 * dtSec;
            if (se.pathIndex >= 1) { dead.push(id); return; }

            const pt = splineGetPoint(ENEMY_PATHS[se.pathId], se.pathIndex);
            enemy.x  = pt.x;
            enemy.y  = pt.y;

            se.fireCounter -= dtMs;
            if (se.fireCounter <= 0) {
                se.fireCounter = rndInt(100, 300) * (1000 / 60);
                this.spawnEnemyBullet(enemy.x, enemy.y, se.power);
            }
        });
        dead.forEach(id => { this.state.enemies.delete(id); this.serverEnemies.delete(id); });
    }

    // ─── Enemy bullets ────────────────────────────────────────────────────────
    private spawnEnemyBullet(x: number, y: number, power: number) {
        const id = nextId();
        const b  = new EnemyBulletState();
        b.id = id; b.x = x; b.y = y; b.power = power;
        this.state.enemyBullets.set(id, b);
        this.serverEnemyBullets.set(id, { vy: 200 * power * 0.5 });
    }

    private tickEnemyBullets(dtSec: number) {
        const dead: string[] = [];
        this.state.enemyBullets.forEach((b, id) => {
            const sb = this.serverEnemyBullets.get(id);
            if (!sb) { dead.push(id); return; }
            b.y += sb.vy * dtSec;
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
            this.state.enemies.forEach((enemy, eid) => {
                if (deadBullets.includes(bid) || deadEnemies.includes(eid)) return;
                if (overlaps(bullet.x, bullet.y, PB_HW, PB_HH, enemy.x, enemy.y, ENEMY_HW, ENEMY_HH)) {
                    const owner = this.state.players.get(bullet.ownerId);
                    if (owner) owner.kills++;
                    this.state.teamScore += 10;
                    deadBullets.push(bid);
                    enemy.health -= bullet.power;
                    if (enemy.health <= 0) deadEnemies.push(eid);
                }
            });
        });

        deadBullets.forEach(id => { this.state.playerBullets.delete(id); this.serverPlayerBullets.delete(id); });
        deadEnemies.forEach(id => { this.state.enemies.delete(id); this.serverEnemies.delete(id); });

        // Enemy bullets vs players  /  enemies vs players
        this.state.players.forEach((player, sid) => {
            const sp = this.serverPlayers.get(sid);
            if (!sp || !sp.alive) return;

            const deadEB: string[] = [];

            this.state.enemyBullets.forEach((bullet, bid) => {
                if (!sp.alive || deadEB.includes(bid)) return;
                if (overlaps(player.x, player.y, PLAYER_HW, PLAYER_HH, bullet.x, bullet.y, EB_HW, EB_HH)) {
                    deadEB.push(bid);
                    this.killPlayer(sid, sp, player);
                }
            });

            deadEB.forEach(id => { this.state.enemyBullets.delete(id); this.serverEnemyBullets.delete(id); });

            if (!sp.alive) return;

            this.state.enemies.forEach((enemy) => {
                if (!sp.alive) return;
                if (overlaps(player.x, player.y, PLAYER_HW, PLAYER_HH, enemy.x, enemy.y, ENEMY_HW, ENEMY_HH)) {
                    this.killPlayer(sid, sp, player);
                }
            });
        });
    }

    // ─── Player death ─────────────────────────────────────────────────────────
    private killPlayer(sid: string, sp: ServerPlayer, player: PlayerState) {
        if (!sp.alive) return;
        sp.alive   = false;
        player.isDead = true;
        player.health = 0;
        this.checkAllDead();
    }

    private checkAllDead() {
        if (this.state.gameOver) return;
        if (this.state.players.size === 0) { this.state.gameOver = true; return; }
        const anyAlive = [...this.serverPlayers.values()].some(sp => sp.alive);
        if (!anyAlive) this.state.gameOver = true;
    }
}
