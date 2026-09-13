/* GRID SHIFT v1.2.6 — disable all legacy time-driven RUSH paths */
(function(){
  'use strict';

  beginRushWarning=function(){ return false; };
  finalizeRushSpawn=function(){ return false; };

  frame=function(now){
    lastFrame=now;
    timerFrame=requestAnimationFrame(frame);
  };

  function clearTimedRushState(){
    if(!state || state.mode!=='BLITZ')return;
    blitzArmed=false;
    state.blitzMs=0;
    if(!resolving) state.rushWarning=null;
  }

  const loadSlotV125=loadSlot;
  loadSlot=async function(mode,size){
    await loadSlotV125(mode,size);
    clearTimedRushState();
    if(state?.mode==='BLITZ'){ renderBoard(); scheduleSave(true); }
  };

  const newRunV125=newRun;
  newRun=function(keepBest=true){
    const out=newRunV125(keepBest);
    clearTimedRushState();
    return out;
  };

  queueMicrotask(()=>{ try{ clearTimedRushState(); }catch(_){ } });
})();
