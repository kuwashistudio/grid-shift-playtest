/* GRID SHIFT v1.4.9 — SHIFT simplified to a self-explanatory three-move rhythm.
   Rule:
   - Every tray of 3 pieces is one round.
   - If the player clears any normal row/column during those 3 placements, the round is STABLE and no shift occurs.
   - Otherwise, after piece 3 the board performs the already-established alternating row/column wave.
   - ①/② targets are retired completely.
*/
(function(){
  'use strict';

  const VERSION=149;
  const PATTERNS=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const PATTERN_TEXT={
    V_UP:'↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓',
    V_DOWN:'↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑',
    H_LEFT:'← → ← → ← → ← → ← →',
    H_RIGHT:'→ ← → ← → ← → ← → ←'
  };

  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray;
  const previousRenderBoard=renderBoard;
  const previousRenderAll=renderAll;
  const previousRenderModeStat=renderModeStat;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;
  const previousModeDemoHTML=modeDemoHTML;

  function isShift(){return state?.mode==='SHIFT';}

  function randomPattern(prev=''){
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

  function clearLegacyMissionState(){
    if(!state)return;
    state.shiftAnchors=[];
    state.shiftAnchor=null;
    state.shiftAnchorHit=false;
    state.shiftStep=0;
    state.shiftMissionMoves=0;
    state.shiftMissionFailed=false;
    state.shiftRoundResolved=false;
    state.shiftOutcome='';
    state.shiftEarly2V148=false;
  }

  function startRound(newPattern=true){
    if(!isShift())return;
    state.shiftRulesVersion=VERSION;
    state.shiftRoundMovesV149=0;
    state.shiftRoundClearedV149=false;
    state.shiftRoundResultV149='';
    if(newPattern||!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern(state.shiftPattern);
    clearLegacyMissionState();
  }

  function migrateIfNeeded(){
    if(!isShift()||state.gameOver)return;
    if(state.shiftRulesVersion===VERSION){
      if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern('');
      state.shiftRoundMovesV149=Math.max(0,Math.min(2,Number(state.shiftRoundMovesV149)||0));
      state.shiftRoundClearedV149=!!state.shiftRoundClearedV149;
      clearLegacyMissionState();
      return;
    }
    /* Old SHIFT saves contain ①/② mission state that no longer has meaning. Keep
       board/score/best, but begin one clean three-piece round under the new rule. */
    state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);
    startRound(true);
  }

  function clearLegacyTargetClasses(){
    for(const row of cellEls||[])for(const c of row||[]){
      if(!c)continue;
      c.classList.remove(
        'shift-anchor-v131','shift-anchor-v132','anchor-secured-v131',
        'shift-order-v133','shift-order-v134',
        'order-current-v133','order-current-v134','order-locked-v133','order-locked-v134',
        'order-done-v133','order-done-v134','order-failed-v133','order-failed-v134',
        'shift-early2-v148'
      );
      delete c.dataset.anchorNumber;
      delete c.dataset.orderGlyph;
      delete c.dataset.anchor;
    }
  }

  function patternLabel(){
    const p=PATTERNS.includes(state?.shiftPattern)?state.shiftPattern:'V_UP';
    const axis=(p==='V_UP'||p==='V_DOWN')?'COLS':'ROWS';
    return {axis,glyph:PATTERN_TEXT[p]||PATTERN_TEXT.V_UP};
  }

  function ensureGuide(){
    let guide=document.getElementById('shiftGuideV149');
    const shell=document.querySelector('.game-shell');
    const boardWrap=document.querySelector('.board-wrap');
    if(!shell||!boardWrap)return null;
    if(!guide){
      guide=document.createElement('div');
      guide.id='shiftGuideV149';
      guide.className='shift-guide-v149';
      guide.innerHTML='<div class="shift-rule-v149"><span class="shift-pips-v149"><i></i><i></i><i></i></span><b class="shift-arrow-v149">→</b><strong>SHIFT</strong><em class="shift-stable-v149">✓ STABLE</em></div><div class="shift-direction-v149"></div>';
    }
    const old=document.getElementById('shiftGuideV148');if(old)old.hidden=true;
    const badge=document.getElementById('modeBadgeV143');
    if(badge&&badge.nextSibling!==guide)badge.after(guide);
    else if(!guide.isConnected)shell.insertBefore(guide,boardWrap);
    return guide;
  }

  function syncGuide(){
    const guide=ensureGuide();if(!guide)return;
    guide.hidden=!isShift();
    if(!isShift())return;
    const moves=Math.max(0,Math.min(3,Number(state.shiftRoundMovesV149)||0));
    const stable=!!state.shiftRoundClearedV149;
    guide.classList.toggle('stable-v149',stable);
    guide.querySelectorAll('.shift-pips-v149 i').forEach((p,i)=>p.classList.toggle('spent',i<moves));
    const info=patternLabel();
    guide.querySelector('.shift-direction-v149').textContent=stable?'NO SHIFT THIS ROUND':`${info.axis}  ${info.glyph}`;
  }

  function fireWave(){
    const pattern=PATTERNS.includes(state.shiftPattern)?state.shiftPattern:'V_UP';
    state.board=waveShift(state.board,state.size,pattern);
    boardEl.dataset.waveFx=pattern;
    boardEl.classList.remove('wave-shift-v131');void boardEl.offsetWidth;boardEl.classList.add('wave-shift-v131');
    setTimeout(()=>{boardEl.classList.remove('wave-shift-v131');delete boardEl.dataset.waveFx;},440);
    requestSound('shift');

    const clear=Core.scanClears(state.board,state.size,'CLASSIC');
    if(clear.units){
      Core.clearCells(state.board,clear.cells);
      state.trayHadClear=true;
      const gain=scoreClear(clear.units,clear.cells.length,0)+60;
      state.score+=gain;
      queueFx('burst',{cells:clear.cells,wave:0});
      announce(`SHIFT CLEAR  +${gain}`,true);
    }else announce('SHIFT',false);
  }

  function finishShiftRound(){
    if(state.shiftRoundClearedV149){
      state.shiftRoundResultV149='STABLE';
      requestSound('sequenceWin');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),440);
      announce('STABLE  •  NO SHIFT',true);
    }else{
      state.shiftRoundResultV149='SHIFT';
      fireWave();
    }
  }

  completeTray=function(){
    if(!isShift())return previousCompleteTray();

    finishShiftRound();

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
    startRound(true);
  };

  tryPlace=function(idx,x,y){
    if(!isShift())return previousTryPlace(idx,x,y);
    if(state.gameOver||resolving)return false;

    const shape=state.tray[idx];
    if(!shape||!Core.canPlace(state.board,shape,x,y,state.size))return false;
    const sim=Core.simulatePlace(state.board,shape,x,y,'SHIFT',state.size);
    if(!sim)return false;

    state.board=sim.board;
    state.tray[idx]=null;
    state.moves++;
    state.shiftRoundMovesV149=Math.min(3,(Number(state.shiftRoundMovesV149)||0)+1);
    state.score+=shape.cells.length;
    state.lastPlaced=sim.placed.map(c=>c.slice());
    queueFx('placed',sim.placed);
    beep('place',shape.cells.length);

    let totalUnits=0,totalCells=0;
    sim.waves.forEach((wave,i)=>{
      totalUnits+=wave.units;totalCells+=wave.cells.length;queueFx('burst',{cells:wave.cells,wave:i});
    });
    if(totalUnits>0){
      state.shiftRoundClearedV149=true;
      state.trayHadClear=true;
      const gain=scoreClear(totalUnits,totalCells,Math.max(0,sim.waves.length-1));
      state.score+=gain;
      announce(totalUnits>1?`${totalUnits} CLEAR  +${gain}`:`CLEAR  +${gain}`,totalUnits>1);
      beep(totalUnits>1?'multi':'clear');
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
    if(isShift())clearLegacyTargetClasses();
    return out;
  };

  renderModeStat=function(){
    previousRenderModeStat();
    if(!isShift())return;
    modeStatEl.textContent='';
    modeStatEl.classList.remove('visible','urgent');
  };

  renderAll=function(){
    const out=previousRenderAll();
    if(isShift())clearLegacyTargetClasses();
    syncGuide();
    return out;
  };

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(isShift()&&!state.gameOver){
      migrateIfNeeded();
      renderAll();scheduleSave(true);
    }else syncGuide();
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(isShift()&&!state.gameOver){
      startRound(true);
      renderAll();scheduleSave(true);
    }
    return out;
  };

  /* Update the selector animation too: no more ①/②. It now shows three moves
     counting down into the alternating wave, which is the actual game rule. */
  modeDemoHTML=function(id){
    if(id!=='SHIFT')return previousModeDemoHTML(id);
    let cells='';
    cells+=miniCell(0,1,'md-cyan v149-shift-row r1');
    cells+=miniCell(1,1,'md-cyan v149-shift-row r1');
    cells+=miniCell(3,1,'md-purple v149-shift-row r1');
    cells+=miniCell(1,3,'md-green v149-shift-row r2');
    cells+=miniCell(2,3,'md-green v149-shift-row r2');
    cells+=miniCell(4,3,'md-gold v149-shift-row r2');
    return `<div class="mode-demo mode-demo-v147 demo-shift-v149"><div class="mini-board">${cells}<div class="v149-demo-count"><i></i><i></i><i></i><b>→</b><strong>⇄</strong></div><em class="v149-demo-a a1">→</em><em class="v149-demo-a a2">←</em></div></div>`;
  };

  queueMicrotask(()=>{
    try{
      buildMenu();renderMenu();
      if(isShift()&&!state.gameOver){migrateIfNeeded();renderAll();scheduleSave(true);}else syncGuide();
    }catch(_){ }
  });
})();
