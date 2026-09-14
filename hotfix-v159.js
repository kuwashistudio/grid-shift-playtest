/* GRID SHIFT v1.5.9 — GRAVITY opening ramp + tray/ghost recovery.
   Design goals:
   - Keep the rule and 5-cell clear threshold unchanged.
   - Make only the opening easier by reducing color entropy and seeding useful pairs.
   - Fade the assistance out invisibly, so later GRAVITY keeps its deliberate depth.
   - Defensively recover the tray from rare Safari drag/layout residue.
*/
(function(){
  'use strict';

  const VERSION=159;
  const previousGenerateFairTray=Core.generateFairTray;
  const previousRenderAll=renderAll;

  function isGravity(){return state?.mode==='GRAVITY';}
  function clone(v){return Core.deepClone(v);}
  function rand(rng,n){return Math.floor(rng()*n);}

  function rotated(shape,rng){
    let s=clone(shape);
    const turns=rand(rng,4);
    for(let i=0;i<turns;i++)s=Core.rotateShape(s);
    return s;
  }

  function liveGroups(board,size,palette){
    const allowed=new Set(palette);
    return Core.scanColorGroups(board,size,1).groups
      .map(cells=>({cells,color:board[cells[0][1]]?.[cells[0][0]]||0,size:cells.length}))
      .filter(g=>allowed.has(g.color)&&g.size>=2&&g.size<Core.GRAVITY_CLEAR_MIN)
      .sort((a,b)=>b.size-a.size);
  }

  function pairedColors(n,palette,rng,pairColor){
    const colors=[];
    if(n>=2){colors.push(pairColor,pairColor);}
    const counts=new Map([[pairColor,Math.min(2,n)]]);
    while(colors.length<n){
      let options=palette.filter(c=>(counts.get(c)||0)<2);
      if(!options.length)options=palette.slice();
      /* Prefer a different color from the seeded pair so the piece remains a puzzle,
         rather than becoming a nearly monochrome free clear. */
      const different=options.filter(c=>c!==pairColor);
      const pool=different.length?different:options;
      const c=pool[rand(rng,pool.length)];
      colors.push(c);counts.set(c,(counts.get(c)||0)+1);
    }
    for(let i=colors.length-1;i>0;i--){
      const j=rand(rng,i+1);[colors[i],colors[j]]=[colors[j],colors[i]];
    }
    return colors;
  }

  function recolorTray(board,tray,size,rng,moves){
    /* Opening entropy ramp:
       0–11 moves: four live colors instead of five.
       12–17: return to five, but keep one guided pair.
       18+: original generator takes over completely. */
    const palette=moves<12?[1,2,3,4]:[1,2,3,4,5];
    const groups=liveGroups(board,size,palette);
    const strongest=groups[0]?.color||null;
    const guidedCount=moves<6?3:(moves<12?2:1);

    const out=tray.map((shape,i)=>{
      const s=clone(shape);
      if(!s?.cells?.length)return s;
      if(i<guidedCount){
        const pair=(i===0&&strongest)?strongest:palette[(moves+i)%palette.length];
        s.cellColors=pairedColors(s.cells.length,palette,rng,pair);
      }else{
        /* Even unguided pieces stay inside the current opening palette. */
        const pair=palette[rand(rng,palette.length)];
        s.cellColors=pairedColors(s.cells.length,palette,rng,pair);
      }
      s.color=s.cellColors[0]||1;
      return s;
    });

    return Core.trayHasSolution(board,out,'GRAVITY',size,22000)?out:tray;
  }

  function simpleOpeningTray(board,size,rng,moves){
    const ids=['i3h','l3a','sq2','t4u','i4h'];
    for(let attempt=0;attempt<36;attempt++){
      const tray=[];
      for(let i=0;i<3;i++){
        const base=Core.SHAPE_BY_ID[ids[rand(rng,ids.length)]];
        tray.push(rotated(base,rng));
      }
      const colored=recolorTray(board,tray,size,rng,moves);
      if(Core.trayHasSolution(board,colored,'GRAVITY',size,22000))return colored;
    }
    return null;
  }

  Core.generateFairTray=function(board,mode,size,rng=Math.random,moves=0){
    if(mode!=='GRAVITY')return previousGenerateFairTray(board,mode,size,rng,moves);

    /* First two trays: simpler silhouettes + four-color field. */
    if(moves<6){
      const opening=simpleOpeningTray(board,size,rng,moves);
      if(opening)return opening;
    }

    const tray=previousGenerateFairTray(board,mode,size,rng,moves);
    if(moves<18)return recolorTray(board,tray,size,rng,moves);
    return tray;
  };

  function healTrayLayout(){
    if(!isGravity()||!trayEl)return;
    /* No gameplay state is changed here. This only clears stale inline layout
       residue if Safari interrupted a drag/animation. */
    trayEl.style.removeProperty('transform');
    trayEl.style.removeProperty('left');
    trayEl.style.removeProperty('top');
    trayEl.querySelectorAll('.piece-wrap').forEach(w=>{
      if(!w.classList.contains('dragging')){
        w.style.removeProperty('transform');
        w.style.removeProperty('left');
        w.style.removeProperty('top');
      }
    });
  }

  function cleanupOrphanGhosts(){
    if(typeof drag!=='undefined'&&drag)return;
    document.querySelectorAll('.drag-ghost').forEach(g=>g.remove());
  }

  renderAll=function(){
    const out=previousRenderAll();
    if(isGravity()){
      healTrayLayout();
      /* Expected drop/cancel ghosts live only ~100–150 ms. Waiting 280 ms keeps
         that animation intact while removing anything stranded by Safari. */
      setTimeout(cleanupOrphanGhosts,280);
    }
    return out;
  };

  document.addEventListener('pointerup',()=>setTimeout(()=>{healTrayLayout();cleanupOrphanGhosts();},280),true);
  document.addEventListener('pointercancel',()=>setTimeout(()=>{healTrayLayout();cleanupOrphanGhosts();},280),true);

  queueMicrotask(()=>{
    try{
      if(isGravity()){
        state.gravityOpeningAssistVersionV159=VERSION;
        renderAll();
      }
    }catch(_){ }
  });
})();
