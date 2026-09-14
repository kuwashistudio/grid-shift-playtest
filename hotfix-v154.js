/* GRID SHIFT v1.5.4 — BUILD PHASE fix.
   v1.5.3 incorrectly keyed BUILD to state.moves, so an existing saved SHIFT run
   could skip the opening phase entirely. BUILD now has its own two-round counter.
   It works independently of total moves and is re-initialized once when upgrading.
*/
(function(){
  'use strict';

  const VERSION=154;
  const BUILD_ROUNDS=2;
  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray;
  const previousRenderAll=renderAll;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;

  function isShift(){return state?.mode==='SHIFT'&&state?.shiftRulesVersion===149;}
  function rounds(){return Math.max(0,Math.min(BUILD_ROUNDS,Number(state?.shiftBuildRoundsV154)||0));}
  function inBuild(){return isShift()&&rounds()<BUILD_ROUNDS;}

  function ensureState(migrate=false){
    if(!isShift())return;
    if(state.shiftBuildVersionV154!==VERSION){
      state.shiftBuildVersionV154=VERSION;
      state.shiftBuildRoundsV154=0;
      state.shiftBuildActiveV153=true;
      state.shiftLiveIntroV154=false;
      /* Existing saves may already be many moves into a run. Do not wipe the board
         or score; simply teach BUILD for the next two complete trays. */
      if(migrate && state.tray?.every(p=>p===null)){
        state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);
      }
    }
    state.shiftBuildRoundsV154=rounds();
    state.shiftBuildActiveV153=inBuild();
  }

  function baseDirectionText(){
    const el=document.querySelector('#shiftGuideV149 .shift-direction-v149');
    if(!el)return '';
    return String(el.textContent||'')
      .replace(/^BUILD PHASE\s*•\s*/,'')
      .replace(/^CLEAR LINE = STABLE\s*•\s*/,'');
  }

  function syncUI(){
    const g=document.getElementById('shiftGuideV149');
    if(!g||!isShift())return;
    ensureState(false);

    const build=inBuild();
    const strong=g.querySelector('.shift-rule-v149>strong');
    const dir=g.querySelector('.shift-direction-v149');
    const label=g.querySelector('.shift-build-label-v153');

    g.classList.toggle('build-v153',build);
    g.classList.toggle('build-v154',build);
    g.classList.toggle('first-live-v154',!build&&!!state.shiftLiveIntroV154);

    if(build){
      g.classList.remove('stable-v149','last-move-v150','preview-stable-v150','first-live-v153');
      boardEl?.classList.remove('shift-next-v150','shift-preview-stable-v150');
      if(label){label.hidden=false;label.textContent=`BUILD ${rounds()+1}/${BUILD_ROUNDS}`;}
      if(strong)strong.textContent='PACK';
      if(dir){
        const base=baseDirectionText();
        dir.textContent=`BUILD PHASE  •  ${base}`;
      }
    }else{
      if(label)label.hidden=true;
      if(strong)strong.textContent='SHIFT';
      if(state.shiftLiveIntroV154&&dir&&dir.textContent!=='NO SHIFT THIS ROUND'){
        const base=baseDirectionText();
        dir.textContent=`CLEAR LINE = STABLE  •  ${base}`;
      }
    }
  }

  tryPlace=function(idx,x,y){
    if(!isShift())return previousTryPlace(idx,x,y);
    ensureState(false);
    /* v1.5.3 still exists underneath and looks at this compatibility flag. */
    state.shiftBuildActiveV153=inBuild();
    const out=previousTryPlace(idx,x,y);
    if(isShift()){
      state.shiftBuildActiveV153=inBuild();
      syncUI();
    }
    return out;
  };

  completeTray=function(){
    if(!isShift())return previousCompleteTray();
    ensureState(false);
    const build=inBuild();
    const before=rounds();

    if(build){
      /* BUILD always PACKs. A lucky line clear is still scored/removed, but it
         does not turn the round into STABLE. */
      state.shiftBuildActiveV153=true;
      state.shiftRoundClearedV149=false;
    }

    /* v1.5.3 announces the live rule based on total moves. Suppress that stale
       announcement after BUILD round 1; allow the handoff only after round 2. */
    const realAnnounce=announce;
    if(build&&before===0){
      announce=function(msg,strong){
        if(String(msg).includes('CLEAR LINE')&&String(msg).includes('STABLE'))return;
        return realAnnounce(msg,strong);
      };
    }

    let out;
    try{out=previousCompleteTray();}
    finally{announce=realAnnounce;}

    if(build){
      state.shiftBuildRoundsV154=Math.min(BUILD_ROUNDS,before+1);
      if(state.shiftBuildRoundsV154>=BUILD_ROUNDS){
        state.shiftBuildActiveV153=false;
        state.shiftLiveIntroV154=true;
        /* Explicit handoff, independent of total move count. */
        realAnnounce('CLEAR LINE  →  STABLE',true);
      }else{
        state.shiftBuildActiveV153=true;
      }
    }else if(state.shiftLiveIntroV154){
      /* The first normal round has now been completed. */
      state.shiftLiveIntroV154=false;
    }

    syncUI();
    return out;
  };

  renderAll=function(){
    if(isShift()){ensureState(false);state.shiftBuildActiveV153=inBuild();}
    const out=previousRenderAll();
    syncUI();
    return out;
  };

  updatePreview=function(){
    if(isShift()){ensureState(false);state.shiftBuildActiveV153=inBuild();}
    const out=previousUpdatePreview();
    syncUI();
    return out;
  };

  clearPreview=function(){
    if(isShift()){ensureState(false);state.shiftBuildActiveV153=inBuild();}
    const out=previousClearPreview();
    syncUI();
    return out;
  };

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(isShift()){
      ensureState(true);
      state.shiftBuildActiveV153=inBuild();
      renderAll();scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(isShift()){
      state.shiftBuildVersionV154=VERSION;
      state.shiftBuildRoundsV154=0;
      state.shiftBuildActiveV153=true;
      state.shiftLiveIntroV154=false;
      renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{
      if(isShift()){
        ensureState(true);
        state.shiftBuildActiveV153=inBuild();
        renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();
