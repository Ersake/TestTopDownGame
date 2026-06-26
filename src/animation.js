import ASSETS from './assets.js';

const PLAYER_DIRECTIONS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const ENEMY_DIRECTIONS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const FRAMES_PER_DIRECTION = 15;

const createDirectionalAnimations = (prefix, texture, directions, { frameRate = 12, repeat = -1, frameStartOffset = 0, frameEndOffset = 0 } = {}) => {
    return directions.reduce((animations, direction, row) => {
        const start = row * FRAMES_PER_DIRECTION;
        animations[direction] = {
            key: `${prefix}-${direction.toLowerCase()}`,
            texture,
            frameRate,
            repeat,
            config: { start: start + frameStartOffset, end: start + FRAMES_PER_DIRECTION - 1 - frameEndOffset },
        };
        return animations;
    }, {});
};

export default {
    'explosion': 
    {
        key: 'explosion',
        texture: ASSETS.spritesheet.tiles.key,
        frameRate: 10,
        config: { start: 4, end: 8 },
    },
    player: {
        idle: createDirectionalAnimations('idle', ASSETS.spritesheet.playerIdle.key, PLAYER_DIRECTIONS),
        run: createDirectionalAnimations('run', ASSETS.spritesheet.playerRun.key, PLAYER_DIRECTIONS),
        axe: createDirectionalAnimations('axe', ASSETS.spritesheet.playerAxe.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        axeRunAttack: createDirectionalAnimations('axe-run-attack', ASSETS.spritesheet.playerRunAttack1.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        axeWhirlwind: createDirectionalAnimations('axe-whirlwind', ASSETS.spritesheet.playerAttack2.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: -1, frameStartOffset: 3, frameEndOffset: 3 }),
        bow: createDirectionalAnimations('bow', ASSETS.spritesheet.playerBow.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        die: createDirectionalAnimations('die', ASSETS.spritesheet.playerDie.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: 0 }),
    },
    weapon: {
        woodAxeIdle: createDirectionalAnimations('wood-axe-idle', ASSETS.spritesheet.woodAxeIdle.key, PLAYER_DIRECTIONS),
        woodAxeRun: createDirectionalAnimations('wood-axe-run', ASSETS.spritesheet.woodAxeRun.key, PLAYER_DIRECTIONS),
        woodAxeAttack: createDirectionalAnimations('wood-axe-attack', ASSETS.spritesheet.woodAxeAttack.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        woodAxeRunAttack: createDirectionalAnimations('wood-axe-run-attack', ASSETS.spritesheet.woodAxeRunAttack1.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        woodAxeWhirlwind: createDirectionalAnimations('wood-axe-whirlwind', ASSETS.spritesheet.woodAxeWhirlwind.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: -1, frameStartOffset: 3, frameEndOffset: 3 }),
        woodBowIdle: createDirectionalAnimations('wood-bow-idle', ASSETS.spritesheet.woodBowIdle.key, PLAYER_DIRECTIONS),
        woodBowRun: createDirectionalAnimations('wood-bow-run', ASSETS.spritesheet.woodBowRun.key, PLAYER_DIRECTIONS),
        woodBowAttack: createDirectionalAnimations('wood-bow-attack', ASSETS.spritesheet.woodBowAttack.key, PLAYER_DIRECTIONS, { frameRate: 18, repeat: 0 }),
    },
    enemy1: {
        run: createDirectionalAnimations('enemy1-run', ASSETS.spritesheet.enemy1Run.key, ENEMY_DIRECTIONS),
        attack: createDirectionalAnimations('enemy1-attack', ASSETS.spritesheet.enemy1Attack.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        damage: createDirectionalAnimations('enemy1-damage', ASSETS.spritesheet.enemy1TakeDamage.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        death: createDirectionalAnimations('enemy1-death', ASSETS.spritesheet.enemy1Death.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
    },
    enemy2: {
        run: createDirectionalAnimations('enemy2-run', ASSETS.spritesheet.enemy2Run.key, ENEMY_DIRECTIONS),
        attack: createDirectionalAnimations('enemy2-attack', ASSETS.spritesheet.enemy2Attack.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        damage: createDirectionalAnimations('enemy2-damage', ASSETS.spritesheet.enemy1TakeDamage.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        death: createDirectionalAnimations('enemy2-death', ASSETS.spritesheet.enemy2Death.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
    },
    caster: {
        run: createDirectionalAnimations('caster-run', ASSETS.spritesheet.casterWalk.key, ENEMY_DIRECTIONS),
        charge: createDirectionalAnimations('caster-charge', ASSETS.spritesheet.casterCharge.key, ENEMY_DIRECTIONS),
        attack: createDirectionalAnimations('caster-attack', ASSETS.spritesheet.casterAttack.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        damage: createDirectionalAnimations('caster-damage', ASSETS.spritesheet.casterCharge.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        death: createDirectionalAnimations('caster-death', ASSETS.spritesheet.casterDeath.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
    },
    dk: {
        walk: createDirectionalAnimations('dk-walk', ASSETS.spritesheet.dkWalk.key, ENEMY_DIRECTIONS),
        run: createDirectionalAnimations('dk-run', ASSETS.spritesheet.dkRun.key, ENEMY_DIRECTIONS),
        attack: createDirectionalAnimations('dk-attack', ASSETS.spritesheet.dkAttack.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        idle: createDirectionalAnimations('dk-idle', ASSETS.spritesheet.dkIdle.key, ENEMY_DIRECTIONS),
        damage: createDirectionalAnimations('dk-damage', ASSETS.spritesheet.dkTakeDamage.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
        death: createDirectionalAnimations('dk-death', ASSETS.spritesheet.dkDeath.key, ENEMY_DIRECTIONS, { frameRate: 18, repeat: 0 }),
    },
    fireball: {
        key: 'fireball-fly',
        texture: ASSETS.spritesheet.fireball.key,
        frameRate: 8,
        repeat: -1,
        config: { start: 0, end: 1 },
    },
};
