"""Production-build delivery QA with real local images and explicit API fixtures.

Measurements are local HTTP with Chromium network emulation, not Supabase/CDN results.
"""
import json
import os
from pathlib import Path
import re
import statistics
import time
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('FRAME_QA_BASE_URL','http://127.0.0.1:4173')
bindings=re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*missionSlug:\s*"([^"]+)"',(ROOT/'client/src/components/book/chapters.ts').read_text())
missions=[dict(id=i+1,slug=c[2],title=c[1]) for i,c in enumerate(bindings)]
USER=dict(id=9101,email='frame-delivery@example.com',name='Delivery QA',role='student',openId='delivery-qa')
report=dict(scope='Real local HTTP imagery + emulated network; auth/catalogue/passport are fixtures. No remote CDN readiness claim.',checks=[],measurements=[],pageErrors=[])
def passed(message):report['checks'].append(message);print('PASS '+message,flush=True)
def fixture(page,state):
 def handle(route):
  names=unquote(urlparse(route.request.url).path.split('/api/trpc/')[-1]).split(',');rows=[]
  for name in names:
   if name=='auth.me':value=None if state.get('guest') else USER
   elif name=='missions.getAll':value=missions
   elif name=='passport.getMine':value=dict(missionStates=[dict(missionId=i,status='verified') for i in state.get('verified',[])],totalPoints=25*len(state.get('verified',[])),badges=[])
   elif name in ('projects.getStats','teacher.getAnalytics'):value=dict(totalProjects=0,totalStudents=0,totalVotes=0)
   else:value=[]
   rows.append({'result':{'data':{'json':value}}})
  route.fulfill(status=200,content_type='application/json',body=json.dumps(rows))
 page.route('**/api/trpc/**',handle)
 page.on('pageerror',lambda error:report['pageErrors'].append(str(error)))

INSTRUMENT=r'''(() => {
window.__bitmapLive=0;window.__bitmapMax=0;window.__drawn=[];
const native=createImageBitmap;
window.createImageBitmap=async(...args)=>{const bitmap=await native(...args);window.__bitmapLive++;window.__bitmapMax=Math.max(window.__bitmapMax,window.__bitmapLive);const close=bitmap.close.bind(bitmap);let closed=false;bitmap.close=()=>{if(!closed){closed=true;window.__bitmapLive--;close();}};return bitmap;};
const get=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(...args){const context=get.apply(this,args);if(args[0]==='2d'&&context&&!context.__qaWrapped){context.__qaWrapped=true;const draw=context.drawImage.bind(context);const canvas=this;context.drawImage=(...items)=>{draw(...items);if(canvas.closest('.frame-book-player'))window.__drawn.push(performance.now());};}return context;};
window.__globalListeners=new Map();const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
EventTarget.prototype.addEventListener=function(type,listener,options){if(this===window||this===document){const key=(this===window?'window:':'document:')+type;const entries=window.__globalListeners.get(key)||new Set();entries.add(listener);window.__globalListeners.set(key,entries);}return add.call(this,type,listener,options);};
EventTarget.prototype.removeEventListener=function(type,listener,options){if(this===window||this===document){const key=(this===window?'window:':'document:')+type;window.__globalListeners.get(key)?.delete(listener);}return remove.call(this,type,listener,options);};
window.__listenerCount=()=>[...window.__globalListeners.values()].reduce((n,s)=>n+s.size,0);
})();'''

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for mobile in [False,True]:
  context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':900},has_touch=mobile)
  context.add_init_script(INSTRUMENT)
  page=context.new_page();state={'verified':[]};fixture(page,state)
  requests=[];page.on('request',lambda r:requests.append(r.url))
  session=context.new_cdp_session(page);session.send('Network.enable')
  # Chromium throughput values are bytes/second; latency is milliseconds.
  latency,rate=(150,256*1024) if mobile else (80,1024*1024)
  session.send('Network.emulateNetworkConditions',dict(offline=False,latency=latency,downloadThroughput=rate,uploadThroughput=rate))
  session.send('Network.setCacheDisabled',{'cacheDisabled':True})
  start=time.perf_counter();page.goto(BASE+'/eco-journey?chapter=abu-dhabi',wait_until='domcontentloaded')
  player=page.locator('.frame-book-player');expect(player).to_have_attribute('data-frame-displayed','238',timeout=45000)
  cold_ms=(time.perf_counter()-start)*1000
  expect(player).to_have_attribute('data-frame-policy','mobile' if mobile else 'desktop')
  page.wait_for_load_state('networkidle',timeout=30000)
  entry_frames=[url for url in requests if '/frames/' in url]
  assert 2<=len(entry_frames)<=9,entry_frames
  assert not any('/02-DXB/' in url for url in entry_frames)
  canvas=player.locator('canvas');canvas.focus()
  cached=[]
  for _ in range(4):
   for key,index in [('ArrowLeft',237),('ArrowRight',238)]:
    began=page.evaluate('performance.now()');page.keyboard.press(key)
    expect(player).to_have_attribute('data-frame-displayed',str(index))
    cached.append(page.evaluate('window.__drawn.at(-1)')-began)
  metric=dict(device='mobile' if mobile else 'desktop',latencyMs=latency,downloadBytesPerSecond=rate,coldNavigationToFrameMs=round(cold_ms,1),cachedStepMedianMs=round(statistics.median(cached),1),cachedStepMaximumMs=round(max(cached),1),entryFrameRequests=len(entry_frames),maxLiveBitmaps=page.evaluate('window.__bitmapMax'))
  assert metric['maxLiveBitmaps'] <= (7 if mobile else 12),metric
  report['measurements'].append(metric)
  print('MEASURE '+json.dumps(metric),flush=True)
  passed(metric['device']+': cold first frame, bounded entry requests, locked prefetch and cached bidirectional scrubbing')
  # A selected uncached frame fails; the existing valid same-chapter image stays visible.
  page.route('**/frames/01-AD/f_0200.webp',lambda route:route.fulfill(status=503,body='temporary failure'))
  canvas.focus();page.keyboard.press('Home');expect(player).to_have_attribute('data-frame-displayed','0')
  page.keyboard.press('ArrowRight');expect(player).to_have_attribute('data-frame-displayed','1')
  # Use a real range input keyboard operation rather than an internal player API.
  slider=page.get_by_role('slider',name='Book frame');slider.focus();page.keyboard.press('End')
  expect(player).to_have_attribute('data-frame-displayed','238')
  # Fault a nonprefetched target via the native range input's value setter and input/change events.
  slider.evaluate("el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'200');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}")
  expect(page.get_by_role('button',name='Retry frame',exact=True)).to_be_visible()
  expect(player).to_have_attribute('data-frame-displayed','238')
  page.unroute('**/frames/01-AD/f_0200.webp');page.get_by_role('button',name='Retry frame',exact=True).click();expect(player).to_have_attribute('data-frame-displayed','200')
  passed(metric['device']+': failed same-chapter load retains valid imagery and retry recovers')
  # Refresh restores the permitted chapter; a locked deep link is clamped.
  page.reload(wait_until='domcontentloaded');expect(player).to_have_attribute('data-frame-displayed','238',timeout=30000)
  page.goto(BASE+'/eco-journey?chapter=fujairah',wait_until='domcontentloaded');expect(player).to_have_attribute('data-frame-displayed','238',timeout=30000)
  expect(page.get_by_role('heading',name='Abu Dhabi',exact=True)).to_be_visible()
  passed(metric['device']+': refresh and forged chapter URL preserve educational access')
  state['verified']=[1]
  page.route('**/frames/02-DXB/f_0000.webp',lambda route:route.fulfill(status=503,body='temporary boundary failure'))
  page.reload(wait_until='domcontentloaded');expect(player).to_have_attribute('data-frame-displayed','238',timeout=30000)
  expect(page.locator('.book-phase-ready')).to_be_visible(timeout=10000)
  player.locator('canvas').focus();page.keyboard.press('ArrowRight')
  expect(page.get_by_role('button',name='Retry frame',exact=True)).to_be_visible()
  expect(player).to_have_attribute('data-frame-displayed','')
  player.locator('canvas').focus();page.keyboard.press('ArrowLeft');expect(player).to_have_attribute('data-frame-displayed','238')
  page.unroute('**/frames/02-DXB/f_0000.webp');page.keyboard.press('ArrowRight');expect(player).to_have_attribute('data-frame-displayed','239')
  expect(page.get_by_role('heading',name='Dubai',exact=True)).to_be_visible()
  page.wait_for_url('**/eco-journey?chapter=dubai')
  page.reload(wait_until='domcontentloaded');expect(player).to_have_attribute('data-frame-displayed','477',timeout=30000)
  expect(page.get_by_role('heading',name='Dubai',exact=True)).to_be_visible()
  passed(metric['device']+': a failed new-chapter frame has no wrong-chapter substitute, and permitted Dubai survives refresh')
  # Repeated SPA navigation exercises cleanup without replacing the document.
  session.send('Network.emulateNetworkConditions',dict(offline=False,latency=0,downloadThroughput=-1,uploadThroughput=-1))
  page.wait_for_load_state('networkidle');baseline_listeners=page.evaluate('window.__listenerCount()');listener_samples=[]
  for n in range(5):
   page.evaluate("window.history.pushState(null,'','/innovation-hub');window.dispatchEvent(new PopStateEvent('popstate'))")
   expect(player).to_have_count(0)
   page.wait_for_function('window.__bitmapLive===0')
   count=len([u for u in requests if '/frames/' in u or '/manifest.json' in u])
   page.wait_for_timeout(150)
   assert len([u for u in requests if '/frames/' in u or '/manifest.json' in u])==count
   page.evaluate("window.history.pushState(null,'','/eco-journey?chapter=abu-dhabi');window.dispatchEvent(new PopStateEvent('popstate'))")
   expect(player).to_have_attribute('data-frame-displayed','238',timeout=15000)
   page.wait_for_load_state('networkidle')
   listener_samples.append(page.evaluate('window.__listenerCount()'))
  print('LISTENERS '+json.dumps(dict(baseline=baseline_listeners,samples=listener_samples)),flush=True)
  # The first Projects visit initializes its lazy module's shared listeners once.
  # Subsequent visits must not accumulate more listeners.
  assert max(listener_samples)==min(listener_samples),listener_samples
  metric['globalListenersBeforeProjectsWarmup']=baseline_listeners
  metric['globalListenersAfterEachRoundTrip']=listener_samples
  assert page.evaluate('window.__bitmapLive')<=(4 if mobile else 8)
  passed(metric['device']+': repeated navigation releases bitmaps, keeps global listener count bounded and stops media on Projects pages')
  context.close()
 # Initial unrelated pages must not request the manifest or any frame at all.
 context=browser.new_context();page=context.new_page();fixture(page,{'guest':True});unrelated=[];page.on('request',lambda r:unrelated.append(r.url))
 for path in ['/login','/innovation-hub']:
  page.goto(BASE+path,wait_until='networkidle')
 assert not [u for u in unrelated if '/manifest.json' in u or '/frames/' in u]
 passed('Unrelated login and Projects entry pages make zero frame or manifest requests')
 context.close();browser.close()
assert not report['pageErrors'],report['pageErrors']
Path('/tmp/7e-delivery-browser-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
