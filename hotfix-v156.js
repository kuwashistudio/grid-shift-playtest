/* GRID SHIFT v1.5.6 — remove retired BUILD wrappers and force one clean migration.
   index.html no longer loads v1.5.3/v1.5.4. This tiny layer only resets the
   BUILD opening once so saves touched by the broken wrappers cannot skip it.
*/
(function(){
  'use strict';

  const VERSION=156;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;

  function isShift(){return state?.mode==='SHIFT'&&state?.shiftRulesVersion===149;}

  function resetBuildOpening(force=false){
    if(!isShift())return;
    if(!force&&state.shiftBuildFixVersionV156===VERSION)return;

    state.shiftBuildFixVersionV156=VERSION;
    state.shiftBuildVersionV155=155;
    state.shiftBuildRoundV155=0;
    state.shiftLiveIntroV155=false;
    state.shiftRoundMovesV149=0;
    state.shiftRoundClearedV149=false;
    state.shiftRoundResultV149='';

    /* Start at the boundary of BUILD 1/2 even if the old build left a partial tray.
       Preserve board, score and best; only refresh the current three-piece tray. */
    state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);

    renderAll();
    scheduleSave(true);
  }

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(isShift())resetBuildOpening(false);
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(isShift()){
      state.shiftBuildFixVersionV156=VERSION;
      state.shiftBuildVersionV155=155;
      state.shiftBuildRoundV155=0;
      state.shiftLiveIntroV155=false;
      state.shiftRoundMovesV149=0;
      state.shiftRoundClearedV149=false;
      renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{if(isShift())resetBuildOpening(false);}catch(_){ }
  });
})();
