/* GRID SHIFT v1.2.8 — suppress Safari long-press/loupe in gameplay */
(function(){
  'use strict';

  const playSurface=()=>document.querySelector('.game-shell');
  const shouldBlock=e=>{
    const surface=playSurface();
    const t=e.target;
    return !!(surface&&t&&surface.contains(t));
  };
  const block=e=>{
    if(shouldBlock(e)&&e.cancelable)e.preventDefault();
  };

  /* Pointer controls drive the game. Touch defaults are not needed on the
     gameplay surface and are what allow Safari's hold-selection/loupe UI. */
  document.addEventListener('touchstart',block,{capture:true,passive:false});
  document.addEventListener('touchmove',block,{capture:true,passive:false});
  document.addEventListener('contextmenu',block,{capture:true});
  document.addEventListener('selectstart',block,{capture:true});

  /* Keep the selector wording explicit even if older hotfix code creates the row. */
  function relabel(){
    document.querySelectorAll('.mode-best-v123').forEach(row=>{
      const label=row.querySelector('span');
      if(label)label.textContent='HIGH SCORE';
    });
  }
  const observer=new MutationObserver(relabel);
  const grid=document.getElementById('modeGrid');
  if(grid)observer.observe(grid,{childList:true,subtree:true});
  queueMicrotask(relabel);
})();
