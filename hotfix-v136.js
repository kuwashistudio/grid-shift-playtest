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
