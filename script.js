// Minimal Tetris starter: game loop, keyboard handlers, and rendering scaffold.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const COLS = 10;
const ROWS = 20;
const BLOCK = 24; // pixel size for each block (canvas is 240x400 -> 10x16-ish)

ctx.scale(BLOCK/24, BLOCK/24); // allow easier resizing if needed

// Create empty board
const board = Array.from({length: ROWS}, () => Array(COLS).fill(0));

let lastTime = 0;
function update(time = 0){
  const delta = time - lastTime;
  lastTime = time;
  // TODO: advance piece based on gravity, handle input, clear lines

  draw();
  requestAnimationFrame(update);
}

function draw(){
  // Clear
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw board grid (placeholder)
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(board[r][c]){
        drawBlock(c,r,'#61dafb');
      } else {
        // draw faint grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.strokeRect(c*BLOCK, r*BLOCK, BLOCK, BLOCK);
      }
    }
  }
}

function drawBlock(x,y,color){
  ctx.fillStyle = color;
  ctx.fillRect(x*BLOCK+1, y*BLOCK+1, BLOCK-2, BLOCK-2);
}

// Simple keyboard scaffoldndocument.addEventListener('keydown', e => {
  if(e.key === 'ArrowLeft'){
    // move piece left
  } else if(e.key === 'ArrowRight'){
    // move piece right
  } else if(e.key === 'ArrowUp'){
    // rotate piece
  } else if(e.key === 'ArrowDown'){
    // soft drop
  }
});

requestAnimationFrame(update);
