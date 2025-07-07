export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        this.input.setDefaultCursor('pointer');
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Botón central: Iniciar
        this.startButton = this.add.rectangle(centerX, centerY, 180, 60, 0xffd700).setInteractive();
        this.add.text(centerX, centerY, 'INICIAR', { fontSize: '28px', color: '#222' }).setOrigin(0.5);

        // Botón izquierdo: Estilos
        this.styleButton = this.add.rectangle(centerX - 200, centerY, 120, 50, 0x90ee90).setInteractive();
        this.add.text(centerX - 200, centerY, 'ESTILOS', { fontSize: '20px', color: '#222' }).setOrigin(0.5);

        // Botón derecho: Ajustes
        this.settingsButton = this.add.rectangle(centerX + 200, centerY, 120, 50, 0xadd8e6).setInteractive();
        this.add.text(centerX + 200, centerY, 'AJUSTES', { fontSize: '20px', color: '#222' }).setOrigin(0.5);

        // Patata decorativa (círculo marrón)
        this.add.ellipse(centerX, centerY - 120, 80, 110, 0xc2b280);
        this.add.text(centerX, centerY - 120, '🥔', { fontSize: '40px' }).setOrigin(0.5);

        // Eventos de los botones (por ahora solo logs)
        this.startButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
        this.styleButton.on('pointerdown', () => {
            this.scene.start('StyleScene');
        });
        this.settingsButton.on('pointerdown', () => {
            console.log('Ir a ajustes');
        });
    }
} 