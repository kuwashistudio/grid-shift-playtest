import { chromium } from 'playwright';
const A=(x,m)=>{if(!x)throw new Error(m)};
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__v72QA);
const initial=await page.evaluate(()=>window.__v72QA.state());
await page.evaluate(()=>window.__v72QA.start());

await page.waitForTimeout(390);
let q=await page.evaluate(()=>({s:window.__v72QA.state(),k:window.__v72QA.skidStats(),a:window.__v72QA.audioState()}));
A(q.s.phaseName==='charge','V6 cadence changed');
A(q.k.chargeLeft===0&&q.k.chargeRight===0,'fake stationary skids returned');
A(q.a.context==='running','AudioContext not running');
A(q.a.kind==='combustion-pulse-noise','beep oscillator engine was not replaced');
A(q.a.metrics.rms>.005,'audio output too weak');
await page.screenshot({path:'01-charge-audio.png'});

await page.waitForFunction(()=>window.__v72QA.state().phaseName==='snap',{timeout:1000});
await page.waitForTimeout(118);
q=await page.evaluate(()=>({k:window.__v72QA.skidStats(),d:window.__v72QA.skidData(),a:window.__v72QA.audioState()}));
A(q.k.snapLeft===1&&q.k.snapRight===1,'snap should be one smooth stroke per rear wheel');
A(q.k.snapLeftPoints>=6&&q.k.snapRightPoints>=6,'not enough wheel contact samples for a smooth curve');
const ls=q.d.left.find(s=>s.phase==='snap'),rs=q.d.right.find(s=>s.phase==='snap');
A(ls.a>rs.a*2,'inner/right rear skid should be visibly weaker');
A(q.a.target.noise>=.2,'snap tire noise too weak');
await page.screenshot({path:'02-smooth-snap-arcs.png'});

await page.waitForFunction(()=>window.__v72QA.state().phaseName==='reload',{timeout:1000});
await page.waitForTimeout(180);
q=await page.evaluate(()=>({k:window.__v72QA.skidStats(),a:window.__v72QA.audioState()}));
A(q.k.reloadLeft===0&&q.k.reloadRight===0,'reload created fake skid');
await page.screenshot({path:'03-reload-clean.png'});

await page.waitForFunction(()=>window.__v72QA.state().done===true,{timeout:1400});
const done=await page.evaluate(()=>({s:window.__v72QA.state(),k:window.__v72QA.skidStats(),a:window.__v72QA.audioState()}));
const duration=done.s.completedAt-done.s.startedAt;
A(duration>1500&&duration<1850,'V6 cadence changed: '+duration);
await page.screenshot({path:'04-exit.png'});

await page.waitForTimeout(2900);
const mid=await page.evaluate(()=>window.__v72QA.skidStats());
A(mid.leftStrokes>0&&mid.rightStrokes>0,'real skids faded too fast');
await page.waitForTimeout(3300);
const end=await page.evaluate(()=>window.__v72QA.skidStats());
A(end.leftStrokes===0&&end.rightStrokes===0,'skids did not clear after fade window');
console.log(JSON.stringify({status:'PASS',durationMs:+duration.toFixed(1),snap:{leftStrokes:q.k.snapLeft,rightStrokes:q.k.snapRight,leftPoints:q.k.snapLeftPoints,rightPoints:q.k.snapRightPoints},audio:q.a,midFade:mid,finalFade:end},null,2));
await browser.close();