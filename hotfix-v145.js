/* GRID SHIFT v1.4.5 — robust fuse badge renderer
   Safari can clip pseudo-elements that are pushed outside a transformed block.
   Render the fuse as a sibling of the piece blocks instead, positioned relative
   to the whole piece-art. This keeps the carrier silhouette unobscured and makes
   the badge immune to the transformed block's paint box. */
(function(){
  'use strict';

  const previousMakePiece=makePiece;

  function badgeDirection(shape){
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
    if(by===minY&&free.n)return 'n';
    if(bx===maxX&&free.e)return 'e';
    if(by===maxY&&free.s)return 's';
    if(bx===minX&&free.w)return 'w';
    for(const d of ['n','e','s','w'])if(free[d])return d;
    return 'n';
  }

  makePiece=function(shape,role='tray',unit=null,gap=null){
    const art=previousMakePiece(shape,role,unit,gap);
    if(state?.mode!=='BOMBS'||!Array.isArray(shape?.bombCell))return art;

    const u=unit||trayUnit(shape),g=gap??4;
    const [bx,by]=shape.bombCell;
    const dir=badgeDirection(shape);
    const ghost=role==='ghost';
    const size=ghost?Math.max(17,Math.min(21,u*.62)):Math.max(12,Math.min(15,u*.64));
    const cx=bx*(u+g)+u/2;
    const cy=by*(u+g)+u/2;
    const step=u/2+size/2+(ghost?3:2);
    const delta={n:[0,-step],e:[step,0],s:[0,step],w:[-step,0]}[dir];

    const badge=document.createElement('b');
    badge.className=`bomb-fuse-badge-v145 bomb-fuse-${dir}-v145${ghost?' ghost':''}`;
    badge.textContent=String(shape.bombFuse||4);
    badge.style.left=`${cx+delta[0]}px`;
    badge.style.top=`${cy+delta[1]}px`;
    badge.style.width=`${size}px`;
    badge.style.height=`${size}px`;
    art.appendChild(badge);

    return art;
  };

  queueMicrotask(()=>{try{if(state?.mode==='BOMBS')renderTray();}catch(_){ }});
})();
