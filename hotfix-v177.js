/* GRID SHIFT v1.7.7 — suppress iOS selection/loupe gestures without blocking touch drag. */
(function(){
  'use strict';

  function inGameUi(target){
    return !!target?.closest?.('#app,.overlay');
  }

  /* Prevent text/image selection and long-press context UI. Intentionally do NOT
     prevent touchstart/touchmove/pointermove; those are required by the game. */
  document.addEventListener('selectstart',e=>{
    if(inGameUi(e.target))e.preventDefault();
  },true);
  document.addEventListener('contextmenu',e=>{
    if(inGameUi(e.target))e.preventDefault();
  },true);
  document.addEventListener('dragstart',e=>{
    if(inGameUi(e.target))e.preventDefault();
  },true);
})();
