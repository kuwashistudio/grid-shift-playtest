/* GRID SHIFT v1.3.4 — SHIFT mission transaction fix + clearer ordered targets */
(function(){
  'use strict';

  function validShiftMission(){
    return !!(state&&state.mode==='SHIFT'&&Array.isArray(state.shiftAnchors)&&state.shiftAnchors.length===2);
  }

  function hit(anchor,cells){
    return !!(anchor&&Array.isArray(cells)&&cells.some(([x,y])=>x===anchor.x&&y===anchor.y));
  }

  function syncFlags(){
    if(!validShiftMission())return;
    const step=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
    const failed=!!state.shiftMissionFailed;
    state.shiftStep=step;
    state.shiftAnchors.forEach((a,i)=>{
      a.order=i+1;
      a.hit=!failed&&step>i;
      a.wrong=failed;
    });
  }

  function snapshotMission(){
    return {
      step:Number(state.shiftStep)||0,
      failed:!!state.shiftMissionFailed,
      anchors:Array.isArray(state.shiftAnchors)?state.shiftAnchors.map(a=>({...a})):null
    };
  }

  function restoreMission(snap){
    if(!snap)return;
    state.shiftStep=snap.step;
    state.shiftMissionFailed=snap.failed;
    if(snap.anchors)state.shiftAnchors=snap.anchors.map(a=>({...a}));
    syncFlags();
  }

  /* Apply the sequence result BEFORE the underlying placement reaches completeTray().
     This removes the third-piece race where the tray can resolve the WAVE before ②
     has been committed to the mission state. */
  function preCommitMission(cells){
    if(!validShiftMission()||state.shiftMissionFailed||state.shiftStep>=2)return null;
    const a1=state.shiftAnchors[0],a2=state.shiftAnchors[1];
    const h1=hit(a1,cells),h2=hit(a2,cells);
    const before=Number(state.shiftStep)||0;
    let result=null;

    if(before===0){
      /* Touching ② before ① — including touching both in one piece — breaks order. */
      if(h2){state.shiftMissionFailed=true;result='bad';}
      else if(h1){state.shiftStep=1;result='one';}
    }else if(before===1&&h2){
      state.shiftStep=2;result='two';
    }
    syncFlags();
    return result;
  }

  function intendedCells(idx,x,y){
    const piece=state?.tray?.[idx];
    if(!piece)return null;
    if(!Core.canPlace(state.board,piece,x,y,state.size))return null;
    return piece.cells.map(([dx,dy])=>[x+dx,y+dy]);
  }

  const previousTryPlace=tryPlace;
  tryPlace=function(idx,x,y){
    if(state?.mode!=='SHIFT')return previousTryPlace(idx,x,y);

    const cells=intendedCells(idx,x,y);
    if(!cells||state.gameOver||resolving)return previousTryPlace(idx,x,y);

    const snap=snapshotMission();
    const roundBefore=Number(state.shiftRoundId)||0;
    const result=preCommitMission(cells);

    const ok=previousTryPlace(idx,x,y);
    if(!ok){
      restoreMission(snap);
      renderAll();
      return ok;
    }

    /* If the third piece completed the tray, v1.3.3 has already resolved the
       round and created the next mission. Never write the old mission back. */
    const sameRound=(Number(state.shiftRoundId)||0)===roundBefore;
    if(sameRound){
      syncFlags();
      if(result==='one'){
        requestSound('anchorStep',1);
        announce('① LOCKED  •  NEXT ②',true);
      }else if(result==='two'){
        requestSound('anchorStep',2);
        announce('② LOCKED  •  STABILIZED',true);
      }else if(result==='bad'){
        requestSound('sequenceBad');
        announce('ORDER BROKEN  •  WAVE INCOMING',true);
      }
      renderAll();scheduleSave();
    }
    return ok;
  };

  /* Clean old v1.3.1/v1.3.2 target styling after their render wrappers run,
     then render one unambiguous numbered badge per target. */
  const previousRenderBoard=renderBoard;
  renderBoard=function(){
    const out=previousRenderBoard();
    if(state?.mode==='SHIFT'&&validShiftMission()){
      syncFlags();
      state.shiftAnchors.forEach((a,i)=>{
        const c=cellEls[a.y]?.[a.x];if(!c)return;
        c.classList.remove('shift-anchor-v131','shift-anchor-v132','anchor-secured-v131');
        c.classList.add('shift-order-v134');
        c.dataset.orderGlyph=String(i+1);
        c.classList.toggle('order-current-v134',!state.shiftMissionFailed&&state.shiftStep===i);
        c.classList.toggle('order-locked-v134',!state.shiftMissionFailed&&i===1&&state.shiftStep===0);
        c.classList.toggle('order-done-v134',!state.shiftMissionFailed&&state.shiftStep>i);
        c.classList.toggle('order-failed-v134',!!state.shiftMissionFailed);
      });
    }
    return out;
  };

  /* Defensive normalization for saved runs. Do not change valid progress. */
  const previousLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(state?.mode==='SHIFT'&&validShiftMission()){
      state.shiftStep=Math.max(0,Math.min(2,Number(state.shiftStep)||0));
      state.shiftMissionFailed=!!state.shiftMissionFailed;
      syncFlags();renderAll();scheduleSave(true);
    }
  };

  queueMicrotask(()=>{try{if(state?.mode==='SHIFT'){syncFlags();renderAll();}}catch(_){ }});
})();
