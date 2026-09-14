/* GRID SHIFT v1.5.0 — SHIFT: the final piece must read as the trigger, not as spare time.
   - At 2/3 moves with no clear yet, the pip counter is replaced by NEXT MOVE -> SHIFT.
   - If the round is already stable, the warning disappears and STABLE remains.
   - While dragging the final piece, a placement that would clear a line previews CLEAR -> STABLE.
*/
(function(){
  'use strict';

  const previousRenderAll=renderAll;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;

  function isShift(){return state?.mode==='SHIFT'&&state?.shiftRulesVersion===149;}

  function guide(){return document.getElementById('shiftGuideV149');}

  function ensureCue(){
    const g=guide();if(!g)return null;
    let cue=g.querySelector('.shift-last-v150');
    if(!cue){
      cue=document.createElement('span');
      cue.className='shift-last-v150';
      const rule=g.querySelector('.shift-rule-v149');
      if(rule)rule.appendChild(cue);
    }
    return cue;
  }

  function syncCue(previewStable=false){
    const g=guide();
    if(!g)return;
    const active=isShift();
    g.classList.remove('last-move-v150','preview-stable-v150');
    boardEl?.classList.remove('shift-next-v150','shift-preview-stable-v150');
    if(!active)return;

    const moves=Math.max(0,Math.min(3,Number(state.shiftRoundMovesV149)||0));
    const stable=!!state.shiftRoundClearedV149;
    const last=!stable&&moves===2;
    const cue=ensureCue();

    if(last){
      g.classList.add('last-move-v150');
      boardEl?.classList.add('shift-next-v150');
      if(cue)cue.textContent='NEXT MOVE  →  SHIFT';
      if(previewStable){
        g.classList.add('preview-stable-v150');
        boardEl?.classList.remove('shift-next-v150');
        boardEl?.classList.add('shift-preview-stable-v150');
        if(cue)cue.textContent='CLEAR HERE  →  STABLE ✓';
      }
    }else if(cue){
      cue.textContent='';
    }
  }

  function previewWillStabilize(){
    if(!isShift()||state.shiftRoundClearedV149||Number(state.shiftRoundMovesV149)!==2)return false;
    if(selectedPiece===null||!previewAnchor)return false;
    const shape=drag?.shape||state.tray?.[selectedPiece];
    if(!shape||!Core.canPlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.size))return false;
    const sim=Core.simulatePlace(state.board,shape,previewAnchor.x,previewAnchor.y,'SHIFT',state.size);
    return !!(sim&&Array.isArray(sim.waves)&&sim.waves.length);
  }

  updatePreview=function(){
    const out=previousUpdatePreview();
    syncCue(previewWillStabilize());
    return out;
  };

  clearPreview=function(){
    const out=previousClearPreview();
    syncCue(false);
    return out;
  };

  renderAll=function(){
    const out=previousRenderAll();
    syncCue(false);
    return out;
  };

  queueMicrotask(()=>{try{syncCue(false);}catch(_){ }});
})();
