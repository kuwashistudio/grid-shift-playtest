import { chromium } from 'playwright';
const A=(x,m)=>{if(!x)throw new Error(m)};
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__v71QA);
const initial=await page.evaluate(()=>window.__v71QA.state());
await page.evaluate(()=>window.__v71QA.start());
await page.waitForTimeout(390);
let q=await page.evaluate(()=>({s:window.__v71QA.state(),k:window.__v71QA.skidStats(),a:window.__v71QA.audioState()}));
A(q.s.phaseName==='charge','V6 first tame changed');
A(q.k.chargeLeft===0&&q.k.chargeRight===0,'skid marks must not be drawn while stationary');
A(q.a.context==='running','AudioContext not running after gameplay tap');
A(q.a.target.engine>=.09,'engine target still too quiet');
await page.screenshot({path:'01-charge-no-fake-skids.png'});

await page.waitForFunction(()=>window.__v71QA.state().phaseName==='snap',{timeout:1000});
await page.waitForTimeout(110);
q=await page.evaluate(()=>({k:window.__v71QA.skidStats(),d:window.__v71QA.skidData(),a:window.__v71QA.audioState()}));
A(q.k.snapLeft>0&&q.k.snapRight>0,'real snap skid missing');
const la=q.d.left.filter(x=>x.phase==='snap').reduce((s,x)=>s+x.a,0)/q.k.snapLeft;
const ra=q.d.right.filter(x=>x.phase==='snap').reduce((s,x)=>s+x.a,0)/q.k.snapRight;
A(la>ra*2,'right rear skid is not visibly weaker than outer-left skid');
A(q.a.target.noise>=.19,'snap tire noise target too weak');
await page.screenshot({path:'02-snap-semantic-skids.png'});

await page.waitForFunction(()=>window.__v71QA.state().phaseName==='reload',{timeout:1000});
await page.waitForTimeout(180);
q=await page.evaluate(()=>({k:window.__v71QA.skidStats(),a:window.__v71QA.audioState()}));
A(q.k.reloadLeft===0&&q.k.reloadRight===0,'reload still creates fake vertical skid lines');
A(q.a.target.engine>=.10,'second tame engine hold too weak');
await page.screenshot({path:'03-reload-no-vertical-skids.png'});

await page.waitForFunction(()=>window.__v71QA.state().done===true,{timeout:1400});
const done=await page.evaluate(()=>({s:window.__v71QA.state(),k:window.__v71QA.skidStats(),d:window.__v71QA.skidData()}));
const dur=done.s.completedAt-done.s.startedAt;
A(dur>1500&&dur<1850,'V6 cadence changed: '+dur);
A(done.k.chargeLeft===0&&done.k.chargeRight===0&&done.k.reloadLeft===0&&done.k.reloadRight===0,'non-skid phases left marks');
await page.screenshot({path:'04-exit-clean-trails.png'});

await page.waitForTimeout(2900);
const mid=await page.evaluate(()=>window.__v71QA.skidStats());
A(mid.left>0&&mid.right>0,'real skid marks faded too fast');
await page.waitForTimeout(3300);
const end=await page.evaluate(()=>window.__v71QA.skidStats());
A(end.left===0&&end.right===0,'skid marks did not fade after 5.6s');
console.log(JSON.stringify({status:'PASS',durationMs:+dur.toFixed(1),snapSegments:{left:done.k.snapLeft,right:done.k.snapRight},snapAlpha:{left:+la.toFixed(3),right:+ra.toFixed(3)},chargeSegments:{left:done.k.chargeLeft,right:done.k.chargeRight},reloadSegments:{left:done.k.reloadLeft,right:done.k.reloadRight},midFade:{left:mid.left,right:mid.right,maxAge:+mid.maxAge.toFixed(2)},finalFade:{left:end.left,right:end.right},audio:q.a},null,2));
await browser.close();