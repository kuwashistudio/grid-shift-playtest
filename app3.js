function clearBombsAt(cells){
  if(state.mode!=='BOMBS'||!state.bombs.length)return;
  const set=new Set(cells.map(([x,y])=>`${x},${y}`));
  let n=0;state.bombs=state.bombs.filter(b=>{const gone=set.has(`${b.x},${b.y}`);if(gone)n++;return !gone;});
  if(n){state.score+=n*80;}
}
function tickBombs(){
  for(const b of state.bombs)b.t--;
  const doomed=state.bombs.find(b=>b.t<=0);
  if(doomed){triggerBombGameOver(doomed);return;}
  if(state.bombs.some(b=>b.t<=3))beep('danger');
}
function spawnBomb(avoidCells=[]){
  // BOMBS are external pressure: they appear in EMPTY, preferably distant cells instead of
  // piggy-backing on a line the player was already about to clear.
  const candidates=[];
  const avoid=Array.isArray(avoidCells)?avoidCells:[];
  for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
    if(state.board[y][x]||state.bombs.some(b=>b.x===x&&b.y===y))continue;
    let row=0,col=0;for(let i=0;i<state.size;i++){row+=state.board[y][i]?1:0;col+=state.board[i][x]?1:0;}
    const dist=avoid.length?Math.min(...avoid.map(([ax,ay])=>Math.abs(ax-x)+Math.abs(ay-y))):9;
    candidates.push({x,y,row,col,dist});
  }
  if(!candidates.length)return;
  // Prefer cells at least 4 steps away and not on an almost-complete line. Randomize within
  // that band so the obstacle feels disruptive rather than scripted.
  let pool=candidates.filter(p=>p.dist>=4&&Math.max(p.row,p.col)<=7);
  if(pool.length<8)pool=candidates.filter(p=>p.dist>=3&&Math.max(p.row,p.col)<=8);
  if(!pool.length)pool=candidates;
  const p=pool[Math.floor(Math.random()*pool.length)];
  state.board[p.y][p.x]=6; // the bomb is a real occupied blocker and participates in line clears
  state.bombs.push({x:p.x,y:p.y,t:9});
  beep('bomb');queueFx('bombAlert');renderBoard();
}
function triggerBombGameOver(bomb){
  if(state.gameOver)return;
  state.gameOver=true;endingRun=true;blitzArmed=false;
  if(state.score>state.best)state.best=state.score;
  if(bomb){bomb.t=0;renderBoard();}
  scheduleSave(true);requestSound('bombOver');
  queueFx('bombDetonate',bomb?{x:bomb.x,y:bomb.y}:null);flushFx();
  setTimeout(()=>{queueFx('runOver');flushFx();},470);
  setTimeout(()=>{endingRun=false;showGameOver('');},980);
}

function rushInterval(){
  const step=Math.floor((state?.moves||0)/10)*230;
  return Math.max(RUSH_MIN_INTERVAL_MS,RUSH_MAX_INTERVAL_MS-step);
}
function beginRushWarning(){
  if(state.mode!=='BLITZ'||state.gameOver)return;
  const cells=[];
  for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++)if(!state.board[y][x])cells.push({x,y});
  if(!cells.length){endGame('');return;}
  const p=cells[Math.floor(Math.random()*cells.length)];
  state.rushWarning={x:p.x,y:p.y,ms:RUSH_WARN_MS};state.blitzMs=rushInterval();renderBoard();beep('danger');
}
function finalizeRushSpawn(){
  const w=state.rushWarning;if(!w)return;state.rushWarning=null;
  if(!state.board[w.y][w.x]){state.board[w.y][w.x]=6;queueFx('rushSpawn',{x:w.x,y:w.y});beep('rush');}
  state.blitzMs=rushInterval();renderAll();scheduleSave();
  if(!state.gameOver && !state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
}
function queueFx(type,data=null){fxQueue.push({type,data});}
function flushFx(){
  if(!fxQueue.length)return;
  const q=fxQueue.splice(0);
  requestAnimationFrame(()=>{
    for(const fx of q){
      if(fx.type==='placed') pulsePlaced(fx.data);
      if(fx.type==='burst') burstCells(fx.data.cells,fx.data.wave);
      if(fx.type==='chain') chainPop(fx.data);
      if(fx.type==='shift'){
        boardEl.classList.remove('shift-left','shift-right','shift-up','shift-down');void boardEl.offsetWidth;boardEl.classList.add(`shift-${fx.data.toLowerCase()}`);
        const f=document.createElement('div');f.className='shift-flare';f.textContent=SHIFT_GLYPH[fx.data];boardEl.appendChild(f);setTimeout(()=>f.remove(),420);
      }
      if(fx.type==='rushSpawn'&&fx.data){const c=cellEls[fx.data.y]?.[fx.data.x];if(c){c.classList.add('rush-born');setTimeout(()=>c.classList.remove('rush-born'),260);}}
      if(fx.type==='bombAlert'){boardEl.classList.add('bomb-alert');setTimeout(()=>boardEl.classList.remove('bomb-alert'),260);}
      if(fx.type==='runOver'){
        boardEl.classList.add('run-over');trayEl.classList.add('run-over');
      }
      if(fx.type==='gravityChain'){
        const delay=Math.max(0,(fx.data?.wave||2)-2)*150;
        setTimeout(()=>{
          requestSound('gravityChain',fx.data?.wave||2);
          const pulse=document.createElement('i');pulse.className='gravity-chain-pulse';boardEl.appendChild(pulse);setTimeout(()=>pulse.remove(),480);
        },delay);
      }
      if(fx.type==='bombDetonate'){
        boardEl.classList.add('bomb-detonate');
        if(fx.data){const c=cellEls[fx.data.y]?.[fx.data.x];if(c){const e=document.createElement('i');e.className='bomb-explosion';e.style.left=`${((fx.data.x+.5)/state.size)*100}%`;e.style.top=`${((fx.data.y+.5)/state.size)*100}%`;boardEl.appendChild(e);setTimeout(()=>e.remove(),720);}}
        setTimeout(()=>boardEl.classList.remove('bomb-detonate'),720);
      }
    }
  });
}
function invalidFeedback(){beep('bad');}
function pulsePlaced(cells){
  requestAnimationFrame(()=>{
    cells.forEach(([x,y],i)=>{const c=cellEls[y]?.[x];if(c){c.style.animationDelay=`${Math.min(60,i*10)}ms`;c.classList.add('placed-pop');setTimeout(()=>{c.classList.remove('placed-pop');c.style.animationDelay='';},260);}});
    if(cells.length){
      const cx=cells.reduce((a,c)=>a+c[0]+.5,0)/cells.length,cy=cells.reduce((a,c)=>a+c[1]+.5,0)/cells.length;
      const ring=document.createElement('i');ring.className='impact-ring';ring.style.left=`${(cx/state.size)*100}%`;ring.style.top=`${(cy/state.size)*100}%`;boardEl.appendChild(ring);setTimeout(()=>ring.remove(),360);
    }
  });
}
function burstCells(cells,wave=0){
  const delay=state?.mode==='GRAVITY'?wave*150:0;
  setTimeout(()=>{
    const rect=boardEl.getBoundingClientRect(); if(!rect.width)return;
    const sample=cells.filter((_,i)=>i%Math.max(1,Math.ceil(cells.length/18))===0);
    cells.forEach(([x,y])=>{const c=cellEls[y]?.[x];if(c){c.classList.add('clear-flash');setTimeout(()=>c.classList.remove('clear-flash'),280);}});
    sample.forEach(([x,y],i)=>{
      const p=document.createElement('i');p.className='spark';
      p.style.left=`${((x+.5)/state.size)*100}%`;p.style.top=`${((y+.5)/state.size)*100}%`;p.style.setProperty('--delay',`${i*4}ms`);
      boardEl.appendChild(p);setTimeout(()=>p.remove(),450);
    });
    boardEl.classList.remove('clear-kick');void boardEl.offsetWidth;boardEl.classList.add('clear-kick');
    setTimeout(()=>boardEl.classList.remove('clear-kick'),220);
  },delay);
}
function chainPop(n){boardEl.classList.remove('chain-kick');void boardEl.offsetWidth;boardEl.classList.add('chain-kick');setTimeout(()=>boardEl.classList.remove('chain-kick'),360);}
function announce(text,strong=false){
  clearTimeout(statusTimer);statusEl.textContent=text;statusEl.classList.toggle('strong',strong);statusEl.classList.remove('status-pop');void statusEl.offsetWidth;statusEl.classList.add('status-pop');
  statusTimer=setTimeout(()=>{statusEl.textContent='';statusEl.classList.remove('strong','status-pop');},1400);
}

function endGame(reason){
  if(state.gameOver)return;state.gameOver=true;endingRun=true;blitzArmed=false;if(state.score>state.best)state.best=state.score;
  renderAll();scheduleSave(true);requestSound('over');queueFx('runOver');flushFx();
  setTimeout(()=>{endingRun=false;showGameOver(reason);},720);
}
function showGameOver(reason){
  $('gameOverLabel').textContent='';$('gameOverTitle').textContent=state.score.toLocaleString();
  $('gameOverText').textContent=state.best>state.score?`★ ${state.best.toLocaleString()}`:'';overOverlay.classList.add('open');
}

function renderMenu(){
  document.querySelectorAll('.size-option').forEach(b=>b.classList.toggle('active',+b.dataset.size===menuSize));
  document.querySelectorAll('.mode-card').forEach(b=>b.classList.toggle('active',b.dataset.mode===state?.mode&&menuSize===state?.size));
}
function miniCell(x,y,cls,extra=''){
  return `<i class="md-cell ${cls} ${extra}" style="left:${2+x*14}px;top:${2+y*14}px"></i>`;
}
function modeDemoHTML(id){
  let cells='';
  if(id==='CLASSIC'){
    cells=miniCell(0,4,'md-blue')+miniCell(1,4,'md-blue')+miniCell(2,4,'md-blue')+miniCell(3,4,'md-blue')+miniCell(4,4,'md-blue md-mover')+'<i class="md-flash"></i>';
  }else if(id==='SHIFT'){
    cells=miniCell(0,2,'md-cyan md-shift')+miniCell(1,2,'md-cyan md-shift')+miniCell(1,3,'md-purple md-shift')+miniCell(3,1,'md-gold')+'<b class="demo-arrow">→</b>';
  }else if(id==='GRAVITY'){
    cells=miniCell(0,4,'md-green g-chain-a')+miniCell(1,4,'md-green g-chain-a')+miniCell(2,4,'md-green g-chain-a')+miniCell(0,3,'md-green g-chain-a')+miniCell(1,1,'md-green g-faller g-chain-a')+
      miniCell(3,1,'md-purple g-chain-b')+miniCell(3,2,'md-purple g-chain-b')+miniCell(4,3,'md-purple g-chain-b')+miniCell(3,4,'md-purple g-chain-b')+miniCell(4,1,'md-purple g-chain-b');
  }else if(id==='SQUARES'){
    for(let y=1;y<=3;y++)for(let x=1;x<=3;x++) if(!(x===3&&y===1))cells+=miniCell(x,y,'md-gold md-sq');
    cells+=miniCell(3,1,'md-gold md-sq md-squarelast')+'<i class="square-outline"></i>';
  }else if(id==='BLITZ'){
    cells=miniCell(0,4,'md-blue')+miniCell(1,4,'md-blue')+miniCell(4,1,'md-cyan md-rushspawn')+'<i class="demo-rush-target"></i><b class="demo-bolt">⚡</b>';
  }else if(id==='BOMBS'){
    cells=miniCell(0,4,'md-blue')+miniCell(1,4,'md-blue')+miniCell(2,4,'md-blue')+'<b class="md-bomb">3</b><i class="md-bombline"></i>';
  }
  return `<div class="mode-demo demo-${id.toLowerCase()}"><div class="mini-board">${cells}</div></div>`;
}
function buildMenu(){
  const sizeRow=$('sizeRow'); sizeRow.innerHTML='';
  Object.entries(SIZES).forEach(([size,info])=>{
    const b=document.createElement('button');b.className='size-option';b.dataset.size=size;b.innerHTML=`<strong>${info.label}</strong>`;
    b.addEventListener('click',()=>{menuSize=+size;renderMenu();});sizeRow.appendChild(b);
  });
  const grid=$('modeGrid');grid.innerHTML='';
  Object.entries(MODES).forEach(([id,m])=>{
    const b=document.createElement('button');b.className='mode-card';b.dataset.mode=id;b.innerHTML=`${modeDemoHTML(id)}<strong>${m.title}</strong>`;
    b.addEventListener('click',async()=>{await loadSlot(id,menuSize);modeOverlay.classList.remove('open');});grid.appendChild(b);
  });
}
function closeOverlays(){modeOverlay.classList.remove('open');confirmOverlay.classList.remove('open');overOverlay.classList.remove('open');}

function frame(now){
  const dt=Math.min(100,now-lastFrame);lastFrame=now;
  const paused=docHidden||platformPaused||modeOverlay.classList.contains('open')||confirmOverlay.classList.contains('open')||overOverlay.classList.contains('open');
  if(state?.mode==='BLITZ'&&blitzArmed&&!state.gameOver&&!paused){
    if(state.rushWarning){
      state.rushWarning.ms-=dt;
      if(state.rushWarning.ms<=0)finalizeRushSpawn();
    }else{
      state.blitzMs-=dt;
      if(state.blitzMs<=0)beginRushWarning();
    }
  }
  timerFrame=requestAnimationFrame(frame);
}

function bindUI(){
  $('modeBtn').addEventListener('click',()=>{menuSize=10;modeOverlay.classList.add('open');renderMenu();});
  $('quickRestart').addEventListener('click',()=>confirmOverlay.classList.add('open'));
  $('closeModes').addEventListener('click',()=>modeOverlay.classList.remove('open'));
  $('restartBtn').addEventListener('click',()=>confirmOverlay.classList.add('open'));
  $('cancelRestart').addEventListener('click',()=>confirmOverlay.classList.remove('open'));
  $('confirmRestart').addEventListener('click',()=>newRun(true));
  $('againBtn').addEventListener('click',()=>newRun(true));
  $('gameOverModes').addEventListener('click',()=>{overOverlay.classList.remove('open');menuSize=10;modeOverlay.classList.add('open');renderMenu();});
  muteBtn.addEventListener('click',()=>{userMuted=!userMuted;localStorage.setItem('gridshift_user_muted_v9',userMuted?'1':'0');updateMute();if(!userMuted)requestSound('start');});
  document.addEventListener('pointerdown',()=>{if(!effectiveMuted())unlockAudio();},{capture:true});
  document.addEventListener('touchstart',()=>{if(!effectiveMuted())unlockAudio();},{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{docHidden=document.hidden;lastFrame=performance.now();if(docHidden)saveNow();});
  window.addEventListener('pagehide',()=>saveNow());
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){modeOverlay.classList.remove('open');confirmOverlay.classList.remove('open');}
    if(e.key.toLowerCase()==='m')muteBtn.click();
    if(e.key.toLowerCase()==='n')confirmOverlay.classList.add('open');
  });
}

async function boot(){
  buildMenu();bindUI();
  await Platform.init();
  platformAudio=Platform.isPlatformAudioEnabled();platformPaused=Platform.isPlatformPaused();
  Platform.onAudioChange(v=>{platformAudio=v;updateMute();});
  Platform.onPauseChange(v=>{platformPaused=v;lastFrame=performance.now();});
  const prefs=safeParse(await Platform.get('prefs_v11'))||{mode:'CLASSIC',size:10};
  const mode=MODES[prefs.mode]?prefs.mode:'CLASSIC';
  await loadSlot(mode,10);
  menuSize=10;modeOverlay.classList.add('open');renderMenu();
  requestAnimationFrame(frame);
  requestAnimationFrame(()=>Platform.gameReady());
}

boot();
