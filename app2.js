function renderBoard(){
  boardEl.innerHTML='';cellEls=Array.from({length:state.size},()=>Array(state.size));previewTouched=[];
  boardEl.setAttribute('aria-label',`${state.size} by ${state.size} game grid`);
  const frag=document.createDocumentFragment();
  for(let y=0;y<state.size;y++)for(let x=0;x<state.size;x++){
    const v=Number(state.board[y][x])||0,c=document.createElement('div');
    c.className='cell'+(v?` filled pc-${Math.min(7,Math.max(1,v))}`:'');
    if(v)applyPaletteVars(c,Math.min(7,Math.max(1,v)));
    c.dataset.x=x;c.dataset.y=y;c.setAttribute('aria-hidden','true');cellEls[y][x]=c;
    const bomb=state.bombs.find(b=>b.x===x&&b.y===y);
    if(bomb){c.classList.add('bomb');c.dataset.bomb=bomb.t;if(bomb.t<=3)c.classList.add('bomb-hot');}
    if(state.mode==='BLITZ'&&state.rushWarning&&state.rushWarning.x===x&&state.rushWarning.y===y)c.classList.add('rush-warning');
    frag.appendChild(c);
  }
  boardEl.appendChild(frag);
  if(state.mode==='GRAVITY'){
    const groups=Core.scanColorGroups(state.board,state.size,4).groups;
    for(const group of groups){
      const cls=group.length>=Core.GRAVITY_CLEAR_MIN?'gravity-ready':'gravity-near';
      for(const [gx,gy] of group)cellEls[gy]?.[gx]?.classList.add(cls);
    }
  }
  updatePreview();
}
function trayUnit(shape){const [w,h]=Core.shapeDims(shape),m=Math.max(w,h);return m>=5?15:m===4?18:21;}
function makePiece(shape,role='tray',unit=null,gap=null){
  const [w,h]=Core.shapeDims(shape),u=unit||trayUnit(shape),g=gap??4,art=document.createElement('div');
  art.className=`piece-art ${role} pc-${shape.color||3}`;applyPaletteVars(art,shape.color||3);art.dataset.shape=shape.id;art.dataset.cells=shape.cells.length;
  art.style.width=`${w*u+(w-1)*g}px`;art.style.height=`${h*u+(h-1)*g}px`;
  shape.cells.forEach(([x,y],i)=>{
    const b=document.createElement('span');b.className='piece-block';b.style.width=`${u}px`;b.style.height=`${u}px`;b.style.transform=`translate3d(${x*(u+g)}px,${y*(u+g)}px,0)`;
    if(Array.isArray(shape.cellColors)&&shape.cellColors[i])applyPaletteVars(b,shape.cellColors[i]);
    art.appendChild(b);
  });
  return art;
}
function renderTray(){
  trayEl.innerHTML='';
  state.tray.forEach((shape,idx)=>{
    const wrap=document.createElement('button');wrap.type='button';wrap.className='piece-wrap';wrap.dataset.idx=idx;
    if(!shape)wrap.classList.add('used');
    if(shape){
      wrap.classList.add(`pc-${shape.color||3}`);applyPaletteVars(wrap,shape.color||3);
      if(pieceCanRotate(shape)){
        wrap.classList.add('rotatable');
        const afford=document.createElement('span');afford.className='rotate-affordance';afford.setAttribute('aria-hidden','true');afford.textContent='↻';wrap.appendChild(afford);
      }
      wrap.appendChild(makePiece(shape));wrap.addEventListener('pointerdown',e=>startDrag(e,idx,wrap));
    }
    trayEl.appendChild(wrap);
  });
}
function clearPreview(){
  for(const c of previewTouched){c.classList.remove('preview-ok','preview-bad','preview-clear');c.style.removeProperty('--preview');c.style.removeProperty('--preview-hi');}
  previewTouched=[];boardEl.style.removeProperty('--preview');boardEl.style.removeProperty('--preview-hi');
}

function updatePreview(){
  clearPreview();
  if(selectedPiece===null||!previewAnchor)return;
  const shape=drag?.shape||state.tray[selectedPiece];if(!shape)return;
  const pal=colorOf(shape);boardEl.style.setProperty('--preview',pal.base);boardEl.style.setProperty('--preview-hi',pal.hi);
  const ok=Core.canPlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.size);
  shape.cells.forEach(([dx,dy],i)=>{
    const x=previewAnchor.x+dx,y=previewAnchor.y+dy;if(x<0||y<0||x>=state.size||y>=state.size)return;
    const c=cellEls[y]?.[x];if(c&&ok){
      const cp=PIECE_COLORS[shape.cellColors?.[i]||shape.color||1]||pal;c.style.setProperty('--preview',cp.base);c.style.setProperty('--preview-hi',cp.hi);
      c.classList.add('preview-ok');previewTouched.push(c);
    }
  });
  if(ok){
    const sim=Core.simulatePlace(state.board,shape,previewAnchor.x,previewAnchor.y,state.mode,state.size);
    if(sim?.waves?.length){
      const seen=new Set();
      for(const [x,y] of sim.waves.flatMap(w=>w.cells)){const k=`${x},${y}`;if(seen.has(k))continue;seen.add(k);const c=cellEls[y]?.[x];if(c){c.classList.add('preview-clear');previewTouched.push(c);}}
    }
  }
}
function dragLift(shape,pointerType){if(pointerType!=='touch')return 24;const [,h]=Core.shapeDims(shape);return 64+Math.min(18,h*3);}
function captureBoardMetrics(){
  const c0=cellEls[0]?.[0],c1=cellEls[0]?.[1],r1=cellEls[1]?.[0];if(!c0)return null;
  const a=c0.getBoundingClientRect(),b=c1?.getBoundingClientRect(),c=r1?.getBoundingClientRect(),br=boardEl.getBoundingClientRect();
  const stepX=b?b.left-a.left:a.width,stepY=c?c.top-a.top:a.height;
  return {boardRect:br,left0:a.left,top0:a.top,cellW:a.width,cellH:a.height,stepX,stepY,gapX:Math.max(1,stepX-a.width),gapY:Math.max(1,stepY-a.height)};
}
function pointOverBoard(px,py,m){const r=m.boardRect;return px>=r.left&&px<=r.right&&py>=r.top&&py<=r.bottom;}
function rotateTrayPiece(idx,wrap=null){
  if(state.gameOver||resolving||!state.tray[idx]||!pieceCanRotate(state.tray[idx]))return false;
  state.tray[idx]=Core.rotateShape(state.tray[idx]);
  rotationHintSeen=true;localStorage.setItem('gridshift_rotate_seen_v11','1');
  requestSound('rotate');
  renderTray();scheduleSave();
  const next=trayEl.querySelector(`[data-idx="${idx}"]`);if(next){next.classList.add('rotate-pop');setTimeout(()=>next.classList.remove('rotate-pop'),210);}
  return true;
}
function startDrag(e,idx,wrap){
  if(state.gameOver||resolving||!state.tray[idx])return;e.preventDefault();
  unlockAudio();
  const metrics=captureBoardMetrics();if(!metrics)return;
  selectedPiece=idx;previewAnchor=null;
  drag={idx,shape:Core.deepClone(state.tray[idx]),pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,startT:performance.now(),active:false,wrap,ghost:null,anchor:null,anchorKey:'',inBoard:false,valid:false,pointerType:e.pointerType,metrics,raf:0};
  wrap.classList.add('pressed');
  try{wrap.setPointerCapture(e.pointerId);}catch(_){ }
  wrap.addEventListener('pointermove',moveDrag);wrap.addEventListener('pointerup',endDrag,{once:true});wrap.addEventListener('pointercancel',cancelDrag,{once:true});
}
function beginActualDrag(){
  if(!drag||drag.active)return;drag.active=true;drag.wrap.classList.add('dragging');if(state.mode==='BLITZ')blitzArmed=true;
  createGhost();positionGhost(drag.x,drag.y);requestSound('pickup');scheduleDragFrame();
}
function moveDrag(e){
  if(!drag||e.pointerId!==drag.pointerId)return;e.preventDefault();
  const events=e.getCoalescedEvents?.(),p=events&&events.length?events[events.length-1]:e;drag.x=p.clientX;drag.y=p.clientY;
  const threshold=drag.pointerType==='touch'?13:5;
  if(!drag.active&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>=threshold)beginActualDrag();
  if(drag.active)scheduleDragFrame();
}
function scheduleDragFrame(){if(!drag||!drag.active||drag.raf)return;drag.raf=requestAnimationFrame(processDragFrame);}
function processDragFrame(){
  if(!drag||!drag.active)return;drag.raf=0;positionGhost(drag.x,drag.y);
  const lift=dragLift(drag.shape,drag.pointerType),targetY=drag.y-lift,m=drag.metrics;
  drag.inBoard=pointOverBoard(drag.x,targetY,m);const a=drag.inBoard?anchorFromPoint(drag.x,targetY,drag.shape,m):null,key=a?`${a.x},${a.y}`:'out';
  drag.anchor=a;drag.valid=!!(a&&Core.canPlace(state.board,drag.shape,a.x,a.y,state.size));
  if(drag.ghost){drag.ghost.classList.toggle('valid',drag.valid);drag.ghost.classList.toggle('invalid',drag.inBoard&&!drag.valid);}
  if(key!==drag.anchorKey){drag.anchorKey=key;previewAnchor=a;selectedPiece=drag.idx;updatePreview();}
}
function endDrag(e){
  if(!drag)return;const d=drag;
  if(d.raf){cancelAnimationFrame(d.raf);d.raf=0;}if(d.active)processDragFrame();
  cleanupDragListeners(d.wrap);d.wrap.classList.remove('pressed','dragging');drag=null;
  if(!d.active){previewAnchor=null;selectedPiece=null;clearPreview();rotateTrayPiece(d.idx,d.wrap);return;}
  const shouldPlace=d.inBoard&&d.valid&&d.anchor;
  if(shouldPlace){
    snapGhostToBoard(d.ghost,d.anchor,d.shape,d.metrics);previewAnchor=null;selectedPiece=null;clearPreview();tryPlace(d.idx,d.anchor.x,d.anchor.y);
  }else{
    previewAnchor=null;selectedPiece=null;clearPreview();if(d.inBoard){invalidFeedback();finishGhost(d.ghost,false);}else finishGhost(d.ghost,null);renderTray();
  }
}
function cancelDrag(){
  if(!drag)return;const d=drag;if(d.raf)cancelAnimationFrame(d.raf);cleanupDragListeners(d.wrap);d.wrap.classList.remove('pressed','dragging');drag=null;selectedPiece=null;previewAnchor=null;clearPreview();finishGhost(d.ghost,null);renderTray();
}
function cleanupDragListeners(wrap){wrap.removeEventListener('pointermove',moveDrag);}
function createGhost(){
  if(!drag||drag.ghost)return;const g=document.createElement('div');g.className='drag-ghost';
  const skin=document.createElement('div');skin.className='ghost-skin';const art=makePiece(drag.shape,'ghost',drag.metrics.cellW,drag.metrics.gapX);skin.appendChild(art);g.appendChild(skin);
  document.body.appendChild(g);drag.ghost=g;
  if(+art.dataset.cells!==drag.shape.cells.length)console.error('GRID SHIFT piece renderer mismatch',drag.shape.id);
}
function positionGhost(x,y){if(!drag?.ghost)return;const lift=dragLift(drag.shape,drag.pointerType);drag.ghost.style.transform=`translate3d(${x}px,${y-lift}px,0) translate(-50%,-50%)`;}
function ghostCenterForAnchor(anchor,shape,m){const [w,h]=Core.shapeDims(shape);return {x:m.left0+m.cellW/2+anchor.x*m.stepX+(w-1)*m.stepX/2,y:m.top0+m.cellH/2+anchor.y*m.stepY+(h-1)*m.stepY/2};}
function snapGhostToBoard(g,anchor,shape,m){
  if(!g)return;const t=ghostCenterForAnchor(anchor,shape,m);g.classList.add('drop-ok');g.style.transition='transform 85ms cubic-bezier(.2,.9,.3,1),opacity 85ms linear';g.style.transform=`translate3d(${t.x}px,${t.y}px,0) translate(-50%,-50%)`;g.style.opacity='.12';setTimeout(()=>g.remove(),100);
}
function finishGhost(g,success){
  if(!g)return;if(success===false)g.classList.add('drop-bad');else g.classList.add('drop-cancel');setTimeout(()=>g.remove(),150);
}
function anchorFromPoint(px,py,shape,m){
  const [w,h]=Core.shapeDims(shape),cx=(px-(m.left0+m.cellW/2))/m.stepX,cy=(py-(m.top0+m.cellH/2))/m.stepY;
  return {x:Math.round(cx-(w-1)/2),y:Math.round(cy-(h-1)/2)};
}

function resolveGravityPlacement(idx,shape,sim){
  resolving=true;
  state.tray[idx]=null;state.moves++;state.score+=shape.cells.length;state.lastPlaced=sim.placed.map(c=>c.slice());
  state.board=Core.cloneBoard(sim.stages?.[0]?.board||sim.board);
  renderAll();pulsePlaced(sim.placed);beep('place',shape.cells.length);
  boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),190);
  let totalUnits=0,totalCells=0;sim.waves.forEach(w=>{totalUnits+=w.units;totalCells+=w.cells.length;});
  const waveGap=245;
  sim.waves.forEach((wave,i)=>{
    const t=i*waveGap+80;
    setTimeout(()=>{
      burstCells(wave.cells,0);
      if(i===0)requestSound(wave.units>1?'multi':'clear');else requestSound('gravityChain',i+1);
      if(i>0){const pulse=document.createElement('i');pulse.className='gravity-chain-pulse';boardEl.appendChild(pulse);setTimeout(()=>pulse.remove(),480);}
    },t);
    setTimeout(()=>{
      state.board=Core.cloneBoard(sim.stages?.[i+1]?.board||sim.board);renderBoard();
      boardEl.classList.remove('gravity-settle');void boardEl.offsetWidth;boardEl.classList.add('gravity-settle');setTimeout(()=>boardEl.classList.remove('gravity-settle'),190);
    },t+105);
  });
  const doneAt=80+sim.waves.length*waveGap+80;
  setTimeout(()=>{
    state.board=Core.cloneBoard(sim.board);
    if(totalUnits>0){
      state.trayHadClear=true;const cascade=Math.max(0,sim.waves.length-1);state.score+=scoreClear(totalUnits,totalCells,cascade);
    }
    if(state.tray.every(p=>p===null))completeTray();
    if(state.score>state.best)state.best=state.score;
    resolving=false;selectedPiece=null;previewAnchor=null;renderAll();scheduleSave();
    if(!state.gameOver&&!state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode)))endGame('');
  },doneAt);
  return true;
}

function tryPlace(idx,x,y){
  if(state.gameOver||resolving)return false;
  const shape=state.tray[idx];if(!shape||!Core.canPlace(state.board,shape,x,y,state.size))return false;
  if(state.mode==='BLITZ')blitzArmed=true;
  const sim=Core.simulatePlace(state.board,shape,x,y,state.mode,state.size); if(!sim)return false;
  if(state.mode==='BLITZ'&&state.rushWarning&&sim.placed.some(([px,py])=>px===state.rushWarning.x&&py===state.rushWarning.y)){state.rushWarning=null;state.blitzMs=rushInterval();}
  if(state.mode==='GRAVITY'&&sim.waves.length)return resolveGravityPlacement(idx,shape,sim);
  const beforeBombs=state.bombs.length;
  state.board=sim.board; state.tray[idx]=null; state.moves++; state.score+=shape.cells.length; state.lastPlaced=sim.placed.map(c=>c.slice());
  queueFx('placed',sim.placed); beep('place',shape.cells.length);

  let totalUnits=0,totalCells=0;
  sim.waves.forEach((wave,i)=>{
    totalUnits+=wave.units; totalCells+=wave.cells.length; clearBombsAt(wave.cells); queueFx('burst',{cells:wave.cells,wave:i});
  });
  if(totalUnits>0){
    state.trayHadClear=true;
    const cascade=Math.max(0,sim.waves.length-1);
    const gain=scoreClear(totalUnits,totalCells,cascade);
    state.score+=gain;
    announce(totalUnits>1?`${totalUnits} CLEAR  +${gain}`:`CLEAR  +${gain}`,totalUnits>1);
    beep(totalUnits>1||cascade?'multi':'clear');
  }
  if(beforeBombs>state.bombs.length) announce(`BOMB CLEARED  +${(beforeBombs-state.bombs.length)*80}`,true);

  if(state.mode==='BOMBS'){
    tickBombs(); if(state.gameOver)return true;
    const bombCap=state.moves>=28?3:2;
    if(state.moves%4===0 && state.bombs.length<bombCap) spawnBomb(state.lastPlaced);
  }

  if(state.tray.every(p=>p===null)) completeTray();
  if(state.score>state.best)state.best=state.score;
  selectedPiece=null;previewAnchor=null;
  renderAll();scheduleSave();
  if(!state.gameOver && !state.tray.some(p=>p&&Core.hasModePlacement(state.board,p,state.size,state.mode))) endGame('NO MOVES');
  return true;
}
function scoreClear(units,cells,cascade){
  const base=cells*7+units*55+Math.max(0,units-1)*35;
  const chainMult=1+Math.min(state.chain,20)*.07;
  const cascadeMult=1+cascade*.25;
  return Math.round(base*chainMult*cascadeMult);
}
function completeTray(){
  if(state.mode==='SHIFT') applyShiftRound();
  if(state.trayHadClear){
    state.chain++;
    const bonus=state.chain>=2?25*state.chain:0;
    if(bonus){state.score+=bonus;if(state.chain===3||state.chain===5||state.chain%10===0){announce(`CHAIN ${state.chain}  +${bonus}`,true);beep('chain');queueFx('chain',state.chain);}}
  }else state.chain=0;
  state.trayHadClear=false;
  state.tray=Core.generateFairTray(state.board,state.mode,state.size,Math.random,state.moves);
}
function applyShiftRound(){
  const dir=state.nextShift;
  queueFx('shift',dir);
  state.board=Core.shiftBoard(state.board,state.size,dir);
  const clear=Core.scanClears(state.board,state.size,'CLASSIC');
  if(clear.units){
    clearBombsAt(clear.cells);Core.clearCells(state.board,clear.cells);state.trayHadClear=true;
    const gain=scoreClear(clear.units,clear.cells.length,0)+60;state.score+=gain;queueFx('burst',{cells:clear.cells,wave:0});
    announce(`SHIFT CLEAR  +${gain}`,true);beep('multi');
  }else{announce(`SHIFT ${SHIFT_GLYPH[dir]}`);beep('shift');}
  state.nextShift=randomShift(dir);
}
