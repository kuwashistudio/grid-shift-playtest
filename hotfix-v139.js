/* GRID SHIFT v1.3.9 — BOMBS clarity pass
   Keep the interesting risk/reward from v1.3.8, remove the hard-to-read parts:
   - Defuse a bomb by clearing a row/column that contains it.
   - A defused bomb clears exactly its visible 3x3 frame; bombs inside that frame chain.
   - Fuse reaching 0 is GAME OVER again. No rubble, no hidden secondary rule.
   - Bomb messages are visual and short; long transient sentences are removed.
*/
(function(){
  'use strict';

  const BOMB_ENGINE_VERSION=139;
  const previousTickBombs=tickBombs;
  const previousRenderBoard=renderBoard;
  const previousRenderModeStat=renderModeStat;
  const previousLoadSlot=loadSlot;
  const previousNewRun=newRun;
  const previousAnnounce=announce;
  const previousModeDemoHTML=modeDemoHTML;

  function inBoard(x,y){return x>=0&&y>=0&&x<state.size&&y<state.size;}

  function removeLegacyRubble(){
    if(state?.mode!=='BOMBS')return;
    if(Array.isArray(state.bombRubble)){
      for(const r of state.bombRubble){
        if(!Number.isInteger(r?.x)||!Number.isInteger(r?.y)||!inBoard(r.x,r.y))continue;
        if(Number(state.board[r.y][r.x])===7)state.board[r.y][r.x]=0;
      }
    }
    state.bombRubble=[];
    state.bombEngineVersion=BOMB_ENGINE_VERSION;
  }

  /* One rule for failure: if the visible number reaches zero, the run ends. */
  tickBombs=function(){
    if(state?.mode!=='BOMBS')return previousTickBombs();
    if(!Array.isArray(state.bombs)||!state.bombs.length)return;
    for(const b of state.bombs)b.t--;
    const doomed=state.bombs.find(b=>b.t<=0);
    if(doomed){
      triggerBombGameOver(doomed);
      return;
    }
    const min=Math.min(...state.bombs.map(b=>b.t));
    if(min<=2)beep('danger');
  };

  function shortChainBadge(count){
    if(!boardEl||count<2)return;
    const e=document.createElement('b');
    e.className='bomb-chain-badge-v139';
    e.textContent=`×${count}`;
    boardEl.appendChild(e);
    setTimeout(()=>e.remove(),700);
  }

  /* v1.3.8 translated BOMB CLEARED into a long sentence. Keep only an optional
     x2/x3 badge: the blast itself explains the rest. */
  announce=function(text,strong=false){
    if(state?.mode==='BOMBS'&&typeof text==='string'&&text.startsWith('BOMB CLEARED')){
      const b=state.bombLastBlast;
      state.bombLastBlast=null;
      if(b?.count>1)shortChainBadge(b.count);
      return;
    }
    if(state?.mode==='BOMBS'&&typeof text==='string'&&(text.includes('UNCONTROLLED')||text.includes('RUBBLE')||text.includes('CHAIN FAILURE')))return;
    return previousAnnounce(text,strong);
  };

  function addBlastFrame(b){
    const minX=Math.max(0,b.x-1),maxX=Math.min(state.size-1,b.x+1);
    const minY=Math.max(0,b.y-1),maxY=Math.min(state.size-1,b.y+1);
    const a=cellEls[minY]?.[minX],z=cellEls[maxY]?.[maxX];
    if(!a||!z)return;
    const f=document.createElement('i');
    f.className='bomb-zone-frame-v139'+(b.t<=2?' hot':'');
    f.style.left=`${a.offsetLeft-1}px`;
    f.style.top=`${a.offsetTop-1}px`;
    f.style.width=`${z.offsetLeft+z.offsetWidth-a.offsetLeft+2}px`;
    f.style.height=`${z.offsetTop+z.offsetHeight-a.offsetTop+2}px`;
    boardEl.appendChild(f);
  }

  renderBoard=function(){
    const out=previousRenderBoard();
    if(state?.mode!=='BOMBS')return out;

    /* Remove v1.3.8's cell-by-cell haze and mystery symbols. One clean frame now
       means one thing: this is exactly what a successful bomb blast will clear. */
    for(const row of cellEls||[])for(const c of row||[]){
      if(!c)continue;
      c.classList.remove('bomb-zone-v138','bomb-zone-hot-v138','bomb-chainable-v138','rubble-v138');
    }
    boardEl.querySelectorAll('.bomb-zone-frame-v139').forEach(e=>e.remove());
    for(const b of state.bombs||[])addBlastFrame(b);
    return out;
  };

  renderModeStat=function(){
    previousRenderModeStat();
    if(state?.mode!=='BOMBS')return;
    const min=state.bombs?.length?Math.min(...state.bombs.map(b=>b.t)):null;
    modeStatEl.textContent=min===null?'●':`●  ${min}`;
    modeStatEl.classList.toggle('urgent',min!==null&&min<=2);
    modeStatEl.classList.add('visible');
  };

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(state?.mode==='BOMBS'){
      removeLegacyRubble();
      /* Old v1.3.8 saves can contain a zero/invalid fuse from the recoverable-blast
         experiment. Clamp only live bombs, then use the new simple rule from here. */
      if(Array.isArray(state.bombs))for(const b of state.bombs)b.t=Math.max(1,Math.min(5,Number(b.t)||5));
      renderAll();scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(state?.mode==='BOMBS'){
      state.bombEngineVersion=BOMB_ENGINE_VERSION;
      state.bombRubble=[];
      state.bombLastBlast=null;
      renderAll();scheduleSave(true);
    }
    return out;
  };

  /* Selector animation: line touches bomb -> the framed 3x3 area flashes.
     No explanatory sentence is required. */
  modeDemoHTML=function(id){
    if(id!=='BOMBS')return previousModeDemoHTML(id);
    let cells='';
    for(let x=0;x<5;x++)cells+=miniCell(x,3,'md-blue bomb-demo-line-v139');
    return `<div class="mode-demo demo-bombs demo-bombs-v139"><div class="mini-board">${cells}<i class="bomb-demo-zone-v139"></i><b class="bomb-demo-core-v139">3</b></div></div>`;
  };

  queueMicrotask(()=>{
    try{
      buildMenu();renderMenu();
      if(state?.mode==='BOMBS'){
        removeLegacyRubble();renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();
