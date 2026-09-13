/* GRID SHIFT v1.3.0 — SQUARES: square-only clears, 4x4 and larger */
(function(){
  'use strict';

  const baseScanClears=Core.scanClears;
  const baseSimulatePlace=Core.simulatePlace;
  const baseGenerateFairTray=Core.generateFairTray;

  function scanSquareClears(board,size){
    const accepted=[];
    const occupied=(x,y,side)=>{
      for(let yy=y;yy<y+side;yy++) for(let xx=x;xx<x+side;xx++) if(!board[yy][xx]) return false;
      return true;
    };

    /* Search largest-first. A smaller square fully contained in an already-found
       larger square is not double-counted. Same-size overlapping squares can combo. */
    for(let side=size;side>=4;side--){
      for(let y=0;y<=size-side;y++) for(let x=0;x<=size-side;x++){
        if(!occupied(x,y,side))continue;
        const contained=accepted.some(s=>x>=s.x&&y>=s.y&&x+side<=s.x+s.side&&y+side<=s.y+s.side);
        if(!contained)accepted.push({x,y,side});
      }
    }

    const set=new Set();
    accepted.forEach(s=>{
      for(let yy=s.y;yy<s.y+s.side;yy++) for(let xx=s.x;xx<s.x+s.side;xx++) set.add(`${xx},${yy}`);
    });
    return {
      rows:[],cols:[],
      squares:accepted.map(s=>[s.x,s.y,s.side]),
      units:accepted.length,
      cells:[...set].map(k=>k.split(',').map(Number))
    };
  }

  Core.scanClears=function(board,size,mode){
    if(mode==='SQUARES')return scanSquareClears(board,size);
    return baseScanClears(board,size,mode);
  };

  Core.simulatePlace=function(board,shape,x,y,mode,size){
    if(mode!=='SQUARES')return baseSimulatePlace(board,shape,x,y,mode,size);
    if(!Core.canPlace(board,shape,x,y,size))return null;
    const next=Core.cloneBoard(board);
    const placed=shape.cells.map(([dx,dy],i)=>[x+dx,y+dy,shape.cellColors?.[i]||shape.color||1]);
    placed.forEach(([xx,yy,color])=>next[yy][xx]=color);
    const clear=scanSquareClears(next,size),waves=[];
    if(clear.units){waves.push(clear);Core.clearCells(next,clear.cells);}
    return {board:next,placed:placed.map(([px,py])=>[px,py]),waves,stages:[]};
  };

  /* SQUARES-specific piece ecology.
     Strong: 2x2, 4-bars, L4/T4, 2x3 rectangle.
     Useful support: 3-bars, L3, Z.
     Powerful but intentionally rare: 3x3.
     5-bars / plus pieces are omitted because they fight the 4x4 target geometry. */
  const BASE_POOL=[
    ['sq2',10],['i4h',9],['l4a',8],['t4u',7],['rect6',5],
    ['i3h',6],['l3a',5],['z4h',4],['sq3',2]
  ];
  const RESCUE_POOL=[['i2h',3],['dot',1]];

  function weightedPick(pool,rng){
    let total=0;for(const [,w] of pool)total+=w;
    let n=rng()*total;
    for(const [id,w] of pool){n-=w;if(n<0)return id;}
    return pool[pool.length-1][0];
  }
  function squareShape(pool,rng){
    const id=weightedPick(pool,rng);
    let s=Core.deepClone(Core.SHAPE_BY_ID[id]);
    const turns=Math.floor(rng()*4);
    for(let i=0;i<turns;i++)s=Core.rotateShape(s);
    return s;
  }
  function traySolvable(board,tray,size,maxNodes=6500){
    let nodes=0;
    function dfs(b,remaining){
      if(!remaining.length)return true;
      if(++nodes>maxNodes)return false;
      const ordered=remaining.slice().sort((a,bx)=>tray[bx].cells.length-tray[a].cells.length);
      for(const idx of ordered){
        for(const shape of Core.modeRotations(tray[idx],'SQUARES')){
          const ps=Core.placements(b,shape,size);
          /* Sample enough placements for reliability without making iPhone generation expensive. */
          const step=ps.length>42?Math.ceil(ps.length/42):1;
          for(let p=0;p<ps.length;p+=step){
            const [x,y]=ps[p];
            const sim=Core.simulatePlace(b,shape,x,y,'SQUARES',size);
            if(!sim)continue;
            const rest=remaining.filter(v=>v!==idx);
            if(dfs(sim.board,rest))return true;
            if(nodes>maxNodes)return false;
          }
        }
      }
      return false;
    }
    return dfs(Core.cloneBoard(board),tray.map((_,i)=>i));
  }
  function generateSquareTray(board,size,rng=Math.random,moves=0){
    const fill=Core.boardFill(board);
    const pool=fill>=68?BASE_POOL.concat(RESCUE_POOL):BASE_POOL;
    let fallback=null;
    for(let attempt=0;attempt<34;attempt++){
      const tray=[squareShape(pool,rng),squareShape(pool,rng),squareShape(pool,rng)];
      const sq3s=tray.filter(p=>p.id==='sq3').length;
      if(sq3s>1)continue;
      if(fill<68&&tray.some(p=>p.cells.length<=2))continue;
      if(!tray.every(p=>Core.hasModePlacement(board,p,size,'SQUARES')))continue;
      fallback=fallback||tray;
      if(traySolvable(board,tray,size))return tray;
    }
    if(fallback)return fallback;
    const safe=['sq2','i4h','l4a'].map(id=>Core.deepClone(Core.SHAPE_BY_ID[id]));
    if(traySolvable(board,safe,size,12000))return safe;
    return fill>=68?
      [Core.deepClone(Core.SHAPE_BY_ID.i2h),Core.deepClone(Core.SHAPE_BY_ID.l3a),Core.deepClone(Core.SHAPE_BY_ID.sq2)]:
      safe;
  }

  Core.generateFairTray=function(board,mode,size,rng=Math.random,moves=0){
    if(mode==='SQUARES')return generateSquareTray(board,size,rng,moves);
    return baseGenerateFairTray(board,mode,size,rng,moves);
  };

  /* Update the selector demo so it teaches the new rule visually. */
  const baseModeDemoHTML=modeDemoHTML;
  modeDemoHTML=function(id){
    if(id!=='SQUARES')return baseModeDemoHTML(id);
    let cells='';
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){
      if(x===3&&y===0)continue;
      cells+=miniCell(x,y+1,'md-gold md-sq');
    }
    cells+=miniCell(3,1,'md-gold md-sq md-squarelast');
    return `<div class="mode-demo demo-squares demo-squares-v130"><div class="mini-board">${cells}<i class="square-outline square-outline-v130"></i></div></div>`;
  };

  const baseRenderModeStat=renderModeStat;
  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode==='SQUARES')modeStatEl.textContent='SQUARES  4×4+';
  };

  /* Rebuild the selector because app3 builds it before this hotfix loads. */
  queueMicrotask(()=>{
    try{
      buildMenu();
      renderMenu();
      renderModeStat();
      if(state?.mode==='SQUARES'&&state.tray?.length){
        state.tray=Core.generateFairTray(state.board,'SQUARES',state.size,Math.random,state.moves);
        renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();
