import fs from 'node:fs';
import { chromium } from 'playwright';

const outDir='browser-qa';
fs.mkdirSync(outDir,{recursive:true});
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:390,height:844},
  screen:{width:390,height:844},
  isMobile:true,
  hasTouch:true,
  deviceScaleFactor:1,
  locale:'en-US'
});
const page=await context.newPage();
const pageErrors=[];
const requestFailures=[];
page.on('pageerror',e=>pageErrors.push(String(e)));
page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText||'unknown'}));

await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__parkingQA?.cars?.size===10);

const initial=await page.evaluate(()=>({
  carCount:document.querySelectorAll('.car').length,
  patchCount:document.querySelectorAll('.patch').length,
  bg:new URL(document.querySelector('#background').src).pathname,
  hint:!!document.querySelector('#hintPulse'),
  controlsReadyDeltaMs:window.__parkingStartup.controlsReadyMs-window.__parkingStartup.scriptStartMs,
  firstPlayerActionMs:window.__parkingStartup.firstPlayerActionMs,
  legal:window.__parkingQA.order(),
  audioContexts:window.__parkingAudioQA.stats.contextsCreated
}));
assert(initial.carCount===10,'expected 10 persistent car sprites');
assert(initial.patchCount===0,'patch nodes exist');
assert(initial.bg.endsWith('/assets/clean_plate.webp'),'wrong runtime background');
assert(initial.hint===true,'dynamic first-focus hint missing');
assert(initial.controlsReadyDeltaMs<=1000,`controls ready exceeded 1000ms: ${initial.controlsReadyDeltaMs}`);
assert(initial.firstPlayerActionMs===null,'player action recorded before gesture');
assert(JSON.stringify(initial.legal)===JSON.stringify(['green_tl','red_top','white_tr']),`unexpected initial legal set: ${JSON.stringify(initial.legal)}`);
await page.screenshot({path:`${outDir}/initial_390x844.png`});

const red=page.locator('button.hot').nth(1);
await red.tap();
await page.waitForTimeout(650);
const during=await page.evaluate(()=>({
  redMoved:window.__parkingQA.cars.get('red_top').moved,
  redSpritePresent:!!window.__parkingQA.cars.get('red_top').spriteEl,
  hint:!!document.querySelector('#hintPulse'),
  firstPlayerActionMs:window.__parkingStartup.firstPlayerActionMs,
  audioContexts:window.__parkingAudioQA.stats.contextsCreated,
  audioState:window.__parkingAudioQA.state(),
  patchCount:document.querySelectorAll('.patch').length,
  carCount:document.querySelectorAll('.car').length
}));
assert(during.redMoved===true,'red_top did not enter gameplay move state');
assert(during.redSpritePresent===true,'moving red sprite disappeared too early');
assert(during.hint===false,'first-focus hint not removed after red_top action');
assert(during.firstPlayerActionMs!==null,'first player action marker missing');
assert(during.audioContexts>=1,'first gameplay tap did not create/unlock AudioContext');
assert(during.patchCount===0,'patch node appeared during movement');
assert(during.carCount===10,'moving sprite was duplicated or removed during motion');
await page.screenshot({path:`${outDir}/red_top_mid_exit_390x844.png`});

await page.waitForTimeout(2200);
await page.waitForFunction(()=>document.querySelectorAll('.car').length===9);
const after=await page.evaluate(()=>({
  carCount:document.querySelectorAll('.car').length,
  redSpriteNull:window.__parkingQA.cars.get('red_top').spriteEl===null,
  patchCount:document.querySelectorAll('.patch').length,
  activeIds:window.__parkingQA.activeIds(),
  legal:window.__parkingQA.order()
}));
assert(after.carCount===9,'exited car DOM cleanup failed');
assert(after.redSpriteNull===true,'red_top sprite reference not cleared');
assert(after.patchCount===0,'patch node appeared after exit');
assert(!after.activeIds.includes('red_top'),'red_top still active after exit');
await page.screenshot({path:`${outDir}/after_red_top_exit_390x844.png`});

assert(pageErrors.length===0,`page errors: ${JSON.stringify(pageErrors)}`);
assert(requestFailures.length===0,`request failures: ${JSON.stringify(requestFailures)}`);

const result={
  gate:'VP_2G_RUNTIME_BROWSER_SMOKE',
  status:'PASS',
  viewport:{width:390,height:844,isMobile:true,hasTouch:true},
  initial,
  during,
  after,
  pageErrors,
  requestFailures,
  checks:[
    'production clean plate rendered',
    '10 persistent Level-Data sprites rendered',
    'no patch/reveal DOM',
    'controls ready <=1000ms in CI mobile emulation',
    'tap gesture triggers red_top gameplay move',
    'first tap creates AudioContext',
    'dynamic first-focus hint removed',
    'same red sprite animates without duplication',
    'completed exit leaves 9 sprites'
  ]
};
fs.writeFileSync(`${outDir}/VP2G_BROWSER_SMOKE_RESULT.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

await context.close();
await browser.close();
