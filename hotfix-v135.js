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
