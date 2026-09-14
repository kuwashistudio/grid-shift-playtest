/* GRID SHIFT v1.5.1 — SHIFT never awards an accidental clear.
   The player's placement is the only way to earn STABLE / a line clear.
   Before an unstable round shifts, test the available wave patterns and use one
   that does not leave a completed row/column. During the final drag, show the
   exact safe direction that will be used so the forecast remains truthful.
*/
(function(){
  'use strict';

  const ALT=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const LABEL={
    V_UP:{axis:'COLS',glyph:'↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓'},
    V_DOWN:{axis:'COLS',glyph:'↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑'},
    H_LEFT:{axis:'ROWS',glyph:'← → ← → ← → ← → ← →'},
    H_RIGHT:{axis:'ROWS',glyph:'→ ← → ← → ← → ← → ←'},
    V_ALL_UP:{axis:'COLS',glyph:'↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑'},
    V_ALL_DOWN:{axis:'COLS',glyph:'↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓'},
    H_ALL_LEFT:{axis:'ROWS',glyph:'← ← ← ← ← ← ← ← ← ←'},
    H_ALL_RIGHT:{axis:'ROWS',glyph:'→ → → → → → → → → →'}
  };

  const previousCompleteTray=completeTray;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;

  function isShift(){return state?.mode==='SHIFT'&&state?.shiftRulesVersion===149;}

  function shifted(board,size,plan){
    const out=Core.emptyBoard(size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let xx=x,yy=y;
      if(plan==='V_UP'||plan==='V_DOWN'){
        const firstUp=plan==='V_UP';
        const up=(x%2===0)?firstUp:!firstUp;
        yy=(y+(up?-1:1)+size)%size;
      }else if(plan==='H_LEFT'||plan==='H_RIGHT'){
        const firstLeft=plan==='H_LEFT';
        const left=(y%2===0)?firstLeft:!firstLeft;
        xx=(x+(left?-1:1)+size)%size;
      }else if(plan==='V_ALL_UP') yy=(y-1+size)%size;
      else if(plan==='V_ALL_DOWN') yy=(y+1)%size;
      else if(plan==='H_ALL_LEFT') xx=(x-1+size)%size;
      else if(plan==='H_ALL_RIGHT') xx=(x+1)%size;
      out[yy][xx]=v;
    }
    return out;
  }

  function hasFullLine(board,size){
    for(let y=0;y<size;y++){
      let full=true;for(let x=0;x<size;x++)if(!board[y][x]){full=false;break;}
      if(full)return true;
    }
    for(let x=0;x<size;x++){
      let full=true;for(let y=0;y<size;y++)if(!board[y][x]){full=false;break;}
      if(full)return true;
    }
    return false;
  }

  function candidateOrder(preferred){
    const p=ALT.includes(preferred)?preferred:'V_UP';
    const sameAxis=p.startsWith('V')?(p==='V_UP'?'V_DOWN':'V_UP'):(p==='H_LEFT'?'H_RIGHT':'H_LEFT');
    const other=p.startsWith('V')?['H_LEFT','H_RIGHT']:['V_UP','V_DOWN'];
    const fallback={V_UP:'V_ALL_UP',V_DOWN:'V_ALL_DOWN',H_LEFT:'H_ALL_LEFT',H_RIGHT:'H_ALL_RIGHT'}[p];
    const fallbackOpp={V_UP:'V_ALL_DOWN',V_DOWN:'V_ALL_UP',H_LEFT:'H_ALL_RIGHT',H_RIGHT:'H_ALL_LEFT'}[p];
    return [p,sameAxis,...other,fallback,fallbackOpp];
  }

  function chooseSafePlan(board,preferred){
    for(const plan of candidateOrder(preferred)){
      const next=shifted(board,state.size,plan);
      if(!hasFullLine(next,state.size))return {plan,board:next};
    }
    /* Uniform whole-board translations preserve line fullness. On a valid SHIFT
       board this branch is only a corruption safeguard. */
    const plan='V_ALL_UP';
    return {plan,board:shifted(board,state.size,plan)};
  }

  function label(plan){return LABEL[plan]||LABEL.V_UP;}
  function guideDirection(){return document.querySelector('#shiftGuideV149 .shift-direction-v149');}
  function showPlan(plan,stable=false){
    const el=guideDirection();if(!el||!isShift())return;
    if(stable){el.textContent='NO SHIFT THIS ROUND';return;}
    const l=label(plan||state.shiftPattern);
    el.textContent=`${l.axis}  ${l.glyph}`;
  }

  function previewResult(){
    if(!isShift()||state.shiftRoundClearedV149||Number(state.shiftRoundMovesV149)!==2)return null;
    if(selectedPiece===null||!previewAnchor)return null;
    const shape=drag?.shape||state.tray?.[selectedPiece];
    if(!shape||!Core.canPlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.size))return null;
    const sim=Core.simulatePlace(state.board,shape,previewAnchor.x,previewAnchor.y,'SHIFT',state.size);
    if(!sim)return null;
    if(Array.isArray(sim.waves)&&sim.waves.length)return {stable:true,plan:null};
    return {stable:false,...chooseSafePlan(sim.board,state.shiftPattern)};
  }

  updatePreview=function(){
    const out=previousUpdatePreview();
    const r=previewResult();
    if(r)showPlan(r.plan,r.stable);
    return out;
  };

  clearPreview=function(){
    const out=previousClearPreview();
    if(isShift())showPlan(state.shiftPattern,!!state.shiftRoundClearedV149);
    return out;
  };

  function nextPattern(prev){
    const pool=ALT.filter(p=>p!==prev);
    return pool[Math.floor(Math.random()*pool.length)]||'V_UP';
  }

  function resetRound(next){
    state.shiftRoundMovesV149=0;
    state.shiftRoundClearedV149=false;
    state.shiftRoundResultV149='';
    state.shiftSafeVersion=151;
    state.shiftPattern=next;
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

  /* Replace only the SHIFT round resolver. v1.4.9 still owns placement, scoring,
     and STABLE detection; this removes its post-wave scan that could reward luck. */
  completeTray=function(){
    if(!isShift())return previousCompleteTray();

    const preferred=ALT.includes(state.shiftPattern)?state.shiftPattern:'V_UP';

    if(state.shiftRoundClearedV149){
      state.shiftRoundResultV149='STABLE';
      requestSound('sequenceWin');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),440);
      announce('STABLE  •  NO SHIFT',true);
    }else{
      const safe=chooseSafePlan(state.board,preferred);
      state.shiftRoundResultV149='SHIFT';
      state.shiftLastAppliedV151=safe.plan;
      state.board=safe.board;
      boardEl.dataset.waveFx=safe.plan;
      boardEl.classList.remove('wave-shift-v131');void boardEl.offsetWidth;boardEl.classList.add('wave-shift-v131');
      setTimeout(()=>{boardEl.classList.remove('wave-shift-v131');delete boardEl.dataset.waveFx;},440);
      requestSound('shift');
      announce('SHIFT',false);
      /* Intentionally NO line scan here. chooseSafePlan guarantees the shift
         itself cannot create a completed row/column. */
    }

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
    resetRound(nextPattern(preferred));
  };

  queueMicrotask(()=>{try{if(isShift())showPlan(state.shiftPattern,!!state.shiftRoundClearedV149);}catch(_){ }});
})();
