"""Student game pages: real rendering and routes, explicit API fixtures.
No real accounts or student records. Run against pnpm dev.
"""
import asyncio,importlib.util,json,sys
from pathlib import Path
from urllib.parse import unquote,urlparse,parse_qs
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('trainqa',ROOT/'scripts/qa-train.py');qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
OUT=Path('/tmp/tee-field-qa');OUT.mkdir(exist_ok=True)
SLUGS=['water-detective','energy-smart-check','waste-sort-study','micro-habitat-observer','climate-evidence-basics','design-a-better-route','one-week-impact-choice']
MISSIONS=[dict(m,zoneId=i+1) for i,m in enumerate(qa.MISSIONS)]
ZONES=[dict(id=m['zoneId'],slug='learning-'+str(m['zoneId']),name=m['zoneName'],description='Discover the systems that connect our everyday choices with a healthier planet.',icon=None,coverImage=None) for m in MISSIONS]
BADGE={'id':1,'name':'First discovery','description':'A first challenge completed and verified.'}
checks=[];errors=[]
def passport(state):
 complete=state.get('verified',[]);rows=state.get('completions',{})
 states=[{'missionId':key,'status':'verified','score':25} for key in complete]
 states.extend({'missionId':key,'status':row['status'],'score':None} for key,row in rows.items() if key not in complete)
 return dict(academicYear={'id':1,'label':'2026–2027'},totalPoints=25*len(complete),completedMissions=len(complete),currentLevel={'id':1,'name':'Seed','minPoints':0},nextLevel={'id':2,'name':'Sprout','minPoints':100},badges=[{'badge':BADGE,'earnedAt':'2026-10-30T05:00:00Z' if complete else None}],recentEvents=[{'id':1,'reason':'Verified mission','points':25,'sourceType':'mission','createdAt':'2026-10-30T05:00:00Z'}] if complete else [],missionStates=states)
async def fixture(page,state):
 async def handle(route):
  request=route.request;url=urlparse(request.url);names=unquote(url.path.split('/api/trpc/')[-1]).split(',')
  inputs=json.loads(request.post_data or '{}') if request.method=='POST' else json.loads(parse_qs(url.query).get('input',['{}'])[0]);results=[]
  for index,name in enumerate(names):
   arg=inputs.get(str(index),{}).get('json') or {}
   if name=='auth.me':data=None if state.get('guest') else dict(qa.USER,role=state.get('role','student'))
   elif name=='missions.getAll':data=[] if state.get('empty') else MISSIONS
   elif name=='missions.getBySlug':
    if state.get('mission_error'):
     await route.fulfill(status=500,content_type='application/json',body=json.dumps([{'error':{'json':{'message':'Could not load mission','code':-32603,'data':{'code':'INTERNAL_SERVER_ERROR','httpStatus':500}}}}]));return
    data=None if state.get('missing') else next((m for m in MISSIONS if m['slug']==arg.get('slug')),None)
   elif name=='passport.getMine':data=passport(state)
   elif name=='academicYears.getCurrent':data={'id':1,'label':'2026–2027'}
   elif name=='missionCompletions.getMine':
    if state.get('progress_error'):
     await route.fulfill(status=500,content_type='application/json',body=json.dumps([{'error':{'json':{'message':'Progress unavailable','code':-32603,'data':{'code':'INTERNAL_SERVER_ERROR','httpStatus':500}}}}]));return
    data=state.get('completions',{}).get(arg.get('missionId'))
   elif name=='missionCompletions.getMyList':data=list(state.get('completions',{}).values())
   elif name=='missionCompletions.start':
    row={'id':100+arg['missionId'],'missionId':arg['missionId'],'status':'in_progress'};state.setdefault('completions',{})[arg['missionId']]=row;state['started']=arg;data=row
   elif name=='missionCompletions.submit':
    if state.get('hold'):await state['hold'].wait()
    row=next(row for row in state['completions'].values() if row['id']==arg['id']);row['status']='submitted';state['submitted']=arg;data=row
   elif name=='zones.getAll':data=[] if state.get('empty') else ZONES
   elif name=='zones.getBySlug':data=next((z for z in ZONES if z['slug']==arg.get('slug')),None)
   elif name=='impact.getSchoolSummary':data=[] if state.get('empty') else [{'metricType':'water_liters','metricLabel':'Water conserved','unit':'liters','total':120},{'metricType':'recycling_kg','metricLabel':'Recycling recorded','unit':'kg','total':8}]
   elif name=='auth.updateProfile':state['profile_update']=arg;data={'success':True}
   elif name=='auth.updatePassword':state['password_update']=arg;data={'success':True}
   elif name=='auth.logout':state['guest']=True;state['logged_out']=True;data={'success':True}
   elif name=='projects.getMyProjects':data=[]
   elif name=='notifications.getUnreadCount':data={'unreadCount':0}
   else:data=[]
   results.append({'result':{'data':{'json':data}}})
  await route.fulfill(status=200,content_type='application/json',body=json.dumps(results if 'batch=1' in url.query else results[0]))
 await page.route('**/api/trpc/**',handle);page.on('pageerror',lambda error:errors.append(str(error)))
async def snapshot(page,name,width,height):
 await page.wait_for_timeout(750)
 if await page.get_by_role('button',name='Dismiss welcome').count():await page.get_by_role('button',name='Dismiss welcome').click()
 assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,width)
 assert await page.locator('.field-app').evaluate('(el)=>getComputedStyle(el).backgroundImage')=='none'
 await page.screenshot(path=str(OUT/f'{name}-{width}x{height}.png'),full_page=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  state={};c=await b.new_context();page=await c.new_page();await fixture(page,state)
  for width,height in [(1440,900),(390,844)]:
   await page.set_viewport_size({'width':width,'height':height})
   for slug in SLUGS:
    await page.goto(qa.BASE+'/missions/'+slug,wait_until='networkidle');await page.get_by_role('button',name='Accept mission',exact=True).wait_for();await snapshot(page,slug,width,height)
   for name,path in [('dashboard','/student/dashboard'),('missions','/missions'),('passport','/my-journey'),('explore','/explore'),('zone','/explore/'+ZONES[0]['slug']),('impact','/impact')]:
    await page.goto(qa.BASE+path,wait_until='networkidle');await snapshot(page,name,width,height)
  checks.append('All seven stage pages and dashboard/mission board/passport/explore/zone/impact layouts fit desktop and phone, with the shared theme and original artwork.')
  await page.goto(qa.BASE+'/missions',wait_until='networkidle');await page.get_by_role('textbox',name='Search missions').fill('water detective');assert await page.locator('.field-mission-card').count()==1
  await page.get_by_role('textbox',name='Search missions').fill('zzzznoresult');await page.get_by_role('heading',name='No matching discoveries.').wait_for();await page.get_by_role('button',name='Reset filters').click();assert await page.locator('.field-mission-card').count()==len(MISSIONS)
  checks.append('Mission search and reset filter published catalogue data without inventing missions.')
  await page.goto(qa.BASE+'/missions/'+SLUGS[0],wait_until='networkidle');await page.get_by_role('button',name='Accept mission',exact=True).click()
  submit=page.get_by_role('button',name='Submit for review',exact=True);await submit.wait_for();assert await submit.is_disabled()
  await page.get_by_label('Evidence note').fill('Observed water usage and recorded measurements.');await page.get_by_label('Reflection — what did you discover, change, or create?').fill('Small actions can conserve water.');state['hold']=asyncio.Event()
  await submit.click();await page.get_by_role('button',name='Submitting…').wait_for();assert await page.locator('#evidence').is_disabled();state['hold'].set()
  await page.get_by_text('Awaiting review',exact=True).wait_for();assert state['started']['missionId']==MISSIONS[0]['id'];assert state['submitted']['evidence']=='Observed water usage and recorded measurements.'
  await page.goto(qa.BASE+'/my-journey',wait_until='networkidle');assert await page.locator('.field-station-stamp.is-earned').count()==0
  await page.goto(qa.BASE+'/student/dashboard',wait_until='networkidle');await page.get_by_text('Awaiting teacher review',exact=True).wait_for();assert await page.locator('.field-stats article').nth(0).locator('strong').inner_text()=='0/ 7'
  checks.append('Starting/submitting preserves mutation IDs and evidence, blocks missing required evidence, shows pending state, and grants no stamp before verification.')
  state['verified']=[MISSIONS[0]['id']];state['completions'][MISSIONS[0]['id']]['status']='verified'
  await page.goto(qa.BASE+'/my-journey',wait_until='networkidle');assert await page.locator('.field-station-stamp.is-earned').count()==1;await snapshot(page,'passport-verified',390,844)
  await page.goto(qa.BASE+'/student/dashboard',wait_until='networkidle');await page.locator('.field-dashboard-hero h2').filter(has_text='Dubai').wait_for();assert await page.locator('.field-stats article').nth(1).locator('strong').inner_text()=='25'
  await page.get_by_role('button',name='School workspace',exact=True).click();await page.get_by_text('Step 1 — Select Your Teacher',exact=True).wait_for();await page.get_by_role('button',name='My journey',exact=True).click();await page.locator('.field-dashboard-hero h2').filter(has_text='Dubai').wait_for()
  checks.append('Only server-verified progress earns a stamp and 25 points; the dashboard identifies Dubai as next, and the existing teacher-assignment workspace remains reachable.')
  state['verified']=[];state['completions'][MISSIONS[0]['id']].update(status='revision_requested',teacherFeedback='Please include the measurement unit.')
  await page.goto(qa.BASE+'/missions/'+SLUGS[0],wait_until='networkidle');await page.get_by_text('Revision requested',exact=True).wait_for();await page.get_by_text('Please include the measurement unit.',exact=True).wait_for();assert await page.get_by_label('Evidence note').is_enabled();await snapshot(page,'revision',390,844)
  checks.append('Revision feedback is visible and the existing evidence resubmission form remains editable.')
  state['progress_error']=True;await page.goto(qa.BASE+'/missions/'+SLUGS[0],wait_until='networkidle');await page.get_by_role('alert').wait_for();assert await page.get_by_role('button',name='Accept mission',exact=True).is_disabled();state['progress_error']=False;await page.get_by_role('button',name='Try again').click();await page.get_by_text('Revision requested',exact=True).wait_for()
  state['missing']=True;await page.goto(qa.BASE+'/missions/missing',wait_until='networkidle');await page.get_by_text('Mission not found — it may not be published yet.',exact=True).wait_for();state['missing']=False;state['mission_error']=True
  await page.goto(qa.BASE+'/missions/'+SLUGS[0],wait_until='networkidle');await page.get_by_role('alert').wait_for();state['mission_error']=False;await page.get_by_role('button',name='Try again').click();await page.get_by_role('heading',name=MISSIONS[0]['title'],exact=True).wait_for()
  state['empty']=True;await page.goto(qa.BASE+'/missions',wait_until='networkidle');await page.get_by_role('heading',name='New challenges are on their way.').wait_for();await c.close()
  checks.append('Missing, request-error/retry and empty-catalogue states provide useful recovery without fabricated data.')
  c=await b.new_context(viewport={'width':320,'height':720},reduced_motion='reduce');page=await c.new_page();await fixture(page,{'guest':True})
  for path in ['/student/dashboard','/my-journey','/missions/'+SLUGS[0]]:
   await page.goto(qa.BASE+path,wait_until='networkidle');await snapshot(page,'guest-'+path.split('/')[1],320,720)
  assert await page.get_by_role('link',name='Sign in to start').get_attribute('href')=='/login?redirectTo=%2Fmissions%2Fwater-detective'
  assert await page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0
  checks.append('Student/guest access boundaries, sign-in return paths and reduced motion remain usable at 320px without overflow.')
  await c.close()
  c=await b.new_context(viewport={'width':320,'height':720});page=await c.new_page();await fixture(page,{})
  await page.goto(qa.BASE+'/student/dashboard',wait_until='networkidle');await snapshot(page,'dashboard',320,720)
  for link in await page.get_by_role('navigation',name='Student journey').get_by_role('link').all():
   bounds=await link.bounding_box();assert bounds['x']>=0 and bounds['x']+bounds['width']<=320,bounds
  await c.close();await b.close()
  assert not errors,errors
 (OUT/'report.json').write_text(json.dumps({'checks':checks,'page_errors':errors},indent=2));print('\n'.join('PASS '+check for check in checks))
if __name__=='__main__':asyncio.run(main())
