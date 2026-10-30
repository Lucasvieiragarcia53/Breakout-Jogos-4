const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const statusText = document.getElementById("statusText");
const fullscreenButton = document.getElementById("fullscreenButton");
const gameShell = document.querySelector(".game-shell");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();

// ÁUDIOS
const hitSounds = {
  J1: new Audio("sons/hit player 1.wav"),
  J2: new Audio("sons/hit player 2.wav")
};

const backgroundMusic = new Audio("sons/musica.mp3");
backgroundMusic.loop = true;
backgroundMusic.volume = 0.35;

function playHitSound(player) {
  const sound = hitSounds[player];

  if (!sound) return;

  sound.currentTime = 0;
  sound.play().catch(error => {
    console.warn("Erro ao reproduzir efeito sonoro:", error);
  });
}

function playBackgroundMusic() {
  backgroundMusic.play().catch(error => {
    console.warn("Erro ao reproduzir música:", error);
  });
}

function stopBackgroundMusic() {
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
}

class GameObject {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Paddle extends GameObject {
  constructor(x, y, color, controls, label) {
    super(x, y, 116, 13, color);

    this.speed = 7;
    this.controls = controls;
    this.label = label;
  }

  update() {
    if (keys.has(this.controls.left)) this.x -= this.speed;
    if (keys.has(this.controls.right)) this.x += this.speed;

    this.x = Math.max(
      12,
      Math.min(WIDTH - this.width - 12, this.x)
    );
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

class Ball extends GameObject {
  constructor() {
    super(WIDTH / 2 - 7, HEIGHT - 95, 14, 14, "#ffffff");

    this.radius = 7;
    this.speed = 6.2;
    this.vx = 3.8;
    this.vy = -4.9;
    this.stuck = true;
    this.lastHitPlayer = null;
  }

  launch() {
    this.stuck = false;
  }

  reset() {
    this.x = WIDTH / 2 - this.radius;
    this.y = HEIGHT - 95;

    this.vx = (Math.random() > 0.5 ? 1 : -1) * 3.8;
    this.vy = -4.9;

    this.stuck = true;
    this.lastHitPlayer = null;
  }

  update(paddles) {
    if (this.stuck) {
      this.x = WIDTH / 2 - this.radius;
      this.y = HEIGHT - 95;
      return "none";
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x <= 8) {
      this.x = 8;
      this.vx = Math.abs(this.vx);
    }

    if (this.x + this.width >= WIDTH - 8) {
      this.x = WIDTH - 8 - this.width;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y <= 8) {
      this.y = 8;
      this.vy = Math.abs(this.vy);
    }

    for (const paddle of paddles) {
      if (
        this.vy > 0 &&
        this.x + this.width > paddle.x &&
        this.x < paddle.x + paddle.width &&
        this.y + this.height >= paddle.y &&
        this.y + this.height <= paddle.y + paddle.height + 9
      ) {
        this.y = paddle.y - this.height;
        this.vy = -Math.abs(this.vy);

        this.lastHitPlayer = paddle.label;

        // SOM DE COLISÃO DO JOGADOR
        playHitSound(paddle.label);

        const hit =
          (this.x + this.width / 2) -
          (paddle.x + paddle.width / 2);

        this.vx = hit * 0.095;

        const speed = Math.hypot(this.vx, this.vy);
        const targetSpeed = this.speed;

        this.vx = (this.vx / speed) * targetSpeed;
        this.vy = (this.vy / speed) * targetSpeed;
      }
    }

    if (this.y > HEIGHT + 20) {
      return "lost";
    }

    return "none";
  }

  draw() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

class Brick extends GameObject {
  constructor(x, y, width, height, color, points) {
    super(x, y, width, height, color);

    this.points = points;
    this.alive = true;
  }

  draw() {
    if (!this.alive) return;

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

class BreakoutGame {
  constructor() {
    this.paddles = [
      new Paddle(
        WIDTH / 2 - 58,
        HEIGHT - 54,
        "#38bdf8",
        { left: "a", right: "d" },
        "J1"
      ),

      new Paddle(
        WIDTH / 2 - 58,
        HEIGHT - 28,
        "#fb923c",
        { left: "ArrowLeft", right: "ArrowRight" },
        "J2"
      )
    ];

    this.ball = new Ball();
    this.score = 0;
    this.lives = 3;

    this.playerBlocks = {
      J1: 0,
      J2: 0
    };

    this.running = false;
    this.bricks = [];

    this.createBricks();

    this.lastTime = 0;
    this.frame = this.frame.bind(this);

    requestAnimationFrame(this.frame);
  }

  createBricks() {
    this.bricks = [];

    const rows = 5;
    const cols = 10;
    const gap = 8;
    const brickWidth = 72;
    const brickHeight = 22;

    const startX =
      (WIDTH - (cols * brickWidth + (cols - 1) * gap)) / 2;

    const colors = [
      "#ff00ff",
      "#ffff00",
      "#00ff00",
      "#ff6600",
      "#00ffff"
    ];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.bricks.push(
          new Brick(
            startX + col * (brickWidth + gap),
            75 + row * (brickHeight + gap),
            brickWidth,
            brickHeight,
            colors[row % colors.length],
            (rows - row) * 10
          )
        );
      }
    }
  }

  start() {
    if (this.lives <= 0) {
      this.resetGame();
    }

    keys.clear();

    this.paddles.forEach(paddle => {
      paddle.x = WIDTH / 2 - paddle.width / 2;
    });

    if (this.ball.stuck) {
      this.ball.launch();
    }

    this.running = true;

    // INICIA A MÚSICA
    playBackgroundMusic();

    overlay.classList.add("hidden");

    if (statusText) {
      statusText.textContent = "Partida em andamento";
    }
  }

  resetGame() {
    this.score = 0;
    this.lives = 3;

    this.playerBlocks = {
      J1: 0,
      J2: 0
    };

    this.createBricks();
    this.ball.reset();

    this.paddles.forEach(paddle => {
      paddle.x = WIDTH / 2 - paddle.width / 2;
    });

    this.updateHUD();
  }

  updateHUD() {
    scoreEl.textContent = String(this.score).padStart(4, "0");
    livesEl.textContent = this.lives;
  }

  // RESULTADO DOS JOGADORES
  getWinnerMessage() {
    const j1 = this.playerBlocks.J1;
    const j2 = this.playerBlocks.J2;

    if (j1 > j2) {
      return `JOGADOR 1 DESTRUIU MAIS BLOCOS!

Jogador 1: ${j1} blocos destruídos
Jogador 2: ${j2} blocos destruídos`;
    }

    if (j2 > j1) {
      return `JOGADOR 2 DESTRUIU MAIS BLOCOS!

Jogador 1: ${j1} blocos destruídos
Jogador 2: ${j2} blocos destruídos`;
    }

    return `EMPATE!

Jogador 1: ${j1} blocos destruídos
Jogador 2: ${j2} blocos destruídos`;
  }

  showOverlay(title, message, buttonLabel, status) {
    this.running = false;

    // PARA A MÚSICA QUANDO A PARTIDA É INTERROMPIDA
    stopBackgroundMusic();

    keys.clear();

    overlayTitle.textContent = title;
    overlayText.textContent = message;
    startButton.textContent = buttonLabel;

    overlay.classList.remove("hidden");

    if (statusText) {
      statusText.textContent = status;
    }
  }

  update() {
    if (!this.running) return;

    this.paddles.forEach(paddle => paddle.update());

    const result = this.ball.update(this.paddles);

    if (result === "lost") {
      this.lives--;
      this.updateHUD();

      this.ball.reset();

      if (this.lives <= 0) {
        this.showOverlay(
          "FIM DE JOGO!",
          this.getWinnerMessage(),
          "JOGAR NOVAMENTE",
          "Partida encerrada"
        );

        return;
      }

      this.showOverlay(
        "Bola perdida!",
        `Restam ${this.lives} vidas para a equipe. Preparem-se para rebater juntos.`,
        "CONTINUAR",
        "Aguardando a equipe"
      );

      return;
    }

    // COLISÃO COM OS BLOCOS
    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      if (
        this.ball.x < brick.x + brick.width &&
        this.ball.x + this.ball.width > brick.x &&
        this.ball.y < brick.y + brick.height &&
        this.ball.y + this.ball.height > brick.y
      ) {
        brick.alive = false;

        this.ball.vy *= -1;

        // REGISTRA QUAL JOGADOR DESTRUIU O BLOCO
        if (this.ball.lastHitPlayer) {
          this.playerBlocks[this.ball.lastHitPlayer]++;
        }

        this.score += brick.points;
        this.updateHUD();

        break;
      }
    }

    // QUANDO TODOS OS BLOCOS FOREM DESTRUÍDOS
    if (this.bricks.every(brick => !brick.alive)) {
      this.createBricks();
      this.ball.reset();

      this.showOverlay(
        "CAMPO LIMPO!",
        this.getWinnerMessage(),
        "PRÓXIMA RODADA",
        "Rodada concluída"
      );
    }
  }

  drawBackground() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#7b7b7b";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 4;

    for (let x = 15; x < WIDTH; x += 55) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 18, HEIGHT);
      ctx.stroke();
    }

    for (let y = 25; y < HEIGHT; y += 65) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y + 12);
      ctx.stroke();
    }

    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, HEIGHT - 42, WIDTH, 7);
  }

  draw() {
    this.drawBackground();

    this.bricks.forEach(brick => brick.draw());
    this.paddles.forEach(paddle => paddle.draw());

    this.ball.draw();

    ctx.fillStyle = "#000000";
    ctx.font = "bold 12px Comic Sans MS, cursive";

    ctx.fillText(
      "JOGADOR 1",
      this.paddles[0].x,
      this.paddles[0].y - 9
    );

    ctx.fillStyle = "#000000";

    ctx.fillText(
      "JOGADOR 2",
      this.paddles[1].x,
      this.paddles[1].y + 25
    );
  }

  frame(timestamp) {
    const delta = timestamp - this.lastTime;

    this.lastTime = timestamp;

    if (delta < 100) {
      this.update();
    }

    this.draw();

    requestAnimationFrame(this.frame);
  }
}

const game = new BreakoutGame();

document.addEventListener("keydown", event => {
  const key =
    event.key.length === 1
      ? event.key.toLowerCase()
      : event.key;

  if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }

  keys.add(key);

  if (event.key === " " && !game.running) {
    game.start();
  }
});

document.addEventListener("keyup", event => {
  const key =
    event.key.length === 1
      ? event.key.toLowerCase()
      : event.key;

  keys.delete(key);
});

window.addEventListener("blur", () => keys.clear());

startButton.addEventListener("click", () => {
  game.start();
});

if (fullscreenButton && gameShell) {
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await gameShell.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Não foi possível alterar a tela cheia:", error);
    }
  });

  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.textContent = document.fullscreenElement
      ? "SAIR DA TELA CHEIA ✕"
      : "TELA CHEIA ⛶";
  });
}

game.updateHUD();