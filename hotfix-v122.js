/* GRID SHIFT v1.2.2 — suppress iOS selection/loupe + celebrate personal best */
(function(){
  'use strict';

  /* Safari can still reserve some browser chrome gestures, but these prevent
     text selection, callout menus and the long-press loupe inside the game UI
     in normal play. */
  const blockNativeHold=e=>{
    const t=e.target;
    if(t && (t.closest?.('#app') || t.closest?.('.overlay'))) e.preventDefault();
  };
  document.addEventListener('contextmenu',blockNativeHold,{capture:true});
  document.addEventListener('selectstart',blockNativeHold,{capture:true});
  document.addEventListener('dragstart',blockNativeHold,{capture:true});

  const bestElNow=document.getElementById('best');
  const bestWrap=document.getElementById('bestWrap');
  if(bestElNow&&bestWrap){
    let previousBest=Number((bestElNow.textContent||'0').replace(/,/g,''))||0;
    const pulse=()=>{
      const next=Number((bestElNow.textContent||'0').replace(/,/g,''))||0;
      if(next>previousBest){
        bestWrap.classList.remove('new-best');void bestWrap.offsetWidth;bestWrap.classList.add('new-best');
        setTimeout(()=>bestWrap.classList.remove('new-best'),760);
      }
      previousBest=next;
    };
    new MutationObserver(pulse).observe(bestElNow,{childList:true,characterData:true,subtree:true});
  }
})();
