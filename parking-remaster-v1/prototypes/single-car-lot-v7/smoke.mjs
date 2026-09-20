import { chromium } from 'playwright';
const A=(x,m)=>{if(!x)throw new Error(m)};
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__v7QA);
const initial=await page.evaluate(()=>window.__v7QA.state());
await page.screenshot({path:'01-initial.png'});
await page.evaluate(()=>window.__v7QA.start());

await page.waitForTimeout(390);
const charge=await page.evaluate(()=>window.__v7QA.state());
A(charge.phaseName==='charge','first tame changed from V6');
A(Math.abs(charge.x-initial.x)<.2&&Math.abs(charge.y-initial.y)<.2,'car moved during first tame');
await page.screenshot({path:'02-first-tame-trails.png'});

await page.waitForFunction(()=>window.__v7QA.state().phaseName==='blast',{timeout:900});
await page.waitForTimeout(250);
const bLate=await page.evaluate(()=>window.__v7QA.state());
A(Math.abs(bLate.x-initial.x)<.25,'V6 straight blast changed laterally');
await page.screenshot({path:'03-first-blast-trails.png'});

await page.waitForFunction(()=>window.__v7QA.state().phaseName==='snap',{timeout:900});
const p0=await page.evaluate(()=>({s:window.__v7QA.state(),f:window.__v7QA.front(),r:window.__v7QA.rear()}));
await page.waitForTimeout(105);
const p1=await page.evaluate(()=>({s:window.__v7QA.state(),f:window.__v7QA.front(),r:window.__v7QA.rear(),tr:window.__v7QA.trailStats()}));
const fm=Math.hypot(p1.f.x-p0.f.x,p1.f.y-p0.f.y),rm=Math.hypot(p1.r.x-p0.r.x,p1.r.y-p0.r.y);
A(rm>fm*4,'V6 rear snap changed');
A(p1.tr.snapLeft>0,'left rear snap trail missing');
A(p1.tr.snapRight>0,'right rear snap trail missing');
A(p1.tr.snapLeft===p1.tr.snapRight,'left/right snap trail segment mismatch');
await page.screenshot({path:'04-snap-continuous-trails.png'});

await page.waitForFunction(()=>window.__v7QA.state().phaseName==='reload',{timeout:900});
await page.waitForTimeout(170);
const reload=await page.evaluate(()=>({s:window.__v7QA.state(),tr:window.__v7QA.trailStats(),a:window.__v7QA.audioState()}));
A(reload.tr.reloadRight>0,'right rear trail missing at phase switch/reload');
A(reload.tr.reloadLeft===reload.tr.reloadRight,'phase switch trail asymmetry');
A(reload.a&&reload.a.context==='running','temporary Web Audio did not unlock on gameplay tap');
await page.screenshot({path:'05-second-tame-continuous-trails.png'});

await page.waitForFunction(()=>window.__v7QA.state().done===true,{timeout:1300});
const done=await page.evaluate(()=>({s:window.__v7QA.state(),tr:window.__v7QA.trailStats(),data:window.__v7QA.trailData()}));
const duration=done.s.completedAt-done.s.startedAt;
A(duration>1500&&duration<1800,'V6 cadence changed: '+duration);
A(done.tr.left===done.tr.right,'left/right total trail mismatch');
A(done.tr.snapRight>0&&done.tr.reloadRight>0,'right rear trail missing across switch');
const right=done.data.right;
let maxJoinGap=0;
for(let i=1;i<right.length;i++) maxJoinGap=Math.max(maxJoinGap,Math.hypot(right[i].x1-right[i-1].x2,right[i].y1-right[i-1].y2));
A(maxJoinGap<5,'right rear trail has visible phase-switch gap: '+maxJoinGap);
await page.screenshot({path:'06-exit-trails.png'});

await page.waitForTimeout(2800);
const midFade=await page.evaluate(()=>window.__v7QA.trailStats());
A(midFade.left>0&&midFade.right>0,'trails faded too quickly');
A(midFade.maxAge>2.5,'trail ages are not advancing after car exits');
await page.screenshot({path:'07-trails-mid-fade.png'});

await page.waitForTimeout(3300);
const faded=await page.evaluate(()=>window.__v7QA.trailStats());
A(faded.left===0&&faded.right===0,'trails did not clear after ~5.6s fade window');
console.log(JSON.stringify({status:'PASS',durationMs:+duration.toFixed(1),snapFrontMove:+fm.toFixed(2),snapRearMove:+rm.toFixed(2),snapRearFrontRatio:+(rm/fm).toFixed(2),totalTrailSegmentsPerSide:done.tr.left,snapSegmentsPerSide:done.tr.snapLeft,reloadSegmentsPerSide:done.tr.reloadLeft,rightTrailMaxJoinGapPx:+maxJoinGap.toFixed(3),midFadeSegmentsPerSide:midFade.left,midFadeMaxAge:+midFade.maxAge.toFixed(2),finalTrailSegmentsPerSide:faded.left,audioContext:reload.a.context},null,2));
await browser.close();