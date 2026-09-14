/* GRID SHIFT v1.6.8 — dock CHAIN GUIDE outside the board. */
(function(){
  'use strict';

  const previousRenderAll=renderAll;

  function ensureGuideDock(){
    const shell=document.querySelector('.game-shell');
    const boardWrap=document.querySelector('.board-wrap');
    const box=document.getElementById('gravityGuideSwitchV167');
    if(!shell||!boardWrap||!box)return;

    let dock=document.getElementById('gravityGuideDockV168');
    if(!dock){
      dock=document.createElement('div');
      dock.id='gravityGuideDockV168';
      dock.className='gravity-guide-dock-v168';
      shell.insertBefore(dock,boardWrap);
    }
    if(box.parentElement!==dock)dock.appendChild(box);
    dock.classList.toggle('visible-v168',state?.mode==='GRAVITY');
  }

  renderAll=function(){
    const out=previousRenderAll();
    ensureGuideDock();
    return out;
  };

  queueMicrotask(()=>{
    try{ensureGuideDock();}catch(_){ }
  });
})();
