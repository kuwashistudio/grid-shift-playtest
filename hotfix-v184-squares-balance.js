/* GRID SHIFT v1.8.4 QA r4 — SQUARES precision-piece balance.
   Preserve the proven v1.7.2 SQUARES tray generator for variety, then inject one
   precision piece into selected trays only when the resulting tray is still fair.
   This avoids the repetitive ecology produced by rebuilding all three pieces from
   a narrow custom pool, and makes 1-cell / 2-cell pieces visibly recur. */
(function(){
  'use strict';

  const previousGenerate=Core.generateFairTray;
  let squaresTraySeq=0;

  function solvable(board,tray,size,maxNodes=18000){
    let nodes=0;
    function dfs(b,remaining){
      if(!remaining.length)return true;
      if(++nodes>maxNodes)return false;
      const ordered=remaining.slice().sort((a,bx)=>tray[bx].cells.length-tray[a].cells.length);
      for(const idx of ordered){
        for(const shape of Core.modeRotations(tray[idx],'SQUARES')){
          const ps=Core.placements(b,shape,size),step=ps.length>56?Math.ceil(ps.length/56):1;
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

  function clonePrecision(id,rng){
    let s=Core.deepClone(Core.SHAPE_BY_ID[id]);
    if(id==='i2h'&&rng()<.5)s=Core.rotateShape(s);
    return s;
  }

  function componentPressure(board,size){
    const seen=new Set();
    let near=99;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const key=`${x},${y}`;
      if(!board[y][x]||seen.has(key))continue;
      const q=[[x,y]],cells=[];seen.add(key);
      let minX=x,maxX=x,minY=y,maxY=y;
      while(q.length){
        const [cx,cy]=q.pop();cells.push([cx,cy]);
        minX=Math.min(minX,cx);maxX=Math.max(maxX,cx);minY=Math.min(minY,cy);maxY=Math.max(maxY,cy);
        for(const [nx,ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]){
          const nk=`${nx},${ny}`;
          if(nx>=0&&ny>=0&&nx<size&&ny<size&&board[ny][nx]&&!seen.has(nk)){seen.add(nk);q.push([nx,ny]);}
        }
      }
      const side=Math.max(maxX-minX+1,maxY-minY+1);
      if(side>=4)near=Math.min(near,Math.max(0,side*side-cells.length));
    }
    return {fill:Core.boardFill(board),near};
  }

  function injectPrecision(board,base,size,rng,id){
    if(!Array.isArray(base)||base.length!==3)return base;
    const slots=[0,1,2];
    for(let i=slots.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
    for(const slot of slots){
      const tray=base.map(p=>p?Core.deepClone(p):p);
      tray[slot]=clonePrecision(id,rng);
      if(!tray.every(s=>s&&Core.hasModePlacement(board,s,size,'SQUARES')))continue;
      if(solvable(board,tray,size))return tray;
    }
    /* If the preferred precision size cannot coexist with this tray, try the other
       one before giving up. This makes the schedule robust without tailoring the
       piece to a particular hole. */
    const alt=id==='dot'?'i2h':'dot';
    for(const slot of slots){
      const tray=base.map(p=>p?Core.deepClone(p):p);
      tray[slot]=clonePrecision(alt,rng);
      if(!tray.every(s=>s&&Core.hasModePlacement(board,s,size,'SQUARES')))continue;
      if(solvable(board,tray,size))return tray;
    }
    return base;
  }

  Core.generateFairTray=function(board,mode,size,rng=Math.random,moves=0){
    if(mode!=='SQUARES')return previousGenerate(board,mode,size,rng,moves);

    const base=previousGenerate(board,'SQUARES',size,rng,moves);
    squaresTraySeq++;

    /* Keep the first tray natural. After that, two out of every three trays get a
       precision piece. Under real pressure every tray gets one. This removes long
       random droughts while still leaving ordinary trays between precision trays. */
    if(squaresTraySeq===1)return base;
    if(base?.some(s=>s&&s.cells.length<=2))return base;

    const p=componentPressure(board,size);
    const pressured=p.fill>=54||p.near<=3;
    const scheduled=(squaresTraySeq%3)!==0;
    if(!pressured&&!scheduled)return base;

    /* Dot is rarer: approximately one injected tray in four. Most precision help is
       the 2-cell piece, so completing a square still requires planning. */
    const id=(squaresTraySeq%4===0||p.near<=1)?'dot':'i2h';
    return injectPrecision(board,base,size,rng,id);
  };
})();
