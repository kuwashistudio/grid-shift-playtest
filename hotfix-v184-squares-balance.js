/* GRID SHIFT v1.8.4 QA r5 — SQUARES precision-piece balance.
   Keep the proven v1.7.2 tray ecology, but prevent the corner-camping loop where
   players can simply wait for guaranteed 1-cell / 2-cell pieces forever.

   r5 principles:
   - precision pieces are helpful but not scheduled every few trays;
   - chance rises with board pressure, not merely with elapsed trays;
   - after a large square clear, precision help cools down briefly;
   - a bounded dry-streak guard prevents the old "never appears" problem;
   - only one slot is ever replaced, so normal shape variety remains intact. */
(function(){
  'use strict';

  const previousGenerate=Core.generateFairTray;
  let dryTrays=0;
  let cooldownTrays=0;
  let lastFill=null;

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
    if(!Array.isArray(base)||base.length!==3)return null;
    const slots=[0,1,2];
    for(let i=slots.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
    const ids=id==='dot'?['dot','i2h']:['i2h','dot'];
    for(const precisionId of ids){
      for(const slot of slots){
        const tray=base.map(p=>p?Core.deepClone(p):p);
        tray[slot]=clonePrecision(precisionId,rng);
        if(!tray.every(s=>s&&Core.hasModePlacement(board,s,size,'SQUARES')))continue;
        if(solvable(board,tray,size))return tray;
      }
    }
    return null;
  }

  function precisionChance(p){
    /* Low-fill corner camping gets deliberately weak help. Precision becomes more
       available only once the board carries real structural risk. */
    let chance=p.fill<24?.10:p.fill<38?.18:p.fill<52?.28:p.fill<66?.40:.52;
    if(p.near<=2&&p.fill>=42)chance+=.06;
    return Math.min(.58,chance);
  }

  Core.generateFairTray=function(board,mode,size,rng=Math.random,moves=0){
    if(mode!=='SQUARES')return previousGenerate(board,mode,size,rng,moves);

    const base=previousGenerate(board,'SQUARES',size,rng,moves);
    const p=componentPressure(board,size);

    /* Detect a major clear between tray generations. A 4x4 clear removes 16 cells,
       so a double-digit percentage drop is a strong signal that the player just
       cashed out a square. Briefly remove precision assistance afterwards so the
       same corner cannot be farmed in a permanent loop. */
    if(lastFill!==null&&lastFill-p.fill>=10){
      cooldownTrays=2;
      dryTrays=0;
    }
    lastFill=p.fill;

    if(base?.some(s=>s&&s.cells.length<=2)){
      dryTrays=0;
      if(cooldownTrays>0)cooldownTrays--;
      return base;
    }

    if(cooldownTrays>0){
      cooldownTrays--;
      dryTrays++;
      return base;
    }

    dryTrays++;
    const forced=dryTrays>=5;
    if(!forced&&rng()>=precisionChance(p))return base;

    /* 2-cell remains the main precision tool. Dots are intentionally scarce so a
       nearly finished corner is not automatically cashable on demand. */
    const dotChance=p.fill>=58?.22:.12;
    const preferred=rng()<dotChance?'dot':'i2h';
    const injected=injectPrecision(board,base,size,rng,preferred);
    if(injected){
      dryTrays=0;
      return injected;
    }
    return base;
  };
})();
