/* GRID SHIFT v1.6.2 — GRAVITY cinematic chains.
   Multi-chain events are intentionally rare rewards: later chains slow down,
   linger longer, and build a much larger audiovisual payoff. Chain 1 remains quick.
*/
(function(){
  'use strict';

  const VERSION=162;

  function isGravity(){return state?.mode==='GRAVITY';}
  function bestChain(){return Math.max(0,Number(state?.gravityBestChainV158)||0);}
  function tierFor(chain){
    if(chain>=10)return 10;
    if(chain>=7)return 7;
    if(chain>=5)return 5;
    if(chain>=3)return 3;
    if(chain>=2)return 2;
    return 1;
  }

  function fxLife(chain,isFinal){
    const base=chain<=2?760:chain===3?980:chain===4?1160:chain===5?1480:Math.min(1900,1480+(chain-5)*110);
    return isFinal?base+260:base;
  }

  function suspenseMs(chain){
    if(chain<=1)return 0;
    return Math.min(310,95+(chain-2)*42);
  }

  function gapAfter(chain){
    if(chain<=1)return 330;
    return Math.min(900,420+(chain-2)*115);
  }

  function clearOldFx(){
    const wrap=boardEl?.parentElement;
    wrap?.querySelectorAll('.gravity-chain-layer-v162').forEach(el=>el.remove());
    boardEl?.classList.remove('gravity-chain-impact-v162','gravity-chain-hold-v162','gravity-chain-apex-v162');
  }

  function pulseBoard(chain){
    if(!boardEl)return;
    boardEl.classList.remove('gravity-chain-impact-v162','gravity-chain-apex-v162');
    void boardEl.offsetWidth;
    boardEl.style.setProperty('--gravity-chain-power',String(Math.min(1,(chain-1)/7)));
    boardEl.classList.add('gravity-chain-impact-v162');
    if(chain>=5)boardEl.classList.add('gravity-chain-apex-v162');
    setTimeout(()=>boardEl?.classList.remove('gravity-chain-impact-v162','gravity-chain-apex-v162'),Math.min(820,340+chain*62));
  }

  function showChainFx(chain,isFinal,isNewBest){
    if(chain<2||!boardEl)return;
    const wrap=boardEl.parentElement;if(!wrap)return;
    wrap.querySelectorAll('.gravity-chain-layer-v162,.gravity-chain-layer-v158').forEach(el=>el.remove());

    const tier=tierFor(chain),life=fxLife(chain,isFinal);
    const layer=document.createElement('div');
    layer.className=`gravity-chain-layer-v162 tier-${tier}${isFinal?' final-v162':''}${isNewBest?' new-best-v162':''}`;
    layer.style.setProperty('--chain-life',`${life}ms`);
    layer.style.setProperty('--chain-power',String(Math.min(1,(chain-1)/8)));

    const wash=document.createElement('i');wash.className='gravity-chain-wash-v162';layer.appendChild(wash);
    const ringA=document.createElement('i');ringA.className='gravity-chain-ring-v162 ring-a';layer.appendChild(ringA);
    if(chain>=3){const ringB=document.createElement('i');ringB.className='gravity-chain-ring-v162 ring-b';layer.appendChild(ringB);}
    if(chain>=5){const ringC=document.createElement('i');ringC.className='gravity-chain-ring-v162 ring-c';layer.appendChild(ringC);}

    const copy=document.createElement('div');copy.className='gravity-chain-copy-v162';
    const num=document.createElement('b');num.textContent=String(chain);
    const word=document.createElement('span');word.textContent='CHAIN';
    copy.append(num,word);
    if(isNewBest){const nb=document.createElement('em');nb.textContent='NEW BEST';copy.appendChild(nb);}
    layer.appendChild(copy);

    const rayCount=chain>=10?24:chain>=7?20:chain>=5?16:chain>=4?12:chain>=3?9:6;
    for(let i=0;i<rayCount;i++){
      const ray=document.createElement('i');ray.className='gravity-chain-ray-v162';
      ray.style.setProperty('--a',`${i*(360/rayCount)+(chain%2?7:0)}deg`);
      ray.style.setProperty('--delay',`${(i%5)*12}ms`);
      ray.style.setProperty('--reach',`${Math.min(210,85+chain*13+(i%3)*9)}px`);
      layer.appendChild(ray);
    }

    if(chain>=5){
      const crown=document.createElement('div');crown.className='gravity-chain-crown-v162';
      for(let i=0;i<Math.min(18,8+chain);i++){
        const p=document.createElement('i');
        p.style.setProperty('--x',`${(i*37)%100}%`);
        p.style.setProperty('--y',`${12+((i*53)%76)}%`);
        p.style.setProperty('--pd',`${(i%6)*28}ms`);
        crown.appendChild(p);
      }
      layer.appendChild(crown);
    }

    wrap.appendChild(layer);
    setTimeout(()=>layer.remove(),life+80);
  }

  function chainSound(chain,isFinal,isNewBest){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const idx=Math.max(0,chain-2);
      const roots=[392,440,493.88,587.33,659.25,783.99,880,987.77,1174.66];
      const root=roots[Math.min(roots.length-1,idx)];
      const power=Math.min(1,(chain-1)/8);

      /* Impact: bass + bright transient. */
      noiseBurst(.055+power*.055,.032+power*.020,2500+chain*180);
      tone(Math.max(52,root/4),.16+power*.12,'triangle',.040+power*.014,0,Math.max(72,root/3));
      if(chain>=4)tone(Math.max(42,root/6),.22,'sine',.030+power*.010,0,Math.max(58,root/4.5));

      /* Major fifth / octave stack. Each chain climbs higher. */
      tone(root,.13+power*.05,'sawtooth',.042+power*.010,.018);
      tone(root*1.25,.16+power*.06,'triangle',.038+power*.010,.060);
      tone(root*1.5,.18+power*.07,'sine',.034+power*.010,.105);
      tone(root*2,.20+power*.08,'sine',.025+power*.009,.160);

      /* Higher chains earn a sparkling upward answer instead of just volume. */
      if(chain>=3){
        tone(root*1.12,.09,'triangle',.024,.23);
        tone(root*1.5,.10,'triangle',.024,.29);
      }
      if(chain>=5){
        noiseBurst(.10,.034,5200,.20);
        tone(root*2.25,.12,'sine',.022,.34);
        tone(root*2.5,.14,'sine',.020,.41);
        tone(root*3,.17,'sine',.017,.49);
      }
      if(chain>=7){
        tone(root*.5,.28,'sawtooth',.028,.10,root*.75);
        tone(root*3.5,.19,'sine',.014,.58);
      }

      if(isFinal){
        const d=chain>=5?.66:.48;
        tone(root*.5,.24,'triangle',.036,d,root*.75);
        tone(root*1.5,.22,'sine',.034,d+.05);
        tone(root*2,.28,'sine',.028,d+.12);
        if(chain>=5)tone(root*3,.30,'sine',.018,d+.20);
      }
      if(isNewBest){
        tone(root*2,.16,'triangle',.028,chain>=5?.98:.72);
        tone(root*2.5,.20,'sine',.022,chain>=5?1.08:.82);
        tone(root*3,.26,'sine',.017,chain>=5?1.18:.92);
      }

      const h=chain>=5?[18,24,22,22,28]:chain>=3?[13,20,16]:[10,16,10];
      haptic(h);
    });
  }

  function impactSound(chain){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const p=Math.min(1,(chain-1)/8);
      noiseBurst(.045+p*.035,.026+p*.018,1500+chain*120);
      tone(105+chain*9,.085+p*.07,'triangle',.045+p*.012,0,68+chain*8);
      if(chain>=5)tone(62,.14,'sine',.030,.015,49);
    });
  }

  resolveGravityPlacement=function(idx,shape,sim){
    resolving=true;
    state.gravityRewardVersionV158=158;
    state.gravityCinematicVersionV162=VERSION;
    state.tray[idx]=null;
    state.moves++;
    state.score+=shape.cells.length;
    state.lastPlaced=sim.placed.map(c=>c.slice());
    state.board=Core.cloneBoard(sim.stages?.[0]?.board||sim.board);
    renderAll();pulsePlaced(sim.placed);beep('place',shape.cells.length);
    boardEl.classList.add('gravity-settle');
    setTimeout(()=>boardEl.classList.remove('gravity-settle'),210);

    let totalUnits=0,totalCells=0;
    sim.waves.forEach(w=>{totalUnits+=w.units;totalCells+=w.cells.length;});
    const comboTotal=sim.waves.length;
    const priorBest=bestChain();

    let cursor=95;
    sim.waves.forEach((wave,i)=>{
      const chain=i+1;
      const isFinal=chain===comboTotal;
      const isNewBest=isFinal&&comboTotal>=2&&comboTotal>priorBest;

      if(chain===1){
        const eventAt=cursor;
        setTimeout(()=>{
          burstCells(wave.cells,0);
          requestSound(wave.units>1?'multi':'clear');
        },eventAt);
        setTimeout(()=>{
          state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);
          renderBoard();
          boardEl.classList.remove('gravity-settle');void boardEl.offsetWidth;boardEl.classList.add('gravity-settle');
          setTimeout(()=>boardEl.classList.remove('gravity-settle'),210);
        },eventAt+135);
        cursor=eventAt+gapAfter(chain);
        return;
      }

      const revealAt=cursor;
      const hold=suspenseMs(chain);
      const burstAt=revealAt+hold;
      const settleAt=burstAt+155+Math.min(95,(chain-2)*18);

      setTimeout(()=>{
        boardEl.classList.add('gravity-chain-hold-v162');
        showChainFx(chain,isFinal,isNewBest);
        chainSound(chain,isFinal,isNewBest);
      },revealAt);

      setTimeout(()=>{
        boardEl.classList.remove('gravity-chain-hold-v162');
        pulseBoard(chain);
        burstCells(wave.cells,0);
        impactSound(chain);
      },burstAt);

      setTimeout(()=>{
        state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);
        renderBoard();
        boardEl.classList.remove('gravity-settle');void boardEl.offsetWidth;boardEl.classList.add('gravity-settle');
        setTimeout(()=>boardEl.classList.remove('gravity-settle'),260+Math.min(180,(chain-2)*30));
      },settleAt);

      cursor=settleAt+gapAfter(chain);
    });

    const finalLinger=comboTotal>=5?900:comboTotal>=3?620:340;
    const doneAt=cursor+finalLinger;
    setTimeout(()=>{
      clearOldFx();
      state.board=Core.cloneBoard(sim.board);
      if(totalUnits>0){
        state.trayHadClear=true;
        const cascade=Math.max(0,sim.waves.length-1);
        state.score+=scoreClear(totalUnits,totalCells,cascade);
      }
      if(comboTotal>=2&&comboTotal>priorBest)state.gravityBestChainV158=comboTotal;
      if(state.tray.every(p=>p===null))completeTray();
      if(state.score>state.best)state.best=state.score;
      resolving=false;selectedPiece=null;previewAnchor=null;
      renderAll();scheduleSave();
      if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
    },doneAt);
    return true;
  };

  queueMicrotask(()=>{try{if(isGravity())state.gravityCinematicVersionV162=VERSION;}catch(_){}});
})();
