export default {
    'audio': {
        punchWhoosh: {
            key: 'punch-whoosh',
            args: ['assets/jofae-swing-whoosh-110410.mp3']
        },
        woodHit: {
            key: 'wood-hit',
            args: ['assets/woodhit.mp3']
        },
    },
    'image': {
        treeBottom: {
            key: 'tree-bottom',
            args: ['assets/treebottom.png']
        },
        treeTop: {
            key: 'tree-top',
            args: ['assets/treetop.png']
        },
    },
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
        playerAttack: {
            key: 'player-attack',
            args: ['assets/Attack1.png', {
                frameWidth: 128,
                frameHeight: 128,
            }]
        },
    }
};
