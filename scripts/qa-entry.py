"""Entrance redesign QA. Real pages/artwork; explicit auth fixtures, no real accounts.
Run against pnpm dev. Screenshots/report: /tmp/tee-entry-qa.
"""
import asyncio,json
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.async_api import async_playwright
OUT=Path('/tmp/tee-entry-qa');OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:3000'
USER={'id':9102,'email':'explorer@example.com','role':'student','name':'Explorer','openId':'entry-qa'}
checks=[];errors=[]
async def fixture(page,state):
 async def handle(route):
  names=unquote(urlparse(route.request.url).path.split('/api/trpc/')[-1]).split(',');results=[]
  for name in names:
   if name=='auth.me':data=USER if state.get('signed_in') else None
   elif name=='auth.loginWithEmail':
    state['credentials']=json.loads(route.request.post_data)['0']['json']
    if state.get('hold'):await state['hold'].wait()
    if state.get('fail'):
     await route.fulfill(status=401,content_type='application/json',body=json.dumps([{'error':{'json':{'message':'Invalid email or password','code':-32001,'data':{'code':'UNAUTHORIZED','httpStatus':401}}}}]));return
    if state.get('legacy'):
     await route.fulfill(status=400,content_type='application/json',body=json.dumps([{'error':{'json':{'message':'Legacy account','code':-32000,'data':{'code':'BAD_REQUEST','httpStatus':400}}}}]));return
    state['signed_in']=True;data={'user':USER}
   elif name=='auth.syncUser':state['synced']=True;state['signed_in']=True;data={'user':USER}
   elif name=='missions.getAll':data=[]
   else:data=None
   results.append({'result':{'data':{'json':data}}})
  await route.fulfill(status=200,content_type='application/json',body=json.dumps(results))
 async def token(route):
  state['legacy_attempted']=True
  if state.get('legacy'):
   await route.fulfill(status=200,content_type='application/json',body=json.dumps({'access_token':'fixture-access-token','refresh_token':'fixture-refresh','expires_in':3600,'token_type':'bearer','user':{'id':'entry-legacy','email':USER['email'],'user_metadata':{'full_name':'Explorer'}}}))
  else:await route.fulfill(status=400,content_type='application/json',body=json.dumps({'error':'invalid_grant','error_description':'Invalid login credentials'}))
 await page.route('**/api/trpc/**',handle)
 await page.route('**/auth/v1/token*',token)
 page.on('pageerror',lambda error:errors.append(str(error)))
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=await browser.new_context();page=await context.new_page();await fixture(page,{})
  for width,height in [(1440,900),(1366,768),(1024,768),(768,1024),(390,844),(320,720),(844,390)]:
   await page.set_viewport_size({'width':width,'height':height})
   for name,url in [('gate','/'),('login','/login?redirectTo=%2Feco-journey')]:
    await page.goto(BASE+url,wait_until='networkidle');await page.wait_for_timeout(1400)
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,width)
    assert await page.locator('h1').count()==1
    assert await page.locator('.entry-scene-art').evaluate('(el)=>el.complete&&el.naturalWidth===2752')
    if name=='login' and width==390:
     bounds=await page.get_by_role('button',name='Sign in & continue').bounding_box();assert bounds['y']+bounds['height']<height,bounds
    await page.screenshot(path=str(OUT/f'{name}-{width}x{height}.png'),full_page=True)
  checks.append('Both pages fit seven viewport sizes (320–1440px), with loaded original artwork; mobile login submit appears in the initial viewport.')
  await page.set_viewport_size({'width':1440,'height':900});await page.goto(BASE+'/',wait_until='networkidle')
  for heading,destination in [('Take the Eco Train','/eco-journey'),('Explore the Expo','/dashboard')]:
   link=page.get_by_role('link').filter(has=page.get_by_role('heading',name=heading));await link.focus();await page.keyboard.press('Enter')
   assert f'redirectTo={"%2Feco-journey" if destination=="/eco-journey" else "%2Fdashboard"}' in page.url
   await page.get_by_text('The Eco Train Journey' if destination=='/eco-journey' else 'The Expo Platform',exact=True).wait_for()
   await page.get_by_role('link',name='Change your experience').click()
  checks.append('Keyboard choices preserve Eco Train/Expo destinations and can return to choose another experience.')
  await context.close()
  for destination in ['/eco-journey','/dashboard','/missions/water-detective']:
   state={'hold':asyncio.Event()};context=await browser.new_context();page=await context.new_page();await fixture(page,state)
   # Navigation target sentinel avoids exercising unrelated dashboard/mission pages.
   async def target(route):await route.fulfill(status=200,content_type='text/html',body='<h1>Destination reached</h1>')
   await page.route(BASE+destination,target)
   await page.goto(BASE+'/login?redirectTo='+destination,wait_until='networkidle')
   await page.get_by_label('Email address').fill('EXPLORER@example.com');await page.get_by_label('Password',exact=True).fill('fixture-password')
   await page.get_by_role('button',name='Show password').click();assert await page.locator('#password').get_attribute('type')=='text'
   await page.get_by_role('button',name='Hide password').click();assert await page.locator('#password').get_attribute('type')=='password'
   await page.get_by_role('button',name='Sign in & continue').click();await page.get_by_role('status').filter(has_text='Signing in').wait_for()
   assert await page.locator('#email').is_disabled();assert await page.locator('#password').is_disabled()
   state['hold'].set();await page.wait_for_url(BASE+destination)
   assert state['credentials']['email']=='explorer@example.com'
   assert await page.evaluate("JSON.parse(localStorage.getItem('mock-user')).role")=='student'
   await context.close()
  checks.append('Login keeps local auth and normalized email, password reveal, pending state, and all three destination redirects.')
  context=await browser.new_context();page=await context.new_page();state={'fail':True};await fixture(page,state)
  await page.goto(BASE+'/login',wait_until='networkidle');await page.get_by_label('Email address').fill(USER['email']);await page.get_by_label('Password',exact=True).fill('fixture-wrong')
  await page.get_by_role('button',name='Sign in & continue').click();await page.get_by_role('alert').wait_for();assert 'Invalid email or password' in await page.get_by_role('alert').inner_text()
  assert state.get('legacy_attempted');assert await page.locator('#email').is_enabled();await page.screenshot(path=str(OUT/'login-error.png'),full_page=True);await context.close()
  checks.append('Rejected login retains the form, announces the error, and re-enables input; legacy Supabase fallback is still invoked.')
  context=await browser.new_context(reduced_motion='reduce');page=await context.new_page();await fixture(page,{})
  await page.goto(BASE+'/',wait_until='networkidle');assert await page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0
  await page.goto(BASE+'/login?redirectTo=https://example.com',wait_until='networkidle');await page.get_by_text('The Eco Train Journey',exact=True).wait_for()
  await page.get_by_role('link',name='Create an account').click();assert urlparse(page.url).path=='/signup';await context.close()
  checks.append('Reduced motion is static; external redirects fall back to Eco Train; account creation remains reachable.')
  assert not errors,errors
  await browser.close()
 (OUT/'report.json').write_text(json.dumps({'checks':checks,'page_errors':errors},indent=2));print('\n'.join('PASS '+x for x in checks))
if __name__=='__main__':asyncio.run(main())
