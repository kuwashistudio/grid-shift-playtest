/* GRID SHIFT v1.6.4 — fix tray artwork geometry at the source.
   Root cause: piece artwork intentionally has class `tray` (role name), while
   v1.5.9 also used `.tray { width:100%!important; ... }` for the outer tray.
   That forced every piece-art to the full slot width, so its visible blocks sat
   on the left while the rotate affordance remained centered. Reassert the real
   shape box with !important dimensions, then center both elements from that box.
*/
(function(){
  'use strict';

  const VERSION=164;
  const previousMakePiece=makePiece;
  const previousRenderTray=renderTray;

  function trayGeometry(shape){
    const [w,h]=Core.shapeDims(shape);
    const u=trayUnit(shape),g=4;
    return {w,h,u,g,width:w*u+(w-1)*g,height:h*u+(h-1)*g};
  }

  makePiece=function(shape,role='tray',unit=null,gap=null){
    const art=previousMakePiece(shape,role,unit,gap);
    if(role==='tray'&&shape){
      const geo=trayGeometry(shape);
      art.classList.add('tray-art-v164');
      art.style.setProperty('width',`${geo.width}px`,'important');
      art.style.setProperty('height',`${geo.height}px`,'important');
      art.style.setProperty('display','block','important');
      art.style.setProperty('grid-template-columns','none','important');
      art.style.setProperty('grid-template-rows','none','important');
      art.style.setProperty('align-items','initial','important');
      art.style.setProperty('justify-items','initial','important');
    }
    return art;
  };

  function centerOne(wrap,shape){
    if(!wrap||!shape)return;
    const art=wrap.querySelector(':scope > .piece-art.tray');
    const rot=wrap.querySelector(':scope > .rotate-affordance');
    const geo=trayGeometry(shape);
    const ww=wrap.clientWidth,wh=wrap.clientHeight;
    if(!ww||!wh)return;

    if(art){
      art.classList.add('tray-art-v164');
      art.style.setProperty('width',`${geo.width}px`,'important');
      art.style.setProperty('height',`${geo.height}px`,'important');
      art.style.setProperty('display','block','important');
      art.style.setProperty('position','absolute','important');
      art.style.setProperty('left',`${(ww-geo.width)/2}px`,'important');
      art.style.setProperty('top',`${(wh-geo.height)/2}px`,'important');
      art.style.setProperty('right','auto','important');
      art.style.setProperty('bottom','auto','important');
      art.style.setProperty('margin','0','important');
      art.style.setProperty('translate','none','important');
    }

    if(rot){
      const rw=rot.offsetWidth||70,rh=rot.offsetHeight||70;
      rot.style.setProperty('position','absolute','important');
      rot.style.setProperty('left',`${(ww-rw)/2}px`,'important');
      rot.style.setProperty('top',`${(wh-rh)/2}px`,'important');
      rot.style.setProperty('right','auto','important');
      rot.style.setProperty('bottom','auto','important');
      rot.style.setProperty('margin','0','important');
      rot.style.setProperty('translate','none','important');
    }
  }

  function repairTray(){
    if(!trayEl||!state?.tray)return;
    trayEl.querySelectorAll(':scope > .piece-wrap').forEach(wrap=>{
      const idx=Number(wrap.dataset.idx);
      const shape=state.tray[idx];
      if(shape)centerOne(wrap,shape);
    });
  }

  renderTray=function(){
    const out=previousRenderTray();
    repairTray();
    requestAnimationFrame(repairTray);
    return out;
  };

  window.addEventListener('resize',()=>requestAnimationFrame(repairTray),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(repairTray,120),{passive:true});

  queueMicrotask(()=>{
    try{
      if(state)state.trayCenterVersionV164=VERSION;
      renderTray();
    }catch(_){ }
  });
})();
