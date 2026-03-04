/* ============================================================
   ARCANE TETRIS — main.js
   Ghost piece · Hold piece · High score · Web Audio SFX
   Responsive canvas · Touch controls · Line clear flash
============================================================ */

/* ── Canvas setup ── */
var canvas     = document.getElementById("gameCanvas");
var ctx        = canvas.getContext("2d");
var nextCanvas = document.getElementById("nextCanvas");
var nCtx       = nextCanvas.getContext("2d");
var holdCanvas = document.getElementById("holdCanvas");
var hCtx       = holdCanvas.getContext("2d");

var COLS = 10, ROWS = 20;
var BLOCK;

function resizeCanvas() {
  var maxH = Math.min(window.innerHeight - 130, 580);
  var maxW = Math.min(window.innerWidth  - 220, 320);
  BLOCK    = Math.floor(Math.min(maxH / ROWS, maxW / COLS));
  canvas.width  = BLOCK * COLS;
  canvas.height = BLOCK * ROWS;
}
resizeCanvas();
window.addEventListener("resize", function() { resizeCanvas(); draw(); });

/* ── Pieces ── */
var SHAPES = [
  [[1,1,1,1]],              // I
  [[1,1],[1,1]],            // O
  [[0,1,1],[1,1,0]],        // S
  [[1,1,0],[0,1,1]],        // Z
  [[1,0,0],[1,1,1]],        // J
  [[0,0,1],[1,1,1]],        // L
  [[0,1,0],[1,1,1]]         // T
];

var COLORS = [
  "#00ffcc", // I - teal
  "#ffd166", // O - gold
  "#06d6a0", // S - green
  "#ef476f", // Z - pink
  "#8338ec", // J - violet
  "#ffb703", // L - amber
  "#118ab2"  // T - blue
];

var PIECE_NAMES = ["I","O","S","Z","J","L","T"];

/* ── Grid ── */
function makeGrid() { return Array.from({length:ROWS}, function(){ return Array(COLS).fill(0); }); }
var grid = makeGrid();

/* ── Color helpers ── */
function hexToRgb(hex) {
  hex = hex.replace("#","");
  var n = parseInt(hex, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function rgba(hex, a) { var c=hexToRgb(hex); return "rgba("+c.r+","+c.g+","+c.b+","+a+")"; }

/* ── Rotation ── */
function rotate(shape) {
  var rows=shape.length, cols=shape[0].length;
  var out=[];
  for(var x=0;x<cols;x++){
    out[x]=[];
    for(var y=rows-1;y>=0;y--) out[x].push(shape[y][x]);
  }
  return out;
}

/* ── Collision ── */
function collides(g, piece) {
  for(var y=0;y<piece.shape.length;y++){
    for(var x=0;x<piece.shape[y].length;x++){
      if(!piece.shape[y][x]) continue;
      var gx=piece.pos.x+x, gy=piece.pos.y+y;
      if(gx<0||gx>=COLS||gy>=ROWS) return true;
      if(gy<0) continue;
      if(g[gy][gx]!==0) return true;
    }
  }
  return false;
}

/* ── Merge ── */
function merge(g, piece) {
  piece.shape.forEach(function(row,y){
    row.forEach(function(v,x){
      if(v){ var gy=piece.pos.y+y; if(gy>=0) g[gy][piece.pos.x+x]=piece.color; }
    });
  });
}

/* ── Line clear ── */
function sweepLines() {
  var cleared=0;
  for(var y=ROWS-1;y>=0;y--){
    if(grid[y].every(function(c){ return c!==0; })){
      grid.splice(y,1);
      grid.unshift(Array(COLS).fill(0));
      cleared++; y++;
    }
  }
  return cleared;
}

/* ── Piece factory ── */
function makePiece(idx) {
  var shape = SHAPES[idx].map(function(r){ return r.slice(); });
  return {
    shape: shape,
    pos:   { x: Math.floor(COLS/2) - Math.floor(shape[0].length/2), y: -1 },
    color: COLORS[idx],
    name:  PIECE_NAMES[idx]
  };
}
function randPiece() { return makePiece(Math.floor(Math.random() * SHAPES.length)); }

/* ── Ghost piece ── */
function getGhost(piece) {
  var ghost = { shape: piece.shape, pos: { x: piece.pos.x, y: piece.pos.y }, color: piece.color };
  while(!collides(grid, { shape: ghost.shape, pos: { x: ghost.pos.x, y: ghost.pos.y+1 }, color: "" })){
    ghost.pos.y++;
  }
  return ghost;
}

/* ── Audio ── */
var audioCtx = null;
function getAudio() { if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); return audioCtx; }
function playTone(freq, type, dur, vol, sweep) {
  try {
    var ac=getAudio(), osc=ac.createOscillator(), gain=ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type=type; osc.frequency.value=freq;
    if(sweep) osc.frequency.exponentialRampToValueAtTime(sweep, ac.currentTime+dur);
    gain.gain.setValueAtTime(vol||0.2, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+dur);
    osc.start(ac.currentTime); osc.stop(ac.currentTime+dur);
  } catch(e){}
}
function sfxMove()     { playTone(220,"square",0.04,0.06,180); }
function sfxRotate()   { playTone(330,"triangle",0.07,0.08,440); }
function sfxDrop()     { playTone(150,"sine",0.1,0.12,80); }
function sfxClear(n)   { 
  var freqs=[262,330,392,523];
  for(var i=0;i<Math.min(n,4);i++){
    (function(i){ setTimeout(function(){ playTone(freqs[i],"triangle",0.25,0.06); }, i*90); })(i);
  }
}
function sfxHold()     { playTone(440,"triangle",0.08,0.07,330); }
function sfxGameOver() { playTone(220,"sawtooth",0.3,0.1,80); setTimeout(function(){ playTone(150,"sawtooth",0.4,0.1,60); },250); }

/* ── High score ── */
var highScore = parseInt(localStorage.getItem("arcane_tetris_best") || "0");

/* ── Game state ── */
var cur=null, nextPiece=null, heldPiece=null, canHold=true;
var dropCounter=0, dropInterval=800, last=0;
var score=0, level=1, linesCleared=0, multiplier=1;
var state="start"; // start | playing | paused | gameover

/* ── Start / reset ── */
function startGame() {
  grid         = makeGrid();
  score        = 0; level=1; linesCleared=0; dropInterval=800; multiplier=1;
  heldPiece    = null; canHold=true;
  nextPiece    = randPiece();
  state        = "playing";
  spawnPiece();
  hideAllOverlays();
  updateHUD();
  getAudio();
}

function spawnPiece() {
  cur       = { shape: nextPiece.shape.map(function(r){return r.slice();}), pos:{x:0,y:0}, color:nextPiece.color, name:nextPiece.name };
  var w     = Math.max.apply(null, cur.shape.map(function(r){return r.length;}));
  cur.pos.x = Math.floor((COLS-w)/2);
  cur.pos.y = -(cur.shape.length-1);
  nextPiece = randPiece();
  canHold   = true;
  if(collides(grid, cur)){
    state = "gameover";
    if(score > highScore){ highScore=score; localStorage.setItem("arcane_tetris_best", highScore); }
    sfxGameOver();
    showGameOver();
  }
}

/* ── Hold ── */
function holdPiece() {
  if(!canHold) return;
  sfxHold();
  if(!heldPiece){
    heldPiece = makePiece(PIECE_NAMES.indexOf(cur.name) >= 0 ? PIECE_NAMES.indexOf(cur.name) : 0);
    spawnPiece();
  } else {
    var tmp   = makePiece(PIECE_NAMES.indexOf(cur.name) >= 0 ? PIECE_NAMES.indexOf(cur.name) : 0);
    cur       = { shape: heldPiece.shape.map(function(r){return r.slice();}), pos:{x:0,y:0}, color:heldPiece.color, name:heldPiece.name };
    var w     = Math.max.apply(null, cur.shape.map(function(r){return r.length;}));
    cur.pos.x = Math.floor((COLS-w)/2);
    cur.pos.y = -(cur.shape.length-1);
    heldPiece = tmp;
  }
  canHold = false;
}

/* ── Lock & score ── */
function lockPiece() {
  merge(grid, cur);
  var n = sweepLines();
  if(n > 0){
    var pts = [0,100,300,500,800][n] || n*100;
    score  += Math.floor(pts * multiplier);
    linesCleared += n;
    sfxClear(n);
    document.querySelector(".canvas-wrap").classList.remove("flash");
    void document.querySelector(".canvas-wrap").offsetWidth;
    document.querySelector(".canvas-wrap").classList.add("flash");
    updateLevel();
  }
  sfxDrop();
  spawnPiece();
  updateHUD();
}

/* ── Level progression ── */
function updateLevel() {
  var nl = Math.floor(linesCleared / 10) + 1;
  if(nl > level){
    level       = nl;
    dropInterval = Math.max(80, Math.floor(800 * Math.pow(0.85, level-1)));
    multiplier   = parseFloat((1 + (level-1)*0.25).toFixed(2));
  }
}

/* ── HUD ── */
function updateHUD() {
  document.getElementById("score").textContent = score;
  document.getElementById("best").textContent  = Math.max(score, highScore);
  document.getElementById("level").textContent = level;
  document.getElementById("lines").textContent = linesCleared;
  document.getElementById("mult").textContent  = "×" + multiplier.toFixed(2);
}

/* ── Draw block ── */
function drawBlock(context, x, y, color, alpha, size) {
  size   = size || BLOCK;
  alpha  = (alpha === undefined) ? 1 : alpha;
  var bx = x*size+1, by=y*size+1, bs=size-2;
  if(alpha < 1){
    context.globalAlpha = alpha;
    context.strokeStyle = rgba(color, 0.5);
    context.lineWidth   = 1;
    context.strokeRect(bx+0.5, by+0.5, bs-1, bs-1);
    context.globalAlpha = 1;
    return;
  }
  context.save();
  context.shadowColor = rgba(color, 0.55);
  context.shadowBlur  = 10;
  var g = context.createLinearGradient(bx,by,bx+bs,by+bs);
  g.addColorStop(0, rgba(color,1));
  g.addColorStop(1, rgba(color,0.7));
  context.fillStyle = g;
  context.fillRect(bx,by,bs,bs);
  // Highlight
  context.fillStyle = rgba("#ffffff",0.09);
  context.fillRect(bx+2,by+2,bs-4,Math.floor(bs/3));
  // Border
  context.strokeStyle = rgba(color,0.3);
  context.lineWidth = 1;
  context.strokeRect(bx,by,bs,bs);
  context.restore();
}

/* ── Main draw ── */
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Grid lines
  ctx.strokeStyle = "rgba(0,255,200,0.03)";
  ctx.lineWidth = 1;
  for(var x=0;x<=COLS;x++){ ctx.beginPath(); ctx.moveTo(x*BLOCK,0); ctx.lineTo(x*BLOCK,canvas.height); ctx.stroke(); }
  for(var y=0;y<=ROWS;y++){ ctx.beginPath(); ctx.moveTo(0,y*BLOCK); ctx.lineTo(canvas.width,y*BLOCK); ctx.stroke(); }

  // Locked blocks
  for(var row=0;row<ROWS;row++){
    for(var col=0;col<COLS;col++){
      if(grid[row][col]) drawBlock(ctx, col, row, grid[row][col]);
    }
  }

  // Ghost piece
  if(cur && state==="playing"){
    var ghost = getGhost(cur);
    ghost.shape.forEach(function(row,y){
      row.forEach(function(v,x){
        if(v) drawBlock(ctx, ghost.pos.x+x, ghost.pos.y+y, cur.color, 0.18);
      });
    });
  }

  // Current piece
  if(cur){
    cur.shape.forEach(function(row,y){
      row.forEach(function(v,x){
        if(v && cur.pos.y+y >= 0) drawBlock(ctx, cur.pos.x+x, cur.pos.y+y, cur.color);
      });
    });
  }

  // Next piece preview
  if(nCtx && nextPiece){
    nCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
    var cell = 20;
    var ox   = Math.floor((nextCanvas.width  - nextPiece.shape[0].length*cell)/2);
    var oy   = Math.floor((nextCanvas.height - nextPiece.shape.length*cell)/2);
    nextPiece.shape.forEach(function(row,y){
      row.forEach(function(v,x){
        if(v){
          nCtx.save();
          nCtx.shadowColor = rgba(nextPiece.color,0.5); nCtx.shadowBlur=8;
          var g=nCtx.createLinearGradient(ox+x*cell,oy+y*cell,ox+x*cell+cell,oy+y*cell+cell);
          g.addColorStop(0,rgba(nextPiece.color,1)); g.addColorStop(1,rgba(nextPiece.color,0.7));
          nCtx.fillStyle=g; nCtx.fillRect(ox+x*cell+1,oy+y*cell+1,cell-2,cell-2);
          nCtx.restore();
        }
      });
    });
  }

  // Hold piece preview
  if(hCtx){
    hCtx.clearRect(0,0,holdCanvas.width,holdCanvas.height);
    if(heldPiece){
      var cell2 = 20;
      var hox   = Math.floor((holdCanvas.width  - heldPiece.shape[0].length*cell2)/2);
      var hoy   = Math.floor((holdCanvas.height - heldPiece.shape.length*cell2)/2);
      heldPiece.shape.forEach(function(row,y){
        row.forEach(function(v,x){
          if(v){
            hCtx.save();
            var alpha = canHold ? 1 : 0.35;
            hCtx.globalAlpha = alpha;
            hCtx.shadowColor = rgba(heldPiece.color,0.5); hCtx.shadowBlur=8;
            var g=hCtx.createLinearGradient(hox+x*cell2,hoy+y*cell2,hox+x*cell2+cell2,hoy+y*cell2+cell2);
            g.addColorStop(0,rgba(heldPiece.color,1)); g.addColorStop(1,rgba(heldPiece.color,0.7));
            hCtx.fillStyle=g; hCtx.fillRect(hox+x*cell2+1,hoy+y*cell2+1,cell2-2,cell2-2);
            hCtx.restore();
          }
        });
      });
    }
  }
}

/* ── Game loop ── */
function gameLoop(time) {
  time = time || 0;
  var dt = time - last;
  last   = time;

  if(state === "playing"){
    dropCounter += dt;
    if(dropCounter > dropInterval){
      cur.pos.y++;
      if(collides(grid,cur)){ cur.pos.y--; lockPiece(); }
      dropCounter = 0;
    }
  }

  draw();
  requestAnimationFrame(gameLoop);
}

/* ── Input ── */
document.addEventListener("keydown", function(e) {
  if(state !== "playing"){
    if(e.key === "p" || e.key === "P") return;
    return;
  }
  var k = e.key;

  if(k==="ArrowLeft"  || k==="a" || k==="A"){ cur.pos.x--; if(collides(grid,cur)) cur.pos.x++; else sfxMove(); }
  if(k==="ArrowRight" || k==="d" || k==="D"){ cur.pos.x++; if(collides(grid,cur)) cur.pos.x--; else sfxMove(); }

  if(k==="ArrowDown"  || k==="s" || k==="S"){
    e.preventDefault();
    cur.pos.y++;
    if(collides(grid,cur)){ cur.pos.y--; lockPiece(); }
    else dropCounter = 0;
  }

  if(k==="ArrowUp" || k==="w" || k==="W"){
    var old = cur.shape;
    cur.shape = rotate(cur.shape);
    if(collides(grid,cur)){
      var kicked=false;
      for(var dx of [-1,1,-2,2]){
        cur.pos.x+=dx;
        if(!collides(grid,cur)){ kicked=true; break; }
        cur.pos.x-=dx;
      }
      if(!kicked) cur.shape=old;
      else sfxRotate();
    } else { sfxRotate(); }
  }

  if(e.code==="Space"){
    e.preventDefault();
    while(!collides(grid,cur)) cur.pos.y++;
    cur.pos.y--;
    lockPiece();
  }

  if(k==="c" || k==="C" || k==="Shift") holdPiece();

  if(k==="p" || k==="P"){
    if(state==="playing"){ state="paused"; showOverlay("pauseScreen"); }
    else if(state==="paused"){ state="playing"; hideAllOverlays(); }
  }
});

/* ── Touch controls ── */
function addTouch(id, fn) {
  var btn = document.getElementById(id);
  if(!btn) return;
  var fire = function(e){ e.preventDefault(); fn(); };
  btn.addEventListener("touchstart", fire, {passive:false});
  btn.addEventListener("mousedown",  fire);
}

var touchRepeat = null;
function startRepeat(fn){ fn(); touchRepeat=setInterval(fn,120); }
function stopRepeat(){ clearInterval(touchRepeat); touchRepeat=null; }

document.getElementById("tLeft").addEventListener("touchstart",  function(e){ e.preventDefault(); startRepeat(function(){ if(state!=="playing")return; cur.pos.x--; if(collides(grid,cur))cur.pos.x++; else sfxMove(); }); },{passive:false});
document.getElementById("tLeft").addEventListener("touchend",    stopRepeat);
document.getElementById("tLeft").addEventListener("mousedown",   function(){ startRepeat(function(){ if(state!=="playing")return; cur.pos.x--; if(collides(grid,cur))cur.pos.x++; else sfxMove(); }); });
document.getElementById("tLeft").addEventListener("mouseup",     stopRepeat);

document.getElementById("tRight").addEventListener("touchstart", function(e){ e.preventDefault(); startRepeat(function(){ if(state!=="playing")return; cur.pos.x++; if(collides(grid,cur))cur.pos.x--; else sfxMove(); }); },{passive:false});
document.getElementById("tRight").addEventListener("touchend",   stopRepeat);
document.getElementById("tRight").addEventListener("mousedown",  function(){ startRepeat(function(){ if(state!=="playing")return; cur.pos.x++; if(collides(grid,cur))cur.pos.x--; else sfxMove(); }); });
document.getElementById("tRight").addEventListener("mouseup",    stopRepeat);

document.getElementById("tDown").addEventListener("touchstart",  function(e){ e.preventDefault(); startRepeat(function(){ if(state!=="playing")return; cur.pos.y++; if(collides(grid,cur)){cur.pos.y--;lockPiece();}else dropCounter=0; }); },{passive:false});
document.getElementById("tDown").addEventListener("touchend",    stopRepeat);
document.getElementById("tDown").addEventListener("mousedown",   function(){ startRepeat(function(){ if(state!=="playing")return; cur.pos.y++; if(collides(grid,cur)){cur.pos.y--;lockPiece();}else dropCounter=0; }); });
document.getElementById("tDown").addEventListener("mouseup",     stopRepeat);

addTouch("tRotate", function(){
  if(state!=="playing") return;
  var old=cur.shape; cur.shape=rotate(cur.shape);
  if(collides(grid,cur)){ var kicked=false; for(var dx of[-1,1,-2,2]){cur.pos.x+=dx;if(!collides(grid,cur)){kicked=true;break;}cur.pos.x-=dx;} if(!kicked)cur.shape=old; else sfxRotate(); } else sfxRotate();
});
addTouch("tDrop", function(){
  if(state!=="playing") return;
  while(!collides(grid,cur)) cur.pos.y++;
  cur.pos.y--; lockPiece();
});

/* ── Overlay helpers ── */
function showOverlay(id)   { document.getElementById(id).classList.remove("hidden"); }
function hideAllOverlays() {
  ["startScreen","pauseScreen","gameOverScreen"].forEach(function(id){
    document.getElementById(id).classList.add("hidden");
  });
}

function showGameOver() {
  document.getElementById("finalScore").textContent = score;
  document.getElementById("finalBest").textContent  = Math.max(score, highScore);
  document.getElementById("finalLevel").textContent = level;
  document.getElementById("finalLines").textContent = linesCleared;
  showOverlay("gameOverScreen");
}

/* ── Button bindings ── */
document.getElementById("startBtn").addEventListener("click",    function(){ startGame(); });
document.getElementById("resumeBtn").addEventListener("click",   function(){ state="playing"; hideAllOverlays(); });
document.getElementById("pauseBtn").addEventListener("click",    function(){ if(state==="playing"){ state="paused"; showOverlay("pauseScreen"); } });
document.getElementById("quitBtn").addEventListener("click",     function(){ state="start"; hideAllOverlays(); showOverlay("startScreen"); });
document.getElementById("pauseQuitBtn").addEventListener("click",function(){ state="start"; hideAllOverlays(); showOverlay("startScreen"); });
document.getElementById("restartBtn").addEventListener("click",  function(){ startGame(); });
document.getElementById("goQuitBtn").addEventListener("click",   function(){ state="start"; hideAllOverlays(); showOverlay("startScreen"); });

/* ── Boot ── */
updateHUD();
requestAnimationFrame(gameLoop);
