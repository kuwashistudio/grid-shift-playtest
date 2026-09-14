/* GRID SHIFT v1.6.9 — CHAIN GUIDE preserves the exact normal GRAVITY run. */
(function(){
  'use strict';

  const VERSION=169;
  let resumeState=null;
  let restoreToken=0;

  function cloneState(s){
    try{return Core.deepClone(s);}catch(_){return s?JSON.parse(JSON.stringify(s)):null;}
  }

  function guideBox(){return document.getElementById('gravityGuideSwitchV167');}
  function guideIsOn(toggle){
    const box=guideBox();
    return toggle?.getAttribute('aria-checked')==='true' || !!box?.classList.contains('on-v167');
  }

  function cleanTransientUi(){
    try{drag?.ghost?.remove?.();}catch(_){ }
    drag=null;
    selectedPiece=null;
    previewAnchor=null;
    resolving=false;
    endingRun=false;
    clearPreview?.();
    boardEl?.classList.remove(
      'gravity-guide-miss-v167','gravity-chain-charge-v167','gravity-chain-impact-v167',
      'gravity-chain-apex-v167','gravity-settle'
    );
    boardEl?.parentElement?.querySelectorAll('.gravity-chain-layer-v167,.gravity-chain-layer-v162,.gravity-chain-layer-v158').forEach(el=>el.remove());
  }

  function restoreNormalRun(snapshot,token){
    if(!snapshot || token!==restoreToken)return;
    state=cloneState(snapshot);
    if(!state)return;
    delete state.gravityGuideActiveV167;
    delete state.gravityGuideActiveV166;
    state.gravityGuideResumeVersionV169=VERSION;
    cleanTransientUi();
    renderAll();
    scheduleSave(true);
    /* v1.6.7 briefly saves its temporary fresh run while switching GUIDE off.
       Save the restored state once more after that write has had time to settle. */
    setTimeout(()=>{
      if(token!==restoreToken || state?.mode!=='GRAVITY')return;
      const toggle=document.querySelector('.gravity-guide-slider-v167');
      if(toggle && guideIsOn(toggle))return;
      scheduleSave(true);
    },320);
  }

  /* Capture before the v1.6.7 switch handler runs. On GUIDE OFF, let its handler
     finish so its private guideActive flag becomes false, then restore before the
     browser's next paint. */
  document.addEventListener('click',e=>{
    const toggle=e.target?.closest?.('.gravity-guide-slider-v167');
    if(!toggle || state?.mode!=='GRAVITY')return;

    const wasOn=guideIsOn(toggle);
    if(!wasOn){
      resumeState=cloneState(state);
      if(resumeState){
        delete resumeState.gravityGuideActiveV167;
        delete resumeState.gravityGuideActiveV166;
      }
      restoreToken++;
      return;
    }

    if(resumeState){
      const snapshot=cloneState(resumeState);
      const token=++restoreToken;
      queueMicrotask(()=>restoreNormalRun(snapshot,token));
    }
  },true);

  queueMicrotask(()=>{
    try{if(state?.mode==='GRAVITY')state.gravityGuideResumeVersionV169=VERSION;}catch(_){ }
  });
})();
