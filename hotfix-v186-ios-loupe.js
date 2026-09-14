/* GRID SHIFT v1.8.6 QA r2 — suppress native Safari loupe gestures on the
   direct-manipulation game surface. In addition to ordinary long-press blocking,
   explicitly cancel the browser default for a rapid second touch near the first.
   GRID SHIFT uses Pointer Events for gameplay, so this only removes Safari's
   double-tap / double-tap-hold browser gesture. */
(function(){
  'use strict';
  let lastTouchEnd=0;
  let lastX=0,lastY=0;

  function inGameSurface(target){
    return !!target?.closest?.('#app,.game-shell,.board-wrap,#board,.tray-zone,#tray,.piece-wrap,.piece-art,.piece-block,.rotate-affordance,.cell,.drag-ghost');
  }

  for(const type of ['contextmenu','selectstart','dragstart','dblclick']){
    document.addEventListener(type,e=>{
      if(inGameSurface(e.target))e.preventDefault();
    },{capture:true});
  }

  document.addEventListener('touchstart',e=>{
    if(!inGameSurface(e.target)||!e.touches)return;
    if(e.touches.length>1){e.preventDefault();return;}

    const t=e.touches[0],now=performance.now();
    const dt=now-lastTouchEnd;
    const dx=t.clientX-lastX,dy=t.clientY-lastY;
    /* Safari's remaining loupe path is a second touch held after a quick first tap.
       Cancel only that native default, and only when the taps are spatially close. */
    if(dt>0&&dt<430&&(dx*dx+dy*dy)<1600)e.preventDefault();
  },{capture:true,passive:false});

  document.addEventListener('touchend',e=>{
    if(!inGameSurface(e.target)||!e.changedTouches?.length)return;
    const t=e.changedTouches[e.changedTouches.length-1];
    lastTouchEnd=performance.now();lastX=t.clientX;lastY=t.clientY;
  },{capture:true,passive:true});
})();
