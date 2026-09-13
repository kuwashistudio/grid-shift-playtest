/* GRID SHIFT v1.4.3 — readability pass
   1) Bomb fuse badges never sit across the carrier's silhouette. The fuse number is
      moved to an exterior edge of the marked cell so the underlying polyomino stays
      readable at a glance, both in the tray and while dragging.
   2) The active mode is always shown above the board. Context stats remain separate.
*/
(function(){
  'use strict';

  const previousMakePiece=makePiece;
  const previousRenderAll=renderAll;

  function bombBadgeDirection(shape){
    if(!shape||!Array.isArray(shape.cells)||!Array.isArray(shape.bombCell))return 'n';
    const [bx,by]=shape.bombCell;
    const occupied=new Set(shape.cells.map(([x,y])=>`${x},${y}`));
    const xs=shape.cells.map(c=>c[0]),ys=shape.cells.map(c=>c[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const free={
      n:!occupied.has(`${bx},${by-1}`),
      e:!occupied.has(`${bx+1},${by}`),
      s:!occupied.has(`${bx},${by+1}`),
      w:!occupied.has(`${bx-1},${by}`)
    };

    /* Prefer the true outside edge of the whole silhouette. This matters especially
       on L/T/U pieces where a centered fuse disk can make the shape look like a
       different piece. */
    if(by===minY&&free.n)return 'n';
    if(bx===maxX&&free.e)return 'e';
    if(bx===minX&&free.w)return 'w';
    if(by===maxY&&free.s)return 's';
    for(const d of ['n','e','w','s'])if(free[d])return d;
    return 'n';
  }

  makePiece=function(shape,role='tray',unit=null,gap=null){
    const art=previousMakePiece(shape,role,unit,gap);
    if(state?.mode==='BOMBS'&&Array.isArray(shape?.bombCell)){
      const [bx,by]=shape.bombCell;
      const idx=shape.cells.findIndex(([x,y])=>x===bx&&y===by);
      const block=art.querySelectorAll('.piece-block')[idx];
      if(block){
        block.classList.remove('bomb-badge-n-v143','bomb-badge-e-v143','bomb-badge-s-v143','bomb-badge-w-v143');
        block.classList.add(`bomb-badge-${bombBadgeDirection(shape)}-v143`);
      }
    }
    return art;
  };

  function ensureModeBadge(){
    let badge=document.getElementById('modeBadgeV143');
    if(badge)return badge;
    const shell=document.querySelector('.game-shell');
    const boardWrap=document.querySelector('.board-wrap');
    if(!shell||!boardWrap)return null;
    badge=document.createElement('div');
    badge.id='modeBadgeV143';
    badge.className='mode-badge-v143';
    badge.setAttribute('aria-live','polite');
    shell.insertBefore(badge,boardWrap);
    return badge;
  }

  function syncModeBadge(){
    const badge=ensureModeBadge();
    if(!badge||!state)return;
    const title=MODES[state.mode]?.title||state.mode||'';
    badge.textContent=`MODE  •  ${title}`;
    badge.dataset.mode=String(state.mode||'').toLowerCase();
  }

  renderAll=function(){
    const out=previousRenderAll();
    syncModeBadge();
    return out;
  };

  queueMicrotask(()=>{
    try{syncModeBadge();if(state)renderTray();}catch(_){ }
  });
})();
