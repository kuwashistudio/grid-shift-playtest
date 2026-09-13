/* GRID SHIFT v1.2.3 — persistent BEST during play + per-mode BEST in selector */
(function(){
  'use strict';

  const previous=new Map();

  function savedModeBest(mode){
    if(state && state.mode===mode) return Math.max(0,Number(state.best)||0,Number(state.score)||0);
    try{
      const raw=localStorage.getItem(`gridshift_${slotKey(mode,10)}`);
      const parsed=raw?JSON.parse(raw):null;
      return Math.max(0,Number(parsed?.best)||0,Number(parsed?.score)||0);
    }catch(_){ return 0; }
  }

  function updateCurrentBest(){
    if(!state)return;
    const best=Math.max(Number(state.best)||0,Number(state.score)||0);
    if(bestEl){
      const before=Number((bestEl.textContent||'0').replace(/,/g,''))||0;
      bestEl.textContent=best.toLocaleString();
      if(bestWrap && best>before){
        bestWrap.classList.remove('new-best');void bestWrap.offsetWidth;bestWrap.classList.add('new-best');
        setTimeout(()=>bestWrap.classList.remove('new-best'),760);
      }
    }
  }

  function updateModeRecords(){
    document.querySelectorAll('.mode-card').forEach(card=>{
      const mode=card.dataset.mode;if(!mode)return;
      let row=card.querySelector('.mode-best-v123');
      if(!row){
        row=document.createElement('small');
        row.className='mode-best-v123';
        row.innerHTML='<span>BEST</span><b>0</b>';
        card.appendChild(row);
      }
      const best=savedModeBest(mode),b=row.querySelector('b');
      const before=previous.has(mode)?previous.get(mode):best;
      if(b)b.textContent=best.toLocaleString();
      if(best>before){
        row.classList.remove('record-hit');void row.offsetWidth;row.classList.add('record-hit');
        setTimeout(()=>row.classList.remove('record-hit'),700);
      }
      previous.set(mode,best);
    });
  }

  const renderMenuBase=renderMenu;
  renderMenu=function(){
    const out=renderMenuBase();
    updateModeRecords();
    return out;
  };

  const renderAllBase=renderAll;
  renderAll=function(){
    const out=renderAllBase();
    updateCurrentBest();
    updateModeRecords();
    return out;
  };

  /* Initial pass in case boot already rendered before this hotfix loaded. */
  queueMicrotask(()=>{try{updateCurrentBest();updateModeRecords();}catch(_){ }});
})();
