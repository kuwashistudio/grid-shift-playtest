/* GRID SHIFT v1.4.7 — broader shape ecology + truthful, playful mode previews */
(function(){
  'use strict';

  /* ---------- 1) Shape variety without touching specialist modes ----------
     SQUARES has its own 4x4-oriented ecology, GRAVITY has its own multicolor
     pieces, and BOMBS already has a dedicated diverse tray generator. Keep those
     systems intact. CLASSIC / SHIFT / RUSH may safely receive one awkward 5-cell
     family piece because the final tray is still required to be sequentially solvable. */
  const baseGenerateFairTray=Core.generateFairTray;
  const VARIETY_MODES=new Set(['CLASSIC','SHIFT','BLITZ']);
  const SPECIAL_IDS=['u5','p5','w5'];

  function cloneShape(id){
    const src=Core.SHAPE_BY_ID[id];
    return src?Core.deepClone(src):null;
  }
  function rotated(shape,rng){
    let out=shape;
    const turns=Math.floor(rng()*4);
    for(let i=0;i<turns;i++)out=Core.rotateShape(out);
    return out;
  }
  function shuffled3(rng){
    const a=[0,1,2];
    for(let i=2;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function specialOrder(rng){
    const last=state?.shapeVarietyLast||'';
    const pool=SPECIAL_IDS.slice();
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    if(last&&pool[0]===last)pool.push(pool.shift());
    return pool;
  }

  Core.generateFairTray=function(board,mode,size,rng=Math.random,moves=0){
    const base=baseGenerateFairTray(board,mode,size,rng,moves);
    if(!VARIETY_MODES.has(mode)||!Array.isArray(base)||base.length!==3)return base;

    const fill=Core.boardFill(board);
    /* About every other tray early/mid game; back off when the board is crowded.
       These pieces are larger/awkward, so this increases variety rather than acting
       as a rescue or making the game easier. */
    const chance=fill>=70?.20:(mode==='BLITZ'?.48:.40);
    if(rng()>chance)return base;

    const ids=specialOrder(rng);
    for(const id of ids){
      for(let turnTry=0;turnTry<3;turnTry++){
        const src=cloneShape(id);if(!src)continue;
        const special=rotated(src,rng);
        for(const slot of shuffled3(rng)){
          const tray=base.map(p=>Core.deepClone(p));
          tray[slot]=special;
          /* The same fairness contract as the normal generator: all three must have
             a real sequential route under this mode's clear rules. */
          if(Core.trayHasSolution(board,tray,mode,size,18000)){
            try{if(state)state.shapeVarietyLast=id;}catch(_){ }
            return tray;
          }
        }
      }
    }
    return base;
  };

  /* ---------- 2) Mode selector previews ----------
     Each preview now demonstrates the actual distinctive decision/event of the
     current rules instead of just decorating the card. */
  function c(x,y,cls){return miniCell(x,y,cls);}

  modeDemoHTML=function(id){
    let cells='';

    if(id==='CLASSIC'){
      cells=
        c(0,4,'md-blue v147-classic-row')+
        c(1,4,'md-blue v147-classic-row')+
        c(2,4,'md-blue v147-classic-row')+
        c(4,4,'md-blue v147-classic-row')+
        c(3,1,'md-blue v147-classic-drop')+
        '<i class="v147-line-flash"></i>';
    }

    else if(id==='SHIFT'){
      cells=
        c(1,1,'md-cyan v147-shift-r1')+c(2,1,'md-cyan v147-shift-r1')+
        c(2,3,'md-purple v147-shift-r2')+c(3,3,'md-purple v147-shift-r2')+
        '<b class="v147-target t1">1</b><b class="v147-target t2">2</b>'+
        '<i class="v147-wave-arrow a1">→</i><i class="v147-wave-arrow a2">←</i>';
    }

    else if(id==='GRAVITY'){
      /* A connected three-cell, three-color piece enters as one shape. Its cells
         then settle to different heights; the green cell completes a 5-cell match. */
      cells=
        c(0,4,'md-green v147-g-match')+c(1,4,'md-green v147-g-match')+
        c(3,4,'md-green v147-g-match')+c(4,4,'md-green v147-g-match')+
        c(2,0,'md-green v147-g-piece v147-g-green')+
        c(3,0,'md-purple v147-g-piece v147-g-purple')+
        c(2,1,'md-gold v147-g-piece v147-g-gold')+
        '<i class="v147-gravity-arrow">↓</i>';
    }

    else if(id==='SQUARES'){
      for(let y=1;y<=4;y++)for(let x=0;x<4;x++){
        if(x===3&&y===1)continue;
        cells+=c(x,y,'md-gold v147-square-cell');
      }
      cells+=c(4,0,'md-gold v147-square-last')+
        '<i class="v147-square-outline"></i><b class="v147-mini-rule">4×4+</b>';
    }

    else if(id==='BLITZ'){
      cells=
        c(0,4,'md-blue v147-rush-base')+c(1,4,'md-blue v147-rush-base')+
        c(2,1,'md-pink v147-rush-play')+
        '<i class="v147-rush-target"></i>'+
        c(4,1,'md-cyan v147-rush-pressure')+
        '<b class="v147-rush-bolt">⚡</b>';
    }

    else if(id==='BOMBS'){
      cells=
        c(1,0,'md-pink v147-bomb-piece p1')+
        c(1,1,'md-pink v147-bomb-piece p2')+
        c(2,1,'md-pink v147-bomb-piece p3')+
        c(0,3,'md-blue v147-bomb-line')+c(1,3,'md-blue v147-bomb-line')+
        c(2,3,'md-blue v147-bomb-line')+c(3,3,'md-blue v147-bomb-line')+c(4,3,'md-blue v147-bomb-line')+
        '<b class="v147-bomb-badge">4</b><b class="v147-chain-bomb">2</b>'+
        '<i class="v147-blast-zone z1"></i><i class="v147-blast-zone z2"></i>';
    }

    return `<div class="mode-demo mode-demo-v147 demo-${id.toLowerCase()}-v147"><div class="mini-board">${cells}</div></div>`;
  };

  /* app3 built the menu before hotfixes loaded. Rebuild once using the current
     buildMenu/renderMenu wrappers so per-mode BEST rows remain intact. */
  queueMicrotask(()=>{
    try{buildMenu();renderMenu();}catch(_){ }
  });
})();
