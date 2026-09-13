/* GRID SHIFT v1.3.3 — ordered SHIFT mission + synchronized clear juice */
(function(){
  'use strict';

  const PATTERNS=['V_UP','V_DOWN','H_LEFT','H_RIGHT'];
  const PATTERN_TEXT={
    V_UP:'↑↓↑↓↑↓↑↓↑↓',
    V_DOWN:'↓↑↓↑↓↑↓↑↓↑',
    H_LEFT:'←→←→←→←→←→',
    H_RIGHT:'→←→←→←→←→←'
  };

  function randomPattern(prev=null){
    const pool=PATTERNS.filter(p=>p!==prev);
    const src=pool.length?pool:PATTERNS;
    return src[Math.floor(Math.random()*src.length)];
  }

  function waveShift(board,size,pattern){
    const out=Core.emptyBoard(size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const v=board[y][x];if(!v)continue;
      let xx=x,yy=y;
      if(pattern==='V_UP'||pattern==='V_DOWN'){
        const firstUp=pattern==='V_UP';
        const up=(x%2===0)?firstUp:!firstUp;
        yy=(y+(up?-1:1)+size)%size;
      }else{
        const firstLeft=pattern==='H_LEFT';
        const left=(y%2===0)?firstLeft:!firstLeft;
        xx=(x+(left?-1:1)+size)%size;
      }
      out[yy][xx]=v;
    }
    return out;
  }

  function shuffled(arr){
    const a=arr.slice();
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }

  function placementRecords(board,piece,size,limit=48){
    const out=[];
    for(const shape of Core.modeRotations(piece,'SHIFT')){
      for(const [x,y] of Core.placements(board,shape,size)){
        out.push({shape,x,y,cells:shape.cells.map(([dx,dy])=>[x+dx,y+dy])});
      }
    }
    if(out.length<=limit)return shuffled(out);
    return shuffled(out).slice(0,limit);
  }

  /* Pick targets from a real two-move solution, not merely from two independently
     reachable cells. This guarantees that ① -> ② has at least one valid route. */
  function chooseOrderedMission(){
    if(!state||state.mode!=='SHIFT')return [];
    const pieceIds=(state.tray||[]).map((p,i)=>p?i:-1).filter(i=>i>=0);
    const solutions=[];

    for(const firstIdx of shuffled(pieceIds)){
      const firstPiece=state.tray[firstIdx];
      const firstMoves=placementRecords(state.board,firstPiece,state.size,44);
      for(const first of firstMoves.slice(0,24)){
        const sim1=Core.simulatePlace(state.board,first.shape,first.x,first.y,'SHIFT',state.size);
        if(!sim1)continue;
        const firstSet=new Set(first.cells.map(([x,y])=>`${x},${y}`));
        const secondIds=shuffled(pieceIds.filter(i=>i!==firstIdx));

        for(const secondIdx of secondIds){
          const secondMoves=placementRecords(sim1.board,state.tray[secondIdx],state.size,34);
          for(const second of secondMoves.slice(0,18)){
            const secondCells=second.cells.filter(([x,y])=>!state.board[y][x]&&!firstSet.has(`${x},${y}`));
            if(!secondCells.length)continue;
            const a1s=shuffled(first.cells).slice(0,Math.min(4,first.cells.length));
            const a2s=shuffled(secondCells).slice(0,Math.min(5,secondCells.length));
            for(const [x1,y1] of a1s)for(const [x2,y2] of a2s){
              const dist=Math.abs(x1-x2)+Math.abs(y1-y2);
              if(dist<4)continue;
              const edge1=Math.min(x1,y1,state.size-1-x1,state.size-1-y1);
              const edge2=Math.min(x2,y2,state.size-1-x2,state.size-1-y2);
              const score=dist*4+Math.min(edge1,2)+Math.min(edge2,2);
              solutions.push({a1:{x:x1,y:y1},a2:{x:x2,y:y2},score});
              if(solutions.length>=30)break;
            }
            if(solutions.length>=30)break;
          }
          if(solutions.length>=30)break;
        }
        if(solutions.length>=30)break;
      }
      if(solutions.length>=30)break;
    }

    if(solutions.length){
      solutions.sort((a,b)=>b.score-a.score);
      const top=solutions.slice(0,Math.min(10,solutions.length));
      const pick=top[Math.floor(Math.random()*top.length)];
      return [
        {x:pick.a1.x,y:pick.a1.y,hit:false,order:1},
        {x:pick.a2.x,y:pick.a2.y,hit:false,order:2}
      ];
    }

    /* Fallback keeps the mode playable on a nearly full board. */
    const existing=Array.isArray(state.shiftAnchors)?state.shiftAnchors.filter(a=>Number.isInteger(a.x)&&Number.isInteger(a.y)):[];
    if(existing.length>=2)return existing.slice(0,2).map((a,i)=>({x:a.x,y:a.y,hit:false,order:i+1}));
    const empty=[];
    for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++)if(!state.board[y][x])empty.push({x,y});
    return shuffled(empty).slice(0,2).map((a,i)=>({...a,hit:false,order:i+1}));
  }

  function syncMissionFlags(){
    if(!Array.isArray(state?.shiftAnchors))return;
    state.shiftAnchors.forEach((a,i)=>{
      a.hit=!state.shiftMissionFailed&&((i===0&&state.shiftStep>=1)||(i===1&&state.shiftStep>=2));
      a.wrong=!!state.shiftMissionFailed;
      a.order=i+1;
    });
  }

  function prepareOrderedMission(forcePattern=false){
    if(!state||state.mode!=='SHIFT')return;
    if(forcePattern||!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern(state.shiftPattern);
    state.shiftAnchor=null;
    state.shiftAnchorHit=false;
    state.shiftStep=0;
    state.shiftMissionFailed=false;
    state.shiftAnchors=chooseOrderedMission();
    state.shiftRoundId=(Number(state.shiftRoundId)||0)+1;
    syncMissionFlags();
  }

  function hits(anchor,cells){return !!(anchor&&Array.isArray(cells)&&cells.some(([x,y])=>x===anchor.x&&y===anchor.y));}

  function processOrderedPlacement(cells,playFeedback=true){
    if(!state||state.mode!=='SHIFT'||state.shiftMissionFailed||state.shiftStep>=2||!Array.isArray(state.shiftAnchors)||state.shiftAnchors.length<2)return false;
    const a1=state.shiftAnchors[0],a2=state.shiftAnchors[1];
    const h1=hits(a1,cells),h2=hits(a2,cells);
    let changed=false;

    if(state.shiftStep===0){
      if(h2){
        state.shiftMissionFailed=true;
        changed=true;
        if(playFeedback){requestSound('sequenceBad');showJuiceLabel('ORDER BROKEN','bad');}
      }else if(h1){
        state.shiftStep=1;changed=true;
        if(playFeedback){requestSound('anchorStep',1);showJuiceLabel('①  LOCKED','good');}
      }
    }else if(state.shiftStep===1&&h2){
      state.shiftStep=2;changed=true;
      if(playFeedback){requestSound('anchorStep',2);showJuiceLabel('②  LOCKED','good');}
    }
    syncMissionFlags();
    return changed;
  }

  applyShiftRound=function(){
    if(!state||state.mode!=='SHIFT')return;
    /* The third piece reaches completeTray before outer tryPlace wrappers return. */
    processOrderedPlacement(state.lastPlaced,true);
    const pattern=PATTERNS.includes(state.shiftPattern)?state.shiftPattern:randomPattern();

    if(!state.shiftMissionFailed&&state.shiftStep>=2){
      announce('STABILIZED  •  ① → ②',true);
      requestSound('sequenceWin');
      showJuiceLabel('STABILIZED','good');
      boardEl.classList.remove('shift-stabilized-v131');void boardEl.offsetWidth;boardEl.classList.add('shift-stabilized-v131');
      setTimeout(()=>boardEl.classList.remove('shift-stabilized-v131'),440);
      return;
    }

    state.board=waveShift(state.board,state.size,pattern);
    boardEl.dataset.waveFx=pattern;
    boardEl.classList.remove('wave-shift-v131');void boardEl.offsetWidth;boardEl.classList.add('wave-shift-v131');
    setTimeout(()=>{boardEl.classList.remove('wave-shift-v131');delete boardEl.dataset.waveFx;},440);

    const clear=Core.scanClears(state.board,state.size,'CLASSIC');
    if(clear.units){
      clearBombsAt(clear.cells);Core.clearCells(state.board,clear.cells);state.trayHadClear=true;
      const gain=scoreClear(clear.units,clear.cells.length,0)+80;state.score+=gain;queueFx('burst',{cells:clear.cells,wave:0});
      announce(`WAVE CLEAR  +${gain}`,true);
    }else{
      announce(state.shiftMissionFailed?'WAVE  •  ORDER BROKEN':`WAVE  •  ${state.shiftStep}/2`);
      beep('shift');
    }
  };

  completeTray=function(){
    if(state.mode==='SHIFT')applyShiftRound();
    if(state.trayHadClear){
      state.chain++;
      const bonus=state.chain>=2?25*state.chain:0;
      if(bonus){
        state.score+=bonus;
        if(state.chain===3||state.chain===5||state.chain%10===0){announce(`CHAIN ${state.chain}  +${bonus}`,true);beep('chain');queueFx('chain',state.chain);}
      }
    }else state.chain=0;
    state.trayHadClear=false;
    state.tray=Core.generateFairTray(state.board,state.mode,state.size,Math.random,state.moves);
    if(state.mode==='SHIFT'){
      state.shiftPattern=randomPattern(state.shiftPattern);
      prepareOrderedMission(false);
    }
  };

  const baseTryPlace=tryPlace;
  tryPlace=function(idx,x,y){
    const isShift=state?.mode==='SHIFT';
    const roundId=Number(state?.shiftRoundId)||0;
    const before=Number(state?.moves)||0;
    const ok=baseTryPlace(idx,x,y);
    if(!ok||!isShift||!state)return ok;
    const after=Number(state.moves)||0;
    if(after>before&&Number(state.shiftRoundId)===roundId){
      if(processOrderedPlacement(state.lastPlaced,true)){renderAll();scheduleSave();}
    }
    return ok;
  };

  const baseRenderBoard=renderBoard;
  renderBoard=function(){
    const out=baseRenderBoard();
    if(state?.mode==='SHIFT'&&Array.isArray(state.shiftAnchors)){
      syncMissionFlags();
      state.shiftAnchors.forEach((a,i)=>{
        const c=cellEls[a.y]?.[a.x];if(!c)return;
        c.classList.add('shift-order-v133');
        c.dataset.orderGlyph=i===0?'①':'②';
        c.classList.toggle('order-current-v133',!state.shiftMissionFailed&&state.shiftStep===i);
        c.classList.toggle('order-locked-v133',!state.shiftMissionFailed&&i===1&&state.shiftStep===0);
        c.classList.toggle('order-done-v133',!state.shiftMissionFailed&&state.shiftStep>i);
        c.classList.toggle('order-failed-v133',!!state.shiftMissionFailed);
      });
    }
    return out;
  };

  const baseRenderModeStat=renderModeStat;
  renderModeStat=function(){
    baseRenderModeStat();
    if(state?.mode==='SHIFT'){
      const p=PATTERN_TEXT[state.shiftPattern]||'↑↓↑↓';
      const short=p.slice(0,4);
      const tail=state.shiftMissionFailed?'WAVE':state.shiftStep>=2?'SAFE':state.shiftStep===1?'②':'①';
      modeStatEl.textContent=`SHIFT ${short}  •  ${tail}`;
    }
  };

  const baseLoadSlot=loadSlot;
  loadSlot=async function(mode,size){
    await baseLoadSlot(mode,size);
    if(state?.mode==='SHIFT'){
      state.shiftAnchor=null;state.shiftAnchorHit=false;
      const valid=Array.isArray(state.shiftAnchors)&&state.shiftAnchors.length===2&&state.shiftAnchors.every(a=>Number.isInteger(a.x)&&Number.isInteger(a.y)&&a.x>=0&&a.y>=0&&a.x<state.size&&a.y<state.size);
      if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
      if(!valid||!Number.isInteger(state.shiftStep))prepareOrderedMission(false);
      syncMissionFlags();renderAll();scheduleSave(true);
    }
  };

  const baseNewRun=newRun;
  newRun=function(keepBest=true){
    const out=baseNewRun(keepBest);
    if(state?.mode==='SHIFT'){
      state.shiftPattern=randomPattern();prepareOrderedMission(false);renderAll();scheduleSave(true);
    }
    return out;
  };

  /* ---------- Clear feedback: audio and visuals share the same start time. ---------- */
  function connectPan(node,pan){
    const ctx=audioCtx;if(!ctx)return node;
    if(typeof ctx.createStereoPanner==='function'){
      const p=ctx.createStereoPanner();p.pan.value=Math.max(-.85,Math.min(.85,pan||0));node.connect(p);p.connect(audioOut(ctx));return null;
    }
    node.connect(audioOut(ctx));return null;
  }

  function juiceTone(freq,dur=.08,type='sine',vol=.03,delay=0,slide=null,pan=0){
    const ctx=audioCtx;if(!ctx||ctx.state!=='running'||effectiveMuted())return;
    const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);connectPan(g,pan);o.start(t);o.stop(t+dur+.03);
  }

  function juiceNoise(dur=.025,vol=.012,filterFreq=3000,delay=0,pan=0){
    const ctx=audioCtx;if(!ctx||ctx.state!=='running'||effectiveMuted())return;
    const frames=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,frames,ctx.sampleRate),data=buf.getChannelData(0);
    for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
    filter.type='bandpass';filter.frequency.value=filterFreq;filter.Q.value=.75;g.gain.value=vol;
    src.buffer=buf;src.connect(filter);filter.connect(g);connectPan(g,pan);src.start(ctx.currentTime+delay);
  }

  function playClearJuice(cells,mode,wave=0){
    if(!cells?.length||effectiveMuted()||!audioCtx||audioCtx.state!=='running')return;
    const cx=cells.reduce((s,c)=>s+c[0]+.5,0)/cells.length;
    const pan=Math.max(-.72,Math.min(.72,(cx/state.size-.5)*1.45));
    const power=Math.max(1,Math.min(4,Math.ceil(cells.length/10)));
    juiceNoise(.022,.014+.002*power,3600,0,pan);

    if(mode==='SQUARES'){
      juiceTone(205,.105,'triangle',.038,0,145,pan);
      juiceTone(575,.10,'sine',.035,.035,760,pan);
      juiceTone(865,.14,'sine',.026,.082,1120,pan);
      if(power>=3)juiceTone(1150,.13,'sine',.018,.125,1450,pan);
    }else if(mode==='GRAVITY'){
      const root=330+Math.min(5,wave)*70;
      juiceTone(root,.085,'triangle',.035,0,root*.82,pan);
      juiceTone(root*1.48,.12,'sine',.03,.045,root*1.9,pan);
    }else if(mode==='SHIFT'){
      juiceTone(185,.11,'sawtooth',.026,0,390,pan);
      juiceTone(620,.09,'sine',.032,.045,860,pan);
      juiceTone(980,.11,'sine',.022,.092,1240,pan);
    }else{
      juiceTone(235,.085,'triangle',.034,0,175,pan);
      juiceTone(540,.085,'sine',.032,.03,720,pan);
      juiceTone(820,.11,'sine',.021,.07,1040,pan);
      if(power>=2)juiceTone(1080,.10,'sine',.017,.105,1340,pan);
    }
  }

  const baseBeep=beep;
  beep=function(kind,power=1){
    /* clear/multi are now fired by burstCells exactly when the visual starts. */
    if(kind==='clear'||kind==='multi')return;
    if(kind==='anchorStep'){
      const n=Math.max(1,Math.min(2,Number(power)||1));
      juiceNoise(.016,.011,4200,0,0);
      juiceTone(n===1?610:760,.055,'sine',.035,0,n===1?790:1030,0);
      juiceTone(n===1?900:1180,.075,'sine',.022,.035,n===1?1080:1420,0);return;
    }
    if(kind==='sequenceBad'){
      juiceNoise(.028,.014,700,0,0);juiceTone(210,.075,'triangle',.035,0,125,0);return;
    }
    if(kind==='sequenceWin'){
      juiceTone(520,.055,'sine',.035);juiceTone(720,.07,'sine',.032,.04);juiceTone(980,.095,'sine',.03,.09);juiceTone(1320,.12,'sine',.018,.145);return;
    }
    if(kind==='chain'){
      const n=Math.max(1,Math.min(8,Number(state?.chain)||2)),root=470+n*26;
      juiceTone(root,.055,'sine',.04);juiceTone(root*1.26,.075,'triangle',.034,.038);juiceTone(root*1.58,.095,'sine',.025,.082);return;
    }
    return baseBeep(kind,power);
  };

  function showJuiceLabel(text,tone='normal'){
    if(!boardEl||!text)return;
    const e=document.createElement('b');e.className=`juice-label-v133 ${tone==='bad'?'bad':''} ${tone==='good'?'good':''}`;e.textContent=text;boardEl.appendChild(e);setTimeout(()=>e.remove(),720);
  }

  function extraClearVisuals(cells,wave=0){
    if(!cells?.length||!state)return;
    const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const cx=(minX+maxX+1)/2,cy=(minY+maxY+1)/2;
    const mode=state.mode;

    playClearJuice(cells,mode,wave);
    scoreEl.classList.remove('juice-score-v133');void scoreEl.offsetWidth;scoreEl.classList.add('juice-score-v133');setTimeout(()=>scoreEl.classList.remove('juice-score-v133'),360);

    const ring=document.createElement('i');ring.className=`juice-ring-v133 juice-${mode.toLowerCase()}-v133`;ring.style.left=`${(cx/state.size)*100}%`;ring.style.top=`${(cy/state.size)*100}%`;boardEl.appendChild(ring);setTimeout(()=>ring.remove(),600);

    if(mode==='SQUARES'){
      const box=document.createElement('i');box.className='juice-square-v133';
      box.style.left=`${(minX/state.size)*100}%`;box.style.top=`${(minY/state.size)*100}%`;box.style.width=`${((maxX-minX+1)/state.size)*100}%`;box.style.height=`${((maxY-minY+1)/state.size)*100}%`;
      boardEl.appendChild(box);setTimeout(()=>box.remove(),620);showJuiceLabel('SQUARE!','good');
    }else if(mode!=='GRAVITY'){
      const w=maxX-minX+1,h=maxY-minY+1;
      if(w>=state.size-2||w>=h*2){const s=document.createElement('i');s.className='juice-sweep-v133 horizontal';s.style.top=`${(cy/state.size)*100}%`;boardEl.appendChild(s);setTimeout(()=>s.remove(),460);}
      if(h>=state.size-2||h>=w*2){const s=document.createElement('i');s.className='juice-sweep-v133 vertical';s.style.left=`${(cx/state.size)*100}%`;boardEl.appendChild(s);setTimeout(()=>s.remove(),460);}
      if(cells.length>=18)showJuiceLabel(mode==='SHIFT'?'WAVE CLEAR':'MULTI!','good');
    }

    const sample=shuffled(cells).slice(0,Math.min(10,cells.length));
    sample.forEach(([x,y],i)=>{
      const p=document.createElement('i');p.className='juice-chip-v133';
      const ang=(i/sample.length)*Math.PI*2+(Math.random()-.5)*.45,dist=18+Math.random()*25;
      p.style.left=`${((x+.5)/state.size)*100}%`;p.style.top=`${((y+.5)/state.size)*100}%`;
      p.style.setProperty('--jx',`${Math.cos(ang)*dist}px`);p.style.setProperty('--jy',`${Math.sin(ang)*dist}px`);p.style.setProperty('--jd',`${i*5}ms`);
      boardEl.appendChild(p);setTimeout(()=>p.remove(),520);
    });
  }

  const baseBurstCells=burstCells;
  burstCells=function(cells,wave=0){
    const delay=state?.mode==='GRAVITY'?wave*150:0;
    setTimeout(()=>extraClearVisuals(cells,wave),delay);
    return baseBurstCells(cells,wave);
  };

  const baseModeDemoHTML=modeDemoHTML;
  modeDemoHTML=function(id){
    if(id!=='SHIFT')return baseModeDemoHTML(id);
    const cells=miniCell(0,1,'md-cyan')+miniCell(1,2,'md-purple')+miniCell(2,1,'md-cyan')+miniCell(3,2,'md-purple');
    return `<div class="mode-demo demo-shift demo-shift-v131"><div class="mini-board">${cells}<b class="shift-wave-demo-v131">↑↓↑↓</b><i class="shift-order-demo-v133 one">①</i><i class="shift-order-demo-v133 two">②</i><em class="shift-order-arrow-v133">→</em></div></div>`;
  };

  queueMicrotask(()=>{
    try{
      buildMenu();renderMenu();
      if(state?.mode==='SHIFT'){
        state.shiftAnchor=null;state.shiftAnchorHit=false;
        if(!PATTERNS.includes(state.shiftPattern))state.shiftPattern=randomPattern();
        /* Start a clean ordered mission on upgrade rather than inheriting a 2-anchor
           round whose reachability was computed under the old rules. */
        prepareOrderedMission(false);renderAll();scheduleSave(true);
      }
    }catch(_){ }
  });
})();
