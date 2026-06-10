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
const PLAYER_MAX_HEALTH = 5;
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
const TREE_ATTACK_IMPACT_DELAY_MS = 140;
const ENEMY_ATTACK_IMPACT_DELAY_MS = 225;
const TREE_HEALTH = 4;
const WOOD_PILE_AMOUNT = 5;
const WOOD_PICKUP_RADIUS = 48;
const REVIVE_DURATION_MS = 2500;
const REVIVE_RADIUS = 64;
const ATTACK_HIT_RADIUS = 44;
const ATTACK_HIT_START_OFFSET = 10;
const ATTACK_HIT_END_OFFSET = 40;
const ATTACK_HIT_ORIGIN_Y_OFFSET = 18;
const ATTACK_TARGET_MIN_DISTANCE = 4;
const LOG_WORLD_PADDING = 16;
const ENEMY1_COUNT = 3;
const ENEMY2_COUNT = 3;
const ENEMY_WAVE_COUNT = 3;
const ENEMY_WAVE_INTERVAL_MS = 30000;
const ENEMY1_SPEED = 135;
const ENEMY1_ATTACK_RANGE = 20;
const ENEMY1_ATTACK_TRIGGER_EPSILON = 6;
const ENEMY1_MIN_CHASE_STEP = 1;
const ENEMY1_WINDUP_MS = 175;
const ENEMY1_ATTACK_MS = 850;
const ENEMY_DEATH_REMOVE_MS = 850;
const ENEMY_HIT_STUN_MS = 250;
const ENEMY1_EDGE_OFFSET = 96;
const ENEMY1_DAMAGE_IMPACT_DELAY_MS = 225;
const ENEMY1_ATTACK_DAMAGE = 1;
const ENEMY1_ATTACK_HIT_OFFSET = 28;
const ENEMY1_ATTACK_HIT_HW = 42;
const ENEMY1_ATTACK_HIT_HH = 36;
const ENEMY_MELEE_HIT_HW = 34;
const ENEMY_MELEE_HIT_HH = 44;
const ENEMY_FOOT_RADIUS = 7;
const ENEMY_FOOT_Y_OFFSET = 34;
const ENEMY_SEPARATION_ITERATIONS = 2;
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
    revivingTargetId: string | null;
    input: { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean; interact: boolean };
    alive: boolean;
}
type EnemyMode = "chase" | "windup" | "attack" | "stun";
interface ServerEnemy   { mode: EnemyMode; modeMs: number; targetId: string | null; }
interface ServerBullet  { vy: number; }
interface AttackOrigin {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _id = 0;
const nextId  = () => String(++_id);
const rndInt  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndReal = (min: number, max: number) => Math.random() * (max - min) + min;

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
    private elapsedMs           = 0;
    private enemyWaveElapsedMs  = 0;

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
                if (this.tryPickupWood(client.sessionId)) {
                    client.send("woodPickup", { amount: WOOD_PILE_AMOUNT });
                }
            }
        });

        this.onMessage("attack", (client, data) => {
            const sp = this.serverPlayers.get(client.sessionId);
            const player = this.state.players.get(client.sessionId);
            if (!sp || !sp.alive || !player || this.state.gameOver) return;
            if (sp.attackCooldownMs > 0) return;
            this.cancelRevive(client.sessionId);

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
        ps.health = PLAYER_MAX_HEALTH;
        ps.wood = 0;
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
            revivingTargetId: null,
            input: { left: false, right: false, up: false, down: false, fire: false, interact: false },
            alive: true,
        });

        if (!this.state.gameStarted) {
            this.state.gameStarted = true;
            this.elapsedMs = 0;
            this.enemyWaveElapsedMs = 0;
            this.state.elapsedSeconds = 0;
            this.spawnInitialEnemies();
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
        this.elapsedMs = 0;
        this.enemyWaveElapsedMs = 0;
        this.state.elapsedSeconds = 0;
        this.state.gameOver  = false;
        if (this.state.gameStarted) this.spawnInitialEnemies();
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

            enemy.health = Math.max(0, enemy.health - 1);
            if (enemy.health > 0) {
                enemy.damageSeq++;
                const se = this.serverEnemies.get(enemyId);
                if (se) {
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
                const owner = this.state.players.get(attackerId);
                if (owner) owner.kills++;
                this.state.teamScore += 10;
                this.killEnemy(enemyId, enemy);
            }
        });

        return hitPayloads;
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

    private tryPickupWood(sessionId: string): boolean {
        const sp = this.serverPlayers.get(sessionId);
        const player = this.state.players.get(sessionId);
        if (!sp || !sp.alive || !player || this.state.gameOver) return false;

        const pickupX = player.x;
        const pickupY = player.y + PLAYER_TREE_Y_OFFSET;
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

        if (!closestLogId) return false;

        const log = this.state.logs.get(closestLogId);
        if (!log) return false;

        player.wood += log.amount || WOOD_PILE_AMOUNT;
        this.state.logs.delete(closestLogId);
        return true;
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
        if (!this.state.gameStarted || this.state.gameOver) return;
        const dtSec = dt / 1000;

        this.tickElapsedTime(dt);
        this.tickPlayers(dtSec, dt);
        this.tickRevives(dt);
        this.tickPlayerBullets(dtSec);
        this.tickEnemyWaves(dt);
        this.tickEnemies(dtSec, dt);
        this.tickEnemyBullets(dtSec);
        this.tickCollisions();

    }

    private tickElapsedTime(dtMs: number) {
        this.elapsedMs += dtMs;
        this.state.elapsedSeconds = Math.floor(this.elapsedMs / 1000);
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
        targetSp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
        target.health = PLAYER_MAX_HEALTH;
        target.isDead = false;
        target.reviveProgress = 0;
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
    private spawnInitialEnemies() {
        this.state.enemies.clear();
        this.serverEnemies.clear();
        this.enemyWaveElapsedMs = 0;

        for (let i = 0; i < ENEMY1_COUNT; i++) {
            this.spawnEnemy(1, i);
        }
        for (let i = 0; i < ENEMY2_COUNT; i++) {
            this.spawnEnemy(2, ENEMY1_COUNT + i);
        }
    }

    private tickEnemyWaves(dtMs: number) {
        this.enemyWaveElapsedMs += dtMs;
        while (this.enemyWaveElapsedMs >= ENEMY_WAVE_INTERVAL_MS) {
            this.enemyWaveElapsedMs -= ENEMY_WAVE_INTERVAL_MS;
            this.spawnEnemyWave();
        }
    }

    private spawnEnemyWave() {
        for (let i = 0; i < ENEMY_WAVE_COUNT; i++) {
            this.spawnEnemy(rndInt(1, 2), rndInt(0, 3));
        }
    }

    private spawnEnemy(enemyType: number, edgeIndex: number) {
        const id = nextId();
        const edge = edgeIndex % 4;
        const e = new EnemyState();
        e.id = id;
        e.shipId = 0;
        e.enemyType = enemyType;
        e.power = 1;
        e.health = 3;
        e.action = "run";
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
        this.serverEnemies.set(id, { mode: "chase", modeMs: 0, targetId: target?.id || null });
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
                    se.mode = "chase";
                }
                return;
            }

            const target = this.findNearestAlivePlayer(enemy.x, enemy.y);
            if (!target) {
                enemy.action = "idle";
                se.targetId = null;
                return;
            }

            se.targetId = target.id;
            const dx = target.player.x - enemy.x;
            const dy = target.player.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            const direction = directionFromInput(dx, dy);
            if (direction) enemy.facingDirection = direction;
            const isInAttackRange = distance <= ENEMY1_ATTACK_RANGE + ENEMY1_ATTACK_TRIGGER_EPSILON;

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
                    setTimeout(() => {
                        this.applyEnemyAttackImpact(id, attackOrigin, attackDirection);
                    }, ENEMY1_DAMAGE_IMPACT_DELAY_MS);
                }
                return;
            }

            se.mode = "chase";
            se.modeMs = 0;
            enemy.action = "run";
            if (distance <= 0) return;

            const remainingDistance = Math.max(0, distance - ENEMY1_ATTACK_RANGE);
            if (remainingDistance <= ENEMY1_MIN_CHASE_STEP) {
                enemy.action = "idle";
                se.mode = "windup";
                se.modeMs = ENEMY1_WINDUP_MS;
                return;
            }

            const move = Math.min(ENEMY1_SPEED * dtSec, remainingDistance);
            enemy.x += (dx / distance) * move;
            enemy.y += (dy / distance) * move;
        });
        dead.forEach(id => { this.state.enemies.delete(id); this.serverEnemies.delete(id); });
        this.separateEnemyFeet();
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

                    enemyA.x = clamp(enemyA.x - nx * push, -ENEMY1_EDGE_OFFSET, WORLD_WIDTH + ENEMY1_EDGE_OFFSET);
                    enemyA.y = clamp(enemyA.y - ny * push, -ENEMY1_EDGE_OFFSET, WORLD_HEIGHT + ENEMY1_EDGE_OFFSET);
                    enemyB.x = clamp(enemyB.x + nx * push, -ENEMY1_EDGE_OFFSET, WORLD_WIDTH + ENEMY1_EDGE_OFFSET);
                    enemyB.y = clamp(enemyB.y + ny * push, -ENEMY1_EDGE_OFFSET, WORLD_HEIGHT + ENEMY1_EDGE_OFFSET);
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
    private applyEnemyAttackImpact(enemyId: string, attackOrigin: AttackOrigin, direction: string) {
        if (this.state.gameOver || !this.state.enemies.has(enemyId)) return;

        const vector = DIRECTION_VECTORS[direction] || DIRECTION_VECTORS.S;
        const hitX = attackOrigin.x + vector.x * ENEMY1_ATTACK_HIT_OFFSET;
        const hitY = attackOrigin.y + vector.y * ENEMY1_ATTACK_HIT_OFFSET;

        this.state.players.forEach((player, playerId) => {
            const sp = this.serverPlayers.get(playerId);
            if (!sp || !sp.alive || player.isDead) return;

            if (!overlaps(player.x, player.y, PLAYER_HW, PLAYER_HH, hitX, hitY, ENEMY1_ATTACK_HIT_HW, ENEMY1_ATTACK_HIT_HH)) return;

            const hurt = this.damagePlayer(playerId, sp, player, ENEMY1_ATTACK_DAMAGE, enemyId);
            if (hurt) this.broadcast("playerHurt", hurt);
        });
    }

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
                if (enemy.isDead) return;
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
        sp.input = { left: false, right: false, up: false, down: false, fire: false, interact: false };
        player.isDead = true;
        player.health = 0;
        player.reviveProgress = 0;
        this.cancelRevive(sid);
        this.checkAllDead();
    }

    private checkAllDead() {
        if (this.state.gameOver) return;
        if (this.state.players.size === 0) { this.state.gameOver = true; return; }
        const anyAlive = [...this.serverPlayers.values()].some(sp => sp.alive);
        if (!anyAlive) this.state.gameOver = true;
    }
}
