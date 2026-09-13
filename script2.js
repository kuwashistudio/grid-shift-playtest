
(function(global){
  'use strict';

  const SHAPES = [
    {id:'dot',  color:6, weight:7, cells:[[0,0]]},
    {id:'i2h',  color:1, weight:6, cells:[[0,0],[1,0]]}, {id:'i2v', color:1, weight:6, cells:[[0,0],[0,1]]},
    {id:'i3h',  color:1, weight:6, cells:[[0,0],[1,0],[2,0]]}, {id:'i3v', color:1, weight:6, cells:[[0,0],[0,1],[0,2]]},
    {id:'l3a',  color:3, weight:5, cells:[[0,0],[0,1],[1,1]]}, {id:'l3b', color:3, weight:5, cells:[[0,0],[1,0],[0,1]]},
    {id:'l3c',  color:3, weight:5, cells:[[0,0],[1,0],[1,1]]}, {id:'l3d', color:3, weight:5, cells:[[1,0],[0,1],[1,1]]},
    {id:'sq2',  color:2, weight:5, cells:[[0,0],[1,0],[0,1],[1,1]]},
    {id:'i4h',  color:1, weight:3, cells:[[0,0],[1,0],[2,0],[3,0]]}, {id:'i4v', color:1, weight:3, cells:[[0,0],[0,1],[0,2],[0,3]]},
    {id:'i5h',  color:1, weight:2, cells:[[0,0],[1,0],[2,0],[3,0],[4,0]]}, {id:'i5v', color:1, weight:2, cells:[[0,0],[0,1],[0,2],[0,3],[0,4]]},
    {id:'t4u',  color:4, weight:3, cells:[[0,0],[1,0],[2,0],[1,1]]}, {id:'t4d', color:4, weight:3, cells:[[1,0],[0,1],[1,1],[2,1]]},
    {id:'t4l',  color:4, weight:3, cells:[[0,0],[0,1],[1,1],[0,2]]}, {id:'t4r', color:4, weight:3, cells:[[1,0],[0,1],[1,1],[1,2]]},
    {id:'l4a',  color:3, weight:3, cells:[[0,0],[0,1],[0,2],[1,2]]}, {id:'l4b', color:3, weight:3, cells:[[0,0],[1,0],[2,0],[0,1]]},
    {id:'l4c',  color:3, weight:3, cells:[[0,0],[1,0],[1,1],[1,2]]}, {id:'l4d', color:3, weight:3, cells:[[2,0],[0,1],[1,1],[2,1]]},
    {id:'z4h',  color:5, weight:2, cells:[[0,0],[1,0],[1,1],[2,1]]}, {id:'s4h', color:5, weight:2, cells:[[1,0],[2,0],[0,1],[1,1]]},
    {id:'z4v',  color:5, weight:2, cells:[[1,0],[0,1],[1,1],[0,2]]}, {id:'s4v', color:5, weight:2, cells:[[0,0],[0,1],[1,1],[1,2]]},
    {id:'plus5',color:4, weight:1, cells:[[1,0],[0,1],[1,1],[2,1],[1,2]]},
    {id:'p5',   color:2, weight:0, cells:[[0,0],[1,0],[0,1],[1,1],[0,2]]},
    {id:'u5',   color:3, weight:0, cells:[[0,0],[2,0],[0,1],[1,1],[2,1]]},
    {id:'w5',   color:5, weight:0, cells:[[0,0],[0,1],[1,1],[1,2],[2,2]]},
    {id:'sq3',  color:2, weight:1, cells:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]},
    /* gravity-only heavy polyominoes (not in the normal spawn table) */
    {id:'i6h', color:1, weight:0, cells:[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0]]},
    {id:'rect6',color:2,weight:0,cells:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]},
    {id:'l6',color:3,weight:0,cells:[[0,0],[0,1],[0,2],[0,3],[1,3],[2,3]]},
    {id:'stair6',color:5,weight:0,cells:[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]]}
  ];
  const SHAPE_BY_ID = Object.fromEntries(SHAPES.map(s=>[s.id,s]));
  // Spawn weights are per FAMILY, not per orientation. Free rotation must not make L/T pieces 4× more common.
  const SPAWN_BASE = [
    ['dot',1],['i2h',1],['i3h',7],['l3a',6],['sq2',6],['i4h',5],['i5h',3],['t4u',5],['l4a',5],['z4h',4],['plus5',2],['sq3',1]
  ];
  const WEIGHTED = SPAWN_BASE.flatMap(([id,w])=>Array(w).fill(SHAPE_BY_ID[id]));

  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
  function emptyBoard(size){ return Array.from({length:size},()=>Array(size).fill(0)); }
  function cloneBoard(board){ return board.map(r=>r.slice()); }
  function shapeDims(shape){
    return [Math.max(...shape.cells.map(c=>c[0]))+1, Math.max(...shape.cells.map(c=>c[1]))+1];
  }
  function canPlace(board, shape, x, y, size){
    return shape.cells.every(([dx,dy]) => {
      const xx=x+dx, yy=y+dy;
      return xx>=0 && yy>=0 && xx<size && yy<size && !board[yy][xx];
    });
  }
  function placements(board, shape, size){
    const out=[];
    const [w,h]=shapeDims(shape);
    for(let y=0;y<=size-h;y++) for(let x=0;x<=size-w;x++) if(canPlace(board,shape,x,y,size)) out.push([x,y]);
    return out;
  }
  function hasPlacement(board, shape, size){
    const [w,h]=shapeDims(shape);
    for(let y=0;y<=size-h;y++) for(let x=0;x<=size-w;x++) if(canPlace(board,shape,x,y,size)) return true;
    return false;
  }

  function scanClears(board, size, mode){
    const rows=[], cols=[], squares=[];
    for(let y=0;y<size;y++) if(board[y].every(Boolean)) rows.push(y);
    for(let x=0;x<size;x++){
      let full=true;
      for(let y=0;y<size;y++) if(!board[y][x]){full=false;break;}
      if(full) cols.push(x);
    }
    if(mode==='SQUARES' && size>=3){
      for(let y=0;y<=size-3;y++) for(let x=0;x<=size-3;x++){
        let full=true;
        for(let dy=0;dy<3 && full;dy++) for(let dx=0;dx<3;dx++) if(!board[y+dy][x+dx]){full=false;break;}
        if(full) squares.push([x,y]);
      }
    }
    const set=new Set();
    rows.forEach(y=>{for(let x=0;x<size;x++)set.add(`${x},${y}`);});
    cols.forEach(x=>{for(let y=0;y<size;y++)set.add(`${x},${y}`);});
    squares.forEach(([sx,sy])=>{for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)set.add(`${sx+dx},${sy+dy}`);});
    return {
      rows, cols, squares,
      units:rows.length+cols.length+squares.length,
      cells:[...set].map(k=>k.split(',').map(Number))
    };
  }
  function clearCells(board, cells){ cells.forEach(([x,y])=>board[y][x]=0); }
  function applyGravity(board, size){
    for(let x=0;x<size;x++){
      let write=size-1;
      for(let y=size-1;y>=0;y--) if(board[y][x]){ const value=board[y][x]; if(write!==y){board[write][x]=value;board[y][x]=0;} write--; }
      for(let y=write;y>=0;y--) board[y][x]=0;
    }
  }
  function applyGravityTracked(board,size,tracked=[]){
    const trackedSet=new Set(tracked.map(([x,y])=>`${x},${y}`)),landed=[];
    for(let x=0;x<size;x++){
      const stack=[];
      for(let y=size-1;y>=0;y--) if(board[y][x]) stack.push({value:board[y][x],tracked:trackedSet.has(`${x},${y}`)});
      let write=size-1;
      for(const item of stack){board[write][x]=item.value;if(item.tracked)landed.push([x,write]);write--;}
      for(let y=write;y>=0;y--)board[y][x]=0;
    }
    return landed;
  }

  // GRAVITY v1.1: mixed-color polyominoes + real falling chains.
  // A placed shape can contain several colors. Cells fall independently by column.
  // First clear: only groups touched by the just-landed cells may ignite. After that,
  // gravity can create automatic follow-up clears (true chains) until the field settles.
  const GRAVITY_CLEAR_MIN=5;
  function scanColorGroups(board,size,minGroup=1){
    const seen=new Set(),groups=[];
    for(let y=0;y<size;y++) for(let x=0;x<size;x++){
      const value=board[y][x],key=`${x},${y}`;
      if(!value||seen.has(key))continue;
      const q=[[x,y]],cells=[];seen.add(key);
      while(q.length){
        const [cx,cy]=q.pop();cells.push([cx,cy]);
        for(const [nx,ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]){
          const nk=`${nx},${ny}`;
          if(nx>=0&&ny>=0&&nx<size&&ny<size&&!seen.has(nk)&&board[ny][nx]===value){seen.add(nk);q.push([nx,ny]);}
        }
      }
      if(cells.length>=minGroup)groups.push(cells);
    }
    return {groups,units:groups.length,cells:groups.flat()};
  }
  function componentAt(board,size,start){
    const [sx,sy]=start,value=board[sy]?.[sx];
    if(!value)return [];
    const q=[[sx,sy]],seen=new Set([`${sx},${sy}`]),cells=[];
    while(q.length){
      const [x,y]=q.pop();cells.push([x,y]);
      for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
        const k=`${nx},${ny}`;
        if(nx>=0&&ny>=0&&nx<size&&ny<size&&!seen.has(k)&&board[ny][nx]===value){seen.add(k);q.push([nx,ny]);}
      }
    }
    return cells;
  }

  function simulatePlace(board, shape, x, y, mode, size){
    if(!canPlace(board,shape,x,y,size)) return null;
    const next=cloneBoard(board);
    let placed=shape.cells.map(([dx,dy],i)=>[x+dx,y+dy,shape.cellColors?.[i]||shape.color||1]);
    placed.forEach(([xx,yy,color])=>next[yy][xx]=color);
    const waves=[],stages=[];

    if(mode==='GRAVITY'){
      const tracked=placed.map(([px,py])=>[px,py]);
      const landed=applyGravityTracked(next,size,tracked);
      // Re-associate landed coordinates with their colors after the fall.
      const landedColored=landed.map(([lx,ly])=>[lx,ly,next[ly][lx]]);
      stages.push({board:cloneBoard(next)});
      const groupKeys=new Set(),eligible=[];
      for(const [px,py] of landedColored){
        const group=componentAt(next,size,[px,py]);
        if(group.length<GRAVITY_CLEAR_MIN)continue;
        const key=group.map(([gx,gy])=>`${gx},${gy}`).sort().join('|');
        if(!groupKeys.has(key)){groupKeys.add(key);eligible.push(group);}
      }
      if(eligible.length){
        const cells=[...new Map(eligible.flat().map(c=>[`${c[0]},${c[1]}`,c])).values()];
        waves.push({groups:eligible,units:eligible.length,cells});
        clearCells(next,cells);applyGravity(next,size);stages.push({board:cloneBoard(next)});
        // True combo / chain pass. Any qualifying groups created by the fall now clear,
        // then gravity repeats. Cap guards against malformed states, not normal play.
        for(let chain=0;chain<7;chain++){
          const scan=scanColorGroups(next,size,GRAVITY_CLEAR_MIN);
          if(!scan.units)break;
          waves.push(scan);clearCells(next,scan.cells);applyGravity(next,size);stages.push({board:cloneBoard(next)});
        }
      }
      placed=landedColored.map(([px,py])=>[px,py]);
    }else{
      const clear=scanClears(next,size,mode==='SQUARES'?'SQUARES':'CLASSIC');
      if(clear.units){ waves.push(clear); clearCells(next,clear.cells); }
      placed=placed.map(([px,py])=>[px,py]);
    }
    return {board:next, placed, waves, stages};
  }

  function normalizedCells(cells){
    const minX=Math.min(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1]));
    return cells.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  }
  function cellsKey(cells){return normalizedCells(cells).map(c=>c.join(',')).join(';');}
  function rotateCellsCW(cells){
    const norm=normalizedCells(cells),h=Math.max(...norm.map(c=>c[1]))+1;
    return normalizedCells(norm.map(([x,y])=>[h-1-y,x]));
  }
  function rotateShape(shape){
    if(Array.isArray(shape.cellColors)&&shape.cellColors.length===shape.cells.length){
      const h=Math.max(...shape.cells.map(c=>c[1]))+1;
      let items=shape.cells.map(([x,y],i)=>({x:h-1-y,y:x,color:shape.cellColors[i]}));
      const minX=Math.min(...items.map(o=>o.x)),minY=Math.min(...items.map(o=>o.y));
      items=items.map(o=>({...o,x:o.x-minX,y:o.y-minY})).sort((a,b)=>a.y-b.y||a.x-b.x);
      return {...deepClone(shape),cells:items.map(o=>[o.x,o.y]),cellColors:items.map(o=>o.color),color:items[0]?.color||shape.color||1};
    }
    const key=cellsKey(rotateCellsCW(shape.cells));
    const found=SHAPES.find(s=>s.cells.length===shape.cells.length && s.color===shape.color && cellsKey(s.cells)===key);
    return deepClone(found||{...shape,cells:rotateCellsCW(shape.cells)});
  }
  function rotationKey(shape){
    if(Array.isArray(shape.cellColors)&&shape.cellColors.length===shape.cells.length){
      return shape.cells.map(([x,y],i)=>`${x},${y}:${shape.cellColors[i]}`).join(';');
    }
    return cellsKey(shape.cells);
  }
  function rotations(shape){
    const out=[],seen=new Set();let s=deepClone(shape);
    for(let i=0;i<4;i++){
      const k=rotationKey(s);if(!seen.has(k)){seen.add(k);out.push(deepClone(s));}
      s=rotateShape(s);
    }
    return out;
  }
  function rotationAllowed(mode){return mode!=='CLASSIC';}
  function modeRotations(shape,mode){return rotationAllowed(mode)?rotations(shape):[deepClone(shape)];}
  function hasAnyRotationPlacement(board,shape,size){return rotations(shape).some(s=>hasPlacement(board,s,size));}
  function hasModePlacement(board,shape,size,mode){return modeRotations(shape,mode).some(s=>hasPlacement(board,s,size));}
  function randomShape(rng=Math.random){
    let s=deepClone(WEIGHTED[Math.floor(rng()*WEIGHTED.length)]);
    const turns=Math.floor(rng()*4);for(let i=0;i<turns;i++)s=rotateShape(s);
    return s;
  }

  function trayHasSolution(board, tray, mode, size, maxNodes=12000){
    let nodes=0;
    const memo=new Set();
    function encode(b,remaining){
      let bits='';
      for(const row of b) bits+=row.map(v=>v?'1':'0').join('');
      return bits+'|'+remaining.slice().sort((a,b)=>a-b).join(',');
    }
    function dfs(b, remaining){
      if(!remaining.length) return true;
      if(++nodes>maxNodes) return false;
      const key=encode(b,remaining);
      if(memo.has(key)) return false;
      memo.add(key);

      const ordered=remaining.slice().sort((a,b)=>tray[b].cells.length-tray[a].cells.length);
      for(const idx of ordered){
        for(const shape of modeRotations(tray[idx],mode)){
          const ps=placements(b,shape,size);
          ps.sort((a,b)=>Math.min(a[0],a[1],size-1-a[0],size-1-a[1])-Math.min(b[0],b[1],size-1-b[0],size-1-b[1]));
          for(const [x,y] of ps){
            const sim=simulatePlace(b,shape,x,y,mode,size);
            if(!sim) continue;
            const rest=remaining.filter(v=>v!==idx);
            if(dfs(sim.board,rest)) return true;
            if(nodes>maxNodes) return false;
          }
        }
      }
      return false;
    }
    return dfs(cloneBoard(board),tray.map((_,i)=>i));
  }

  const GRAVITY_BASE_IDS=['i3h','l3a','sq2','i4h','t4u','l4a','z4h','i5h','plus5','p5','u5','w5'];
  const GRAVITY_MATCH_COLORS=[1,2,3,4,5,6,7];
  function gravityColorCount(moves=0){return moves<18?5:(moves<36?6:7);}
  function randomGravityShape(rng=Math.random){
    const id=GRAVITY_BASE_IDS[Math.floor(rng()*GRAVITY_BASE_IDS.length)];
    let shape=deepClone(SHAPE_BY_ID[id]);
    const turns=Math.floor(rng()*4);for(let i=0;i<turns;i++)shape=rotateShape(shape);
    return shape;
  }
  function gravityLiveColors(board,size,maxColor){
    const best=Array(maxColor+1).fill(0);
    for(const g of scanColorGroups(board,size,1).groups){
      const [x,y]=g[0],c=board[y][x];if(c<=maxColor)best[c]=Math.max(best[c],g.length);
    }
    return best;
  }
  function decorateGravityShape(shape,palette,rng,preferred=null){
    const n=shape.cells.length,colors=[],counts=new Map();
    const maxSame=n>=5?2:2;
    if(preferred&&n>=3){colors.push(preferred);colors.push(preferred);counts.set(preferred,2);}
    while(colors.length<n){
      const options=palette.filter(c=>(counts.get(c)||0)<maxSame);
      const pool=options.length?options:palette;
      const c=pool[Math.floor(rng()*pool.length)];colors.push(c);counts.set(c,(counts.get(c)||0)+1);
    }
    // Shuffle color-to-cell assignment so matching depends on rotation/placement, not fixed slots.
    for(let i=colors.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]];}
    shape.cellColors=colors;shape.color=colors[0]||1;return shape;
  }
  function generateGravityTray(board,size,rng=Math.random,moves=0){
    const maxColor=gravityColorCount(moves),palette=GRAVITY_MATCH_COLORS.slice(0,maxColor),live=gravityLiveColors(board,size,maxColor);
    const promising=palette.filter(c=>live[c]>=2&&live[c]<GRAVITY_CLEAR_MIN).sort((a,b)=>live[b]-live[a]);
    let fallback=null;
    for(let attempt=0;attempt<100;attempt++){
      const tray=[];
      for(let i=0;i<3;i++){
        const preferred=(promising.length&&rng()<0.34)?promising[Math.floor(rng()*Math.min(3,promising.length))]:null;
        tray.push(decorateGravityShape(randomGravityShape(rng),palette,rng,preferred));
      }
      if(trayHasSolution(board,tray,'GRAVITY',size,22000))return tray;
      fallback=fallback||tray;
    }
    return fallback||[
      decorateGravityShape(deepClone(SHAPE_BY_ID.i3h),palette,rng,null),
      decorateGravityShape(deepClone(SHAPE_BY_ID.l3a),palette,rng,null),
      decorateGravityShape(deepClone(SHAPE_BY_ID.sq2),palette,rng,null)
    ];
  }

  function generateFairTray(board, mode, size, rng=Math.random, moves=0){
    if(mode==='GRAVITY')return generateGravityTray(board,size,rng,moves);
    const simMode = mode,fill=boardFill(board);
    let best=null,bestDiversity=0;
    for(let attempt=0;attempt<70;attempt++){
      const tray=[randomShape(rng),randomShape(rng),randomShape(rng)];
      const tiny=tray.filter(p=>p.cells.length<=2).length;
      // Tiny rescue pieces are intentionally absent in normal early/mid play.
      if(fill<66&&tiny>0&&attempt<50)continue;
      if(tiny>1)continue;
      if(!trayHasSolution(board,tray,simMode,size)) continue;
      const diversity=new Set(tray.map(p=>p.color)).size;
      if(diversity>bestDiversity){best=tray;bestDiversity=diversity;}
      if(diversity===3) return tray;
    }
    if(best && bestDiversity>=2) return best;
    const medium=SHAPES.filter(s=>s.cells.length>=3&&s.cells.length<=5&&s.weight>0);
    for(let a=0;a<medium.length;a++) for(let b=0;b<medium.length;b++) for(let c=0;c<medium.length;c++){
      const tray=[deepClone(medium[a]),deepClone(medium[b]),deepClone(medium[c])];
      if(new Set(tray.map(p=>p.color)).size<2) continue;
      if(trayHasSolution(board,tray,simMode,size,22000)) return tray;
    }
    // Last-resort escape hatch only when the board is genuinely cramped.
    const rescue=[deepClone(SHAPE_BY_ID['dot']),deepClone(SHAPE_BY_ID['i2h']),deepClone(SHAPE_BY_ID['l3a'])];
    return rescue;
  }

  function shiftBoard(board, size, dir){
    const out=emptyBoard(size);
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) if(board[y][x]){
      let xx=x, yy=y;
      if(dir==='LEFT') xx=(x-1+size)%size;
      if(dir==='RIGHT') xx=(x+1)%size;
      if(dir==='UP') yy=(y-1+size)%size;
      if(dir==='DOWN') yy=(y+1)%size;
      out[yy][xx]=board[y][x];
    }
    return out;
  }

  function boardFill(board){
    let n=0; for(const row of board) for(const v of row) if(v)n++;
    return n;
  }

  const api={
    SHAPES, SHAPE_BY_ID, emptyBoard, cloneBoard, deepClone, shapeDims, canPlace, placements, hasPlacement, rotateShape, rotations, rotationAllowed, modeRotations, hasAnyRotationPlacement, hasModePlacement,
    scanClears, scanColorGroups, clearCells, applyGravity, applyGravityTracked, simulatePlace, trayHasSolution, generateFairTray, GRAVITY_CLEAR_MIN,
    shiftBoard, boardFill
  };
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else global.GridShiftCore=api;
})(typeof window!=='undefined'?window:globalThis);
