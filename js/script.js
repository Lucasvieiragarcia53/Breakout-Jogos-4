
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
    ctx.save();
    ctx.shadowBlur = 17;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 7);
    ctx.fill();

    ctx.restore();
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
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ffffff";
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(
      this.x + this.radius,
      this.y + this.radius,
      this.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();
    ctx.restore();
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

    ctx.save();
    ctx.shadowBlur = 9;
    ctx.shadowColor = this.color + "88";
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 4);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.22)";
    ctx.fillRect(this.x + 5, this.y + 3, this.width - 10, 2);

    ctx.restore();
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
      "#f87171",
      "#fbbf24",
      "#4ade80",
      "#38bdf8",
      "#a78bfa"
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

    overlay.classList.add("hidden");

    if (statusText) {
      statusText.textContent = "Partida em andamento";
    }
  }

  resetGame() {
    this.score = 0;
    this.lives = 3;

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

  showOverlay(title, message, buttonLabel, status) {
    this.running = false;
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
          "Fim de jogo",
          `A equipe fez ${this.score} pontos. Tentem novamente e cooperem para manter a bola em jogo!`,
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

        this.score += brick.points;
        this.updateHUD();

        break;
      }
    }

    if (this.bricks.every(brick => !brick.alive)) {
      this.createBricks();
      this.ball.reset();

      this.showOverlay(
        "Campo limpo!",
        "Vocês destruíram todos os blocos! Continuem jogando para bater a pontuação.",
        "CONTINUAR",
        "Campo limpo"
      );
    }
  }

  drawBackground() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#171717";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "rgba(86, 117, 166, 0.10)";
    ctx.lineWidth = 1;

    for (let x = 20; x < WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    for (let y = 20; y < HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(87,230,255,.18)";
    ctx.setLineDash([5, 8]);

    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 42);
    ctx.lineTo(WIDTH, HEIGHT - 42);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  draw() {
    this.drawBackground();

    this.bricks.forEach(brick => brick.draw());
    this.paddles.forEach(paddle => paddle.draw());

    this.ball.draw();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "700 10px Inter, sans-serif";

    ctx.fillText(
      "JOGADOR 1",
      this.paddles[0].x,
      this.paddles[0].y - 9
    );

    ctx.fillStyle = "#fb923c";

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
