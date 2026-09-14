/* GRID SHIFT v1.8.3 engine bundle — script2 + runtime-base-v182 in exact order. */

/* ===== script2.js ===== */

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


/* ===== runtime-base-v182.js ===== */
/* GRID SHIFT v1.8.2 base JS bundle — app1/app2/app3 in exact order. */

/* ===== app1.js ===== */
'use strict';

const Core=window.GridShiftCore;
const Platform=window.GridShiftPlatform;

const MODES={
  CLASSIC:{title:'CLASSIC',glyph:'▦'},
  SHIFT:{title:'SHIFT',glyph:'⇄'},
  GRAVITY:{title:'GRAVITY',glyph:'↓'},
  SQUARES:{title:'SQUARES',glyph:'▣'},
  BLITZ:{title:'RUSH',glyph:'⚡'},
  BOMBS:{title:'BOMBS',glyph:'●'}
};
const SIZES={10:{name:'STANDARD',label:'10×10'}};
const SHIFT_DIRS=['LEFT','RIGHT','UP','DOWN'];
const SHIFT_GLYPH={LEFT:'←',RIGHT:'→',UP:'↑',DOWN:'↓'};
const RUSH_FIRST_MS=3200;
const RUSH_WARN_MS=720;
const RUSH_MAX_INTERVAL_MS=3800;
const RUSH_MIN_INTERVAL_MS=1900;

// Semantic palette learned from geometry: one glance at color narrows the possible fit family.
const PIECE_COLORS={
  1:{base:'#2F80ED',hi:'#78B7FF',lo:'#1657B7'}, // straight / bars
  2:{base:'#F4B63C',hi:'#FFD978',lo:'#C77D13'}, // squares / blocks
  3:{base:'#4FC06A',hi:'#8CE89D',lo:'#278B43'}, // L / corners
  4:{base:'#985BEF',hi:'#C996FF',lo:'#6833B8'}, // T / cross
  5:{base:'#F25F8B',hi:'#FF9DB8',lo:'#BD315D'}, // zigzag
  6:{base:'#19B6C9',hi:'#72E1EA',lo:'#087B8B'}, // cyan
  7:{base:'#F06B3E',hi:'#FFA17D',lo:'#B94324'}  // coral / gravity late-game
};

const $=id=>document.getElementById(id);
const boardEl=$('board');
const trayEl=$('tray');
const scoreEl=$('score');
const bestEl=$('best');
const modeNameEl=$('modeName');
const sizeNameEl=$('sizeName');
const chainEl=$('chain');
const modeStatEl=$('modeStat');
const statusEl=$('status');
const modeHintEl=$('modeHint');
const modeOverlay=$('modeOverlay');
const confirmOverlay=$('confirmOverlay');
const overOverlay=$('gameOverOverlay');
const muteBtn=$('muteBtn');
const dragHintEl=$('dragHint');
const blitzClockEl=$('blitzClock');
const blitzProgressEl=$('blitzProgress');

let state=null;
let selectedPiece=null;
let drag=null;
let previewAnchor=null;
let menuSize=10;
let saveTimer=null;
let audioCtx=null;
let masterGain=null;
let audioPrimed=false;
let userMuted=localStorage.getItem('gridshift_user_muted_v9')==='1';
let platformAudio=true;
let platformPaused=false;
let docHidden=document.hidden;
let timerFrame=0;
let lastFrame=performance.now();
let blitzArmed=false;
let statusTimer=null;
let fxQueue=[];
let rotationHintSeen=localStorage.getItem('gridshift_rotate_seen_v11')==='1';
let cellEls=[];
let previewTouched=[];
let dragRaf=0;
let endingRun=false;
let resolving=false;

function slotKey(mode,size){return `state_v11_${mode.toLowerCase()}_${size}`;}
function defaultState(mode='CLASSIC',size=10){
  return {
    version:11, mode, size,
    board:Core.emptyBoard(size), tray:[], score:0, best:0, chain:0, trayHadClear:false,
    moves:0, nextShift:randomShift(), bombs:[], blitzMs:RUSH_FIRST_MS, rushWarning:null, lastPlaced:[],
    gameOver:false, startedAt:Date.now(), lastPlayedAt:Date.now()
  };
}
function randomShift(prev){
  let d=SHIFT_DIRS[Math.floor(Math.random()*SHIFT_DIRS.length)];
  if(prev && Math.random()<0.7){ while(d===prev) d=SHIFT_DIRS[Math.floor(Math.random()*SHIFT_DIRS.length)]; }
  return d;
}
function safeParse(s){try{return JSON.parse(s);}catch(_){return null;}}
function validateState(raw,mode,size){
  if(!raw || raw.version!==11 || raw.mode!==mode || raw.size!==size) return null;
  if(!Array.isArray(raw.board)||raw.board.length!==size||raw.board.some(r=>!Array.isArray(r)||r.length!==size)) return null;
  raw.board=raw.board.map(r=>r.map(v=>{const n=Number(v)||0;return n>=1&&n<=7?n:0;}));
  raw.tray=Array.isArray(raw.tray)?raw.tray.slice(0,3).map(p=>{
    if(!p||!Core.SHAPE_BY_ID[p.id])return null;
    const base=Core.deepClone(Core.SHAPE_BY_ID[p.id]);
    if(Array.isArray(p.cells)&&p.cells.length===base.cells.length&&p.cells.every(c=>Array.isArray(c)&&c.length===2&&Number.isFinite(+c[0])&&Number.isFinite(+c[1])))base.cells=p.cells.map(c=>[+c[0],+c[1]]);
    const color=Math.max(1,Math.min(7,Number(p.color)||base.color||1));base.color=color;
    if(Array.isArray(p.cellColors)&&p.cellColors.length===base.cells.length)base.cellColors=p.cellColors.map(v=>Math.max(1,Math.min(7,Number(v)||1)));
    return base;
  }):[];
  while(raw.tray.length<3) raw.tray.push(null);
  raw.score=Number(raw.score)||0; raw.best=Math.max(Number(raw.best)||0,raw.score);
  raw.chain=Math.max(0,Number(raw.chain)||0); raw.moves=Math.max(0,Number(raw.moves)||0);
  raw.trayHadClear=!!raw.trayHadClear; raw.bombs=Array.isArray(raw.bombs)?raw.bombs:[];
  raw.nextShift=SHIFT_DIRS.includes(raw.nextShift)?raw.nextShift:randomShift();
  raw.blitzMs=Math.max(0,Number(raw.blitzMs)||RUSH_FIRST_MS); raw.rushWarning=raw.rushWarning&&Number.isFinite(raw.rushWarning.x)&&Number.isFinite(raw.rushWarning.y)?raw.rushWarning:null; raw.lastPlaced=Array.isArray(raw.lastPlaced)?raw.lastPlaced:[];
  raw.gameOver=!!raw.gameOver;
  return raw;
}

async function loadSlot(mode,size){
  await saveNow();
  const raw=safeParse(await Platform.get(slotKey(mode,size)));
  state=validateState(raw,mode,size) || defaultState(mode,size);
  if(!state.tray.some(Boolean) && !state.gameOver) state.tray=Core.generateFairTray(state.board,state.mode,state.size,Math.random,state.moves);
  selectedPiece=null; previewAnchor=null; drag=null; blitzArmed=(mode==='BLITZ'); if(mode==='BLITZ'&&!state.rushWarning&&state.blitzMs<=0)state.blitzMs=RUSH_FIRST_MS; fxQueue=[];
  clearTimeout(statusTimer); statusEl.textContent=''; statusEl.classList.remove('strong','status-pop');
  menuSize=size;
  closeOverlays();
  renderAll();
  savePrefs();
}
async function savePrefs(){
  if(!state)return;
  Platform.set('prefs_v11',{mode:state.mode,size:state.size});
}
function serializableState(){
  if(!state)return null;
  state.lastPlayedAt=Date.now();
  return state;
}
function scheduleSave(immediate=false){
  clearTimeout(saveTimer);
  if(immediate) saveNow(); else saveTimer=setTimeout(saveNow,220);
}
async function saveNow(){
  clearTimeout(saveTimer);
  if(!state)return;
  try{await Platform.set(slotKey(state.mode,state.size),serializableState());}catch(_){ }
}

function newRun(keepBest=true){
  const best=keepBest&&state?state.best:0;
  const mode=state?.mode||'CLASSIC', size=state?.size||10;
  state=defaultState(mode,size); state.best=best;
  state.tray=Core.generateFairTray(state.board,mode,size,Math.random,state.moves);
  selectedPiece=null; previewAnchor=null; blitzArmed=(mode==='BLITZ'); endingRun=false; resolving=false;
  boardEl.classList.remove('run-over','bomb-detonate');trayEl.classList.remove('run-over');
  overOverlay.classList.remove('open'); confirmOverlay.classList.remove('open');
  renderAll(); scheduleSave(true); requestSound('start');
}

function effectiveMuted(){return userMuted||!platformAudio;}
function buildAudio(){
  if(audioCtx)return audioCtx;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  try{
    audioCtx=new AC({latencyHint:'interactive'});
    masterGain=audioCtx.createGain();masterGain.gain.value=.72;
    masterGain.connect(audioCtx.destination);
  }catch(_){audioCtx=null;masterGain=null;}
  return audioCtx;
}
async function unlockAudio(){
  if(effectiveMuted())return false;
  const ctx=buildAudio();if(!ctx)return false;
  try{
    if(ctx.state==='suspended'||ctx.state==='interrupted')await ctx.resume();
    if(!audioPrimed&&ctx.state==='running'){
      const b=ctx.createBuffer(1,1,ctx.sampleRate),src=ctx.createBufferSource();src.buffer=b;src.connect(masterGain||ctx.destination);src.start();audioPrimed=true;
    }
    return ctx.state==='running';
  }catch(_){return false;}
}
function audioOut(ctx){return masterGain||ctx.destination;}
function tone(freq,dur=.05,type='sine',vol=.05,delay=0,slide=null){
  const ctx=audioCtx;if(!ctx||ctx.state!=='running'||effectiveMuted())return;
  const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(audioOut(ctx));o.start(t);o.stop(t+dur+.025);
}
function noiseBurst(dur=.035,vol=.018,filterFreq=1800,delay=0){
  const ctx=audioCtx;if(!ctx||ctx.state!=='running'||effectiveMuted())return;
  const frames=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,frames,ctx.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  filter.type='bandpass';filter.frequency.value=filterFreq;filter.Q.value=.8;gain.gain.value=vol;
  src.buffer=buf;src.connect(filter);filter.connect(gain);gain.connect(audioOut(ctx));src.start(ctx.currentTime+delay);
}
function haptic(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(_){}}
function beep(kind,power=1){
  if(effectiveMuted()||!audioCtx||audioCtx.state!=='running')return;
  const j=()=>1+(Math.random()-.5)*.025;
  if(kind==='pickup'){noiseBurst(.018,.018,4200);tone(980*j(),.026,'sine',.035,0,780);tone(1480,.018,'sine',.012,.006,1200);}
  if(kind==='rotate'){tone(720,.035,'sine',.034);tone(980,.04,'sine',.022,.025);haptic(5);}
  if(kind==='place'){
    const weight=Math.max(1,Math.min(9,Number(power)||1)),f=310-weight*9;
    noiseBurst(.032,.026,2300);tone(f*j(),.058,'triangle',.065,0,f*.66);tone(920,.024,'sine',.022,.007,690);haptic(8);
  }
  if(kind==='clear'){noiseBurst(.055,.026,3100);tone(455*j(),.075,'sine',.07);tone(700*j(),.105,'sine',.06,.042);haptic(12);}
  if(kind==='multi'){noiseBurst(.07,.032,3400);tone(410,.07,'triangle',.072);tone(650,.09,'triangle',.066,.038);tone(980,.12,'sine',.055,.082);haptic([14,26,18]);}
  if(kind==='shift'){noiseBurst(.11,.02,1050);tone(170,.14,'sawtooth',.025,0,360);haptic(9);}
  if(kind==='bad'){noiseBurst(.035,.018,600);tone(130,.07,'triangle',.045,0,88);haptic(5);}
  if(kind==='bomb'){tone(190,.07,'triangle',.055);tone(128,.09,'triangle',.04,.055);haptic([8,28,8]);}
  if(kind==='danger')tone(225,.04,'square',.022);
  if(kind==='chain'){tone(520,.055,'sine',.06);tone(735,.075,'sine',.055,.045);tone(1000,.095,'sine',.045,.09);haptic([10,22,10]);}
  if(kind==='gravityChain'){const n=Math.max(1,Math.min(7,Number(power)||1));const root=380+n*72;tone(root,.07,'sine',.06);tone(root*1.33,.09,'triangle',.05,.045);tone(root*1.66,.11,'sine',.038,.09);haptic([8,18,8]);}
  if(kind==='rush'){tone(640,.03,'square',.025);tone(890,.035,'sine',.018,.026);}
  if(kind==='bombOver'){noiseBurst(.18,.07,260);tone(92,.32,'sawtooth',.08,0,48);tone(180,.16,'triangle',.045,.035,70);haptic([35,25,55]);}
  if(kind==='over'){noiseBurst(.05,.022,420);tone(392,.085,'sine',.052);tone(294,.11,'sine',.048,.09);tone(196,.16,'sine',.045,.205);tone(82,.13,'triangle',.03,.34,58);haptic([10,42,18]);}
  if(kind==='start'){tone(520,.045,'sine',.045);tone(780,.055,'sine',.025,.035);}
}
function requestSound(kind,power=1){unlockAudio().then(ok=>{if(ok)beep(kind,power);});}
function updateMute(){muteBtn.textContent=effectiveMuted()?'×':'♪';muteBtn.classList.toggle('muted',effectiveMuted());muteBtn.setAttribute('aria-label',effectiveMuted()?'Sound off':'Sound on');}

function renderAll(){
  if(!state)return;
  document.documentElement.style.setProperty('--grid-size',state.size);
  document.documentElement.dataset.mode=state.mode.toLowerCase();
  if(dragHintEl) dragHintEl.classList.add('hidden');
  modeNameEl.textContent=state.mode;
  sizeNameEl.textContent=SIZES[state.size].label;
  scoreEl.textContent=state.score.toLocaleString(); bestEl.textContent=state.best.toLocaleString();
  chainEl.textContent=state.chain>0?`CHAIN ${state.chain}`:'CHAIN —';
  modeHintEl.textContent='';
  renderModeStat(); renderBoard(); renderTray(); updateMute(); renderMenu();
  if(state.gameOver&&!endingRun) showGameOver();
  flushFx();
}
function renderModeStat(){
  let txt='';
  modeStatEl.classList.remove('urgent','visible');
  blitzClockEl?.classList.remove('visible');
  if(state.mode==='SHIFT') txt=SHIFT_GLYPH[state.nextShift];
  if(state.mode==='BLITZ') txt='⚡';
  if(state.mode==='GRAVITY') txt='↓';
  if(state.mode==='SQUARES') txt='▦';
  modeStatEl.textContent=txt;
  if(txt)modeStatEl.classList.add('visible');
}
function colorOf(shape){return PIECE_COLORS[shape?.color]||PIECE_COLORS[1];}
function applyPaletteVars(el,color){const p=PIECE_COLORS[color]||PIECE_COLORS[1];el.style.setProperty('--pc',p.base);el.style.setProperty('--pc-hi',p.hi);el.style.setProperty('--pc-lo',p.lo);}
function pieceCanRotate(shape){return !!shape&&Core.rotationAllowed(state.mode)&&Core.rotations(shape).length>1;}


/* ===== app2.js ===== */
function renderBoard(){
  boardEl.innerHTML='';cellEls=Array.from({length:state.size},()=>Array(state.size));previewTouched=[];
  boardEl.setAttribute('aria-label',`${state.size} by ${state.size} game grid`);
  const frag=document.createDocumentFragment();
  for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
    const v=Number(state.board[y][x])||0,c=document.createElement('div');
    c.className='cell'+(v?` filled pc-${Math.min(7,Math.max(1,v))}`:'');
    if(v)applyPaletteVars(c,Math.min(7,Math.max(1,v)));
    c.dataset.x=x;c.dataset.y=y;c.setAttribute('aria-hidden','true');cellEls[y][x]=c;
    const bomb=state.bombs.find(b=>b.x===x&&b.y===y);
    if(bomb){c.classList.add('bomb');c.dataset.bomb=bomb.t;if(bomb.t<=3)c.classList.add('bomb-hot');}
    if(state.mode==='BLITZ'&&state.rushWarning&&state.rushWarning.x===x&&state.rushWarning.y===y)c.classList.add('rush-warning');
    frag.appendChild(c);
  }
  boardEl.appendChild(frag);
  if(state.mode==='GRAVITY'){
    const groups=Core.scanColorGroups(state.board,state.size,4).groups;
    for(const group of groups){
      const cls=group.length>=Core.GRAVITY_CLEAR_MIN?'gravity-ready':'gravity-near';
      for(const [gx,gy] of group)cellEls[gy]?.[gx]?.classList.add(cls);
    }
  }
  updatePreview();
}
function trayUnit(shape){const [w,h]=Core.shapeDims(shape),m=Math.max(w,h);return m>=5?15:m===4?18:21;}
function makePiece(shape,role='tray',unit=null,gap=null){
  const [w,h]=Core.shapeDims(shape),u=unit||trayUnit(shape),g=gap??4,art=document.createElement('div');
  art.className=`piece-art ${role} pc-${shape.color||3}`;applyPaletteVars(art,shape.color||3);art.dataset.shape=shape.id;art.dataset.cells=shape.cells.length;
  art.style.width=`${w*u+(w-1)*g}px`;art.style.height=`${h*u+(h-1)*g}px`;
  shape.cells.forEach(([x,y],i)=>{
    const b=document.createElement('span');b.className='piece-block';b.style.width=`${u}px`;b.style.height=`${u}px`;b.style.transform=`translate3d(${x*(u+g)}px,${y*(u+g)}px,0)`;
    if(Array.isArray(shape.cellColors)&&shape.cellColors[i])applyPaletteVars(b,shape.cellColors[i]);
    art.appendChild(b);
  });
  return art;
}
function renderTray(){
  trayEl.innerHTML='';
  state.tray.forEach((shape,idx)=>{
    const wrap=document.createElement('button');wrap.type='button';wrap.className='piece-wrap';wrap.dataset.idx=idx;
    if(!shape)wrap.classList.add('used');
    if(shape){
      wrap.classList.add(`pc-${shape.color||3}`);applyPaletteVars(wrap,shape.color||3);
      if(pieceCanRotate(shape)){
        wrap.classList.add('rotatable');
        const afford=document.createElement('span');afford.className='rotate-affordance';afford.setAttribute('aria-hidden','true');afford.textContent='↻';wrap.appendChild(afford);
      }
      wrap.appendChild(makePiece(shape));wrap.addEventListener('pointerdown',e=>startDrag(e,idx,wrap));
    }
    trayEl.appendChild(wrap);
  });
}
function clearPreview(){
  for(const c of previewTouched){c.classList.remove('preview-ok','preview-bad','preview-clear');c.style.removeProperty('--preview');c.style.removeProperty('--preview-hi');}
  previewTouched=[];boardEl.style.removeProperty('--preview');boardEl.style.removeProperty('--preview-hi');
}

function updatePreview(){
  clearPreview();
  if(selectedPiece===null||!previewAnchor)return;
  const shape=drag?.shape||state.tray[selectedPiece];if(!shape)return;
  const pal=colorOf(shape);boardEl.style.setProperty('--preview',pal.base);boardEl.style.setProperty('--preview-hi',pal.hi);
  const ok=Core.canPlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.size);
  shape.cells.forEach(([dx,dy],i)=>{
    const x=previewAnchor.x+dx,y=previewAnchor.y+dy;if(x<0||y<0||x>=state.size||y>=state.size)return;
    const c=cellEls[y]?.[x];if(c&&ok){
      const cp=PIECE_COLORS[shape.cellColors?.[i]||shape.color||1]||pal;c.style.setProperty('--preview',cp.base);c.style.setProperty('--preview-hi',cp.hi);
      c.classList.add('preview-ok');previewTouched.push(c);
    }
  });
  if(ok){
    const sim=Core.simulatePlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.mode,state.size);
    if(sim?.waves?.length){
      const seen=new Set();
      for(const [x,y] of sim.waves.flatMap(w=>w.cells)){const k=`${x},${y}`;if(seen.has(k))continue;seen.add(k);const c=cellEls[y]?.[x];if(c){c.classList.add('preview-clear');previewTouched.push(c);}}
    }
  }
}
function dragLift(shape,pointerType){if(pointerType!=='touch')return 24;const [,h]=Core.shapeDims(shape);return 64+Math.min(18,h*3);}
function captureBoardMetrics(){
  const c0=cellEls[0]?.[0],c1=cellEls[0]?.[1],r1=cellEls[1]?.[0];if(!c0)return null;
  const a=c0.getBoundingClientRect(),b=c1?.getBoundingClientRect(),c=r1?.getBoundingClientRect(),br=boardEl.getBoundingClientRect();
  const stepX=b?b.left-a.left:a.width,stepY=c?c.top-a.top:a.height;
  return {boardRect:br,left0:a.left,top0:a.top,cellW:a.width,cellH:a.height,stepX,stepY,gapX:Math.max(1,stepX-a.width),gapY:Math.max(1,stepY-a.height)};
}
function pointOverBoard(px,py,m){const r=m.boardRect;return px>=r.left&&px<=r.right&&py>=r.top&&py<=r.bottom;}
function rotateTrayPiece(idx,wrap=null){
  if(state.gameOver||resolving||!state.tray[idx]||!pieceCanRotate(state.tray[idx]))return false;
  state.tray[idx]=Core.rotateShape(state.tray[idx]);
  rotationHintSeen=true;localStorage.setItem('gridshift_rotate_seen_v11','1');
  requestSound('rotate');
  renderTray();scheduleSave();
  const next=trayEl.querySelector(`[data-idx="${idx}"]`);if(next){next.classList.add('rotate-pop');setTimeout(()=>next.classList.remove('rotate-pop'),210);}
  return true;
}
function startDrag(e,idx,wrap){
  if(state.gameOver||resolving||!state.tray[idx])return;e.preventDefault();
  unlockAudio();
  const metrics=captureBoardMetrics();if(!metrics)return;
  selectedPiece=idx;previewAnchor=null;
  drag={idx,shape:Core.deepClone(state.tray[idx]),pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,startT:performance.now(),active:false,wrap,ghost:null,anchor:null,anchorKey:'',inBoard:false,valid:false,pointerType:e.pointerType,metrics,raf:0};
  wrap.classList.add('pressed');
  try{wrap.setPointerCapture(e.pointerId);}catch(_){ }
  wrap.addEventListener('pointermove',moveDrag);wrap.addEventListener('pointerup',endDrag,{once:true});wrap.addEventListener('pointercancel',cancelDrag,{once:true});
}
function beginActualDrag(){
  if(!drag||drag.active)return;drag.active=true;drag.wrap.classList.add('dragging');if(state.mode==='BLITZ')blitzArmed=true;
  createGhost();positionGhost(drag.x,drag.y);requestSound('pickup');scheduleDragFrame();
}
function moveDrag(e){
  if(!drag||e.pointerId!==drag.pointerId)return;e.preventDefault();
  const events=e.getCoalescedEvents?.(),p=events&&events.length?events[events.length-1]:e;drag.x=p.clientX;drag.y=p.clientY;
  const threshold=drag.pointerType==='touch'?13:5;
  if(!drag.active&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>=threshold)beginActualDrag();
  if(drag.active)scheduleDragFrame();
}
function scheduleDragFrame(){if(!drag||!drag.active||drag.raf)return;drag.raf=requestAnimationFrame(processDragFrame);}
function processDragFrame(){
  if(!drag||!drag.active)return;drag.raf=0;positionGhost(drag.x,drag.y);
  const lift=dragLift(drag.shape,drag.pointerType),targetY=drag.y-lift,m=drag.metrics;
  drag.inBoard=pointOverBoard(drag.x,targetY,m);const a=drag.inBoard?anchorFromPoint(drag.x,targetY,drag.shape,m):null,key=a?`${a.x},${a.y}`:'out';
  drag.anchor=a;drag.valid=!!(a&&Core.canPlace(state.board,drag.shape,a.x,a.y,state.size));
  if(drag.ghost){drag.ghost.classList.toggle('valid',drag.valid);drag.ghost.classList.toggle('invalid',drag.inBoard&&!drag.valid);}
  if(key!==drag.anchorKey){drag.anchorKey=key;previewAnchor=a;selectedPiece=drag.idx;updatePreview();}
}
function endDrag(e){
  if(!drag)return;const d=drag;
  if(d.raf){cancelAnimationFrame(d.raf);d.raf=0;}if(d.active)processDragFrame();
  cleanupDragListeners(d.wrap);d.wrap.classList.remove('pressed','dragging');drag=null;
  if(!d.active){previewAnchor=null;selectedPiece=null;clearPreview();rotateTrayPiece(d.idx,d.wrap);return;}
  const shouldPlace=d.inBoard&&d.valid&&d.anchor;
  if(shouldPlace){
    snapGhostToBoard(d.ghost,d.anchor,d.shape,d.metrics);previewAnchor=null;selectedPiece=null;clearPreview();tryPlace(d.idx,d.anchor.x,d.anchor.y);
  }else{
    previewAnchor=null;selectedPiece=null;clearPreview();if(d.inBoard){invalidFeedback();finishGhost(d.ghost,false);}else finishGhost(d.ghost,null);renderTray();
  }
}
function cancelDrag(){
  if(!drag)return;const d=drag;if(d.raf)cancelAnimationFrame(d.raf);cleanupDragListeners(d.wrap);d.wrap.classList.remove('pressed','dragging');drag=null;selectedPiece=null;previewAnchor=null;clearPreview();finishGhost(d.ghost,null);renderTray();
}
function cleanupDragListeners(wrap){wrap.removeEventListener('pointermove',moveDrag);}
function createGhost(){
  if(!drag||drag.ghost)return;const g=document.createElement('div');g.className='drag-ghost';
  const skin=document.createElement('div');skin.className='ghost-skin';const art=makePiece(drag.shape,'ghost',drag.metrics.cellW,drag.metrics.gapX);skin.appendChild(art);g.appendChild(skin);
  document.body.appendChild(g);drag.ghost=g;
  if(+art.dataset.cells!==drag.shape.cells.length)console.error('GRID SHIFT piece renderer mismatch',drag.shape.id);
}
function positionGhost(x,y){if(!drag?.ghost)return;const lift=dragLift(drag.shape,drag.pointerType);drag.ghost.style.transform=`translate3d(${x}px,${y-lift}px,0) translate(-50%,-50%)`;}
function ghostCenterForAnchor(anchor,shape,m){const [w,h]=Core.shapeDims(shape);return {x:m.left0+m.cellW/2+anchor.x*m.stepX+(w-1)*m.stepX/2,y:m.top0+m.cellH/2+anchor.y*m.stepY+(h-1)*m.stepY/2};}
function snapGhostToBoard(g,anchor,shape,m){
  if(!g)return;const t=ghostCenterForAnchor(anchor,shape,m);g.classList.add('drop-ok');g.style.transition='transform 85ms cubic-bezier(.2,.9,.3,1),opacity 85ms linear';g.style.transform=`translate3d(${t.x}px,${t.y}px,0) translate(-50%,-50%)`;g.style.opacity='.12';setTimeout(()=>g.remove(),100);
}
function finishGhost(g,success){
  if(!g)return;if(success===false)g.classList.add('drop-bad');else g.classList.add('drop-cancel');setTimeout(()=>g.remove(),150);
}
function anchorFromPoint(px,py,shape,m){
  const [w,h]=Core.shapeDims(shape),cx=(px-(m.left0+m.cellW/2))/m.stepX,cy=(py-(m.top0+m.cellH/2))/m.stepY;
  return {x:Math.round(cx-(w-1)/2),y:Math.round(cy-(h-1)/2)};
}

function resolveGravityPlacement(idx,shape,sim){
  resolving=true;
  state.tray[idx]=null;state.moves++;state.score+=shape.cells.length;state.lastPlaced=sim.placed.map(c=>c.slice());
  state.board=Core.cloneBoard(sim.stages?.[0]?.board||sim.board);
  renderAll();pulsePlaced(sim.placed);beep('place',shape.cells.length);
  boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),190);
  let totalUnits=0,totalCells=0;sim.waves.forEach(w=>{totalUnits+=w.units;totalCells+=w.cells.length;});
  const waveGap=245;
  sim.waves.forEach((wave,i)=>{
    const t=i*waveGap+80;
    setTimeout(()=>{
      burstCells(wave.cells,0);
      if(i===0)requestSound(wave.units>1?'multi':'clear');else requestSound('gravityChain',i+1);
      if(i>0){const pulse=document.createElement('i');pulse.className='gravity-chain-pulse';boardEl.appendChild(pulse);setTimeout(()=>pulse.remove(),480);}
    },t);
    setTimeout(()=>{
      state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);renderBoard();
      boardEl.classList.remove('gravity-settle');void boardEl.offsetWidth;boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),190);
    },t+105);
  });
  const doneAt=80+sim.waves.length*waveGap+80;
  setTimeout(()=>{
    state.board=Core.cloneBoard(sim.board);
    if(totalUnits>0){
      state.trayHadClear=true;const cascade=Math.max(0,sim.waves.length-1);state.score+=scoreClear(totalUnits,totalCells,cascade);
    }
    if(state.tray.every(p=>p===null))completeTray();
    if(state.score>state.best)state.best=state.score;
    resolving=false;selectedPiece=null;previewAnchor=null;renderAll();scheduleSave();
    if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
  },doneAt);
  return true;
}

function tryPlace(idx,x,y){
  if(state.gameOver||resolving)return false;
  const shape=state.tray[idx];if(!shape||!Core.canPlace(state.board,shape,x,y,state.size))return false;
  if(state.mode==='BLITZ')blitzArmed=true;
  const sim=Core.simulatePlace(state.board,shape,x,y,state.mode,state.size); if(!sim)return false;
  if(state.mode==='BLITZ'&&state.rushWarning&&sim.placed.some(([px,py])=>px===state.rushWarning.x&&py===state.rushWarning.y)){state.rushWarning=null;state.blitzMs=rushInterval();}
  if(state.mode==='GRAVITY'&&sim.waves.length)return resolveGravityPlacement(idx,shape,sim);
  const beforeBombs=state.bombs.length;
  state.board=sim.board; state.tray[idx]=null; state.moves++; state.score+=shape.cells.length; state.lastPlaced=sim.placed.map(c=>c.slice());
  queueFx('placed',sim.placed); beep('place',shape.cells.length);

  let totalUnits=0,totalCells=0;
  sim.waves.forEach((wave,i)=>{
    totalUnits+=wave.units; totalCells+=wave.cells.length; clearBombsAt(wave.cells); queueFx('burst',{cells:wave.cells,wave:i});
  });
  if(totalUnits>0){
    state.trayHadClear=true;
    const cascade=Math.max(0,sim.waves.length-1);
    const gain=scoreClear(totalUnits,totalCells,cascade);
    state.score+=gain;
    announce(totalUnits>1?`${totalUnits} CLEAR  +${gain}`:`CLEAR  +${gain}`,totalUnits>1);
    beep(totalUnits>1||cascade?'multi':'clear');
  }
  if(beforeBombs>state.bombs.length) announce(`BOMB CLEARED  +${(beforeBombs-state.bombs.length)*80}`,true);

  if(state.mode==='BOMBS'){
    tickBombs(); if(state.gameOver)return true;
    const bombCap=state.moves>=28?3:2;
    if(state.moves%4===0 && state.bombs.length<bombCap) spawnBomb(state.lastPlaced);
  }

  if(state.tray.every(p=>p===null)) completeTray();
  if(state.score>state.best)state.best=state.score;
  selectedPiece=null;previewAnchor=null;
  renderAll();scheduleSave();
  if(!state.gameOver && !state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode))) endGame('NO MOVES');
  return true;
}
function scoreClear(units,cells,cascade){
  const base=cells*7+units*55+Math.max(0,units-1)*35;
  const chainMult=1+Math.min(state.chain,20)*.07;
  const cascadeMult=1+cascade*.25;
  return Math.round(base*chainMult*cascadeMult);
}
function completeTray(){
  if(state.mode==='SHIFT') applyShiftRound();
  if(state.trayHadClear){
    state.chain++;
    const bonus=state.chain>=2?25*state.chain:0;
    if(bonus){state.score+=bonus;if(state.chain===3||state.chain===5||state.chain%10===0){announce(`CHAIN ${state.chain}  +${bonus}`,true);beep('chain');queueFx('chain',state.chain);}}
  }else state.chain=0;
  state.trayHadClear=false;
  state.tray=Core.generateFairTray(state.board,state.mode,state.size,Math.random,state.moves);
}
function applyShiftRound(){
  const dir=state.nextShift;
  queueFx('shift',dir);
  state.board=Core.shiftBoard(state.board,state.size,dir);
  const clear=Core.scanClears(state.board,state.size,'CLASSIC');
  if(clear.units){
    clearBombsAt(clear.cells);Core.clearCells(state.board,clear.cells);state.trayHadClear=true;
    const gain=scoreClear(clear.units,clear.cells.length,0)+60;state.score+=gain;queueFx('burst',{cells:clear.cells,wave:0});
    announce(`SHIFT CLEAR  +${gain}`,true);beep('multi');
  }else{announce(`SHIFT ${SHIFT_GLYPH[dir]}`);beep('shift');}
  state.nextShift=randomShift(dir);
}


/* ===== app3.js ===== */
function clearBombsAt(cells){
  if(state.mode!=='BOMBS'||!state.bombs.length)return;
  const set=new Set(cells.map(([x,y])=>`${x},${y}`));
  let n=0;state.bombs=state.bombs.filter(b=>{const gone=set.has(`${b.x},${b.y}`);if(gone)n++;return !gone;});
  if(n){state.score+=n*80;}
}
function tickBombs(){
  for(const b of state.bombs)b.t--;
  const doomed=state.bombs.find(b=>b.t<=0);
  if(doomed){triggerBombGameOver(doomed);return;}
  if(state.bombs.some(b=>b.t<=3))beep('danger');
}
function spawnBomb(avoidCells=[]){
  // BOMBS are external pressure: they appear in EMPTY, preferably distant cells instead of
  // piggy-backing on a line the player was already about to clear.
  const candidates=[];
  const avoid=Array.isArray(avoidCells)?avoidCells:[];
  for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
    if(state.board[y][x]||state.bombs.some(b=>b.x===x&&b.y===y))continue;
    let row=0,col=0;for(let i=0;i<state.size;i++){row+=state.board[y][i]?1:0;col+=state.board[i][x]?1:0;}
    const dist=avoid.length?Math.min(...avoid.map(([ax,ay])=>Math.abs(ax-x)+Math.abs(ay-y))):9;
    candidates.push({x,y,row,col,dist});
  }
  if(!candidates.length)return;
  // Prefer cells at least 4 steps away and not on an almost-complete line. Randomize within
  // that band so the obstacle feels disruptive rather than scripted.
  let pool=candidates.filter(p=>p.dist>=4&&Math.max(p.row,p.col)<=7);
  if(pool.length<8)pool=candidates.filter(p=>p.dist>=3&&Math.max(p.row,p.col)<=8);
  if(!pool.length)pool=candidates;
  const p=pool[Math.floor(Math.random()*pool.length)];
  state.board[p.y][p.x]=6; // the bomb is a real occupied blocker and participates in line clears
  state.bombs.push({x:p.x,y:p.y,t:9});
  beep('bomb');queueFx('bombAlert');renderBoard();
}
function triggerBombGameOver(bomb){
  if(state.gameOver)return;
  state.gameOver=true;endingRun=true;blitzArmed=false;
  if(state.score>state.best)state.best=state.score;
  if(bomb){bomb.t=0;renderBoard();}
  scheduleSave(true);requestSound('bombOver');
  queueFx('bombDetonate',bomb?{x:bomb.x,y:bomb.y}:null);flushFx();
  setTimeout(()=>{queueFx('runOver');flushFx();},470);
  setTimeout(()=>{endingRun=false;showGameOver('');},980);
}

function rushInterval(){
  const step=Math.floor((state?.moves||0)/10)*230;
  return Math.max(RUSH_MIN_INTERVAL_MS,RUSH_MAX_INTERVAL_MS-step);
}
function beginRushWarning(){
  if(state.mode!=='BLITZ'||state.gameOver)return;
  const cells=[];
  for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++)if(!state.board[y][x])cells.push({x,y});
  if(!cells.length){endGame('');return;}
  const p=cells[Math.floor(Math.random()*cells.length)];
  state.rushWarning={x:p.x,y:p.y,ms:RUSH_WARN_MS};state.blitzMs=rushInterval();renderBoard();beep('danger');
}
function finalizeRushSpawn(){
  const w=state.rushWarning;if(!w)return;state.rushWarning=null;
  if(!state.board[w.y][w.x]){state.board[w.y][w.x]=6;queueFx('rushSpawn',{x:w.x,y:w.y});beep('rush');}
  state.blitzMs=rushInterval();renderAll();scheduleSave();
  if(!state.gameOver && !state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
}
function queueFx(type,data=null){fxQueue.push({type,data});}
function flushFx(){
  if(!fxQueue.length)return;
  const q=fxQueue.splice(0);
  requestAnimationFrame(()=>{
    for(const fx of q){
      if(fx.type==='placed') pulsePlaced(fx.data);
      if(fx.type==='burst') burstCells(fx.data.cells,fx.data.wave);
      if(fx.type==='chain') chainPop(fx.data);
      if(fx.type==='shift'){
        boardEl.classList.remove('shift-left','shift-right','shift-up','shift-down');void boardEl.offsetWidth;boardEl.classList.add(`shift-${fx.data.toLowerCase()}`);
        const f=document.createElement('div');f.className='shift-flare';f.textContent=SHIFT_GLYPH[fx.data];boardEl.appendChild(f);setTimeout(()=>f.remove(),420);
      }
      if(fx.type==='rushSpawn'&&fx.data){const c=cellEls[fx.data.y]?.[fx.data.x];if(c){c.classList.add('rush-born');setTimeout(()=>c.classList.remove('rush-born'),260);}}
      if(fx.type==='bombAlert'){boardEl.classList.add('bomb-alert');setTimeout(()=>boardEl.classList.remove('bomb-alert'),260);}
      if(fx.type==='runOver'){
        boardEl.classList.add('run-over');trayEl.classList.add('run-over');
      }
      if(fx.type==='gravityChain'){
        const delay=Math.max(0,(fx.data?.wave||2)-2)*150;
        setTimeout(()=>{
          requestSound('gravityChain',fx.data?.wave||2);
          const pulse=document.createElement('i');pulse.className='gravity-chain-pulse';boardEl.appendChild(pulse);setTimeout(()=>pulse.remove(),480);
        },delay);
      }
      if(fx.type==='bombDetonate'){
        boardEl.classList.add('bomb-detonate');
        if(fx.data){const c=cellEls[fx.data.y]?.[fx.data.x];if(c){const e=document.createElement('i');e.className='bomb-explosion';e.style.left=`${((fx.data.x+.5)/state.size)*100}%`;e.style.top=`${((fx.data.y+.5)/state.size)*100}%`;boardEl.appendChild(e);setTimeout(()=>e.remove(),720);}}
        setTimeout(()=>boardEl.classList.remove('bomb-detonate'),720);
      }
    }
  });
}
function invalidFeedback(){beep('bad');}
function pulsePlaced(cells){
  requestAnimationFrame(()=>{
    cells.forEach(([x,y],i)=>{const c=cellEls[y]?.[x];if(c){c.style.animationDelay=`${Math.min(60,i*10)}ms`;c.classList.add('placed-pop');setTimeout(()=>{c.classList.remove('placed-pop');c.style.animationDelay='';},260);}});
    if(cells.length){
      const cx=cells.reduce((a,c)=>a+c[0]+.5,0)/cells.length,cy=cells.reduce((a,c)=>a+c[1]+.5,0)/cells.length;
      const ring=document.createElement('i');ring.className='impact-ring';ring.style.left=`${(cx/state.size)*100}%`;ring.style.top=`${(cy/state.size)*100}%`;boardEl.appendChild(ring);setTimeout(()=>ring.remove(),360);
    }
  });
}
function burstCells(cells,wave=0){
  const delay=state?.mode==='GRAVITY'?wave*150:0;
  setTimeout(()=>{
    const rect=boardEl.getBoundingClientRect(); if(!rect.width)return;
    const sample=cells.filter((_,i)=>i%Math.max(1,Math.ceil(cells.length/18))===0);
    cells.forEach(([x,y])=>{const c=cellEls[y]?.[x];if(c){c.classList.add('clear-flash');setTimeout(()=>c.classList.remove('clear-flash'),280);}});
    sample.forEach(([x,y],i)=>{
      const p=document.createElement('i');p.className='spark';
      p.style.left=`${((x+.5)/state.size)*100}%`;p.style.top=`${((y+.5)/state.size)*100}%`;p.style.setProperty('--delay',`${i*4}ms`);
      boardEl.appendChild(p);setTimeout(()=>p.remove(),450);
    });
    boardEl.classList.remove('clear-kick');void boardEl.offsetWidth;boardEl.classList.add('clear-kick');
    setTimeout(()=>boardEl.classList.remove('clear-kick'),220);
  },delay);
}
function chainPop(n){boardEl.classList.remove('chain-kick');void boardEl.offsetWidth;boardEl.classList.add('chain-kick');setTimeout(()=>boardEl.classList.remove('chain-kick'),360);}
function announce(text,strong=false){
  clearTimeout(statusTimer);statusEl.textContent=text;statusEl.classList.toggle('strong',strong);statusEl.classList.remove('status-pop');void statusEl.offsetWidth;statusEl.classList.add('status-pop');
  statusTimer=setTimeout(()=>{statusEl.textContent='';statusEl.classList.remove('strong','status-pop');},1400);
}

function endGame(reason){
  if(state.gameOver)return;state.gameOver=true;endingRun=true;blitzArmed=false;if(state.score>state.best)state.best=state.score;
  renderAll();scheduleSave(true);requestSound('over');queueFx('runOver');flushFx();
  setTimeout(()=>{endingRun=false;showGameOver(reason);},720);
}
function showGameOver(reason){
  $('gameOverLabel').textContent='';$('gameOverTitle').textContent=state.score.toLocaleString();
  $('gameOverText').textContent=state.best>state.score?`★ ${state.best.toLocaleString()}`:'';overOverlay.classList.add('open');
}

function renderMenu(){
  document.querySelectorAll('.size-option').forEach(b=>b.classList.toggle('active',+b.dataset.size===menuSize));
  document.querySelectorAll('.mode-card').forEach(b=>b.classList.toggle('active',b.dataset.mode===state?.mode&&menuSize===state?.size));
}
function miniCell(x,y,cls,extra=''){
  return `<i class="md-cell ${cls} ${extra}" style="left:${2+x*14}px;top:${2+y*14}px"></i>`;
}
function modeDemoHTML(id){
  let cells='';
  if(id==='CLASSIC'){
    cells=miniCell(0,4,'md-blue')+miniCell(1,4,'md-blue')+miniCell(2,4,'md-blue')+miniCell(3,4,'md-blue')+miniCell(4,4,'md-blue md-mover')+'<i class="md-flash"></i>';
  }else if(id==='SHIFT'){
    cells=miniCell(0,2,'md-cyan md-shift')+miniCell(1,2,'md-cyan md-shift')+miniCell(1,3,'md-purple md-shift')+miniCell(3,1,'md-gold')+'<b class="demo-arrow">→</b>';
  }else if(id==='GRAVITY'){
    cells=miniCell(0,4,'md-green g-chain-a')+miniCell(1,4,'md-green g-chain-a')+miniCell(2,4,'md-green g-chain-a')+miniCell(0,3,'md-green g-chain-a')+miniCell(1,1,'md-green g-faller g-chain-a')+
      miniCell(3,1,'md-purple g-chain-b')+miniCell(3,2,'md-purple g-chain-b')+miniCell(4,3,'md-purple g-chain-b')+miniCell(3,4,'md-purple g-chain-b')+miniCell(4,1,'md-purple g-chain-b');
  }else if(id==='SQUARES'){
    for(let y=1;y<=3;y++)for(let x=1;x<=3;x++) if(!(x===3&&y===1))cells+=miniCell(x,y,'md-gold md-sq');
    cells+=miniCell(3,1,'md-gold md-sq md-squarelast')+'<i class="square-outline"></i>';
  }else if(id==='BLITZ'){
    cells=miniCell(0,4,'md-blue')+miniCell(1,4,'md-blue')+miniCell(4,1,'md-cyan md-rushspawn')+'<i class="demo-rush-target"></i><b class="demo-bolt">⚡</b>';
  }else if(id==='BOMBS'){
    cells=miniCell(0,4,'md-blue')+miniCell(1,4,'md-blue')+miniCell(2,4,'md-blue')+'<b class="md-bomb">3</b><i class="md-bombline"></i>';
  }
  return `<div class="mode-demo demo-${id.toLowerCase()}"><div class="mini-board">${cells}</div></div>`;
}
function buildMenu(){
  const sizeRow=$('sizeRow'); sizeRow.innerHTML='';
  Object.entries(SIZES).forEach(([size,info])=>{
    const b=document.createElement('button');b.className='size-option';b.dataset.size=size;b.innerHTML=`<strong>${info.label}</strong>`;
    b.addEventListener('click',()=>{menuSize=+size;renderMenu();});sizeRow.appendChild(b);
  });
  const grid=$('modeGrid');grid.innerHTML='';
  Object.entries(MODES).forEach(([id,m])=>{
    const b=document.createElement('button');b.className='mode-card';b.dataset.mode=id;b.innerHTML=`${modeDemoHTML(id)}<strong>${m.title}</strong>`;
    b.addEventListener('click',async()=>{await loadSlot(id,menuSize);modeOverlay.classList.remove('open');});grid.appendChild(b);
  });
}
function closeOverlays(){modeOverlay.classList.remove('open');confirmOverlay.classList.remove('open');overOverlay.classList.remove('open');}

function frame(now){
  const dt=Math.min(100,now-lastFrame);lastFrame=now;
  const paused=docHidden||platformPaused||modeOverlay.classList.contains('open')||confirmOverlay.classList.contains('open')||overOverlay.classList.contains('open');
  if(state?.mode==='BLITZ'&&blitzArmed&&!state.gameOver&&!paused){
    if(state.rushWarning){
      state.rushWarning.ms-=dt;
      if(state.rushWarning.ms<=0)finalizeRushSpawn();
    }else{
      state.blitzMs-=dt;
      if(state.blitzMs<=0)beginRushWarning();
    }
  }
  timerFrame=requestAnimationFrame(frame);
}

function bindUI(){
  $('modeBtn').addEventListener('click',()=>{menuSize=10;modeOverlay.classList.add('open');renderMenu();});
  $('quickRestart').addEventListener('click',()=>confirmOverlay.classList.add('open'));
  $('closeModes').addEventListener('click',()=>modeOverlay.classList.remove('open'));
  $('restartBtn').addEventListener('click',()=>confirmOverlay.classList.add('open'));
  $('cancelRestart').addEventListener('click',()=>confirmOverlay.classList.remove('open'));
  $('confirmRestart').addEventListener('click',()=>newRun(true));
  $('againBtn').addEventListener('click',()=>newRun(true));
  $('gameOverModes').addEventListener('click',()=>{overOverlay.classList.remove('open');menuSize=10;modeOverlay.classList.add('open');renderMenu();});
  muteBtn.addEventListener('click',()=>{userMuted=!userMuted;localStorage.setItem('gridshift_user_muted_v9',userMuted?'1':'0');updateMute();if(!userMuted)requestSound('start');});
  document.addEventListener('pointerdown',()=>{if(!effectiveMuted())unlockAudio();},{capture:true});
  document.addEventListener('touchstart',()=>{if(!effectiveMuted())unlockAudio();},{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{docHidden=document.hidden;lastFrame=performance.now();if(docHidden)saveNow();});
  window.addEventListener('pagehide',()=>saveNow());
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){modeOverlay.classList.remove('open');confirmOverlay.classList.remove('open');}
    if(e.key.toLowerCase()==='m')muteBtn.click();
    if(e.key.toLowerCase()==='n')confirmOverlay.classList.add('open');
  });
}

async function boot(){
  buildMenu();bindUI();
  await Platform.init();
  platformAudio=Platform.isPlatformAudioEnabled();platformPaused=Platform.isPlatformPaused();
  Platform.onAudioChange(v=>{platformAudio=v;updateMute();});
  Platform.onPauseChange(v=>{platformPaused=v;lastFrame=performance.now();});
  const prefs=safeParse(await Platform.get('prefs_v11'))||{mode:'CLASSIC',size:10};
  const mode=MODES[prefs.mode]?prefs.mode:'CLASSIC';
  await loadSlot(mode,10);
  menuSize=10;modeOverlay.classList.add('open');renderMenu();
  requestAnimationFrame(frame);
  requestAnimationFrame(()=>Platform.gameReady());
}

boot();

