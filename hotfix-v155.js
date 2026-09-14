/* GRID SHIFT v1.5.5 — authoritative SHIFT BUILD opening.
   v1.5.3/v1.5.4 are no longer loaded. This layer owns SHIFT placement during
   the opening so the first two complete trays are unambiguously BUILD rounds.
   BUILD rounds always PACK after piece 3; normal CLEAR -> STABLE begins after that.
*/
(function(){
  'use strict';

  const VERSION=155;
  const BUILD_ROUNDS=2;
  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray; // v1.5.2 resolver
  const previousRenderAll=renderAll;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;

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
    const label=g.querySelector('.shift-build-label-v153')||(()=>{
      const rule=g.querySelector('.shift-rule-v149');
      if(!rule)return null;
      const el=document.createElement('span');
      el.className='shift-build-label-v153';
      rule.insertBefore(el,rule.firstChild);
      return el;
    })();
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

  /* Authoritative SHIFT placement. This bypasses the retired v1.5.3/v1.5.4
     wrappers completely, so total historical move count cannot cancel BUILD. */
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
    sim.waves.forEach((wave,i)=>{
      totalUnits+=wave.units;
      totalCells+=wave.cells.length;
      queueFx('burst',{cells:wave.cells,wave:i});
    });
    if(totalUnits>0){
      /* During BUILD, clearing is still rewarded and removed normally, but it
         does NOT suppress the teaching PACK at the end of the tray. */
      if(!build)state.shiftRoundClearedV149=true;
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

  completeTray=function(){
    if(!isShift())return previousCompleteTray();
    initBuild(false);
    const build=inBuild();
    const before=buildRound();

    if(build)state.shiftRoundClearedV149=false;
    const out=previousCompleteTray();

    if(build){
      state.shiftBuildRoundV155=Math.min(BUILD_ROUNDS,before+1);
      if(state.shiftBuildRoundV155>=BUILD_ROUNDS){
        state.shiftLiveIntroV155=true;
        announce('CLEAR LINE  →  STABLE',true);
      }
    }else if(state.shiftLiveIntroV155){
      state.shiftLiveIntroV155=false;
    }
    return out;
  };

  renderAll=function(){
    const out=previousRenderAll();
    syncUI();
    return out;
  };

  updatePreview=function(){
    const out=previousUpdatePreview();
    syncUI();
    return out;
  };

  clearPreview=function(){
    const out=previousClearPreview();
    syncUI();
    return out;
  };

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
