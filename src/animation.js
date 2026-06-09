import ASSETS from './assets.js';

const DIRECTIONS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const FRAMES_PER_DIRECTION = 15;

const createDirectionalAnimations = (prefix, texture, { frameRate = 12, repeat = -1 } = {}) => {
    return DIRECTIONS.reduce((animations, direction, row) => {
        const start = row * FRAMES_PER_DIRECTION;
        animations[direction] = {
            key: `${prefix}-${direction.toLowerCase()}`,
            texture,
            frameRate,
            repeat,
            config: { start, end: start + FRAMES_PER_DIRECTION - 1 },
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
        idle: createDirectionalAnimations('idle', ASSETS.spritesheet.playerIdle.key),
        run: createDirectionalAnimations('run', ASSETS.spritesheet.playerRun.key),
        attack: createDirectionalAnimations('attack', ASSETS.spritesheet.playerAttack.key, { frameRate: 18, repeat: 0 }),
        die: createDirectionalAnimations('die', ASSETS.spritesheet.playerDie.key, { frameRate: 18, repeat: 0 }),
    },
    enemy1: {
        run: createDirectionalAnimations('enemy1-run', ASSETS.spritesheet.enemy1Run.key),
        attack: createDirectionalAnimations('enemy1-attack', ASSETS.spritesheet.enemy1Attack.key, { frameRate: 18, repeat: 0 }),
        damage: createDirectionalAnimations('enemy1-damage', ASSETS.spritesheet.enemy1TakeDamage.key, { frameRate: 18, repeat: 0 }),
        death: createDirectionalAnimations('enemy1-death', ASSETS.spritesheet.enemy1Death.key, { frameRate: 18, repeat: 0 }),
    },
    enemy2: {
        run: createDirectionalAnimations('enemy2-run', ASSETS.spritesheet.enemy2Run.key),
        attack: createDirectionalAnimations('enemy2-attack', ASSETS.spritesheet.enemy2Attack.key, { frameRate: 18, repeat: 0 }),
        damage: createDirectionalAnimations('enemy2-damage', ASSETS.spritesheet.enemy1TakeDamage.key, { frameRate: 18, repeat: 0 }),
        death: createDirectionalAnimations('enemy2-death', ASSETS.spritesheet.enemy2Death.key, { frameRate: 18, repeat: 0 }),
    },
};
