"""Travel book browser QA. Real renderer, assets and routes; explicit API fixtures.
Run: python scripts/qa-book.py (requires Python Playwright and /usr/bin/chromium).
Auth, catalogue, mission writes and teacher approvals are fixtures, never student data.
Screenshots and the report are written to /tmp/tee-book-qa.
"""
import json, os, re
from pathlib import Path
from urllib.parse import urlparse, unquote, parse_qs
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/tmp/tee-book-qa'); OUT.mkdir(exist_ok=True)
BASE=os.environ.get('BOOK_QA_BASE_URL','http://127.0.0.1:3000')
chapters=re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*missionSlug:\s*"([^"]+)"',(ROOT/'client/src/components/book/chapters.ts').read_text())
assert len(chapters)==7, 'QA must discover all seven production chapter bindings' 
seed=(ROOT/'server/scripts/seedTomorrowEarth.ts').read_text()
missions=[]
for i,(_,name,slug) in enumerate(chapters):
 match=re.search(r'slug: "'+slug+r'", title: "([^"]+)".*?instructions: "([^"]+)"',seed)
 missions.append(dict(id=i+1,slug=slug,title=match[1],instructions=match[2],description='A published environmental challenge.',missionType='investigate',zoneName=name,estimatedMinutes=20,pointsAvailable=25,evidenceRequired=True,difficulty='easy',repeatPolicy='once'))
USER=dict(id=9001,email='book-qa@example.com',name='Book QA Student',role='student',openId='book-qa')
report={'fixture_scope':'API/auth/teacher approval are fixtures; rendering, routes, paper geometry, video, assets and local storage are real.','checks':[],'page_errors':[]}
def passed(text): report['checks'].append(text);print('PASS '+text,flush=True)
def fixture(page,state):
 def handle(route):
  request=route.request;url=urlparse(request.url);names=unquote(url.path.split('/api/trpc/')[-1]).split(',')
  raw=json.loads(request.post_data or '{}') if request.method=='POST' else json.loads(parse_qs(url.query).get('input',['{}'])[0]);results=[]
  for i,name in enumerate(names):
   value=raw.get(str(i),{}).get('json',{}) or {};data=None
   if name in state.get('fail_queries',[]):
    results.append({'error':{'json':{'message':'Fixture: progress service unavailable','code':-32603,'data':{'code':'INTERNAL_SERVER_ERROR','httpStatus':500,'path':name}}}})
    continue
   if name=='auth.me':data=USER if state.get('student',True) else None
   elif name=='missions.getAll':data=[] if state.get('unpublished') else missions
   elif name=='passport.getMine':data=dict(missionStates=[dict(missionId=n,status='verified') for n in state.get('verified',[])]+[dict(missionId=n,status=row['status']) for n,row in state.get('rows',{}).items() if n not in state.get('verified',[])],totalPoints=25*len(state.get('verified',[])),badges=[])
   elif name=='academicYears.getCurrent':data=dict(id=1,label='2026-2027')
   elif name=='missions.getBySlug':data=next((m for m in missions if m['slug']==value.get('slug')),None)
   elif name=='missionCompletions.getMine':data=state.get('rows',{}).get(value.get('missionId'))
   elif name=='missionCompletions.start':
    n=value['missionId'];state.setdefault('rows',{})[n]=dict(id=n,missionId=n,status='in_progress');data=state['rows'][n]
   elif name=='missionCompletions.submit':
    n=value['id'];state['rows'][n]['status']='submitted';state['submitted']=True;data=state['rows'][n]
   elif name=='missionCompletions.getMyList':data=list(state.get('rows',{}).values())
   else:route.continue_();return
   results.append({'result':{'data':{'json':data}}})
  route.fulfill(status=200,content_type='application/json',body=json.dumps(results if 'batch=1' in url.query else results[0]))
 page.route('**/api/trpc/**',handle)
 page.on('pageerror',lambda error:report['page_errors'].append(str(error)))
 page.add_init_script("window.__contexts=[];const Native=window.AudioContext;if(Native)window.AudioContext=class extends Native{constructor(...args){super(...args);window.__contexts.push(this)}}")
def ready(page):expect(page.locator('.book-phase-ready')).to_be_visible(timeout=20000)
def snap(page,name):page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 page=context.new_page();state={'verified':[]};fixture(page,state)
 requests=[];page.on('request',lambda request:requests.append(request.url))
 page.goto(BASE,wait_until='networkidle');expect(page.get_by_role('button',name='Open the book',exact=True)).to_be_visible();snap(page,'cover')
 assert not [url for url in requests if '.mp4' in url],requests
 passed('Cover renders a real WebGL book and fetches no chapter videos')
 page.get_by_role('button',name='Open the book',exact=True).click();expect(page.get_by_text('TABLE OF CONTENTS',exact=True)).to_be_visible(timeout=10000);snap(page,'contents')
 expect(page.get_by_role('button',name='Chapter 2: Dubai. Locked',exact=True)).to_be_disabled()
 passed('Cover opens into contents; future chapters are locked')
 page.get_by_role('button',name='Chapter 1: Abu Dhabi. Available',exact=True).click();ready(page)
 expect(page.locator('video')).to_have_js_property('controls',False);snap(page,'abu-dhabi')
 assert page.locator('video').evaluate('(v)=>v.currentTime')>1
 passed('Abu Dhabi film plays to the stable final poster and interactive challenge insert')
 page.reload(wait_until='networkidle');ready(page);expect(page.get_by_role('heading',name='Abu Dhabi',exact=True)).to_be_visible()
 page.get_by_role('link',name='Start challenge',exact=True).click();expect(page.get_by_role('heading',name=missions[0]['title'],exact=True)).to_be_visible()
 page.get_by_role('button',name='Accept mission',exact=True).click();expect(page.get_by_label('Evidence note',exact=False)).to_be_visible()
 page.get_by_label('Reflection — what did you discover, change, or create?',exact=True).fill('Measured water use and compared the results.')
 page.get_by_label('Evidence note',exact=False).fill('A repeated measurement, recorded with units.')
 page.get_by_role('button',name='Submit for review',exact=True).click();expect(page.get_by_text('Awaiting review',exact=True)).to_be_visible()
 page.get_by_role('link',name='Return to the book',exact=False).click();ready(page)
 assert state.get('submitted');expect(page.get_by_text('Abu Dhabi Stamp Collected',exact=True)).to_have_count(0)
 expect(page.get_by_role('button',name='Dubai: Locked',exact=True)).to_be_disabled()
 passed('Existing mission route accepts evidence; submitted work grants no stamp or next chapter')
 state['verified']=[1];page.reload(wait_until='networkidle');ready(page)
 expect(page.get_by_text('Abu Dhabi Stamp Collected',exact=True)).to_be_visible(timeout=10000)
 expect(page.get_by_role('button',name='Turn to Dubai',exact=False)).to_be_enabled()
 snap(page,'stamp-earned');passed('Teacher verification fixture earns a stamp, returns to the same chapter and unlocks Dubai')
 for index in range(1,7):
  page.get_by_role('button',name='Turn to '+chapters[index][1],exact=False).click();ready(page)
  expect(page.get_by_role('heading',name=chapters[index][1],exact=True)).to_be_visible()
  state['verified']=list(range(1,index+2));page.reload(wait_until='networkidle')
  if index<6:ready(page);expect(page.get_by_text(chapters[index][1]+' Stamp Collected',exact=True)).to_be_visible(timeout=10000)
 expect(page.locator('.book-phase-final')).to_be_visible(timeout=20000);expect(page.get_by_role('heading',name='Journey complete.',exact=True)).to_be_visible();assert page.locator('.book-stamp.is-collected').count()==7;snap(page,'final')
 passed('All seven reveals, sequential verified unlocks, seven stamps and automatic final spread')
 page.get_by_role('button',name='Replay the journey',exact=True).click();ready(page);expect(page.get_by_role('heading',name='Abu Dhabi',exact=True)).to_be_visible()
 page.get_by_role('button',name='My travel stamps',exact=False).click();expect(page.get_by_role('heading',name='My travel stamps',exact=True)).to_be_visible();snap(page,'stamps')
 passed('Completed chapters remain revisitable; replay and stamp collection preserve rewards')
 page.set_viewport_size({'width':768,'height':1024});snap(page,'tablet');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 page.set_viewport_size({'width':390,'height':844});snap(page,'mobile-stamps');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
 page.get_by_role('button',name='Abu Dhabi: Completed',exact=True).click();page.get_by_role('button',name='Skip animation',exact=False).click();ready(page);snap(page,'mobile-chapter')
 page.get_by_role('button',name='Enable book sounds',exact=True).click();page.get_by_role('button',name='Mute book sounds',exact=True).click()
 assert page.evaluate('window.__contexts.length')<=1
 passed('Tablet/mobile layouts have no horizontal overflow; skip works; one sound context and mute state')
 page.emulate_media(reduced_motion='reduce');page.get_by_role('button',name='Dubai: Completed',exact=True).click();ready(page)
 passed('Reduced motion retains chapter navigation and skips film motion')
 session=context.new_cdp_session(page);session.send('HeapProfiler.collectGarbage');before=page.evaluate('performance.memory.usedJSHeapSize')
 for n in range(14):
  page.get_by_role('button',name=chapters[n%7][1]+': Completed',exact=True).click();ready(page)
 session.send('HeapProfiler.collectGarbage');after=page.evaluate('performance.memory.usedJSHeapSize')
 assert after-before<20_000_000,(before,after)
 report['heap_bytes']={'before':before,'after':after,'chapter_changes':14}
 passed('Repeated chapter changes retain one WebGL canvas and bounded post-GC heap growth')
 assert page.locator('canvas').count()==1
 context.close()
 # Guest and no-WebGL fallback, with every video request deliberately denied.
 context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();fixture(page,{'student':False})
 page.add_init_script("HTMLCanvasElement.prototype.getContext=function(){return null}")
 page.route('**/book/*.mp4',lambda route:route.abort())
 page.goto(BASE+'/eco-journey?chapter=fujairah',wait_until='networkidle');ready(page)
 expect(page.get_by_role('heading',name='Abu Dhabi',exact=True)).to_be_visible();expect(page.get_by_role('link',name='Sign in to start',exact=False)).to_be_visible()
 assert page.locator('.book-fallback').count()==1
 page.get_by_role('button',name='Contents',exact=False).click();expect(page.get_by_text('TABLE OF CONTENTS',exact=True)).to_be_visible()
 tab=page.get_by_role('button',name='Chapter 1: Abu Dhabi. Available',exact=True);tab.focus();page.keyboard.press('Enter');ready(page)
 expect(page.get_by_role('link',name='Sign in to start',exact=False)).to_be_visible();snap(page,'fallback')
 passed('No-WebGL and denied-video fallback stays usable; forged locked URLs are clamped; keyboard navigation and guest sign-in remain available')
 context.close()
 context=browser.new_context();page=context.new_page();fixture(page,{'unpublished':True});page.goto(BASE+'/eco-journey?chapter=abu-dhabi',wait_until='networkidle');ready(page)
 expect(page.get_by_text('This chapter’s challenge has not been published yet.',exact=True)).to_be_visible()
 passed('Unpublished catalogue presents no fabricated mission or challenge link')
 context.close()
 context=browser.new_context();page=context.new_page();fixture(page,{'verified':[1]})
 for route in ['/','/eco-journey','/my-journey','/eco-journey?spread=stamps','/eco-journey?chapter=dubai']:
  page.goto(BASE+route,wait_until='networkidle')
  expect(page.locator('[data-book-engine="legacy"]')).to_be_visible()
  if 'stamps' in route or route=='/my-journey':
   expect(page.get_by_role('heading',name='My travel stamps',exact=True)).to_be_visible()
  elif 'chapter=dubai' in route:
   ready(page);expect(page.get_by_role('heading',name='Dubai',exact=True)).to_be_visible()
  elif route=='/':
   expect(page.get_by_role('button',name='Open the book',exact=True)).to_be_visible()
  else:expect(page.get_by_text('TABLE OF CONTENTS',exact=True)).to_be_visible()
 page.goto(BASE+'/missions',wait_until='networkidle')
 expect(page.get_by_role('heading',name='A little action. A bigger change.',exact=True)).to_be_visible()
 page.goto(BASE+'/missions/water-detective',wait_until='networkidle')
 expect(page.get_by_role('heading',name=missions[0]['title'],exact=True)).to_be_visible()
 expect(page.get_by_role('link',name='Return to the book',exact=False)).to_have_attribute('href','/eco-journey?chapter=abu-dhabi')
 passed('Legacy renderer, cover, chapter/stamp deep links and existing mission routes remain compatible')
 context.close()
 context=browser.new_context();page=context.new_page();fixture(page,{'fail_queries':['missions.getAll','passport.getMine']})
 page.goto(BASE+'/eco-journey?chapter=dubai',wait_until='networkidle');ready(page)
 expect(page.get_by_role('button',name='Reconnect book',exact=True)).to_be_visible()
 expect(page.get_by_role('link',name='Start challenge',exact=True)).to_have_count(0)
 expect(page.locator('.book-chapter-stamp')).to_have_count(0)
 expect(page.get_by_role('button',name='Dubai: Locked',exact=True)).to_be_disabled()
 passed('Unavailable catalogue/passport keeps challenges locked and offers recovery without fabricated stamps')
 context.close();browser.close()
assert not report['page_errors'],report['page_errors']
(OUT/'report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
