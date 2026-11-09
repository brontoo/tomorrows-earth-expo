"""Release-candidate exploration QA. Read-only API fixtures, zero achievements.
Default media requests use genuine Supabase. --local-media-root is explicitly
fixture-only UI coverage with unchanged external Full HD bytes, never staging/backend acceptance.
"""
import argparse
import json
import os
from pathlib import Path
import re
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]
MEDIA='https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/'
manifest=json.loads((ROOT/'media/seven-emirates/manifest.json').read_text())
bindings=re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*missionSlug:\s*"([^"]+)"',(ROOT/'client/src/components/book/chapters.ts').read_text())
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',default='http://127.0.0.1:4180');p.add_argument('--local-media-root',type=Path);p.add_argument('--roles',nargs='+',default=['guest','student','offline','mobile-guest']);p.add_argument('--report',type=Path,default=Path('/tmp/book-free-exploration.json'));a=p.parse_args()
report=dict(media='local-fixtures' if a.local_media_root else 'actual-Supabase',backend='read-only fixtures',realStagingDeployment=False,physicalCameraVerified=False,checks=[],failures=[],pageErrors=[],networkFailures=[],blockedMutations=[])
def passed(message):report['checks'].append(message);print('PASS '+message,flush=True)

def context_for(browser,role,unavailable=False,mobile=False):
 ctx=browser.new_context(viewport=dict(width=390 if mobile else 1440,height=844 if mobile else 1050),has_touch=True,is_mobile=mobile,reduced_motion='reduce')
 def writes(route):
  if route.request.method not in ('GET','HEAD','OPTIONS'):
   report['blockedMutations'].append(route.request.method);route.abort()
  else:route.continue_()
 ctx.route('**/*',writes)
 def api(route):
  if route.request.method not in ('GET','OPTIONS'):writes(route);return
  rows=[]
  for name in unquote(urlparse(route.request.url).path.split('/api/trpc/')[-1]).split(','):
   if unavailable and name in ('missions.getAll','passport.getMine'):
    route.fulfill(status=503,body='Optional educational API unavailable');return
   if name=='auth.me':value=None if role=='guest' else dict(id=9101,email='exploration@example.invalid',name='QA Explorer',role=role,openId='exploration-qa')
   elif name=='missions.getAll':value=[dict(id=i+1,slug=c[2],title=c[1]) for i,c in enumerate(bindings)]
   elif name=='passport.getMine':value=dict(missionStates=[],totalPoints=0,badges=[])
   elif name in ('projects.getStats','teacher.getAnalytics','admin.getPlatformStats'):value=dict(totalProjects=0,totalStudents=0,totalVotes=0,totalUsers=0)
   elif name=='notifications.getUnreadCount':value=dict(count=0)
   elif name=='admin.getEventSettings':value=dict(eventDate='2027-01-01',submissionDeadline='2026-12-31',eventLocation='Test',eventDescription='')
   elif name=='admin.getVotingStats':value=dict(votingOpen=False,totalVotes=0,topProjects=[])
   else:value=[]
   rows.append({'result':{'data':{'json':value}}})
  route.fulfill(content_type='application/json',body=json.dumps(rows))
 ctx.route('**/api/trpc/**',api)
 ctx.add_init_script("window.__cameraCalls=0;if(navigator.mediaDevices){navigator.mediaDevices.getUserMedia=async()=>{window.__cameraCalls++;throw Error('No automated physical camera access')}}")
 if a.local_media_root:
  def local(route):
   key=unquote(route.request.url.split(MEDIA,1)[1].split('?',1)[0]).removeprefix('7e-1bc718ef5e77/')
   path=(a.local_media_root/key).resolve()
   if a.local_media_root.resolve() not in path.parents or not path.is_file():route.abort();return
   route.fulfill(path=str(path),content_type='application/json' if path.suffix=='.json' else 'image/webp',headers={'Access-Control-Allow-Origin':'*'})
  ctx.route(MEDIA+'**',local)
 return ctx

with sync_playwright() as pw:
 options=dict(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 if os.environ.get('HTTPS_PROXY'):options['proxy']=dict(server=os.environ['HTTPS_PROXY'],bypass='localhost,127.0.0.1')
 browser=pw.chromium.launch(**options)
 for role in a.roles:
  ctx=context_for(browser,'guest' if role in ('offline','mobile-guest') else role,role=='offline',role=='mobile-guest');page=ctx.new_page()
  page.on('pageerror',lambda error:report['pageErrors'].append(str(error)))
  page.on('requestfailed',lambda request:report['networkFailures'].append(dict(url=request.url,error=request.failure)) if request.url.startswith(MEDIA) else None)
  try:
   page.goto(a.base_url+'/eco-journey',wait_until='domcontentloaded')
   player=page.locator('.frame-book-player')
   expect(player).to_have_attribute('data-frame-displayed','0',timeout=45000)
   expect(page.locator('.book-phase-cover,.book-contents,.book-webgl')).to_have_count(0)
   contents=page.locator('.book-compact-chapters [data-book-gesture=chapter]')
   expect(contents).to_have_count(7)
   for i in range(7):expect(contents.nth(i)).to_be_enabled()
   expect(page.locator('.book-gesture-controls')).to_have_attribute('data-model-sha256','97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482')
   passed(role+': original frame 0, camera off, no synthetic cover/Contents and seven enabled compact jumps')
   contents.filter(has_text='Fujairah').click()
   expect(player).to_have_attribute('data-frame-displayed','1672',timeout=45000)
   expect(page.get_by_role('heading',name='Fujairah',exact=True)).to_be_visible()
   contents.filter(has_text='Dubai').click()
   expect(player).to_have_attribute('data-frame-displayed','477',timeout=45000)
   expect(page.get_by_role('heading',name='Dubai',exact=True)).to_be_visible()
   passed(role+': Fujairah first, then Dubai without progress or an intermediary screen')
   for i,(chapter,name,_) in enumerate(bindings):
    page.goto(a.base_url+'/eco-journey?chapter='+chapter,wait_until='domcontentloaded')
    expect(player).to_have_attribute('data-frame-displayed',str(manifest['chapters'][i]['restingFrame']),timeout=45000)
    expect(page.get_by_role('heading',name=name,exact=True)).to_be_visible()
    if role=='student':expect(page.get_by_role('link',name='View optional challenge',exact=True)).to_have_attribute('href','/missions/'+bindings[i][2])
    expect(page.locator('.book-compact-chapters button:disabled')).to_have_count(0)
    expect(page.locator('.book-chapter-stamp,.book-earned-achievement')).to_have_count(0)
    expect(page.get_by_label('Development gesture model')).to_have_count(0)
   passed(role+': all seven deep links/labels/resting frames; no locks, earned stamps or A/B selector')
   slider=page.get_by_role('slider',name='Book frame')
   expect(slider).to_have_attribute('min','0');expect(slider).to_have_attribute('max','1672')
   def seek(index):
    slider.evaluate("(el,n)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(n));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}",index)
    expect(player).to_have_attribute('data-frame-displayed',str(index),timeout=30000)
   for i,c in enumerate(manifest['chapters'][1:],1):
    edge=c['startInclusive'];seek(edge-1)
    canvas=player.locator('canvas');canvas.focus();canvas.press('ArrowRight')
    expect(player).to_have_attribute('data-frame-displayed',str(edge),timeout=30000)
    expect(page.get_by_role('heading',name=bindings[i][1],exact=True)).to_be_visible()
    canvas.press('ArrowLeft');expect(player).to_have_attribute('data-frame-displayed',str(edge-1),timeout=30000)
    expect(page.get_by_role('heading',name=bindings[i-1][1],exact=True)).to_be_visible()
   passed(role+': all six boundaries work forward and backward; full-range slider and labels agree')
   seek(230);canvas=player.locator('canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.5
   assert canvas.evaluate('(el)=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el}'), 'Canvas center is obscured by an overlay'
   page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-box['width']*.35,y,steps=5);page.mouse.up()
   page.wait_for_function("Number(document.querySelector('.frame-book-player').dataset.frameDisplayed)>238")
   seek(469);box=canvas.bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.5
   cdp=ctx.new_cdp_session(page);cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True})
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-box['width']*.35,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   page.wait_for_function("Number(document.querySelector('.frame-book-player').dataset.frameDisplayed)>478")
   canvas.focus();canvas.press('End');expect(player).to_have_attribute('data-frame-displayed','1672',timeout=30000)
   canvas.press('Home');expect(player).to_have_attribute('data-frame-displayed','0',timeout=30000)
   page.wait_for_timeout(400);expect(player).to_have_attribute('data-frame-displayed','0')
   assert page.evaluate('window.__cameraCalls')==0
   expect(page.locator('.book-chapter-stamp,.book-earned-achievement')).to_have_count(0)
   passed(role+': unobscured canvas, mouse, native touch, keyboard, slider, no autoplay/camera and no navigation rewards')
   if role=='mobile-guest':page.screenshot(path=str(a.report.with_name(a.report.stem+'-mobile.png')),full_page=True)
  except Exception as error:
   report['failures'].append(role+': '+str(error))
   page.screenshot(path=str(a.report.with_name(a.report.stem+'-'+role+'-failure.png')),full_page=True)
  finally:ctx.close()
 # Unrelated UI smoke checks, with explicitly fake read-only accounts, never backend write acceptance.
 for role,path in [('guest','/innovation-hub'),('student','/student/dashboard'),('teacher','/teacher/dashboard'),('admin','/admin/dashboard')]:
  ctx=context_for(browser,role);page=ctx.new_page();requests=[];page.on('request',lambda req:requests.append(req.url));errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   page.goto(a.base_url+path,wait_until='networkidle')
   assert page.locator('main, h1, h2').count()>0
   assert not page.locator('.travel-book,.book-gesture-controls').count()
   assert page.evaluate('window.__cameraCalls')==0
   assert not any(url.startswith(MEDIA) or '.task' in url or '/mediapipe/wasm/' in url for url in requests)
   if role=='guest':assert not any(urlparse(url).path.startswith('/book/') for url in requests)
   assert not errors,errors
   passed(role+': '+path+' fixture UI smoke; no book media/camera/runtime')
  except Exception as error:report['failures'].append('Platform smoke '+path+': '+(str(error).splitlines() or [type(error).__name__])[0])
  finally:ctx.close()
 browser.close()
a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if report['failures'] or report['pageErrors'] or report['blockedMutations']:raise SystemExit('Exploration QA failed; inspect report')
