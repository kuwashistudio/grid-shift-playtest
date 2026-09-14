/* GRID SHIFT v1.8.4 QA r3 — SQUARES precision-piece balance.
   Ensures 1-cell / 2-cell pieces actually appear often enough to support repeated
   PERFECT SQUARE completions without making every tray trivial. */
(function(){
  'use strict';

  const previousGenerate=Core.generateFairTray;

  function components(board,size){
    const seen=new Set(),out=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      if(!board[y][x]||seen.has(`${x},${y}`))continue;
      const q=[[x,y]],cells=[];seen.add(`${x},${y}`);
      let minX=x,maxX=x,minY=y,maxY=y;
      while(q.length){
        const [cx,cy]=q.pop();cells.push([cx,cy]);
        minX=Math.min(minX,cx);maxX=Math.max(maxX,cx);minY=Math.min(minY,cy);maxY=Math.max(maxY,cy);
        for(const [nx,ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]){
          const k=`${nx},${ny}`;
          if(nx>=0&&ny>=0&&nx<size&&ny<size&&board[ny][nx]&&!seen.has(k)){seen.add(k);q.push([nx,ny]);}
        }
      }
      out.push({cells,w:maxX-minX+1,h:maxY-minY+1});
    }
    return out;
  }

  function pressure(board,size){
    const fill=Core.boardFill(board),cs=components(board,size);
    let span=0,near=99;
    for(const c of cs){
      const side=Math.max(c.w,c.h);span=Math.max(span,side);
      if(side>=4)near=Math.min(near,Math.max(0,side*side-c.cells.length));
    }
    return {fill,span,near};
  }

  function pick(pool,rng){
    let total=0;for(const [,w] of pool)total+=w;
    let n=rng()*total,id=pool[0][0];
    for(const [candidate,w] of pool){n-=w;if(n<0){id=candidate;break;}}
    let s=Core.deepClone(Core.SHAPE_BY_ID[id]);
    for(let i=0,nTurns=Math.floor(rng()*4);i<nTurns;i++)s=Core.rotateShape(s);
    return s;
  }

  function solvable(board,tray,size,maxNodes=12000){
    let nodes=0;
    function dfs(b,remaining){
      if(!remaining.length)return true;
      if(++nodes>maxNodes)return false;
      const ordered=remaining.slice().sort((a,bx)=>tray[bx].cells.length-tray[a].cells.length);
      for(const idx of ordered){
        for(const shape of Core.modeRotations(tray[idx],'SQUARES')){
          const ps=Core.placements(b,shape,size),step=ps.length>48?Math.ceil(ps.length/48):1;
          for(let i=0;i<ps.length;i+=step){
            const [x,y]=ps[i],sim=Core.simulatePlace(b,shape,x,y,'SQUARES',size);
            if(!sim)continue;
            if(dfs(sim.board,remaining.filter(v=>v!==idx)))return true;
            if(nodes>maxNodes)return false;
          }
        }
      }
      return false;
    }
    return dfs(Core.cloneBoard(board),tray.map((_,i)=>i));
  }

  function normalPool(p){
    const pool=[['sq2',11],['i3h',10],['l3a',9],['i4h',8],['l4a',7],['t4u',5],['rect6',4],['z4h',3],['i5h',3],['sq3',1],['plus5',1]];
    if(p.span>=6)pool.push(['i3h',3],['l3a',3],['sq2',3],['i4h',2]);
    if(p.span>=8)pool.push(['i3h',2],['i4h',2],['l4a',2]);

    /* Stronger raw weighting than r2. */
    if(p.fill>=16)pool.push(['i2h',3]);
    if(p.fill>=28)pool.push(['i2h',4]);
    if(p.fill>=42)pool.push(['i2h',5],['dot',2]);
    if(p.fill>=56)pool.push(['i2h',6],['dot',3]);
    if(p.fill>=68)pool.push(['i2h',5],['dot',4]);
    if(p.near<=4&&p.fill>=24)pool.push(['i2h',5]);
    if(p.near<=2&&p.fill>=34)pool.push(['dot',3],['i2h',4]);
    return pool;
  }

  function precisionChance(p){
    let chance=p.fill<16?.18:p.fill<28?.34:p.fill<42?.52:p.fill<56?.68:p.fill<68?.80:.88;
    if(p.near<=4)chance+=.08;
    if(p.near<=2)chance+=.06;
    return Math.min(.94,chance);
  }

  function generate(board,size,rng=Math.random){
    const p=pressure(board,size),pool=normalPool(p);
    const wantPrecision=rng()<precisionChance(p);
    for(let attempt=0;attempt<72;attempt++){
      const tray=[pick(pool,rng),pick(pool,rng),pick(pool,rng)];
      const tiny=tray.filter(s=>s.cells.length<=2).length;
      const dots=tray.filter(s=>s.cells.length===1).length;
      if(dots>1)continue;
      if(tiny>(p.fill>=46?2:1))continue;
      /* Key r3 change: when this tray is selected to contain a precision piece,
         reject otherwise-valid trays that have none instead of merely hoping the
         weighted pool happens to draw one. */
      if(wantPrecision&&tiny===0)continue;
      if(!tray.every(s=>Core.hasModePlacement(board,s,size,'SQUARES')))continue;
      if(solvable(board,tray,size))return tray;
    }

    /* Precision-biased fallback. Still random and still requires a sequentially
       solvable three-piece tray. */
    const emergency=[['i2h',18],['dot',7],['i3h',8],['l3a',7],['sq2',7],['i4h',5],['l4a',4]];
    for(let attempt=0;attempt<140;attempt++){
      const tray=[pick(emergency,rng),pick(emergency,rng),pick(emergency,rng)];
      const tiny=tray.filter(s=>s.cells.length<=2).length;
      if(tray.filter(s=>s.cells.length===1).length>1)continue;
      if(tiny>2)continue;
      if(wantPrecision&&tiny===0)continue;
      if(!tray.every(s=>Core.hasModePlacement(board,s,size,'SQUARES')))continue;
      if(solvable(board,tray,size,18500))return tray;
    }

    return previousGenerate(board,'SQUARES',size,rng,0);
  }

  Core.generateFairTray=function(board,mode,size,rng=Math.random,moves=0){
    if(mode==='SQUARES')return generate(board,size,rng);
    return previousGenerate(board,mode,size,rng,moves);
  };
})();
