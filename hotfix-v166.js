/* GRID SHIFT v1.6.6 — GRAVITY CHAIN GUIDE.
   Optional, non-scoring tutorial lane. Follow four highlighted drops to trigger
   a deterministic 5-chain. Any valid placement away from the guide restarts it.
   Guide score / BEST CHAIN are never persisted or awarded. */
(function(){
  'use strict';

  const VERSION=166;
  const GUIDE_SLOT=1;

  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray;
  const previousRenderBoard=renderBoard;
  const previousRenderAll=renderAll;
  const previousNewRun=newRun;
  const previousEndGame=endGame;
  const previousSaveNow=saveNow;
  const previousScheduleSave=scheduleSave;
  const previousLoadSlot=loadSlot;

  let guideActive=false;
  let guideStep=0;
  let guideComplete=false;
  let guideBestSnapshot=0;
  let guideBestChainSnapshot=0;
  let guideFlashTimer=0;

  /* Stable 10×10 field. Three harmless setup drops rebuild the missing top
     cells; the fourth drop is the trigger. The resulting waves are exactly
     5 / 5 / 6 / 5 / 5 cells under the current GRAVITY rules. */
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

  const GUIDE_STEPS=[
    {id:'i3h', colors:[3,4,1], x:3, y:0, label:'SET THE FIRST KEY'},
    {id:'i2h', colors:[5,5],   x:0, y:0, label:'BUILD THE STACK'},
    {id:'i2h', colors:[2,2],   x:8, y:0, label:'FINISH THE SETUP'},
    {id:'dot', colors:[2],     x:2, y:0, label:'TRIGGER 5 CHAIN'}
  ];

  function isGravity(){return state?.mode==='GRAVITY';}
  function inGuide(){return guideActive&&isGravity();}

  function shapeForStep(index=guideStep){
    const step=GUIDE_STEPS[index];
    if(!step)return null;
    const shape=Core.deepClone(Core.SHAPE_BY_ID[step.id]);
    shape.cellColors=step.colors.slice();
    shape.color=shape.cellColors[0]||shape.color||1;
    return shape;
  }

  function cellKey(shape){
    return (shape?.cells||[]).map(([x,y])=>`${x},${y}`).sort().join('|');
  }

  function expectedShapeMatches(shape){
    const wanted=shapeForStep();
    return !!shape&&!!wanted&&cellKey(shape)===cellKey(wanted);
  }

  function setGuideTray(){
    const piece=shapeForStep();
    state.tray=[null,piece,null];
    state.trayHadClear=false;
    selectedPiece=null;
    previewAnchor=null;
  }

  function installGuideState(){
    const size=10;
    const s=defaultState('GRAVITY',size);
    s.board=GUIDE_BOARD.map(r=>r.slice());
    s.best=guideBestSnapshot;
    /* Keep the internal chain record at least 5 while the guide is active so
       the scripted demonstration can never emit NEW BEST. The real record is
       restored when GUIDE is turned off. */
    s.gravityBestChainV158=Math.max(5,guideBestChainSnapshot);
    s.gravityGuideVersionV166=VERSION;
    s.gravityGuideActiveV166=true;
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

  function stopGuideToNormal(){
    if(!guideActive)return;
    const best=guideBestSnapshot;
    const chainBest=guideBestChainSnapshot;
    guideActive=false;
    guideComplete=false;
    guideStep=0;
    if(state){
      state.best=best;
      state.gravityBestChainV158=chainBest;
      delete state.gravityGuideActiveV166;
    }
    previousNewRun(true);
    if(state?.mode==='GRAVITY')state.gravityBestChainV158=chainBest;
    renderAll();
    previousScheduleSave(true);
  }

  function restartGuide(message='TRY AGAIN'){
    if(!inGuide())return;
    clearTimeout(guideFlashTimer);
    boardEl.classList.remove('gravity-guide-miss-v166');
    void boardEl.offsetWidth;
    boardEl.classList.add('gravity-guide-miss-v166');
    requestSound('bad');
    installGuideState();
    const bar=document.getElementById('gravityGuidePromptV166');
    if(bar){
      bar.textContent=message;
      bar.classList.add('miss-v166');
      guideFlashTimer=setTimeout(()=>{bar.classList.remove('miss-v166');syncGuideUi();},720);
    }
  }

  function ensureGuideUi(){
    const zone=document.querySelector('.tray-zone');
    if(!zone||document.getElementById('gravityGuideBarV166'))return;
    const bar=document.createElement('div');
    bar.id='gravityGuideBarV166';
    bar.className='gravity-guide-bar-v166';

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.id='gravityGuideToggleV166';
    toggle.className='gravity-guide-toggle-v166';
    toggle.addEventListener('click',()=>{
      if(resolving)return;
      if(guideActive)stopGuideToNormal();
      else if(isGravity())startGuide();
    });

    const prompt=document.createElement('div');
    prompt.id='gravityGuidePromptV166';
    prompt.className='gravity-guide-prompt-v166';

    bar.append(toggle,prompt);
    zone.insertBefore(bar,trayEl);
  }

  function syncGuideUi(){
    ensureGuideUi();
    const bar=document.getElementById('gravityGuideBarV166');
    const toggle=document.getElementById('gravityGuideToggleV166');
    const prompt=document.getElementById('gravityGuidePromptV166');
    if(!bar||!toggle||!prompt)return;

    const visible=isGravity();
    bar.classList.toggle('visible-v166',visible);
    if(!visible)return;

    toggle.disabled=!!resolving;
    toggle.setAttribute('aria-pressed',guideActive?'true':'false');

    if(!guideActive){
      toggle.textContent='CHAIN GUIDE  ○';
      prompt.textContent='';
      bar.classList.remove('active-v166','complete-v166');
      return;
    }

    bar.classList.add('active-v166');
    if(guideComplete){
      bar.classList.add('complete-v166');
      toggle.textContent='NORMAL PLAY';
      prompt.textContent='GUIDE COMPLETE  •  5 CHAIN';
      return;
    }

    bar.classList.remove('complete-v166');
    toggle.textContent='CHAIN GUIDE  ●';
    const step=GUIDE_STEPS[guideStep];
    prompt.textContent=`${guideStep+1}/${GUIDE_STEPS.length}  •  ${step?.label||'FOLLOW THE GLOW'}`;
  }

  function paintGuideTarget(){
    if(!inGuide()||guideComplete||resolving)return;
    const step=GUIDE_STEPS[guideStep],shape=shapeForStep();
    if(!step||!shape)return;
    shape.cells.forEach(([dx,dy],i)=>{
      const x=step.x+dx,y=step.y+dy;
      const cell=cellEls[y]?.[x];
      if(!cell)return;
      const color=shape.cellColors?.[i]||shape.color||1;
      const pal=PIECE_COLORS[color]||PIECE_COLORS[1];
      cell.classList.add('gravity-guide-target-v166');
      cell.style.setProperty('--guide-color-v166',pal.base);
      cell.style.setProperty('--guide-hi-v166',pal.hi);
      cell.dataset.guideOrder=String(i+1);
    });
  }

  renderBoard=function(){
    const out=previousRenderBoard();
    paintGuideTarget();
    return out;
  };

  completeTray=function(){
    if(!inGuide())return previousCompleteTray();
    if(guideStep<GUIDE_STEPS.length-1){
      guideStep++;
      setGuideTray();
      renderAll();
      return true;
    }
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

    const step=GUIDE_STEPS[guideStep];
    const shape=state.tray?.[idx];
    const correct=idx===GUIDE_SLOT&&x===step.x&&y===step.y&&expectedShapeMatches(shape);
    if(!correct){
      restartGuide('MISS  •  BACK TO 1/4');
      return false;
    }

    /* Final sanity guard: the tutorial promise is exactly five waves. */
    if(guideStep===GUIDE_STEPS.length-1){
      const sim=Core.simulatePlace(state.board,shape,x,y,'GRAVITY',state.size);
      if(!sim||sim.waves.length!==5){
        restartGuide('RESET  •  TRY AGAIN');
        return false;
      }
    }
    return previousTryPlace(idx,x,y);
  };

  newRun=function(keepBest=true){
    if(inGuide()){
      restartGuide('GUIDE RESTART');
      return;
    }
    return previousNewRun(keepBest);
  };

  endGame=function(reason){
    if(inGuide())return;
    return previousEndGame(reason);
  };

  saveNow=async function(){
    if(inGuide())return;
    return previousSaveNow();
  };

  scheduleSave=function(immediate=false){
    if(inGuide())return;
    return previousScheduleSave(immediate);
  };

  renderAll=function(){
    if(inGuide()){
      state.best=guideBestSnapshot;
      state.gravityBestChainV158=Math.max(5,guideBestChainSnapshot);
    }
    const out=previousRenderAll();
    if(inGuide()){
      /* Never display the synthetic internal 5 as the player's record. */
      bestEl.textContent=guideBestSnapshot.toLocaleString();
      if(modeStatEl){
        modeStatEl.textContent='GUIDE';
        modeStatEl.classList.add('visible');
        modeStatEl.classList.remove('urgent');
      }
      paintGuideTarget();
    }
    syncGuideUi();
    return out;
  };

  loadSlot=async function(mode,size){
    const wasGuide=guideActive;
    /* Keep guideActive true during the wrapped load so its initial saveNow is
       suppressed. This prevents the tutorial field from replacing a real save. */
    await previousLoadSlot(mode,size);
    if(wasGuide){
      guideActive=false;
      guideComplete=false;
      guideStep=0;
      if(mode==='GRAVITY'){
        state.gravityBestChainV158=guideBestChainSnapshot;
        previousNewRun(true);
      }
    }
    syncGuideUi();
  };

  queueMicrotask(()=>{
    try{
      guideActive=false;
      ensureGuideUi();
      syncGuideUi();
    }catch(_){ }
  });
})();
