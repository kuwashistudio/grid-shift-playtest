/* FUSE FALL — Playgama Bridge adapter. Keeps the prototype platform-neutral while the submission build vendors Bridge locally. */
(async function(){
  'use strict';
  if(!window.bridge || typeof window.bridge.initialize!=='function') return;
  let ready=false;
  let wasOver=false;
  try{
    await window.bridge.initialize();
    ready=true;
    try{ await window.bridge.platform.sendMessage('game_ready'); }catch(_){ }
    try{ await window.bridge.platform.sendMessage('gameplay_started'); }catch(_){ }
  }catch(err){
    console.warn('Playgama Bridge unavailable; local fallback active.',err);
    return;
  }

  async function interstitial(){
    if(!ready) return;
    try{
      const ads=window.bridge.advertisement;
      if(!ads || !ads.isInterstitialSupported || typeof ads.showInterstitial!=='function') return;
      await ads.showInterstitial('run_over');
    }catch(_){ }
  }

  const overlay=document.getElementById('overlay');
  if(overlay){
    const sync=async()=>{
      const isOver=overlay.classList.contains('show');
      if(isOver && !wasOver){
        wasOver=true;
        try{ await window.bridge.platform.sendMessage('gameplay_stopped'); }catch(_){ }
        await interstitial();
      }else if(!isOver && wasOver){
        wasOver=false;
        try{ await window.bridge.platform.sendMessage('gameplay_started'); }catch(_){ }
      }
    };
    new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class']});
  }
})();
