'use strict';

const Core=window.GridShiftCore;
const Platform=window.GridShiftPlatform;

const MODES={
  CLASSIC:{title:'CLASSIC',glyph:'▦'},
  SHIFT:{title:'SHIFT',glyph:'⇄'},
  GRAVITY:{title:'GRAVITY',glyph:'↓'},
  SQUARES:{title:'SQUARES',glyph:'▣'},
  BLITZ:{title:'RUSH',glyph:'⚡'},
  BOMBS:{title:'BOMBS',glyph:'●'}
};
const SIZES={10:{name:'STANDARD',label:'10×10'}};
const SHIFT_DIRS=['LEFT','RIGHT','UP','DOWN'];
const SHIFT_GLYPH={LEFT:'←',RIGHT:'→',UP:'↑',DOWN:'↓'};
const RUSH_FIRST_MS=3200;
const RUSH_WARN_MS=720;
const RUSH_MAX_INTERVAL_MS=3800;
const RUSH_MIN_INTERVAL_MS=1900;

// Semantic palette learned from geometry: one glance at color narrows the possible fit family.
const PIECE_COLORS={
  1:{base:'#2F80ED',hi:'#78B7FF',lo:'#1657B7'}, // straight / bars
  2:{base:'#F4B63C',hi:'#FFD978',lo:'#C77D13'}, // squares / blocks
  3:{base:'#4FC06A',hi:'#8CE89D',lo:'#278B43'}, // L / corners
  4:{base:'#985BEF',hi:'#C996FF',lo:'#6833B8'}, // T / cross
  5:{base:'#F25F8B',hi:'#FF9DB8',lo:'#BD315D'}, // zigzag
  6:{base:'#19B6C9',hi:'#72E1EA',lo:'#087B8B'}, // cyan
  7:{base:'#F06B3E',hi:'#FFA17D',lo:'#B94324'}  // coral / gravity late-game
};

const $=id=>document.getElementById(id);
const boardEl=$('board');
const trayEl=$('tray');
const scoreEl=$('score');
const bestEl=$('best');
const modeNameEl=$('modeName');
const sizeNameEl=$('sizeName');
const chainEl=$('chain');
const modeStatEl=$('modeStat');
const statusEl=$('status');
const modeHintEl=$('modeHint');
const modeOverlay=$('modeOverlay');
const confirmOverlay=$('confirmOverlay');
const overOverlay=$('gameOverOverlay');
const muteBtn=$('muteBtn');
const dragHintEl=$('dragHint');
const blitzClockEl=$('blitzClock');
const blitzProgressEl=$('blitzProgress');

let state=null;
let selectedPiece=null;
let drag=null;
let previewAnchor=null;
let menuSize=10;
let saveTimer=null;
let audioCtx=null;
let masterGain=null;
let audioPrimed=false;
let userMuted=localStorage.getItem('gridshift_user_muted_v9')==='1';
let platformAudio=true;
let platformPaused=false;
let docHidden=document.hidden;
let timerFrame=0;
let lastFrame=performance.now();
let blitzArmed=false;
let statusTimer=null;
let fxQueue=[];
let rotationHintSeen=localStorage.getItem('gridshift_rotate_seen_v11')==='1';
let cellEls=[];
let previewTouched=[];
let dragRaf=0;
let endingRun=false;
let resolving=false;

function slotKey(mode,size){return `state_v11_${mode.toLowerCase()}_${size}`;}
function defaultState(mode='CLASSIC',size=10){
  return {
    version:11, mode, size,
    board:Core.emptyBoard(size), tray:[], score:0, best:0, chain:0, trayHadClear:false,
    moves:0, nextShift:randomShift(), bombs:[], blitzMs:RUSH_FIRST_MS, rushWarning:null, lastPlaced:[],
    gameOver:false, startedAt:Date.now(), lastPlayedAt:Date.now()
  };
}
function randomShift(prev){
  let d=SHIFT_DIRS[Math.floor(Math.random()*SHIFT_DIRS.length)];
  if(prev && Math.random()<0.7){ while(d===prev) d=SHIFT_DIRS[Math.floor(Math.random()*SHIFT_DIRS.length)]; }
  return d;
}
function safeParse(s){try{return JSON.parse(s);}catch(_){return null;}}
function validateState(raw,mode,size){
  if(!raw || raw.version!==11 || raw.mode!==mode || raw.size!==size) return null;
  if(!Array.isArray(raw.board)||raw.board.length!==size||raw.board.some(r=>!Array.isArray(r)||r.length!==size)) return null;
  raw.board=raw.board.map(r=>r.map(v=>{const n=Number(v)||0;return n>=1&&n<=7?n:0;}));
  raw.tray=Array.isArray(raw.tray)?raw.tray.slice(0,3).map(p=>{
    if(!p||!Core.SHAPE_BY_ID[p.id])return null;
    const base=Core.deepClone(Core.SHAPE_BY_ID[p.id]);
    if(Array.isArray(p.cells)&&p.cells.length===base.cells.length&&p.cells.every(c=>Array.isArray(c)&&c.length===2&&Number.isFinite(+c[0])&&Number.isFinite(+c[1])))base.cells=p.cells.map(c=>[+c[0],+c[1]]);
    const color=Math.max(1,Math.min(7,Number(p.color)||base.color||1));base.color=color;
    if(Array.isArray(p.cellColors)&&p.cellColors.length===base.cells.length)base.cellColors=p.cellColors.map(v=>Math.max(1,Math.min(7,Number(v)||1)));
    return base;
  }):[];
  while(raw.tray.length<3) raw.tray.push(null);
  raw.score=Number(raw.score)||0; raw.best=Math.max(Number(raw.best)||0,raw.score);
  raw.chain=Math.max(0,Number(raw.chain)||0); raw.moves=Math.max(0,Number(raw.moves)||0);
  raw.trayHadClear=!!raw.trayHadClear; raw.bombs=Array.isArray(raw.bombs)?raw.bombs:[];
  raw.nextShift=SHIFT_DIRS.includes(raw.nextShift)?raw.nextShift:randomShift();
  raw.blitzMs=Math.max(0,Number(raw.blitzMs)||RUSH_FIRST_MS); raw.rushWarning=raw.rushWarning&&Number.isFinite(raw.rushWarning.x)&&Number.isFinite(raw.rushWarning.y)?raw.rushWarning:null; raw.lastPlaced=Array.isArray(raw.lastPlaced)?raw.lastPlaced:[];
  raw.gameOver=!!raw.gameOver;
  return raw;
}

async function loadSlot(mode,size){
  await saveNow();
  const raw=safeParse(await Platform.get(slotKey(mode,size)));
  state=validateState(raw,mode,size) || defaultState(mode,size);
  if(!state.tray.some(Boolean) && !state.gameOver) state.tray=Core.generateFairTray(state.board,state.mode,state.size,Math.random,state.moves);
  selectedPiece=null; previewAnchor=null; drag=null; blitzArmed=(mode==='BLITZ'); if(mode==='BLITZ'&&!state.rushWarning&&state.blitzMs<=0)state.blitzMs=RUSH_FIRST_MS; fxQueue=[];
  clearTimeout(statusTimer); statusEl.textContent=''; statusEl.classList.remove('strong','status-pop');
  menuSize=size;
  closeOverlays();
  renderAll();
  savePrefs();
}
async function savePrefs(){
  if(!state)return;
  Platform.set('prefs_v11',{mode:state.mode,size:state.size});
}
function serializableState(){
  if(!state)return null;
  state.lastPlayedAt=Date.now();
  return state;
}
function scheduleSave(immediate=false){
  clearTimeout(saveTimer);
  if(immediate) saveNow(); else saveTimer=setTimeout(saveNow,220);
}
async function saveNow(){
  clearTimeout(saveTimer);
  if(!state)return;
  try{await Platform.set(slotKey(state.mode,state.size),serializableState());}catch(_){ }
}

function newRun(keepBest=true){
  const best=keepBest&&state?state.best:0;
  const mode=state?.mode||'CLASSIC', size=state?.size||10;
  state=defaultState(mode,size); state.best=best;
  state.tray=Core.generateFairTray(state.board,mode,size,Math.random,state.moves);
  selectedPiece=null; previewAnchor=null; blitzArmed=(mode==='BLITZ'); endingRun=false; resolving=false;
  boardEl.classList.remove('run-over','bomb-detonate');trayEl.classList.remove('run-over');
  overOverlay.classList.remove('open'); confirmOverlay.classList.remove('open');
  renderAll(); scheduleSave(true); requestSound('start');
}

function effectiveMuted(){return userMuted||!platformAudio;}
function buildAudio(){
  if(audioCtx)return audioCtx;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  try{
    audioCtx=new AC({latencyHint:'interactive'});
    masterGain=audioCtx.createGain();masterGain.gain.value=.72;
    masterGain.connect(audioCtx.destination);
  }catch(_){audioCtx=null;masterGain=null;}
  return audioCtx;
}
async function unlockAudio(){
  if(effectiveMuted())return false;
  const ctx=buildAudio();if(!ctx)return false;
  try{
    if(ctx.state==='suspended'||ctx.state==='interrupted')await ctx.resume();
    if(!audioPrimed&&ctx.state==='running'){
      const b=ctx.createBuffer(1,1,ctx.sampleRate),src=ctx.createBufferSource();src.buffer=b;src.connect(masterGain||ctx.destination);src.start();audioPrimed=true;
    }
    return ctx.state==='running';
  }catch(_){return false;}
}
function audioOut(ctx){return masterGain||ctx.destination;}
function tone(freq,dur=.05,type='sine',vol=.05,delay=0,slide=null){
  const ctx=audioCtx;if(!ctx||ctx.state!=='running'||effectiveMuted())return;
  const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(audioOut(ctx));o.start(t);o.stop(t+dur+.025);
}
function noiseBurst(dur=.035,vol=.018,filterFreq=1800,delay=0){
  const ctx=audioCtx;if(!ctx||ctx.state!=='running'||effectiveMuted())return;
  const frames=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,frames,ctx.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  filter.type='bandpass';filter.frequency.value=filterFreq;filter.Q.value=.8;gain.gain.value=vol;
  src.buffer=buf;src.connect(filter);filter.connect(gain);gain.connect(audioOut(ctx));src.start(ctx.currentTime+delay);
}
function haptic(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(_){}}
function beep(kind,power=1){
  if(effectiveMuted()||!audioCtx||audioCtx.state!=='running')return;
  const j=()=>1+(Math.random()-.5)*.025;
  if(kind==='pickup'){noiseBurst(.018,.018,4200);tone(980*j(),.026,'sine',.035,0,780);tone(1480,.018,'sine',.012,.006,1200);}
  if(kind==='rotate'){tone(720,.035,'sine',.034);tone(980,.04,'sine',.022,.025);haptic(5);}
  if(kind==='place'){
    const weight=Math.max(1,Math.min(9,Number(power)||1)),f=310-weight*9;
    noiseBurst(.032,.026,2300);tone(f*j(),.058,'triangle',.065,0,f*.66);tone(920,.024,'sine',.022,.007,690);haptic(8);
  }
  if(kind==='clear'){noiseBurst(.055,.026,3100);tone(455*j(),.075,'sine',.07);tone(700*j(),.105,'sine',.06,.042);haptic(12);}
  if(kind==='multi'){noiseBurst(.07,.032,3400);tone(410,.07,'triangle',.072);tone(650,.09,'triangle',.066,.038);tone(980,.12,'sine',.055,.082);haptic([14,26,18]);}
  if(kind==='shift'){noiseBurst(.11,.02,1050);tone(170,.14,'sawtooth',.025,0,360);haptic(9);}
  if(kind==='bad'){noiseBurst(.035,.018,600);tone(130,.07,'triangle',.045,0,88);haptic(5);}
  if(kind==='bomb'){tone(190,.07,'triangle',.055);tone(128,.09,'triangle',.04,.055);haptic([8,28,8]);}
  if(kind==='danger')tone(225,.04,'square',.022);
  if(kind==='chain'){tone(520,.055,'sine',.06);tone(735,.075,'sine',.055,.045);tone(1000,.095,'sine',.045,.09);haptic([10,22,10]);}
  if(kind==='gravityChain'){const n=Math.max(1,Math.min(7,Number(power)||1));const root=380+n*72;tone(root,.07,'sine',.06);tone(root*1.33,.09,'triangle',.05,.045);tone(root*1.66,.11,'sine',.038,.09);haptic([8,18,8]);}
  if(kind==='rush'){tone(640,.03,'square',.025);tone(890,.035,'sine',.018,.026);}
  if(kind==='bombOver'){noiseBurst(.18,.07,260);tone(92,.32,'sawtooth',.08,0,48);tone(180,.16,'triangle',.045,.035,70);haptic([35,25,55]);}
  if(kind==='over'){noiseBurst(.05,.022,420);tone(392,.085,'sine',.052);tone(294,.11,'sine',.048,.09);tone(196,.16,'sine',.045,.205);tone(82,.13,'triangle',.03,.34,58);haptic([10,42,18]);}
  if(kind==='start'){tone(520,.045,'sine',.045);tone(780,.055,'sine',.025,.035);}
}
function requestSound(kind,power=1){unlockAudio().then(ok=>{if(ok)beep(kind,power);});}
function updateMute(){muteBtn.textContent=effectiveMuted()?'×':'♪';muteBtn.classList.toggle('muted',effectiveMuted());muteBtn.setAttribute('aria-label',effectiveMuted()?'Sound off':'Sound on');}

function renderAll(){
  if(!state)return;
  document.documentElement.style.setProperty('--grid-size',state.size);
  document.documentElement.dataset.mode=state.mode.toLowerCase();
  if(dragHintEl) dragHintEl.classList.add('hidden');
  modeNameEl.textContent=state.mode;
  sizeNameEl.textContent=SIZES[state.size].label;
  scoreEl.textContent=state.score.toLocaleString(); bestEl.textContent=state.best.toLocaleString();
  chainEl.textContent=state.chain>0?`CHAIN ${state.chain}`:'CHAIN —';
  modeHintEl.textContent='';
  renderModeStat(); renderBoard(); renderTray(); updateMute(); renderMenu();
  if(state.gameOver&&!endingRun) showGameOver();
  flushFx();
}
function renderModeStat(){
  let txt='';
  modeStatEl.classList.remove('urgent','visible');
  blitzClockEl?.classList.remove('visible');
  if(state.mode==='SHIFT') txt=SHIFT_GLYPH[state.nextShift];
  if(state.mode==='BLITZ') txt='⚡';
  if(state.mode==='GRAVITY') txt='↓';
  if(state.mode==='SQUARES') txt='▦';
  modeStatEl.textContent=txt;
  if(txt)modeStatEl.classList.add('visible');
}
function colorOf(shape){return PIECE_COLORS[shape?.color]||PIECE_COLORS[1];}
function applyPaletteVars(el,color){const p=PIECE_COLORS[color]||PIECE_COLORS[1];el.style.setProperty('--pc',p.base);el.style.setProperty('--pc-hi',p.hi);el.style.setProperty('--pc-lo',p.lo);}
function pieceCanRotate(shape){return !!shape&&Core.rotationAllowed(state.mode)&&Core.rotations(shape).length>1;}
