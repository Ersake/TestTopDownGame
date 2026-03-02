import { Room, Client } from "colyseus";
import {
    GameRoomState,
    PlayerState,
    EnemyState,
    PlayerBulletState,
    EnemyBulletState,
} from "../schema/GameState";

// ─── Physics constants (mirror the Phaser client values) ──────────────────────
const PLAYER_ACCEL    = 3000;  // px/s²  (50 per frame × 60 fps)
const PLAYER_MAX_VEL  = 500;   // px/s
const PLAYER_DRAG     = 1000;  // px/s²
const FIRE_RATE_MS    = 167;   // ≈ 10 frames at 60 fps
const P_BULLET_VEL    = 1000;  // px/s upward
const GAME_WIDTH      = 1280;
const GAME_HEIGHT     = 720;

// Half-extents used for AABB collision detection
const PLAYER_HW  = 28;  const PLAYER_HH  = 28;
const ENEMY_HW   = 28;  const ENEMY_HH   = 28;
const PB_HW      = 6;   const PB_HH      = 16;  // player bullet
const EB_HW      = 8;   const EB_HH      = 12;  // enemy bullet

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
    input: { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean };
    alive: boolean;
}
interface ServerEnemy   { pathIndex: number; pathSpeed: number; pathId: number; fireCounter: number; power: number; }
interface ServerBullet  { vy: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _id = 0;
const nextId  = () => String(++_id);
const rndInt  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndReal = (min: number, max: number) => Math.random() * (max - min) + min;

// ─── Room ─────────────────────────────────────────────────────────────────────
export class ShmupRoom extends Room<GameRoomState> {
    maxClients = 8;

    private serverPlayers       = new Map<string, ServerPlayer>();
    private serverEnemies       = new Map<string, ServerEnemy>();
    private serverPlayerBullets = new Map<string, ServerBullet>();
    private serverEnemyBullets  = new Map<string, ServerBullet>();
    private spawnTimer          = 0; // ms until next enemy wave

    onCreate() {
        this.setState(new GameRoomState());
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
    }

    onJoin(client: Client) {
        const ps = new PlayerState();
        ps.sessionId = client.sessionId;
        ps.x = GAME_WIDTH / 2;
        ps.y = GAME_HEIGHT - 100;
        ps.health = 1;
        this.state.players.set(client.sessionId, ps);

        this.serverPlayers.set(client.sessionId, {
            vx: 0, vy: 0,
            fireCounter: 0,
            input: { left: false, right: false, up: false, down: false, fire: false },
            alive: true,
        });

        if (!this.state.gameStarted) {
            this.state.gameStarted = true;
            this.spawnTimer = 500; // first wave shortly after start
        }
    }

    onLeave(client: Client) {
        this.state.players.delete(client.sessionId);
        this.serverPlayers.delete(client.sessionId);
        this.checkAllDead();
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

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) this.spawnWave();
    }

    // ─── Player movement & firing ─────────────────────────────────────────────
    private tickPlayers(dtSec: number, dtMs: number) {
        this.state.players.forEach((player, sid) => {
            const sp = this.serverPlayers.get(sid);
            if (!sp || !sp.alive) return;
            const { left, right, up, down, fire } = sp.input;

            if (left)        sp.vx -= PLAYER_ACCEL * dtSec;
            if (right)       sp.vx += PLAYER_ACCEL * dtSec;
            if (!left && !right) {
                sp.vx > 0
                    ? (sp.vx = Math.max(0, sp.vx - PLAYER_DRAG * dtSec))
                    : (sp.vx = Math.min(0, sp.vx + PLAYER_DRAG * dtSec));
            }
            if (up)          sp.vy -= PLAYER_ACCEL * dtSec;
            if (down)        sp.vy += PLAYER_ACCEL * dtSec;
            if (!up && !down) {
                sp.vy > 0
                    ? (sp.vy = Math.max(0, sp.vy - PLAYER_DRAG * dtSec))
                    : (sp.vy = Math.min(0, sp.vy + PLAYER_DRAG * dtSec));
            }

            sp.vx = Math.max(-PLAYER_MAX_VEL, Math.min(PLAYER_MAX_VEL, sp.vx));
            sp.vy = Math.max(-PLAYER_MAX_VEL, Math.min(PLAYER_MAX_VEL, sp.vy));

            player.x = Math.max(32, Math.min(GAME_WIDTH  - 32, player.x + sp.vx * dtSec));
            player.y = Math.max(32, Math.min(GAME_HEIGHT - 32, player.y + sp.vy * dtSec));

            sp.fireCounter = Math.max(0, sp.fireCounter - dtMs);
            if (fire && sp.fireCounter === 0) {
                sp.fireCounter = FIRE_RATE_MS;
                this.spawnPlayerBullet(player.x, player.y - 32, 1, sid);
            }
        });
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
            if (b.y < 0) dead.push(id);
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
            if (b.y > GAME_HEIGHT) dead.push(id);
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
