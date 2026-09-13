/* GRID SHIFT v1.4.1 — BOMBS: mandatory bomb-first round
   Each 3-piece tray begins with exactly one armed carrier. The other two pieces are
   locked until the carrier is placed. The carrier is chosen only from pieces that
   can be placed FIRST while still leaving a route to place both remaining pieces.
   This removes the dominant "save the bomb for last" strategy without creating an
   unfair tray that needed a different piece first. */
(function(){
  'use strict';

  const FORCE_VERSION=141;
  const FUSE=4;

  const baseRenderTray=renderTray;
  const baseRotateTrayPiece=rotateTrayPiece;
  const baseStartDrag=startDrag;
  const baseCompleteTray=completeTray;
  const baseRenderModeStat=renderModeStat;
  const baseLoadSlot=loadSlot;
  const baseNewRun=newRun;

  function liveIds(tray){
    return (tray||[]).map((p,i)=>p?i:-1).filter(i=>i>=0);
  }

  function carrierIndex(){
    if(state?.mode!=='BOMBS')return -1;
    const c=state.bombCargo;
    if(!c||!Number.isInteger(c.idx)||!state.tray?.[c.idx])return -1;
    return c.idx;
  }

  function clearBombMarks(){
    for(const p of state?.tray||[]){
      if(!p)continue;
      delete p.bombCell;
      delete p.bombFuse;
    }
  }

  function chooseBombCell(shape){
    if(!shape?.cells?.length)return [0,0];
    const cx=shape.cells.reduce((s,c)=>s+c[0],0)/shape.cells.length;
    const cy=shape.cells.reduce((s,c)=>s+c[1],0)/shape.cells.length;
    const ranked=shape.cells
      .map(([x,y])=>({x,y,d:Math.abs(x-cx)+Math.abs(y-cy)}))
      .sort((a,b)=>b.d-a.d);
    const pool=ranked.slice(0,Math.max(1,Math.ceil(ranked.length*.65)));
    const p=pool[Math.floor(Math.random()*pool.length)];
    return [p.x,p.y];
  }

  function hasPlacementAfter(board,piece,size){
    if(!piece)return false;
    for(const shape of Core.modeRotations(piece,'BOMBS')){
      if(Core.placements(board,shape,size).length)return true;
    }
    return false;
  }

  /* With only two pieces remaining, do an exact two-step check. We intentionally
     ignore the bomb's extra 3x3 reward while planning: a real blast only removes
     more cells, so a route proven here remains safe in actual play. */
  function remainingTwoFit(board,tray,a,b,size){
    for(const secondIdx of [a,b]){
      const thirdIdx=secondIdx===a?b:a;
      const piece=tray[secondIdx];
      if(!piece)continue;
      for(const shape of Core.modeRotations(piece,'BOMBS')){
        for(const [x,y] of Core.placements(board,shape,size)){
          const sim=Core.simulatePlace(board,shape,x,y,'BOMBS',size);
          if(sim&&hasPlacementAfter(sim.board,tray[thirdIdx],size))return true;
        }
      }
    }
    return false;
  }

  function carrierCanLead(board,tray,idx,size){
    const rest=liveIds(tray).filter(i=>i!==idx);
    if(rest.length!==2)return false;
    const piece=tray[idx];
    if(!piece)return false;
    for(const shape of Core.modeRotations(piece,'BOMBS')){
      for(const [x,y] of Core.placements(board,shape,size)){
        const sim=Core.simulatePlace(board,shape,x,y,'BOMBS',size);
        if(sim&&remainingTwoFit(sim.board,tray,rest[0],rest[1],size))return true;
      }
    }
    return false;
  }

  function chooseSafeCarrier(){
    const ids=liveIds(state.tray);
    if(ids.length!==3)return -1;
    /* Prefer a real polyomino so the forced decision is spatially interesting, but
       fairness wins: if only a small piece can safely lead, use it. */
    const preferred=ids.filter(i=>state.tray[i].cells.length>=3);
    const order=[...preferred.sort(()=>Math.random()-.5),...ids.filter(i=>!preferred.includes(i)).sort(()=>Math.random()-.5)];
    for(const idx of order){
      if(carrierCanLead(state.board,state.tray,idx,state.size))return idx;
    }
    return -1;
  }

  function installSafeCarrier({freshTray=false}={}){
    if(state?.mode!=='BOMBS'||state.gameOver)return;
    if(freshTray||liveIds(state.tray).length!==3){
      state.tray=Core.generateFairTray(state.board,'BOMBS',state.size,Math.random,state.moves);
    }
    clearBombMarks();
    let idx=chooseSafeCarrier();
    /* generateFairTray already guarantees a complete route in some order. This is
       an emergency guard only; a second fair tray should make a fixed-first route
       discoverable even if a malformed legacy tray slipped through. */
    if(idx<0){
      state.tray=Core.generateFairTray(state.board,'BOMBS',state.size,Math.random,state.moves);
      idx=chooseSafeCarrier();
    }
    if(idx<0)idx=liveIds(state.tray)[0]??-1;
    if(idx<0)return;
    const [x,y]=chooseBombCell(state.tray[idx]);
    state.bombCargo={idx,x,y,fuse:FUSE};
    state.bombCargoDone=false;
    state.bombFirstVersion=FORCE_VERSION;
  }

  /* Lock the two support pieces. Disabled is deliberate: they cannot be dragged,
     tapped to rotate, or accidentally selected until the bomb has been planted. */
  renderTray=function(){
    const out=baseRenderTray();
    if(state?.mode!=='BOMBS')return out;
    const forced=carrierIndex();
    if(forced<0)return out;
    trayEl.querySelectorAll('.piece-wrap').forEach((wrap,i)=>{
      const piece=state.tray?.[i];
      if(!piece)return;
      if(i===forced){
        wrap.classList.add('bomb-first-v141');
        wrap.setAttribute('aria-label','Bomb piece — place this first');
      }else{
        wrap.classList.add('bomb-locked-v141');
        wrap.disabled=true;
        wrap.setAttribute('aria-disabled','true');
      }
    });
    return out;
  };

  rotateTrayPiece=function(idx,wrap=null){
    if(state?.mode==='BOMBS'){
      const forced=carrierIndex();
      if(forced>=0&&idx!==forced)return false;
    }
    return baseRotateTrayPiece(idx,wrap);
  };

  startDrag=function(e,idx,wrap){
    if(state?.mode==='BOMBS'){
      const forced=carrierIndex();
      if(forced>=0&&idx!==forced){e?.preventDefault?.();return;}
    }
    return baseStartDrag(e,idx,wrap);
  };

  completeTray=function(){
    if(state?.mode!=='BOMBS')return baseCompleteTray();
    const out=baseCompleteTray();
    if(!state.gameOver)installSafeCarrier();
    return out;
  };

  /* The bomb drawn on the carrier is the instruction. Keep the top status devoted
     only to bombs that are already ticking on the board. */
  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode!=='BOMBS')return;
    const min=state.bombs?.length?Math.min(...state.bombs.map(b=>b.t)):null;
    modeStatEl.textContent=min===null?'●':`●  ${min}`;
    modeStatEl.classList.toggle('urgent',min!==null&&min<=2);
    modeStatEl.classList.add('visible');
  };

  function upgradeRound(){
    if(state?.mode!=='BOMBS'||state.gameOver)return;
    if(state.bombFirstVersion!==FORCE_VERSION){
      /* Preserve board, score, best and any live bombs. Only replace the current
         three-piece tray once so the new mandatory-first rule begins fairly. */
      installSafeCarrier({freshTray:true});
    }else if(carrierIndex()<0&&liveIds(state.tray).length===3&&!state.bombCargoDone){
      installSafeCarrier();
    }
  }

  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='BOMBS'){
      upgradeRound();renderAll();scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='BOMBS'){
      state.bombFirstVersion=FORCE_VERSION;
      installSafeCarrier();renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{
      if(state?.mode==='BOMBS'){upgradeRound();renderAll();scheduleSave(true);}
    }catch(_){ }
  });
})();
