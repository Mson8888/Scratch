// Full Tetris implementation (spawn, move, rotate, gravity, lock, clear, scoring)
const COLS = 10;
const ROWS = 20;
const BLOCK = 24; // pixel size for each block

const canvas = document.getElementById('game');
if (!canvas) throw new Error('Canvas element with id "game" not found.');
const ctx = canvas.getContext('2d');
// Keep canvas exactly the playfield size; sidebar is a separate DOM element.
canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;
canvas.style.width = canvas.width + 'px';
canvas.style.height = canvas.height + 'px';

// Colors per tetromino type with cute animals/food
const COLORS = {
  I: '🐟', J: '🐮', L: '🐷', O: '🍎', S: '🍕', T: '🐰', Z: '🐝', BOMB: '💣'
};

const COLOR_BG = {
  I: '#00f0f0', J: '#0000f0', L: '#f0a000', O: '#f0f000', S: '#00f000', T: '#a000f0', Z: '#f00000', BOMB: '#888'
};

// Tetromino matrices (4x4 where helpful)
const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  BOMB: [[1]]
};

// Game state
const board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
let current = null;
let nextPiece = null;
let bag = [];
let dropInterval = 1000; // ms per automatic drop (level 0)
let dropCounter = 0;
let lastTime = 0;
let score = 0;
let lines = 0;
let level = 0;
let gameOver = false;
let isPaused = false;
let blocksSpawned = 0;
let bombActive = false;
let nextBombIn = Math.floor(Math.random() * 10) + 10; // 10-20 blocks

// High score persistence
const HS_KEY = 'tetris_highscores_v1';
function loadHighScores(){
  try{
    const s = localStorage.getItem(HS_KEY);
    return s ? JSON.parse(s) : [];
  } catch(e){ return []; }
}

function saveHighScores(list){
  try{ localStorage.setItem(HS_KEY, JSON.stringify(list)); } catch(e){}
}

function addHighScore(name, scoreVal){
  const list = loadHighScores();
  list.push({name: name || '---', score: scoreVal, date: new Date().toISOString()});
  list.sort((a,b)=>b.score - a.score);
  if (list.length>10) list.length = 10;
  saveHighScores(list);
  renderHighScores();
}

function renderHighScores(){
  const list = loadHighScores();
  const el = document.getElementById('hsList');
  if (!el) return;
  el.innerHTML = list.map(s=>`<li>${escapeHtml(s.name)} — ${s.score}</li>`).join('');
}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function showOverlay(message, showInput=true, defaultName=''){
  const overlay = document.getElementById('overlay');
  const msg = document.getElementById('overlay-msg');
  const input = document.getElementById('nameInput');
  const saveBtn = document.getElementById('saveScore');
  const restartBtn = document.getElementById('restartBtn');
  if (!overlay || !msg) return;
  msg.textContent = message;
  overlay.style.display = 'flex';
  if (input){ input.style.display = showInput ? 'inline-block' : 'none'; input.value = defaultName; }
  if (saveBtn) saveBtn.style.display = showInput ? 'inline-block' : 'none';
  restartBtn.onclick = () => { overlay.style.display='none'; restartGame(); };
  if (saveBtn) saveBtn.onclick = ()=>{
    const name = input.value.trim() || '---';
    addHighScore(name, score);
    overlay.style.display = 'none';
    restartGame();
  };
}

function restartGame(){
  // reset board
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) board[y][x]=0;
  score = 0; lines = 0; level = 0; dropInterval = 1000; dropCounter = 0; gameOver = false; isPaused = false;
  blocksSpawned = 0; bombActive = false; nextBombIn = Math.floor(Math.random() * 10) + 10;
  refillBag(); nextPiece = nextFromBag(); spawn(); renderHighScores();
  updatePauseButton();
}

function rotate(matrix) {
  const N = matrix.length;
  const res = Array.from({length:N}, () => Array(N).fill(0));
  for (let y=0;y<N;y++) for (let x=0;x<N;x++) res[x][N-1-y] = matrix[y][x];
  return res;
}

function createPiece(type){
  const mat = SHAPES[type].map(row => row.slice());
  return {type, matrix: mat, x: Math.floor((COLS - mat[0].length)/2), y: 0};
}

function refillBag(){
  bag = ['I','J','L','O','S','T','Z'];
  for (let i = bag.length -1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

function nextFromBag(){
  if (bag.length === 0) refillBag();
  const piece = bag.pop();
  blocksSpawned++;
  // Check if we should spawn a bomb
  if (!bombActive && blocksSpawned >= nextBombIn && nextBombIn > 0) {
    bombActive = true;
    nextBombIn = Math.floor(Math.random() * 10) + 10;
    return 'BOMB';
  }
  return piece;
}

function spawn(){
  if (!nextPiece) nextPiece = nextFromBag();
  current = createPiece(nextPiece);
  nextPiece = nextFromBag();
  if (collide(current.matrix, current.x, current.y)) {
    gameOver = true;
    // show overlay: check if highscore qualifies
    const hs = loadHighScores();
    const qualifies = hs.length < 10 || score > (hs[hs.length-1] ? hs[hs.length-1].score : 0);
    const msg = qualifies ? `Game Over — New High Score: ${score}` : `Game Over — Score: ${score}`;
    showOverlay(msg, qualifies, 'Player');
  }
}

function collide(matrix, offsetX, offsetY){
  for (let y=0;y<matrix.length;y++){
    for (let x=0;x<matrix[y].length;x++){
      if (matrix[y][x]){
        const bx = offsetX + x;
        const by = offsetY + y;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >=0 && board[by][bx]) return true;
      }
    }
  }
  return false;
}

function merge(){
  const m = current.matrix;
  for (let y=0;y<m.length;y++){
    for (let x=0;x<m[y].length;x++){
      if (m[y][x]){
        const bx = current.x + x;
        const by = current.y + y;
        if (by >= 0 && by < ROWS && bx >=0 && bx < COLS) {
          if (current.type === 'BOMB') {
            // Bomb explodes blocks around it
            explodeBomb(bx, by);
            bombActive = false;
          } else {
            board[by][bx] = current.type;
          }
        }
      }
    }
  }
}

function explodeBomb(bx, by){
  // Explosion radius: 1 block in each direction
  const explosionArea = [
    [bx, by], [bx-1, by], [bx+1, by], [bx, by-1], [bx, by+1]
  ];
  for (const [x, y] of explosionArea) {
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
      if (board[y][x]) {
        board[y][x] = 0;
        score += 10;
      }
    }
  }
}

function clearLines(){
  let full = 0;
  let clearedRows = [];
  for (let y = ROWS-1; y>=0; y--){
    if (board[y].every(cell => cell)){
      clearedRows.push(y);
      board.splice(y,1);
      board.unshift(Array(COLS).fill(0));
      full++;
      y++; // recheck same index after splice
    }
  }
  if (full>0){
    lines += full;
    score += [0,40,100,300,1200][full] * (level+1);
    // Level increases every 10 lines
    level = Math.floor(lines/10);
    dropInterval = Math.max(100, 1000 - level*100);
    
    // Spawn new line of random blocks when 10+ lines cleared
    if (full >= 10 || (lines % 10 === 0 && lines > 0)) {
      spawnBlockLine();
    }
  }
}

function spawnBlockLine(){
  // Insert a random line of blocks somewhere in the middle-upper area
  const insertRow = Math.floor(Math.random() * (ROWS / 2)) + Math.floor(ROWS / 4);
  if (insertRow < ROWS - 1) {
    const types = ['I','J','L','O','S','T','Z'];
    const newLine = Array(COLS).fill(0).map(() => types[Math.floor(Math.random() * types.length)]);
    board.splice(insertRow, 0, newLine);
    board.pop(); // Remove bottom row to keep board size
  }
}

function hardDrop(){
  while(!collide(current.matrix, current.x, current.y+1)) current.y++;
  lockPiece();
}

function lockPiece(){
  merge();
  clearLines();
  spawn();
}

function move(dir){
  if (!current || gameOver) return;
  const nx = current.x + dir;
  if (!collide(current.matrix, nx, current.y)) current.x = nx;
}

function rotateCurrent(){
  if (!current) return;
  const rotated = rotate(current.matrix);
  const kicks = [0, -1, 1, -2, 2];
  for (let i=0;i<kicks.length;i++){
    const k = kicks[i];
    if (!collide(rotated, current.x + k, current.y)){
      current.matrix = rotated;
      current.x += k;
      return;
    }
  }
}

// Input handling
let keys = {};
document.addEventListener('keydown', e => {
  if (gameOver) return;
  if (e.key === 'ArrowLeft') { move(-1); }
  else if (e.key === 'ArrowRight') { move(1); }
  else if (e.key === 'ArrowUp') { rotateCurrent(); }
  else if (e.key === 'ArrowDown') { // soft drop
    if (!collide(current.matrix, current.x, current.y+1)) current.y++;
  }
  else if (e.code === 'Space') { hardDrop(); }
  else if (e.key === 'p' || e.key === 'P') { togglePause(); }
});

function togglePause(){
  if (!gameOver) {
    isPaused = !isPaused;
    updatePauseButton();
  }
}

function updatePauseButton(){
  const btn = document.getElementById('pauseBtn');
  if (btn) btn.textContent = isPaused ? 'RESUME' : 'PAUSE';
}

function drawBlock(x,y,color){
  ctx.fillStyle = COLOR_BG[color] || '#999';
  ctx.fillRect(x*BLOCK+1, y*BLOCK+1, BLOCK-2, BLOCK-2);
  // Draw emoji on the block
  ctx.fillStyle = '#000';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(COLORS[color] || '?', x*BLOCK + BLOCK/2, y*BLOCK + BLOCK/2);
}

function draw(){
  // Clear
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw board
  for (let y=0;y<ROWS;y++){
    for (let x=0;x<COLS;x++){
      const cell = board[y][x];
      if (cell){
        drawBlock(x,y,cell);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
      }
    }
  }

  // Draw current piece
  if (current && !isPaused){
    const m = current.matrix;
    for (let y=0;y<m.length;y++){
      for (let x=0;x<m[y].length;x++){
        if (m[y][x]){
          const px = current.x + x;
          const py = current.y + y;
          if (py>=0) drawBlock(px,py,current.type);
        }
      }
    }
  }

  // Update DOM score/lines/next and render highscores
  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');
  const nextEl = document.getElementById('next-piece');
  if (scoreEl) scoreEl.textContent = String(score);
  if (linesEl) linesEl.textContent = String(lines);
  if (levelEl) levelEl.textContent = String(level);
  if (nextEl){ 
    nextEl.textContent = 'NEXT: ' + (nextPiece || ''); 
    nextEl.style.color = nextPiece === 'BOMB' ? '#f00' : '#fff';
  }
  renderHighScores();

  if (gameOver){
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height/2 - 40, canvas.width, 80);
    ctx.fillStyle = '#fff';
    ctx.font = '36px monospace';
    ctx.fillText('GAME OVER', 20, canvas.height/2 + 12);
  }
  
  if (isPaused){
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height/2 - 30, canvas.width, 60);
    ctx.fillStyle = '#fff';
    ctx.font = '32px monospace';
    ctx.fillText('PAUSED', 40, canvas.height/2 + 8);
  }
}

function update(time = 0){
  const delta = time - lastTime;
  lastTime = time;
  if (!gameOver && !isPaused){
    dropCounter += delta;
    if (dropCounter > dropInterval){
      dropCounter = 0;
      if (!collide(current.matrix, current.x, current.y+1)){
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  draw();
  requestAnimationFrame(update);
}

// Start
refillBag();
nextPiece = nextFromBag();
spawn();
requestAnimationFrame(update);

// Wire pause button
const pauseBtn = document.getElementById('pauseBtn');
if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

// Mobile controls: show on small screens and wire touch handlers
function enableMobileControls(){
  const mc = document.getElementById('mobile-controls');
  if (!mc) return;
  // Simple heuristic: show controls if viewport width < 720px
  if (window.innerWidth < 720) mc.style.display = 'flex';
  else mc.style.display = 'none';

  const dpad = mc.querySelector('#dpad');
  if (dpad){
    dpad.addEventListener('touchstart', e => { e.preventDefault(); const btn = e.target.closest('button[data-action]'); if (!btn) return; handleMobileAction(btn.getAttribute('data-action'), true); });
    dpad.addEventListener('touchend', e => { e.preventDefault(); const btn = e.target.closest('button[data-action]'); if (!btn) return; handleMobileAction(btn.getAttribute('data-action'), false); });
    dpad.addEventListener('mousedown', e => { const btn = e.target.closest('button[data-action]'); if (!btn) return; handleMobileAction(btn.getAttribute('data-action'), true); });
    dpad.addEventListener('mouseup', e => { const btn = e.target.closest('button[data-action]'); if (!btn) return; handleMobileAction(btn.getAttribute('data-action'), false); });
  }

  const hard = document.getElementById('hardDropBtn');
  if (hard) hard.addEventListener('click', e => { hardDrop(); });

  // Soft-drop continuous while holding 'down'
  let softDropTimer = null;
  function handleMobileAction(action, pressed){
    if (action === 'left' && pressed) move(-1);
    if (action === 'right' && pressed) move(1);
    if (action === 'up' && pressed) rotateCurrent();
    if (action === 'down'){
      if (pressed){
        // immediate step
        if (!collide(current.matrix, current.x, current.y+1)) current.y++;
        // then start interval
        softDropTimer = setInterval(()=>{ if (!collide(current.matrix, current.x, current.y+1)) current.y++; else { clearInterval(softDropTimer); } }, 120);
      } else { if (softDropTimer){ clearInterval(softDropTimer); softDropTimer = null; } }
    }
  }
}

window.addEventListener('resize', enableMobileControls);
enableMobileControls();
