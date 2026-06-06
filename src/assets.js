export default {
    // 'audio': {
    //     score: {
    //         key: 'sound',
    //         args: ['assets/sound.mp3', 'assets/sound.m4a', 'assets/sound.ogg']
    //     },
    // },
    // 'image': {
    //     spikes: {
    //         key: 'spikes',
    //         args: ['assets/spikes.png']
    //     },
    // },
    'spritesheet': {
        ships: {
            key: 'ships',
            args: ['assets/ships.png', {
                frameWidth: 64,
                frameHeight: 64,
            }]
        },
        tiles: {
            key: 'tiles',
            args: ['assets/tiles.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        playerRun: {
            key: 'player-run',
            args: ['assets/Run.png', {
                frameWidth: 128,
                frameHeight: 128,
            }]
        },
        playerIdle: {
            key: 'player-idle',
            args: ['assets/Idle.png', {
                frameWidth: 128,
                frameHeight: 128,
            }]
        },
    }
};
