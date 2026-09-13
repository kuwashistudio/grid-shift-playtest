/* GRID SHIFT v1.4.2 — BOMBS dedicated diverse tray ecology
   Goal: keep v1.4.1's mandatory bomb-first fairness, but stop the repeated
   medium-piece feel. Every successful BOMBS tray is drawn from three different
   shape families, including rarer pentominoes, while still proving that the bomb
   carrier can be placed first and the other two pieces can subsequently be placed.
   If the diversity search cannot prove a safe route quickly, the known-safe v1.4.1
   tray is left untouched rather than risking an unfair round. */
(function(){
  'use strict';

  const VERSION=142;
  const FUSE=4;
  const previousCompleteTray=completeTray;
  const previousNewRun=newRun;
  const previousLoadSlot=loadSlot;

  const FAMILY_POOLS={
    BAR:['i3h','i3h','i4h','i4h','i5h'],
    CORNER:['l3a','l3a','l4a','l4a'],
    BLOCK:['sq2','sq2','sq2','sq3'],
    TEE:['t4u','t4u','t4u','plus5'],
    ZIG:['z4h','z4h','s4h','w5'],
    POCKET:['p5','p5','u5','u5']
  };
  const FAMILIES=Object.keys(FAMILY_POOLS);

  function clone(id){
    const s=Core.SHAPE_BY_ID[id];
    return s?Core.deepClone(s):null;
  }

  function shuffle(a){
    const out=a.slice();
    for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }

  function rotateRandom(shape){
    if(!shape)return null;
    let s=shape;
    const turns=Math.floor(Math.random()*4);
    for(let i=0;i<turns;i++)s=Core.rotateShape(s);
    return s;
  }

  function familyOf(shape){
    if(!shape)return '';
    const id=String(shape.id||'');
    if(/^i[23456]/.test(id))return 'BAR';
    if(/^l[346]/.test(id))return 'CORNER';
    if(/^sq|^rect/.test(id))return 'BLOCK';
    if(/^t4|^plus/.test(id))return 'TEE';
    if(/^z4|^s4|^w5|^stair/.test(id))return 'ZIG';
    if(/^p5|^u5/.test(id))return 'POCKET';
    if(id==='dot')return 'TINY';
    return 'OTHER';
  }

  function recentHistory(){
    return Array.isArray(state?.bombTrayHistory)?state.bombTrayHistory.slice(-5):[];
  }

  function familyCombos(){
    const hist=recentHistory();
    const counts=Object.fromEntries(FAMILIES.map(f=>[f,0]));
    for(const h of hist){
      for(const f of Array.isArray(h?.families)?h.families:[])if(f in counts)counts[f]++;
    }
    const lastSig=hist.length?hist[hist.length-1].signature:'';
    const combos=[];
    for(let a=0;a<FAMILIES.length;a++)for(let b=a+1;b<FAMILIES.length;b++)for(let c=b+1;c<FAMILIES.length;c++){
      const fam=[FAMILIES[a],FAMILIES[b],FAMILIES[c]];
      const signature=fam.slice().sort().join('+');
      let score=120-(counts[fam[0]]+counts[fam[1]]+counts[fam[2]])*13;
      if(signature===lastSig)score-=100;
      else if(hist.some(h=>h?.signature===signature))score-=28;
      score+=Math.random()*18;
      combos.push({fam,score,signature});
    }
    combos.sort((x,y)=>y.score-x.score);
    return combos;
  }

  function pickShape(family,fill){
    let pool=(FAMILY_POOLS[family]||[]).slice();
    /* On a crowded board keep the rare big shapes alive, but reduce their frequency
       instead of removing them. Variety should survive late-game without becoming
       a stream of impossible 3x3/5-cell pieces. */
    if(fill>=58){
      const lighter=pool.filter(id=>!['sq3','plus5','w5','u5'].includes(id));
      if(lighter.length&&Math.random()<.68)pool=lighter;
    }
    const id=pool[Math.floor(Math.random()*pool.length)];
    return rotateRandom(clone(id));
  }

  function makeTray(families){
    const fill=Core.boardFill(state.board);
    const tray=families.map(f=>pickShape(f,fill));
    return tray.every(Boolean)?tray:null;
  }

  function placementRecords(board,piece,size,limit=9999){
    const out=[];
    for(const shape of Core.modeRotations(piece,'BOMBS')){
      for(const [x,y] of Core.placements(board,shape,size))out.push({shape,x,y});
    }
    const mixed=shuffle(out);
    return mixed.length>limit?mixed.slice(0,limit):mixed;
  }

  function thirdHasMove(board,piece,size){
    return !!piece&&Core.hasModePlacement(board,piece,size,'BOMBS');
  }

  function remainingTwoFit(board,tray,a,b,size,budget){
    for(const secondIdx of shuffle([a,b])){
      const thirdIdx=secondIdx===a?b:a;
      for(const m of placementRecords(board,tray[secondIdx],size,56)){
        if(++budget.nodes>budget.max)return false;
        const sim=Core.simulatePlace(board,m.shape,m.x,m.y,'BOMBS',size);
        if(sim&&thirdHasMove(sim.board,tray[thirdIdx],size))return true;
      }
    }
    return false;
  }

  function carrierCanLead(board,tray,idx,size,budget){
    const rest=[0,1,2].filter(i=>i!==idx);
    for(const m of placementRecords(board,tray[idx],size,72)){
      if(++budget.nodes>budget.max)return false;
      const sim=Core.simulatePlace(board,m.shape,m.x,m.y,'BOMBS',size);
      if(sim&&remainingTwoFit(sim.board,tray,rest[0],rest[1],size,budget))return true;
    }
    return false;
  }

  function safeCarriers(tray){
    const out=[];
    const lastFamily=state?.bombLastCarrierFamily||'';
    for(const idx of shuffle([0,1,2])){
      const budget={nodes:0,max:6200};
      if(carrierCanLead(state.board,tray,idx,state.size,budget)){
        const fam=familyOf(tray[idx]);
        const n=tray[idx].cells.length;
        let score=0;
        if(fam!==lastFamily)score+=24;
        if(n>=3&&n<=5)score+=12;
        if(['POCKET','ZIG','TEE'].includes(fam))score+=8;
        score+=Math.random()*12;
        out.push({idx,fam,score});
      }
    }
    out.sort((a,b)=>b.score-a.score);
    return out;
  }

  function chooseBombCell(shape){
    const cx=shape.cells.reduce((s,c)=>s+c[0],0)/shape.cells.length;
    const cy=shape.cells.reduce((s,c)=>s+c[1],0)/shape.cells.length;
    const ranked=shape.cells.map(([x,y])=>({x,y,d:Math.abs(x-cx)+Math.abs(y-cy)})).sort((a,b)=>b.d-a.d);
    const pool=ranked.slice(0,Math.max(1,Math.ceil(ranked.length*.7)));
    const p=pool[Math.floor(Math.random()*pool.length)];
    return [p.x,p.y];
  }

  function clearBombMarks(){
    for(const p of state?.tray||[]){if(p){delete p.bombCell;delete p.bombFuse;}}
  }

  function installTray(tray,carrier,combo){
    clearBombMarks();
    state.tray=tray;
    const shape=state.tray[carrier.idx];
    const [x,y]=chooseBombCell(shape);
    state.bombCargo={idx:carrier.idx,x,y,fuse:FUSE};
    state.bombCargoDone=false;
    state.bombFirstVersion=141;
    state.bombDiversityVersion=VERSION;
    state.bombLastCarrierFamily=carrier.fam;
    shape.bombCell=[x,y];shape.bombFuse=FUSE;

    const history=recentHistory();
    history.push({
      signature:combo.signature,
      families:combo.fam.slice(),
      ids:tray.map(p=>String(p.id||'')),
      carrier:carrier.fam
    });
    state.bombTrayHistory=history.slice(-5);
  }

  function tryInstallDiverseTray(){
    if(state?.mode!=='BOMBS'||state.gameOver)return false;
    const start=performance.now();
    const combos=familyCombos();

    /* Two shape rolls per family-combination gives rare pieces a real chance while
       keeping tray generation comfortably bounded on iPhone. */
    for(const combo of combos.slice(0,14)){
      for(let variant=0;variant<2;variant++){
        if(performance.now()-start>38)return false;
        const tray=makeTray(combo.fam);
        if(!tray)continue;
        const carriers=safeCarriers(tray);
        if(carriers.length){installTray(tray,carriers[0],combo);return true;}
      }
    }
    return false;
  }

  function fullTray(){return Array.isArray(state?.tray)&&state.tray.filter(Boolean).length===3;}

  completeTray=function(){
    if(state?.mode!=='BOMBS')return previousCompleteTray();
    const out=previousCompleteTray();
    if(!state.gameOver)tryInstallDiverseTray();
    return out;
  };

  newRun=function(keepBest=true){
    const out=previousNewRun(keepBest);
    if(state?.mode==='BOMBS'&&!state.gameOver){
      tryInstallDiverseTray();renderAll();scheduleSave(true);
    }
    return out;
  };

  loadSlot=async function(mode,size){
    await previousLoadSlot(mode,size);
    if(state?.mode==='BOMBS'&&!state.gameOver){
      if(state.bombDiversityVersion!==VERSION&&fullTray()){
        tryInstallDiverseTray();renderAll();scheduleSave(true);
      }else{
        state.bombDiversityVersion=VERSION;scheduleSave(true);
      }
    }
  };

  queueMicrotask(()=>{
    try{
      if(state?.mode==='BOMBS'&&!state.gameOver&&state.bombDiversityVersion!==VERSION&&fullTray()){
        tryInstallDiverseTray();renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();
