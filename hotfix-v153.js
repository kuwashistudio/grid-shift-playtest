/* GRID SHIFT v1.5.3 — SHIFT opening BUILD PHASE.
   - Rounds 1–2 (first 6 placements) are neutral BUILD rounds.
   - They always end in PACK SHIFT, even if the player happens to clear a line.
   - Normal CLEAR -> STABLE rules begin on round 3.
   - Opening UI teaches PACK first, then introduces CLEAR = STABLE when it becomes fair.
*/
(function(){
  'use strict';

  const VERSION=153;
  const BUILD_MOVES=6;
  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray;
  const previousRenderAll=renderAll;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;

  function isShift(){return state?.mode==='SHIFT'&&state?.shiftRulesVersion===149;}
  function openingBuild(){return isShift()&&(!!state.shiftBuildActiveV153 || (Number(state.moves)||0)<BUILD_MOVES);}
  function firstLiveRound(){const m=Number(state?.moves)||0;return isShift()&&m>=BUILD_MOVES&&m<BUILD_MOVES+3;}

  function guide(){return document.getElementById('shiftGuideV149');}
  function cleanDirectionText(text){
    return String(text||'')
      .replace(/^BUILD PHASE\s*•\s*/,'')
      .replace(/^CLEAR LINE = STABLE\s*•\s*/,'');
  }

  function ensureBuildLabel(){
    const g=guide();if(!g)return null;
    const rule=g.querySelector('.shift-rule-v149');if(!rule)return null;
    let el=rule.querySelector('.shift-build-label-v153');
    if(!el){
      el=document.createElement('span');
      el.className='shift-build-label-v153';
      el.textContent='BUILD';
      rule.insertBefore(el,rule.firstChild);
    }
    return el;
  }

  function syncBuildUI(){
    const g=guide();if(!g)return;
    const active=isShift();
    g.classList.remove('build-v153','first-live-v153');
    if(!active)return;

    const build=openingBuild();
    const liveIntro=!build&&firstLiveRound();
    const strong=g.querySelector('.shift-rule-v149>strong');
    const dir=g.querySelector('.shift-direction-v149');
    const label=ensureBuildLabel();

    if(build){
      g.classList.add('build-v153');
      g.classList.remove('stable-v149','last-move-v150','preview-stable-v150');
      boardEl?.classList.remove('shift-next-v150','shift-preview-stable-v150');
      if(strong)strong.textContent='PACK';
      if(label)label.hidden=false;
      if(dir){
        const base=cleanDirectionText(dir.textContent);
        dir.textContent=`BUILD PHASE  •  ${base}`;
      }
    }else{
      if(strong)strong.textContent='SHIFT';
      if(label)label.hidden=true;
      if(liveIntro){
        g.classList.add('first-live-v153');
        if(dir && dir.textContent!=='NO SHIFT THIS ROUND'){
          const base=cleanDirectionText(dir.textContent);
          dir.textContent=`CLEAR LINE = STABLE  •  ${base}`;
        }
      }
    }
  }

  /* Mark whether the move belongs to the opening six BEFORE v1.4.9 increments
     moves and possibly calls completeTray. This keeps move 6 inside BUILD. */
  tryPlace=function(idx,x,y){
    if(!isShift())return previousTryPlace(idx,x,y);
    state.shiftBuildVersion=VERSION;
    state.shiftBuildActiveV153=(Number(state.moves)||0)<BUILD_MOVES;
    const out=previousTryPlace(idx,x,y);
    if(isShift()){
      state.shiftBuildActiveV153=(Number(state.moves)||0)<BUILD_MOVES;
      syncBuildUI();
    }
    return out;
  };

  /* v1.5.2 already owns the PACK transform. During BUILD, temporarily suppress
     its STABLE flag so an early lucky clear never skips the teaching PACK event. */
  completeTray=function(){
    if(!isShift())return previousCompleteTray();
    const build=!!state.shiftBuildActiveV153 || (Number(state.moves)||0)<=BUILD_MOVES;
    if(build)state.shiftRoundClearedV149=false;

    const out=previousCompleteTray();

    state.shiftBuildVersion=VERSION;
    state.shiftBuildActiveV153=(Number(state.moves)||0)<BUILD_MOVES;
    if(build && (Number(state.moves)||0)>=BUILD_MOVES){
      state.shiftBuildJustEndedV153=true;
      announce('CLEAR LINE  →  STABLE',true);
    }
    syncBuildUI();
    return out;
  };

  renderAll=function(){
    const out=previousRenderAll();
    syncBuildUI();
    return out;
  };

  updatePreview=function(){
    const out=previousUpdatePreview();
    syncBuildUI();
    return out;
  };

  clearPreview=function(){
    const out=previousClearPreview();
    syncBuildUI();
    return out;
  };

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(isShift()){
      state.shiftBuildVersion=VERSION;
      state.shiftBuildActiveV153=(Number(state.moves)||0)<BUILD_MOVES;
      syncBuildUI();
      scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(isShift()){
      state.shiftBuildVersion=VERSION;
      state.shiftBuildActiveV153=true;
      state.shiftBuildJustEndedV153=false;
      renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{
      if(isShift()){
        state.shiftBuildVersion=VERSION;
        state.shiftBuildActiveV153=(Number(state.moves)||0)<BUILD_MOVES;
      }
      syncBuildUI();
    }catch(_){ }
  });
})();
