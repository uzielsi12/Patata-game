export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.level = 1;
        this.maxLevels = 5;
        this.events && this.events.on && this.events.on('shutdown', this.shutdown, this);
        this.events && this.events.on && this.events.on('destroy', this.shutdown, this);
    }

    init(data) {
        this.level = data.level || 1;
    }

    preload() {
        // No cargar imagen de patata
    }

    create() {
        // Variables
        this.arrowSpeed = 500;
        this.canShoot = true;
        this.shootCooldown = 400; // ms
        this.gameOver = false;
        this.jetpackActive = false;
        this.facing = 'right'; // Dirección inicial de la patata
        this.boss = null;
        this.bossLives = 3;
        this.bossActive = false;
        this.bossDefeated = false;
        this.bossAttackTimer = null;
        this.bossProjectiles = this.physics.add.group();
        // Vida de la patata
        this.playerLives = 3;

        // Fondo
        this.cameras.main.setBackgroundColor('#87ceeb');

        // Botón de salir
        this.exitButton = this.add.rectangle(760, 40, 60, 40, 0xff4444).setInteractive();
        this.add.text(760, 40, 'Salir', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        this.exitButton.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        // Plataforma suelo
        this.ground = this.add.rectangle(400, 580, 800, 40, 0x654321);
        this.physics.add.existing(this.ground, true);

        // Jugador (patata)
        const potatoStyleIndex = parseInt(localStorage.getItem('potatoStyle')) || 0;
        const potatoStyles = [
            { color: 0xc2b280, shape: 'ellipse' },
            { color: 0xf4e285, shape: 'ellipse' },
            { color: 0x8d5524, shape: 'ellipse' },
            { color: 0xc2b280, shape: 'circle' },
            { color: 0xc2b280, shape: 'rect' },
            { color: 0xc2b280, shape: 'mini' },
        ];
        const potatoStyle = potatoStyles[potatoStyleIndex] || potatoStyles[0];
        if (potatoStyle.shape === 'ellipse') {
            this.player = this.add.ellipse(120, 500, 50, 70, potatoStyle.color);
        } else if (potatoStyle.shape === 'circle') {
            this.player = this.add.ellipse(120, 500, 60, 60, potatoStyle.color);
        } else if (potatoStyle.shape === 'rect') {
            this.player = this.add.rectangle(120, 500, 40, 80, potatoStyle.color);
        } else if (potatoStyle.shape === 'mini') {
            this.player = this.add.ellipse(120, 500, 25, 35, potatoStyle.color);
        }
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setBounce(0.1);
        this.player.body.setFriction(1, 1);

        // Espada (en vez de arco)
        const swordStyleIndex = parseInt(localStorage.getItem('swordStyle')) || 0;
        const swordStyles = [
            { color: 0xffffff, width: 40, height: 10 }, // Blanca
            { color: 0xffd700, width: 40, height: 10 }, // Dorada
            { color: 0x00bfff, width: 50, height: 8 },  // Azul
            { color: 0x8b5a2b, width: 35, height: 12 }, // Marrón
        ];
        this.swordStyle = swordStyles[swordStyleIndex] || swordStyles[0];
        this.sword = this.add.rectangle(0, 0, this.swordStyle.width, this.swordStyle.height, this.swordStyle.color);
        this.sword.setVisible(false);
        this.physics.add.existing(this.sword);
        this.sword.body.setAllowGravity(false);
        this.sword.body.setImmovable(true);
        this.swordActive = false;

        // Topos enemigos desde ambos lados (aparecen poco a poco)
        this.moles = this.physics.add.group();
        const moleCount = Math.min(2 + this.level, 6);
        this.moleSpawnIndex = 0;
        this.moleSpawnPositions = [];
        this.molesToSpawn = moleCount;
        for (let i = 0; i < moleCount; i++) {
            const fromLeft = i % 2 === 0;
            const x = fromLeft ? 50 : 750;
            this.moleSpawnPositions.push(x);
        }
        this.time.addEvent({
            delay: 1200,
            repeat: moleCount - 1,
            callback: () => {
                const x = this.moleSpawnPositions[this.moleSpawnIndex];
                const mole = this.add.ellipse(x, 540, 50, 40, 0x8b4513);
                this.physics.add.existing(mole);
                mole.body.setImmovable(true);
                mole.body.setCollideWorldBounds(true);
                this.moles.add(mole);
                this.moleSpawnIndex++;
            },
            callbackScope: this
        });

        // Topos que caen del cielo (aparecen poco a poco)
        this.skyMoles = this.physics.add.group();
        const skyMoleCount = Math.min(1 + Math.floor(this.level / 2), 3);
        this.skyMoleSpawned = 0;
        this.skyMolesToSpawn = skyMoleCount;
        this.time.addEvent({
            delay: 1800,
            repeat: skyMoleCount - 1,
            callback: () => {
                const x = Phaser.Math.Between(100, 700);
                const mole = this.add.ellipse(x, -40, 50, 40, 0x8b4513);
                this.physics.add.existing(mole);
                mole.body.setImmovable(true);
                mole.body.setCollideWorldBounds(true);
                mole.body.setVelocityY(Phaser.Math.Between(100, 200));
                this.skyMoles.add(mole);
                this.skyMoleSpawned++;
            },
            callbackScope: this
        });
        this.totalMoles = moleCount + skyMoleCount;
        this.molesDefeated = 0;

        // Pinchos a partir del nivel 3
        this.spikes = this.physics.add.staticGroup();
        if (this.level >= 3) {
            // Más pinchos conforme aumenta el nivel, evitando el spawn del jugador (zona X: 80-180)
            const spikeCount = Math.min(2 + Math.floor(this.level / 2), 8);
            let placed = 0;
            let tries = 0;
            while (placed < spikeCount && tries < 30) {
                const x = Phaser.Math.Between(200, 750); // Evita zona de spawn
                // Checa que no haya otro pincho muy cerca
                let tooClose = false;
                this.spikes.getChildren().forEach(spike => {
                    if (Math.abs(spike.x - x) < 60) tooClose = true;
                });
                if (!tooClose) {
                    const spike = this.add.triangle(x, 560, 0, 40, 20, 0, 40, 40, 0xff2222);
                    this.spikes.add(spike);
                    placed++;
                }
                tries++;
            }
            this.physics.add.overlap(this.player, this.spikes, this.hitSpike, null, this);
        }

        // Colisiones
        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.moles, this.ground);
        this.physics.add.collider(this.skyMoles, this.ground);
        this.physics.add.overlap(this.player, this.moles, this.moleAttack, null, this);
        this.physics.add.overlap(this.player, this.skyMoles, this.moleAttack, null, this);

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    update() {
        if (this.gameOver) return;

        // Movimiento jugador y dirección
        const speed = 200;
        if (this.cursors.left.isDown || this.aKey.isDown) {
            this.player.body.setVelocityX(-speed);
            this.facing = 'left';
        } else if (this.cursors.right.isDown || this.dKey.isDown) {
            this.player.body.setVelocityX(speed);
            this.facing = 'right';
        } else {
            this.player.body.setVelocityX(0);
        }
        // Salto
        if (this.cursors.up.isDown && this.player.body.blocked.down) {
            this.player.body.setVelocityY(-350);
        }
        // Espada sigue a la patata
        if (this.facing === 'right') {
            this.sword.x = this.player.x + 40;
            this.sword.y = this.player.y;
        } else {
            this.sword.x = this.player.x - 40;
            this.sword.y = this.player.y;
        }
        // Ataque con espada
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.swordActive) {
            this.attackWithSword();
        }
        // Desactivar espada tras ataque
        if (this.swordActive && this.swordAttackTimer && this.swordAttackTimer.getProgress() === 1) {
            this.sword.setVisible(false);
            this.swordActive = false;
        }

        // Topos de suelo persiguen a la patata
        this.moles.getChildren().forEach(mole => {
            if (!mole.active) return;
            const dx = this.player.x - mole.x;
            if (Math.abs(dx) > 5) {
                mole.body.setVelocityX(Math.sign(dx) * 80 + Phaser.Math.Between(-10, 10));
            } else {
                mole.body.setVelocityX(0);
            }
        });
        // Topos del cielo caen y luego persiguen
        this.skyMoles.getChildren().forEach(mole => {
            if (!mole.active) return;
            if (mole.body.blocked.down) {
                const dx = this.player.x - mole.x;
                if (Math.abs(dx) > 5) {
                    mole.body.setVelocityX(Math.sign(dx) * 80 + Phaser.Math.Between(-10, 10));
                } else {
                    mole.body.setVelocityX(0);
                }
            }
        });

        // Si se eliminaron todos los topos y no hay jefe ni jetpack, aparece el jefe
        if (
            this.molesDefeated >= this.totalMoles &&
            !this.bossActive &&
            !this.bossDefeated &&
            !this.jetpackActive
        ) {
            this.spawnBoss();
        }
        // Si el jefe fue derrotado y no hay jetpack, aparece el jetpack
        if (
            this.bossDefeated &&
            !this.jetpackActive
        ) {
            this.spawnJetpack();
        }

        // Si hay jetpack, revisa si la patata lo toca
        if (this.jetpackActive && this.physics.overlap(this.player, this.jetpack)) {
            this.nextLevel();
        }

        // Si el jefe está activo, lanza bolas de tierra periódicamente
        if (this.bossActive && this.boss && !this.bossAttackTimer) {
            // El jefe lanza más rápido en niveles altos
            const delay = Math.max(1200 - (this.level * 100), 400);
            this.bossAttackTimer = this.time.addEvent({
                delay,
                loop: true,
                callback: () => {
                    this.launchBossProjectile();
                },
                callbackScope: this
            });
        }
        // Destruir bolas de tierra que salgan de la pantalla
        this.bossProjectiles.getChildren().forEach(proj => {
            if (proj.y > this.cameras.main.height + 40) {
                proj.destroy();
            }
        });
        // Si el jefe muere, detener el timer de ataque
        if (this.bossDefeated && this.bossAttackTimer) {
            this.bossAttackTimer.remove();
            this.bossAttackTimer = null;
        }

        // Movimiento libre del jefe
        if (this.bossActive && this.boss && this.boss.body) {
            const safeMargin = 80;
            const speed = 120 + this.level * 10;
            // Movimiento aleatorio libre
            if (!this.boss.nextMoveTime || this.time.now > this.boss.nextMoveTime) {
                this.boss.moveDirX = Phaser.Math.Between(-1, 1);
                this.boss.moveDirY = Phaser.Math.Between(-1, 1);
                this.boss.nextMoveTime = this.time.now + Phaser.Math.Between(800, 1800);
            }
            this.boss.body.setVelocityX(this.boss.moveDirX * speed);
            this.boss.body.setVelocityY(this.boss.moveDirY * speed * 0.7);
            // Limitar dentro del mapa
            if (this.boss.x < safeMargin) this.boss.x = safeMargin;
            if (this.boss.x > 800 - safeMargin) this.boss.x = 800 - safeMargin;
            if (this.boss.y < 300) this.boss.y = 300;
            if (this.boss.y > 540) this.boss.y = 540;
        }
    }

    attackWithSword() {
        this.sword.setVisible(true);
        this.swordActive = true;
        // Ataque dura 200ms
        this.swordAttackTimer = this.time.delayedCall(200, () => {
            this.sword.setVisible(false);
            this.swordActive = false;
        });
        // Detectar colisión con topos
        this.physics.overlap(this.sword, this.moles, (sword, mole) => {
            this.time.delayedCall(0, () => mole.destroy());
            this.molesDefeated++;
        });
        this.physics.overlap(this.sword, this.skyMoles, (sword, mole) => {
            this.time.delayedCall(0, () => mole.destroy());
            this.molesDefeated++;
        });
        // Detectar colisión con jefe
        if (this.bossActive && this.boss && this.physics.overlap(this.sword, this.boss)) {
            this.bossLives--;
            this.bossLifeText.setText('❤'.repeat(this.bossLives));
            // Efecto visual de daño
            this.boss.setFillStyle(0xff8888);
            this.time.delayedCall(100, () => {
                this.boss.setFillStyle(0x8b4513);
            });
            if (this.bossLives <= 0) {
                this.time.delayedCall(0, () => {
                    if (this.boss) this.boss.destroy();
                    if (this.bossCrown) this.bossCrown.destroy();
                    if (this.bossLifeText) this.bossLifeText.destroy();
                });
                this.bossActive = false;
                this.bossDefeated = true;
            }
        }
    }

    hitMole(arrow, mole) {
        arrow.destroy();
        mole.destroy();
    }

    moleAttack(player, mole) {
        this.playerHit('Has sido comido por un topo');
    }

    hitSpike(player, spike) {
        this.playerHit('Has sido comido por un topo');
    }

    spawnJetpack() {
        this.jetpackActive = true;
        this.jetpack = this.add.rectangle(700, 500, 40, 60, 0x00bfff);
        this.physics.add.existing(this.jetpack, true);
        this.add.text(700, 500, 'JETPACK', { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
    }

    spawnBoss() {
        this.bossActive = true;
        this.bossLives = 3 + this.level; // Más vidas según el nivel
        // Topo grande con corona
        this.boss = this.add.ellipse(400, 520, 100, 80, 0x8b4513);
        this.physics.add.existing(this.boss);
        this.boss.body.setImmovable(true);
        this.boss.body.setCollideWorldBounds(true);
        // Corona (triángulo amarillo)
        this.bossCrown = this.add.triangle(400, 470, 0, 40, 25, 0, 50, 40, 0xffd700);
        // Vida visual
        this.bossLifeText = this.add.text(400, 480, '❤'.repeat(this.bossLives), { fontSize: '28px', color: '#fff' }).setOrigin(0.5);
        // Lanzar bolas de tierra
        this.bossAttackTimer = null;
        // Generar textura de bola de tierra si no existe
        if (!this.textures.exists('dirtBall')) {
            const g = this.textures.createCanvas('dirtBall', 24, 24);
            g.context.fillStyle = '#8b5a2b';
            g.context.beginPath();
            g.context.arc(12, 12, 12, 0, Math.PI * 2);
            g.context.fill();
            g.refresh();
        }
        // Plataformas escalonadas y accesibles SOLO al aparecer el jefe
        this.bossPlatforms = this.physics.add.staticGroup();
        const platformLevels = [520, 440, 360, 280];
        const platformsPerLevel = [2, 2, 2, 1];
        for (let row = 0; row < platformLevels.length; row++) {
            const y = platformLevels[row];
            const count = platformsPerLevel[row];
            for (let i = 0; i < count; i++) {
                const x = 180 + i * (440 / (count - 1));
                const plat = this.add.rectangle(x + (row % 2) * 200, y, 120, 18, 0x888888).setOrigin(0.5);
                this.physics.add.existing(plat, true); // Física estática
                this.bossPlatforms.add(plat);
            }
        }
        this.physics.add.collider(this.player, this.bossPlatforms);
        this.physics.add.collider(this.boss, this.bossPlatforms);
        // Daño al jugador si el jefe lo toca
        this.physics.add.overlap(this.player, this.boss, () => {
            this.playerHit('El rey topo te ha vencido');
        }, null, this);
    }

    launchBossProjectile() {
        // Elegir un destino X aleatorio en todo el mapa
        const targetX = Phaser.Math.Between(50, 750);
        // Posición de inicio aleatoria en el cielo (arriba del jefe)
        const startX = Phaser.Math.Between(100, 700);
        const startY = 100; // Altura fija en el cielo
        const proj = this.physics.add.image(startX, startY, 'dirtBall');
        proj.setOrigin(0.5);
        // Calcular velocidad X para que llegue al targetX
        const time = 1.2; // segundos en el aire
        const velocityX = (targetX - startX) / time;
        proj.body.setVelocityX(velocityX);
        proj.body.setVelocityY(-500); // Mayor altura
        proj.body.setGravityY(800);
        this.bossProjectiles.add(proj);
        // Colisión con la patata
        this.physics.add.overlap(proj, this.player, () => {
            this.time.delayedCall(0, () => proj.destroy());
            this.playerHit('El rey topo te ha vencido');
        });
    }

    playerHit(message = '¡Has perdido todas tus vidas!') {
        this.playerLives--;
        if (this.playerLives <= 0) {
            this.gameOver = true;
            this.player.body.setVelocity(0, 0);
            this.add.text(400, 300, message, { fontSize: '32px', color: '#fff', backgroundColor: '#a00' }).setOrigin(0.5);
            this.time.delayedCall(2000, () => {
                this.scene.restart({ level: this.level });
            });
        } else {
            // Efecto visual de daño
            this.player.setFillStyle(0xff8888);
            this.time.delayedCall(150, () => {
                const potatoStyleIndex = parseInt(localStorage.getItem('potatoStyle')) || 0;
                const potatoStyles = [
                    { color: 0xc2b280, shape: 'ellipse' },
                    { color: 0xf4e285, shape: 'ellipse' },
                    { color: 0x8d5524, shape: 'ellipse' },
                    { color: 0xc2b280, shape: 'circle' },
                    { color: 0xc2b280, shape: 'rect' },
                    { color: 0xc2b280, shape: 'mini' },
                ];
                const potatoStyle = potatoStyles[potatoStyleIndex] || potatoStyles[0];
                if (potatoStyle.shape === 'ellipse') {
                    this.player.setFillStyle(potatoStyle.color);
                } else if (potatoStyle.shape === 'circle') {
                    this.player.setFillStyle(potatoStyle.color);
                } else if (potatoStyle.shape === 'rect') {
                    this.player.setFillStyle(potatoStyle.color);
                } else if (potatoStyle.shape === 'mini') {
                    this.player.setFillStyle(potatoStyle.color);
                }
            });
        }
    }

    nextLevel() {
        if (this.level < this.maxLevels) {
            this.scene.restart({ level: this.level + 1 });
        } else {
            this.add.text(400, 200, '¡Felicidades!\nCompletaste todos los niveles.', { fontSize: '32px', color: '#fff', backgroundColor: '#080' }).setOrigin(0.5);
            this.time.delayedCall(3000, () => {
                this.scene.start('MenuScene');
            });
        }
    }

    shutdown() {
        // Destruir grupos y objetos físicos
        if (this.moles) { this.moles.clear(true, true); this.moles = null; }
        if (this.skyMoles) { this.skyMoles.clear(true, true); this.skyMoles = null; }
        if (this.bossProjectiles) { this.bossProjectiles.clear(true, true); this.bossProjectiles = null; }
        if (this.sword) { this.sword.destroy(); this.sword = null; }
        if (this.boss) { this.boss.destroy(); this.boss = null; }
        if (this.bossCrown) { this.bossCrown.destroy(); this.bossCrown = null; }
        if (this.bossLifeText) { this.bossLifeText.destroy(); this.bossLifeText = null; }
        if (this.jetpack) { this.jetpack.destroy(); this.jetpack = null; }
        if (this.exitButton) { this.exitButton.destroy(); this.exitButton = null; }
        if (this.player) { this.player.destroy(); this.player = null; }
        if (this.ground) { this.ground.destroy(); this.ground = null; }
        if (this.spikes) { this.spikes.clear(true, true); this.spikes = null; }
        if (this.bossAttackTimer) { this.bossAttackTimer.remove(); this.bossAttackTimer = null; }
        if (this.swordAttackTimer) { this.swordAttackTimer.remove(); this.swordAttackTimer = null; }
        this.input && this.input.removeAllListeners && this.input.removeAllListeners();
        this.scene && this.scene.input && (this.scene.input.enabled = true);
    }

    // Llamar shutdown al salir de la escena
    onShutdown() {
        this.shutdown();
    }
}

// Registrar el evento shutdown
GameScene.prototype.shutdown = GameScene.prototype.shutdown;
GameScene.prototype.onShutdown = GameScene.prototype.onShutdown; 