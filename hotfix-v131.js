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
