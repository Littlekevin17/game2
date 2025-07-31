// js/memory-game.js
const CARD_RATIO = 3 / 2;
const CARD_GAP_RATIO = 0.03;

class MemoryScene extends Phaser.Scene {
  initGame(pairs, cols, rows) {
    this.pairs = pairs;
    this.cols = cols;
    this.rows = rows;
  }

  preload() {
    this.load.image('back', 'assets/carte-dos.jpg');
    for (let i = 1; i <= this.pairs; i++) {
      this.load.image('face' + i, 'assets/' + i + '.jpg');
    }
    this.load.audio('matchSound', 'sounds/match.mp3');
    this.load.audio('failSound', 'sounds/fail.mp3');
    this.load.audio('winSound', 'sounds/win.mp3');
  }

  create() {
    const { w, h, cardW, cardH, gapW, gapH, startX, startY } = this.getSizes(this.cols, this.rows);

    this.moves = 0;
    this.matchedPairs = 0;
    this.timer = 0;
    this.opened = [];
    this.canClick = true;

    // Met à jour barre
    this.infoCoups = document.getElementById('infoCoups');
    this.infoTemps = document.getElementById('infoTemps');
    this.infoCoups.textContent = 'Coups: 0';
    this.infoTemps.textContent = 'Temps: 0s';

    // Sons
    this.matchSound = this.sound.add('matchSound');
    this.failSound = this.sound.add('failSound');
    this.winSound = this.sound.add('winSound');

    // Overlay de victoire
    this.overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5).setDepth(10).setVisible(false);
    this.victoryText = this.add.text(w / 2, h / 2, '', {
      fontSize: '40px',
      fill: '#0f0',
      backgroundColor: '#222d',
      padding: { left: 24, right: 24, top: 16, bottom: 16 },
      align: 'center',
      wordWrap: { width: w * 0.8 }
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    this.input.once('pointerdown', () => {
      if (this.sound.context.state === 'suspended')
        this.sound.context.resume();
    });

    if (this.timerEvent)
      clearInterval(this.timerEvent);
    this.timerEvent = setInterval(() => {
      this.timer++;
      this.infoTemps.textContent = `Temps: ${this.timer}s`;
    }, 1000);

    // Prépare et mélange le deck
    let values = [];
    for (let i = 1; i <= this.pairs; i++) values.push(i, i);
    Phaser.Utils.Array.Shuffle(values);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let idx = y * this.cols + x;
        if (idx >= values.length) break;
        let val = values[idx];
        let px = startX + x * (cardW + gapW);
        let py = startY + y * (cardH + gapH);

        let container = this.add.container(px, py);

        let cardBack = this.add.image(0, 0, 'back').setDisplaySize(cardW, cardH);
        let cardFace = this.add.image(0, 0, 'face' + val).setDisplaySize(cardW, cardH).setVisible(false);

        container.add([cardBack, cardFace]);

        container.setSize(cardW, cardH);
        container.setInteractive();

        container.cardValue = val;
        container.flipped = false;
        container.locked = false;
        container.cardBack = cardBack;
        container.cardFace = cardFace;

        container.on('pointerdown', () => {
          if (!this.canClick || container.flipped || container.locked) return;
          this.canClick = false;
          this.tweens.add({
            targets: container,
            scaleX: 0,
            duration: 120,
            onComplete: () => {
              container.cardBack.setVisible(false);
              container.cardFace.setVisible(true);
              this.tweens.add({
                targets: container,
                scaleX: 1,
                duration: 110,
                onComplete: () => {
                  container.flipped = true;
                  this.opened.push(container);
                  if (this.opened.length === 2) {
                    this.moves++;
                    this.infoCoups.textContent = `Coups: ${this.moves}`;
                    const [c1, c2] = this.opened;
                    if (c1.cardValue === c2.cardValue) {
                      this.matchSound.play();
                      c1.locked = c2.locked = true;
                      this.matchedPairs++;
                      this.tweens.add({ targets: [c1, c2], scale: 1.12, yoyo: true, duration: 250 });
                      if (this.matchedPairs === this.pairs) {
                        clearInterval(this.timerEvent);
                        this.winSound.play();
                        this.overlay.setVisible(true);
                        this.victoryText.setText(`Gagné ! 🎉\n${this.moves} coups, ${this.timer}s`);
                        this.victoryText.setVisible(true);
                        this.tweens.add({ targets: this.victoryText, scale: 1.12, yoyo: true, duration: 320, repeat: 2 });
                        this.canClick = false;
                      }
                      this.opened = [];
                      this.time.delayedCall(180, () => { this.canClick = true; });
                    } else {
                      this.failSound.play();
                      this.time.delayedCall(500, () => {
                        this.tweens.add({
                          targets: [c1, c2],
                          scaleX: 0,
                          duration: 120,
                          onComplete: () => {
                            [c1, c2].forEach(c => {
                              c.cardBack.setVisible(true);
                              c.cardFace.setVisible(false);
                              c.flipped = false;
                            });
                            this.tweens.add({
                              targets: [c1, c2],
                              scaleX: 1,
                              duration: 110,
                              onComplete: () => {
                                this.opened = [];
                                this.canClick = true;
                              }
                            });
                          }
                        });
                      });
                    }
                  } else {
                    this.canClick = true;
                  }
                }
              });
            }
          });
        });
      }
    }
  }

  resizeGame() {
    if (!this.sys || !this.sys.game) return;
    const parent = document.getElementById('game-parent');
    let width = parent.clientWidth;
    let height = parent.clientHeight;
    this.sys.game.scale.resize(width, height);
  }

  // Expose au global pour créer Phased Game
  window.MemoryScene = MemoryScene;
