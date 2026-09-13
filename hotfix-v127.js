/* GRID SHIFT v1.2.7 — RUSH pressure is driven only by successful placements */
(function(){
  'use strict';

  /* Kill the original clock loop's RUSH mutation path completely. */
  frame=function(now){
    lastFrame=now;
    timerFrame=requestAnimationFrame(frame);
  };

  function resetRushClockState(){
    if(!state||state.mode!=='BLITZ')return;
    blitzArmed=false;
    state.blitzMs=0;
    state.rushWarning=null;
  }

  function rushCadence(moves){
    if(moves<12)return 3;
    if(moves<28)return 2;
    return 1;
  }

  function choosePressureCell(){
    const empty=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
      if(!state.board[y][x])empty.push({x,y});
    }
    if(!empty.length)return null;

    const recent=Array.isArray(state.lastPlaced)?state.lastPlaced:[];
    const scored=empty.map(p=>{
      const dist=recent.length?Math.min(...recent.map(([x,y])=>Math.abs(x-p.x)+Math.abs(y-p.y))):6;
      let row=0,col=0;
      for(let i=0;i<state.size;i++){
        row+=state.board[p.y][i]?1:0;
        col+=state.board[i][p.x]?1:0;
      }
      return {...p,dist,line:Math.max(row,col)};
    });
    let pool=scored.filter(p=>p.dist>=3&&p.line<=8);
    if(pool.length<5)pool=scored.filter(p=>p.line<=8);
    if(!pool.length)pool=scored;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function addRushPressure(){
    if(!state||state.mode!=='BLITZ'||state.gameOver)return;
    const p=choosePressureCell();
    if(!p){endGame('');return;}

    resolving=true;
    state.rushWarning={x:p.x,y:p.y,ms:0};
    renderBoard();
    requestSound('danger');

    setTimeout(()=>{
      if(!state||state.mode!=='BLITZ'||state.gameOver){resolving=false;return;}
      const w=state.rushWarning;
      state.rushWarning=null;
      if(w&&!state.board[w.y][w.x]){
        state.board[w.y][w.x]=6;
        queueFx('rushSpawn',{x:w.x,y:w.y});
        requestSound('rush');
      }
      blitzArmed=false;
      state.blitzMs=0;
      resolving=false;
      renderAll();
      scheduleSave(true);
      if(!state.gameOver&&!state.tray.some(piece=>piece&&Core.hasModePlacement(state.board,piece,state.size,state.mode)))endGame('');
    },260);
  }

  /* Wrap the real placement function once. A pressure block is created only when
     moves increases, never because time passes. */
  const baseTryPlace=tryPlace;
  tryPlace=function(idx,x,y){
    const isRush=state?.mode==='BLITZ';
    if(isRush){blitzArmed=false;state.blitzMs=0;state.rushWarning=null;}
    const before=Number(state?.moves)||0;
    const ok=baseTryPlace(idx,x,y);
    if(!ok||!isRush||!state||state.gameOver)return ok;
    const after=Number(state.moves)||0;
    if(after<=before)return ok;
    blitzArmed=false;state.blitzMs=0;state.rushWarning=null;
    if(after%rushCadence(after)===0)addRushPressure();
    return ok;
  };

  const baseLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='BLITZ'){
      resetRushClockState();
      renderAll();
      scheduleSave(true);
    }
  };

  const baseNewRun=newRun;
  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='BLITZ')resetRushClockState();
    return out;
  };

  queueMicrotask(()=>{try{resetRushClockState();}catch(_){ }});
})();
