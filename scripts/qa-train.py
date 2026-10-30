"""Browser integration QA using explicit API fixtures, never real student records.
Run against pnpm dev: python scripts/qa-train.py
Requires Python Playwright and Chromium; writes screenshots/report to /tmp/tee-train-qa.
The real local server/assets are used; auth/catalogue/teacher approval are fixtures.
"""
import asyncio, json, os, re
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('/tmp/tee-train-qa'); OUT.mkdir(exist_ok=True)
BASE = os.environ.get('TRAIN_QA_BASE_URL', 'http://127.0.0.1:3000')
SOURCE = (ROOT / 'server/scripts/seedTomorrowEarth.ts').read_text()
MISSIONS = []
for index, match in enumerate(re.finditer(r'\{ zone: "([^"]+)", slug: "([^"]+)", title: "([^"]+)", type: "([^"]+)" as const, description: "([^"]+)", instructions: "([^"]+)"', SOURCE)):
 zone, slug, title, kind, description, instructions = match.groups()
 MISSIONS.append(dict(id=index+1,slug=slug,title=title,missionType=kind,description=description,instructions=instructions,zoneName=zone,estimatedMinutes=20,pointsAvailable=25,evidenceRequired=True,difficulty='easy',repeatPolicy='once'))
USER=dict(id=9001,email='train-qa@example.com',name='Train QA Student',role='student',openId='train-qa')
report={'fixture_scope':'Auth, mission catalogue, submission and teacher verification are fixtures; app routes, rendering, audio and assets are real.','checks':[],'page_errors':[]}

def passed(message):
 report['checks'].append(message); print('PASS '+message,flush=True)

async def fixture(page, state, student=True):
 async def handle(route):
  request=route.request; parsed=urlparse(request.url)
  procedures=unquote(parsed.path.split('/api/trpc/')[-1]).split(',')
  results=[]
  for name in procedures:
   if name=='auth.me': data=USER if student else None
   elif name=='missions.getAll': data=MISSIONS
   elif name=='passport.getMine':
    data=dict(missionStates=[dict(missionId=i,status='verified') for i in state.get('completed',[])],badges=[],totalPoints=25*len(state.get('completed',[])))
   elif name=='academicYears.getCurrent': data=dict(id=1,label='2026-2027')
   elif name=='missions.getBySlug':
    inputs=json.loads(request.post_data or '{}') if request.method=='POST' else json.loads(dict(__import__('urllib.parse',fromlist=['parse_qsl']).parse_qsl(parsed.query)).get('input','{}'))
    slug=next(iter(inputs.values())).get('json',{}).get('slug')
    data=next((m for m in MISSIONS if m['slug']==slug),None)
   elif name=='missionCompletions.getMine': data=state.get('completion')
   elif name=='missionCompletions.start':
    state['completion']=dict(id=1,missionId=1,status='in_progress');data=state['completion']
   elif name=='missionCompletions.submit':
    state['completion']=dict(id=1,missionId=1,status='submitted');data=state['completion'];state['submitted']=True
   elif name=='missionCompletions.getMyList': data=[state['completion']] if state.get('completion') else []
   else:
    await route.continue_();return
   results.append({'result':{'data':{'json':data}}})
  await route.fulfill(status=200,content_type='application/json',body=json.dumps(results if 'batch=1' in parsed.query else results[0]))
 await page.route('**/api/trpc/**',handle)
 await page.add_init_script("""window.__audioContexts=[];window.__audioSources=0; const Native=window.AudioContext; if(Native)window.AudioContext=class extends Native {constructor(...args){super(...args);window.__audioContexts.push(this)}createBufferSource(){window.__audioSources++;return super.createBufferSource()}};""")
 page.on('pageerror',lambda error:report['page_errors'].append(str(error)))

async def set_boarded(page,station=0,preview_seen=True):
 await page.add_init_script(f"if(!localStorage.getItem('uaeTrainJourney:v1:9001'))localStorage.setItem('uaeTrainJourney:v1:9001',JSON.stringify({{boarded:true,station:{station}}}));"+("localStorage.setItem('uaeTrainPreviewSeen:v1','true');" if preview_seen else ''))

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  # Full first-time journey, without accelerating or seeking its runtime clock.
  context=await browser.new_context(viewport={'width':1440,'height':1000})
  page=await context.new_page();await fixture(page,{})
  await page.goto(BASE+'/eco-journey?trainDebug=1',wait_until='networkidle')
  await page.get_by_role('button',name='Board the Eco Train').click()
  await page.locator('.train-shell').wait_for(timeout=20000)
  passed('Original opening and story automatically board the train')
  await page.get_by_role('button',name='Pause journey',exact=True).click()
  before=await page.locator('.train-debug output').text_content();await page.wait_for_timeout(400)
  assert before==await page.locator('.train-debug output').text_content()
  await page.get_by_role('button',name='Resume journey',exact=True).click();passed('Pause freezes the shared motion clock')
  # Exercise the visibility handler without relying on headless tab-focus behaviour.
  await page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
  before=await page.locator('.train-debug output').text_content();await page.wait_for_timeout(400)
  assert before==await page.locator('.train-debug output').text_content()
  await page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
  passed('Visibility pause resumes without advancing hidden time')
  seen=set();phases=set();final=False
  for _ in range(900):
   debug=await page.locator('.train-debug output').text_content();phases.add(debug.split(' · ')[0])
   m=re.search(r'scene (\d+)',debug)
   if m:seen.add(int(m.group(1)))
   if not final and 'ARRIVING' in debug and 'scene 29' in debug:
    final=True
    await page.screenshot(path=str(OUT/'preview-fujairah.png'))
   if 'STATION_IDLE' in debug:break
   await page.wait_for_timeout(60)
  assert seen==set(range(1,30)),seen
  assert final and {'ACCELERATING','CRUISING','BRAKING','ARRIVING','RESETTING','STATION_IDLE'}<=phases,phases
  await page.get_by_role('heading',name='First Stop: Abu Dhabi',exact=True).wait_for()
  assert await page.evaluate("localStorage.getItem('uaeTrainPreviewSeen:v1')")=='true'
  passed('All 29 scenes, gradual travel, final Fujairah hold, covered reset and Abu Dhabi arrival')
  await page.screenshot(path=str(OUT/'desktop-abu-dhabi.png'),full_page=True)
  await page.reload(wait_until='networkidle');await page.get_by_role('heading',name='First Stop: Abu Dhabi',exact=True).wait_for()
  assert await page.get_by_role('button',name='Skip journey preview').count()==0
  passed('Refresh preserves the current station and does not repeat the preview')
  await page.get_by_role('button',name='Replay Journey Preview',exact=True).click()
  skip=page.get_by_role('button',name='Skip journey preview');await skip.wait_for();assert await page.evaluate('window.__audioSources')>=3;await skip.focus();await page.keyboard.press('Enter')
  await page.get_by_role('heading',name='First Stop: Abu Dhabi',exact=True).wait_for()
  passed('Manual replay and keyboard Skip Preview')
  assert await page.evaluate('window.__audioContexts.length')==1
  passed('Opening, replay and skip share one AudioContext')
  await context.close()

  # Existing mission route, evidence submission, pending review, then approved passport.
  state={};context=await browser.new_context(viewport={'width':1280,'height':900});page=await context.new_page()
  await fixture(page,state);await set_boarded(page)
  await page.goto(BASE+'/eco-journey?trainDebug=1',wait_until='networkidle')
  await page.get_by_role('link',name='Start Challenge').click()
  assert page.url.endswith('/missions/water-detective')
  await page.get_by_role('button',name='Accept mission',exact=True).click()
  await page.get_by_label('Evidence note').fill('QA evidence collected for the existing mission.')
  await page.get_by_label('Reflection — what did you discover, change, or create?').fill('QA reflection for the existing evidence workflow.')
  await page.get_by_role('button',name='Submit for review',exact=True).click()
  await page.get_by_text('Awaiting review',exact=True).wait_for();assert state.get('submitted')
  await page.get_by_role('link',name='Return to Eco Train').first.click()
  await page.get_by_role('heading',name='First Stop: Abu Dhabi',exact=True).wait_for()
  assert await page.locator('#station-dubai').is_disabled()
  passed('Existing Water Detective route and submission preserved; awaiting review does not unlock Dubai')
  state['completed']=[1];state['completion']['status']='verified'
  await page.reload(wait_until='networkidle')
  await page.get_by_role('heading',name='Abu Dhabi Stamp Earned',exact=True).wait_for()
  await page.get_by_role('button',name='Next Stop: Dubai',exact=True).click()
  await page.get_by_role('heading',name='Welcome to Dubai',exact=True).wait_for(timeout=30000)
  await page.screenshot(path=str(OUT/'dubai-arrival.png'),full_page=True)
  passed('Verified passport awards the stamp and unlocks physical departure to Dubai')
  await page.reload(wait_until='networkidle');await page.get_by_role('heading',name='Welcome to Dubai',exact=True).wait_for()
  await page.get_by_role('link',name='Start Challenge').click();assert page.url.endswith('/missions/energy-smart-check')
  await page.go_back();await page.get_by_role('heading',name='Welcome to Dubai',exact=True).wait_for()
  await page.go_forward();assert page.url.endswith('/missions/energy-smart-check')
  passed('Dubai persistence, existing next mission route and browser back/forward')
  await context.close()

  # Final station, reduced motion, mobile, tablet and exact shared-mask geometry.
  state={'completed':list(range(1,8))};context=await browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=await context.new_page()
  await fixture(page,state);await set_boarded(page,5)
  await page.goto(BASE+'/eco-journey?trainDebug=1',wait_until='networkidle')
  await page.get_by_role('button',name='Next Stop: Fujairah',exact=True).click()
  await page.get_by_role('heading',name='Final Stop: Fujairah',exact=True).wait_for(timeout=15000)
  assert await page.get_by_role('link',name='Open my passport',exact=True).is_visible()
  passed('Reduced-motion final Fujairah arrival retains all verified stamps')
  for width,height,label in [(390,844,'mobile'),(768,1024,'tablet-portrait'),(1024,768,'tablet-landscape'),(1440,900,'desktop')]:
   await page.set_viewport_size({'width':width,'height':height});await page.wait_for_timeout(200)
   bounds=await page.evaluate("""() => {const art=document.querySelector('.train-artboard');const scene=document.querySelector('.train-scenery');const foreground=document.querySelector('.train-foreground');return {art:art.getBoundingClientRect().toJSON(),scene:scene.getBoundingClientRect().toJSON(),foreground:foreground.getBoundingClientRect().toJSON(),body:document.body.scrollWidth,viewport:innerWidth,transform:getComputedStyle(art).transform,mask:getComputedStyle(scene).maskImage}}""")
   assert abs(bounds['art']['width']/bounds['art']['height']-2752/1536)<0.005
   assert bounds['scene']==bounds['foreground']
   assert bounds['body']<=bounds['viewport']+1
   assert bounds['transform']=='none'
   assert 'window-mask.png' in bounds['mask']
   await page.screenshot(path=str(OUT/(label+'.png')),full_page=True)
  passed('Mobile, both tablet orientations and desktop keep matching mask geometry with no horizontal overflow')
  await page.get_by_role('button',name='Replay Journey Preview',exact=True).click()
  await page.get_by_role('button',name='Skip journey preview').wait_for()
  # Replay naturally finishes in reduced-motion mode, restoring the earned station.
  await page.get_by_role('heading',name='Final Stop: Fujairah',exact=True).wait_for(timeout=20000)
  passed('Reduced-motion preview remains usable and replay preserves the selected earned station')
  text=await page.locator('body').inner_text();assert not re.search(r'[\u0600-\u06ff]',text.replace('بوغصن',''))
  passed('All visible copy and accessibility controls are English except the exact permitted character name')
  await context.close();await browser.close()
  assert not report['page_errors'],report['page_errors']
  passed('No uncaught browser errors in the tested flows')
  (OUT/'report.json').write_text(json.dumps(report,indent=2))
  print(str(OUT/'report.json'))

if __name__ == "__main__":
 asyncio.run(main())
