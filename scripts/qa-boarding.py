"""Boarding intro QA. Requires a running development app and Python Playwright.

Default: use and capture the canonical supplied JPG.
BOARDING_QA_USE_IMAGE_FIXTURE=1: lifecycle contracts only; no artwork validation.
The isolated one-pixel response is never saved into the product or presented as art.
"""
import asyncio,base64,json,importlib.util,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
USE_FIXTURE=os.environ.get('BOARDING_QA_USE_IMAGE_FIXTURE')=='1'
ART=ROOT/'client/public/train/Gemini_Generated_Image_43lqmg43lqmg43lq.jpg.jpg'
if not USE_FIXTURE and not ART.is_file():
 raise SystemExit('The canonical boarding JPG must be present for visual QA. Set BOARDING_QA_USE_IMAGE_FIXTURE=1 only for lifecycle tests.')
spec=importlib.util.spec_from_file_location('trainqa',str(ROOT/'scripts/qa-train.py'));qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
OUT=Path('/tmp/tee-boarding-qa');OUT.mkdir(exist_ok=True)
ASSET='**/train/Gemini_Generated_Image_43lqmg43lqmg43lq.jpg.jpg'
# A transparent one-pixel test response exercises lifecycle contracts only.
# It is never written into the repository and is not a substitute boarding illustration.
PIXEL=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==')
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=await browser.new_context(viewport={'width':1440,'height':900});page=await context.new_page();await qa.fixture(page,{},student=False)
  await page.goto(qa.BASE+'/eco-journey',wait_until='networkidle')
  await page.screenshot(path=str(OUT/'opening.png'))
  await page.get_by_role('button',name='Board the Eco Train',exact=True).click()
  await page.locator('.story-slide-group[aria-hidden=false]').filter(has_text='Your eco-guide and travel companion.').wait_for()
  await page.wait_for_timeout(1800);await page.screenshot(path=str(OUT/'meet-guide.png'))
  await page.locator('.story-slide-group[aria-hidden=false]').filter(has_text='Travel, explore, solve challenges').wait_for()
  await page.wait_for_timeout(600);await page.screenshot(path=str(OUT/'mission-brief.png'))
  await page.get_by_role('button',name='Continue to the platform').wait_for()
  await page.wait_for_timeout(700);await page.screenshot(path=str(OUT/'travel-brief.png'))
  await page.get_by_role('button',name='Continue to the platform').click()
  if not ART.exists():
   await page.get_by_text('The platform view could not be loaded.',exact=True).wait_for()
   assert await page.locator('.train-shell').count()==0
   assert await page.get_by_role('button',name='Skip journey preview').count()==0
   assert await page.evaluate("JSON.parse(localStorage.getItem('uaeTrainJourney:v1:guest')||'{}').boarded!==true")
   results.append('Notebook → guide → mission → UAE briefing and missing-artwork recovery verified; no premature boarding/progress write.')
  else:
   await page.locator('.boarding-platform').get_by_role('button',name='Board the Eco Train',exact=True).wait_for()
   await page.wait_for_function("document.querySelector('.boarding-platform-art img')?.naturalWidth===2752")
   await page.wait_for_timeout(850)
   for width,height in [(1440,900),(1366,768),(1024,768),(768,1024),(390,844),(844,390)]:
    await page.set_viewport_size({'width':width,'height':height});await page.wait_for_timeout(150)
    await page.screenshot(path=str(OUT/f'platform-{width}x{height}.png'))
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   await page.set_viewport_size({'width':1440,'height':900})
   await page.screenshot(path=str(OUT/'canonical-platform.png'))
   results.append('Full introduction reaches the original canonical 2752-pixel-wide platform artwork.')
  await context.close()
  for reduced in [False,True]:
   context=await browser.new_context(viewport={'width':390 if reduced else 1440,'height':844 if reduced else 900},reduced_motion='reduce' if reduced else 'no-preference');page=await context.new_page();await qa.fixture(page,{},student=False)
   if USE_FIXTURE: await page.route(ASSET,lambda route:route.fulfill(status=200,content_type='image/png',body=PIXEL))
   async def slow_catalogue(route):
    await asyncio.sleep(2);await route.fallback()
   await page.route('**/api/trpc/missions.getAll*',slow_catalogue)
   await page.add_init_script('''window.__buffers=[];const Ctor=window.AudioContext;window.AudioContext=class extends Ctor{createBufferSource(){const node=super.createBufferSource();window.__buffers.push(node);const stop=node.stop.bind(node);node.stop=(...a)=>{node.__stopped=true;return stop(...a)};return node}};''')
   if reduced: await page.add_init_script("localStorage.setItem('ecoSoundMuted:v1','true')")
   await page.goto(qa.BASE+'/eco-journey',wait_until='networkidle')
   assert await page.evaluate('window.__audioContexts.length')==0
   await page.get_by_role('button',name='Board the Eco Train',exact=True).click()
   await page.get_by_role('button',name='Travel briefing').click()
   await page.get_by_role('button',name='Continue to the platform').click()
   platform=page.locator('.boarding-platform');await platform.wait_for()
   button=platform.get_by_role('button',name='Board the Eco Train',exact=True);await button.wait_for();await button.focus()
   assert await page.get_by_role('button',name='Skip journey preview').count()==0
   assert await page.locator('.train-shell').count()==0
   await page.wait_for_timeout(850)
   await page.screenshot(path=str(OUT/f'platform-reduced-{reduced}.png'))
   await button.press('Enter')
   if not reduced:
    await page.wait_for_timeout(900);await page.screenshot(path=str(OUT/'boarding-door-push.png'))
   await page.locator('.boarding-platform.is-covered').wait_for(timeout=10000)
   await page.screenshot(path=str(OUT/f'boarding-covered-{reduced}.png'))
   await page.locator('.boarding-platform').wait_for(state='detached',timeout=15000)
   await page.locator('.train-shell').wait_for()
   assert await page.evaluate("document.activeElement===document.querySelector('.train-shell h1')")
   assert await page.evaluate('window.__audioContexts.length')==1
   assert await page.evaluate('window.__buffers.filter(node=>node.loop&&!node.__stopped).length')==5
   if reduced:
    await page.get_by_role('button',name='Unmute sound',exact=True).click()
    await page.get_by_role('button',name='Mute sound',exact=True).wait_for()
   await page.get_by_role('button',name='Skip journey preview').click()
   await page.get_by_role('heading',name='First Stop: Abu Dhabi',exact=True).wait_for()
   await page.reload(wait_until='networkidle');await page.get_by_role('heading',name='First Stop: Abu Dhabi',exact=True).wait_for()
   assert await page.locator('.boarding-platform').count()==0
   await page.get_by_role('button',name='Replay Journey Preview',exact=True).click()
   await page.get_by_role('button',name='Skip journey preview').wait_for();assert await page.locator('.boarding-platform').count()==0
   results.append(f'{"Image-response fixture only" if USE_FIXTURE else "Canonical image"}: reduced={reduced}, intentional keyboard boarding, covered readiness handoff, one AudioContext, audio cleanup, Abu Dhabi, refresh/resume and direct preview replay.')
   await context.close()
  await browser.close()
 (OUT/'contract-report.json').write_text(json.dumps(results,indent=2));print('\n'.join('PASS '+result for result in results))
if __name__ == "__main__":
 asyncio.run(main())
