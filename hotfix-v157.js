/* GRID SHIFT v1.5.7 — BUILD means BUILD: no SHIFT for the first two trays.
   Rounds 1–2 exist only to put material on the board. After 6 placements,
   normal CLEAR -> STABLE / otherwise PACK SHIFT begins.
*/
(function(){
  'use strict';

  const VERSION=157;
  const BUILD_ROUNDS=2;
  const ALT=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const previousCompleteTray=completeTray;
  const previousRenderAll=renderAll;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;

  function isShift(){return state?.mode==='SHIFT'&&state?.shiftRulesVersion===149;}
  function round(){return Math.max(0,Math.min(BUILD_ROUNDS,Number(state?.shiftBuildRoundV155)||0));}
  function inBuild(){return isShift()&&round()<BUILD_ROUNDS;}
  function nextPattern(prev){
    const pool=ALT.filter(p=>p!==prev);
    return pool[Math.floor(Math.random()*pool.length)]||'V_UP';
  }

  function resetRoundState(){
    state.shiftRoundMovesV149=0;
    state.shiftRoundClearedV149=false;
    state.shiftRoundResultV149='';
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

  function resetBuildOnce(force=false){
    if(!isShift())return;
    if(!force&&state.shiftBuildFixVersionV157===VERSION)return;
    state.shiftBuildFixVersionV157=VERSION;
    state.shiftBuildVersionV155=155;
    state.shiftBuildRoundV155=0;
    state.shiftLiveIntroV155=false;
    resetRoundState();
    state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);
  }

  function syncBuildUI(){
    if(!isShift())return;
    const g=document.getElementById('shiftGuideV149');
    if(!g)return;
    const build=inBuild();
    g.classList.toggle('build-v157',build);
    if(!build)return;

    g.classList.remove('last-move-v150','preview-stable-v150','stable-v149','first-live-v155');
    boardEl?.classList.remove('shift-next-v150','shift-preview-stable-v150');

    let label=g.querySelector('.shift-build-label-v153');
    if(!label){
      const rule=g.querySelector('.shift-rule-v149');
      if(rule){
        label=document.createElement('span');
        label.className='shift-build-label-v153';
        rule.insertBefore(label,rule.firstChild);
      }
    }
    if(label){label.hidden=false;label.textContent=`BUILD ${round()+1}/${BUILD_ROUNDS}`;}
    const strong=g.querySelector('.shift-rule-v149>strong');
    if(strong)strong.textContent='NO SHIFT';
    const dir=g.querySelector('.shift-direction-v149');
    if(dir)dir.textContent='PLACE 3 PIECES';
  }

  /* During BUILD we deliberately do NOT call v1.5.2/v1.5.5's tray resolver,
     because that resolver performs PACK SHIFT. We only refill the tray and
     advance the opening counter. */
  completeTray=function(){
    if(!isShift()||!inBuild())return previousCompleteTray();

    const before=round();

    if(state.trayHadClear){
      state.chain++;
      const bonus=state.chain>=2?25*state.chain:0;
      if(bonus){
        state.score+=bonus;
        if(state.chain===3||state.chain===5||state.chain%10===0){
          announce(`CHAIN ${state.chain}  +${bonus}`,true);
          beep('chain');
          queueFx('chain',state.chain);
        }
      }
    }else state.chain=0;
    state.trayHadClear=false;

    const prevPattern=ALT.includes(state.shiftPattern)?state.shiftPattern:'V_UP';
    state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);
    state.shiftPattern=nextPattern(prevPattern);
    state.shiftBuildRoundV155=Math.min(BUILD_ROUNDS,before+1);
    resetRoundState();

    if(state.shiftBuildRoundV155<BUILD_ROUNDS){
      announce('BUILD 2/2  •  NO SHIFT',false);
    }else{
      state.shiftLiveIntroV155=true;
      announce('CLEAR LINE  →  STABLE',true);
    }
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
      resetBuildOnce(false);
      renderAll();
      scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(isShift()){
      state.shiftBuildFixVersionV157=VERSION;
      state.shiftBuildVersionV155=155;
      state.shiftBuildRoundV155=0;
      state.shiftLiveIntroV155=false;
      resetRoundState();
      renderAll();
      scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{
      if(isShift()){
        resetBuildOnce(false);
        renderAll();
        scheduleSave(true);
      }
    }catch(_){ }
  });
})();
