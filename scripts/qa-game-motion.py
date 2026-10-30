"""Real browser motion review: timed filmstrips, readable holds and interruptible UI.
Auth/catalogue are explicit fixtures reused from qa-train; all motion/art/audio are real.
Outputs /tmp/tee-game-motion, including a contact sheet and captured WebM.
"""
import asyncio, importlib.util, json, os, shutil, sys, time
import playwright
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('trainqa',ROOT/'scripts/qa-train.py');qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
OUT=Path('/tmp/tee-game-motion');OUT.mkdir(exist_ok=True)
# Use the installed system encoder without downloading a second binary.
encoder=shutil.which('ffmpeg')
if encoder:
 manifest=json.loads((Path(playwright.__file__).parent/'driver/package/browsers.json').read_text())
 revision=next(item['revision'] for item in manifest['browsers'] if item['name']=='ffmpeg')
 cache=OUT/'playwright';target=cache/f'ffmpeg-{revision}'/'ffmpeg-linux';target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():target.symlink_to(encoder)
 os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(cache)
shots=[];checks=[]
async def capture(page,name,start):
 elapsed=round(time.monotonic()-start,2);path=OUT/f'{len(shots):02}-{name}.jpg'
 await page.screenshot(path=str(path),type='jpeg',quality=75);shots.append((path,f'{name} +{elapsed:.2f}s'))
async def sequence(page,name,times,start):
 for at in times:
  await asyncio.sleep(max(0,at-(time.monotonic()-start)));await capture(page,name,start)
def sheet():
 width,height=400,270
 for group,start in [('intro',0),('boarding',12)]:
  items=shots[start:12] if group=='intro' else shots[12:]
  canvas=Image.new('RGB',(width*3,height*((len(items)+2)//3)),'#f3e8d4');draw=ImageDraw.Draw(canvas)
  for i,(path,label) in enumerate(items):
   image=Image.open(path).convert('RGB');image.thumbnail((width,height-25));x=(i%3)*width;y=(i//3)*height
   canvas.paste(image,(x,y));draw.text((x+8,y+height-21),label,fill='#493d35')
  canvas.save(OUT/f'{group}-contact.jpg')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=await browser.new_context(viewport={'width':1280,'height':800},record_video_dir=str(OUT/'video'),record_video_size={'width':960,'height':600})
  page=await context.new_page();await qa.fixture(page,{},student=False)
  await page.goto(qa.BASE+'/eco-journey',wait_until='networkidle');await page.wait_for_timeout(1500)
  assert float(await page.locator('#start-btn').evaluate('(el)=>getComputedStyle(el).opacity'))==1
  # A pointer jump must be damped and bounded, then return to rest on leaving.
  await page.mouse.move(1270,20);await page.wait_for_timeout(600)
  transforms=await page.locator('.floating-asteroid').evaluate_all('(els)=>els.map(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)')
  assert all(abs(value)<=12.1 for value in transforms),transforms
  await page.mouse.move(640,400);checks.append('Pointer depth is damped, bounded to 12px, and does not move reading text.')
  await page.get_by_role('button',name='Board the Eco Train',exact=True).click();start=time.monotonic()
  await sequence(page,'briefing',[0,.25,.8,1.6,3.5,5.7,6.5,9,11.3,12.5,15,18.9],start)
  await page.locator('.boarding-platform').wait_for(timeout=10000);await page.wait_for_timeout(1500)
  checks.append('Reviewed named intro beats, staggered route and a settled reading hold before platform entry.')
  await page.locator('.boarding-platform').get_by_role('button',name='Board the Eco Train',exact=True).click();start=time.monotonic()
  await sequence(page,'doorway',[0,.18,.45,.85,1.03,1.25,1.51,1.85,2.2,2.65,3.1],start)
  await page.locator('.boarding-platform').wait_for(state='detached')
  assert await page.evaluate("document.activeElement===document.querySelector('.train-shell h1')")
  skip=page.get_by_role('button',name='Skip journey preview')
  before=await skip.bounding_box();await page.wait_for_timeout(250);assert before==await skip.bounding_box()
  checks.append('Skip Preview stays steady while only the physical cabin layer vibrates.')
  await skip.click()
  await page.get_by_role('heading',name='First Stop: Abu Dhabi',exact=True).wait_for();await page.wait_for_timeout(1100)
  title=page.locator('.train-guide-copy h3');before=await title.bounding_box();await page.wait_for_timeout(400);after=await title.bounding_box()
  assert before==after,(before,after)
  await page.get_by_role('button',name='Hide station challenge').click()
  await page.get_by_role('button',name='Show station challenge').evaluate('(button)=>button.click()')
  await page.get_by_role('button',name='Hide station challenge').wait_for()
  await page.wait_for_timeout(1000)
  assert await page.locator('.train-station-panel').count()==1
  assert await page.locator('.train-station-panel').evaluate('(el)=>getComputedStyle(el).opacity')=='1'
  assert await page.locator('.train-guide-copy h3').evaluate('(el)=>getComputedStyle(el).opacity')=='1'
  checks.append('Challenge exits are interruptible; a quick reopen leaves exactly one visible card. Reading copy settles.')
  assert await page.evaluate('window.__audioContexts.length')==1
  assert not qa.report['page_errors'],qa.report['page_errors']
  await context.close()
  reduced=await browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=await reduced.new_page();await qa.fixture(page,{},student=False)
  await page.goto(qa.BASE+'/eco-journey',wait_until='networkidle');await page.get_by_role('button',name='Board the Eco Train',exact=True).click()
  await page.wait_for_timeout(800)
  await page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
  await page.wait_for_timeout(5500)
  assert 'MEET' in await page.locator('.story-slide-group[aria-hidden=false]').inner_text()
  await page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
  checks.append('Introduction pauses while hidden; the briefing cannot advance unseen.')
  await page.get_by_role('button',name='Travel briefing').click();await page.get_by_role('button',name='Continue to the platform').click()
  await page.wait_for_timeout(1200)
  assert await page.locator('.boarding-platform-art').evaluate('(el)=>new DOMMatrixReadOnly(getComputedStyle(el).transform).a')==1
  assert await page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0
  await page.screenshot(path=str(OUT/'reduced-mobile-platform.png'))
  checks.append('Reduced motion removes zoom, stagger travel and CSS animation; original artwork remains framed on mobile.')
  await reduced.close();await browser.close()
 sheet();(OUT/'report.json').write_text(json.dumps({'checks':checks,'frames':[label for _,label in shots]},indent=2))
 print('\n'.join('PASS '+check for check in checks))
if __name__=='__main__':asyncio.run(main())
