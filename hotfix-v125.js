/* GRID SHIFT v1.2.5 — RUSH is move-driven, not time-driven */
(function(){
  'use strict';

  /* RUSH pressure now advances only when the player successfully places a piece.
     No timer may mutate the board while the player is thinking or dragging. */
  frame=function(now){
    lastFrame=now;
    timerFrame=requestAnimationFrame(frame);
  };

  function rushEvery(moves){
    if(moves<12)return 3;   // opening: +1 pressure block every 3 placements
    if(moves<28)return 2;   // mid game: every 2 placements
    return 1;               // late game: every placement
  }

  function clearLegacyRushTimer(){
    if(!state||state.mode!=='BLITZ')return;
    blitzArmed=false;
    state.blitzMs=0;
    state.rushWarning=null;
  }

  function dropPressureAfterMove(){
    if(!state||state.mode!=='BLITZ'||state.gameOver)return;
    const every=rushEvery(state.moves);
    if(state.moves%every!==0)return;

    /* Lock piece input during the short warning/drop animation. This makes the
       board transition atomic and removes the drag/spawn race entirely. */
    resolving=true;
    const cells=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
      if(!state.board[y][x])cells.push({x,y});
    }
    if(!cells.length){resolving=false;endGame('');return;}

    const recent=Array.isArray(state.lastPlaced)?state.lastPlaced:[];
    const scored=cells.map(p=>{
      const dist=recent.length?Math.min(...recent.map(([x,y])=>Math.abs(x-p.x)+Math.abs(y-p.y))):6;
      let row=0,col=0;
      for(let i=0;i<state.size;i++){row+=state.board[p.y][i]?1:0;col+=state.board[i][p.x]?1:0;}
      return {...p,dist,line=Math.max(row,col)};
    });
    let pool=scored.filter(p=>p.dist>=3&&p.line<=8);
    if(!pool.length)pool=scored;
    const p=pool[Math.floor(Math.random()*pool.length)];

    state.rushWarning={x:p.x,y:p.y,ms:0};
    renderBoard();requestSound('danger');

    setTimeout(()=>{
      if(!state||state.mode!=='BLITZ'||state.gameOver){resolving=false;return;}
      const w=state.rushWarning;state.rushWarning=null;
      if(w&&!state.board[w.y][w.x]){
        state.board[w.y][w.x]=6;
        queueFx('rushSpawn',{x:w.x,y:w.y});
        requestSound('rush');
      }
      blitzArmed=false;state.blitzMs=0;
      resolving=false;
      renderAll();scheduleSave();
      if(!state.gameOver&&!state.tray.some(piece=>piece&&Core.hasModePlacement(state.board,piece,state.size,state.mode)))endGame('');
    },260);
  }

  const tryPlaceV124=tryPlace;
  tryPlace=function(idx,x,y){
    const rush=state?.mode==='BLITZ';
    if(rush)clearLegacyRushTimer();
    const beforeMoves=Number(state?.moves)||0;
    const ok=tryPlaceV124(idx,x,y);
    if(!ok||!rush||!state||state.gameOver)return ok;
    clearLegacyRushTimer();
    if((Number(state.moves)||0)>beforeMoves)dropPressureAfterMove();
    return ok;
  };

  const loadSlotV124=loadSlot;
  loadSlot=async function(mode,size){
    await loadSlotV124(mode,size);
    if(state?.mode==='BLITZ'){
      clearLegacyRushTimer();
      renderAll();scheduleSave();
    }
  };

  const newRunV124=newRun;
  newRun=function(keepBest=true){
    const out=newRunV124(keepBest);
    if(state?.mode==='BLITZ')clearLegacyRushTimer();
    return out;
  };

  queueMicrotask(()=>{try{clearLegacyRushTimer();}catch(_){ }});
})();
