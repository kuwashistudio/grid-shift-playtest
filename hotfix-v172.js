/* GRID SHIFT v1.7.2 — SQUARES becomes PERFECT SQUARES.
   A clear happens only when an entire orthogonally-connected occupied component
   is itself a completely filled 4x4+ square. Any edge-connected protrusion blocks
   the clear, so players can deliberately keep a tail to grow toward 5x5...10x10.
   Piece generation stays fair but not deterministic: precision help rises only
   under pressure, preserving the skill/luck tension. */
(function(){
  'use strict';

  const VERSION=172;
  const previousScanClears=Core.scanClears;
  const previousSimulatePlace=Core.simulatePlace;
  const previousGenerateFairTray=Core.generateFairTray;
  const previousTryPlace=tryPlace;
  const previousScoreClear=scoreClear;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;
  const previousRenderModeStat=renderModeStat;
  const previousModeDemoHTML=modeDemoHTML;
  const previousBurstCells=burstCells;

  const SCORE_BY_SIDE={4:200,5:450,6:900,7:1700,8:3000,9:5200,10:9000};
  let squareScoreContext=null;
  let apexSerial=0;
  let apexTimer=0;

  function occupiedComponents(board,size){
    const seen=new Set(),out=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      if(!board[y][x])continue;
      const first=`${x},${y}`;
      if(seen.has(first))continue;
      const q=[[x,y]],cells=[];seen.add(first);
      let minX=x,maxX=x,minY=y,maxY=y;
      while(q.length){
        const [cx,cy]=q.pop();cells.push([cx,cy]);
        minX=Math.min(minX,cx);maxX=Math.max(maxX,cx);minY=Math.min(minY,cy);maxY=Math.max(maxY,cy);
        for(const [nx,ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]){
          const k=`${nx},${ny}`;
          if(nx>=0&&ny>=0&&nx<size&&ny<size&&board[ny][nx]&&!seen.has(k)){
            seen.add(k);q.push([nx,ny]);
          }
        }
      }
      out.push({cells,minX,maxX,minY,maxY,w:maxX-minX+1,h:maxY-minY+1});
    }
    return out;
  }

  function scanPerfectSquares(board,size){
    const squares=[],cells=[];
    for(const comp of occupiedComponents(board,size)){
      if(comp.w!==comp.h||comp.w<4)continue;
      const side=comp.w;
      if(comp.cells.length!==side*side)continue;
      squares.push([comp.minX,comp.minY,side]);
      cells.push(...comp.cells);
    }
    return {rows:[],cols:[],squares,units:squares.length,cells};
  }

  Core.scanClears=function(board,size,mode){
    if(mode==='SQUARES')return scanPerfectSquares(board,size);
    return previousScanClears(board,size,mode);
  };

  Core.simulatePlace=function(board,shape,x,y,mode,size){
    if(mode!=='SQUARES')return previousSimulatePlace(board,shape,x,y,mode,size);
    if(!Core.canPlace(board,shape,x,y,size))return null;
    const next=Core.cloneBoard(board);
    const placed=shape.cells.map(([dx,dy],i)=>[x+dx,y+dy,shape.cellColors?.[i]||shape.color||1]);
    placed.forEach(([xx,yy,color])=>next[yy][xx]=color);
    const clear=scanPerfectSquares(next,size),waves=[];
    if(clear.units){waves.push(clear);Core.clearCells(next,clear.cells);}
    return {board:next,placed:placed.map(([px,py])=>[px,py]),waves,stages:[]};
  };

  function boardPressure(board,size){
    const fill=Core.boardFill(board),comps=occupiedComponents(board,size);
    let largestSpan=0,largestCells=0,nearMissing=99;
    for(const c of comps){
      const side=Math.max(c.w,c.h);
      largestSpan=Math.max(largestSpan,side);
      largestCells=Math.max(largestCells,c.cells.length);
      if(side>=4){
        const missing=side*side-c.cells.length;
        if(missing>=0)nearMissing=Math.min(nearMissing,missing);
      }
    }
    return {fill,largestSpan,largestCells,nearMissing};
  }

  function weightedShape(pool,rng){
    let total=0;for(const [,w] of pool)total+=w;
    let n=rng()*total,id=pool[0][0];
    for(const [candidate,w] of pool){n-=w;if(n<0){id=candidate;break;}}
    let s=Core.deepClone(Core.SHAPE_BY_ID[id]);
    const turns=Math.floor(rng()*4);for(let i=0;i<turns;i++)s=Core.rotateShape(s);
    return s;
  }

  function squarePool(board,size){
    const p=boardPressure(board,size);
    const pool=[
      ['sq2',11],['i3h',10],['l3a',9],['i4h',8],['l4a',7],
      ['t4u',5],['rect6',4],['z4h',3],['i5h',3],['sq3',1],['plus5',1]
    ];

    /* Larger projects benefit from controllable edges, but we never hand over
       the exact missing piece deterministically. */
    if(p.largestSpan>=6){pool.push(['i3h',3],['l3a',3],['sq2',3],['i4h',2]);}
    if(p.largestSpan>=8){pool.push(['i3h',2],['i4h',2],['l4a',2]);}

    /* Precision pieces are a pressure valve, not the normal strategy. */
    if(p.fill>=54)pool.push(['i2h',1]);
    if(p.fill>=66)pool.push(['i2h',2]);
    if(p.fill>=76)pool.push(['i2h',2],['dot',1]);
    if(p.nearMissing<=4&&p.fill>=48)pool.push(['i2h',2]);
    if(p.nearMissing<=2&&p.fill>=62)pool.push(['dot',1]);
    return {pool,pressure:p};
  }

  function generatePerfectSquareTray(board,size,rng=Math.random,moves=0){
    const {pool,pressure}=squarePool(board,size);
    let fallback=null;
    for(let attempt=0;attempt<30;attempt++){
      const tray=[weightedShape(pool,rng),weightedShape(pool,rng),weightedShape(pool,rng)];
      const tiny=tray.filter(p=>p.cells.length<=2).length;
      if(tiny>1)continue;
      if(pressure.fill<54&&tiny>0)continue;
      if(!tray.every(p=>Core.hasModePlacement(board,p,size,'SQUARES')))continue;
      fallback=fallback||tray;
      if(Core.trayHasSolution(board,tray,'SQUARES',size,9500))return tray;
    }
    if(fallback)return fallback;
    /* v1.3.0's generator now runs through the new exact-square simulator, so it
       remains a reliable last-resort fair-tray search without guaranteeing a win. */
    return previousGenerateFairTray(board,'SQUARES',size,rng,moves);
  }

  Core.generateFairTray=function(board,mode,size,rng=Math.random,moves=0){
    if(mode==='SQUARES')return generatePerfectSquareTray(board,size,rng,moves);
    return previousGenerateFairTray(board,mode,size,rng,moves);
  };

  function squareSidesFromWave(wave){
    return Array.isArray(wave?.squares)?wave.squares.map(s=>Number(s?.[2])||0).filter(n=>n>=4):[];
  }

  scoreClear=function(units,cells,cascade){
    if(state?.mode!=='SQUARES'||!squareScoreContext?.length)return previousScoreClear(units,cells,cascade);
    const sides=squareScoreContext;
    let base=sides.reduce((sum,side)=>sum+(SCORE_BY_SIDE[side]||Math.round(side*side*12)),0);
    if(sides.length>1)base=Math.round(base*(1+(sides.length-1)*.25));
    const streakMult=1+Math.min(Number(state.chain)||0,12)*.06;
    return Math.round(base*streakMult);
  };

  tryPlace=function(idx,x,y){
    if(state?.mode!=='SQUARES')return previousTryPlace(idx,x,y);
    const shape=state.tray?.[idx];
    let sim=null;
    if(shape&&Core.canPlace(state.board,shape,x,y,state.size))sim=Core.simulatePlace(state.board,shape,x,y,'SQUARES',state.size);
    squareScoreContext=squareSidesFromWave(sim?.waves?.[0]);
    const maxSide=squareScoreContext.length?Math.max(...squareScoreContext):0;
    try{
      const ok=previousTryPlace(idx,x,y);
      if(ok&&maxSide>=4){
        state.squaresBestPerfectV172=Math.max(Number(state.squaresBestPerfectV172)||0,maxSide);
        state.squaresRulesVersionV172=VERSION;
        scheduleSave();
      }
      return ok;
    }finally{
      squareScoreContext=null;
    }
  };

  function removeFinishPreview(){
    boardEl?.querySelectorAll('.square-finish-preview-v172').forEach(el=>el.remove());
  }

  function addFinishPreview(square){
    const [x,y,side]=square;
    const a=cellEls[y]?.[x],z=cellEls[y+side-1]?.[x+side-1];
    if(!a||!z)return;
    const e=document.createElement('i');e.className='square-finish-preview-v172';
    e.style.left=`${a.offsetLeft-2}px`;e.style.top=`${a.offsetTop-2}px`;
    e.style.width=`${z.offsetLeft+z.offsetWidth-a.offsetLeft+4}px`;
    e.style.height=`${z.offsetTop+z.offsetHeight-a.offsetTop+4}px`;
    e.dataset.side=String(side);
    boardEl.appendChild(e);
  }

  clearPreview=function(){
    removeFinishPreview();
    return previousClearPreview();
  };

  updatePreview=function(){
    const out=previousUpdatePreview();
    removeFinishPreview();
    if(state?.mode!=='SQUARES'||selectedPiece===null||!previewAnchor)return out;
    const shape=drag?.shape||state.tray?.[selectedPiece];
    if(!shape||!Core.canPlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.size))return out;
    const sim=Core.simulatePlace(state.board,shape,previewAnchor.x,previewAnchor.y,'SQUARES',state.size);
    const squares=sim?.waves?.[0]?.squares||[];
    if(!squares.length)return out;

    /* The player gets confirmation only at the exact finishing move, not a
       persistent construction hint. */
    boardEl.querySelectorAll('.preview-clear').forEach(c=>c.classList.remove('preview-clear'));
    squares.forEach(addFinishPreview);
    return out;
  };

  renderModeStat=function(){
    const out=previousRenderModeStat();
    if(state?.mode==='SQUARES'){
      const best=Number(state.squaresBestPerfectV172)||0;
      modeStatEl.textContent=best>=4?`BEST ${best}×${best}`:'PERFECT 4×4+';
      modeStatEl.classList.add('visible');
    }
    return out;
  };

  function squaresFromCells(cells,size){
    if(!Array.isArray(cells)||!cells.length)return [];
    const board=Core.emptyBoard(size);
    for(const [x,y] of cells)if(x>=0&&y>=0&&x<size&&y<size)board[y][x]=1;
    return scanPerfectSquares(board,size).squares;
  }

  function apexSound(side){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const level=Math.max(0,Math.min(3,side-7));
      const root=[392,440,493.88,523.25][level];
      const p=(side-6)/4;
      noiseBurst(.15+p*.08,.038+p*.014,2100+side*180);
      tone(46+side*2,.52+p*.18,'sawtooth',.052+p*.012,0,72+side*3);
      tone(root*.5,.40,'triangle',.038,.06,root*.72);
      const arp=[1,1.25,1.5,2,2.5,3];
      arp.slice(0,side===10?6:side===9?5:4).forEach((m,i)=>tone(root*m,.20+i*.035,'sine',.024,.22+i*.11));
      const d=side===10?1.15:side===9?.92:.76;
      tone(root,.48,'triangle',.041,d);
      tone(root*1.5,.56,'sine',.036,d+.08);
      tone(root*2,.66,'sine',.030,d+.17);
      if(side>=9)tone(root*2.5,.72,'sine',.023,d+.29);
      if(side===10){
        noiseBurst(.20,.035,6800,.44);
        tone(root*3,.84,'sine',.019,d+.42);
        tone(root*4,1.02,'sine',.014,d+.56);
      }
      haptic(side===10?[34,22,38,22,48,28,62]:side===9?[28,20,34,20,46]:[22,18,30,18,36]);
    });
  }

  function showApex(square){
    if(!boardEl||!square)return;
    clearTimeout(apexTimer);
    const side=Number(square[2])||7,serial=++apexSerial;
    boardEl.querySelectorAll('.square-apex-layer-v172').forEach(el=>el.remove());
    boardEl.classList.add('square-apex-active-v172',`square-apex-${side}-v172`);

    const life=side===10?3500:side===9?2850:side===8?2350:1950;
    const layer=document.createElement('div');
    layer.className=`square-apex-layer-v172 side-${side}-v172`;
    layer.style.setProperty('--square-apex-life-v172',`${life}ms`);

    const wash=document.createElement('i');wash.className='square-apex-wash-v172';layer.appendChild(wash);
    for(let i=0;i<(side===10?6:side===9?5:4);i++){
      const ring=document.createElement('i');ring.className='square-apex-ring-v172';
      ring.style.setProperty('--sq-ring-delay-v172',`${i*105}ms`);
      ring.style.setProperty('--sq-ring-size-v172',`${24+i*14}%`);
      layer.appendChild(ring);
    }

    const copy=document.createElement('div');copy.className='square-apex-copy-v172';
    const over=document.createElement('span');over.textContent='PERFECT';
    const main=document.createElement('b');main.textContent=`${side}×${side}`;
    const sub=document.createElement('em');sub.textContent=side===10?'FULL BOARD':side>=9?'MASTER SQUARE':'PERFECT SQUARE';
    copy.append(over,main,sub);layer.appendChild(copy);

    const sparks=side===10?54:side===9?42:side===8?34:28;
    for(let i=0;i<sparks;i++){
      const p=document.createElement('i');p.className='square-apex-spark-v172';
      p.style.setProperty('--sq-a-v172',`${i*(360/sparks)+(i%2?4:0)}deg`);
      p.style.setProperty('--sq-d-v172',`${120+(side-7)*26+(i%5)*13}px`);
      p.style.setProperty('--sq-delay-v172',`${(i%9)*24}ms`);
      layer.appendChild(p);
    }

    boardEl.appendChild(layer);
    apexSound(side);
    apexTimer=setTimeout(()=>{
      if(serial!==apexSerial)return;
      layer.remove();
      boardEl.classList.remove('square-apex-active-v172',`square-apex-${side}-v172`);
    },life+120);
  }

  burstCells=function(cells,wave=0){
    if(state?.mode==='SQUARES'){
      const squares=squaresFromCells(cells,state.size);
      const biggest=squares.sort((a,b)=>b[2]-a[2])[0];
      if(biggest?.[2]>=7){
        boardEl.classList.add('square-apex-active-v172');
        const out=previousBurstCells(cells,wave);
        requestAnimationFrame(()=>showApex(biggest));
        return out;
      }
    }
    return previousBurstCells(cells,wave);
  };

  modeDemoHTML=function(id){
    if(id!=='SQUARES')return previousModeDemoHTML(id);
    let cells='';
    for(let y=1;y<=4;y++)for(let x=0;x<4;x++)cells+=miniCell(x,y,'md-gold md-sq v172-perfect-cell');
    return `<div class="mode-demo demo-squares demo-squares-v172"><div class="mini-board">${cells}<i class="square-outline square-outline-v172"></i><b class="v172-perfect-tag">PERFECT</b></div></div>`;
  };

  queueMicrotask(()=>{
    try{
      if(state?.mode==='SQUARES'){
        state.squaresRulesVersionV172=VERSION;
        renderAll();scheduleSave(true);
      }
      buildMenu();renderMenu();
    }catch(_){ }
  });
})();
