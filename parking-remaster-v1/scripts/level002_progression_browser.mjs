import fs from 'node:fs';
import { chromium } from 'playwright';

const outDir='progression-qa';
fs.mkdirSync(outDir,{recursive:true});
const assert=(x,m)=>{if(!x)throw new Error(m)};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:390,height:844},screen:{width:390,height:844},
  isMobile:true,hasTouch:true,deviceScaleFactor:1,locale:'en-US'
});
const page=await context.newPage();
page.setDefaultTimeout(8000);
const pageErrors=[],requestFailures=[];
page.on('pageerror',e=>pageErrors.push(String(e)));
page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:(r.failure()&&r.failure().errorText)||'unknown'}));

await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__parkingQA&&window.__parkingQA.currentLevel()=='level_001'&&document.querySelectorAll('.car').length===10);
const initial=await page.evaluate(()=>({
  level:window.__parkingQA.currentLevel(),
  hud:window.__parkingProgressQA.hud(),
  cars:document.querySelectorAll('.car').length,
  hint:!!document.querySelector('#hintPulse'),
  firstPlayerActionMs:window.__parkingStartup.firstPlayerActionMs,
  controlsReadyDeltaMs:window.__parkingStartup.controlsReadyMs-window.__parkingStartup.scriptStartMs
}));
assert(initial.level==='level_001','did not boot Level 1');
assert(initial.hud==='LEVEL 1','initial dynamic HUD wrong');
assert(initial.cars===10,'Level 1 car count wrong');
assert(initial.hint===true,'Level 1 first-focus hint missing');
assert(initial.firstPlayerActionMs===null,'pre-game action occurred');
assert(initial.controlsReadyDeltaMs<=1000,'controls not ready within target in emulation');
await page.screenshot({path:outDir+'/01_level1_initial.png'});

const l1=['green_tl','red_top','blue_top','white_tr','black_ml','yellow_mid','silver_mid','white_bl','blue_bottom','green_br'];
for(const id of l1){
  const status=await page.evaluate(id=>{
    const c=window.__parkingQA.cars.get(id);
    if(!c)return {ok:false,reason:'missing'};
    const blocker=window.__parkingQA.blocked(c);
    if(blocker)return {ok:false,reason:'blocked',by:blocker.id};
    window.__parkingQA.tap(c);
    return {ok:true};
  },id);
  assert(status.ok,'Level 1 canonical move failed '+id+': '+JSON.stringify(status));
  await page.waitForTimeout(35);
}
await page.waitForFunction(()=>window.__parkingQA.currentLevel()==='level_002',{timeout:7000});
await page.waitForFunction(()=>document.querySelectorAll('.car').length===9);
const level2=await page.evaluate(()=>({
  level:window.__parkingQA.currentLevel(),
  hud:window.__parkingProgressQA.hud(),
  cars:document.querySelectorAll('.car').length,
  hints:document.querySelectorAll('#hintPulse').length,
  legal:window.__parkingQA.order(),
  transitions:window.__parkingProgressQA.history.transitions
}));
assert(level2.level==='level_002','automatic transition to Level 2 failed');
assert(level2.hud==='LEVEL 2','Level 2 HUD wrong');
assert(level2.cars===9,'Level 2 car count wrong');
assert(level2.hints===0,'Level 2 retained Level 1 tutorial hint');
assert(JSON.stringify(level2.legal)===JSON.stringify(['white_bl','silver_mid','green_br','black_ml']),'Level 2 legal set wrong '+JSON.stringify(level2.legal));
assert(level2.transitions.some(x=>x.from==='level_001'&&x.to==='level_002'),'transition history missing');
await page.screenshot({path:outDir+'/02_level2_after_transition.png'});

const l2=['white_bl','silver_mid','yellow_mid','green_tl','green_br','red_top','blue_bottom','black_ml','blue_top'];
for(const id of l2){
  const status=await page.evaluate(id=>{
    const c=window.__parkingQA.cars.get(id);
    if(!c)return {ok:false,reason:'missing'};
    const blocker=window.__parkingQA.blocked(c);
    if(blocker)return {ok:false,reason:'blocked',by:blocker.id};
    window.__parkingQA.tap(c);
    return {ok:true};
  },id);
  assert(status.ok,'Level 2 canonical move failed '+id+': '+JSON.stringify(status));
  await page.waitForTimeout(35);
}
await page.waitForFunction(()=>document.querySelector('#clear').classList.contains('show'),{timeout:5000});
await page.screenshot({path:outDir+'/03_level2_clear.png'});
await page.locator('#restart').tap();
await page.waitForFunction(()=>window.__parkingQA.currentLevel()==='level_002'&&document.querySelectorAll('.car').length===9);
const restarted=await page.evaluate(()=>({
  level:window.__parkingQA.currentLevel(),
  hud:window.__parkingProgressQA.hud(),
  cars:document.querySelectorAll('.car').length,
  clear:document.querySelector('#clear').classList.contains('show'),
  legal:window.__parkingQA.order(),
  restarts:window.__parkingProgressQA.history.restarts,
  audioState:window.__parkingAudioQA.state(),
  audioContexts:window.__parkingAudioQA.stats.contextsCreated
}));
assert(restarted.level==='level_002','restart returned to Level 1');
assert(restarted.hud==='LEVEL 2','HUD regressed after Level 2 restart');
assert(restarted.cars===9,'Level 2 restart car count wrong');
assert(restarted.clear===false,'clear overlay remained after restart');
assert(JSON.stringify(restarted.legal)===JSON.stringify(['white_bl','silver_mid','green_br','black_ml']),'Level 2 restart state not deterministic');
assert(restarted.restarts.some(x=>x.level==='level_002'),'Level 2 restart history missing');
assert(pageErrors.length===0,'page errors '+JSON.stringify(pageErrors));
assert(requestFailures.length===0,'request failures '+JSON.stringify(requestFailures));
await page.screenshot({path:outDir+'/04_level2_restarted.png'});

const result={
 gate:'LEVEL_002_RUNTIME_PROGRESSION_BROWSER',
 status:'PASS',
 viewport:{width:390,height:844,isMobile:true,hasTouch:true},
 initial,level2,restarted,pageErrors,requestFailures,
 checks:[
  'instant boot is playable Level 1',
  'dynamic HUD shows Level 1',
  'canonical Level 1 clear automatically transitions with no menu',
  'Level 2 renders 9 canonical cars',
  'dynamic HUD shows Level 2 and covers baked Level 1 label',
  'Level 2 initial legal set matches solver',
  'canonical Level 2 clear works',
  'restart stays on Level 2 and restores deterministic initial state'
 ]
};
fs.writeFileSync(outDir+'/LEVEL_002_RUNTIME_PROGRESSION_BROWSER_RESULT.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
await context.close();
await browser.close();
