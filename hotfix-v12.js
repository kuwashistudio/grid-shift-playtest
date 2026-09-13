/* GRID SHIFT v1.2 playtest fixes */
(function(){
  'use strict';

  trayUnit=function(shape){
    const [w,h]=Core.shapeDims(shape),m=Math.max(w,h);
    if(h>w&&h>=5)return 13;
    if(h>w&&h===4)return 16;
    return m>=5?15:m===4?18:21;
  };

  renderModeStat=function(){
    if(!state)return;
    let txt=MODES[state.mode]?.title||state.mode;
    if(state.mode==='SHIFT')txt=`SHIFT ${SHIFT_GLYPH[state.nextShift]}`;
    modeStatEl.classList.remove('urgent');
    modeStatEl.classList.add('visible');
    blitzClockEl?.classList.remove('visible');
    modeStatEl.textContent=txt;
  };

  const renderTrayV11=renderTray;
  renderTray=function(){
    if(drag?.active)return;
    return renderTrayV11();
  };

  function gravityCelebrateV12(waveIndex){
    boardEl.classList.remove('gravity-wave-kick');void boardEl.offsetWidth;boardEl.classList.add('gravity-wave-kick');
    setTimeout(()=>boardEl.classList.remove('gravity-wave-kick'),330);
    const bloom=document.createElement('i');bloom.className='gravity-bloom';boardEl.appendChild(bloom);setTimeout(()=>bloom.remove(),620);
    if(waveIndex>0){
      const combo=document.createElement('b');combo.className='gravity-combo-v12';combo.textContent=`×${waveIndex+1}`;boardEl.appendChild(combo);setTimeout(()=>combo.remove(),780);
    }
  }

  resolveGravityPlacement=function(idx,shape,sim){
    resolving=true;
    state.tray[idx]=null;state.moves++;state.score+=shape.cells.length;state.lastPlaced=sim.placed.map(c=>c.slice());
    state.board=Core.cloneBoard(sim.stages?.[0]?.board||sim.board);
    renderAll();pulsePlaced(sim.placed);beep('place',shape.cells.length);
    boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),210);
    let totalUnits=0,totalCells=0;sim.waves.forEach(w=>{totalUnits+=w.units;totalCells+=w.cells.length;});
    const waveGap=360;
    sim.waves.forEach((wave,i)=>{
      const t=i*waveGap+100;
      setTimeout(()=>{
        burstCells(wave.cells,0);gravityCelebrateV12(i);
        if(i===0)requestSound(wave.units>1?'multi':'clear');else requestSound('gravityChain',i+1);
        if(i>0){const pulse=document.createElement('i');pulse.className='gravity-chain-pulse';boardEl.appendChild(pulse);setTimeout(()=>pulse.remove(),520);}
      },t);
      setTimeout(()=>{
        state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);renderBoard();
        boardEl.classList.remove('gravity-settle');void boardEl.offsetWidth;boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),210);
      },t+185);
    });
    const doneAt=100+sim.waves.length*waveGap+70;
    setTimeout(()=>{
      state.board=Core.cloneBoard(sim.board);
      if(totalUnits>0){state.trayHadClear=true;const cascade=Math.max(0,sim.waves.length-1);state.score+=scoreClear(totalUnits,totalCells,cascade);}
      if(state.tray.every(p=>p===null))completeTray();
      if(state.score>state.best)state.best=state.score;
      resolving=false;selectedPiece=null;previewAnchor=null;renderAll();scheduleSave();
      if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
    },doneAt);
    return true;
  };

  try{if(state){renderModeStat();if(!drag?.active)renderTray();}}catch(_){ }
})();
