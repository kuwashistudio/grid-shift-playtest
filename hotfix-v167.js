/* GRID SHIFT v1.6.7 — GRAVITY guide v2 + maximal chain payoff. */
(function(){
  'use strict';

  const VERSION=167;
  const GUIDE_SLOT=1;
  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray;
  const previousRenderBoard=renderBoard;
  const previousRenderAll=renderAll;
  const previousNewRun=newRun;
  const previousSaveNow=saveNow;
  const previousScheduleSave=scheduleSave;
  const previousLoadSlot=loadSlot;
  const previousEndGame=endGame;

  let guideActive=false;
  let guideStep=0;
  let guideComplete=false;
  let guideBestSnapshot=0;
  let guideBestChainSnapshot=0;
  let guideMissTimer=0;

  const GUIDE_BOARD=[
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,5,0,0,0,0,0],
    [0,2,0,0,1,0,2,0,0,0],
    [0,3,0,2,3,0,5,2,0,0],
    [0,3,1,2,2,5,1,1,0,4],
    [0,2,3,2,5,5,2,4,0,2],
    [0,5,2,3,3,3,5,2,1,2],
    [5,3,3,1,4,4,5,2,5,4],
    [5,3,3,1,4,3,5,2,2,3]
  ];

  /* Every guide piece is now a normal 3-cell gameplay piece. */
  const GUIDE_STEPS=[
    {id:'i3h', colors:[3,4,1], x:3, y:0},
    {id:'l3b', colors:[5,5,1], x:0, y:0},
    {id:'l3a', colors:[1,2,2], x:7, y:0},
    {id:'i3h', colors:[1,1,2], x:0, y:0}
  ];

  function isGravity(){return state?.mode==='GRAVITY';}
  function inGuide(){return guideActive&&isGravity();}
  function bestChain(){return Math.max(0,Number(state?.gravityBestChainV158)||0);}
  function clone(v){return Core.deepClone(v);}

  function shapeForStep(index=guideStep){
    const step=GUIDE_STEPS[index];
    if(!step)return null;
    const shape=clone(Core.SHAPE_BY_ID[step.id]);
    shape.cellColors=step.colors.slice();
    shape.color=shape.cellColors[0]||shape.color||1;
    return shape;
  }

  function cellKey(shape){return (shape?.cells||[]).map(([x,y])=>`${x},${y}`).sort().join('|');}
  function expectedShapeMatches(shape){
    const wanted=shapeForStep();
    return !!shape&&!!wanted&&cellKey(shape)===cellKey(wanted);
  }

  function setGuideTray(){
    state.tray=[null,shapeForStep(),null];
    state.trayHadClear=false;
    selectedPiece=null;
    previewAnchor=null;
  }

  function installGuideState(){
    const s=defaultState('GRAVITY',10);
    s.board=GUIDE_BOARD.map(r=>r.slice());
    s.best=guideBestSnapshot;
    s.gravityBestChainV158=Math.max(5,guideBestChainSnapshot);
    s.gravityGuideActiveV167=true;
    s.gravityGuideVersionV167=VERSION;
    state=s;
    guideStep=0;
    guideComplete=false;
    endingRun=false;
    resolving=false;
    selectedPiece=null;
    previewAnchor=null;
    drag=null;
    boardEl.classList.remove('run-over','bomb-detonate');
    trayEl.classList.remove('run-over');
    overOverlay.classList.remove('open');
    confirmOverlay.classList.remove('open');
    setGuideTray();
    renderAll();
  }

  function startGuide(){
    if(!isGravity()||resolving)return;
    guideBestSnapshot=Math.max(0,Number(state.best)||0);
    guideBestChainSnapshot=Math.max(0,Number(state.gravityBestChainV158)||0);
    guideActive=true;
    installGuideState();
    requestSound('start');
  }

  function stopGuide(){
    if(!guideActive)return;
    const best=guideBestSnapshot,chainBest=guideBestChainSnapshot;
    guideActive=false;guideComplete=false;guideStep=0;
    if(state){state.best=best;state.gravityBestChainV158=chainBest;delete state.gravityGuideActiveV167;}
    previousNewRun(true);
    if(state?.mode==='GRAVITY')state.gravityBestChainV158=chainBest;
    renderAll();
    previousScheduleSave(true);
  }

  function restartGuide(){
    if(!inGuide())return;
    clearTimeout(guideMissTimer);
    boardEl.classList.remove('gravity-guide-miss-v167');void boardEl.offsetWidth;boardEl.classList.add('gravity-guide-miss-v167');
    requestSound('bad');
    installGuideState();
    const box=document.getElementById('gravityGuideSwitchV167');
    if(box){box.classList.add('miss-v167');guideMissTimer=setTimeout(()=>box.classList.remove('miss-v167'),720);}
  }

  function ensureGuideUi(){
    const wrap=document.querySelector('.board-wrap');
    if(!wrap||document.getElementById('gravityGuideSwitchV167'))return;
    const box=document.createElement('div');
    box.id='gravityGuideSwitchV167';
    box.className='gravity-guide-switch-v167';
    const label=document.createElement('span');label.className='gravity-guide-label-v167';label.textContent='CHAIN GUIDE';
    const step=document.createElement('small');step.className='gravity-guide-step-v167';
    const toggle=document.createElement('button');
    toggle.type='button';toggle.className='gravity-guide-slider-v167';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','Chain Guide');
    const thumb=document.createElement('i');toggle.appendChild(thumb);
    toggle.addEventListener('click',()=>{
      if(resolving)return;
      if(guideActive)stopGuide();else if(isGravity())startGuide();
    });
    box.append(label,step,toggle);
    wrap.appendChild(box);
  }

  function syncGuideUi(){
    ensureGuideUi();
    const box=document.getElementById('gravityGuideSwitchV167');
    if(!box)return;
    box.classList.toggle('visible-v167',isGravity());
    if(!isGravity())return;
    const toggle=box.querySelector('.gravity-guide-slider-v167');
    const step=box.querySelector('.gravity-guide-step-v167');
    box.classList.toggle('on-v167',guideActive);
    box.classList.toggle('complete-v167',guideComplete);
    toggle.disabled=!!resolving;
    toggle.setAttribute('aria-checked',guideActive?'true':'false');
    if(!guideActive)step.textContent='';
    else if(guideComplete)step.textContent='5 CHAIN ✓';
    else step.textContent=`STEP ${guideStep+1}/4`;
  }

  function paintGuideTarget(){
    if(!inGuide()||guideComplete||resolving)return;
    const step=GUIDE_STEPS[guideStep],shape=shapeForStep();
    if(!step||!shape)return;
    shape.cells.forEach(([dx,dy],i)=>{
      const x=step.x+dx,y=step.y+dy,cell=cellEls[y]?.[x];
      if(!cell)return;
      const color=shape.cellColors?.[i]||shape.color||1,pal=PIECE_COLORS[color]||PIECE_COLORS[1];
      cell.classList.add('gravity-guide-target-v167');
      cell.style.setProperty('--guide-color-v167',pal.base);
      cell.style.setProperty('--guide-hi-v167',pal.hi);
    });
  }

  renderBoard=function(){const out=previousRenderBoard();paintGuideTarget();return out;};

  completeTray=function(){
    if(!inGuide())return previousCompleteTray();
    if(guideStep<GUIDE_STEPS.length-1){guideStep++;setGuideTray();renderAll();return true;}
    guideComplete=true;
    state.tray=[null,null,null];
    state.best=guideBestSnapshot;
    state.gravityBestChainV158=Math.max(5,guideBestChainSnapshot);
    renderAll();
    return true;
  };

  tryPlace=function(idx,x,y){
    if(!inGuide())return previousTryPlace(idx,x,y);
    if(guideComplete||resolving)return false;
    const step=GUIDE_STEPS[guideStep],shape=state.tray?.[idx];
    const correct=idx===GUIDE_SLOT&&x===step.x&&y===step.y&&expectedShapeMatches(shape);
    if(!correct){restartGuide();return false;}
    if(guideStep===GUIDE_STEPS.length-1){
      const sim=Core.simulatePlace(state.board,shape,x,y,'GRAVITY',state.size);
      if(!sim||sim.waves.length!==5){restartGuide();return false;}
    }
    return previousTryPlace(idx,x,y);
  };

  newRun=function(keepBest=true){if(inGuide()){restartGuide();return;}return previousNewRun(keepBest);};
  endGame=function(reason){if(inGuide())return;return previousEndGame(reason);};
  saveNow=async function(){if(inGuide())return;return previousSaveNow();};
  scheduleSave=function(immediate=false){if(inGuide())return;return previousScheduleSave(immediate);};

  renderAll=function(){
    if(inGuide()){state.best=guideBestSnapshot;state.gravityBestChainV158=Math.max(5,guideBestChainSnapshot);}
    const out=previousRenderAll();
    if(inGuide()){
      bestEl.textContent=guideBestSnapshot.toLocaleString();
      if(modeStatEl){modeStatEl.textContent='GUIDE';modeStatEl.classList.add('visible');modeStatEl.classList.remove('urgent');}
      paintGuideTarget();
    }
    syncGuideUi();
    return out;
  };

  loadSlot=async function(mode,size){
    const wasGuide=guideActive;
    await previousLoadSlot(mode,size);
    if(wasGuide){guideActive=false;guideComplete=false;guideStep=0;}
    syncGuideUi();
  };

  /* ---------- CHAIN CINEMA v1.6.7 ---------- */
  function clearChainFx(){
    const wrap=boardEl?.parentElement;
    wrap?.querySelectorAll('.gravity-chain-layer-v167,.gravity-chain-layer-v162,.gravity-chain-layer-v158').forEach(el=>el.remove());
    boardEl?.classList.remove('gravity-chain-charge-v167','gravity-chain-impact-v167','gravity-chain-apex-v167');
  }

  function fxLife(chain,isFinal){
    const base=chain===2?2100:chain===3?2450:chain===4?2850:chain===5?3500:Math.min(4300,3500+(chain-5)*220);
    return isFinal?base+420:base;
  }
  function holdMs(chain){return chain<=1?0:Math.min(1050,520+(chain-2)*130);}
  function gapMs(chain){return chain<=1?820:Math.min(1550,900+(chain-2)*150);}

  function showChainFx(chain,isFinal,isNewBest){
    if(chain<2||!boardEl)return;
    const wrap=boardEl.parentElement;if(!wrap)return;
    wrap.querySelectorAll('.gravity-chain-layer-v167,.gravity-chain-layer-v162,.gravity-chain-layer-v158').forEach(el=>el.remove());
    const life=fxLife(chain,isFinal);
    const layer=document.createElement('div');
    layer.className=`gravity-chain-layer-v167 chain-${Math.min(chain,10)}${isFinal?' final-v167':''}${isNewBest?' new-best-v167':''}`;
    layer.style.setProperty('--life-v167',`${life}ms`);
    layer.style.setProperty('--power-v167',String(Math.min(1,(chain-1)/6)));

    const flash=document.createElement('i');flash.className='gravity-chain-flash-v167';layer.appendChild(flash);
    for(let r=0;r<(chain>=5?4:chain>=3?3:2);r++){
      const ring=document.createElement('i');ring.className='gravity-chain-ring-v167';ring.style.setProperty('--ring-delay-v167',`${r*95}ms`);ring.style.setProperty('--ring-size-v167',`${28+r*17}%`);layer.appendChild(ring);
    }
    const copy=document.createElement('div');copy.className='gravity-chain-copy-v167';
    const num=document.createElement('b');num.textContent=String(chain);
    const word=document.createElement('span');word.textContent='CHAIN';copy.append(num,word);
    if(isNewBest){const nb=document.createElement('em');nb.textContent='NEW BEST';copy.appendChild(nb);}layer.appendChild(copy);

    const rays=chain>=5?30:chain===4?22:chain===3?18:14;
    for(let i=0;i<rays;i++){
      const p=document.createElement('i');p.className='gravity-chain-particle-v167';
      p.style.setProperty('--a-v167',`${i*(360/rays)+(chain%2?5:0)}deg`);
      p.style.setProperty('--d-v167',`${105+chain*19+(i%4)*12}px`);
      p.style.setProperty('--delay-v167',`${(i%7)*22}ms`);
      layer.appendChild(p);
    }
    if(chain>=4){
      const stars=document.createElement('div');stars.className='gravity-chain-stars-v167';
      for(let i=0;i<20+chain*3;i++){
        const s=document.createElement('i');s.style.left=`${(i*37)%100}%`;s.style.top=`${8+((i*61)%84)}%`;s.style.animationDelay=`${(i%9)*35}ms`;stars.appendChild(s);
      }
      layer.appendChild(stars);
    }
    wrap.appendChild(layer);
    setTimeout(()=>layer.remove(),life+120);
  }

  function anticipationSound(chain){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const root=[349.23,392,440,493.88,587.33,659.25,783.99][Math.min(6,Math.max(0,chain-2))];
      const p=Math.min(1,(chain-1)/6);
      noiseBurst(.16+p*.08,.020+p*.008,900+chain*100);
      tone(48+chain*4,.46+p*.14,'sine',.046+p*.010,0,92+chain*7);
      tone(root*.5,.34,'triangle',.032,.08,root*.78);
      tone(root,.18,'sine',.022,.24,root*1.18);
      tone(root*1.5,.12,'sine',.017,.38);
      if(chain>=4)tone(root*2,.14,'sine',.014,.46);
    });
  }

  function impactSound(chain,isFinal,isNewBest){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const roots=[392,440,493.88,587.33,659.25,783.99,880,987.77,1174.66];
      const root=roots[Math.min(roots.length-1,Math.max(0,chain-2))];
      const p=Math.min(1,(chain-1)/6);

      /* Sub hit + transient + wide harmonic stack. */
      noiseBurst(.16+p*.12,.058+p*.020,1800+chain*260);
      noiseBurst(.10+p*.06,.030+p*.014,5600+chain*300,.035);
      tone(44+chain*3,.46+p*.18,'sawtooth',.060+p*.016,0,82+chain*5);
      tone(88+chain*5,.34+p*.12,'triangle',.055+p*.014,.012,56+chain*3);
      tone(root,.34+p*.10,'sawtooth',.052+p*.012,.025);
      tone(root*1.25,.40+p*.12,'triangle',.050+p*.012,.075);
      tone(root*1.5,.46+p*.14,'triangle',.046+p*.012,.135);
      tone(root*2,.52+p*.16,'sine',.039+p*.011,.210);
      tone(root*2.5,.48+p*.14,'sine',.028+p*.009,.300);

      /* Sparkling arpeggio makes each higher chain feel like a reward reveal. */
      const arp=[1,1.25,1.5,2,2.5,3];
      arp.forEach((m,i)=>tone(root*m,.12+i*.018,'sine',.020+p*.005,.38+i*.09));
      if(chain>=4){
        tone(root*.5,.62,'triangle',.044,.20,root*.82);
        tone(root*3.5,.30,'sine',.017,.86);
      }
      if(chain>=5){
        noiseBurst(.22,.052,6800,.34);
        [2,2.5,3,4].forEach((m,i)=>tone(root*m,.24+i*.035,'sine',.024-i*.002,1.00+i*.12));
      }
      if(isFinal){
        const d=chain>=5?1.42:1.12;
        tone(root*.5,.48,'triangle',.052,d,root*.75);
        tone(root,.42,'triangle',.047,d+.05);
        tone(root*1.5,.48,'sine',.043,d+.12);
        tone(root*2,.58,'sine',.036,d+.20);
        if(chain>=5){tone(root*2.5,.62,'sine',.027,d+.32);tone(root*3,.72,'sine',.021,d+.44);}
      }
      if(isNewBest){
        const d=chain>=5?2.05:1.68;
        [2,2.5,3,4].forEach((m,i)=>tone(root*m,.24+i*.04,'sine',.024-i*.002,d+i*.11));
      }
      haptic(chain>=5?[30,22,34,22,46]:chain>=3?[22,22,28,20,34]:[18,20,24]);
    });
  }

  function visualImpact(chain){
    if(!boardEl)return;
    boardEl.classList.remove('gravity-chain-impact-v167','gravity-chain-apex-v167');void boardEl.offsetWidth;
    boardEl.style.setProperty('--impact-power-v167',String(Math.min(1,(chain-1)/5)));
    boardEl.classList.add('gravity-chain-impact-v167');if(chain>=5)boardEl.classList.add('gravity-chain-apex-v167');
    setTimeout(()=>boardEl?.classList.remove('gravity-chain-impact-v167','gravity-chain-apex-v167'),760+chain*95);
  }

  resolveGravityPlacement=function(idx,shape,sim){
    resolving=true;
    state.gravityCinematicVersionV167=VERSION;
    state.tray[idx]=null;state.moves++;state.score+=shape.cells.length;state.lastPlaced=sim.placed.map(c=>c.slice());
    state.board=Core.cloneBoard(sim.stages?.[0]?.board||sim.board);
    renderAll();pulsePlaced(sim.placed);beep('place',shape.cells.length);
    boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),260);

    let totalUnits=0,totalCells=0;sim.waves.forEach(w=>{totalUnits+=w.units;totalCells+=w.cells.length;});
    const comboTotal=sim.waves.length,priorBest=bestChain();
    let cursor=120;

    sim.waves.forEach((wave,i)=>{
      const chain=i+1,isFinal=chain===comboTotal,isNewBest=isFinal&&comboTotal>=2&&comboTotal>priorBest;
      if(chain===1){
        const at=cursor;
        setTimeout(()=>{burstCells(wave.cells,0);requestSound(wave.units>1?'multi':'clear');},at);
        setTimeout(()=>{state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);renderBoard();},at+175);
        cursor=at+gapMs(chain);return;
      }

      const revealAt=cursor,hold=holdMs(chain),burstAt=revealAt+hold,settleAt=burstAt+300+Math.min(210,(chain-2)*45);
      setTimeout(()=>{
        boardEl.classList.add('gravity-chain-charge-v167');
        showChainFx(chain,isFinal,isNewBest);
        anticipationSound(chain);
      },revealAt);
      setTimeout(()=>{
        boardEl.classList.remove('gravity-chain-charge-v167');
        visualImpact(chain);burstCells(wave.cells,0);impactSound(chain,isFinal,isNewBest);
      },burstAt);
      setTimeout(()=>{state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);renderBoard();},settleAt);
      cursor=settleAt+gapMs(chain);
    });

    const linger=comboTotal>=5?1900:comboTotal===4?1500:comboTotal===3?1200:comboTotal===2?1050:320;
    setTimeout(()=>{
      clearChainFx();
      state.board=Core.cloneBoard(sim.board);
      if(totalUnits>0){state.trayHadClear=true;state.score+=scoreClear(totalUnits,totalCells,Math.max(0,sim.waves.length-1));}
      if(comboTotal>=2&&comboTotal>priorBest)state.gravityBestChainV158=comboTotal;
      if(state.tray.every(p=>p===null))completeTray();
      if(state.score>state.best)state.best=state.score;
      resolving=false;selectedPiece=null;previewAnchor=null;renderAll();scheduleSave();
      if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
    },cursor+linger);
    return true;
  };

  queueMicrotask(()=>{
    try{
      document.getElementById('gravityGuideBarV166')?.remove();
      ensureGuideUi();syncGuideUi();
      if(state?.mode==='GRAVITY')state.gravityGuideVersionV167=VERSION;
    }catch(_){ }
  });
})();
