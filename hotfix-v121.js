/* GRID SHIFT v1.2.1 — RUSH drag/spawn race fix */
(function(){
  'use strict';

  /*
    RUSH changes the board by rebuilding the grid when a warning starts or a
    pressure block is spawned. Rebuilding while a pointer drag is in progress
    invalidates the drag's cached cell geometry / DOM references and can leave
    duplicate-looking ghosts. Never mutate/re-render the RUSH board mid-drag.
    The timer is still allowed to expire; the pending action runs on the first
    animation frame after the player releases the piece.
  */
  const beginRushWarningV11=beginRushWarning;
  beginRushWarning=function(){
    if(drag?.active)return false;
    return beginRushWarningV11();
  };

  const finalizeRushSpawnV11=finalizeRushSpawn;
  finalizeRushSpawn=function(){
    if(drag?.active)return false;
    return finalizeRushSpawnV11();
  };
})();
