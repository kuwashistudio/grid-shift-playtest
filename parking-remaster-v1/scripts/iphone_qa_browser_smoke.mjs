import { chromium } from 'playwright';
const assert=(x,m)=>{if(!x)throw new Error(m)};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage();
page.setDefaultTimeout(6000);

await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__parkingQA&&window.__parkingQA.cars.size===10);
assert(await page.locator('#iphoneQaPanel').count()===0,'QA panel leaked into normal runtime');
assert(await page.evaluate(()=>window.__parkingIPhoneQA===undefined),'QA hook leaked into normal runtime');

await page.goto('http://127.0.0.1:8765/index.html?qa=iphone',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__parkingIPhoneQA&&window.__parkingQA.cars.size===10);
assert(await page.locator('#iphoneQaPanel').count()===1,'QA panel missing in iphone mode');
const before=await page.evaluate(()=>window.__parkingIPhoneQA.snapshot());
assert(before.controls_ready_from_navigation_ms!==null,'controls metric missing');
assert(before.controls_ready_target_ms===1000,'controls target wrong');
assert(before.audio.stats.sfx.engine===0&&before.audio.stats.sfx.horn===0,'unexpected SFX counts before tap');

const blueTop=await page.evaluate(()=>window.__parkingQA.cars.get('blue_top')?true:false);
assert(blueTop,'blue_top missing');
await page.evaluate(()=>window.__parkingQA.tap(window.__parkingQA.cars.get('blue_top')));
await page.waitForTimeout(120);
const afterHorn=await page.evaluate(()=>window.__parkingIPhoneQA.snapshot());
assert(afterHorn.audio.stats.sfx.horn>=1,'horn evidence counter did not increment');

await page.evaluate(()=>window.__parkingQA.tap(window.__parkingQA.cars.get('green_tl')));
await page.waitForTimeout(120);
const afterEngine=await page.evaluate(()=>window.__parkingIPhoneQA.snapshot());
assert(afterEngine.audio.stats.sfx.engine>=1,'engine evidence counter did not increment');
assert(afterEngine.audio.state==='running','AudioContext not running after gameplay gesture path');

await page.screenshot({path:'iphone-qa-harness.png'});
console.log(JSON.stringify({status:'PASS',normal_panel:false,qa_panel:true,before,afterHorn,afterEngine},null,2));
await context.close();await browser.close();
