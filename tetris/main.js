/* ============================================================
  ARCANE TETRIS — Rebuilt Minimal Implementation
  ============================================================ */
/* ============================================================
  CANVAS SETUP
  ============================================================ */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const NEXT_CANVAS = document.getElementById('next');
const NCTX = NEXT_CANVAS ? NEXT_CANVAS.getContext('2d') : null;

/* ============================================================
  GRID CONSTANTS
  ============================================================ */
const COLS = 10, ROWS = 20;
const BLOCK = Math.floor(canvas.width / COLS);

/* ============================================================
  SHAPES & COLORS
  ============================================================ */
const SHAPES = [
  [[1,1,1,1]], // I
  [[1,1],[1,1]], // O
  [[0,1,1],[1,1,0]], // S
  [[1,1,0],[0,1,1]], // Z
  [[1,0,0],[1,1,1]], // J
  [[0,0,1],[1,1,1]], // L
  [[0,1,0],[1,1,1]]  // T
];

const COLORS = ['#00ffcc','#ffd166','#06d6a0','#ef476f','#8338ec','#ffb703','#118ab2'];

/* color helpers */
function hexToRgb(hex){ hex = hex.replace('#',''); const bigint = parseInt(hex,16); return {r:(bigint>>16)&255,g:(bigint>>8)&255,b:bigint&255}; }
function rgba(hex, a){ const c = hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; }

/* ============================================================
  GRID HELPERS
  ============================================================ */
function makeGrid(){ return Array.from({length:ROWS},()=>Array(COLS).fill(0)); }
let grid = makeGrid();

/* ============================================================
  PIECE HELPERS
  ============================================================ */
function cloneShape(shape){ return shape.map(r=>r.slice()); }

/* ============================================================
   ROTATION
   ============================================================ */
function rotate(shape){
  const rows = shape.length, cols = shape[0].length;
  const out = Array.from({length:cols},()=>[]);
  for(let x=0;x<cols;x++) for(let y=rows-1;y>=0;y--) out[x].push(shape[y][x]);
  return out;
}

/* ============================================================
   COLLISION CHECK
   ============================================================ */
function collide(g, piece){
  const {pos, shape} = piece;
  for(let y=0;y<shape.length;y++){
    for(let x=0;x<shape[y].length;x++){
      if(!shape[y][x]) continue;
      const gx = pos.x + x; const gy = pos.y + y;
      if(gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if(gy < 0) continue; // above grid OK
      if(g[gy][gx] !== 0) return true;
    }
  }
  return false;
}

/* ============================================================
   MERGE PIECE INTO GRID
   ============================================================ */
function merge(g, piece){
  piece.shape.forEach((row,y)=>row.forEach((v,x)=>{ if(v){ const gy=piece.pos.y+y; if(gy>=0) g[gy][piece.pos.x+x]=piece.color; }}));
}

/* ============================================================
   LINE CLEARING
   ============================================================ */
function sweepLines(){
  let cleared=0;
  for(let y=ROWS-1;y>=0;y--){
    if(grid[y].every(c=>c!==0)){ grid.splice(y,1); grid.unshift(Array(COLS).fill(0)); cleared++; y++; }
  }
  return cleared;
}

/* ============================================================
  PIECE GENERATION
  ============================================================ */
function randPiece(){ const i=Math.floor(Math.random()*SHAPES.length); return { shape: cloneShape(SHAPES[i]), pos:{x:Math.floor(COLS/2)-1,y: -1}, color: COLORS[i] }; }

/* ============================================================
  GAME STATE VARIABLES
  ============================================================ */
let cur = null, next = null;
let dropCounter=0, dropInterval=800, last=0;
let score=0, level=1, lines=0;
let multiplier = 1; // score multiplier (increases with level)
let state='start'; // start | playing | paused | gameover

/* ============================================================
   GAME FLOW: START / END
   ============================================================ */
function startGame(){
  grid = makeGrid(); score=0; level=1; lines=0; dropInterval=800;
  updateMultiplier();
  next = randPiece(); spawnNext(); state='playing';
  document.getElementById('startScreen').style.display='none';
  document.getElementById('gameOverScreen').style.display='none';
}

function spawnNext(){ cur = { shape: next.shape.map(r=>r.slice()), pos:{x:0,y:0}, color: next.color }; const w=Math.max(...cur.shape.map(r=>r.length)); cur.pos.x = Math.floor((COLS-w)/2); cur.pos.y = - (cur.shape.length-2); next = randPiece(); if(collide(grid,cur)) { state='gameover'; document.getElementById('gameOverScreen').style.display='flex'; document.getElementById('finalScore').textContent=score; } }

/* ============================================================
  LEVEL PROGRESSION
  ============================================================ */
function updateLevel(){ const nl = Math.floor(lines/10)+1; if(nl>level){ level=nl; dropInterval = Math.max(80, Math.floor(dropInterval*0.85)); }}
function updateMultiplier(){ multiplier = 1 + (level-1)*0.25; }

/* ============================================================
  RENDERING
  ============================================================ */
function draw(){ ctx.clearRect(0,0,canvas.width,canvas.height);
  // draw grid
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    const c = grid[y][x]; if(!c) continue;
    const gx = x*BLOCK+2, gy = y*BLOCK+2, size = BLOCK-4;
    ctx.save(); ctx.shadowColor = rgba(c,0.65); ctx.shadowBlur = 14;
    const g = ctx.createLinearGradient(gx,gy,gx+size,gy+size);
    g.addColorStop(0, rgba(c,1)); g.addColorStop(1, rgba('#000000',0.15));
    ctx.fillStyle = g; ctx.fillRect(gx,gy,size,size);
    ctx.strokeStyle = '#00000055'; ctx.strokeRect(gx,gy,size,size);
    ctx.fillStyle = rgba('#ffffff',0.06); ctx.fillRect(gx+4,gy+4,size-8,Math.floor(size/4));
    ctx.restore();
  }
  // draw current
  if(cur){ cur.shape.forEach((row,y)=>row.forEach((v,x)=>{ if(v){ const gx=(cur.pos.x+x)*BLOCK+2, gy=(cur.pos.y+y)*BLOCK+2, size=BLOCK-4; ctx.save(); ctx.shadowColor = rgba(cur.color,0.7); ctx.shadowBlur = 16; const g=ctx.createLinearGradient(gx,gy,gx+size,gy+size); g.addColorStop(0, rgba(cur.color,1)); g.addColorStop(1, rgba('#000000',0.12)); ctx.fillStyle = g; ctx.fillRect(gx,gy,size,size); ctx.strokeStyle='#00000055'; ctx.strokeRect(gx,gy,size,size); ctx.fillStyle = rgba('#ffffff',0.08); ctx.fillRect(gx+4,gy+4,size-8,Math.floor(size/4)); ctx.restore(); } })); }
  // draw next
  if(NCTX && next){ NCTX.clearRect(0,0,NEXT_CANVAS.width,NEXT_CANVAS.height); const cell = 18; const ox=8, oy=8; for(let y=0;y<next.shape.length;y++) for(let x=0;x<next.shape[y].length;x++){ if(next.shape[y][x]){ const gx=ox+x*cell, gy=oy+y*cell, size=cell-4; NCTX.save(); NCTX.shadowColor = rgba(next.color,0.6); NCTX.shadowBlur = 8; const g=NCTX.createLinearGradient(gx,gy,gx+size,gy+size); g.addColorStop(0, rgba(next.color,1)); g.addColorStop(1, rgba('#000000',0.12)); NCTX.fillStyle=g; NCTX.fillRect(gx,gy,size,size); NCTX.strokeStyle='#00000055'; NCTX.strokeRect(gx,gy,size,size); NCTX.restore(); } } }

}

function update(time=0){
  const dt = time - last;
  last = time;
  if(state==='playing'){
    dropCounter += dt;
    if(dropCounter > dropInterval){
      cur.pos.y++;
      if(collide(grid,cur)){
        cur.pos.y--;
        merge(grid,cur);
        const cleared = sweepLines();
        if(cleared){ score += Math.floor(cleared*100*multiplier); lines += cleared; updateLevel(); updateMultiplier(); }
        spawnNext();
      }
      dropCounter = 0;
    }
  }

  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('mult').textContent = multiplier.toFixed(2) + 'x';
  draw();
  requestAnimationFrame(update);
}

document.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase(); if(state!=='playing' && k!=='p' && k!=='q') return;
  if(k==='p'){ if(state==='playing'){ state='paused'; document.getElementById('pauseScreen').style.display='flex'; } else if(state==='paused'){ state='playing'; document.getElementById('pauseScreen').style.display='none'; } return; }
  if(k==='q'){ state='start'; document.getElementById('startScreen').style.display='flex'; return; }
  if(k==='arrowleft' || k==='a'){ cur.pos.x--; if(collide(grid,cur)) cur.pos.x++; }
  if(k==='arrowright' || k==='d'){ cur.pos.x++; if(collide(grid,cur)) cur.pos.x--; }
  if(k==='arrowdown' || k==='s'){ cur.pos.y++; if(collide(grid,cur)){ cur.pos.y--; merge(grid,cur); const c=sweepLines(); if(c){ score+=Math.floor(c*100*multiplier); lines+=c; updateLevel(); updateMultiplier(); } spawnNext(); } }
  if(k==='arrowup' || k==='w'){ const old = cur.shape; cur.shape = rotate(cur.shape); if(collide(grid,cur)){ // try simple wall kicks
      let kicked=false; for(const dx of [-1,1,-2,2]){ cur.pos.x += dx; if(!collide(grid,cur)){ kicked=true; break;} cur.pos.x -= dx; } if(!kicked) cur.shape = old; }
  }
  if(e.code==='Space'){ e.preventDefault(); while(!collide(grid,cur)) cur.pos.y++; cur.pos.y--; merge(grid,cur); const c=sweepLines(); if(c){ score+=Math.floor(c*100*multiplier); lines+=c; updateLevel(); updateMultiplier(); } spawnNext(); }
});

// UI buttons
const startOverlayBtn = document.getElementById('startOverlayBtn'); const startBtn = document.getElementById('start'); const pauseBtn = document.getElementById('pause'); const hudQuit = document.getElementById('quit'); const pauseQuit = document.getElementById('quitBtn'); const resumeBtn = document.getElementById('resumeBtn'); const restartBtn = document.getElementById('restartBtn'); const quitBtn2 = document.getElementById('quitBtn2');
if(startOverlayBtn) startOverlayBtn.addEventListener('click', (e)=>{ e.preventDefault(); console.log('StartOverlay button clicked'); if(state!=='playing') { next = randPiece(); startGame(); } });
if(startBtn) startBtn.addEventListener('click', (e)=>{ e.preventDefault(); console.log('Start button clicked'); if(state!=='playing') { next = randPiece(); startGame(); } });
if(pauseBtn) pauseBtn.addEventListener('click', ()=>{ if(state==='playing'){ state='paused'; document.getElementById('pauseScreen').style.display='flex'; } });
if(hudQuit) hudQuit.addEventListener('click', ()=>{ state='start'; document.getElementById('startScreen').style.display='flex'; });
if(pauseQuit) pauseQuit.addEventListener('click', ()=>{ state='start'; document.getElementById('pauseScreen').style.display='none'; document.getElementById('startScreen').style.display='flex'; });
if(resumeBtn) resumeBtn.addEventListener('click', ()=>{ state='playing'; document.getElementById('pauseScreen').style.display='none'; });
if(restartBtn) restartBtn.addEventListener('click', ()=>{ next = randPiece(); startGame(); });
if(quitBtn2) quitBtn2.addEventListener('click', ()=>{ state='start'; document.getElementById('startScreen').style.display='flex'; });

// Initialize
next = randPiece(); spawnNext(); requestAnimationFrame(update);
