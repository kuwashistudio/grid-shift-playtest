/* GRID SHIFT v1.3.8 — BOMBS risk/reward redesign
   Bombs are now both threats and tools:
   - A bomb cleared by a normal line becomes a CONTROLLED BLAST (3x3 clear).
   - Bombs inside that 3x3 chain-react for escalating rewards.
   - A fuse reaching zero causes an UNCONTROLLED BLAST instead of instant game over;
     nearby empty cells become removable rubble.
   - Blast zones and chainable bomb clusters are telegraphed on the board. */
(function(){
  'use strict';

  const BOMB_ENGINE_VERSION=138;
  const baseClearBombsAt=clearBombsAt;
  const baseTickBombs=tickBombs;
  const baseSpawnBomb=spawnBomb;
  const baseRenderBoard=renderBoard;
  const baseRenderModeStat=renderModeStat;
  const baseLoadSlot=loadSlot;
  const baseNewRun=newRun;
  const baseBeep=beep;
  const baseAnnounce=announce;

  function key(x,y){return `${x},${y}`;}
  function inBoard(x,y){return x>=0&&y>=0&&x<state.size&&y<state.size;}
  function cheb(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));}

  function blastCellsFor(b,radius=1){
    const out=[];
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      const x=b.x+dx,y=b.y+dy;
      if(inBoard(x,y))out.push([x,y]);
    }
    return out;
  }

  function activeBombAt(x,y){return state.bombs.find(b=>b.x===x&&b.y===y)||null;}

  function chainBombs(seedBombs){
    const queue=seedBombs.slice(),seen=new Set(),out=[];
    while(queue.length){
      const b=queue.shift(),k=key(b.x,b.y);
      if(seen.has(k))continue;
      seen.add(k);out.push(b);
      for(const other of state.bombs){
        const ok=key(other.x,other.y);
        if(seen.has(ok))continue;
        if(cheb(b,other)<=1)queue.push(other);
      }
    }
    return out;
  }

  function showBlastFX(bombs,type='controlled',rubbleCount=0){
    const snapshot=bombs.map(b=>({x:b.x,y:b.y}));
    const chainCount=snapshot.length;
    setTimeout(()=>{
      if(!boardEl||!state)return;
      boardEl.classList.remove('bomb-impact-v138','bomb-chaos-v138');
      void boardEl.offsetWidth;
      boardEl.classList.add(type==='controlled'?'bomb-impact-v138':'bomb-chaos-v138');
      setTimeout(()=>boardEl.classList.remove('bomb-impact-v138','bomb-chaos-v138'),520);
      snapshot.forEach((b,i)=>{
        const ring=document.createElement('i');
        ring.className=`bomb-blast-ring-v138 ${type}`;
        ring.style.left=`${((b.x+.5)/state.size)*100}%`;
        ring.style.top=`${((b.y+.5)/state.size)*100}%`;
        ring.style.setProperty('--bd',`${i*42}ms`);
        boardEl.appendChild(ring);
        setTimeout(()=>ring.remove(),700+i*45);
      });
      if(chainCount>1||type==='uncontrolled'){
        const label=document.createElement('b');
        label.className=`bomb-label-v138 ${type}`;
        label.textContent=type==='controlled'?`CHAIN BLAST ×${chainCount}`:`UNCONTROLLED  +${rubbleCount} RUBBLE`;
        boardEl.appendChild(label);setTimeout(()=>label.remove(),900);
      }
    },0);
  }

  function controlledBlast(seedBombs){
    if(!seedBombs.length)return {count:0,gain:0,cells:[]};
    const chain=chainBombs(seedBombs);
    const blastSet=new Set();
    for(const b of chain)for(const [x,y] of blastCellsFor(b,1))blastSet.add(key(x,y));

    const chainKeys=new Set(chain.map(b=>key(b.x,b.y)));
    let clearedExtra=0;
    for(const k of blastSet){
      const [x,y]=k.split(',').map(Number);
      if(state.board[y][x])clearedExtra++;
      state.board[y][x]=0;
    }
    state.bombs=state.bombs.filter(b=>!chainKeys.has(key(b.x,b.y)));
    if(Array.isArray(state.bombRubble))state.bombRubble=state.bombRubble.filter(r=>!blastSet.has(key(r.x,r.y)));

    const n=chain.length;
    const gain=140*n + 100*(n*(n-1)/2) + clearedExtra*4;
    state.score+=gain;
    state.bombLastBlast={count:n,gain};
    const cells=[...blastSet].map(k=>k.split(',').map(Number));
    if(cells.length)queueFx('burst',{cells,wave:0});
    requestSound(n>=2?'bombChain':'controlledBlast',n);
    showBlastFX(chain,'controlled');
    return {count:n,gain,cells};
  }

  /* Called by the normal line-clear path. A line touching one bomb detonates it in
     a controlled 3x3 blast and can chain into adjacent bombs. */
  clearBombsAt=function(cells){
    if(state?.mode!=='BOMBS')return baseClearBombsAt(cells);
    if(!Array.isArray(cells)||!state.bombs?.length)return;
    const set=new Set(cells.map(([x,y])=>key(x,y)));
    const seeds=state.bombs.filter(b=>set.has(key(b.x,b.y)));
    if(seeds.length)controlledBlast(seeds);
  };

  function scatterRubble(chain){
    const bombKeys=new Set(state.bombs.map(b=>key(b.x,b.y)));
    const candidates=[];
    const seen=new Set();
    for(const b of chain){
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        const x=b.x+dx,y=b.y+dy,k=key(x,y);
        if(!inBoard(x,y)||seen.has(k)||bombKeys.has(k))continue;
        seen.add(k);
        if(state.board[y][x])continue;
        const d=Math.max(Math.abs(dx),Math.abs(dy));
        if(d===0)continue;
        candidates.push({x,y,d,near:Math.abs(dx)+Math.abs(dy)});
      }
    }
    /* Prefer nearby cells, but randomize within the danger zone. */
    candidates.sort((a,b)=>(a.d-b.d)||((Math.random()-.5)*2));
    const wanted=Math.min(8,Math.max(3,chain.length*3));
    const pool=candidates.slice(0,Math.min(candidates.length,18));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const chosen=pool.slice(0,wanted);
    if(!Array.isArray(state.bombRubble))state.bombRubble=[];
    const rubbleKeys=new Set(state.bombRubble.map(r=>key(r.x,r.y)));
    for(const p of chosen){
      state.board[p.y][p.x]=7;
      const k=key(p.x,p.y);if(!rubbleKeys.has(k)){state.bombRubble.push({x:p.x,y:p.y});rubbleKeys.add(k);}
    }
    return chosen;
  }

  function uncontrolledBlast(due){
    if(!due.length)return;
    const chain=chainBombs(due);
    const chainKeys=new Set(chain.map(b=>key(b.x,b.y)));
    /* Remove detonating bombs first; unlike controlled blasts they do not clean the
       board. Their consequence is new rubble occupying nearby empty space. */
    for(const b of chain)state.board[b.y][b.x]=0;
    state.bombs=state.bombs.filter(b=>!chainKeys.has(key(b.x,b.y)));
    const rubble=scatterRubble(chain);
    requestSound(chain.length>=2?'bombChaosChain':'uncontrolledBlast',chain.length);
    showBlastFX(chain,'uncontrolled',rubble.length);
    announce(chain.length>1?`CHAIN FAILURE  •  +${rubble.length} RUBBLE`:`UNCONTROLLED BLAST  •  +${rubble.length} RUBBLE`,true);
  }

  /* Fuse expiry is now a recoverable board disaster, not an instant game over. */
  tickBombs=function(){
    if(state?.mode!=='BOMBS')return baseTickBombs();
    if(!Array.isArray(state.bombs)||!state.bombs.length)return;
    for(const b of state.bombs)b.t--;
    const due=state.bombs.filter(b=>b.t<=0);
    if(due.length)uncontrolledBlast(due);
    const min=state.bombs.length?Math.min(...state.bombs.map(b=>b.t)):99;
    if(min<=2)beep('danger');
  };

  function chooseSpawnCell(avoidCells=[]){
    const avoid=Array.isArray(avoidCells)?avoidCells:[];
    const candidates=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
      if(state.board[y][x]||activeBombAt(x,y))continue;
      let row=0,col=0;
      for(let i=0;i<state.size;i++){row+=state.board[y][i]?1:0;col+=state.board[i][x]?1:0;}
      const dist=avoid.length?Math.min(...avoid.map(([ax,ay])=>Math.abs(ax-x)+Math.abs(ay-y))):9;
      const bombDist=state.bombs.length?Math.min(...state.bombs.map(b=>Math.max(Math.abs(b.x-x),Math.abs(b.y-y)))):99;
      candidates.push({x,y,row,col,dist,bombDist});
    }
    if(!candidates.length)return null;

    /* Sometimes deliberately offer a chain opportunity. This is also dangerous:
       if one of the clustered bombs expires, the cluster can fail together. */
    if(state.bombs.length&&Math.random()<.42){
      const chainable=candidates.filter(p=>p.bombDist<=1&&Math.max(p.row,p.col)<=8);
      if(chainable.length)return chainable[Math.floor(Math.random()*chainable.length)];
    }

    let pool=candidates.filter(p=>p.dist>=3&&Math.max(p.row,p.col)<=7&&p.bombDist>=2);
    if(pool.length<6)pool=candidates.filter(p=>Math.max(p.row,p.col)<=8);
    if(!pool.length)pool=candidates;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  spawnBomb=function(avoidCells=[]){
    if(state?.mode!=='BOMBS')return baseSpawnBomb(avoidCells);
    const p=chooseSpawnCell(avoidCells);if(!p)return;
    const fuse=state.moves>=32?4:5;
    state.board[p.y][p.x]=6;
    state.bombs.push({x:p.x,y:p.y,t:fuse});
    requestSound('bomb');queueFx('bombAlert');renderBoard();
  };

  /* Replace the old generic BOMB CLEARED message with the actual blast reward. */
  announce=function(text,strong=false){
    if(state?.mode==='BOMBS'&&typeof text==='string'&&text.startsWith('BOMB CLEARED')&&state.bombLastBlast){
      const b=state.bombLastBlast;state.bombLastBlast=null;
      return baseAnnounce(b.count>1?`CHAIN BLAST ×${b.count}  +${b.gain}`:`CONTROLLED BLAST  +${b.gain}`,true);
    }
    return baseAnnounce(text,strong);
  };

  beep=function(kind,power=1){
    if(kind==='controlledBlast'){
      noiseBurst(.07,.035,2600);tone(185,.11,'triangle',.06,0,105);tone(720,.11,'sine',.045,.045,1040);return;
    }
    if(kind==='bombChain'){
      const n=Math.max(2,Math.min(5,Number(power)||2));
      noiseBurst(.10,.05,2300);tone(155,.15,'sawtooth',.055,0,85);
      for(let i=0;i<n;i++)tone(560+i*150,.08,'sine',.035,.035+i*.045,760+i*180);
      return;
    }
    if(kind==='uncontrolledBlast'){
      noiseBurst(.14,.06,420);tone(105,.22,'sawtooth',.065,0,62);tone(190,.11,'triangle',.035,.035,95);return;
    }
    if(kind==='bombChaosChain'){
      const n=Math.max(2,Math.min(4,Number(power)||2));
      noiseBurst(.18,.075,340);tone(92,.28,'sawtooth',.075,0,48);
      for(let i=1;i<n;i++)noiseBurst(.09,.04,460,.055*i);
      return;
    }
    return baseBeep(kind,power);
  };

  renderBoard=function(){
    const out=baseRenderBoard();
    if(state?.mode!=='BOMBS')return out;

    /* Rubble is ordinary occupied material mechanically, but visually reads as a
       consequence that the player can later remove with a line clear. */
    if(!Array.isArray(state.bombRubble))state.bombRubble=[];
    state.bombRubble=state.bombRubble.filter(r=>inBoard(r.x,r.y)&&Number(state.board[r.y][r.x])===7&&!activeBombAt(r.x,r.y));
    for(const r of state.bombRubble)cellEls[r.y]?.[r.x]?.classList.add('rubble-v138');

    for(const b of state.bombs){
      for(const [x,y] of blastCellsFor(b,1)){
        const c=cellEls[y]?.[x];if(!c)continue;
        c.classList.add('bomb-zone-v138');
        if(b.t<=2)c.classList.add('bomb-zone-hot-v138');
      }
      const c=cellEls[b.y]?.[b.x];
      if(c){
        c.classList.add('bomb-core-v138');
        if(state.bombs.some(o=>o!==b&&cheb(b,o)<=1))c.classList.add('bomb-chainable-v138');
      }
    }
    return out;
  };

  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode==='BOMBS'){
      const min=state.bombs?.length?Math.min(...state.bombs.map(b=>b.t)):null;
      modeStatEl.textContent=min===null?'BOMBS':`FUSE ${min}`;
      modeStatEl.classList.toggle('urgent',min!==null&&min<=2);
      modeStatEl.classList.add('visible');
    }
  };

  function normalizeBombState(){
    if(state?.mode!=='BOMBS')return;
    state.bombEngineVersion=BOMB_ENGINE_VERSION;
    if(!Array.isArray(state.bombs))state.bombs=[];
    if(!Array.isArray(state.bombRubble))state.bombRubble=[];
    state.bombs=state.bombs.filter(b=>Number.isInteger(b.x)&&Number.isInteger(b.y)&&inBoard(b.x,b.y)).map(b=>({...b,t:Math.max(1,Math.min(5,Number(b.t)||5))}));
    for(const b of state.bombs)state.board[b.y][b.x]=6;
    state.bombRubble=state.bombRubble.filter(r=>Number.isInteger(r.x)&&Number.isInteger(r.y)&&inBoard(r.x,r.y)&&!activeBombAt(r.x,r.y));
    for(const r of state.bombRubble)if(!state.board[r.y][r.x])state.board[r.y][r.x]=7;
  }

  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='BOMBS'){
      normalizeBombState();renderAll();scheduleSave(true);
    }
  };

  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='BOMBS'){
      state.bombEngineVersion=BOMB_ENGINE_VERSION;
      state.bombLastBlast=null;
      state.bombRubble=[];
      renderAll();scheduleSave(true);
    }
    return out;
  };

  queueMicrotask(()=>{try{if(state?.mode==='BOMBS'){normalizeBombState();renderAll();}}catch(_){ }});
})();
