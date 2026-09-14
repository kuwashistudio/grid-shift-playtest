/* GRID SHIFT v1.8.1 common JS bundle — exact source order, no logic rewrite. */

/* ===== hotfix-v12.js ===== */
/* GRID SHIFT v1.2 playtest fixes */
(function(){
  'use strict';

  trayUnit=function(shape){
    const [w,h]=Core.shapeDims(shape),m=Math.max(w,h);
    if(h>w&&h>=5)return 13;
    if(h>w&&h===4)return 16;
    return m>=5?15:m===4?18:21;
  };

  renderModeStat=function(){
    if(!state)return;
    let txt=MODES[state.mode]?.title||state.mode;
    if(state.mode==='SHIFT')txt=`SHIFT ${SHIFT_GLYPH[state.nextShift]}`;
    modeStatEl.classList.remove('urgent');
    modeStatEl.classList.add('visible');
    blitzClockEl?.classList.remove('visible');
    modeStatEl.textContent=txt;
  };

  const renderTrayV11=renderTray;
  renderTray=function(){
    if(drag?.active)return;
    return renderTrayV11();
  };

  function gravityCelebrateV12(waveIndex){
    boardEl.classList.remove('gravity-wave-kick');void boardEl.offsetWidth;boardEl.classList.add('gravity-wave-kick');
    setTimeout(()=>boardEl.classList.remove('gravity-wave-kick'),330);
    const bloom=document.createElement('i');bloom.className='gravity-bloom';boardEl.appendChild(bloom);setTimeout(()=>bloom.remove(),620);
    if(waveIndex>0){
      const combo=document.createElement('b');combo.className='gravity-combo-v12';combo.textContent=`×${waveIndex+1}`;boardEl.appendChild(combo);setTimeout(()=>combo.remove(),780);
    }
  }

  resolveGravityPlacement=function(idx,shape,sim){
    resolving=true;
    state.tray[idx]=null;state.moves++;state.score+=shape.cells.length;state.lastPlaced=sim.placed.map(c=>c.slice());
    state.board=Core.cloneBoard(sim.stages?.[0]?.board||sim.board);
    renderAll();pulsePlaced(sim.placed);beep('place',shape.cells.length);
    boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),210);
    let totalUnits=0,totalCells=0;sim.waves.forEach(w=>{totalUnits+=w.units;totalCells+=w.cells.length;});
    const waveGap=360;
    sim.waves.forEach((wave,i)=>{
      const t=i*waveGap+100;
      setTimeout(()=>{
        burstCells(wave.cells,0);gravityCelebrateV12(i);
        if(i===0)requestSound(wave.units>1?'multi':'clear');else requestSound('gravityChain',i+1);
        if(i>0){const pulse=document.createElement('i');pulse.className='gravity-chain-pulse';boardEl.appendChild(pulse);setTimeout(()=>pulse.remove(),520);}
      },t);
      setTimeout(()=>{
        state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);renderBoard();
        boardEl.classList.remove('gravity-settle');void boardEl.offsetWidth;boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),210);
      },t+185);
    });
    const doneAt=100+sim.waves.length*waveGap+70;
    setTimeout(()=>{
      state.board=Core.cloneBoard(sim.board);
      if(totalUnits>0){state.trayHadClear=true;const cascade=Math.max(0,sim.waves.length-1);state.score+=scoreClear(totalUnits,totalCells,cascade);}
      if(state.tray.every(p=>p===null))completeTray();
      if(state.score>state.best)state.best=state.score;
      resolving=false;selectedPiece=null;previewAnchor=null;renderAll();scheduleSave();
      if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
    },doneAt);
    return true;
  };

  try{if(state){renderModeStat();if(!drag?.active)renderTray();}}catch(_){ }
})();


/* ===== hotfix-v121.js ===== */
/* GRID SHIFT v1.2.1 — RUSH drag/spawn race fix */
(function(){
  'use strict';

  /*
    RUSH changes the board by rebuilding the grid when a warning starts or a
    pressure block is spawned. Rebuilding while a pointer drag is in progress
    invalidates the drag's cached cell geometry / DOM references and can leave
    duplicate-looking ghosts. Never mutate/re-render the RUSH board mid-drag.
    The timer is still allowed to expire; the pending action runs on the first
    animation frame after the player releases the piece.
  */
  const beginRushWarningV11=beginRushWarning;
  beginRushWarning=function(){
    if(drag?.active)return false;
    return beginRushWarningV11();
  };

  const finalizeRushSpawnV11=finalizeRushSpawn;
  finalizeRushSpawn=function(){
    if(drag?.active)return false;
    return finalizeRushSpawnV11();
  };
})();


/* ===== hotfix-v122.js ===== */
/* GRID SHIFT v1.2.2 — suppress iOS selection/loupe + celebrate personal best */
(function(){
  'use strict';

  /* Safari can still reserve some browser chrome gestures, but these prevent
     text selection, callout menus and the long-press loupe inside the game UI
     in normal play. */
  const blockNativeHold=e=>{
    const t=e.target;
    if(t && (t.closest?.('#app') || t.closest?.('.overlay'))) e.preventDefault();
  };
  document.addEventListener('contextmenu',blockNativeHold,{capture:true});
  document.addEventListener('selectstart',blockNativeHold,{capture:true});
  document.addEventListener('dragstart',blockNativeHold,{capture:true});

  const bestElNow=document.getElementById('best');
  const bestWrap=document.getElementById('bestWrap');
  if(bestElNow&&bestWrap){
    let previousBest=Number((bestElNow.textContent||'0').replace(/,/g,''))||0;
    const pulse=()=>{
      const next=Number((bestElNow.textContent||'0').replace(/,/g,''))||0;
      if(next>previousBest){
        bestWrap.classList.remove('new-best');void bestWrap.offsetWidth;bestWrap.classList.add('new-best');
        setTimeout(()=>bestWrap.classList.remove('new-best'),760);
      }
      previousBest=next;
    };
    new MutationObserver(pulse).observe(bestElNow,{childList:true,characterData:true,subtree:true});
  }
})();


/* ===== hotfix-v123.js ===== */
/* GRID SHIFT v1.2.3 — persistent BEST during play + per-mode BEST in selector */
(function(){
  'use strict';

  const previous=new Map();

  function savedModeBest(mode){
    if(state && state.mode===mode) return Math.max(0,Number(state.best)||0,Number(state.score)||0);
    try{
      const raw=localStorage.getItem(`gridshift_${slotKey(mode,10)}`);
      const parsed=raw?JSON.parse(raw):null;
      return Math.max(0,Number(parsed?.best)||0,Number(parsed?.score)||0);
    }catch(_){ return 0; }
  }

  function updateCurrentBest(){
    if(!state)return;
    const best=Math.max(Number(state.best)||0,Number(state.score)||0);
    if(bestEl){
      const before=Number((bestEl.textContent||'0').replace(/,/g,''))||0;
      bestEl.textContent=best.toLocaleString();
      if(bestWrap && best>before){
        bestWrap.classList.remove('new-best');void bestWrap.offsetWidth;bestWrap.classList.add('new-best');
        setTimeout(()=>bestWrap.classList.remove('new-best'),760);
      }
    }
  }

  function updateModeRecords(){
    document.querySelectorAll('.mode-card').forEach(card=>{
      const mode=card.dataset.mode;if(!mode)return;
      let row=card.querySelector('.mode-best-v123');
      if(!row){
        row=document.createElement('small');
        row.className='mode-best-v123';
        row.innerHTML='<span>BEST</span><b>0</b>';
        card.appendChild(row);
      }
      const best=savedModeBest(mode),b=row.querySelector('b');
      const before=previous.has(mode)?previous.get(mode):best;
      if(b)b.textContent=best.toLocaleString();
      if(best>before){
        row.classList.remove('record-hit');void row.offsetWidth;row.classList.add('record-hit');
        setTimeout(()=>row.classList.remove('record-hit'),700);
      }
      previous.set(mode,best);
    });
  }

  const renderMenuBase=renderMenu;
  renderMenu=function(){
    const out=renderMenuBase();
    updateModeRecords();
    return out;
  };

  const renderAllBase=renderAll;
  renderAll=function(){
    const out=renderAllBase();
    updateCurrentBest();
    updateModeRecords();
    return out;
  };

  /* Initial pass in case boot already rendered before this hotfix loaded. */
  queueMicrotask(()=>{try{updateCurrentBest();updateModeRecords();}catch(_){ }});
})();


/* ===== hotfix-v124.js ===== */
/* GRID SHIFT v1.2.4 — explicit HIGH SCORE labels in play and mode selector */
(function(){
  'use strict';

  function clarifyHighScores(){
    const live=document.getElementById('bestWrap');
    if(live){
      const label=live.querySelector('span');
      if(label)label.textContent='HIGH SCORE';
      live.setAttribute('aria-label','High score');
    }
    document.querySelectorAll('.mode-best-v123').forEach(row=>{
      const label=row.querySelector('span');
      if(label)label.textContent='HIGH SCORE';
      const card=row.closest('.mode-card');
      const mode=card?.dataset?.mode;
      if(mode)row.setAttribute('aria-label',`${mode} high score ${row.querySelector('b')?.textContent||'0'}`);
    });
  }

  const renderMenuPrev=renderMenu;
  renderMenu=function(){
    const out=renderMenuPrev();
    clarifyHighScores();
    return out;
  };

  const renderAllPrev=renderAll;
  renderAll=function(){
    const out=renderAllPrev();
    clarifyHighScores();
    return out;
  };

  queueMicrotask(()=>{try{clarifyHighScores();}catch(_){ }});
})();


/* ===== hotfix-v127.js ===== */
/* GRID SHIFT v1.2.7 — RUSH pressure is driven only by successful placements */
(function(){
  'use strict';

  /* Kill the original clock loop's RUSH mutation path completely. */
  frame=function(now){
    lastFrame=now;
    timerFrame=requestAnimationFrame(frame);
  };

  function resetRushClockState(){
    if(!state||state.mode!=='BLITZ')return;
    blitzArmed=false;
    state.blitzMs=0;
    state.rushWarning=null;
  }

  function rushCadence(moves){
    if(moves<12)return 3;
    if(moves<28)return 2;
    return 1;
  }

  function choosePressureCell(){
    const empty=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
      if(!state.board[y][x])empty.push({x,y});
    }
    if(!empty.length)return null;

    const recent=Array.isArray(state.lastPlaced)?state.lastPlaced:[];
    const scored=empty.map(p=>{
      const dist=recent.length?Math.min(...recent.map(([x,y])=>Math.abs(x-p.x)+Math.abs(y-p.y))):6;
      let row=0,col=0;
      for(let i=0;i<state.size;i++){
        row+=state.board[p.y][i]?1:0;
        col+=state.board[i][p.x]?1:0;
      }
      return {...p,dist,line:Math.max(row,col)};
    });
    let pool=scored.filter(p=>p.dist>=3&&p.line<=8);
    if(pool.length<5)pool=scored.filter(p=>p.line<=8);
    if(!pool.length)pool=scored;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function addRushPressure(){
    if(!state||state.mode!=='BLITZ'||state.gameOver)return;
    const p=choosePressureCell();
    if(!p){endGame('');return;}

    resolving=true;
    state.rushWarning={x:p.x,y:p.y,ms:0};
    renderBoard();
    requestSound('danger');

    setTimeout(()=>{
      if(!state||state.mode!=='BLITZ'||state.gameOver){resolving=false;return;}
      const w=state.rushWarning;
      state.rushWarning=null;
      if(w&&!state.board[w.y][w.x]){
        state.board[w.y][w.x]=6;
        queueFx('rushSpawn',{x:w.x,y:w.y});
        requestSound('rush');
      }
      blitzArmed=false;
      state.blitzMs=0;
      resolving=false;
      renderAll();
      scheduleSave(true);
      if(!state.gameOver&&!state.tray.some(piece=>piece&&Core.hasModePlacement(state.board,piece,state.size,state.mode)))endGame('');
    },260);
  }

  /* Wrap the real placement function once. A pressure block is created only when
     moves increases, never because time passes. */
  const baseTryPlace=tryPlace;
  tryPlace=function(idx,x,y){
    const isRush=state?.mode==='BLITZ';
    if(isRush){blitzArmed=false;state.blitzMs=0;state.rushWarning=null;}
    const before=Number(state?.moves)||0;
    const ok=baseTryPlace(idx,x,y);
    if(!ok||!isRush||!state||state.gameOver)return ok;
    const after=Number(state.moves)||0;
    if(after<=before)return ok;
    blitzArmed=false;state.blitzMs=0;state.rushWarning=null;
    if(after%rushCadence(after)===0)addRushPressure();
    return ok;
  };

  const baseLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='BLITZ'){
      resetRushClockState();
      renderAll();
      scheduleSave(true);
    }
  };

  const baseNewRun=newRun;
  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='BLITZ')resetRushClockState();
    return out;
  };

  queueMicrotask(()=>{try{resetRushClockState();}catch(_){ }});
})();


/* ===== hotfix-v130.js ===== */
/* GRID SHIFT v1.3.0 — SQUARES: square-only clears, 4x4 and larger */
(function(){
  'use strict';

  const baseScanClears=Core.scanClears;
  const baseSimulatePlace=Core.simulatePlace;
  const baseGenerateFairTray=Core.generateFairTray;

  function scanSquareClears(board,size){
    const accepted=[];
    const occupied=(x,y,side)=>{
      for(let yy=y;yy<y+side;yy++) for(let xx=x;xx<x+side;xx++) if(!board[yy][xx]) return false;
      return true;
    };

    /* Search largest-first. A smaller square fully contained in an already-found
       larger square is not double-counted. Same-size overlapping squares can combo. */
    for(let side=size;side>=4;side--){
      for(let y=0;y<=size-side;y++) for(let x=0;x<=size-side;x++){
        if(!occupied(x,y,side))continue;
        const contained=accepted.some(s=>x>=s.x&&y>=s.y&&x+side<=s.x+s.side&&y+side<=s.y+s.side);
        if(!contained)accepted.push({x,y,side});
      }
    }

    const set=new Set();
    accepted.forEach(s=>{
      for(let yy=s.y;yy<s.y+s.side;yy++) for(let xx=s.x;xx<s.x+s.side;xx++) set.add(`${xx},${yy}`);
    });
    return {
      rows:[],cols:[],
      squares:accepted.map(s=>[s.x,s.y,s.side]),
      units:accepted.length,
      cells:[...set].map(k=>k.split(',').map(Number))
    };
  }

  Core.scanClears=function(board,size,mode){
    if(mode==='SQUARES')return scanSquareClears(board,size);
    return baseScanClears(board,size,mode);
  };

  Core.simulatePlace=function(board,shape,x,y,mode,size){
    if(mode!=='SQUARES')return baseSimulatePlace(board,shape,x,y,mode,size);
    if(!Core.canPlace(board,shape,x,y,size))return null;
    const next=Core.cloneBoard(board);
    const placed=shape.cells.map(([dx,dy],i)=>[x+dx,y+dy,shape.cellColors?.[i]||shape.color||1]);
    placed.forEach(([xx,yy,color])=>next[yy][xx]=color);
    const clear=scanSquareClears(next,size),waves=[];
    if(clear.units){waves.push(clear);Core.clearCells(next,clear.cells);}
    return {board:next,placed:placed.map(([px,py])=>[px,py]),waves,stages:[]};
  };

  /* SQUARES-specific piece ecology.
     Strong: 2x2, 4-bars, L4/T4, 2x3 rectangle.
     Useful support: 3-bars, L3, Z.
     Powerful but intentionally rare: 3x3.
     5-bars / plus pieces are omitted because they fight the 4x4 target geometry. */
  const BASE_POOL=[
    ['sq2',10],['i4h',9],['l4a',8],['t4u',7],['rect6',5],
    ['i3h',6],['l3a',5],['z4h',4],['sq3',2]
  ];
  const RESCUE_POOL=[['i2h',3],['dot',1]];

  function weightedPick(pool,rng){
    let total=0;for(const [,w] of pool)total+=w;
    let n=rng()*total;
    for(const [id,w] of pool){n-=w;if(n<0)return id;}
    return pool[pool.length-1][0];
  }
  function squareShape(pool,rng){
    const id=weightedPick(pool,rng);
    let s=Core.deepClone(Core.SHAPE_BY_ID[id]);
    const turns=Math.floor(rng()*4);
    for(let i=0;i<turns;i++)s=Core.rotateShape(s);
    return s;
  }
  function traySolvable(board,tray,size,maxNodes=6500){
    let nodes=0;
    function dfs(b,remaining){
      if(!remaining.length)return true;
      if(++nodes>maxNodes)return false;
      const ordered=remaining.slice().sort((a,bx)=>tray[bx].cells.length-tray[a].cells.length);
      for(const idx of ordered){
        for(const shape of Core.modeRotations(tray[idx],'SQUARES')){
          const ps=Core.placements(b,shape,size);
          /* Sample enough placements for reliability without making iPhone generation expensive. */
          const step=ps.length>42?Math.ceil(ps.length/42):1;
          for(let p=0;p<ps.length;p+=step){
            const [x,y]=ps[p];
            const sim=Core.simulatePlace(b,shape,x,y,'SQUARES',size);
            if(!sim)continue;
            const rest=remaining.filter(v=>v!==idx);
            if(dfs(sim.board,rest))return true;
            if(nodes>maxNodes)return false;
          }
        }
      }
      return false;
    }
    return dfs(Core.cloneBoard(board),tray.map((_,i)=>i));
  }
  function generateSquareTray(board,size,rng=Math.random,moves=0){
    const fill=Core.boardFill(board);
    const pool=fill>=68?BASE_POOL.concat(RESCUE_POOL):BASE_POOL;
    let fallback=null;
    for(let attempt=0;attempt<34;attempt++){
      const tray=[squareShape(pool,rng),squareShape(pool,rng),squareShape(pool,rng)];
      const sq3s=tray.filter(p=>p.id==='sq3').length;
      if(sq3s>1)continue;
      if(fill<68&&tray.some(p=>p.cells.length<=2))continue;
      if(!tray.every(p=>Core.hasModePlacement(board,p,size,'SQUARES')))continue;
      fallback=fallback||tray;
      if(traySolvable(board,tray,size))return tray;
    }
    if(fallback)return fallback;
    const safe=['sq2','i4h','l4a'].map(id=>Core.deepClone(Core.SHAPE_BY_ID[id]));
    if(traySolvable(board,safe,size,12000))return safe;
    return fill>=68?
      [Core.deepClone(Core.SHAPE_BY_ID.i2h),Core.deepClone(Core.SHAPE_BY_ID.l3a),Core.deepClone(Core.SHAPE_BY_ID.sq2)]:
      safe;
  }

  Core.generateFairTray=function(board,mode,size,rng=Math.random,moves=0){
    if(mode==='SQUARES')return generateSquareTray(board,size,rng,moves);
    return baseGenerateFairTray(board,mode,size,rng,moves);
  };

  /* Update the selector demo so it teaches the new rule visually. */
  const baseModeDemoHTML=modeDemoHTML;
  modeDemoHTML=function(id){
    if(id!=='SQUARES')return baseModeDemoHTML(id);
    let cells='';
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){
      if(x===3&&y===0)continue;
      cells+=miniCell(x,y+1,'md-gold md-sq');
    }
    cells+=miniCell(3,1,'md-gold md-sq md-squarelast');
    return `<div class="mode-demo demo-squares demo-squares-v130"><div class="mini-board">${cells}<i class="square-outline square-outline-v130"></i></div></div>`;
  };

  const baseRenderModeStat=renderModeStat;
  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode==='SQUARES')modeStatEl.textContent='SQUARES  4×4+';
  };

  /* Rebuild the selector because app3 builds it before this hotfix loads. */
  queueMicrotask(()=>{
    try{
      buildMenu();
      renderMenu();
      renderModeStat();
      if(state?.mode==='SQUARES'&&state.tray?.length){
        state.tray=Core.generateFairTray(state.board,'SQUARES',state.size,Math.random,state.moves);
        renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();


/* ===== hotfix-v131.js ===== */
/* GRID SHIFT v1.3.1 — SHIFT v2: alternating wave shifts + anchor mission */
(function(){
  'use strict';

  const PATTERNS=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const PATTERN_TEXT={
    V_UP:'↑↓↑↓↑↓↑↓↑↓',
    V_DOWN:'↓↑↓↑↓↑↓↑↓↑',
    H_LEFT:'←→←→←→←→←→',
    H_RIGHT:'→←→←→←→←→←'
  };

  function randomPattern(prev=null){
    let pool=PATTERNS.filter(p=>p!==prev);
    if(!pool.length)pool=PATTERNS.slice();
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function waveShift(board,size,pattern){
    const out=Core.emptyBoard(size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let xx=x,yy=y;
      if(pattern==='V_UP'||pattern==='V_DOWN'){
        const firstUp=pattern==='V_UP';
        const up=(x%2===0)?firstUp:!firstUp;
        yy=(y+(up?-1:1)+size)%size;
      }else{
        const firstLeft=pattern==='H_LEFT';
        const left=(y%2===0)?firstLeft:!firstLeft;
        xx=(x+(left?-1:1)+size)%size;
      }
      out[yy][xx]=v;
    }
    return out;
  }

  function anchorCandidates(board,tray,size){
    const cover=new Map();
    for(const piece of tray||[]){
      if(!piece)continue;
      for(const shape of Core.modeRotations(piece,'SHIFT')){
        for(const [px,py] of Core.placements(board,shape,size)){
          for(const [dx,dy] of shape.cells){
            const x=px+dx,y=py+dy,key=`${x},${y}`;
            cover.set(key,(cover.get(key)||0)+1);
          }
        }
      }
    }
    const all=[...cover.entries()].map(([key,n])=>{
      const [x,y]=key.split(',').map(Number);
      return {x,y,n,edge:Math.min(x,y,size-1-x,size-1-y)};
    }).filter(p=>!board[p.y][p.x]);
    if(!all.length)return [];
    const max=Math.max(...all.map(p=>p.n));
    let pool=all.filter(p=>p.n>=Math.max(2,Math.floor(max*.28))&&p.edge>=1);
    if(pool.length<6)pool=all.filter(p=>p.n>=2);
    if(!pool.length)pool=all;
    return pool;
  }

  function chooseAnchor(){
    if(!state||state.mode!=='SHIFT')return null;
    const pool=anchorCandidates(state.board,state.tray,state.size);
    if(pool.length){
      const p=pool[Math.floor(Math.random()*pool.length)];
      return {x:p.x,y:p.y};
    }
    const empty=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++)if(!state.board[y][x])empty.push({x,y});
    return empty.length?empty[Math.floor(Math.random()*empty.length)]:null;
  }

  function prepareShiftRound(force=false){
    if(!state||state.mode!=='SHIFT')return;
    if(force||!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern(state.shiftPattern);
    state.shiftAnchor=chooseAnchor();
    state.shiftAnchorHit=false;
    state.shiftRoundId=(Number(state.shiftRoundId)||0)+1;
  }

  function placedHits(anchor,cells){
    return !!(anchor&&Array.isArray(cells)&&cells.some(([x,y])=>x===anchor.x&&y===anchor.y));
  }

  /* Replace the old whole-board translation. Each row/column is shifted one cell
     in the opposite direction from its neighbour. The target cell can cancel it. */
  applyShiftRound=function(){
    if(!state||state.mode!=='SHIFT')return;
    const anchor=state.shiftAnchor;
    const stabilized=!!state.shiftAnchorHit||placedHits(anchor,state.lastPlaced);
    const pattern=PATTERNS.includes(state.shiftPattern)?state.shiftPattern:randomPattern();

    if(stabilized){
      announce('STABILIZED  •  SHIFT BLOCKED',true);
      beep('chain');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),420);
      return;
    }

    state.board=waveShift(state.board,state.size,pattern);
    boardEl.dataset.waveFx=pattern;
    boardEl.classList.remove('wave-shift-v131');void boardEl.offsetWidth;boardEl.classList.add('wave-shift-v131');
    setTimeout(()=>{boardEl.classList.remove('wave-shift-v131');delete boardEl.dataset.waveFx;},430);

    const clear=Core.scanClears(state.board,state.size,'CLASSIC');
    if(clear.units){
      clearBombsAt(clear.cells);Core.clearCells(state.board,clear.cells);state.trayHadClear=true;
      const gain=scoreClear(clear.units,clear.cells.length,0)+80;state.score+=gain;queueFx('burst',{cells:clear.cells,wave:0});
      announce(`WAVE CLEAR  +${gain}`,true);beep('multi');
    }else{
      announce(`WAVE  ${PATTERN_TEXT[pattern]}`);beep('shift');
    }
  };

  /* Rebuild completeTray so the next mission is chosen AFTER the next three pieces
     exist. This keeps every anchor realistically reachable by the upcoming tray. */
  completeTray=function(){
    if(state.mode==='SHIFT')applyShiftRound();
    if(state.trayHadClear){
      state.chain++;
      const bonus=state.chain>=2?25*state.chain:0;
      if(bonus){
        state.score+=bonus;
        if(state.chain===3||state.chain===5||state.chain%10===0){announce(`CHAIN ${state.chain}  +${bonus}`,true);beep('chain');queueFx('chain',state.chain);}
      }
    }else state.chain=0;
    state.trayHadClear=false;
    state.tray=Core.generateFairTray(state.board,state.mode,state.size,Math.random,state.moves);
    if(state.mode==='SHIFT'){
      const prev=state.shiftPattern;
      state.shiftPattern=randomPattern(prev);
      prepareShiftRound(false);
    }
  };

  const baseTryPlace=tryPlace;
  tryPlace=function(idx,x,y){
    const isShift=state?.mode==='SHIFT';
    const roundId=Number(state?.shiftRoundId)||0;
    const anchor=isShift&&state.shiftAnchor?{...state.shiftAnchor}:null;
    const before=Number(state?.moves)||0;
    const ok=baseTryPlace(idx,x,y);
    if(!ok||!isShift||!state)return ok;
    if((Number(state.moves)||0)>before && Number(state.shiftRoundId)===roundId && placedHits(anchor,state.lastPlaced)){
      state.shiftAnchorHit=true;
      renderAll();scheduleSave();
    }
    return ok;
  };

  const baseRenderBoard=renderBoard;
  renderBoard=function(){
    const out=baseRenderBoard();
    if(state?.mode==='SHIFT'&&state.shiftAnchor){
      const c=cellEls[state.shiftAnchor.y]?.[state.shiftAnchor.x];
      if(c){
        c.classList.add('shift-anchor-v131');
        if(state.shiftAnchorHit)c.classList.add('anchor-secured-v131');
        c.setAttribute('data-anchor','◎');
      }
      boardEl.dataset.shiftPattern=PATTERN_TEXT[state.shiftPattern]||'';
    }else{
      delete boardEl.dataset.shiftPattern;
    }
    return out;
  };

  const baseRenderModeStat=renderModeStat;
  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode==='SHIFT'){
      const pattern=PATTERN_TEXT[state.shiftPattern]||'↑↓↑↓';
      modeStatEl.textContent=state.shiftAnchorHit?`SHIFT ${pattern}  •  SAFE`:`SHIFT ${pattern}  •  HIT ◎`;
    }
  };

  const baseLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='SHIFT'){
      if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
      if(!state.shiftAnchor||!Number.isInteger(state.shiftAnchor.x)||!Number.isInteger(state.shiftAnchor.y)||state.shiftAnchor.x<0||state.shiftAnchor.y<0||state.shiftAnchor.x>=state.size||state.shiftAnchor.y>=state.size||state.board[state.shiftAnchor.y][state.shiftAnchor.x]){
        prepareShiftRound(true);
      }
      renderAll();scheduleSave(true);
    }
  };

  const baseNewRun=newRun;
  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='SHIFT'){
      state.shiftPattern=randomPattern();
      prepareShiftRound(false);
      renderAll();scheduleSave(true);
    }
    return out;
  };

  /* Selector demo teaches both the alternating wave and the anchor objective. */
  const baseModeDemoHTML=modeDemoHTML;
  modeDemoHTML=function(id){
    if(id!=='SHIFT')return baseModeDemoHTML(id);
    const cells=miniCell(0,1,'md-cyan')+miniCell(1,2,'md-purple')+miniCell(2,1,'md-cyan')+miniCell(3,2,'md-purple');
    return `<div class="mode-demo demo-shift demo-shift-v131"><div class="mini-board">${cells}<b class="shift-wave-demo-v131">↑↓↑↓</b><i class="shift-anchor-demo-v131">◎</i></div></div>`;
  };

  queueMicrotask(()=>{
    try{
      buildMenu();renderMenu();
      if(state?.mode==='SHIFT'){
        if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
        if(!state.shiftAnchor)prepareShiftRound(false);
        renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();


/* ===== hotfix-v132.js ===== */
/* GRID SHIFT v1.3.2 — SHIFT v3: two-anchor stabilization mission */
(function(){
  'use strict';

  const PATTERNS=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const PATTERN_TEXT={
    V_UP:'↑↓↑↓↑↓↑↓↑↓',
    V_DOWN:'↓↑↓↑↓↑↓↑↓↑',
    H_LEFT:'←→←→←→←→←→',
    H_RIGHT:'→←→←→←→←→←'
  };

  function randomPattern(prev=null){
    const pool=PATTERNS.filter(p=>p!==prev);
    return (pool.length?pool:PATTERNS)[Math.floor(Math.random()*(pool.length?pool.length:PATTERNS.length))];
  }

  function waveShift(board,size,pattern){
    const out=Core.emptyBoard(size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let xx=x,yy=y;
      if(pattern==='V_UP'||pattern==='V_DOWN'){
        const firstUp=pattern==='V_UP';
        const up=(x%2===0)?firstUp:!firstUp;
        yy=(y+(up?-1:1)+size)%size;
      }else{
        const firstLeft=pattern==='H_LEFT';
        const left=(y%2===0)?firstLeft:!firstLeft;
        xx=(x+(left?-1:1)+size)%size;
      }
      out[yy][xx]=v;
    }
    return out;
  }

  function buildCoverage(){
    const cover=new Map();
    const placements=[];
    (state.tray||[]).forEach((piece,idx)=>{
      if(!piece)return;
      for(const shape of Core.modeRotations(piece,'SHIFT')){
        for(const [px,py] of Core.placements(state.board,shape,state.size)){
          const keys=shape.cells.map(([dx,dy])=>`${px+dx},${py+dy}`);
          placements.push({idx,keys:new Set(keys)});
          for(const key of keys){
            if(!cover.has(key))cover.set(key,new Set());
            cover.get(key).add(idx);
          }
        }
      }
    });
    return {cover,placements};
  }

  function canUseDistinctPieces(setA,setB){
    for(const a of setA)for(const b of setB)if(a!==b)return true;
    return false;
  }

  function onePlacementHitsBoth(a,b,placements){
    const ka=`${a.x},${a.y}`,kb=`${b.x},${b.y}`;
    return placements.some(p=>p.keys.has(ka)&&p.keys.has(kb));
  }

  function chooseTwoAnchors(){
    if(!state||state.mode!=='SHIFT')return [];
    const {cover,placements}=buildCoverage();
    const candidates=[];
    for(const [key,pieces] of cover){
      const [x,y]=key.split(',').map(Number);
      if(state.board[y][x])continue;
      const edge=Math.min(x,y,state.size-1-x,state.size-1-y);
      candidates.push({x,y,pieces,edge});
    }

    const pairs=[];
    for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
      const a=candidates[i],b=candidates[j];
      const dist=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
      if(dist<4)continue;
      if(!canUseDistinctPieces(a.pieces,b.pieces))continue;
      if(onePlacementHitsBoth(a,b,placements))continue;
      /* Prefer reachable interior targets that are separated enough to demand
         two genuinely different placement decisions. */
      const reach=a.pieces.size+b.pieces.size;
      const score=dist*3+Math.min(a.edge,2)+Math.min(b.edge,2)+reach;
      pairs.push({a,b,score});
    }

    if(pairs.length){
      pairs.sort((p,q)=>q.score-p.score);
      const top=pairs.slice(0,Math.min(18,pairs.length));
      const pick=top[Math.floor(Math.random()*top.length)];
      return [{x:pick.a.x,y:pick.a.y,hit:false},{x:pick.b.x,y:pick.b.y,hit:false}];
    }

    /* Late-board fallback: still show two different reachable cells if possible. */
    const shuffled=candidates.slice().sort(()=>Math.random()-.5);
    if(shuffled.length>=2)return shuffled.slice(0,2).map(p=>({x:p.x,y:p.y,hit:false}));
    const empty=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++)if(!state.board[y][x])empty.push({x,y,hit:false});
    return empty.sort(()=>Math.random()-.5).slice(0,2);
  }

  function prepareDualMission(forcePattern=false){
    if(!state||state.mode!=='SHIFT')return;
    if(forcePattern||!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern(state.shiftPattern);
    state.shiftAnchor=null;          // disable the v1.3.1 single-anchor path
    state.shiftAnchorHit=false;
    state.shiftAnchors=chooseTwoAnchors();
    state.shiftRoundId=(Number(state.shiftRoundId)||0)+1;
  }

  function hitsFromCells(cells){
    if(!Array.isArray(state?.shiftAnchors)||!Array.isArray(cells))return 0;
    let changed=0;
    for(const a of state.shiftAnchors){
      if(a.hit)continue;
      if(cells.some(([x,y])=>x===a.x&&y===a.y)){a.hit=true;changed++;}
    }
    return changed;
  }

  function hitCount(extraCells=null){
    if(!Array.isArray(state?.shiftAnchors))return 0;
    let n=state.shiftAnchors.filter(a=>a.hit).length;
    if(extraCells){
      for(const a of state.shiftAnchors){
        if(a.hit)continue;
        if(extraCells.some(([x,y])=>x===a.x&&y===a.y))n++;
      }
    }
    return Math.min(2,n);
  }

  applyShiftRound=function(){
    if(!state||state.mode!=='SHIFT')return;
    const pattern=PATTERNS.includes(state.shiftPattern)?state.shiftPattern:randomPattern();
    /* completeTray runs inside the third placement before the outer wrapper can
       record that final move, so include lastPlaced when judging the mission. */
    const hits=hitCount(state.lastPlaced);

    if(hits>=2){
      announce('STABILIZED  •  2/2',true);
      beep('chain');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),420);
      return;
    }

    state.board=waveShift(state.board,state.size,pattern);
    boardEl.dataset.waveFx=pattern;
    boardEl.classList.remove('wave-shift-v131');void boardEl.offsetWidth;boardEl.classList.add('wave-shift-v131');
    setTimeout(()=>{boardEl.classList.remove('wave-shift-v131');delete boardEl.dataset.waveFx;},430);

    const clear=Core.scanClears(state.board,state.size,'CLASSIC');
    if(clear.units){
      clearBombsAt(clear.cells);Core.clearCells(state.board,clear.cells);state.trayHadClear=true;
      const gain=scoreClear(clear.units,clear.cells.length,0)+80;state.score+=gain;queueFx('burst',{cells:clear.cells,wave:0});
      announce(`WAVE CLEAR  +${gain}`,true);beep('multi');
    }else{
      announce(`WAVE  •  ${hits}/2 ANCHORS`);beep('shift');
    }
  };

  completeTray=function(){
    if(state.mode==='SHIFT')applyShiftRound();
    if(state.trayHadClear){
      state.chain++;
      const bonus=state.chain>=2?25*state.chain:0;
      if(bonus){
        state.score+=bonus;
        if(state.chain===3||state.chain===5||state.chain%10===0){announce(`CHAIN ${state.chain}  +${bonus}`,true);beep('chain');queueFx('chain',state.chain);}
      }
    }else state.chain=0;
    state.trayHadClear=false;
    state.tray=Core.generateFairTray(state.board,state.mode,state.size,Math.random,state.moves);
    if(state.mode==='SHIFT'){
      state.shiftPattern=randomPattern(state.shiftPattern);
      prepareDualMission(false);
    }
  };

  /* v1.3.1's wrapper remains underneath, but its single anchor is permanently
     null. This wrapper records hits from the first two successful placements. */
  const baseTryPlace=tryPlace;
  tryPlace=function(idx,x,y){
    const isShift=state?.mode==='SHIFT';
    const roundId=Number(state?.shiftRoundId)||0;
    const before=Number(state?.moves)||0;
    const ok=baseTryPlace(idx,x,y);
    if(!ok||!isShift||!state)return ok;
    const after=Number(state.moves)||0;
    if(after>before&&Number(state.shiftRoundId)===roundId){
      const changed=hitsFromCells(state.lastPlaced);
      if(changed){renderAll();scheduleSave();}
    }
    return ok;
  };

  const baseRenderBoard=renderBoard;
  renderBoard=function(){
    const out=baseRenderBoard();
    if(state?.mode==='SHIFT'&&Array.isArray(state.shiftAnchors)){
      state.shiftAnchors.forEach((a,i)=>{
        const c=cellEls[a.y]?.[a.x];
        if(!c)return;
        c.classList.add('shift-anchor-v131','shift-anchor-v132');
        c.dataset.anchorNumber=String(i+1);
        if(a.hit)c.classList.add('anchor-secured-v131');
      });
      boardEl.dataset.shiftPattern=PATTERN_TEXT[state.shiftPattern]||'';
    }
    return out;
  };

  const baseRenderModeStat=renderModeStat;
  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode==='SHIFT'){
      const pattern=PATTERN_TEXT[state.shiftPattern]||'↑↓↑↓';
      const n=hitCount();
      modeStatEl.textContent=n>=2?`SHIFT ${pattern}  •  STABILIZED`:`SHIFT ${pattern}  •  ◎ ${n}/2`;
    }
  };

  const baseLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='SHIFT'){
      state.shiftAnchor=null;state.shiftAnchorHit=false;
      const valid=Array.isArray(state.shiftAnchors)&&state.shiftAnchors.length===2&&state.shiftAnchors.every(a=>Number.isInteger(a.x)&&Number.isInteger(a.y)&&a.x>=0&&a.y>=0&&a.x<state.size&&a.y<state.size);
      if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
      if(!valid)prepareDualMission(false);
      renderAll();scheduleSave(true);
    }
  };

  const baseNewRun=newRun;
  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='SHIFT'){
      state.shiftAnchor=null;state.shiftAnchorHit=false;state.shiftPattern=randomPattern();
      prepareDualMission(false);
      renderAll();scheduleSave(true);
    }
    return out;
  };

  const baseModeDemoHTML=modeDemoHTML;
  modeDemoHTML=function(id){
    if(id!=='SHIFT')return baseModeDemoHTML(id);
    const cells=miniCell(0,1,'md-cyan')+miniCell(1,2,'md-purple')+miniCell(2,1,'md-cyan')+miniCell(3,2,'md-purple');
    return `<div class="mode-demo demo-shift demo-shift-v131"><div class="mini-board">${cells}<b class="shift-wave-demo-v131">↑↓↑↓</b><i class="shift-anchor-demo-v131 shift-anchor-demo-a-v132">◎</i><i class="shift-anchor-demo-v131 shift-anchor-demo-b-v132">◎</i></div></div>`;
  };

  queueMicrotask(()=>{
    try{
      buildMenu();renderMenu();
      if(state?.mode==='SHIFT'){
        state.shiftAnchor=null;state.shiftAnchorHit=false;
        if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
        if(!Array.isArray(state.shiftAnchors)||state.shiftAnchors.length!==2)prepareDualMission(false);
        renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();


/* ===== hotfix-v133.js ===== */
/* GRID SHIFT v1.3.3 — ordered SHIFT mission + synchronized clear juice */
(function(){
  'use strict';

  const PATTERNS=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const PATTERN_TEXT={
    V_UP:'↑↓↑↓↑↓↑↓↑↓',
    V_DOWN:'↓↑↓↑↓↑↓↑↓↑',
    H_LEFT:'←→←→←→←→←→',
    H_RIGHT:'→←→←→←→←→←'
  };

  function randomPattern(prev=null){
    const pool=PATTERNS.filter(p=>p!==prev);
    const src=pool.length?pool:PATTERNS;
    return src[Math.floor(Math.random()*src.length)];
  }

  function waveShift(board,size,pattern){
    const out=Core.emptyBoard(size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let xx=x,yy=y;
      if(pattern==='V_UP'||pattern==='V_DOWN'){
        const firstUp=pattern==='V_UP';
        const up=(x%2===0)?firstUp:!firstUp;
        yy=(y+(up?-1:1)+size)%size;
      }else{
        const firstLeft=pattern==='H_LEFT';
        const left=(y%2===0)?firstLeft:!firstLeft;
        xx=(x+(left?-1:1)+size)%size;
      }
      out[yy][xx]=v;
    }
    return out;
  }

  function shuffled(arr){
    const a=arr.slice();
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }

  function placementRecords(board,piece,size,limit=48){
    const out=[];
    for(const shape of Core.modeRotations(piece,'SHIFT')){
      for(const [x,y] of Core.placements(board,shape,size)){
        out.push({shape,x,y,cells:shape.cells.map(([dx,dy])=>[x+dx,y+dy])});
      }
    }
    if(out.length<=limit)return shuffled(out);
    return shuffled(out).slice(0,limit);
  }

  /* Pick targets from a real two-move solution, not merely from two independently
     reachable cells. This guarantees that ① -> ② has at least one valid route. */
  function chooseOrderedMission(){
    if(!state||state.mode!=='SHIFT')return [];
    const pieceIds=(state.tray||[]).map((p,i)=>p?i:-1).filter(i=>i>=0);
    const solutions=[];

    for(const firstIdx of shuffled(pieceIds)){
      const firstPiece=state.tray[firstIdx];
      const firstMoves=placementRecords(state.board,firstPiece,state.size,44);
      for(const first of firstMoves.slice(0,24)){
        const sim1=Core.simulatePlace(state.board,first.shape,first.x,first.y,'SHIFT',state.size);
        if(!sim1)continue;
        const firstSet=new Set(first.cells.map(([x,y])=>`${x},${y}`));
        const secondIds=shuffled(pieceIds.filter(i=>i!==firstIdx));

        for(const secondIdx of secondIds){
          const secondMoves=placementRecords(sim1.board,state.tray[secondIdx],state.size,34);
          for(const second of secondMoves.slice(0,18)){
            const secondCells=second.cells.filter(([x,y])=>!state.board[y][x]&&!firstSet.has(`${x},${y}`));
            if(!secondCells.length)continue;
            const a1s=shuffled(first.cells).slice(0,Math.min(4,first.cells.length));
            const a2s=shuffled(secondCells).slice(0,Math.min(5,secondCells.length));
            for(const [x1,y1] of a1s)for(const [x2,y2] of a2s){
              const dist=Math.abs(x1-x2)+Math.abs(y1-y2);
              if(dist<4)continue;
              const edge1=Math.min(x1,y1,state.size-1-x1,state.size-1-y1);
              const edge2=Math.min(x2,y2,state.size-1-x2,state.size-1-y2);
              const score=dist*4+Math.min(edge1,2)+Math.min(edge2,2);
              solutions.push({a1:{x:x1,y:y1},a2:{x:x2,y:y2},score});
              if(solutions.length>=30)break;
            }
            if(solutions.length>=30)break;
          }
          if(solutions.length>=30)break;
        }
        if(solutions.length>=30)break;
      }
      if(solutions.length>=30)break;
    }

    if(solutions.length){
      solutions.sort((a,b)=>b.score-a.score);
      const top=solutions.slice(0,Math.min(10,solutions.length));
      const pick=top[Math.floor(Math.random()*top.length)];
      return [
        {x:pick.a1.x,y:pick.a1.y,hit:false,order:1},
        {x:pick.a2.x,y:pick.a2.y,hit:false,order:2}
      ];
    }

    /* Fallback keeps the mode playable on a nearly full board. */
    const existing=Array.isArray(state.shiftAnchors)?state.shiftAnchors.filter(a=>Number.isInteger(a.x)&&Number.isInteger(a.y)):[];
    if(existing.length>=2)return existing.slice(0,2).map((a,i)=>({x:a.x,y:a.y,hit:false,order:i+1}));
    const empty=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++)if(!state.board[y][x])empty.push({x,y});
    return shuffled(empty).slice(0,2).map((a,i)=>({...a,hit:false,order:i+1}));
  }

  function syncMissionFlags(){
    if(!Array.isArray(state?.shiftAnchors))return;
    state.shiftAnchors.forEach((a,i)=>{
      a.hit=!state.shiftMissionFailed&&((i===0&&state.shiftStep>=1)||(i===1&&state.shiftStep>=2));
      a.wrong=!!state.shiftMissionFailed;
      a.order=i+1;
    });
  }

  function prepareOrderedMission(forcePattern=false){
    if(!state||state.mode!=='SHIFT')return;
    if(forcePattern||!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern(state.shiftPattern);
    state.shiftAnchor=null;
    state.shiftAnchorHit=false;
    state.shiftStep=0;
    state.shiftMissionFailed=false;
    state.shiftAnchors=chooseOrderedMission();
    state.shiftRoundId=(Number(state.shiftRoundId)||0)+1;
    syncMissionFlags();
  }

  function hits(anchor,cells){return !!(anchor&&Array.isArray(cells)&&cells.some(([x,y])=>x===anchor.x&&y===anchor.y));}

  function processOrderedPlacement(cells,playFeedback=true){
    if(!state||state.mode!=='SHIFT'||state.shiftMissionFailed||state.shiftStep>=2||!Array.isArray(state.shiftAnchors)||state.shiftAnchors.length<2)return false;
    const a1=state.shiftAnchors[0],a2=state.shiftAnchors[1];
    const h1=hits(a1,cells),h2=hits(a2,cells);
    let changed=false;

    if(state.shiftStep===0){
      if(h2){
        state.shiftMissionFailed=true;
        changed=true;
        if(playFeedback){requestSound('sequenceBad');showJuiceLabel('ORDER BROKEN','bad');}
      }else if(h1){
        state.shiftStep=1;changed=true;
        if(playFeedback){requestSound('anchorStep',1);showJuiceLabel('①  LOCKED','good');}
      }
    }else if(state.shiftStep===1&&h2){
      state.shiftStep=2;changed=true;
      if(playFeedback){requestSound('anchorStep',2);showJuiceLabel('②  LOCKED','good');}
    }
    syncMissionFlags();
    return changed;
  }

  applyShiftRound=function(){
    if(!state||state.mode!=='SHIFT')return;
    /* The third piece reaches completeTray before outer tryPlace wrappers return. */
    processOrderedPlacement(state.lastPlaced,true);
    const pattern=PATTERNS.includes(state.shiftPattern)?state.shiftPattern:randomPattern();

    if(!state.shiftMissionFailed&&state.shiftStep>=2){
      announce('STABILIZED  •  ① → ②',true);
      requestSound('sequenceWin');
      showJuiceLabel('STABILIZED','good');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),440);
      return;
    }

    state.board=waveShift(state.board,state.size,pattern);
    boardEl.dataset.waveFx=pattern;
    boardEl.classList.remove('wave-shift-v131');void boardEl.offsetWidth;boardEl.classList.add('wave-shift-v131');
    setTimeout(()=>{boardEl.classList.remove('wave-shift-v131');delete boardEl.dataset.waveFx;},440);

    const clear=Core.scanClears(state.board,state.size,'CLASSIC');
    if(clear.units){
      clearBombsAt(clear.cells);Core.clearCells(state.board,clear.cells);state.trayHadClear=true;
      const gain=scoreClear(clear.units,clear.cells.length,0)+80;state.score+=gain;queueFx('burst',{cells:clear.cells,wave:0});
      announce(`WAVE CLEAR  +${gain}`,true);
    }else{
      announce(state.shiftMissionFailed?'WAVE  •  ORDER BROKEN':`WAVE  •  ${state.shiftStep}/2`);
      beep('shift');
    }
  };

  completeTray=function(){
    if(state.mode==='SHIFT')applyShiftRound();
    if(state.trayHadClear){
      state.chain++;
      const bonus=state.chain>=2?25*state.chain:0;
      if(bonus){
        state.score+=bonus;
        if(state.chain===3||state.chain===5||state.chain%10===0){announce(`CHAIN ${state.chain}  +${bonus}`,true);beep('chain');queueFx('chain',state.chain);}
      }
    }else state.chain=0;
    state.trayHadClear=false;
    state.tray=Core.generateFairTray(state.board,state.mode,state.size,Math.random,state.moves);
    if(state.mode==='SHIFT'){
      state.shiftPattern=randomPattern(state.shiftPattern);
      prepareOrderedMission(false);
    }
  };

  const baseTryPlace=tryPlace;
  tryPlace=function(idx,x,y){
    const isShift=state?.mode==='SHIFT';
    const roundId=Number(state?.shiftRoundId)||0;
    const before=Number(state?.moves)||0;
    const ok=baseTryPlace(idx,x,y);
    if(!ok||!isShift||!state)return ok;
    const after=Number(state.moves)||0;
    if(after>before&&Number(state.shiftRoundId)===roundId){
      if(processOrderedPlacement(state.lastPlaced,true)){renderAll();scheduleSave();}
    }
    return ok;
  };

  const baseRenderBoard=renderBoard;
  renderBoard=function(){
    const out=baseRenderBoard();
    if(state?.mode==='SHIFT'&&Array.isArray(state.shiftAnchors)){
      syncMissionFlags();
      state.shiftAnchors.forEach((a,i)=>{
        const c=cellEls[a.y]?.[a.x];if(!c)return;
        c.classList.add('shift-order-v133');
        c.dataset.orderGlyph=i===0?'①':'②';
        c.classList.toggle('order-current-v133',!state.shiftMissionFailed&&state.shiftStep===i);
        c.classList.toggle('order-locked-v133',!state.shiftMissionFailed&&i===1&&state.shiftStep===0);
        c.classList.toggle('order-done-v133',!state.shiftMissionFailed&&state.shiftStep>i);
        c.classList.toggle('order-failed-v133',!!state.shiftMissionFailed);
      });
    }
    return out;
  };

  const baseRenderModeStat=renderModeStat;
  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode==='SHIFT'){
      const p=PATTERN_TEXT[state.shiftPattern]||'↑↓↑↓';
      const short=p.slice(0,4);
      const tail=state.shiftMissionFailed?'WAVE':state.shiftStep>=2?'SAFE':state.shiftStep===1?'②':'①';
      modeStatEl.textContent=`SHIFT ${short}  •  ${tail}`;
    }
  };

  const baseLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='SHIFT'){
      state.shiftAnchor=null;state.shiftAnchorHit=false;
      const valid=Array.isArray(state.shiftAnchors)&&state.shiftAnchors.length===2&&state.shiftAnchors.every(a=>Number.isInteger(a.x)&&Number.isInteger(a.y)&&a.x>=0&&a.y>=0&&a.x<state.size&&a.y<state.size);
      if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
      if(!valid||!Number.isInteger(state.shiftStep))prepareOrderedMission(false);
      syncMissionFlags();renderAll();scheduleSave(true);
    }
  };

  const baseNewRun=newRun;
  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='SHIFT'){
      state.shiftPattern=randomPattern();prepareOrderedMission(false);renderAll();scheduleSave(true);
    }
    return out;
  };

  /* ---------- Clear feedback: audio and visuals share the same start time. ---------- */
  function connectPan(node,pan){
    const ctx=audioCtx;if(!ctx)return node;
    if(typeof ctx.createStereoPanner==='function'){
      const p=ctx.createStereoPanner();p.pan.value=Math.max(-.85,Math.min(.85,pan||0));node.connect(p);p.connect(audioOut(ctx));return null;
    }
    node.connect(audioOut(ctx));return null;
  }

  function juiceTone(freq,dur=.08,type='sine',vol=.03,delay=0,slide=null,pan=0){
    const ctx=audioCtx;if(!ctx||ctx.state!=='running'||effectiveMuted())return;
    const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);connectPan(g,pan);o.start(t);o.stop(t+dur+.03);
  }

  function juiceNoise(dur=.025,vol=.012,filterFreq=3000,delay=0,pan=0){
    const ctx=audioCtx;if(!ctx||ctx.state!=='running'||effectiveMuted())return;
    const frames=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,frames,ctx.sampleRate),data=buf.getChannelData(0);
    for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
    filter.type='bandpass';filter.frequency.value=filterFreq;filter.Q.value=.75;g.gain.value=vol;
    src.buffer=buf;src.connect(filter);filter.connect(g);connectPan(g,pan);src.start(ctx.currentTime+delay);
  }

  function playClearJuice(cells,mode,wave=0){
    if(!cells?.length||effectiveMuted()||!audioCtx||audioCtx.state!=='running')return;
    const cx=cells.reduce((s,c)=>s+c[0]+.5,0)/cells.length;
    const pan=Math.max(-.72,Math.min(.72,(cx/state.size-.5)*1.45));
    const power=Math.max(1,Math.min(4,Math.ceil(cells.length/10)));
    juiceNoise(.022,.014+.002*power,3600,0,pan);

    if(mode==='SQUARES'){
      juiceTone(205,.105,'triangle',.038,0,145,pan);
      juiceTone(575,.10,'sine',.035,.035,760,pan);
      juiceTone(865,.14,'sine',.026,.082,1120,pan);
      if(power>=3)juiceTone(1150,.13,'sine',.018,.125,1450,pan);
    }else if(mode==='GRAVITY'){
      const root=330+Math.min(5,wave)*70;
      juiceTone(root,.085,'triangle',.035,0,root*.82,pan);
      juiceTone(root*1.48,.12,'sine',.03,.045,root*1.9,pan);
    }else if(mode==='SHIFT'){
      juiceTone(185,.11,'sawtooth',.026,0,390,pan);
      juiceTone(620,.09,'sine',.032,.045,860,pan);
      juiceTone(980,.11,'sine',.022,.092,1240,pan);
    }else{
      juiceTone(235,.085,'triangle',.034,0,175,pan);
      juiceTone(540,.085,'sine',.032,.03,720,pan);
      juiceTone(820,.11,'sine',.021,.07,1040,pan);
      if(power>=2)juiceTone(1080,.10,'sine',.017,.105,1340,pan);
    }
  }

  const baseBeep=beep;
  beep=function(kind,power=1){
    /* clear/multi are now fired by burstCells exactly when the visual starts. */
    if(kind==='clear'||kind==='multi')return;
    if(kind==='anchorStep'){
      const n=Math.max(1,Math.min(2,Number(power)||1));
      juiceNoise(.016,.011,4200,0,0);
      juiceTone(n===1?610:760,.055,'sine',.035,0,n===1?790:1030,0);
      juiceTone(n===1?900:1180,.075,'sine',.022,.035,n===1?1080:1420,0);return;
    }
    if(kind==='sequenceBad'){
      juiceNoise(.028,.014,700,0,0);juiceTone(210,.075,'triangle',.035,0,125,0);return;
    }
    if(kind==='sequenceWin'){
      juiceTone(520,.055,'sine',.035);juiceTone(720,.07,'sine',.032,.04);juiceTone(980,.095,'sine',.03,.09);juiceTone(1320,.12,'sine',.018,.145);return;
    }
    if(kind==='chain'){
      const n=Math.max(1,Math.min(8,Number(state?.chain)||2)),root=470+n*26;
      juiceTone(root,.055,'sine',.04);juiceTone(root*1.26,.075,'triangle',.034,.038);juiceTone(root*1.58,.095,'sine',.025,.082);return;
    }
    return baseBeep(kind,power);
  };

  function showJuiceLabel(text,tone='normal'){
    if(!boardEl||!text)return;
    const e=document.createElement('b');e.className=`juice-label-v133 ${tone==='bad'?'bad':''} ${tone==='good'?'good':''}`;e.textContent=text;boardEl.appendChild(e);setTimeout(()=>e.remove(),720);
  }

  function extraClearVisuals(cells,wave=0){
    if(!cells?.length||!state)return;
    const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const cx=(minX+maxX+1)/2,cy=(minY+maxY+1)/2;
    const mode=state.mode;

    playClearJuice(cells,mode,wave);
    scoreEl.classList.remove('juice-score-v133');void scoreEl.offsetWidth;scoreEl.classList.add('juice-score-v133');setTimeout(()=>scoreEl.classList.remove('juice-score-v133'),360);

    const ring=document.createElement('i');ring.className=`juice-ring-v133 juice-${mode.toLowerCase()}-v133`;ring.style.left=`${(cx/state.size)*100}%`;ring.style.top=`${(cy/state.size)*100}%`;boardEl.appendChild(ring);setTimeout(()=>ring.remove(),600);

    if(mode==='SQUARES'){
      const box=document.createElement('i');box.className='juice-square-v133';
      box.style.left=`${(minX/state.size)*100}%`;box.style.top=`${(minY/state.size)*100}%`;box.style.width=`${((maxX-minX+1)/state.size)*100}%`;box.style.height=`${((maxY-minY+1)/state.size)*100}%`;
      boardEl.appendChild(box);setTimeout(()=>box.remove(),620);showJuiceLabel('SQUARE!','good');
    }else if(mode!=='GRAVITY'){
      const w=maxX-minX+1,h=maxY-minY+1;
      if(w>=state.size-2||w>=h*2){const s=document.createElement('i');s.className='juice-sweep-v133 horizontal';s.style.top=`${(cy/state.size)*100}%`;boardEl.appendChild(s);setTimeout(()=>s.remove(),460);}
      if(h>=state.size-2||h>=w*2){const s=document.createElement('i');s.className='juice-sweep-v133 vertical';s.style.left=`${(cx/state.size)*100}%`;boardEl.appendChild(s);setTimeout(()=>s.remove(),460);}
      if(cells.length>=18)showJuiceLabel(mode==='SHIFT'?'WAVE CLEAR':'MULTI!','good');
    }

    const sample=shuffled(cells).slice(0,Math.min(10,cells.length));
    sample.forEach(([x,y],i)=>{
      const p=document.createElement('i');p.className='juice-chip-v133';
      const ang=(i/sample.length)*Math.PI*2+(Math.random()-.5)*.45,dist=18+Math.random()*25;
      p.style.left=`${((x+.5)/state.size)*100}%`;p.style.top=`${((y+.5)/state.size)*100}%`;
      p.style.setProperty('--jx',`${Math.cos(ang)*dist}px`);p.style.setProperty('--jy',`${Math.sin(ang)*dist}px`);p.style.setProperty('--jd',`${i*5}ms`);
      boardEl.appendChild(p);setTimeout(()=>p.remove(),520);
    });
  }

  const baseBurstCells=burstCells;
  burstCells=function(cells,wave=0){
    const delay=state?.mode==='GRAVITY'?wave*150:0;
    setTimeout(()=>extraClearVisuals(cells,wave),delay);
    return baseBurstCells(cells,wave);
  };

  const baseModeDemoHTML=modeDemoHTML;
  modeDemoHTML=function(id){
    if(id!=='SHIFT')return baseModeDemoHTML(id);
    const cells=miniCell(0,1,'md-cyan')+miniCell(1,2,'md-purple')+miniCell(2,1,'md-cyan')+miniCell(3,2,'md-purple');
    return `<div class="mode-demo demo-shift demo-shift-v131"><div class="mini-board">${cells}<b class="shift-wave-demo-v131">↑↓↑↓</b><i class="shift-order-demo-v133 one">①</i><i class="shift-order-demo-v133 two">②</i><em class="shift-order-arrow-v133">→</em></div></div>`;
  };

  queueMicrotask(()=>{
    try{
      buildMenu();renderMenu();
      if(state?.mode==='SHIFT'){
        state.shiftAnchor=null;state.shiftAnchorHit=false;
        if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
        /* Start a clean ordered mission on upgrade rather than inheriting a 2-anchor
           round whose reachability was computed under the old rules. */
        prepareOrderedMission(false);renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();


/* ===== hotfix-v134.js ===== */
/* GRID SHIFT v1.3.4 — SHIFT mission transaction fix + clearer ordered targets */
(function(){
  'use strict';

  function validShiftMission(){
    return !!(state&&state.mode==='SHIFT'&&Array.isArray(state.shiftAnchors)&&state.shiftAnchors.length===2);
  }

  function hit(anchor,cells){
    return !!(anchor&&Array.isArray(cells)&&cells.some(([x,y])=>x===anchor.x&&y===anchor.y));
  }

  function syncFlags(){
    if(!validShiftMission())return;
    const step=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
    const failed=!!state.shiftMissionFailed;
    state.shiftStep=step;
    state.shiftAnchors.forEach((a,i)=>{
      a.order=i+1;
      a.hit=!failed&&step>i;
      a.wrong=failed;
    });
  }

  function snapshotMission(){
    return {
      step:Number(state.shiftStep)||0,
      failed:!!state.shiftMissionFailed,
      anchors:Array.isArray(state.shiftAnchors)?state.shiftAnchors.map(a=>({...a})):null
    };
  }

  function restoreMission(snap){
    if(!snap)return;
    state.shiftStep=snap.step;
    state.shiftMissionFailed=snap.failed;
    if(snap.anchors)state.shiftAnchors=snap.anchors.map(a=>({...a}));
    syncFlags();
  }

  /* Apply the sequence result BEFORE the underlying placement reaches completeTray().
     This removes the third-piece race where the tray can resolve the WAVE before ②
     has been committed to the mission state. */
  function preCommitMission(cells){
    if(!validShiftMission()||state.shiftMissionFailed||state.shiftStep>=2)return null;
    const a1=state.shiftAnchors[0],a2=state.shiftAnchors[1];
    const h1=hit(a1,cells),h2=hit(a2,cells);
    const before=Number(state.shiftStep)||0;
    let result=null;

    if(before===0){
      /* Touching ② before ① — including touching both in one piece — breaks order. */
      if(h2){state.shiftMissionFailed=true;result='bad';}
      else if(h1){state.shiftStep=1;result='one';}
    }else if(before===1&&h2){
      state.shiftStep=2;result='two';
    }
    syncFlags();
    return result;
  }

  function intendedCells(idx,x,y){
    const piece=state?.tray?.[idx];
    if(!piece)return null;
    if(!Core.canPlace(state.board,piece,x,y,state.size))return null;
    return piece.cells.map(([dx,dy])=>[x+dx,y+dy]);
  }

  const previousTryPlace=tryPlace;
  tryPlace=function(idx,x,y){
    if(state?.mode!=='SHIFT')return previousTryPlace(idx,x,y);

    const cells=intendedCells(idx,x,y);
    if(!cells||state.gameOver||resolving)return previousTryPlace(idx,x,y);

    const snap=snapshotMission();
    const roundBefore=Number(state.shiftRoundId)||0;
    const result=preCommitMission(cells);

    const ok=previousTryPlace(idx,x,y);
    if(!ok){
      restoreMission(snap);
      renderAll();
      return ok;
    }

    /* If the third piece completed the tray, v1.3.3 has already resolved the
       round and created the next mission. Never write the old mission back. */
    const sameRound=(Number(state.shiftRoundId)||0)===roundBefore;
    if(sameRound){
      syncFlags();
      if(result==='one'){
        requestSound('anchorStep',1);
        announce('① LOCKED  •  NEXT ②',true);
      }else if(result==='two'){
        requestSound('anchorStep',2);
        announce('② LOCKED  •  STABILIZED',true);
      }else if(result==='bad'){
        requestSound('sequenceBad');
        announce('ORDER BROKEN  •  WAVE INCOMING',true);
      }
      renderAll();scheduleSave();
    }
    return ok;
  };

  /* Clean old v1.3.1/v1.3.2 target styling after their render wrappers run,
     then render one unambiguous numbered badge per target. */
  const previousRenderBoard=renderBoard;
  renderBoard=function(){
    const out=previousRenderBoard();
    if(state?.mode==='SHIFT'&&validShiftMission()){
      syncFlags();
      state.shiftAnchors.forEach((a,i)=>{
        const c=cellEls[a.y]?.[a.x];if(!c)return;
        c.classList.remove('shift-anchor-v131','shift-anchor-v132','anchor-secured-v131');
        c.classList.add('shift-order-v134');
        c.dataset.orderGlyph=String(i+1);
        c.classList.toggle('order-current-v134',!state.shiftMissionFailed&&state.shiftStep===i);
        c.classList.toggle('order-locked-v134',!state.shiftMissionFailed&&i===1&&state.shiftStep===0);
        c.classList.toggle('order-done-v134',!state.shiftMissionFailed&&state.shiftStep>i);
        c.classList.toggle('order-failed-v134',!!state.shiftMissionFailed);
      });
    }
    return out;
  };

  /* Defensive normalization for saved runs. Do not change valid progress. */
  const previousLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(state?.mode==='SHIFT'&&validShiftMission()){
      state.shiftStep=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
      state.shiftMissionFailed=!!state.shiftMissionFailed;
      syncFlags();renderAll();scheduleSave(true);
    }
  };

  queueMicrotask(()=>{try{if(state?.mode==='SHIFT'){syncFlags();renderAll();}}catch(_){ }});
})();


/* ===== hotfix-v135.js ===== */
/* GRID SHIFT v1.3.5 — authoritative SHIFT placement transaction
   SHIFT no longer passes successful placements through the older layered wrappers.
   Mission state is committed exactly once before tray-end resolution, then the WAVE
   reads that committed state without re-processing the third piece. */
(function(){
  'use strict';

  const previousTryPlace=tryPlace;

  function validMission(){
    return !!(state&&state.mode==='SHIFT'&&Array.isArray(state.shiftAnchors)&&state.shiftAnchors.length===2);
  }

  function touches(anchor,cells){
    return !!(anchor&&Array.isArray(cells)&&cells.some(([x,y])=>x===anchor.x&&y===anchor.y));
  }

  function normalizeMission(){
    if(!validMission())return;
    state.shiftStep=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
    state.shiftMissionFailed=!!state.shiftMissionFailed;
    state.shiftAnchors.forEach((a,i)=>{
      a.order=i+1;
      a.hit=!state.shiftMissionFailed&&state.shiftStep>i;
      a.wrong=state.shiftMissionFailed;
    });
  }

  /* One successful placement may advance the ordered mission at most once.
     A piece that touches ① and ② simultaneously while still waiting for ① is
     considered out of order; it cannot satisfy both steps in one move. */
  function commitMission(cells){
    if(!validMission())return null;
    normalizeMission();
    if(state.shiftMissionFailed||state.shiftStep>=2)return null;

    const a1=state.shiftAnchors[0],a2=state.shiftAnchors[1];
    const h1=touches(a1,cells),h2=touches(a2,cells);
    let result=null;

    if(state.shiftStep===0){
      if(h2){
        state.shiftMissionFailed=true;
        result='bad';
      }else if(h1){
        state.shiftStep=1;
        result='one';
      }
    }else if(state.shiftStep===1&&h2){
      state.shiftStep=2;
      result='two';
    }

    normalizeMission();
    return result;
  }

  function feedbackMission(result){
    if(result==='one'){
      requestSound('anchorStep',1);
      announce('1 LOCKED  •  NEXT 2',true);
    }else if(result==='two'){
      requestSound('anchorStep',2);
      announce('2 LOCKED  •  STABILIZED',true);
    }else if(result==='bad'){
      requestSound('sequenceBad');
      announce('ORDER BROKEN  •  WAVE INCOMING',true);
    }
  }

  function waveShiftV135(board,size,pattern){
    const out=Core.emptyBoard(size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let xx=x,yy=y;
      if(pattern==='V_UP'||pattern==='V_DOWN'){
        const firstUp=pattern==='V_UP';
        const up=(x%2===0)?firstUp:!firstUp;
        yy=(y+(up?-1:1)+size)%size;
      }else{
        const firstLeft=pattern==='H_LEFT';
        const left=(y%2===0)?firstLeft:!firstLeft;
        xx=(x+(left?-1:1)+size)%size;
      }
      out[yy][xx]=v;
    }
    return out;
  }

  const PATTERN_TEXT={
    V_UP:'↑↓↑↓↑↓↑↓↑↓',
    V_DOWN:'↓↑↓↑↓↑↓↑↓↑',
    H_LEFT:'←→←→←→←→←→',
    H_RIGHT:'→←→←→←→←→←'
  };

  /* Authoritative round resolution. Critically, this function NEVER tries to
     register lastPlaced again. The placement transaction already did that. */
  applyShiftRound=function(){
    if(!state||state.mode!=='SHIFT')return;
    normalizeMission();

    if(!state.shiftMissionFailed&&state.shiftStep===2){
      announce('STABILIZED  •  1 → 2',true);
      requestSound('sequenceWin');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),440);
      return;
    }

    const pattern=['V_UP','V_DOWN','H_LEFT','H_RIGHT'].includes(state.shiftPattern)?state.shiftPattern:'V_UP';
    state.board=waveShiftV135(state.board,state.size,pattern);
    boardEl.dataset.waveFx=pattern;
    boardEl.classList.remove('wave-shift-v131');void boardEl.offsetWidth;boardEl.classList.add('wave-shift-v131');
    setTimeout(()=>{boardEl.classList.remove('wave-shift-v131');delete boardEl.dataset.waveFx;},440);

    const clear=Core.scanClears(state.board,state.size,'CLASSIC');
    if(clear.units){
      clearBombsAt(clear.cells);
      Core.clearCells(state.board,clear.cells);
      state.trayHadClear=true;
      const gain=scoreClear(clear.units,clear.cells.length,0)+80;
      state.score+=gain;
      queueFx('burst',{cells:clear.cells,wave:0});
      announce(`WAVE CLEAR  +${gain}`,true);
    }else{
      const progress=state.shiftMissionFailed?'ORDER BROKEN':`${state.shiftStep}/2`;
      announce(`WAVE  •  ${progress}`);
      beep('shift');
    }
  };

  /* Self-contained SHIFT placement path. This intentionally bypasses v1.3.1–1.3.4
     tryPlace wrappers for SHIFT only; all other modes keep their existing path. */
  tryPlace=function(idx,x,y){
    if(state?.mode!=='SHIFT')return previousTryPlace(idx,x,y);
    if(state.gameOver||resolving)return false;

    const shape=state.tray[idx];
    if(!shape||!Core.canPlace(state.board,shape,x,y,state.size))return false;
    const sim=Core.simulatePlace(state.board,shape,x,y,'SHIFT',state.size);
    if(!sim)return false;

    /* Commit the actual successful placement BEFORE board/tray mutation can trigger
       completeTray(). This is the single source of truth for 1 -> 2 progress. */
    const missionResult=commitMission(sim.placed);

    state.board=sim.board;
    state.tray[idx]=null;
    state.moves++;
    state.score+=shape.cells.length;
    state.lastPlaced=sim.placed.map(c=>c.slice());
    queueFx('placed',sim.placed);
    beep('place',shape.cells.length);

    let totalUnits=0,totalCells=0;
    sim.waves.forEach((wave,i)=>{
      totalUnits+=wave.units;
      totalCells+=wave.cells.length;
      queueFx('burst',{cells:wave.cells,wave:i});
    });
    if(totalUnits>0){
      state.trayHadClear=true;
      const cascade=Math.max(0,sim.waves.length-1);
      const gain=scoreClear(totalUnits,totalCells,cascade);
      state.score+=gain;
      announce(totalUnits>1?`${totalUnits} CLEAR  +${gain}`:`CLEAR  +${gain}`,totalUnits>1);
      beep(totalUnits>1||cascade?'multi':'clear');
    }

    /* Feedback is allowed now because the placement is committed. On the third
       piece the state below is exactly what applyShiftRound() will inspect. */
    feedbackMission(missionResult);

    const trayFinished=state.tray.every(p=>p===null);
    if(trayFinished)completeTray();

    if(state.score>state.best)state.best=state.score;
    selectedPiece=null;
    previewAnchor=null;
    renderAll();
    scheduleSave();

    if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('NO MOVES');
    return true;
  };

  /* Defensive repair on resume. Progress lives in shiftStep, never in whether the
     target cell happens to remain occupied after line clears. */
  const previousLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(state?.mode==='SHIFT'&&validMission()){
      normalizeMission();
      renderAll();
      scheduleSave(true);
    }
  };

  queueMicrotask(()=>{try{if(state?.mode==='SHIFT'&&validMission()){normalizeMission();renderAll();}}catch(_){ }});
})();


/* ===== hotfix-v136.js ===== */
/* GRID SHIFT v1.3.6 — authoritative SHIFT state machine
   One mission spans the current 3-piece tray. Targets must be hit 1 -> 2.
   Outcome resolves as soon as it is logically known:
   - 2 reached after 1: STABILIZED immediately.
   - 2 touched before 1: WAVE immediately.
   - after two placements with 1 still untouched: WAVE immediately (success is impossible).
   - otherwise the third placement may still complete 2 after 1.
   No older SHIFT wrapper is allowed to decide the round. */
(function(){
  'use strict';

  const ENGINE_VERSION=136;
  const PATTERNS=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const PATTERN_TEXT={
    V_UP:'↑↓↑↓↑↓↑↓↑↓',
    V_DOWN:'↓↑↓↑↓↑↓↑↓↑',
    H_LEFT:'←→←→←→←→←→',
    H_RIGHT:'→←→←→←→←→←'
  };

  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray;
  const previousRenderBoard=renderBoard;
  const previousRenderModeStat=renderModeStat;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;

  function shuffle(arr){
    const out=arr.slice();
    for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }

  function randomPattern(prev=null){
    const pool=PATTERNS.filter(p=>p!==prev);
    const src=pool.length?pool:PATTERNS;
    return src[Math.floor(Math.random()*src.length)];
  }

  function touch(anchor,cells){
    return !!(anchor&&Array.isArray(cells)&&cells.some(([x,y])=>x===anchor.x&&y===anchor.y));
  }

  function waveShift(board,size,pattern){
    const out=Core.emptyBoard(size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let xx=x,yy=y;
      if(pattern==='V_UP'||pattern==='V_DOWN'){
        const firstUp=pattern==='V_UP';
        const up=(x%2===0)?firstUp:!firstUp;
        yy=(y+(up?-1:1)+size)%size;
      }else{
        const firstLeft=pattern==='H_LEFT';
        const left=(y%2===0)?firstLeft:!firstLeft;
        xx=(x+(left?-1:1)+size)%size;
      }
      out[yy][xx]=v;
    }
    return out;
  }

  function placementRecords(board,piece,size,cap=72){
    if(!piece)return [];
    const out=[];
    for(const shape of Core.modeRotations(piece,'SHIFT')){
      for(const [x,y] of Core.placements(board,shape,size)){
        out.push({shape,x,y,cells:shape.cells.map(([dx,dy])=>[x+dx,y+dy])});
      }
    }
    return out.length<=cap?shuffle(out):shuffle(out).slice(0,cap);
  }

  /* Generate targets from an actual sequential two-piece solution. A relaxed pass
     removes only the distance preference, never the reachability guarantee. */
  function findMission(minDistance){
    const ids=(state.tray||[]).map((p,i)=>p?i:-1).filter(i=>i>=0);
    const candidates=[];
    for(const firstIdx of shuffle(ids)){
      const firstMoves=placementRecords(state.board,state.tray[firstIdx],state.size,72);
      for(const first of firstMoves){
        const sim1=Core.simulatePlace(state.board,first.shape,first.x,first.y,'SHIFT',state.size);
        if(!sim1)continue;
        for(const secondIdx of shuffle(ids.filter(i=>i!==firstIdx))){
          const secondMoves=placementRecords(sim1.board,state.tray[secondIdx],state.size,64);
          for(const second of secondMoves){
            for(const [x1,y1] of first.cells){
              for(const [x2,y2] of second.cells){
                if(x1===x2&&y1===y2)continue;
                const dist=Math.abs(x1-x2)+Math.abs(y1-y2);
                if(dist<minDistance)continue;
                const edge1=Math.min(x1,y1,state.size-1-x1,state.size-1-y1);
                const edge2=Math.min(x2,y2,state.size-1-x2,state.size-1-y2);
                candidates.push({
                  a1:{x:x1,y:y1,order:1,hit:false},
                  a2:{x:x2,y:y2,order:2,hit:false},
                  score:dist*5+Math.min(edge1,2)+Math.min(edge2,2)
                });
                if(candidates.length>=40)break;
              }
              if(candidates.length>=40)break;
            }
            if(candidates.length>=40)break;
          }
          if(candidates.length>=40)break;
        }
        if(candidates.length>=40)break;
      }
      if(candidates.length>=40)break;
    }
    if(!candidates.length)return null;
    candidates.sort((a,b)=>b.score-a.score);
    const top=candidates.slice(0,Math.min(12,candidates.length));
    const pick=top[Math.floor(Math.random()*top.length)];
    return [pick.a1,pick.a2];
  }

  function chooseMission(){
    return findMission(4)||findMission(2)||findMission(1)||[];
  }

  function missionValid(){
    return !!(state&&state.mode==='SHIFT'&&Array.isArray(state.shiftAnchors)&&state.shiftAnchors.length===2&&
      state.shiftAnchors.every(a=>Number.isInteger(a.x)&&Number.isInteger(a.y)&&a.x>=0&&a.y>=0&&a.x<state.size&&a.y<state.size));
  }

  function syncMissionFlags(){
    if(!missionValid())return;
    const step=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
    state.shiftStep=step;
    state.shiftAnchors.forEach((a,i)=>{
      a.order=i+1;
      a.hit=step>i;
      a.wrong=state.shiftOutcome==='WAVE';
    });
  }

  function prepareMission(forcePattern=false){
    if(!state||state.mode!=='SHIFT')return;
    if(forcePattern||!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern(state.shiftPattern);
    state.shiftEngineVersion=ENGINE_VERSION;
    state.shiftMissionMoves=0;
    state.shiftStep=0;
    state.shiftMissionFailed=false;
    state.shiftRoundResolved=false;
    state.shiftOutcome='';
    state.shiftAnchor=null;
    state.shiftAnchorHit=false;
    state.shiftAnchors=chooseMission();
    state.shiftRoundId=(Number(state.shiftRoundId)||0)+1;
    syncMissionFlags();
  }

  function clearOldTargetClasses(){
    for(const row of cellEls||[])for(const c of row||[]){
      if(!c)continue;
      c.classList.remove(
        'shift-anchor-v131','shift-anchor-v132','anchor-secured-v131',
        'shift-order-v133','order-current-v133','order-locked-v133','order-done-v133','order-failed-v133',
        'shift-order-v134','order-current-v134','order-locked-v134','order-done-v134','order-failed-v134'
      );
      delete c.dataset.anchorNumber;
      delete c.dataset.orderGlyph;
      delete c.dataset.anchor;
    }
  }

  function fireWave(reason='MISS'){
    if(!state||state.mode!=='SHIFT'||state.shiftRoundResolved)return;
    state.shiftRoundResolved=true;
    state.shiftMissionFailed=true;
    state.shiftOutcome='WAVE';

    const pattern=PATTERNS.includes(state.shiftPattern)?state.shiftPattern:'V_UP';
    state.board=waveShift(state.board,state.size,pattern);
    boardEl.dataset.waveFx=pattern;
    boardEl.classList.remove('wave-shift-v131');void boardEl.offsetWidth;boardEl.classList.add('wave-shift-v131');
    setTimeout(()=>{boardEl.classList.remove('wave-shift-v131');delete boardEl.dataset.waveFx;},440);

    const clear=Core.scanClears(state.board,state.size,'CLASSIC');
    if(clear.units){
      Core.clearCells(state.board,clear.cells);
      state.trayHadClear=true;
      const gain=scoreClear(clear.units,clear.cells.length,0)+80;
      state.score+=gain;
      queueFx('burst',{cells:clear.cells,wave:0});
      announce(`WAVE CLEAR  +${gain}`,true);
    }else{
      announce(reason==='ORDER'?'ORDER BROKEN  •  WAVE':'WAVE',true);
      beep('shift');
    }
  }

  function stabilize(){
    if(!state||state.shiftRoundResolved)return;
    state.shiftRoundResolved=true;
    state.shiftMissionFailed=false;
    state.shiftOutcome='SAFE';
    state.shiftStep=2;
    syncMissionFlags();
    announce('STABILIZED  •  1 → 2',true);
    requestSound('sequenceWin');
    boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
    setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),440);
  }

  function advanceMission(cells){
    if(!missionValid()||state.shiftRoundResolved)return null;
    syncMissionFlags();
    const a1=state.shiftAnchors[0],a2=state.shiftAnchors[1];
    const h1=touch(a1,cells),h2=touch(a2,cells);
    let result=null;

    if(state.shiftStep===0){
      /* A single placement cannot count as both steps. 2 before 1 is a fail. */
      if(h2){result='bad';}
      else if(h1){state.shiftStep=1;result='one';}
    }else if(state.shiftStep===1&&h2){
      state.shiftStep=2;result='two';
    }
    syncMissionFlags();
    return result;
  }

  function feedbackStep(result){
    if(result==='one'){
      requestSound('anchorStep',1);
      announce('1 LOCKED  •  NEXT 2',true);
    }else if(result==='two'){
      requestSound('anchorStep',2);
    }else if(result==='bad'){
      requestSound('sequenceBad');
    }
  }

  /* SHIFT is resolved here, never by an older applyShiftRound wrapper. */
  applyShiftRound=function(){
    if(state?.mode!=='SHIFT')return;
    if(state.shiftRoundResolved)return;
    if(state.shiftStep>=2)stabilize();else fireWave('MISS');
  };

  completeTray=function(){
    if(state?.mode!=='SHIFT')return previousCompleteTray();

    /* By the time the tray is empty, tryPlace has already resolved the mission.
       This fallback exists only for corrupted/legacy state and never re-reads lastPlaced. */
    if(!state.shiftRoundResolved)applyShiftRound();

    if(state.trayHadClear){
      state.chain++;
      const bonus=state.chain>=2?25*state.chain:0;
      if(bonus){
        state.score+=bonus;
        if(state.chain===3||state.chain===5||state.chain%10===0){announce(`CHAIN ${state.chain}  +${bonus}`,true);beep('chain');queueFx('chain',state.chain);}
      }
    }else state.chain=0;
    state.trayHadClear=false;
    state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);
    state.shiftPattern=randomPattern(state.shiftPattern);
    prepareMission(false);
  };

  /* Single authoritative SHIFT placement path. */
  tryPlace=function(idx,x,y){
    if(state?.mode!=='SHIFT')return previousTryPlace(idx,x,y);
    if(state.gameOver||resolving)return false;

    const shape=state.tray[idx];
    if(!shape||!Core.canPlace(state.board,shape,x,y,state.size))return false;
    const sim=Core.simulatePlace(state.board,shape,x,y,'SHIFT',state.size);
    if(!sim)return false;

    state.board=sim.board;
    state.tray[idx]=null;
    state.moves++;
    state.score+=shape.cells.length;
    state.lastPlaced=sim.placed.map(c=>c.slice());
    queueFx('placed',sim.placed);
    beep('place',shape.cells.length);

    let totalUnits=0,totalCells=0;
    sim.waves.forEach((wave,i)=>{
      totalUnits+=wave.units;totalCells+=wave.cells.length;queueFx('burst',{cells:wave.cells,wave:i});
    });
    if(totalUnits>0){
      state.trayHadClear=true;
      const gain=scoreClear(totalUnits,totalCells,Math.max(0,sim.waves.length-1));
      state.score+=gain;
      announce(totalUnits>1?`${totalUnits} CLEAR  +${gain}`:`CLEAR  +${gain}`,totalUnits>1);
      beep(totalUnits>1?'multi':'clear');
    }

    if(!state.shiftRoundResolved){
      state.shiftMissionMoves=Math.max(0,Number(state.shiftMissionMoves)||0)+1;
      const result=advanceMission(sim.placed);
      feedbackStep(result);

      if(result==='bad'){
        fireWave('ORDER');
      }else if(state.shiftStep>=2){
        stabilize();
      }else if(state.shiftMissionMoves>=3){
        /* Third placement is allowed to save the round if it completed 2 above. */
        fireWave('MISS');
      }else if(state.shiftMissionMoves===2&&state.shiftStep===0){
        /* Only one placement remains, so 1 -> 2 can no longer be completed.
           Resolve NOW; do not leave meaningless numbers on screen for move 3. */
        fireWave('MISS');
      }
    }

    const trayFinished=state.tray.every(p=>p===null);
    if(trayFinished)completeTray();

    if(state.score>state.best)state.best=state.score;
    selectedPiece=null;previewAnchor=null;
    renderAll();scheduleSave();
    if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('NO MOVES');
    return true;
  };

  renderBoard=function(){
    const out=previousRenderBoard();
    clearOldTargetClasses();
    if(state?.mode==='SHIFT'){
      boardEl.dataset.shiftPattern=PATTERN_TEXT[state.shiftPattern]||'';
      if(!state.shiftRoundResolved&&missionValid()){
        syncMissionFlags();
        state.shiftAnchors.forEach((a,i)=>{
          const c=cellEls[a.y]?.[a.x];if(!c)return;
          c.classList.add('shift-order-v134');
          c.dataset.orderGlyph=String(i+1);
          c.classList.toggle('order-current-v134',state.shiftStep===i);
          c.classList.toggle('order-locked-v134',i===1&&state.shiftStep===0);
          c.classList.toggle('order-done-v134',state.shiftStep>i);
        });
      }
    }
    return out;
  };

  renderModeStat=function(){
    previousRenderModeStat();
    if(state?.mode==='SHIFT'){
      const p=(PATTERN_TEXT[state.shiftPattern]||'↑↓↑↓').slice(0,4);
      let tail='1';
      if(state.shiftRoundResolved)tail=state.shiftOutcome==='SAFE'?'SAFE':'WAVE';
      else if(state.shiftStep===1)tail='2';
      modeStatEl.textContent=`SHIFT ${p}  •  ${tail}`;
    }
  };

  function freshUpgradeMission(){
    /* v1.3.5 and earlier can persist contradictory layered state. Preserve board,
       score and best, but start one clean 3-piece mission on the new engine. */
    if(state.shiftEngineVersion===ENGINE_VERSION&&missionValid())return;
    state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);
    state.shiftPattern=randomPattern(state.shiftPattern);
    prepareMission(false);
  }

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(state?.mode==='SHIFT'){
      freshUpgradeMission();
      if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
      if(!state.shiftRoundResolved&&!missionValid())prepareMission(false);
      renderAll();scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(state?.mode==='SHIFT'){
      state.shiftPattern=randomPattern();
      prepareMission(false);
      renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{
      if(state?.mode==='SHIFT'){
        freshUpgradeMission();
        renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();


/* ===== hotfix-v137.js ===== */
/* GRID SHIFT v1.3.7 — slightly more finger clearance on touch drag */
(function(){
  'use strict';
  const previousDragLift=dragLift;
  dragLift=function(shape,pointerType){
    if(pointerType!=='touch')return previousDragLift(shape,pointerType);
    const [,h]=Core.shapeDims(shape);
    /* v1.3.6 used 64 + min(18,h*3). Move the piece 8px farther above the thumb. */
    return 72+Math.min(18,h*3);
  };
})();


/* ===== hotfix-v138.js ===== */
/* GRID SHIFT v1.3.8 — BOMBS risk/reward redesign
   Bombs are now both threats and tools:
   - A bomb cleared by a normal line becomes a CONTROLLED BLAST (3x3 clear).
   - Bombs inside that 3x3 chain-react for escalating rewards.
   - A fuse reaching zero causes an UNCONTROLLED BLAST instead of instant game over;
     nearby empty cells become removable rubble.
   - Blast zones and chainable bomb clusters are telegraphed on the board. */
(function(){
  'use strict';

  const BOMB_ENGINE_VERSION=138;
  const baseClearBombsAt=clearBombsAt;
  const baseTickBombs=tickBombs;
  const baseSpawnBomb=spawnBomb;
  const baseRenderBoard=renderBoard;
  const baseRenderModeStat=renderModeStat;
  const baseLoadSlot=loadSlot;
  const baseNewRun=newRun;
  const baseBeep=beep;
  const baseAnnounce=announce;

  function key(x,y){return `${x},${y}`;}
  function inBoard(x,y){return x>=0&&y>=0&&x<state.size&&y<state.size;}
  function cheb(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));}

  function blastCellsFor(b,radius=1){
    const out=[];
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      const x=b.x+dx,y=b.y+dy;
      if(inBoard(x,y))out.push([x,y]);
    }
    return out;
  }

  function activeBombAt(x,y){return state.bombs.find(b=>b.x===x&&b.y===y)||null;}

  function chainBombs(seedBombs){
    const queue=seedBombs.slice(),seen=new Set(),out=[];
    while(queue.length){
      const b=queue.shift(),k=key(b.x,b.y);
      if(seen.has(k))continue;
      seen.add(k);out.push(b);
      for(const other of state.bombs){
        const ok=key(other.x,other.y);
        if(seen.has(ok))continue;
        if(cheb(b,other)<=1)queue.push(other);
      }
    }
    return out;
  }

  function showBlastFX(bombs,type='controlled',rubbleCount=0){
    const snapshot=bombs.map(b=>({x:b.x,y:b.y}));
    const chainCount=snapshot.length;
    setTimeout(()=>{
      if(!boardEl||!state)return;
      boardEl.classList.remove('bomb-impact-v138','bomb-chaos-v138');
      void boardEl.offsetWidth;
      boardEl.classList.add(type==='controlled'?'bomb-impact-v138':'bomb-chaos-v138');
      setTimeout(()=>boardEl.classList.remove('bomb-impact-v138','bomb-chaos-v138'),520);
      snapshot.forEach((b,i)=>{
        const ring=document.createElement('i');
        ring.className=`bomb-blast-ring-v138 ${type}`;
        ring.style.left=`${((b.x+.5)/state.size)*100}%`;
        ring.style.top=`${((b.y+.5)/state.size)*100}%`;
        ring.style.setProperty('--bd',`${i*42}ms`);
        boardEl.appendChild(ring);
        setTimeout(()=>ring.remove(),700+i*45);
      });
      if(chainCount>1||type==='uncontrolled'){
        const label=document.createElement('b');
        label.className=`bomb-label-v138 ${type}`;
        label.textContent=type==='controlled'?`CHAIN BLAST ×${chainCount}`:`UNCONTROLLED  +${rubbleCount} RUBBLE`;
        boardEl.appendChild(label);setTimeout(()=>label.remove(),900);
      }
    },0);
  }

  function controlledBlast(seedBombs){
    if(!seedBombs.length)return {count:0,gain:0,cells:[]};
    const chain=chainBombs(seedBombs);
    const blastSet=new Set();
    for(const b of chain)for(const [x,y] of blastCellsFor(b,1))blastSet.add(key(x,y));

    const chainKeys=new Set(chain.map(b=>key(b.x,b.y)));
    let clearedExtra=0;
    for(const k of blastSet){
      const [x,y]=k.split(',').map(Number);
      if(state.board[y][x])clearedExtra++;
      state.board[y][x]=0;
    }
    state.bombs=state.bombs.filter(b=>!chainKeys.has(key(b.x,b.y)));
    if(Array.isArray(state.bombRubble))state.bombRubble=state.bombRubble.filter(r=>!blastSet.has(key(r.x,r.y)));

    const n=chain.length;
    const gain=140*n + 100*(n*(n-1)/2) + clearedExtra*4;
    state.score+=gain;
    state.bombLastBlast={count:n,gain};
    const cells=[...blastSet].map(k=>k.split(',').map(Number));
    if(cells.length)queueFx('burst',{cells,wave:0});
    requestSound(n>=2?'bombChain':'controlledBlast',n);
    showBlastFX(chain,'controlled');
    return {count:n,gain,cells};
  }

  /* Called by the normal line-clear path. A line touching one bomb detonates it in
     a controlled 3x3 blast and can chain into adjacent bombs. */
  clearBombsAt=function(cells){
    if(state?.mode!=='BOMBS')return baseClearBombsAt(cells);
    if(!Array.isArray(cells)||!state.bombs?.length)return;
    const set=new Set(cells.map(([x,y])=>key(x,y)));
    const seeds=state.bombs.filter(b=>set.has(key(b.x,b.y)));
    if(seeds.length)controlledBlast(seeds);
  };

  function scatterRubble(chain){
    const bombKeys=new Set(state.bombs.map(b=>key(b.x,b.y)));
    const candidates=[];
    const seen=new Set();
    for(const b of chain){
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        const x=b.x+dx,y=b.y+dy,k=key(x,y);
        if(!inBoard(x,y)||seen.has(k)||bombKeys.has(k))continue;
        seen.add(k);
        if(state.board[y][x])continue;
        const d=Math.max(Math.abs(dx),Math.abs(dy));
        if(d===0)continue;
        candidates.push({x,y,d,near:Math.abs(dx)+Math.abs(dy)});
      }
    }
    /* Prefer nearby cells, but randomize within the danger zone. */
    candidates.sort((a,b)=>(a.d-b.d)||((Math.random()-.5)*2));
    const wanted=Math.min(8,Math.max(3,chain.length*3));
    const pool=candidates.slice(0,Math.min(candidates.length,18));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const chosen=pool.slice(0,wanted);
    if(!Array.isArray(state.bombRubble))state.bombRubble=[];
    const rubbleKeys=new Set(state.bombRubble.map(r=>key(r.x,r.y)));
    for(const p of chosen){
      state.board[p.y][p.x]=7;
      const k=key(p.x,p.y);if(!rubbleKeys.has(k)){state.bombRubble.push({x:p.x,y:p.y});rubbleKeys.add(k);}
    }
    return chosen;
  }

  function uncontrolledBlast(due){
    if(!due.length)return;
    const chain=chainBombs(due);
    const chainKeys=new Set(chain.map(b=>key(b.x,b.y)));
    /* Remove detonating bombs first; unlike controlled blasts they do not clean the
       board. Their consequence is new rubble occupying nearby empty space. */
    for(const b of chain)state.board[b.y][b.x]=0;
    state.bombs=state.bombs.filter(b=>!chainKeys.has(key(b.x,b.y)));
    const rubble=scatterRubble(chain);
    requestSound(chain.length>=2?'bombChaosChain':'uncontrolledBlast',chain.length);
    showBlastFX(chain,'uncontrolled',rubble.length);
    announce(chain.length>1?`CHAIN FAILURE  •  +${rubble.length} RUBBLE`:`UNCONTROLLED BLAST  •  +${rubble.length} RUBBLE`,true);
  }

  /* Fuse expiry is now a recoverable board disaster, not an instant game over. */
  tickBombs=function(){
    if(state?.mode!=='BOMBS')return baseTickBombs();
    if(!Array.isArray(state.bombs)||!state.bombs.length)return;
    for(const b of state.bombs)b.t--;
    const due=state.bombs.filter(b=>b.t<=0);
    if(due.length)uncontrolledBlast(due);
    const min=state.bombs.length?Math.min(...state.bombs.map(b=>b.t)):99;
    if(min<=2)beep('danger');
  };

  function chooseSpawnCell(avoidCells=[]){
    const avoid=Array.isArray(avoidCells)?avoidCells:[];
    const candidates=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
      if(state.board[y][x]||activeBombAt(x,y))continue;
      let row=0,col=0;
      for(let i=0;i<state.size;i++){row+=state.board[y][i]?1:0;col+=state.board[i][x]?1:0;}
      const dist=avoid.length?Math.min(...avoid.map(([ax,ay])=>Math.abs(ax-x)+Math.abs(ay-y))):9;
      const bombDist=state.bombs.length?Math.min(...state.bombs.map(b=>Math.max(Math.abs(b.x-x),Math.abs(b.y-y)))):99;
      candidates.push({x,y,row,col,dist,bombDist});
    }
    if(!candidates.length)return null;

    /* Sometimes deliberately offer a chain opportunity. This is also dangerous:
       if one of the clustered bombs expires, the cluster can fail together. */
    if(state.bombs.length&&Math.random()<.42){
      const chainable=candidates.filter(p=>p.bombDist<=1&&Math.max(p.row,p.col)<=8);
      if(chainable.length)return chainable[Math.floor(Math.random()*chainable.length)];
    }

    let pool=candidates.filter(p=>p.dist>=3&&Math.max(p.row,p.col)<=7&&p.bombDist>=2);
    if(pool.length<6)pool=candidates.filter(p=>Math.max(p.row,p.col)<=8);
    if(!pool.length)pool=candidates;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  spawnBomb=function(avoidCells=[]){
    if(state?.mode!=='BOMBS')return baseSpawnBomb(avoidCells);
    const p=chooseSpawnCell(avoidCells);if(!p)return;
    const fuse=state.moves>=32?4:5;
    state.board[p.y][p.x]=6;
    state.bombs.push({x:p.x,y:p.y,t:fuse});
    requestSound('bomb');queueFx('bombAlert');renderBoard();
  };

  /* Replace the old generic BOMB CLEARED message with the actual blast reward. */
  announce=function(text,strong=false){
    if(state?.mode==='BOMBS'&&typeof text==='string'&&text.startsWith('BOMB CLEARED')&&state.bombLastBlast){
      const b=state.bombLastBlast;state.bombLastBlast=null;
      return baseAnnounce(b.count>1?`CHAIN BLAST ×${b.count}  +${b.gain}`:`CONTROLLED BLAST  +${b.gain}`,true);
    }
    return baseAnnounce(text,strong);
  };

  beep=function(kind,power=1){
    if(kind==='controlledBlast'){
      noiseBurst(.07,.035,2600);tone(185,.11,'triangle',.06,0,105);tone(720,.11,'sine',.045,.045,1040);return;
    }
    if(kind==='bombChain'){
      const n=Math.max(2,Math.min(5,Number(power)||2));
      noiseBurst(.10,.05,2300);tone(155,.15,'sawtooth',.055,0,85);
      for(let i=0;i<n;i++)tone(560+i*150,.08,'sine',.035,.035+i*.045,760+i*180);
      return;
    }
    if(kind==='uncontrolledBlast'){
      noiseBurst(.14,.06,420);tone(105,.22,'sawtooth',.065,0,62);tone(190,.11,'triangle',.035,.035,95);return;
    }
    if(kind==='bombChaosChain'){
      const n=Math.max(2,Math.min(4,Number(power)||2));
      noiseBurst(.18,.075,340);tone(92,.28,'sawtooth',.075,0,48);
      for(let i=1;i<n;i++)noiseBurst(.09,.04,460,.055*i);
      return;
    }
    return baseBeep(kind,power);
  };

  renderBoard=function(){
    const out=baseRenderBoard();
    if(state?.mode!=='BOMBS')return out;

    /* Rubble is ordinary occupied material mechanically, but visually reads as a
       consequence that the player can later remove with a line clear. */
    if(!Array.isArray(state.bombRubble))state.bombRubble=[];
    state.bombRubble=state.bombRubble.filter(r=>inBoard(r.x,r.y)&&Number(state.board[r.y][r.x])===7&&!activeBombAt(r.x,r.y));
    for(const r of state.bombRubble)cellEls[r.y]?.[r.x]?.classList.add('rubble-v138');

    for(const b of state.bombs){
      for(const [x,y] of blastCellsFor(b,1)){
        const c=cellEls[y]?.[x];if(!c)continue;
        c.classList.add('bomb-zone-v138');
        if(b.t<=2)c.classList.add('bomb-zone-hot-v138');
      }
      const c=cellEls[b.y]?.[b.x];
      if(c){
        c.classList.add('bomb-core-v138');
        if(state.bombs.some(o=>o!==b&&cheb(b,o)<=1))c.classList.add('bomb-chainable-v138');
      }
    }
    return out;
  };

  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode==='BOMBS'){
      const min=state.bombs?.length?Math.min(...state.bombs.map(b=>b.t)):null;
      modeStatEl.textContent=min===null?'BOMBS':`FUSE ${min}`;
      modeStatEl.classList.toggle('urgent',min!==null&&min<=2);
      modeStatEl.classList.add('visible');
    }
  };

  function normalizeBombState(){
    if(state?.mode!=='BOMBS')return;
    state.bombEngineVersion=BOMB_ENGINE_VERSION;
    if(!Array.isArray(state.bombs))state.bombs=[];
    if(!Array.isArray(state.bombRubble))state.bombRubble=[];
    state.bombs=state.bombs.filter(b=>Number.isInteger(b.x)&&Number.isInteger(b.y)&&inBoard(b.x,b.y)).map(b=>({...b,t:Math.max(1,Math.min(5,Number(b.t)||5))}));
    for(const b of state.bombs)state.board[b.y][b.x]=6;
    state.bombRubble=state.bombRubble.filter(r=>Number.isInteger(r.x)&&Number.isInteger(r.y)&&inBoard(r.x,r.y)&&!activeBombAt(r.x,r.y));
    for(const r of state.bombRubble)if(!state.board[r.y][r.x])state.board[r.y][r.x]=7;
  }

  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='BOMBS'){
      normalizeBombState();renderAll();scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='BOMBS'){
      state.bombEngineVersion=BOMB_ENGINE_VERSION;
      state.bombLastBlast=null;
      state.bombRubble=[];
      renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{try{if(state?.mode==='BOMBS'){normalizeBombState();renderAll();}}catch(_){ }});
})();

