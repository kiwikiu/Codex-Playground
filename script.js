const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: '#4fd8ff',
  J: '#5c79ff',
  L: '#ffb84d',
  O: '#ffe14f',
  S: '#62e06e',
  T: '#c86cff',
  Z: '#ff6666',
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const restartBtn = document.getElementById('restart');

let board;
let active;
let score;
let level;
let lines;
let dropCounter;
let dropInterval;
let lastTime;
let paused;
let gameOver;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const matrix = SHAPES[type].map((row) => [...row]);
  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: 0,
  };
}

function collide(piece, testX = piece.x, testY = piece.y, testMatrix = piece.matrix) {
  for (let y = 0; y < testMatrix.length; y += 1) {
    for (let x = 0; x < testMatrix[y].length; x += 1) {
      if (!testMatrix[y][x]) continue;
      const nx = testX + x;
      const ny = testY + y;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function merge(piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const by = piece.y + y;
      const bx = piece.x + x;
      if (by >= 0) {
        board[by][bx] = piece.type;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    const rewards = [0, 100, 300, 500, 800];
    score += rewards[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 800 - (level - 1) * 70);
    updateHUD();
  }
}

function rotate(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      rotated[x][rows - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function move(dir) {
  const nx = active.x + dir;
  if (!collide(active, nx, active.y)) {
    active.x = nx;
  }
}

function softDrop() {
  const ny = active.y + 1;
  if (!collide(active, active.x, ny)) {
    active.y = ny;
    score += 1;
    updateHUD();
    return true;
  }

  merge(active);
  clearLines();
  active = randomPiece();

  if (collide(active)) {
    gameOver = true;
  }
  return false;
}

function hardDrop() {
  let steps = 0;
  while (softDrop()) {
    steps += 1;
  }
  score += steps * 2;
  updateHUD();
}

function tryRotate() {
  const rotated = rotate(active.matrix);
  const kicks = [0, -1, 1, -2, 2];
  for (const offset of kicks) {
    if (!collide(active, active.x + offset, active.y, rotated)) {
      active.x += offset;
      active.matrix = rotated;
      return;
    }
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

function drawBoard() {
  ctx.fillStyle = '#04060d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) drawCell(x, y, COLORS[cell]);
    });
  });

  active.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const px = active.x + x;
      const py = active.y + y;
      if (py >= 0) drawCell(px, py, COLORS[active.type]);
    });
  });

  if (paused || gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(gameOver ? 'Game Over' : 'Pause', canvas.width / 2, canvas.height / 2);
    ctx.font = '16px sans-serif';
    if (gameOver) {
      ctx.fillText('Drücke Neu starten', canvas.width / 2, canvas.height / 2 + 32);
    }
  }
}

function updateHUD() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
}

function gameLoop(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (!paused && !gameOver) {
    dropCounter += delta;
    if (dropCounter > dropInterval) {
      softDrop();
      dropCounter = 0;
    }
  }

  drawBoard();
  requestAnimationFrame(gameLoop);
}

function resetGame() {
  board = createBoard();
  active = randomPiece();
  score = 0;
  level = 1;
  lines = 0;
  dropCounter = 0;
  dropInterval = 800;
  lastTime = 0;
  paused = false;
  gameOver = false;
  updateHUD();
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyP') {
    paused = !paused;
    return;
  }

  if (paused || gameOver) return;

  if (event.code === 'ArrowLeft') move(-1);
  else if (event.code === 'ArrowRight') move(1);
  else if (event.code === 'ArrowDown') {
    softDrop();
    dropCounter = 0;
  } else if (event.code === 'ArrowUp') tryRotate();
  else if (event.code === 'Space') {
    event.preventDefault();
    hardDrop();
    dropCounter = 0;
  }
});

restartBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(gameLoop);
