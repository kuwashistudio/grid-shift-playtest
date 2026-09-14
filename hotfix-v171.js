/* GRID SHIFT v1.7.1 — unified success feedback language.
   - GRAVITY keeps its dedicated cinematic chain system untouched.
   - Other modes use achievement-scaled visual/audio rewards.
   - Old generic MULTI/SQUARE labels are suppressed while the new reward is active.
   - Non-GRAVITY tray-to-tray CHAIN terminology becomes STREAK.
*/
(function(){
  'use strict';

  const VERSION=171;
  const previousBurstCells=burstCells;
  const previousClearBombsAt=clearBombsAt;
  const previousAnnounce=announce;

  let rewardSerial=0;
  let rewardTimer=0;
  let pendingBombReward=null;
  let bombDominatesUntil=0;

  function isGravity(){return state?.mode==='GRAVITY';}
  function modeClass(mode){return String(mode||'CLASSIC').toLowerCase();}

  function lineUnits(cells,size){
    if(!Array.isArray(cells)||!cells.length)return 0;
    const set=new Set(cells.map(([x,y])=>`${x},${y}`));
    let n=0;
    for(let y=0;y<size;y++){
      let full=true;
      for(let x=0;x<size;x++)if(!set.has(`${x},${y}`)){full=false;break;}
      if(full)n++;
    }
    for(let x=0;x<size;x++){
      let full=true;
      for(let y=0;y<size;y++)if(!set.has(`${x},${y}`)){full=false;break;}
      if(full)n++;
    }
    return n;
  }

  function squareInfo(cells,size){
    if(!Array.isArray(cells)||!cells.length)return {count:0,maxSide:0};
    const set=new Set(cells.map(([x,y])=>`${x},${y}`));
    const accepted=[];
    const full=(x,y,side)=>{
      for(let yy=y;yy<y+side;yy++)for(let xx=x;xx<x+side;xx++)if(!set.has(`${xx},${yy}`))return false;
      return true;
    };
    for(let side=size;side>=4;side--){
      for(let y=0;y<=size-side;y++)for(let x=0;x<=size-side;x++){
        if(!full(x,y,side))continue;
        const contained=accepted.some(s=>x>=s.x&&y>=s.y&&x+side<=s.x+s.side&&y+side<=s.y+s.side);
        if(!contained)accepted.push({x,y,side});
      }
    }
    return {count:accepted.length,maxSide:accepted.reduce((m,s)=>Math.max(m,s.side),0)};
  }

  function rewardLife(tier){return tier>=4?1500:tier===3?1250:1050;}

  function clearRewardLayer(){
    clearTimeout(rewardTimer);
    boardEl?.querySelectorAll('.reward-layer-v171').forEach(el=>el.remove());
    boardEl?.classList.remove('reward-active-v171','reward-tier-2-v171','reward-tier-3-v171','reward-tier-4-v171');
  }

  function rewardSound(mode,tier,kind='clear'){
    unlockAudio().then(ok=>{
      if(!ok)return;
      const t=Math.max(2,Math.min(4,tier||2));
      const power=(t-1)/3;

      if(kind==='bomb'){
        noiseBurst(.12+power*.08,.046+power*.018,1550+t*260);
        tone(58,.34+power*.16,'sawtooth',.052+power*.012,0,42);
        tone(116,.24,'triangle',.042,.025,82);
        tone(232,.22,'triangle',.032,.09);
        if(t>=3){tone(348,.24,'sine',.026,.17);tone(464,.30,'sine',.021,.25);}
        if(t>=4){noiseBurst(.16,.038,6200,.10);tone(696,.34,'sine',.018,.36);}
        haptic(t>=4?[28,20,34,18,42]:t===3?[23,18,30]:[18,24]);
        return;
      }

      if(kind==='stable'){
        noiseBurst(.045,.020,4800);
        tone(392,.18,'triangle',.034,0);
        tone(493.88,.22,'triangle',.031,.055);
        tone(587.33,.26,'sine',.028,.12);
        tone(783.99,.34,'sine',.021,.22);
        haptic([16,18,24]);
        return;
      }

      if(kind==='streak'){
        const root=t>=4?523.25:t===3?493.88:440;
        tone(root,.15,'triangle',.030,0);
        tone(root*1.25,.18,'sine',.026,.07);
        tone(root*1.5,.22,'sine',.024,.14);
        tone(root*2,.30,'sine',.018,.23);
        haptic(t>=4?[18,18,26]:[13,18]);
        return;
      }

      if(mode==='SQUARES'){
        const root=t>=4?440:t===3?392:349.23;
        noiseBurst(.050+power*.025,.020+power*.006,4700);
        tone(root,.22,'triangle',.036+power*.006,0);
        tone(root*1.25,.26,'triangle',.031,.06);
        tone(root*1.5,.30,'sine',.027,.13);
        tone(root*2,.36,'sine',.021,.22);
        if(t>=3)tone(root*2.5,.34,'sine',.017,.32);
        if(t>=4)tone(root*3,.42,'sine',.014,.42);
      }else if(mode==='BLITZ'){
        const root=t>=4?587.33:t===3?523.25:466.16;
        noiseBurst(.055+power*.025,.023+power*.006,5600+t*300);
        tone(root,.13,'sawtooth',.030+power*.006,0,root*1.18);
        tone(root*1.5,.17,'triangle',.027,.055);
        tone(root*2,.22,'sine',.022,.12);
        if(t>=3){tone(root*2.5,.20,'sine',.017,.20);tone(root*3,.27,'sine',.014,.28);}
      }else if(mode==='SHIFT'){
        const root=t>=4?493.88:t===3?440:392;
        noiseBurst(.042,.018+power*.004,4200);
        tone(root,.16,'triangle',.030+power*.006,0);
        tone(root*1.25,.19,'sine',.027,.06);
        tone(root*1.5,.24,'sine',.024,.13);
        if(t>=3)tone(root*2,.30,'sine',.018,.23);
      }else{
        const root=t>=4?523.25:t===3?466.16:415.30;
        noiseBurst(.045+power*.028,.020+power*.007,4500+t*220);
        tone(root,.15,'triangle',.031+power*.006,0);
        tone(root*1.25,.19,'triangle',.027,.055);
        tone(root*1.5,.23,'sine',.023,.12);
        if(t>=3)tone(root*2,.29,'sine',.018,.21);
        if(t>=4)tone(root*2.5,.36,'sine',.015,.31);
      }
      haptic(t>=4?[20,17,26,17,32]:t===3?[17,20,25]:[13,18]);
    });
  }

  function showReward({label,sub='',tier=2,mode=state?.mode||'CLASSIC',kind='clear'}){
    if(!boardEl||isGravity())return;
    clearRewardLayer();
    const serial=++rewardSerial;
    const t=Math.max(2,Math.min(4,tier));
    const life=rewardLife(t);

    boardEl.classList.add('reward-active-v171',`reward-tier-${t}-v171`);

    const layer=document.createElement('div');
    layer.className=`reward-layer-v171 mode-${modeClass(mode)}-v171 tier-${t}-v171 kind-${kind}-v171`;
    layer.style.setProperty('--reward-life-v171',`${life}ms`);

    const flash=document.createElement('i');flash.className='reward-flash-v171';layer.appendChild(flash);
    const ringCount=t>=4?4:t===3?3:2;
    for(let i=0;i<ringCount;i++){
      const ring=document.createElement('i');ring.className='reward-ring-v171';
      ring.style.setProperty('--reward-ring-delay-v171',`${i*80}ms`);
      ring.style.setProperty('--reward-ring-size-v171',`${26+i*17}%`);
      layer.appendChild(ring);
    }

    const copy=document.createElement('div');copy.className='reward-copy-v171';
    const main=document.createElement('b');main.textContent=label;copy.appendChild(main);
    if(sub){const small=document.createElement('span');small.textContent=sub;copy.appendChild(small);}
    layer.appendChild(copy);

    const sparks=t>=4?28:t===3?20:13;
    for(let i=0;i<sparks;i++){
      const p=document.createElement('i');p.className='reward-spark-v171';
      p.style.setProperty('--reward-a-v171',`${i*(360/sparks)+(i%2?5:0)}deg`);
      p.style.setProperty('--reward-d-v171',`${74+t*24+(i%4)*11}px`);
      p.style.setProperty('--reward-delay-v171',`${(i%7)*18}ms`);
      layer.appendChild(p);
    }

    boardEl.appendChild(layer);
    rewardSound(mode,t,kind);
    rewardTimer=setTimeout(()=>{
      if(serial!==rewardSerial)return;
      layer.remove();
      boardEl.classList.remove('reward-active-v171',`reward-tier-${t}-v171`);
    },life+80);
  }

  function rewardForClear(cells){
    if(!state||isGravity()||!Array.isArray(cells)||!cells.length)return;
    const mode=state.mode;

    if(mode==='BOMBS'&&pendingBombReward){
      const b=pendingBombReward;pendingBombReward=null;
      bombDominatesUntil=performance.now()+420;
      const tier=b.count>=3?4:b.count>=2?3:2;
      showReward({
        label:b.count>=2?`BOMB CHAIN ${b.count}`:'BOMB BLAST',
        sub:b.count>=2?'CHAIN REACTION':'3×3 BLAST',
        tier,mode,kind:'bomb'
      });
      return;
    }

    if(mode==='BOMBS'&&performance.now()<bombDominatesUntil)return;

    if(mode==='SQUARES'){
      const info=squareInfo(cells,state.size);
      if(!info.count)return;
      const tier=(info.maxSide>=6||info.count>=3)?4:(info.maxSide>=5||info.count>=2)?3:2;
      if(info.count>=2){
        showReward({label:`${info.count} SQUARES`,sub:`MAX ${info.maxSide}×${info.maxSide}`,tier,mode});
      }else{
        showReward({label:`${info.maxSide}×${info.maxSide}`,sub:'SQUARE',tier,mode});
      }
      return;
    }

    const units=lineUnits(cells,state.size);
    if(units<2)return; // one clear already has strong short-form juice in v1.3.3
    const tier=units>=4?4:units===3?3:2;
    const sub=mode==='BLITZ'?'RUSH CLEAR':mode==='SHIFT'?'LINE CLEAR':mode==='BOMBS'?'LINE CLEAR':'MULTI LINE';
    showReward({label:`${units} CLEAR`,sub,tier,mode});
  }

  clearBombsAt=function(cells){
    if(state?.mode!=='BOMBS')return previousClearBombsAt(cells);
    const before=Array.isArray(state.bombs)?state.bombs.length:0;
    const out=previousClearBombsAt(cells);
    const after=Array.isArray(state.bombs)?state.bombs.length:0;
    const n=Math.max(0,before-after);
    if(n>0){
      pendingBombReward={count:n,gain:Number(state.bombLastBlast?.gain)||0};
    }
    return out;
  };

  burstCells=function(cells,wave=0){
    if(!isGravity()){
      try{rewardForClear(cells);}catch(_){ }
    }
    return previousBurstCells(cells,wave);
  };

  announce=function(text,strong=false){
    let next=String(text??'');
    if(!isGravity()&&/^CHAIN\s+\d+/i.test(next))next=next.replace(/^CHAIN/i,'STREAK');
    const out=previousAnnounce(next,strong);

    if(state?.mode==='SHIFT'&&/^STABLE\b/i.test(next)){
      setTimeout(()=>showReward({label:'STABLE',sub:'NO SHIFT',tier:3,mode:'SHIFT',kind:'stable'}),70);
    }else if(!isGravity()&&/^STREAK\s+(\d+)/i.test(next)){
      const m=next.match(/^STREAK\s+(\d+)/i),n=Number(m?.[1])||0;
      const tier=n>=10?4:n>=5?3:2;
      setTimeout(()=>showReward({label:`STREAK ${n}`,sub:'KEEP IT GOING',tier,mode:state?.mode||'CLASSIC',kind:'streak'}),520);
    }
    return out;
  };

  queueMicrotask(()=>{
    try{if(state)state.rewardFeedbackVersionV171=VERSION;}catch(_){ }
  });
})();
