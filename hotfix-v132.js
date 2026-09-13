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
