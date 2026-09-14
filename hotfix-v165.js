/* GRID SHIFT v1.6.5 — GRAVITY chain pacing pass.
   Even 2 CHAIN should feel earned. Chain 1 stays responsive; every follow-up gets
   an anticipation hold, a heavier impact, and a longer afterglow. Higher chains
   deliberately take more time instead of rushing through the cascade. */
(function(){
  'use strict';

  const VERSION=165;

  function bestChain(){return Math.max(0,Number(state?.gravityBestChainV158)||0);}
  function tierFor(chain){
    if(chain>=10)return 10;
    if(chain>=7)return 7;
    if(chain>=5)return 5;
    if(chain>=3)return 3;
    if(chain>=2)return 2;
    return 1;
  }
  function holdMs(chain){
    if(chain<=1)return 0;
    return Math.min(760,300+(chain-2)*90);
  }
  function gapMs(chain){
    if(chain<=1)return 620;
    return Math.min(1250,650+(chain-2)*125);
  }
  function fxLife(chain,isFinal){
    const base=chain===2?1450:chain===3?1750:chain===4?2050:chain===5?2450:Math.min(3300,2450+(chain-5)*180);
    return isFinal?base+320:base;
  }

  function clearChainFx(){
    const wrap=boardEl?.parentElement;
    wrap?.querySelectorAll('.gravity-chain-layer-v162,.gravity-chain-layer-v158').forEach(el=>el.remove());
    boardEl?.classList.remove('gravity-chain-impact-v162','gravity-chain-hold-v162','gravity-chain-apex-v162');
  }

  function pulseBoard(chain){
    if(!boardEl)return;
    boardEl.classList.remove('gravity-chain-impact-v162','gravity-chain-apex-v162');
    void boardEl.offsetWidth;
    boardEl.style.setProperty('--gravity-chain-power',String(Math.min(1,(chain-1)/7)));
    boardEl.classList.add('gravity-chain-impact-v162');
    if(chain>=5)boardEl.classList.add('gravity-chain-apex-v162');
    setTimeout(()=>boardEl?.classList.remove('gravity-chain-impact-v162','gravity-chain-apex-v162'),Math.min(1050,480+chain*78));
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

    const rayCount=chain>=10?28:chain>=7?24:chain>=5?20:chain>=4?15:chain>=3?12:8;
    for(let i=0;i<rayCount;i++){
      const ray=document.createElement('i');ray.className='gravity-chain-ray-v162';
      ray.style.setProperty('--a',`${i*(360/rayCount)+(chain%2?7:0)}deg`);
      ray.style.setProperty('--delay',`${(i%5)*16}ms`);
      ray.style.setProperty('--reach',`${Math.min(235,96+chain*15+(i%3)*11)}px`);
      layer.appendChild(ray);
    }

    if(chain>=5){
      const crown=document.createElement('div');crown.className='gravity-chain-crown-v162';
      for(let i=0;i<Math.min(24,10+chain*2);i++){
        const p=document.createElement('i');
        p.style.setProperty('--x',`${(i*37)%100}%`);
        p.style.setProperty('--y',`${10+((i*53)%80)}%`);
        p.style.setProperty('--pd',`${(i%7)*34}ms`);
        crown.appendChild(p);
      }
      layer.appendChild(crown);
    }

    wrap.appendChild(layer);
    setTimeout(()=>layer.remove(),life+100);
  }

  function anticipationSound(chain){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const root=[330,392,440,493.88,587.33,659.25,783.99,880][Math.min(7,Math.max(0,chain-2))];
      const p=Math.min(1,(chain-1)/7);
      tone(Math.max(55,root/5),.24+p*.10,'sine',.030+p*.010,0,Math.max(82,root/3.6));
      tone(root*.75,.18+p*.06,'triangle',.025+p*.008,.055,root);
      tone(root*1.5,.11,'sine',.018,.16);
      if(chain>=4)noiseBurst(.09,.018+p*.010,3400+chain*180,.13);
    });
  }

  function impactSound(chain,isFinal,isNewBest){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const roots=[392,440,493.88,587.33,659.25,783.99,880,987.77,1174.66];
      const root=roots[Math.min(roots.length-1,Math.max(0,chain-2))];
      const p=Math.min(1,(chain-1)/8);

      noiseBurst(.10+p*.08,.045+p*.020,2200+chain*220);
      tone(Math.max(48,root/5),.28+p*.14,'sawtooth',.050+p*.016,0,Math.max(72,root/3.4));
      tone(root,.20+p*.07,'triangle',.052+p*.012,.018);
      tone(root*1.25,.24+p*.08,'triangle',.047+p*.012,.075);
      tone(root*1.5,.28+p*.09,'sine',.043+p*.012,.135);
      tone(root*2,.32+p*.10,'sine',.034+p*.010,.205);

      if(chain>=3){
        tone(root*2.25,.16,'sine',.024,.31);
        tone(root*2.5,.20,'sine',.022,.39);
      }
      if(chain>=5){
        noiseBurst(.14,.040,5600,.23);
        tone(root*.5,.38,'triangle',.040,.18,root*.75);
        tone(root*3,.24,'sine',.021,.50);
        tone(root*3.5,.28,'sine',.017,.61);
      }
      if(isFinal){
        const d=chain>=5?.86:.68;
        tone(root*.75,.34,'triangle',.043,d,root);
        tone(root*1.5,.30,'sine',.040,d+.07);
        tone(root*2,.38,'sine',.032,d+.15);
        if(chain>=5)tone(root*3,.42,'sine',.021,d+.25);
      }
      if(isNewBest){
        const d=chain>=5?1.32:1.06;
        tone(root*2,.18,'triangle',.032,d);
        tone(root*2.5,.24,'sine',.027,d+.12);
        tone(root*3,.34,'sine',.020,d+.24);
      }

      haptic(chain>=5?[24,28,30,26,38]:chain>=3?[18,24,22]:[14,22,16]);
    });
  }

  resolveGravityPlacement=function(idx,shape,sim){
    resolving=true;
    state.gravityRewardVersionV158=158;
    state.gravityCinematicVersionV165=VERSION;
    state.tray[idx]=null;
    state.moves++;
    state.score+=shape.cells.length;
    state.lastPlaced=sim.placed.map(c=>c.slice());
    state.board=Core.cloneBoard(sim.stages?.[0]?.board||sim.board);
    renderAll();pulsePlaced(sim.placed);beep('place',shape.cells.length);
    boardEl.classList.add('gravity-settle');
    setTimeout(()=>boardEl.classList.remove('gravity-settle'),240);

    let totalUnits=0,totalCells=0;
    sim.waves.forEach(w=>{totalUnits+=w.units;totalCells+=w.cells.length;});
    const comboTotal=sim.waves.length;
    const priorBest=bestChain();

    let cursor=110;
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
          setTimeout(()=>boardEl.classList.remove('gravity-settle'),240);
        },eventAt+155);
        cursor=eventAt+gapMs(chain);
        return;
      }

      const revealAt=cursor;
      const hold=holdMs(chain);
      const burstAt=revealAt+hold;
      const settleAt=burstAt+210+Math.min(150,(chain-2)*30);

      setTimeout(()=>{
        boardEl.classList.add('gravity-chain-hold-v162');
        showChainFx(chain,isFinal,isNewBest);
        anticipationSound(chain);
      },revealAt);

      setTimeout(()=>{
        boardEl.classList.remove('gravity-chain-hold-v162');
        pulseBoard(chain);
        burstCells(wave.cells,0);
        impactSound(chain,isFinal,isNewBest);
      },burstAt);

      setTimeout(()=>{
        state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);
        renderBoard();
        boardEl.classList.remove('gravity-settle');void boardEl.offsetWidth;boardEl.classList.add('gravity-settle');
        setTimeout(()=>boardEl.classList.remove('gravity-settle'),340+Math.min(240,(chain-2)*45));
      },settleAt);

      cursor=settleAt+gapMs(chain);
    });

    const finalLinger=comboTotal>=5?1350:comboTotal>=4?1150:comboTotal>=3?950:comboTotal===2?760:280;
    const doneAt=cursor+finalLinger;
    setTimeout(()=>{
      clearChainFx();
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

  queueMicrotask(()=>{try{if(state?.mode==='GRAVITY')state.gravityCinematicVersionV165=VERSION;}catch(_){}});
})();
