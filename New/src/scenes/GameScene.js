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
                // --- Topo especial ---
                const specialTypes = Phaser.Utils.Array.Shuffle(['normal','armored','winged','fast']);
                let type = 'normal';
                if (Math.random() < 0.5) type = specialTypes[1 + Phaser.Math.Between(0,2)]; // 50% chance especial
                let color = 0x8b4513;
                let mole;
                if (type === 'armored') {
                    color = 0x555599;
                    mole = this.add.ellipse(x, 540, 50, 40, color).setStrokeStyle(4, 0xffffff);
                    mole.setData('life', 3); // 1 base +2
                } else if (type === 'winged') {
                    color = 0x88e0ff;
                    mole = this.add.ellipse(x, 540, 50, 40, color);
                    // alas visuales
                    const wingL = this.add.triangle(x-30, 540, 0, 20, 20, 0, 40, 20, 0xffffff);
                    const wingR = this.add.triangle(x+30, 540, 0, 20, 20, 0, 40, 20, 0xffffff);
                    mole.setData('wings', [wingL, wingR]);
                    mole.setData('life', 1);
                } else if (type === 'fast') {
                    color = 0xff4444;
                    mole = this.add.ellipse(x, 540, 50, 40, color);
                    mole.setData('life', 1);
                    mole.setData('fast', true);
                } else {
                    mole = this.add.ellipse(x, 540, 50, 40, color);
                    mole.setData('life', 1);
                }
                mole.setData('type', type);
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
                // --- Topo especial ---
                const specialTypes = Phaser.Utils.Array.Shuffle(['normal','armored','winged','fast']);
                let type = 'normal';
                if (Math.random() < 0.5) type = specialTypes[1 + Phaser.Math.Between(0,2)];
                let color = 0x8b4513;
                let mole;
                if (type === 'armored') {
                    color = 0x555599;
                    mole = this.add.ellipse(x, -40, 50, 40, color).setStrokeStyle(4, 0xffffff);
                    mole.setData('life', 3);
                } else if (type === 'winged') {
                    color = 0x88e0ff;
                    mole = this.add.ellipse(x, -40, 50, 40, color);
                    const wingL = this.add.triangle(x-30, -40, 0, 20, 20, 0, 40, 20, 0xffffff);
                    const wingR = this.add.triangle(x+30, -40, 0, 20, 20, 0, 40, 20, 0xffffff);
                    mole.setData('wings', [wingL, wingR]);
                    mole.setData('life', 1);
                } else if (type === 'fast') {
                    color = 0xff4444;
                    mole = this.add.ellipse(x, -40, 50, 40, color);
                    mole.setData('life', 1);
                    mole.setData('fast', true);
                } else {
                    mole = this.add.ellipse(x, -40, 50, 40, color);
                    mole.setData('life', 1);
                }
                mole.setData('type', type);
                this.physics.add.existing(mole);
                mole.body.setImmovable(true);
                mole.body.setCollideWorldBounds(true);
                if (type === 'winged') {
                    // Vuela desde el inicio
                    mole.body.setAllowGravity(false);
                } else {
                    mole.body.setVelocityY(Phaser.Math.Between(100, 200));
                }
                this.skyMoles.add(mole);
                this.skyMoleSpawned++;
            },
            callbackScope: this
        });
        this.totalMoles = moleCount + skyMoleCount;
        this.molesDefeated = 0;

        // Colisiones
        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.moles, this.ground);
        this.physics.add.collider(this.skyMoles, this.ground);
        this.physics.add.overlap(this.player, this.moles, this.moleAttack, null, this);
        this.physics.add.overlap(this.player, this.skyMoles, this.moleAttack, null, this);

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D); // Solo para atacar

        // --- POTENCIADORES ---
        this.powerups = this.physics.add.group();
        this.activePowerups = { weapon: false, speed: false, evade: 0 };
        this.powerupTimers = { weapon: null, speed: null };
        this.powerupText = this.add.text(400, 40, '', { fontSize: '20px', color: '#fff', backgroundColor: '#222' }).setOrigin(0.5).setDepth(10);
        this.powerupsToSpawn = Phaser.Utils.Array.Shuffle(['weapon','speed','evade']).slice(0,2);
        this.powerupsSpawned = 0;
        this.scheduleNextPowerup();
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);
    }

    update() {
        if (this.gameOver) return;

        // Movimiento jugador y dirección
        let speed = 200;
        if (this.activePowerups.speed) speed = 350;
        if (this.playerCanMove === false) {
            this.player.body.setVelocityX(0);
        } else {
            if (this.cursors.left.isDown) {
                this.player.body.setVelocityX(-speed);
                this.facing = 'left';
            } else if (this.cursors.right.isDown) {
                this.player.body.setVelocityX(speed);
                this.facing = 'right';
            } else {
                this.player.body.setVelocityX(0);
            }
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
        if (this.playerCanAttack !== false && Phaser.Input.Keyboard.JustDown(this.dKey)) {
            if (this.cursors.up.isDown) {
                this.attackWithSword('up');
            } else {
                this.attackWithSword('forward');
            }
        }
        // Desactivar espada tras ataque
        if (this.swordActive && this.swordAttackTimer && this.swordAttackTimer.getProgress() === 1) {
            this.sword.setVisible(false);
            this.swordActive = false;
        }

        // Topos de suelo persiguen a la patata
        this.moles.getChildren().forEach(mole => {
            if (!mole.active) return;
            const type = mole.getData('type') || 'normal';
            if (this.playerInvulnerable) {
                // Movimiento aleatorio durante la inmunidad
                if (!mole.nextMoveTime || this.time.now > mole.nextMoveTime) {
                    mole.moveDirX = Phaser.Math.Between(-1, 1);
                    mole.moveDirY = Phaser.Math.Between(-1, 1);
                    mole.nextMoveTime = this.time.now + Phaser.Math.Between(400, 1200);
                }
                let v = 80 + (mole.getData('fast') ? 60 : 0);
                mole.body.setVelocityX(mole.moveDirX * v);
                if (type === 'winged') {
                    mole.body.setVelocityY(mole.moveDirY * v);
                    // Mover alas
                    const wings = mole.getData('wings');
                    if (wings) {
                        wings[0].x = mole.x - 30; wings[0].y = mole.y;
                        wings[1].x = mole.x + 30; wings[1].y = mole.y;
                    }
                }
            } else if (type === 'winged') {
                // Movimiento volador: sigue al jugador en X e Y
                const dx = this.player.x - mole.x;
                const dy = this.player.y - mole.y;
                mole.body.setVelocityX(Math.sign(dx) * 120 + Phaser.Math.Between(-10, 10));
                mole.body.setVelocityY(Math.sign(dy) * 120 + Phaser.Math.Between(-10, 10));
                // Mover alas
                const wings = mole.getData('wings');
                if (wings) {
                    wings[0].x = mole.x - 30; wings[0].y = mole.y;
                    wings[1].x = mole.x + 30; wings[1].y = mole.y;
                }
            } else {
                const dx = this.player.x - mole.x;
                let v = 80 + (mole.getData('fast') ? 60 : 0);
                if (Math.abs(dx) > 5) {
                    mole.body.setVelocityX(Math.sign(dx) * v + Phaser.Math.Between(-10, 10));
                } else {
                    mole.body.setVelocityX(0);
                }
            }
        });
        // Topos del cielo caen y luego persiguen
        this.skyMoles.getChildren().forEach(mole => {
            if (!mole.active) return;
            const type = mole.getData('type') || 'normal';
            if (this.playerInvulnerable) {
                // Movimiento aleatorio durante la inmunidad
                if (!mole.nextMoveTime || this.time.now > mole.nextMoveTime) {
                    mole.moveDirX = Phaser.Math.Between(-1, 1);
                    mole.moveDirY = Phaser.Math.Between(-1, 1);
                    mole.nextMoveTime = this.time.now + Phaser.Math.Between(400, 1200);
                }
                let v = 80 + (mole.getData('fast') ? 60 : 0);
                mole.body.setVelocityX(mole.moveDirX * v);
                if (type === 'winged') {
                    mole.body.setVelocityY(mole.moveDirY * v);
                    const wings = mole.getData('wings');
                    if (wings) {
                        wings[0].x = mole.x - 30; wings[0].y = mole.y;
                        wings[1].x = mole.x + 30; wings[1].y = mole.y;
                    }
                }
            } else if (type === 'winged') {
                // Movimiento volador
                const dx = this.player.x - mole.x;
                const dy = this.player.y - mole.y;
                mole.body.setVelocityX(Math.sign(dx) * 120 + Phaser.Math.Between(-10, 10));
                mole.body.setVelocityY(Math.sign(dy) * 120 + Phaser.Math.Between(-10, 10));
                const wings = mole.getData('wings');
                if (wings) {
                    wings[0].x = mole.x - 30; wings[0].y = mole.y;
                    wings[1].x = mole.x + 30; wings[1].y = mole.y;
                }
            } else if (mole.body.blocked.down) {
                const dx = this.player.x - mole.x;
                let v = 80 + (mole.getData('fast') ? 60 : 0);
                if (Math.abs(dx) > 5) {
                    mole.body.setVelocityX(Math.sign(dx) * v + Phaser.Math.Between(-10, 10));
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
            // PASIVA: El jefe lanza bolas de tierra más rápido
            const delay = Math.max(600 - (this.level * 60), 180); // Más rápido que antes
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
            const speed = 80 + this.level * 8;
            if (this.playerInvulnerable) {
                // Movimiento aleatorio durante la inmunidad
                if (!this.boss.nextMoveTime || this.time.now > this.boss.nextMoveTime) {
                    this.boss.moveDirX = Phaser.Math.Between(-1, 1);
                    this.boss.moveDirY = Phaser.Math.Between(-1, 1);
                    this.boss.nextMoveTime = this.time.now + Phaser.Math.Between(400, 1200);
                }
                this.boss.body.setVelocityX(this.boss.moveDirX * speed);
                this.boss.body.setVelocityY(this.boss.moveDirY * speed * 0.7);
            } else {
                // Movimiento normal
                if (!this.boss.nextMoveTime || this.time.now > this.boss.nextMoveTime) {
                    this.boss.moveDirX = Phaser.Math.Between(-1, 1);
                    this.boss.moveDirY = Phaser.Math.Between(-1, 1);
                    this.boss.nextMoveTime = this.time.now + Phaser.Math.Between(800, 1800);
                }
                this.boss.body.setVelocityX(this.boss.moveDirX * speed);
                this.boss.body.setVelocityY(this.boss.moveDirY * speed * 0.7);
            }
            // Limitar dentro del mapa
            if (this.boss.x < safeMargin) this.boss.x = safeMargin;
            if (this.boss.x > 800 - safeMargin) this.boss.x = 800 - safeMargin;
            if (this.boss.y < 300) this.boss.y = 300;
            if (this.boss.y > 540) this.boss.y = 540;
        }
    }

    attackWithSword(direction = 'forward') {
        this.sword.setVisible(true);
        this.swordActive = true;
        // Ataque dura 200ms
        this.swordAttackTimer = this.time.delayedCall(200, () => {
            this.sword.setVisible(false);
            this.swordActive = false;
        });
        // Posición de la espada
        if (direction === 'up') {
            this.sword.width = this.swordStyle.width * (this.activePowerups.weapon ? 2 : 1);
            this.sword.height = this.swordStyle.height;
            this.sword.x = this.player.x;
            this.sword.y = this.player.y - 40;
            this.sword.rotation = -Math.PI/2;
        } else {
            this.sword.width = this.swordStyle.width * (this.activePowerups.weapon ? 2 : 1);
            this.sword.height = this.swordStyle.height;
            if (this.facing === 'right') {
                this.sword.x = this.player.x + 40;
                this.sword.y = this.player.y;
                this.sword.rotation = 0;
            } else {
                this.sword.x = this.player.x - 40;
                this.sword.y = this.player.y;
                this.sword.rotation = 0;
            }
        }
        // Detectar colisión con topos
        const swordHit = (sword, mole) => {
            let life = mole.getData('life') || 1;
            life--;
            if (life <= 0) {
                if (mole.getData('wings')) {
                    mole.getData('wings').forEach(w => w.destroy());
                }
                this.time.delayedCall(0, () => mole.destroy());
                this.molesDefeated++;
            } else {
                mole.setData('life', life);
                mole.setFillStyle(0xff8888);
                // Gran retroceso para topos con armadura
                if (mole.getData('type') === 'armored') {
                    // Determinar borde destino
                    let targetX;
                    if (mole.x < this.player.x) {
                        targetX = 50; // Salta a la izquierda
                    } else {
                        targetX = 750; // Salta a la derecha
                    }
                    // Animar salto al borde
                    this.tweens.add({
                        targets: mole,
                        x: targetX,
                        y: mole.y - 120, // Salto hacia arriba
                        duration: 250,
                        ease: 'Quad.easeOut',
                        yoyo: true,
                        hold: 80,
                        onYoyo: () => {
                            mole.y += 120; // Vuelve a caer
                        },
                        onComplete: () => {
                            mole.x = targetX;
                        }
                    });
                }
                this.time.delayedCall(100, () => {
                    const type = mole.getData('type');
                    if (type === 'armored') mole.setFillStyle(0x555599);
                    else if (type === 'winged') mole.setFillStyle(0x88e0ff);
                    else if (type === 'fast') mole.setFillStyle(0xff4444);
                    else mole.setFillStyle(0x8b4513);
                });
            }
        };
        if (direction === 'up') {
            this.physics.overlap(this.sword, this.moles, swordHit);
            this.physics.overlap(this.sword, this.skyMoles, swordHit);
        } else {
            this.physics.overlap(this.sword, this.moles, swordHit);
            this.physics.overlap(this.sword, this.skyMoles, swordHit);
        }
        // Detectar colisión con jefe
        if (this.bossActive && this.boss && this.physics.overlap(this.sword, this.boss)) {
            this.bossLives--;
            this.bossLifeText.setText('❤'.repeat(this.bossLives));
            this.boss.setFillStyle(0xff8888);
            this.time.delayedCall(100, () => {
                this.boss.setFillStyle(0x8b4513);
            });
            if (this.bossLives <= 0) {
                // Habilidad aleatoria: El regreso
                if (!this.bossHasRevived && Math.random() < 0.7) { // 70% probabilidad de revivir
                    this.bossHasRevived = true;
                    this.bossLives = 2;
                    this.bossLifeText.setText('❤❤');
                    this.bossActive = true;
                    this.bossDefeated = false;
                    this.add.text(this.boss.x, this.boss.y - 60, '¡El regreso!', { fontSize: '22px', color: '#ff2222', backgroundColor: '#fff' }).setOrigin(0.5).setDepth(10).setAlpha(0.8).setScrollFactor(0).setDepth(100).setVisible(true);
                    return;
                }
                this.time.delayedCall(0, () => {
                    if (this.boss) this.boss.destroy();
                    if (this.bossCrown) this.bossCrown.destroy();
                    if (this.bossLifeText) this.bossLifeText.destroy();
                });
                this.bossActive = false;
                this.bossDefeated = true;
                if (this.bossAwakenTimer) this.bossAwakenTimer.remove();
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
        this.boss = this.add.ellipse(400, -600, 100, 80, 0x8b4513);
        this.physics.add.existing(this.boss);
        this.boss.body.setImmovable(true);
        this.boss.body.setCollideWorldBounds(true);
        // Animación de caída
        this.tweens.add({
            targets: this.boss,
            y: 520,
            duration: 2200,
            ease: 'Bounce.easeOut'
        });
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
        // Habilidad aleatoria: El despertar
        this.bossAwakenTimer = this.time.addEvent({
            delay: Phaser.Math.Between(4000, 8000),
            loop: true,
            callback: () => {
                if (this.bossActive && this.boss && Math.random() < 0.5) {
                    this.bossAwaken();
                }
            },
            callbackScope: this
        });
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
        if (this.playerInvulnerable) return;
        if (this.playerLives <= 1 && this.activePowerups.evade > 0) {
            this.activePowerups.evade--;
            this.playerLives = 1; // No cuenta como muerte
            this.powerupText.setText('¡Evadiste la muerte!');
            this.player.setFillStyle(0xfff222);
            // Inmunidad y bloqueo de controles
            this.playerInvulnerable = true;
            this.playerCanMove = false;
            this.playerCanAttack = false;
            // Guardar velocidad previa
            if (this.player.body) this.player.body.setVelocity(0, 0);
            // Desactivar controles visualmente (opcional: opacidad)
            this.player.setAlpha(0.5);
            // Restaurar después de 3 segundos
            this.time.delayedCall(3000, () => {
                this.playerInvulnerable = false;
                this.playerCanMove = true;
                this.playerCanAttack = true;
                this.player.setAlpha(1);
            });
            this.time.delayedCall(400, () => {
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
                this.player.setFillStyle(potatoStyle.color);
            });
            this.time.delayedCall(1200, () => {
                if (!this.activePowerups.weapon && !this.activePowerups.speed)
                    this.powerupText.setText('');
            });
            return;
        }
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
        if (this.bossAttackTimer) { this.bossAttackTimer.remove(); this.bossAttackTimer = null; }
        if (this.swordAttackTimer) { this.swordAttackTimer.remove(); this.swordAttackTimer = null; }
        this.input && this.input.removeAllListeners && this.input.removeAllListeners();
        this.scene && this.scene.input && (this.scene.input.enabled = true);
    }

    // Llamar shutdown al salir de la escena
    onShutdown() {
        this.shutdown();
    }

    scheduleNextPowerup() {
        if (this.powerupsSpawned >= this.powerupsToSpawn.length) return;
        // Tiempo aleatorio entre 3 y 10 segundos
        const delay = Phaser.Math.Between(3000, 10000);
        this.time.delayedCall(delay, () => {
            this.spawnPowerup(this.powerupsToSpawn[this.powerupsSpawned]);
            this.powerupsSpawned++;
            this.scheduleNextPowerup();
        });
    }

    spawnPowerup(type) {
        // Tipos de potenciador
        const types = {
            weapon: { color: 0xffd700, label: 'Gran arma' },
            speed: { color: 0x00ff88, label: 'Patata veloz' },
            evade: { color: 0x00bfff, label: 'Evadir la muerte' }
        };
        // Posición segura: sobre el suelo, lejos de los bordes
        let x, y;
        let valid = false;
        while (!valid) {
            x = Phaser.Math.Between(80, 720);
            y = 548; // justo sobre el suelo (580 alto suelo - 20 radio potenciador - 12 margen)
            // Verifica que no esté muy cerca de pinchos
            valid = true;
            if (this.spikes) {
                this.spikes.getChildren().forEach(spike => {
                    if (Math.abs(spike.x - x) < 60) valid = false;
                });
            }
        }
        const p = this.add.rectangle(x, y, 32, 32, types[type].color);
        p.setData('type', type);
        p.setData('label', types[type].label);
        this.powerups.add(p);
        this.physics.add.existing(p, true); // estático, sin gravedad
        p.body.setAllowGravity(false);
        p.body.setImmovable(true);
        p.body.setVelocity(0, 0);
    }

    collectPowerup(player, powerup) {
        const type = powerup.getData('type');
        const label = powerup.getData('label');
        powerup.destroy();
        if (type === 'weapon') {
            this.activePowerups.weapon = true;
            this.sword.width = this.swordStyle.width * 2;
            this.powerupText.setText('Gran arma activa!');
            if (this.powerupTimers.weapon) this.powerupTimers.weapon.remove();
            this.powerupTimers.weapon = this.time.delayedCall(6000, () => {
                this.activePowerups.weapon = false;
                this.sword.width = this.swordStyle.width;
                this.powerupText.setText('');
            });
        } else if (type === 'speed') {
            this.activePowerups.speed = true;
            this.powerupText.setText('Patata veloz!');
            if (this.powerupTimers.speed) this.powerupTimers.speed.remove();
            this.powerupTimers.speed = this.time.delayedCall(5000, () => {
                this.activePowerups.speed = false;
                this.powerupText.setText('');
            });
        } else if (type === 'evade') {
            this.activePowerups.evade++;
            this.powerupText.setText('¡Evadir la muerte listo!');
            this.time.delayedCall(2000, () => {
                if (!this.activePowerups.weapon && !this.activePowerups.speed)
                    this.powerupText.setText('');
            });
        }
    }

    bossAwaken() {
        // Invoca 1-3 topos aleatorios en el campo
        const count = Phaser.Math.Between(1, 3);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(80, 720);
            const y = 540;
            // Puede ser topo normal o especial
            const specialTypes = Phaser.Utils.Array.Shuffle(['normal','armored','winged','fast']);
            let type = 'normal';
            if (Math.random() < 0.5) type = specialTypes[1 + Phaser.Math.Between(0,2)];
            let color = 0x8b4513;
            let mole;
            if (type === 'armored') {
                color = 0x555599;
                mole = this.add.ellipse(x, y, 50, 40, color).setStrokeStyle(4, 0xffffff);
                mole.setData('life', 3);
            } else if (type === 'winged') {
                color = 0x88e0ff;
                mole = this.add.ellipse(x, y, 50, 40, color);
                const wingL = this.add.triangle(x-30, y, 0, 20, 20, 0, 40, 20, 0xffffff);
                const wingR = this.add.triangle(x+30, y, 0, 20, 20, 0, 40, 20, 0xffffff);
                mole.setData('wings', [wingL, wingR]);
                mole.setData('life', 1);
            } else if (type === 'fast') {
                color = 0xff4444;
                mole = this.add.ellipse(x, y, 50, 40, color);
                mole.setData('life', 1);
                mole.setData('fast', true);
            } else {
                mole = this.add.ellipse(x, y, 50, 40, color);
                mole.setData('life', 1);
            }
            mole.setData('type', type);
            this.physics.add.existing(mole);
            mole.body.setImmovable(true);
            mole.body.setCollideWorldBounds(true);
            this.moles.add(mole);
        }
        this.totalMoles += count;
        // Efecto visual
        this.add.text(this.boss.x, this.boss.y - 60, '¡El despertar!', { fontSize: '22px', color: '#ffd700', backgroundColor: '#222' }).setOrigin(0.5).setDepth(10).setAlpha(0.8).setScrollFactor(0).setDepth(100).setVisible(true);
    }
}

// Registrar el evento shutdown
GameScene.prototype.shutdown = GameScene.prototype.shutdown;
GameScene.prototype.onShutdown = GameScene.prototype.onShutdown; 