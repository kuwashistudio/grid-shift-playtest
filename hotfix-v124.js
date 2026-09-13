/* GRID SHIFT v1.2.4 — explicit HIGH SCORE labels in play and mode selector */
(function(){
  'use strict';

  function clarifyHighScores(){
    const live=document.getElementById('bestWrap');
    if(live){
      const label=live.querySelector('span');
      if(label)label.textContent='HIGH SCORE';
      live.setAttribute('aria-label','High score');
    }
    document.querySelectorAll('.mode-best-v123').forEach(row=>{
      const label=row.querySelector('span');
      if(label)label.textContent='HIGH SCORE';
      const card=row.closest('.mode-card');
      const mode=card?.dataset?.mode;
      if(mode)row.setAttribute('aria-label',`${mode} high score ${row.querySelector('b')?.textContent||'0'}`);
    });
  }

  const renderMenuPrev=renderMenu;
  renderMenu=function(){
    const out=renderMenuPrev();
    clarifyHighScores();
    return out;
  };

  const renderAllPrev=renderAll;
  renderAll=function(){
    const out=renderAllPrev();
    clarifyHighScores();
    return out;
  };

  queueMicrotask(()=>{try{clarifyHighScores();}catch(_){ }});
})();
