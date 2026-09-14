/* GRID SHIFT v1.5.2 — SHIFT becomes a real board transformation.
   - An unstable 3-piece round no longer nudges cells by one space.
   - Alternating rows/columns PACK completely toward their forecast arrows.
   - A plan that would create a full line by luck is rejected.
   - Extremely dense edge cases fall back to a safe one-cell whole-board move.
   - The selector preview demonstrates packing, not a one-cell nudge.
*/
(function(){
  'use strict';

  const VERSION=152;
  const ALT=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const LABEL={
    V_UP:{axis:'COLS',glyph:'↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓'},
    V_DOWN:{axis:'COLS',glyph:'↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑'},
    H_LEFT:{axis:'ROWS',glyph:'← → ← → ← → ← → ← →'},
    H_RIGHT:{axis:'ROWS',glyph:'→ ← → ← → ← → ← → ←'},
    V_ALL_UP:{axis:'COLS',glyph:'↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑'},
    V_ALL_DOWN:{axis:'COLS',glyph:'↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓'},
    H_ALL_LEFT:{axis:'ROWS',glyph:'← ← ← ← ← ← ← ← ← ←'},
    H_ALL_RIGHT:{axis:'ROWS',glyph:'→ → → → → → → → → →'}
  };

  const previousCompleteTray=completeTray;
  const previousUpdatePreview=updatePreview;
  const previousClearPreview=clearPreview;
  const previousRenderAll=renderAll;
  const previousModeDemoHTML=modeDemoHTML;
  let pendingPackFx=null;

  function isShift(){return state?.mode==='SHIFT'&&state?.shiftRulesVersion===149;}

  function empty(size){return Core.emptyBoard(size);}

  /* Return both the packed board and source->target movement records so the
     rendered cells can visibly slide the full distance instead of merely flashing. */
  function packBoard(board,size,plan){
    const out=empty(size),moves=[];

    if(plan==='V_UP'||plan==='V_DOWN'){
      const firstUp=plan==='V_UP';
      for(let x=0;x<size;x++){
        const up=(x%2===0)?firstUp:!firstUp;
        const items=[];
        for(let y=0;y<size;y++)if(board[y][x])items.push({v:board[y][x],sx:x,sy:y});
        const start=up?0:size-items.length;
        items.forEach((it,i)=>{
          const ty=start+i;out[ty][x]=it.v;
          moves.push({sx:it.sx,sy:it.sy,tx:x,ty});
        });
      }
      return {board:out,moves,plan,kind:'pack'};
    }

    if(plan==='H_LEFT'||plan==='H_RIGHT'){
      const firstLeft=plan==='H_LEFT';
      for(let y=0;y<size;y++){
        const left=(y%2===0)?firstLeft:!firstLeft;
        const items=[];
        for(let x=0;x<size;x++)if(board[y][x])items.push({v:board[y][x],sx:x,sy:y});
        const start=left?0:size-items.length;
        items.forEach((it,i)=>{
          const tx=start+i;out[y][tx]=it.v;
          moves.push({sx:it.sx,sy:it.sy,tx,ty:y});
        });
      }
      return {board:out,moves,plan,kind:'pack'};
    }

    return null;
  }

  /* Rare safety fallback. Uniform translation cannot create a new full row/column
     if none existed beforehand, because it preserves the line occupancy exactly. */
  function uniformBoard(board,size,plan){
    const out=empty(size),moves=[];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let tx=x,ty=y;
      if(plan==='V_ALL_UP')ty=(y-1+size)%size;
      else if(plan==='V_ALL_DOWN')ty=(y+1)%size;
      else if(plan==='H_ALL_LEFT')tx=(x-1+size)%size;
      else if(plan==='H_ALL_RIGHT')tx=(x+1)%size;
      out[ty][tx]=v;moves.push({sx:x,sy:y,tx,ty});
    }
    return {board:out,moves,plan,kind:'fallback'};
  }

  function hasFullLine(board,size){
    for(let y=0;y<size;y++){
      let full=true;for(let x=0;x<size;x++)if(!board[y][x]){full=false;break;}
      if(full)return true;
    }
    for(let x=0;x<size;x++){
      let full=true;for(let y=0;y<size;y++)if(!board[y][x]){full=false;break;}
      if(full)return true;
    }
    return false;
  }

  function candidateOrder(preferred){
    const p=ALT.includes(preferred)?preferred:'V_UP';
    const opposite=p==='V_UP'?'V_DOWN':p==='V_DOWN'?'V_UP':p==='H_LEFT'?'H_RIGHT':'H_LEFT';
    const other=p.startsWith('V')?['H_LEFT','H_RIGHT']:['V_UP','V_DOWN'];
    return [p,opposite,...other];
  }

  function fallbackPlan(preferred){
    if(preferred==='V_DOWN')return 'V_ALL_DOWN';
    if(preferred==='H_LEFT')return 'H_ALL_LEFT';
    if(preferred==='H_RIGHT')return 'H_ALL_RIGHT';
    return 'V_ALL_UP';
  }

  function choosePack(board,preferred){
    for(const plan of candidateOrder(preferred)){
      const result=packBoard(board,state.size,plan);
      if(result&&!hasFullLine(result.board,state.size))return result;
    }
    return uniformBoard(board,state.size,fallbackPlan(preferred));
  }

  function label(plan){return LABEL[plan]||LABEL.V_UP;}
  function guideDirection(){return document.querySelector('#shiftGuideV149 .shift-direction-v149');}
  function showPlan(plan,stable=false){
    const el=guideDirection();if(!el||!isShift())return;
    if(stable){el.textContent='NO SHIFT THIS ROUND';return;}
    const l=label(plan||state.shiftPattern);
    el.textContent=`${l.axis}  ${l.glyph}`;
  }

  function previewResult(){
    if(!isShift()||state.shiftRoundClearedV149||Number(state.shiftRoundMovesV149)!==2)return null;
    if(selectedPiece===null||!previewAnchor)return null;
    const shape=drag?.shape||state.tray?.[selectedPiece];
    if(!shape||!Core.canPlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.size))return null;
    const sim=Core.simulatePlace(state.board,shape,previewAnchor.x,previewAnchor.y,'SHIFT',state.size);
    if(!sim)return null;
    if(Array.isArray(sim.waves)&&sim.waves.length)return {stable:true,plan:null};
    return {stable:false,...choosePack(sim.board,state.shiftPattern)};
  }

  updatePreview=function(){
    const out=previousUpdatePreview();
    const r=previewResult();
    if(r)showPlan(r.plan,r.stable);
    return out;
  };

  clearPreview=function(){
    const out=previousClearPreview();
    if(isShift())showPlan(state.shiftPattern,!!state.shiftRoundClearedV149);
    return out;
  };

  function nextPattern(prev){
    const pool=ALT.filter(p=>p!==prev);
    return pool[Math.floor(Math.random()*pool.length)]||'V_UP';
  }

  function resetRound(next){
    state.shiftRoundMovesV149=0;
    state.shiftRoundClearedV149=false;
    state.shiftRoundResultV149='';
    state.shiftPackVersion=VERSION;
    state.shiftPattern=next;
    state.shiftAnchors=[];
    state.shiftAnchor=null;
    state.shiftAnchorHit=false;
    state.shiftStep=0;
    state.shiftMissionMoves=0;
    state.shiftMissionFailed=false;
    state.shiftRoundResolved=false;
    state.shiftOutcome='';
    state.shiftEarly2V148=false;
  }

  /* Authoritative SHIFT round resolver for v1.5.2. Placement/scoring remains owned
     by v1.4.9; only the board transformation at round end changes. */
  completeTray=function(){
    if(!isShift())return previousCompleteTray();

    const preferred=ALT.includes(state.shiftPattern)?state.shiftPattern:'V_UP';

    if(state.shiftRoundClearedV149){
      state.shiftRoundResultV149='STABLE';
      requestSound('sequenceWin');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),440);
      announce('STABLE  •  NO SHIFT',true);
      pendingPackFx=null;
    }else{
      const result=choosePack(state.board,preferred);
      state.shiftRoundResultV149='SHIFT';
      state.shiftLastAppliedV152=result.plan;
      state.shiftLastKindV152=result.kind;
      state.board=result.board;
      pendingPackFx={moves:result.moves,plan:result.plan,kind:result.kind};
      boardEl.dataset.waveFx=result.plan;
      requestSound('shift');
      announce(result.kind==='pack'?'PACK SHIFT':'SHIFT',false);
      /* No line scan: choosePack rejects any compression that would complete a line. */
    }

    if(state.trayHadClear){
      state.chain++;
      const bonus=state.chain>=2?25*state.chain:0;
      if(bonus){
        state.score+=bonus;
        if(state.chain===3||state.chain===5||state.chain%10===0){announce(`CHAIN ${state.chain}  +${bonus}`,true);beep('chain');queueFx('chain',state.chain);}
      }
    }else state.chain=0;
    state.trayHadClear=false;

    state.tray=Core.generateFairTray(state.board,'SHIFT',state.size,Math.random,state.moves);
    resetRound(nextPattern(preferred));
  };

  function runPackFx(fx){
    if(!fx||!boardEl||!cellEls?.length)return;
    boardEl.classList.remove('shift-pack-board-v152');void boardEl.offsetWidth;boardEl.classList.add('shift-pack-board-v152');
    const moved=fx.moves.filter(m=>m.sx!==m.tx||m.sy!==m.ty);
    moved.forEach((m,i)=>{
      const target=cellEls[m.ty]?.[m.tx],source=cellEls[m.sy]?.[m.sx];
      if(!target||!source)return;
      const dx=source.offsetLeft-target.offsetLeft,dy=source.offsetTop-target.offsetTop;
      target.style.setProperty('--pack-x',`${dx}px`);
      target.style.setProperty('--pack-y',`${dy}px`);
      target.style.setProperty('--pack-delay',`${Math.min(80,(i%10)*7)}ms`);
      target.classList.remove('shift-pack-cell-v152');void target.offsetWidth;target.classList.add('shift-pack-cell-v152');
      setTimeout(()=>{
        target.classList.remove('shift-pack-cell-v152');
        target.style.removeProperty('--pack-x');target.style.removeProperty('--pack-y');target.style.removeProperty('--pack-delay');
      },520);
    });
    setTimeout(()=>{boardEl.classList.remove('shift-pack-board-v152');delete boardEl.dataset.waveFx;},540);
  }

  renderAll=function(){
    const out=previousRenderAll();
    if(pendingPackFx&&isShift()){
      const fx=pendingPackFx;pendingPackFx=null;
      requestAnimationFrame(()=>runPackFx(fx));
    }
    return out;
  };

  /* Selector preview: sparse rows visibly collapse all the way to opposite edges. */
  modeDemoHTML=function(id){
    if(id!=='SHIFT')return previousModeDemoHTML(id);
    let cells='';
    cells+=miniCell(0,1,'md-cyan v152-pack r-a p0');
    cells+=miniCell(2,1,'md-cyan v152-pack r-a p2');
    cells+=miniCell(4,1,'md-purple v152-pack r-a p4');
    cells+=miniCell(0,3,'md-green v152-pack r-b p0');
    cells+=miniCell(2,3,'md-green v152-pack r-b p2');
    cells+=miniCell(4,3,'md-gold v152-pack r-b p4');
    return `<div class="mode-demo mode-demo-v147 demo-shift-v152"><div class="mini-board">${cells}<div class="v149-demo-count"><i></i><i></i><i></i><b>→</b><strong>⇄</strong></div><em class="v152-pack-arrow ar">→</em><em class="v152-pack-arrow al">←</em></div></div>`;
  };

  queueMicrotask(()=>{
    try{buildMenu();renderMenu();if(isShift())showPlan(state.shiftPattern,!!state.shiftRoundClearedV149);}catch(_){ }
  });
})();
