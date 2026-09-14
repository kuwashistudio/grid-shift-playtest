/* GRID SHIFT v1.7.0 — CHAIN GUIDE exact resume, race-proof.
   Preserve the complete live GRAVITY run across a temporary guide visit.
   v1.6.7 creates a fresh run when GUIDE turns off; this patch restores the
   captured run after that handler and writes it back after any stale save. */
(function(){
  'use strict';

  const VERSION=170;
  let resumeState=null;
  let resumeSerial=0;

  function cloneState(s){
    if(!s)return null;
    try{return Core.deepClone(s);}catch(_){
      try{return JSON.parse(JSON.stringify(s));}catch(__){return null;}
    }
  }

  function toggleEl(){return document.querySelector('.gravity-guide-slider-v167');}
  function guideWasOn(toggle){return toggle?.getAttribute('aria-checked')==='true';}

  function stripGuideFlags(s){
    if(!s)return s;
    delete s.gravityGuideActiveV166;
    delete s.gravityGuideActiveV167;
    return s;
  }

  function saveSnapshotDirect(snapshot){
    if(!snapshot||snapshot.mode!=='GRAVITY')return;
    try{
      const clean=cloneState(snapshot);
      stripGuideFlags(clean);
      clean.gravityGuideResumeVersionV170=VERSION;
      Platform.set(slotKey('GRAVITY',clean.size||10),clean);
    }catch(_){ }
  }

  function clearTransient(){
    try{drag?.ghost?.remove?.();}catch(_){ }
    drag=null;
    selectedPiece=null;
    previewAnchor=null;
    resolving=false;
    endingRun=false;
    try{clearPreview();}catch(_){ }
    boardEl?.classList.remove(
      'gravity-guide-miss-v167','gravity-chain-charge-v167','gravity-chain-impact-v167',
      'gravity-chain-apex-v167','gravity-settle'
    );
    boardEl?.parentElement?.querySelectorAll(
      '.gravity-chain-layer-v167,.gravity-chain-layer-v162,.gravity-chain-layer-v158'
    ).forEach(el=>el.remove());
  }

  function restore(snapshot,serial,finalSave=false){
    if(!snapshot||serial!==resumeSerial)return;
    const toggle=toggleEl();
    /* Never overwrite the tutorial while the switch still says ON. */
    if(toggle?.getAttribute('aria-checked')==='true')return;

    const restored=cloneState(snapshot);
    if(!restored)return;
    stripGuideFlags(restored);
    restored.gravityGuideResumeVersionV170=VERSION;
    state=restored;
    clearTransient();
    renderAll();
    if(finalSave)saveSnapshotDirect(restored);
  }

  /* Use capture phase so we see the switch state BEFORE v1.6.7 changes it. */
  document.addEventListener('click',e=>{
    const toggle=e.target?.closest?.('.gravity-guide-slider-v167');
    if(!toggle||state?.mode!=='GRAVITY')return;

    const wasOn=guideWasOn(toggle);
    if(!wasOn){
      /* Entering GUIDE: freeze the exact current run, including current tray,
         score, moves, board, best-chain and all mode state. */
      const snap=stripGuideFlags(cloneState(state));
      if(!snap)return;
      snap.gravityGuideResumeVersionV170=VERSION;
      resumeState=snap;
      resumeSerial++;
      /* Flush this exact run immediately so even an app interruption is safe. */
      saveSnapshotDirect(snap);
      return;
    }

    /* Leaving GUIDE. Let v1.6.7 turn its private guideActive flag off first,
       then repeatedly restore across the short save/render race caused by its
       legacy stopGuide()->newRun() path. */
    if(!resumeState)return;
    const snap=cloneState(resumeState);
    const serial=++resumeSerial;

    queueMicrotask(()=>restore(snap,serial,false));
    requestAnimationFrame(()=>restore(snap,serial,false));
    setTimeout(()=>restore(snap,serial,false),40);
    setTimeout(()=>restore(snap,serial,true),180);
    setTimeout(()=>restore(snap,serial,true),520);
  },true);

  queueMicrotask(()=>{
    try{if(state?.mode==='GRAVITY')state.gravityGuideResumeVersionV170=VERSION;}catch(_){ }
  });
})();
