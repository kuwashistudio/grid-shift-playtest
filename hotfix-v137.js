/* GRID SHIFT v1.3.7 — slightly more finger clearance on touch drag */
(function(){
  'use strict';
  const previousDragLift=dragLift;
  dragLift=function(shape,pointerType){
    if(pointerType!=='touch')return previousDragLift(shape,pointerType);
    const [,h]=Core.shapeDims(shape);
    /* v1.3.6 used 64 + min(18,h*3). Move the piece 8px farther above the thumb. */
    return 72+Math.min(18,h*3);
  };
})();
