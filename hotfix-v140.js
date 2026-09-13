/* GRID SHIFT v1.4.0 — BOMBS: the player places the bomb
   One of the three tray pieces carries a visible ●4 on one of its cells.
   Where that piece is placed becomes the bomb position. Existing bombs count down
   on later moves; the newly planted bomb does not lose a turn immediately.
   Clearing a row/column through a bomb still triggers the visible 3x3 controlled
   blast from v1.3.8/1.3.9, including adjacent-bomb chain reactions.
*/
(function(){
  'use strict';

  const BOMB_ENGINE_VERSION=140;
  const CARGO_FUSE=4;

  const baseTryPlace=tryPlace;
  const baseTickBombs=tickBombs;
  const baseSpawnBomb=spawnBomb;
  const baseCompleteTray=completeTray;
  const baseRenderTray=renderTray;
  const baseMakePiece=makePiece;
  const baseRotateTrayPiece=rotateTrayPiece;
  const baseRenderModeStat=renderModeStat;
  const baseLoadSlot=loadSlot;
  const baseNewRun=newRun;
  const baseModeDemoHTML=modeDemoHTML;

  function k(x,y){return `${x},${y}`;}

  function validCargo(){
    const c=state?.bombCargo;
    if(state?.mode!=='BOMBS'||!c||!Number.isInteger(c.idx))return false;
    const shape=state.tray?.[c.idx];
    if(!shape||!Array.isArray(shape.cells))return false;
    return shape.cells.some(([x,y])=>x===c.x&&y===c.y);
  }

  function clearCargoDecoration(){
    for(const p of state?.tray||[]){
      if(!p)continue;
      delete p.bombCell;delete p.bombFuse;
    }
  }

  function decorateCargo(){
    if(state?.mode!=='BOMBS')return;
    clearCargoDecoration();
    if(!validCargo())return;
    const c=state.bombCargo,p=state.tray[c.idx];
    p.bombCell=[c.x,c.y];p.bombFuse=c.fuse||CARGO_FUSE;
  }

  function chooseCargoIndex(){
    const ids=(state.tray||[]).map((p,i)=>p?i:-1).filter(i=>i>=0);
    if(!ids.length)return -1;
    /* A bomb on a medium/large piece creates a real placement choice. Avoid dots
       and dominoes when a more interesting carrier is available. */
    const interesting=ids.filter(i=>state.tray[i].cells.length>=3);
    const pool=interesting.length?interesting:ids;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function chooseCargoCell(shape){
    if(!shape?.cells?.length)return [0,0];
    /* Keep variety, but mildly prefer cells away from the exact centroid so rotation
       can change the bomb's landing position in a visible, strategic way. */
    const cx=shape.cells.reduce((s,c)=>s+c[0],0)/shape.cells.length;
    const cy=shape.cells.reduce((s,c)=>s+c[1],0)/shape.cells.length;
    const ranked=shape.cells.map(([x,y])=>({x,y,d:Math.abs(x-cx)+Math.abs(y-cy)})).sort((a,b)=>b.d-a.d);
    const pool=ranked.slice(0,Math.max(1,Math.ceil(ranked.length*.65)));
    const p=pool[Math.floor(Math.random()*pool.length)];
    return [p.x,p.y];
  }

  function armCargo(force=false){
    if(state?.mode!=='BOMBS'||state.gameOver)return;
    if(validCargo()){decorateCargo();return;}
    if(!force&&state.bombCargoDone)return;
    const idx=chooseCargoIndex();if(idx<0)return;
    const [x,y]=chooseCargoCell(state.tray[idx]);
    state.bombCargo={idx,x,y,fuse:CARGO_FUSE};
    state.bombCargoDone=false;
    decorateCargo();
  }

  function rotateCoord(shape,coord){
    if(!shape||!coord)return coord;
    const h=Math.max(...shape.cells.map(c=>c[1]))+1;
    const raw=shape.cells.map(([x,y])=>[h-1-y,x]);
    const minX=Math.min(...raw.map(c=>c[0])),minY=Math.min(...raw.map(c=>c[1]));
    return [h-1-coord[1]-minX,coord[0]-minY];
  }

  /* Carry the marker with the physical piece when the player rotates it. */
  rotateTrayPiece=function(idx,wrap=null){
    if(state?.mode!=='BOMBS'||!validCargo()||state.bombCargo.idx!==idx)return baseRotateTrayPiece(idx,wrap);
    const oldShape=state.tray[idx],old=[state.bombCargo.x,state.bombCargo.y];
    const next=rotateCoord(oldShape,old);
    const ok=baseRotateTrayPiece(idx,wrap);
    if(ok){
      state.bombCargo.x=next[0];state.bombCargo.y=next[1];
      decorateCargo();renderTray();scheduleSave();
    }
    return ok;
  };

  /* The same ●4 marker is rendered in the tray and in the lifted drag ghost. */
  makePiece=function(shape,role='tray',unit=null,gap=null){
    const art=baseMakePiece(shape,role,unit,gap);
    if(state?.mode==='BOMBS'&&Array.isArray(shape?.bombCell)){
      const [bx,by]=shape.bombCell;
      const i=shape.cells.findIndex(([x,y])=>x===bx&&y===by);
      const block=art.querySelectorAll('.piece-block')[i];
      if(block){block.classList.add('bomb-cargo-v140');block.dataset.bomb=String(shape.bombFuse||CARGO_FUSE);}
    }
    return art;
  };

  renderTray=function(){
    if(state?.mode==='BOMBS')decorateCargo();
    const out=baseRenderTray();
    if(state?.mode==='BOMBS'&&validCargo()){
      trayEl.querySelector(`.piece-wrap[data-idx="${state.bombCargo.idx}"]`)?.classList.add('bomb-carrier-v140');
    }
    return out;
  };

  /* Random board spawning is retired. Bombs enter play only through the marked
     tray piece, so the player owns the placement decision. */
  spawnBomb=function(avoidCells=[]){
    if(state?.mode==='BOMBS')return false;
    return baseSpawnBomb(avoidCells);
  };

  /* Existing bombs lose one turn after each successful placement. The bomb planted
     by that very placement stays at 4, so the number shown on the tray is truthful. */
  tickBombs=function(){
    if(state?.mode!=='BOMBS')return baseTickBombs();
    if(!Array.isArray(state.bombs)||!state.bombs.length){state.bombFreshKey=null;return;}
    const fresh=state.bombFreshKey||null;
    for(const b of state.bombs){if(k(b.x,b.y)!==fresh)b.t--;}
    state.bombFreshKey=null;
    const doomed=state.bombs.find(b=>b.t<=0);
    if(doomed){triggerBombGameOver(doomed);return;}
    const min=Math.min(...state.bombs.map(b=>b.t));
    if(min<=2)beep('danger');
  };

  /* v1.3.8's controlled-blast engine remains authoritative. We insert the cargo
     bomb into state.bombs before the normal placement path scans line clears; this
     means a bomb can be deliberately planted straight into a completed line and
     detonate immediately. */
  tryPlace=function(idx,x,y){
    if(state?.mode!=='BOMBS')return baseTryPlace(idx,x,y);
    if(state.gameOver||resolving)return false;

    decorateCargo();
    const shape=state.tray[idx];
    if(!shape||!Core.canPlace(state.board,shape,x,y,state.size))return false;

    const carrier=validCargo()&&state.bombCargo.idx===idx;
    let planted=null,oldCargo=null,oldDone=!!state.bombCargoDone;
    if(carrier){
      oldCargo={...state.bombCargo};
      const local=Array.isArray(shape.bombCell)?shape.bombCell:[oldCargo.x,oldCargo.y];
      planted={x:x+local[0],y:y+local[1],t:CARGO_FUSE,source:'player',uid:`p${Date.now()}_${Math.random().toString(36).slice(2,7)}`};
      state.bombs.push(planted);
      state.bombFreshKey=k(planted.x,planted.y);
      state.bombCargo=null;
      state.bombCargoDone=true;
      delete shape.bombCell;delete shape.bombFuse;
    }

    const ok=baseTryPlace(idx,x,y);
    if(!ok&&carrier){
      state.bombs=state.bombs.filter(b=>b.uid!==planted.uid);
      state.bombFreshKey=null;
      state.bombCargo=oldCargo;
      state.bombCargoDone=oldDone;
      decorateCargo();renderAll();
    }
    return ok;
  };

  completeTray=function(){
    if(state?.mode!=='BOMBS')return baseCompleteTray();
    const out=baseCompleteTray();
    if(!state.gameOver){
      state.bombCargo=null;state.bombCargoDone=false;
      armCargo(true);
    }
    return out;
  };

  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode!=='BOMBS')return;
    const min=state.bombs?.length?Math.min(...state.bombs.map(b=>b.t)):null;
    const ready=validCargo();
    if(min===null)modeStatEl.textContent=ready?'●4  ON PIECE':'●';
    else modeStatEl.textContent=ready?`● ${min}   +●4`:`● ${min}`;
    modeStatEl.classList.toggle('urgent',min!==null&&min<=2);
    modeStatEl.classList.add('visible');
  };

  function upgradeBombMode(){
    if(state?.mode!=='BOMBS')return;
    if(state.bombEngineVersion!==BOMB_ENGINE_VERSION){
      /* Remove legacy randomly spawned bombs so the new rule starts unambiguously.
         Only old bomb cells are cleared; the rest of the board, score and best stay. */
      for(const b of state.bombs||[]){
        if(Number.isInteger(b?.x)&&Number.isInteger(b?.y)&&state.board?.[b.y]?.[b.x]===6)state.board[b.y][b.x]=0;
      }
      state.bombs=[];state.bombRubble=[];state.bombLastBlast=null;state.bombFreshKey=null;
      state.bombCargo=null;state.bombCargoDone=false;state.bombEngineVersion=BOMB_ENGINE_VERSION;
      armCargo(true);
    }else{
      state.bombRubble=[];state.bombFreshKey=null;
      if(validCargo())decorateCargo();
      else if(!state.bombCargoDone)armCargo(true);
    }
  }

  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='BOMBS'){
      upgradeBombMode();renderAll();scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='BOMBS'){
      state.bombs=[];state.bombRubble=[];state.bombLastBlast=null;state.bombFreshKey=null;
      state.bombCargo=null;state.bombCargoDone=false;state.bombEngineVersion=BOMB_ENGINE_VERSION;
      armCargo(true);renderAll();scheduleSave(true);
    }
    return out;
  };

  /* Menu demo now teaches the defining rule: the bomb arrives ON a piece. */
  modeDemoHTML=function(id){
    if(id!=='BOMBS')return baseModeDemoHTML(id);
    const cells=miniCell(1,0,'md-blue bomb-piece-cell-v140')+miniCell(1,1,'md-blue bomb-piece-cell-v140')+miniCell(2,1,'md-blue bomb-piece-cell-v140');
    return `<div class="mode-demo demo-bombs demo-bombs-v140"><div class="mini-board">${cells}<b class="bomb-piece-core-v140">4</b><em class="bomb-piece-arrow-v140">↓</em><i class="bomb-demo-zone-v140"></i></div></div>`;
  };

  queueMicrotask(()=>{
    try{
      buildMenu();renderMenu();
      if(state?.mode==='BOMBS'){upgradeBombMode();renderAll();scheduleSave(true);}
    }catch(_){ }
  });
})();
