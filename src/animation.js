import ASSETS from './assets.js';

const DIRECTIONS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const FRAMES_PER_DIRECTION = 15;

const createPlayerAnimations = (prefix, texture, { frameRate = 12, repeat = -1 } = {}) => {
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
        idle: createPlayerAnimations('idle', ASSETS.spritesheet.playerIdle.key),
        run: createPlayerAnimations('run', ASSETS.spritesheet.playerRun.key),
        attack: createPlayerAnimations('attack', ASSETS.spritesheet.playerAttack.key, { frameRate: 18, repeat: 0 }),
    },
};
