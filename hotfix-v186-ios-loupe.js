/* GRID SHIFT v1.8.6 QA — suppress native Safari long-press selection/callout
   on the direct-manipulation game surface without changing gameplay handlers. */
(function(){
  'use strict';
  function inGameSurface(target){
    return !!target?.closest?.('#app,.game-shell,.board-wrap,#board,.tray-zone,#tray,.piece-wrap,.piece-art,.piece-block,.rotate-affordance,.cell,.drag-ghost');
  }
  for(const type of ['contextmenu','selectstart','dragstart']){
    document.addEventListener(type,e=>{
      if(inGameSurface(e.target))e.preventDefault();
    },{capture:true});
  }
  document.addEventListener('touchstart',e=>{
    if(inGameSurface(e.target) && e.touches && e.touches.length>1)e.preventDefault();
  },{capture:true,passive:false});
})();
