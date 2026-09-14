/* GRID SHIFT v1.4.8 — SHIFT onboarding + 3-move round semantics
   Goals:
   - Teach that one SHIFT round is exactly three placed pieces.
   - ① -> ② is a within-the-round objective, not something that must be hit every move.
   - Never fire a wave early. Resolve STABLE/WAVE only after the third piece.
   - If ② is touched before ①, show a brief warning but allow recovery in the same round.
   - Make the first three rounds easier by choosing closer targets from a proven two-piece route.
*/
(function(){
  'use strict';

  const VERSION=148;
  const previousTryPlace=tryPlace;
  const previousCompleteTray=completeTray;
  const previousApplyShiftRound=applyShiftRound;
  const previousRenderBoard=renderBoard;
  const previousRenderAll=renderAll;
  const previousRenderModeStat=renderModeStat;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;

  let early2Timer=0;

  function isShift(){return state?.mode==='SHIFT';}
  function roundIndex(){return Math.floor((Number(state?.moves)||0)/3);}
  function tutorialRound(){return isShift()&&roundIndex()<3;}
  function touch(anchor,cells){return !!(anchor&&Array.isArray(cells)&&cells.some(([x,y])=>x===anchor.x&&y===anchor.y));}
  function shuffle(a){const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}

  function syncAnchorFlags(){
    if(!isShift()||!Array.isArray(state.shiftAnchors)||state.shiftAnchors.length!==2)return;
    const step=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
    state.shiftStep=step;
    state.shiftAnchors.forEach((a,i)=>{
      a.order=i+1;
      a.hit=step>i;
      a.wrong=false;
    });
  }

  /* ---------- Friendly first three rounds ---------- */
  function placementRecords(board,piece,cap=42){
    const out=[];
    if(!piece)return out;
    for(const shape of Core.modeRotations(piece,'SHIFT')){
      for(const [x,y] of Core.placements(board,shape,state.size)){
        out.push({shape,x,y,cells:shape.cells.map(([dx,dy])=>[x+dx,y+dy])});
      }
    }
    const mixed=shuffle(out);
    return mixed.length>cap?mixed.slice(0,cap):mixed;
  }

  function friendlyMission(level){
    if(!isShift()||!Array.isArray(state.tray)||state.tray.filter(Boolean).length!==3)return null;
    const ids=[0,1,2].filter(i=>state.tray[i]);
    const ideal=[2,3,4][Math.max(0,Math.min(2,level))]||3;
    const candidates=[];
    let nodes=0;

    for(const firstIdx of shuffle(ids)){
      for(const first of placementRecords(state.board,state.tray[firstIdx],38)){
        if(++nodes>1900)break;
        const sim1=Core.simulatePlace(state.board,first.shape,first.x,first.y,'SHIFT',state.size);
        if(!sim1)continue;
        for(const secondIdx of shuffle(ids.filter(i=>i!==firstIdx))){
          for(const second of placementRecords(sim1.board,state.tray[secondIdx],34)){
            if(++nodes>1900)break;
            for(const [x1,y1] of first.cells){
              for(const [x2,y2] of second.cells){
                if(x1===x2&&y1===y2)continue;
                const dist=Math.abs(x1-x2)+Math.abs(y1-y2);
                if(dist<1||dist>6)continue;
                const edge1=Math.min(x1,y1,state.size-1-x1,state.size-1-y1);
                const edge2=Math.min(x2,y2,state.size-1-x2,state.size-1-y2);
                const central=Math.min(edge1,2)+Math.min(edge2,2);
                const score=90-Math.abs(dist-ideal)*15+central*3+Math.random()*8;
                candidates.push({a1:{x:x1,y:y1,order:1,hit:false},a2:{x:x2,y:y2,order:2,hit:false},score});
                if(candidates.length>=80)break;
              }
              if(candidates.length>=80)break;
            }
            if(candidates.length>=80||nodes>1900)break;
          }
          if(candidates.length>=80||nodes>1900)break;
        }
        if(candidates.length>=80||nodes>1900)break;
      }
      if(candidates.length>=80||nodes>1900)break;
    }
    if(!candidates.length)return null;
    candidates.sort((a,b)=>b.score-a.score);
    const top=candidates.slice(0,Math.min(10,candidates.length));
    const pick=top[Math.floor(Math.random()*top.length)];
    return [pick.a1,pick.a2];
  }

  function maybeFriendlyMission(){
    if(!tutorialRound()||state.shiftRoundResolved||Number(state.shiftMissionMoves)>0)return;
    const m=friendlyMission(roundIndex());
    if(!m)return;
    state.shiftAnchors=m;
    state.shiftStep=0;
    state.shiftMissionFailed=false;
    state.shiftRoundResolved=false;
    state.shiftOutcome='';
    syncAnchorFlags();
  }

  /* ---------- Round guide ---------- */
  function ensureGuide(){
    let guide=document.getElementById('shiftGuideV148');
    const shell=document.querySelector('.game-shell');
    const boardWrap=document.querySelector('.board-wrap');
    if(!shell||!boardWrap)return null;
    if(!guide){
      guide=document.createElement('div');
      guide.id='shiftGuideV148';
      guide.className='shift-guide-v148';
      guide.innerHTML=''
        +'<div class="shift-guide-main-v148">'
        +'<span class="shift-guide-label-v148"></span>'
        +'<span class="shift-pips-v148"><i></i><i></i><i></i></span>'
        +'<span class="shift-goal-v148"><b class="g1">①</b><em>→</em><b class="g2">②</b></span>'
        +'</div>'
        +'<div class="shift-wave-v148"><small></small><b></b></div>';
    }
    const modeBadge=document.getElementById('modeBadgeV143');
    if(modeBadge&&modeBadge.nextSibling!==guide)modeBadge.after(guide);
    else if(!guide.isConnected)shell.insertBefore(guide,boardWrap);
    return guide;
  }

  function patternInfo(){
    const p=String(state?.shiftPattern||'');
    if(p==='V_DOWN')return {axis:'COLS',glyph:'↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑'};
    if(p==='H_LEFT')return {axis:'ROWS',glyph:'← → ← → ← → ← → ← →'};
    if(p==='H_RIGHT')return {axis:'ROWS',glyph:'→ ← → ← → ← → ← → ←'};
    return {axis:'COLS',glyph:'↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓'};
  }

  function syncGuide(){
    const guide=ensureGuide();
    if(!guide)return;
    const active=isShift();
    guide.hidden=!active;
    if(!active)return;

    const intro=tutorialRound();
    const placed=Math.max(0,Math.min(3,Number(state.shiftMissionMoves)||0));
    const step=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
    guide.classList.toggle('intro-v148',intro);
    guide.querySelector('.shift-guide-label-v148').textContent=intro?'3 PIECES = 1 ROUND':'ROUND';
    guide.querySelectorAll('.shift-pips-v148 i').forEach((p,i)=>p.classList.toggle('spent',i<placed));
    const g1=guide.querySelector('.shift-goal-v148 .g1'),g2=guide.querySelector('.shift-goal-v148 .g2');
    g1.classList.toggle('done',step>=1);g1.classList.toggle('current',step===0);
    g2.classList.toggle('done',step>=2);g2.classList.toggle('current',step===1);
    const info=patternInfo();
    guide.querySelector('.shift-wave-v148 small').textContent=intro?'IF MISSED':'MISS';
    guide.querySelector('.shift-wave-v148 b').textContent=`${info.axis}  ${info.glyph}`;
  }

  function flashEarlyTwo(){
    if(!isShift())return;
    state.shiftEarly2V148=true;
    clearTimeout(early2Timer);
    early2Timer=setTimeout(()=>{
      if(state){state.shiftEarly2V148=false;if(isShift())renderBoard();}
    },650);
  }

  function advanceMissionV148(cells){
    if(!isShift()||state.shiftRoundResolved||!Array.isArray(state.shiftAnchors)||state.shiftAnchors.length!==2)return '';
    syncAnchorFlags();
    const a1=state.shiftAnchors[0],a2=state.shiftAnchors[1];
    const h1=touch(a1,cells),h2=touch(a2,cells);

    if(state.shiftStep===0){
      if(h1){
        state.shiftStep=1;
        syncAnchorFlags();
        requestSound('anchorStep',1);
        announce('① SET  •  NEXT ②',true);
        return 'one';
      }
      if(h2){
        flashEarlyTwo();
        requestSound('sequenceBad');
        announce('② AFTER ①',false);
        return 'early2';
      }
    }else if(state.shiftStep===1&&h2){
      state.shiftStep=2;
      syncAnchorFlags();
      requestSound('anchorStep',2);
      announce('② SET  •  FINISH ROUND',true);
      return 'two';
    }
    return '';
  }

  /* Resolve only at the end of the three-piece tray. The v1.3.6 resolver still
     owns the actual wave/stabilize mechanics; we only change WHEN it is invoked. */
  applyShiftRound=function(){
    if(!isShift())return previousApplyShiftRound();
    if(state.shiftRoundResolved)return;
    state.shiftMissionFailed=state.shiftStep<2;
    return previousApplyShiftRound();
  };

  completeTray=function(){
    if(!isShift())return previousCompleteTray();
    const out=previousCompleteTray();
    if(!state.gameOver){
      state.shiftOnboardingVersion=VERSION;
      state.shiftEarly2V148=false;
      maybeFriendlyMission();
      syncGuide();
    }
    return out;
  };

  /* Single authoritative SHIFT placement path for v1.4.8. */
  tryPlace=function(idx,x,y){
    if(!isShift())return previousTryPlace(idx,x,y);
    if(state.gameOver||resolving)return false;

    const shape=state.tray[idx];
    if(!shape||!Core.canPlace(state.board,shape,x,y,state.size))return false;
    const sim=Core.simulatePlace(state.board,shape,x,y,'SHIFT',state.size);
    if(!sim)return false;

    state.board=sim.board;
    state.tray[idx]=null;
    state.moves++;
    state.score+=shape.cells.length;
    state.lastPlaced=sim.placed.map(c=>c.slice());
    queueFx('placed',sim.placed);
    beep('place',shape.cells.length);

    let totalUnits=0,totalCells=0;
    sim.waves.forEach((wave,i)=>{
      totalUnits+=wave.units;totalCells+=wave.cells.length;queueFx('burst',{cells:wave.cells,wave:i});
    });
    if(totalUnits>0){
      state.trayHadClear=true;
      const gain=scoreClear(totalUnits,totalCells,Math.max(0,sim.waves.length-1));
      state.score+=gain;
      announce(totalUnits>1?`${totalUnits} CLEAR  +${gain}`:`CLEAR  +${gain}`,totalUnits>1);
      beep(totalUnits>1?'multi':'clear');
    }

    if(!state.shiftRoundResolved){
      state.shiftMissionMoves=Math.max(0,Number(state.shiftMissionMoves)||0)+1;
      advanceMissionV148(sim.placed);
      /* Deliberately no wave/stabilize here. Even a mathematically failed round
         remains playable until piece three, so first-time players learn the rhythm. */
    }

    const trayFinished=state.tray.every(p=>p===null);
    if(trayFinished)completeTray();

    if(state.score>state.best)state.best=state.score;
    selectedPiece=null;previewAnchor=null;
    renderAll();scheduleSave();
    if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('NO MOVES');
    return true;
  };

  renderBoard=function(){
    const out=previousRenderBoard();
    if(isShift()&&!state.shiftRoundResolved&&state.shiftEarly2V148&&Array.isArray(state.shiftAnchors)){
      const a2=state.shiftAnchors[1];
      cellEls[a2?.y]?.[a2?.x]?.classList.add('shift-early2-v148');
    }
    return out;
  };

  renderModeStat=function(){
    previousRenderModeStat();
    if(!isShift())return;
    const step=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
    modeStatEl.textContent=step===0?'①  →  ②':step===1?'① ✓  →  ②':'① ✓   ② ✓';
    modeStatEl.classList.add('visible');
  };

  renderAll=function(){
    const out=previousRenderAll();
    syncGuide();
    return out;
  };

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(isShift()&&!state.gameOver){
      /* Do not move targets in the middle of an existing three-piece round. */
      if(Number(state.shiftMissionMoves)===0)maybeFriendlyMission();
      state.shiftOnboardingVersion=VERSION;
      renderAll();scheduleSave(true);
    }else syncGuide();
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(isShift()&&!state.gameOver){
      state.shiftOnboardingVersion=VERSION;
      state.shiftMissionMoves=0;
      state.shiftEarly2V148=false;
      maybeFriendlyMission();
      renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{
      if(isShift()&&!state.gameOver){
        if(Number(state.shiftMissionMoves)===0)maybeFriendlyMission();
        state.shiftOnboardingVersion=VERSION;
        renderAll();scheduleSave(true);
      }else syncGuide();
    }catch(_){ }
  });
})();
