/* GRID SHIFT v1.6.3 — Safari-proof tray centering.
   Do not rely on CSS translate/grid centering for tray artwork. After every tray
   render, measure the actual rendered boxes and pin both the piece and rotation
   affordance to the same pixel center of their slot. */
(function(){
  'use strict';

  const VERSION=163;
  const previousRenderTray=renderTray;

  function pinCentered(el,wrap){
    if(!el||!wrap)return;
    const ww=wrap.clientWidth,wh=wrap.clientHeight;
    const ew=el.offsetWidth,eh=el.offsetHeight;
    if(!ww||!wh||!ew||!eh)return;
    el.style.setProperty('position','absolute','important');
    el.style.setProperty('left',`${(ww-ew)/2}px`,'important');
    el.style.setProperty('top',`${(wh-eh)/2}px`,'important');
    el.style.setProperty('right','auto','important');
    el.style.setProperty('bottom','auto','important');
    el.style.setProperty('margin','0','important');
    el.style.setProperty('translate','none','important');
  }

  function centerTrayNow(){
    if(!trayEl)return;
    trayEl.querySelectorAll('.piece-wrap').forEach(wrap=>{
      wrap.style.setProperty('position','relative','important');
      const art=wrap.querySelector(':scope > .piece-art.tray');
      const rot=wrap.querySelector(':scope > .rotate-affordance');
      pinCentered(art,wrap);
      pinCentered(rot,wrap);
    });
  }

  renderTray=function(){
    const out=previousRenderTray();
    centerTrayNow();
    requestAnimationFrame(centerTrayNow);
    return out;
  };

  window.addEventListener('resize',()=>requestAnimationFrame(centerTrayNow),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(centerTrayNow,120),{passive:true});

  queueMicrotask(()=>{
    try{
      if(state)state.trayCenterVersionV163=VERSION;
      centerTrayNow();
      requestAnimationFrame(centerTrayNow);
    }catch(_){ }
  });
})();
