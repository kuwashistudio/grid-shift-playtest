/* GRID SHIFT v1.5.5 — authoritative SHIFT BUILD opening.
   v1.5.3/v1.5.4 may still be loaded underneath, but this layer bypasses their
   SHIFT placement and round resolution completely.
   - BUILD 1/2 and BUILD 2/2 are two real complete trays.
   - Both always end in PACK SHIFT.
   - From round 3 onward, CLEAR -> STABLE is active.
*/
(function(){
  'use strict';

  const VERSION=155;
  const BUILD_ROUNDS=2;
  const ALT=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray;
  const previousRenderAll=renderAll;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;
  let pendingPackFx=null;

  function isShift(){return state?.mode==='SHIFT'&&state?.shiftRulesVersion===149;}
  function buildRound(){return Math.max(0,Math.min(BUILD_ROUNDS,Number(state?.shiftBuildRoundV155)||0));}
  function inBuild(){return isShift()&&buildRound()<BUILD_ROUNDS;}

  function initBuild(forceFreshTray=false){
    if(!isShift())return;
    if(state.shiftBuildVersionV155===VERSION)return;
    state.shiftBuildVersionV155=VERSION;
    state.shiftBuildRoundV155=0;
    state.shiftLiveIntroV155=false;
    state.shiftRoundMovesV149=0;
    state.shiftRoundClearedV149=false;
    state.shiftRoundResultV149='';
    state.shiftBuildActiveV153=false;
    if(forceFreshTray||!Array.isArray(state.tray)||state.tray.filter(Boolean).length!==3){
      state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);
    }
  }

  function cleanDirection(text){
    return String(text||'')
      .replace(/^BUILD(?: PHASE)?(?: \d\/\d)?\s*[•·-]?\s*/,'')
      .replace(/^CLEAR LINE = STABLE\s*•\s*/,'');
  }

  function syncUI(){
    const g=document.getElementById('shiftGuideV149');
    if(!g||!isShift())return;
    initBuild(false);

    const build=inBuild();
    const rule=g.querySelector('.shift-rule-v149');
    let label=g.querySelector('.shift-build-label-v153');
    if(!label&&rule){
      label=document.createElement('span');
      label.className='shift-build-label-v153';
      rule.insertBefore(label,rule.firstChild);
    }
    const strong=g.querySelector('.shift-rule-v149>strong');
    const dir=g.querySelector('.shift-direction-v149');

    g.classList.remove('build-v153','build-v154','first-live-v153','first-live-v154','build-v155','first-live-v155');

    if(build){
      g.classList.add('build-v155');
      g.classList.remove('stable-v149','last-move-v150','preview-stable-v150');
      boardEl?.classList.remove('shift-next-v150','shift-preview-stable-v150');
      if(label){label.hidden=false;label.textContent=`BUILD ${buildRound()+1}/${BUILD_ROUNDS}`;}
      if(strong)strong.textContent='PACK';
      if(dir){
        const base=cleanDirection(dir.textContent);
        dir.textContent=`BUILD  •  ${base}`;
      }
    }else{
      if(label)label.hidden=true;
      if(strong)strong.textContent='SHIFT';
      if(state.shiftLiveIntroV155){
        g.classList.add('first-live-v155');
        if(dir&&dir.textContent!=='NO SHIFT THIS ROUND'){
          const base=cleanDirection(dir.textContent);
          dir.textContent=`CLEAR LINE = STABLE  •  ${base}`;
        }
      }
    }
  }

  function empty(size){return Core.emptyBoard(size);}

  function packBoard(board,size,plan){
    const out=empty(size),moves=[];
    if(plan==='V_UP'||plan==='V_DOWN'){
      const firstUp=plan==='V_UP';
      for(let x=0;x<size;x++){
        const up=(x%2===0)?firstUp:!firstUp;
        const items=[];
        for(let y=0;y<size;y++)if(board[y][x])items.push({v:board[y][x],sx:x,sy:y});
        const start=up?0:size-items.length;
        items.forEach((it,i)=>{const ty=start+i;out[ty][x]=it.v;moves.push({sx:it.sx,sy:it.sy,tx:x,ty});});
      }
      return {board:out,moves,plan,kind:'pack'};
    }
    if(plan==='H_LEFT'||plan==='H_RIGHT'){
      const firstLeft=plan==='H_LEFT';
      for(let y=0;y<size;y++){
        const left=(y%2===0)?firstLeft:!firstLeft;
        const items=[];
        for(let x=0;x<size;x++)if(board[y][x])items.push({v:board[y][x],sx:x,sy:y});
        const start=left?0:size-items.length;
        items.forEach((it,i)=>{const tx=start+i;out[y][tx]=it.v;moves.push({sx:it.sx,sy:it.sy,tx,ty:y});});
      }
      return {board:out,moves,plan,kind:'pack'};
    }
    return null;
  }

  function uniformBoard(board,size,plan){
    const out=empty(size),moves=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let tx=x,ty=y;
      if(plan==='V_ALL_UP')ty=(y-1+size)%size;
      else if(plan==='V_ALL_DOWN')ty=(y+1)%size;
      else if(plan==='H_ALL_LEFT')tx=(x-1+size)%size;
      else if(plan==='H_ALL_RIGHT')tx=(x+1)%size;
      out[ty][tx]=v;moves.push({sx:x,sy:y,tx,ty});
    }
    return {board:out,moves,plan,kind:'fallback'};
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
    const opposite=p==='V_UP'?'V_DOWN':p==='V_DOWN'?'V_UP':p==='H_LEFT'?'H_RIGHT':'H_LEFT';
    const other=p.startsWith('V')?['H_LEFT','H_RIGHT']:['V_UP','V_DOWN'];
    return [p,opposite,...other];
  }

  function fallbackPlan(preferred){
    if(preferred==='V_DOWN')return 'V_ALL_DOWN';
    if(preferred==='H_LEFT')return 'H_ALL_LEFT';
    if(preferred==='H_RIGHT')return 'H_ALL_RIGHT';
    return 'V_ALL_UP';
  }

  function choosePack(board,preferred){
    for(const plan of candidateOrder(preferred)){
      const result=packBoard(board,state.size,plan);
      if(result&&!hasFullLine(result.board,state.size))return result;
    }
    return uniformBoard(board,state.size,fallbackPlan(preferred));
  }

  function nextPattern(prev){
    const pool=ALT.filter(p=>p!==prev);
    return pool[Math.floor(Math.random()*pool.length)]||'V_UP';
  }

  function resetRound(next){
    state.shiftRoundMovesV149=0;
    state.shiftRoundClearedV149=false;
    state.shiftRoundResultV149='';
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

  function runPackFx(fx){
    if(!fx||!boardEl||!cellEls?.length)return;
    boardEl.classList.remove('shift-pack-board-v152');void boardEl.offsetWidth;boardEl.classList.add('shift-pack-board-v152');
    fx.moves.filter(m=>m.sx!==m.tx||m.sy!==m.ty).forEach((m,i)=>{
      const target=cellEls[m.ty]?.[m.tx],source=cellEls[m.sy]?.[m.sx];
      if(!target||!source)return;
      const dx=source.offsetLeft-target.offsetLeft,dy=source.offsetTop-target.offsetTop;
      target.style.setProperty('--pack-x',`${dx}px`);
      target.style.setProperty('--pack-y',`${dy}px`);
      target.style.setProperty('--pack-delay',`${Math.min(80,(i%10)*7)}ms`);
      target.classList.remove('shift-pack-cell-v152');void target.offsetWidth;target.classList.add('shift-pack-cell-v152');
      setTimeout(()=>{
        target.classList.remove('shift-pack-cell-v152');
        target.style.removeProperty('--pack-x');target.style.removeProperty('--pack-y');target.style.removeProperty('--pack-delay');
      },520);
    });
    setTimeout(()=>boardEl.classList.remove('shift-pack-board-v152'),540);
  }

  tryPlace=function(idx,x,y){
    if(!isShift())return previousTryPlace(idx,x,y);
    initBuild(false);
    if(state.gameOver||resolving)return false;

    const shape=state.tray[idx];
    if(!shape||!Core.canPlace(state.board,shape,x,y,state.size))return false;
    const sim=Core.simulatePlace(state.board,shape,x,y,'SHIFT',state.size);
    if(!sim)return false;

    const build=inBuild();
    state.board=sim.board;
    state.tray[idx]=null;
    state.moves++;
    state.shiftRoundMovesV149=Math.min(3,(Number(state.shiftRoundMovesV149)||0)+1);
    state.score+=shape.cells.length;
    state.lastPlaced=sim.placed.map(c=>c.slice());
    queueFx('placed',sim.placed);
    beep('place',shape.cells.length);

    let totalUnits=0,totalCells=0;
    sim.waves.forEach((wave,i)=>{totalUnits+=wave.units;totalCells+=wave.cells.length;queueFx('burst',{cells:wave.cells,wave:i});});
    if(totalUnits>0){
      if(!build)state.shiftRoundClearedV149=true;
      state.trayHadClear=true;
      const gain=scoreClear(totalUnits,totalCells,Math.max(0,sim.waves.length-1));
      state.score+=gain;
      announce(totalUnits>1?`${totalUnits} CLEAR  +${gain}`:`CLEAR  +${gain}`,totalUnits>1);
      beep(totalUnits>1?'multi':'clear');
    }

    if(state.tray.every(p=>p===null))completeTray();

    if(state.score>state.best)state.best=state.score;
    selectedPiece=null;previewAnchor=null;
    renderAll();scheduleSave();
    if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('NO MOVES');
    return true;
  };

  completeTray=function(){
    if(!isShift())return previousCompleteTray();
    initBuild(false);
    const build=inBuild();
    const before=buildRound();
    const preferred=ALT.includes(state.shiftPattern)?state.shiftPattern:'V_UP';

    if(!build&&state.shiftRoundClearedV149){
      state.shiftRoundResultV149='STABLE';
      requestSound('sequenceWin');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),440);
      announce('STABLE  •  NO SHIFT',true);
      pendingPackFx=null;
    }else{
      const result=choosePack(state.board,preferred);
      state.shiftRoundResultV149='SHIFT';
      state.shiftLastAppliedV155=result.plan;
      state.board=result.board;
      pendingPackFx={moves:result.moves,plan:result.plan,kind:result.kind};
      requestSound('shift');
      announce(build?`BUILD ${before+1}/${BUILD_ROUNDS}  •  PACK`:(result.kind==='pack'?'PACK SHIFT':'SHIFT'),false);
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

    if(build){
      state.shiftBuildRoundV155=Math.min(BUILD_ROUNDS,before+1);
      if(state.shiftBuildRoundV155>=BUILD_ROUNDS){
        state.shiftLiveIntroV155=true;
        announce('CLEAR LINE  →  STABLE',true);
      }
    }else if(state.shiftLiveIntroV155){
      state.shiftLiveIntroV155=false;
    }
  };

  renderAll=function(){
    const out=previousRenderAll();
    if(pendingPackFx&&isShift()){
      const fx=pendingPackFx;pendingPackFx=null;
      requestAnimationFrame(()=>runPackFx(fx));
    }
    syncUI();
    return out;
  };

  updatePreview=function(){const out=previousUpdatePreview();syncUI();return out;};
  clearPreview=function(){const out=previousClearPreview();syncUI();return out;};

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(isShift()){
      const upgrading=state.shiftBuildVersionV155!==VERSION;
      initBuild(upgrading);
      renderAll();scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(isShift()){
      state.shiftBuildVersionV155=VERSION;
      state.shiftBuildRoundV155=0;
      state.shiftLiveIntroV155=false;
      state.shiftRoundMovesV149=0;
      state.shiftRoundClearedV149=false;
      renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{
      if(isShift()){
        const upgrading=state.shiftBuildVersionV155!==VERSION;
        initBuild(upgrading);
        renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();
