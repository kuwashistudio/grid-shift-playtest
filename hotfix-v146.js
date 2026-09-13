/* GRID SHIFT v1.4.6 — make the current BOMBS clear rule authoritative.
   Current rule:
   - A normal row/column clear that touches a bomb triggers a controlled blast.
   - That bomb clears its visible 3x3 area.
   - Any bomb inside that 3x3 chains, and each chained bomb clears its own 3x3.
   - Fuse expiry remains game over (handled by the existing v1.3.9+ timer rule).
*/
(function(){
  'use strict';

  const previousClearBombsAt=clearBombsAt;

  function key(x,y){return `${x},${y}`;}
  function inBoard(x,y){return x>=0&&y>=0&&x<state.size&&y<state.size;}
  function cheb(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));}

  function blastCells(b){
    const out=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const x=b.x+dx,y=b.y+dy;
      if(inBoard(x,y))out.push([x,y]);
    }
    return out;
  }

  function chainFrom(seeds){
    const queue=seeds.slice(),seen=new Set(),out=[];
    while(queue.length){
      const b=queue.shift(),k=key(b.x,b.y);
      if(seen.has(k))continue;
      seen.add(k);out.push(b);
      for(const other of state.bombs||[]){
        const ok=key(other.x,other.y);
        if(!seen.has(ok)&&cheb(b,other)<=1)queue.push(other);
      }
    }
    return out;
  }

  function flashBlast(chain){
    const snapshot=chain.map(b=>({x:b.x,y:b.y}));
    setTimeout(()=>{
      if(!boardEl||!cellEls?.length)return;
      for(const b of snapshot){
        const minX=Math.max(0,b.x-1),maxX=Math.min(state.size-1,b.x+1);
        const minY=Math.max(0,b.y-1),maxY=Math.min(state.size-1,b.y+1);
        const a=cellEls[minY]?.[minX],z=cellEls[maxY]?.[maxX];
        if(!a||!z)continue;
        const f=document.createElement('i');
        f.className='bomb-blast-box-v146'+(snapshot.length>1?' chain':'');
        f.style.left=`${a.offsetLeft-1}px`;
        f.style.top=`${a.offsetTop-1}px`;
        f.style.width=`${z.offsetLeft+z.offsetWidth-a.offsetLeft+2}px`;
        f.style.height=`${z.offsetTop+z.offsetHeight-a.offsetTop+2}px`;
        boardEl.appendChild(f);
        setTimeout(()=>f.remove(),650);
      }
    },0);
  }

  clearBombsAt=function(cells){
    if(state?.mode!=='BOMBS')return previousClearBombsAt(cells);
    if(!Array.isArray(cells)||!cells.length||!Array.isArray(state.bombs)||!state.bombs.length)return;

    const cleared=new Set(cells.map(([x,y])=>key(x,y)));
    const seeds=state.bombs.filter(b=>cleared.has(key(b.x,b.y)));
    if(!seeds.length)return;

    const chain=chainFrom(seeds);
    const chainKeys=new Set(chain.map(b=>key(b.x,b.y)));
    const blastSet=new Set();
    for(const b of chain)for(const [x,y] of blastCells(b))blastSet.add(key(x,y));

    let extra=0;
    for(const k of blastSet){
      const [x,y]=k.split(',').map(Number);
      if(state.board[y][x])extra++;
      state.board[y][x]=0;
    }
    state.bombs=state.bombs.filter(b=>!chainKeys.has(key(b.x,b.y)));

    const n=chain.length;
    const gain=140*n + 100*(n*(n-1)/2) + extra*4;
    state.score+=gain;
    state.bombLastBlast={count:n,gain};

    const fxCells=[...blastSet].map(k=>k.split(',').map(Number));
    if(fxCells.length)queueFx('burst',{cells:fxCells,wave:0});
    flashBlast(chain);
  };
})();
