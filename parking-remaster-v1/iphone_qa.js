(()=>{
const params=new URLSearchParams(location.search);
if(params.get('qa')!=='iphone')return;

const lifecycle=[];
const startedAt=performance.now();
const fmt=n=>n==null?'—':Math.round(n)+'ms';
const safe=fn=>{try{return fn()}catch(e){return null}};

function snapshot(){
  const startup=window.__parkingStartup||{};
  const audio=window.__parkingAudioQA;
  const progress=window.__parkingProgressQA;
  const nav=performance.getEntriesByType('navigation')[0]||null;
  const controlsFromNav=startup.controlsReadyMs??null;
  const controlsFromScript=(startup.controlsReadyMs!=null&&startup.scriptStartMs!=null)?startup.controlsReadyMs-startup.scriptStartMs:null;
  const firstTapFromNav=startup.firstPlayerActionMs??null;
  return {
    gate:'TARGET_IPHONE_CORE_FUN_EVIDENCE',
    qa_mode:'iphone',
    captured_at:new Date().toISOString(),
    user_agent:navigator.userAgent,
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
    document_visibility:document.visibilityState,
    current_level:safe(()=>window.__parkingQA.currentLevel()),
    hud:safe(()=>progress.hud()),
    car_count:document.querySelectorAll('.car').length,
    controls_ready_from_navigation_ms:controlsFromNav==null?null:+controlsFromNav.toFixed(1),
    controls_ready_from_script_ms:controlsFromScript==null?null:+controlsFromScript.toFixed(1),
    controls_ready_target_ms:1000,
    controls_ready_target_pass:controlsFromNav==null?null:controlsFromNav<=1000,
    first_player_action_from_navigation_ms:firstTapFromNav==null?null:+firstTapFromNav.toFixed(1),
    audio:{
      enabled:safe(()=>audio.enabled()),
      state:safe(()=>audio.state()),
      reset_needed:safe(()=>audio.resetNeeded()),
      stats:audio?JSON.parse(JSON.stringify(audio.stats)):null
    },
    progression:progress?JSON.parse(JSON.stringify(progress.history)):null,
    navigation:nav?{
      type:nav.type,
      response_end_ms:+nav.responseEnd.toFixed(1),
      dom_interactive_ms:+nav.domInteractive.toFixed(1),
      dom_content_loaded_ms:+nav.domContentLoadedEventEnd.toFixed(1),
      load_event_end_ms:+nav.loadEventEnd.toFixed(1)
    }:null,
    lifecycle:[...lifecycle],
    physical_checks:{
      screen_recording_microphone_off:null,
      engine_heard_in_saved_recording:null,
      horn_heard_in_saved_recording:null,
      win_heard_in_saved_recording:null
    }
  };
}

const panel=document.createElement('section');
panel.id='iphoneQaPanel';
panel.setAttribute('aria-label','iPhone QA evidence');
panel.style.cssText='position:fixed;z-index:9999;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));padding:9px 10px;border-radius:12px;background:rgba(0,0,0,.82);color:#fff;font:12px/1.32 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 5px 20px #0008;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);max-height:31vh;overflow:auto';
const row=document.createElement('div');
row.style.cssText='display:flex;gap:7px;align-items:center;justify-content:space-between;margin-bottom:6px';
const title=document.createElement('strong');title.textContent='IPHONE QA';
const copy=document.createElement('button');copy.id='iphoneQaCopy';copy.textContent='COPY JSON';copy.style.cssText='border:0;border-radius:8px;padding:6px 8px;font:700 11px system-ui;background:#fff;color:#111';
row.append(title,copy);
const pre=document.createElement('pre');pre.id='iphoneQaText';pre.style.cssText='margin:0;white-space:pre-wrap;word-break:break-word;font:inherit';
panel.append(row,pre);
document.body.appendChild(panel);

function render(){
  const s=snapshot();
  const a=s.audio||{};
  const st=(a.stats||{});
  pre.textContent=[
    'nav→controls '+fmt(s.controls_ready_from_navigation_ms)+' '+(s.controls_ready_target_pass===true?'PASS':s.controls_ready_target_pass===false?'FAIL':''),
    'script→controls '+fmt(s.controls_ready_from_script_ms),
    'level '+(s.current_level||'—')+' / '+(s.hud||'—'),
    'first tap '+fmt(s.first_player_action_from_navigation_ms),
    'audio '+(a.state||'—')+' ctx '+(st.contextsCreated??'—')+' reset '+(st.resetsRequested??'—'),
    'sfx E/H/W '+((st.sfx&&st.sfx.engine)||0)+'/'+((st.sfx&&st.sfx.horn)||0)+'/'+((st.sfx&&st.sfx.win)||0),
    'visibility '+s.document_visibility+' transitions '+((s.progression&&s.progression.transitions&&s.progression.transitions.length)||0)
  ].join('\n');
  return s;
}
copy.addEventListener('click',async()=>{
  const payload=JSON.stringify(snapshot(),null,2);
  try{await navigator.clipboard.writeText(payload);copy.textContent='COPIED';}
  catch(e){copy.textContent='COPY FAILED';}
  setTimeout(()=>copy.textContent='COPY JSON',1400);
});

for(const ev of ['visibilitychange','pageshow','pagehide']){
  const target=ev==='visibilitychange'?document:window;
  target.addEventListener(ev,()=>{lifecycle.push({event:ev,at_ms:+performance.now().toFixed(1),visibility:document.visibilityState});render()},{passive:true});
}
setInterval(render,250);
render();
window.__parkingIPhoneQA={snapshot,render,lifecycle,startedAt};
})();
