import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import StyleScene from './scenes/StyleScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#87ceeb',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: [MenuScene, GameScene, StyleScene],
};

const game = new Phaser.Game(config); 