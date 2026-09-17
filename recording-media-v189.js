/* GRID SHIFT recording-only audio path v1.8.9.
   Purpose: bypass real-time Web Audio during capture. Sounds are rendered to PCM/WAV
   in plain JavaScript and played through HTMLAudioElement so iOS screen recording
   sees normal media playback instead of an AudioContext render stream.
   Production build is untouched. */
(function(){
  'use strict';

  const SR=44100;
  const cache=new Map();
  const pools=new Map();
  let primed=false;
  let silentAudio=null;

  function clamp(v){return Math.max(-1,Math.min(1,v));}
  function wave(type,phase){
    const x=(phase/(Math.PI*2))%1;
    if(type==='square') return Math.sin(phase)>=0?1:-1;
    if(type==='sawtooth') return 2*(x-Math.floor(x+.5));
    if(type==='triangle') return 2*Math.abs(2*(x-Math.floor(x+.5)))-1;
    return Math.sin(phase);
  }
  function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

  function render(spec){
    const dur=Math.max(.02,spec.dur||.12), n=Math.ceil(dur*SR), out=new Float32Array(n);
    const tones=spec.tones||[];
    for(const t of tones){
      const start=Math.max(0,Math.floor((t.delay||0)*SR));
      const len=Math.max(1,Math.floor((t.dur||dur)*SR));
      let ph=0;
      for(let j=0;j<len && start+j<n;j++){
        const p=j/Math.max(1,len-1);
        const f0=t.f||440, f1=t.f2||f0;
        const f=f0*Math.pow(Math.max(.001,f1/f0),p);
        ph+=2*Math.PI*f/SR;
        const a=(t.vol||.05)*Math.min(1,j/Math.max(1,.004*SR))*Math.pow(1-p,2.2);
        out[start+j]+=wave(t.type||'sine',ph)*a;
      }
    }
    if(spec.noise){
      const r=seeded(spec.seed||1337), len=Math.min(n,Math.floor((spec.noise.dur||dur)*SR));
      const start=Math.max(0,Math.floor((spec.noise.delay||0)*SR));
      let prev=0;
      for(let j=0;j<len && start+j<n;j++){
        const p=j/Math.max(1,len-1);
        let x=(r()*2-1)*(spec.noise.vol||.02)*(1-p);
        // gentle high-pass-ish shaping to keep clicks crisp without harsh DC.
        const y=x-prev*.78; prev=x;
        out[start+j]+=y;
      }
    }
    // safety normalization, preserving relative loudness.
    let peak=.0001;for(const v of out)peak=Math.max(peak,Math.abs(v));
    const scale=peak>.92?.92/peak:1;
    if(scale!==1)for(let i=0;i<out.length;i++)out[i]*=scale;
    return out;
  }

  function wavURL(samples){
    const ab=new ArrayBuffer(44+samples.length*2),v=new DataView(ab);
    const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
    str(0,'RIFF');v.setUint32(4,36+samples.length*2,true);str(8,'WAVE');str(12,'fmt ');
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);
    v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);
    let o=44;for(let i=0;i<samples.length;i++,o+=2)v.setInt16(o,Math.round(clamp(samples[i])*32767),true);
    return URL.createObjectURL(new Blob([ab],{type:'audio/wav'}));
  }

  function specFor(kind,power){
    const p=Math.max(1,Math.min(9,Number(power)||1));
    if(kind==='pickup')return{dur:.075,noise:{dur:.018,vol:.018},tones:[{f:980,f2:780,dur:.026,vol:.035},{f:1480,f2:1200,dur:.018,delay:.006,vol:.012}]};
    if(kind==='rotate')return{dur:.09,tones:[{f:720,dur:.035,vol:.034},{f:980,dur:.04,delay:.025,vol:.022}]};
    if(kind==='place'){const f=310-p*9;return{dur:.11,noise:{dur:.032,vol:.026},tones:[{f,f2:f*.66,dur:.058,type:'triangle',vol:.065},{f:920,f2:690,dur:.024,delay:.007,vol:.022}]};}
    if(kind==='clear')return{dur:.18,noise:{dur:.055,vol:.026},tones:[{f:455,dur:.075,vol:.07},{f:700,dur:.105,delay:.042,vol:.06}]};
    if(kind==='multi')return{dur:.24,noise:{dur:.07,vol:.032},tones:[{f:410,dur:.07,type:'triangle',vol:.072},{f:650,dur:.09,delay:.038,type:'triangle',vol:.066},{f:980,dur:.12,delay:.082,vol:.055}]};
    if(kind==='shift')return{dur:.19,noise:{dur:.11,vol:.02},tones:[{f:170,f2:360,dur:.14,type:'sawtooth',vol:.025}]};
    if(kind==='bad')return{dur:.1,noise:{dur:.035,vol:.018},tones:[{f:130,f2:88,dur:.07,type:'triangle',vol:.045}]};
    if(kind==='bomb')return{dur:.18,tones:[{f:190,dur:.07,type:'triangle',vol:.055},{f:128,dur:.09,delay:.055,type:'triangle',vol:.04}]};
    if(kind==='danger')return{dur:.06,tones:[{f:225,dur:.04,type:'square',vol:.022}]};
    if(kind==='chain')return{dur:.24,tones:[{f:520,dur:.055,vol:.06},{f:735,dur:.075,delay:.045,vol:.055},{f:1000,dur:.095,delay:.09,vol:.045}]};
    if(kind==='gravityChain'){const n=Math.max(1,Math.min(7,Number(power)||1)),r=380+n*72;return{dur:.24,tones:[{f:r,dur:.07,vol:.06},{f:r*1.33,dur:.09,delay:.045,type:'triangle',vol:.05},{f:r*1.66,dur:.11,delay:.09,vol:.038}]};}
    if(kind==='rush')return{dur:.09,tones:[{f:640,dur:.03,type:'square',vol:.025},{f:890,dur:.035,delay:.026,vol:.018}]};
    if(kind==='bombOver')return{dur:.5,noise:{dur:.18,vol:.07},tones:[{f:92,f2:48,dur:.32,type:'sawtooth',vol:.08},{f:180,f2:70,dur:.16,delay:.035,type:'triangle',vol:.045}]};
    if(kind==='over')return{dur:.54,noise:{dur:.05,vol:.022},tones:[{f:392,dur:.085,vol:.052},{f:294,dur:.11,delay:.09,vol:.048},{f:196,dur:.16,delay:.205,vol:.045},{f:82,f2:58,dur:.13,delay:.34,type:'triangle',vol:.03}]};
    return{dur:.11,tones:[{f:520,dur:.045,vol:.045},{f:780,dur:.055,delay:.035,vol:.025}]}; // start
  }

  function key(kind,power){return kind+':'+(kind==='place'||kind==='gravityChain'?Math.round(Number(power)||1):1);}
  function poolFor(kind,power){
    const k=key(kind,power);if(pools.has(k))return pools.get(k);
    let url=cache.get(k);if(!url){url=wavURL(render(specFor(kind,power)));cache.set(k,url);}
    const pool=Array.from({length:5},()=>{const a=new Audio(url);a.preload='auto';a.volume=.96;return a;});
    pools.set(k,pool);return pool;
  }

  function play(kind,power=1){
    try{if(typeof effectiveMuted==='function'&&effectiveMuted())return;}
    catch(_){ }
    const pool=poolFor(kind,power);
    let a=pool.find(x=>x.paused||x.ended)||pool[0];
    try{a.pause();a.currentTime=0;}catch(_){ }
    const pr=a.play();if(pr&&typeof pr.catch==='function')pr.catch(()=>{});
    try{
      if(typeof haptic==='function'){
        if(kind==='rotate'||kind==='bad')haptic(5);
        else if(kind==='place')haptic(8);
        else if(kind==='clear')haptic(12);
        else if(kind==='multi')haptic([14,26,18]);
        else if(kind==='chain'||kind==='gravityChain')haptic([10,22,10]);
      }
    }catch(_){ }
  }

  function ensurePrime(){
    if(primed)return Promise.resolve(true);
    primed=true;
    if(!silentAudio){
      silentAudio=new Audio(wavURL(new Float32Array(Math.floor(SR*.03))));
      silentAudio.preload='auto';silentAudio.volume=.001;
    }
    try{
      const p=silentAudio.play();
      if(p&&typeof p.then==='function')return p.then(()=>{try{silentAudio.pause();silentAudio.currentTime=0;}catch(_){}return true;}).catch(()=>true);
    }catch(_){ }
    return Promise.resolve(true);
  }

  async function mediaUnlock(){await ensurePrime();return true;}
  function mediaRequest(kind,power=1){ensurePrime().then(()=>play(kind,power));}

  try{unlockAudio=mediaUnlock;}catch(_){window.unlockAudio=mediaUnlock;}
  try{beep=play;}catch(_){window.beep=play;}
  try{requestSound=mediaRequest;}catch(_){window.requestSound=mediaRequest;}

  document.addEventListener('pointerdown',ensurePrime,{capture:true,once:true});
  document.addEventListener('touchstart',ensurePrime,{capture:true,once:true,passive:true});
})();
