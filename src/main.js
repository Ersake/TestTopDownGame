import { Boot } from './scenes/Boot.js';
import { Preloader } from './scenes/Preloader.js';
import { Lobby } from './scenes/Lobby.js';
import { Start } from './scenes/Start.js';
import { Game } from './scenes/Game.js';
import { GameOver } from './scenes/GameOver.js';

function launch() {
    const config = {
        type: Phaser.AUTO,
        title: 'Shmup',
        description: '',
        parent: 'game-container',
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
        pixelArt: false,
        // Physics is kept for the scrolling tilemap; game object collisions are
        // server-authoritative so sprites no longer need Arcade bodies.
        physics: {
            default: 'arcade',
            arcade: {
                debug: false,
                gravity: { y: 0 },
            },
        },
        scene: [
            Boot,
            Preloader,
            Lobby,
            Start,
            Game,
            GameOver,
        ],
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
    };

    new Phaser.Game(config);
}

launch();
            