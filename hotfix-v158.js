/* GRID SHIFT v1.5.8 — GRAVITY mastery feedback.
   Research direction: graded, success-dependent feedback that preserves curiosity.
   - Chain 1 stays restrained; 2+ chains escalate in distinct audiovisual tiers.
   - Hidden milestone tiers at 3 / 5 / 7 / 10+ create discovery without advertising rewards.
   - BEST CHAIN persists across new runs and only appears after the player earns 2+.
   - GRAVITY placement preview shows only the first clear wave; later cascades remain a discovery.
*/
(function(){
  'use strict';

  const VERSION=158;
  const previousUpdatePreview=updatePreview;
  const previousRenderAll=renderAll;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;

  function isGravity(){return state?.mode==='GRAVITY';}
  function bestChain(){return Math.max(0,Number(state?.gravityBestChainV158)||0);}
  function ensureGravityState(){
    if(!isGravity())return;
    state.gravityRewardVersionV158=VERSION;
    state.gravityBestChainV158=bestChain();
  }

  function tierFor(chain){
    if(chain>=10)return 10;
    if(chain>=7)return 7;
    if(chain>=5)return 5;
    if(chain>=3)return 3;
    if(chain>=2)return 2;
    return 1;
  }

  function syncBestChainStat(){
    const el=document.getElementById('modeStat');
    if(!el||!isGravity())return;
    ensureGravityState();
    const best=bestChain();
    if(best>=2){
      el.textContent=`BEST CHAIN ${best}`;
      el.setAttribute('aria-hidden','false');
      el.classList.add('gravity-best-v158');
    }else{
      el.classList.remove('gravity-best-v158');
    }
  }

  function pruneGravityPreview(){
    if(!isGravity()||selectedPiece===null||!previewAnchor)return;
    const shape=drag?.shape||state.tray?.[selectedPiece];
    if(!shape||!Core.canPlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.size))return;
    const sim=Core.simulatePlace(state.board,shape,previewAnchor.x,previewAnchor.y,'GRAVITY',state.size);
    const first=new Set((sim?.waves?.[0]?.cells||[]).map(([x,y])=>`${x},${y}`));
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
      const c=cellEls[y]?.[x];
      if(c?.classList.contains('preview-clear')&&!first.has(`${x},${y}`))c.classList.remove('preview-clear');
    }
  }

  updatePreview=function(){
    const out=previousUpdatePreview();
    pruneGravityPreview();
    return out;
  };

  function playGravityChainSound(chain,isFinal,isNewBest){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const notes=[440,523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.51];
      const f=notes[Math.min(notes.length-1,Math.max(0,chain-2))];
      const tier=tierFor(chain);

      if(tier===2){
        tone(f,.07,'sine',.043);
        tone(f*1.5,.065,'triangle',.021,.035);
        haptic(7);
      }else if(tier===3){
        tone(155,.09,'triangle',.024);
        tone(f,.078,'sine',.045,.008);
        tone(f*1.25,.085,'triangle',.027,.046);
        haptic([7,18,8]);
      }else if(tier===5){
        noiseBurst(.035,.014,3000,.018);
        tone(132,.13,'triangle',.031,0,176);
        tone(f,.09,'sine',.047,.035);
        tone(f*1.25,.115,'triangle',.031,.068);
        tone(f*1.5,.12,'sine',.020,.098);
        haptic([10,20,13]);
      }else if(tier===7){
        noiseBurst(.045,.016,3600,.015);
        tone(118,.15,'triangle',.034,0,176);
        tone(f,.095,'sine',.047,.03);
        tone(f*1.2,.115,'triangle',.031,.064);
        tone(f*1.5,.135,'sine',.024,.10);
        tone(f*2,.10,'sine',.014,.145);
        haptic([11,18,11,18,14]);
      }else{
        noiseBurst(.055,.017,4100,.012);
        tone(104,.18,'triangle',.038,0,196);
        tone(f,.10,'sine',.048,.036);
        tone(f*1.25,.13,'triangle',.033,.07);
        tone(f*1.5,.15,'sine',.026,.11);
        tone(f*2,.15,'sine',.017,.16);
        haptic([13,18,13,18,18]);
      }

      if(isFinal&&chain>=3){
        const resolve=Math.min(1320,f*1.12246);
        tone(resolve,.12,'sine',chain>=7?.025:.017,chain>=5?.19:.15);
      }
      if(isFinal&&isNewBest&&chain>=2){
        tone(Math.min(1500,f*2.25),.11,'sine',.016,chain>=5?.25:.20);
      }
    });
  }

  function clearOldChainLayer(wrap){
    wrap?.querySelectorAll('.gravity-chain-layer-v158').forEach(el=>el.remove());
  }

  function showGravityChainFx(chain,isFinal,isNewBest){
    if(chain<2||!boardEl)return;
    const wrap=boardEl.parentElement;
    if(!wrap)return;
    clearOldChainLayer(wrap);

    const tier=tierFor(chain);
    const layer=document.createElement('div');
    layer.className=`gravity-chain-layer-v158 tier-${tier}${isFinal?' final-v158':''}${isNewBest?' new-best-v158':''}`;

    const halo=document.createElement('i');
    halo.className='gravity-chain-halo-v158';
    layer.appendChild(halo);

    if(tier>=5){
      const wash=document.createElement('i');
      wash.className='gravity-chain-wash-v158';
      layer.appendChild(wash);
    }

    const copy=document.createElement('div');
    copy.className='gravity-chain-copy-v158';
    const num=document.createElement('b');num.textContent=String(chain);
    const word=document.createElement('span');word.textContent='CHAIN';
    copy.append(num,word);
    if(isNewBest){
      const nb=document.createElement('em');nb.textContent='NEW BEST';copy.appendChild(nb);
    }
    layer.appendChild(copy);

    const rect=boardEl.getBoundingClientRect();
    const count=tier>=10?14:tier>=7?10:tier>=5?8:tier>=3?5:0;
    const distance=Math.max(42,Math.min(132,rect.width*(tier>=10?.34:tier>=7?.30:tier>=5?.26:.21)));
    for(let i=0;i<count;i++){
      const p=document.createElement('i');
      p.className='gravity-chain-ray-v158';
      p.style.setProperty('--a',`${(360/count)*i+(chain%2?9:0)}deg`);
      p.style.setProperty('--d',`${distance*(.82+(i%3)*.09)}px`);
      p.style.setProperty('--ray-delay',`${(i%4)*9}ms`);
      layer.appendChild(p);
    }

    wrap.appendChild(layer);
    const life=isFinal?(tier>=7?940:820):360;
    setTimeout(()=>layer.remove(),life);
  }

  /* Replace the GRAVITY resolver only. The board mechanics, score formula and
     wave cadence stay unchanged; only feedback and mastery tracking change. */
  resolveGravityPlacement=function(idx,shape,sim){
    ensureGravityState();
    resolving=true;
    state.tray[idx]=null;
    state.moves++;
    state.score+=shape.cells.length;
    state.lastPlaced=sim.placed.map(c=>c.slice());
    state.board=Core.cloneBoard(sim.stages?.[0]?.board||sim.board);
    renderAll();
    pulsePlaced(sim.placed);
    beep('place',shape.cells.length);
    boardEl.classList.add('gravity-settle');
    setTimeout(()=>boardEl.classList.remove('gravity-settle'),190);

    let totalUnits=0,totalCells=0;
    sim.waves.forEach(w=>{totalUnits+=w.units;totalCells+=w.cells.length;});

    const comboTotal=sim.waves.length;
    const priorBest=bestChain();
    const waveGap=245;

    sim.waves.forEach((wave,i)=>{
      const t=i*waveGap+80;
      const chain=i+1;
      const isFinal=chain===comboTotal;
      const isNewBest=isFinal&&comboTotal>=2&&comboTotal>priorBest;

      setTimeout(()=>{
        burstCells(wave.cells,0);
        if(chain===1){
          requestSound(wave.units>1?'multi':'clear');
        }else{
          showGravityChainFx(chain,isFinal,isNewBest);
          playGravityChainSound(chain,isFinal,isNewBest);
        }
      },t);

      setTimeout(()=>{
        state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);
        renderBoard();
        boardEl.classList.remove('gravity-settle');void boardEl.offsetWidth;boardEl.classList.add('gravity-settle');
        setTimeout(()=>boardEl.classList.remove('gravity-settle'),190);
      },t+105);
    });

    const doneAt=80+sim.waves.length*waveGap+80;
    setTimeout(()=>{
      state.board=Core.cloneBoard(sim.board);
      if(totalUnits>0){
        state.trayHadClear=true;
        const cascade=Math.max(0,sim.waves.length-1);
        state.score+=scoreClear(totalUnits,totalCells,cascade);
      }
      if(comboTotal>=2&&comboTotal>priorBest)state.gravityBestChainV158=comboTotal;
      if(state.tray.every(p=>p===null))completeTray();
      if(state.score>state.best)state.best=state.score;
      resolving=false;
      selectedPiece=null;
      previewAnchor=null;
      renderAll();
      scheduleSave();
      if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
    },doneAt);
    return true;
  };

  renderAll=function(){
    const out=previousRenderAll();
    syncBestChainStat();
    return out;
  };

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(isGravity()){
      ensureGravityState();
      renderAll();
      scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const carryBest=isGravity()?bestChain():0;
    const out=previousNewRun(keepBest);
    if(isGravity()){
      state.gravityRewardVersionV158=VERSION;
      state.gravityBestChainV158=carryBest;
      renderAll();
      scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{if(isGravity()){ensureGravityState();syncBestChainStat();}}catch(_){ }
  });
})();
