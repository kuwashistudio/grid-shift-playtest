/* GRID SHIFT v1.7.6 — settle tray geometry after asynchronous refill/layout.
   iPhone Safari can report an unstable tray slot size on the first paint after a
   three-piece refill (especially BOMBS with disabled support pieces). v1.6.4
   already fixes the geometry when measurements are ready; this pass repeats that
   same authoritative positioning across the next few layout opportunities without
   rebuilding the tray or changing gameplay. */
(function(){
  'use strict';

  const previousRenderTray=renderTray;
  let repairSerial=0;
  let repairTimers=[];

  function geometry(shape){
    const [w,h]=Core.shapeDims(shape);
    const u=trayUnit(shape),g=4;
    return {width:w*u+(w-1)*g,height:h*u+(h-1)*g};
  }

  function repairOne(wrap,shape){
    if(!wrap||!shape)return false;
    const art=wrap.querySelector(':scope > .piece-art.tray');
    const rot=wrap.querySelector(':scope > .rotate-affordance');
    const ww=wrap.clientWidth,wh=wrap.clientHeight;
    if(!ww||!wh)return false;

    const geo=geometry(shape);
    wrap.style.setProperty('position','relative','important');

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
      art.style.setProperty('grid-template-columns','none','important');
      art.style.setProperty('grid-template-rows','none','important');
      art.style.setProperty('align-items','initial','important');
      art.style.setProperty('justify-items','initial','important');
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
    return true;
  }

  function repairNow(token){
    if(token!==repairSerial||!trayEl||!state?.tray)return;
    trayEl.querySelectorAll(':scope > .piece-wrap').forEach(wrap=>{
      const idx=Number(wrap.dataset.idx);
      const shape=state.tray[idx];
      if(shape)repairOne(wrap,shape);
    });
  }

  function scheduleRepairs(){
    const token=++repairSerial;
    repairTimers.forEach(clearTimeout);repairTimers=[];

    requestAnimationFrame(()=>{
      repairNow(token);
      requestAnimationFrame(()=>repairNow(token));
    });

    for(const delay of [48,120,260]){
      repairTimers.push(setTimeout(()=>repairNow(token),delay));
    }
  }

  renderTray=function(){
    const out=previousRenderTray();
    scheduleRepairs();
    return out;
  };

  /* A tray refill replaces all three children at once. Observe that exact DOM
     event so Safari gets another geometry pass even when no further game render
     occurs immediately afterwards. Styling changes made by repairNow are ignored. */
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'))scheduleRepairs();
  });
  observer.observe(trayEl,{childList:true});

  if(window.ResizeObserver){
    const ro=new ResizeObserver(()=>scheduleRepairs());
    ro.observe(trayEl);
  }

  window.addEventListener('pageshow',scheduleRepairs,{passive:true});
  window.addEventListener('resize',scheduleRepairs,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(scheduleRepairs,120),{passive:true});

  queueMicrotask(scheduleRepairs);
})();
