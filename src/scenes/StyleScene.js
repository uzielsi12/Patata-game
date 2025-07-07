export default class StyleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StyleScene' });
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add.text(centerX, 80, 'Elige el estilo de tu patata', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);

        // Opciones de estilos (colores y formas)
        this.styles = [
            { color: 0xc2b280, label: 'Clásica', shape: 'ellipse' },
            { color: 0xf4e285, label: 'Dorada', shape: 'ellipse' },
            { color: 0x8d5524, label: 'Morena', shape: 'ellipse' },
            { color: 0xc2b280, label: 'Redonda', shape: 'circle' },
            { color: 0xc2b280, label: 'Alargada', shape: 'rect' },
            { color: 0xc2b280, label: 'Mini', shape: 'mini' },
        ];

        this.selectedStyle = parseInt(localStorage.getItem('potatoStyle')) || 0;

        this.styleButtons = [];
        for (let i = 0; i < this.styles.length; i++) {
            const x = centerX - 200 + i * 100;
            let shapeObj;
            if (this.styles[i].shape === 'ellipse') {
                shapeObj = this.add.ellipse(x, centerY, 50, 70, this.styles[i].color);
            } else if (this.styles[i].shape === 'circle') {
                shapeObj = this.add.ellipse(x, centerY, 60, 60, this.styles[i].color);
            } else if (this.styles[i].shape === 'rect') {
                shapeObj = this.add.rectangle(x, centerY, 40, 80, this.styles[i].color);
            } else if (this.styles[i].shape === 'mini') {
                shapeObj = this.add.ellipse(x, centerY, 25, 35, this.styles[i].color);
            }
            shapeObj.setInteractive();
            this.add.text(x, centerY + 60, this.styles[i].label, { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
            if (i === this.selectedStyle) {
                this.add.rectangle(x, centerY, 70, 90, 0xffff00).setOrigin(0.5).setAlpha(0.2);
            }
            shapeObj.on('pointerdown', () => {
                localStorage.setItem('potatoStyle', i);
                this.scene.restart();
            });
            this.styleButtons.push(shapeObj);
        }

        // Estilos de espada
        this.add.text(centerX, centerY + 100, 'Elige el estilo de tu espada', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        this.swordStyles = [
            { color: 0xffffff, label: 'Blanca', width: 40, height: 10 },
            { color: 0xffd700, label: 'Dorada', width: 40, height: 10 },
            { color: 0x00bfff, label: 'Azul', width: 50, height: 8 },
            { color: 0x8b5a2b, label: 'Marrón', width: 35, height: 12 },
        ];
        this.selectedSword = parseInt(localStorage.getItem('swordStyle')) || 0;
        for (let i = 0; i < this.swordStyles.length; i++) {
            const x = centerX - 150 + i * 100;
            const sword = this.add.rectangle(x, centerY + 150, this.swordStyles[i].width, this.swordStyles[i].height, this.swordStyles[i].color);
            sword.setInteractive();
            this.add.text(x, centerY + 170, this.swordStyles[i].label, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
            if (i === this.selectedSword) {
                this.add.rectangle(x, centerY + 150, 60, 30, 0xffff00).setOrigin(0.5).setAlpha(0.2);
            }
            sword.on('pointerdown', () => {
                localStorage.setItem('swordStyle', i);
                this.scene.restart();
            });
        }

        // Botón volver
        const backBtn = this.add.rectangle(centerX, centerY + 240, 160, 50, 0x8888ff).setInteractive();
        this.add.text(centerX, centerY + 240, 'Volver', { fontSize: '22px', color: '#fff' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }
} 