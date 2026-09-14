/* GRID SHIFT v1.8.7 — Playgama submission hook.
   Request an interstitial only at the natural run-over break. Bridge enforces the
   platform-specific minimum interval; unsupported/mock platforms simply no-op. */
(function(){
  'use strict';
  const originalShowGameOver=window.showGameOver;
  if(typeof originalShowGameOver!=='function')return;
  window.showGameOver=function(reason){
    originalShowGameOver(reason);
    try{window.GridShiftPlatform?.showInterstitial?.('run_over');}catch(_){ }
  };
})();
