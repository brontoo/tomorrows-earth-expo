"""Read-only continuous-book QA and before/after benchmark. Default uses real CDN.
--local-media-root explicitly substitutes immutable reference bytes: UI/CPU evidence
only, never live CDN, physical-camera or genuine backend acceptance.
"""
import argparse, asyncio, json, os, statistics, time
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.async_api import async_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
MEDIA='https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/'
manifest=json.loads((ROOT/'media/seven-emirates/manifest.json').read_text())
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base-url',default='http://127.0.0.1:4182');p.add_argument('--local-media-root',type=Path)
p.add_argument('--timings-only',action='store_true');p.add_argument('--boundary-only',action='store_true');p.add_argument('--baseline',action='store_true');p.add_argument('--mobile',action='store_true');p.add_argument('--delay-ms',type=int,default=400)
p.add_argument('--report',type=Path,default=Path('/tmp/continuous-book-qa.json'));a=p.parse_args()
report=dict(pixelSamplingEnabled=not a.timings_only,httpCache='disabled by interception; warm figures measure decoded-cache reuse only',firstBoundaryCacheCondition='response withheld until seek in delayed fixture mode; otherwise prefetch may warm the target',scope='local immutable Full HD fixtures' if a.local_media_root else 'actual Supabase media',api='read-only guest fixtures',baseline=a.baseline,mobile=a.mobile,physicalCamera=False,delayOnFrame239Ms=a.delay_ms,checks=[],failures=[],pageErrors=[],networkFailures=[],mutations=[],latencies=[])
INSTRUMENT='''window.__probe={draw:[],hash:[],decode:[],transfer:[],clears:0,clearToDraw:[],black:[],started:null};
const probe=window.__probe;
const fetchOriginal=window.fetch;window.fetch=async(...args)=>{const start=performance.now();const r=await fetchOriginal(...args);if(String(args[0]).includes('/frames/')){const read=r.arrayBuffer.bind(r);r.arrayBuffer=async()=>{const bytes=await read();probe.transfer.push({duration:performance.now()-start,byteLength:bytes.byteLength,status:r.status,cacheControl:r.headers.get('cache-control'),cdnCache:r.headers.get('cf-cache-status')});return bytes;}}return r;};
const digest=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=async(...args)=>{const start=performance.now();const r=await digest(...args);probe.hash.push(performance.now()-start);return r;};
const decode=window.createImageBitmap;window.createImageBitmap=async(...args)=>{const start=performance.now();const r=await decode(...args);probe.decode.push(performance.now()-start);return r;};
const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){const start=performance.now();const r=draw.apply(this,args);if(this.canvas.closest('.frame-book-player')){probe.draw.push(performance.now()-start);if(probe.burstActive)probe.burstPaints=(probe.burstPaints||0)+1;if(probe.blankStart!==undefined){probe.clearToDraw.push(performance.now()-probe.blankStart);delete probe.blankStart;}}return r;};
const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.closest('.frame-book-player')){probe.clears++;probe.blankStart=performance.now();}return clear.apply(this,args);};
window.__cameraCalls=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{window.__cameraCalls++;throw Error('No physical camera in automated QA');};
window.__startBlankProbe=()=>{const canvas=document.querySelector('.frame-book-player canvas');window.__originalCanvas=canvas;probe.started=performance.now();if(!__PIXEL_SAMPLING__)return;window.__probeTimer=setInterval(()=>{const ctx=canvas.getContext('2d');const black=[[20,20],[1900,20],[20,1060],[1900,1060],[960,540]].every(([x,y])=>{const v=ctx.getImageData(x,y,1,1).data;return v[0]<2&&v[1]<2&&v[2]<2;});probe.black.push({time:performance.now(),black,frame:canvas.closest('.frame-book-player')?.dataset.frameDisplayed,connected:canvas.isConnected,visible:getComputedStyle(canvas).visibility});},16);};'''
def percentile(rows,pct):
 if not rows:return None
 return sorted(rows)[min(len(rows)-1,int((len(rows)-1)*pct))]
def summarize(rows):return dict(samples=len(rows),p50Ms=percentile(rows,.5),p95Ms=percentile(rows,.95),maxMs=max(rows) if rows else None)
async def main():
 async with async_playwright() as pw:
  options=dict(executable_path=os.getenv('PLAYWRIGHT_CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  if os.getenv('HTTPS_PROXY'):options['proxy']=dict(server=os.environ['HTTPS_PROXY'],bypass='localhost,127.0.0.1')
  browser=await pw.chromium.launch(**options)
  report["browserVersion"]=browser.version
  report["browserExecutable"]=Path(options["executable_path"]).name
  ctx=await browser.new_context(viewport=dict(width=390 if a.mobile else 1440,height=844 if a.mobile else 1050),has_touch=True,is_mobile=a.mobile,reduced_motion='reduce')
  async def reads(route):
   if route.request.method not in ('GET','HEAD','OPTIONS'):report['mutations'].append(route.request.method);await route.abort()
   else:await route.continue_()
  await ctx.route('**/*',reads)
  async def api(route):
   if route.request.method!='GET':await reads(route);return
   rows=[]
   for name in unquote(urlparse(route.request.url).path.split('/api/trpc/')[-1]).split(','):
    value=None if name=='auth.me' else dict(missionStates=[],totalPoints=0,badges=[]) if name=='passport.getMine' else []
    rows.append({'result':{'data':{'json':value}}})
   await route.fulfill(content_type='application/json',body=json.dumps(rows))
  await ctx.route('**/api/trpc/**',api)
  gate=asyncio.Event()
  if a.local_media_root:
   async def local(route):
    key=unquote(route.request.url.split(MEDIA)[1].split('?')[0]).removeprefix('7e-1bc718ef5e77/')
    target=(a.local_media_root/key).resolve()
    if a.local_media_root.resolve() not in target.parents or not target.is_file():await route.abort();return
    if key=='frames/02-DXB/f_0000.webp' and a.delay_ms:
     await gate.wait();await asyncio.sleep(a.delay_ms/1000)
    await route.fulfill(path=str(target),content_type='application/json' if target.suffix=='.json' else 'image/webp',headers={'Access-Control-Allow-Origin':'*'})
   await ctx.route(MEDIA+'**',local)
  await ctx.add_init_script(INSTRUMENT.replace('__PIXEL_SAMPLING__','false' if a.timings_only else 'true'))
  page=await ctx.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
  page.on('requestfailed',lambda r:report['networkFailures'].append(dict(url=r.url,error=r.failure)) if r.url.startswith(MEDIA) else None)
  try:
   await page.goto(a.base_url+'/eco-journey?bookDiagnostics=1',wait_until='domcontentloaded')
   if a.baseline:
    await expect(page.locator('.book-phase-cover')).to_be_visible(timeout=25000)
    report['entry']='legacy separate cover; real player not mounted'
    await page.goto(a.base_url+'/eco-journey?chapter=abu-dhabi&bookDiagnostics=1')
   else:
    await expect(page.locator('.frame-book-player')).to_have_attribute('data-frame-displayed','0',timeout=45000)
    await expect(page.locator('.book-phase-cover,.book-contents,.book-webgl')).to_have_count(0)
    await expect(page.get_by_role('heading',name='The Seven Emirates',exact=True)).to_be_visible()
    await expect(page.locator('.book-gesture-controls')).to_have_attribute('data-camera-status','off')
    await expect(page.locator('.book-gesture-controls')).to_have_attribute('data-model-sha256','97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482')
    report['entry']='original frame 0, no legacy cover or mandatory Contents, pinned B, camera off'
   player=page.locator('.frame-book-player');slider=page.get_by_role('slider',name='Book frame')
   async def seek(index,label='seek'):
    start=time.perf_counter()
    await slider.evaluate("(el,n)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(n));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}",index)
    await expect(player).to_have_attribute('data-frame-displayed',str(index),timeout=45000)
    report['latencies'].append(dict(frame=index,kind=label,duration=(time.perf_counter()-start)*1000))
   if a.baseline:await expect(player).to_have_attribute('data-frame-displayed','238',timeout=45000)
   await seek(238,'cold-position')
   await page.evaluate('window.__startBlankProbe()')
   gate.set()
   scheduler=await player.get_attribute('data-scheduler-id')
   await seek(239,'cold-boundary')
   for _ in range(6):await seek(238,'warm-decoded');await seek(239,'warm-decoded')
   report['commonScenario']=await page.evaluate('JSON.parse(JSON.stringify(window.__probe))')
   if not a.baseline and not a.boundary_only:
    for c in manifest['chapters'][1:]:
     edge=c['startInclusive'];await seek(edge-1,'boundary-setup')
     canvas=player.locator('canvas');await canvas.focus();await canvas.press('ArrowRight')
     await expect(player).to_have_attribute('data-frame-displayed',str(edge),timeout=45000)
     await canvas.press('ArrowLeft');await expect(player).to_have_attribute('data-frame-displayed',str(edge-1),timeout=45000)
    report['checks'].append('All six boundaries both directions, keyboard and slider; one continuous timeline')
    await page.get_by_role('button',name='Fujairah',exact=True).click();await expect(player).to_have_attribute('data-frame-displayed','1672',timeout=45000)
    await expect(page.get_by_role('heading',name='Fujairah',exact=True)).to_be_visible()
    await seek(230);canvas=player.locator('canvas');await canvas.scroll_into_view_if_needed();box=await canvas.bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.5
    assert await canvas.evaluate('(el)=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el}')
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-box['width']*.35,y,steps=8);await page.mouse.up()
    await page.wait_for_function("Number(document.querySelector('.frame-book-player').dataset.frameDisplayed)>238")
    await seek(469);box=await canvas.bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.5
    cdp=await ctx.new_cdp_session(page);await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-box['width']*.35,'y':y}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    await page.wait_for_function("Number(document.querySelector('.frame-book-player').dataset.frameDisplayed)>478")
    report['checks'].append('Unobscured canvas, chapter jump, mouse and native touch navigation')
    paints=await page.evaluate('window.__probe.draw.length')
    await slider.evaluate('''async el=>{window.__probe.burstActive=true;window.__probe.burstStarted=performance.now();const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const direction of [1,-1]){for(let step=0;step<=70;step++){set.call(el,String(direction===1?Math.min(1672,step*24):Math.max(0,1672-step*24)));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>requestAnimationFrame(r));}}window.__probe.burstActive=false;window.__probe.burstDuration=performance.now()-window.__probe.burstStarted;}''')
    await expect(player).to_have_attribute('data-frame-displayed','0',timeout=45000)
    report['continuousBurstPaints']=await page.evaluate('window.__probe.burstPaints||0')
    report['continuousBurstDurationMs']=await page.evaluate('window.__probe.burstDuration')
    assert report['continuousBurstPaints']>=4,'Continuous scrubbing only painted after input stopped'
    report['checks'].append('Continuous RAF input burst forward/reverse through the full timeline paints during input and settles at frame 0')
    assert await player.get_attribute('data-scheduler-id')==scheduler
    assert await page.evaluate("document.querySelector('.frame-book-player canvas')===window.__originalCanvas")
    assert await page.evaluate('window.__cameraCalls')==0
    await expect(page.locator('.book-earned-achievement')).to_have_count(0)
    report['checks'].append('Canvas/scheduler identity unchanged; no camera request or earned stamp from navigation')
   await page.evaluate('clearInterval(window.__probeTimer)')
   probe=await page.evaluate('window.__probe');samples=probe.pop('black');report['blankSamples']=None if a.timings_only else sum(v['black'] or not v['connected'] or v['visible']=='hidden' for v in samples);report['sampleCount']=len(samples)
   durations=[];start=None
   for row in samples:
    if row['black'] and start is None:start=row['time']
    elif not row['black'] and start is not None:durations.append(row['time']-start);start=None
   report['observedBlackIntervalsMs']=durations
   report['canvasClearCalls']=probe['clears'];report['clearToNextDrawMs']=probe['clearToDraw']
   report['timings']={k:summarize(probe[k]) for k in ('draw','hash','decode')}
   report['timings']['transfer']=summarize([r['duration'] for r in probe['transfer']]);report['transferBytes']=sum(r['byteLength'] for r in probe['transfer']);report['transfers']=len(probe['transfer'])
   report['timings']['coldBoundary']=summarize([r['duration'] for r in report['latencies'] if r['kind']=='cold-boundary'])
   report['timings']['warmDecodedSeek']=summarize([r['duration'] for r in report['latencies'] if r['kind']=='warm-decoded'])
   report['commonScenario'].pop('black',None)
   report['diagnostics']=await page.evaluate('window.__sevenEmiratesDiagnostics?.snapshot()??null')
   if not a.baseline:assert (a.timings_only or report['blankSamples']==0) and probe['clears']==0
   await page.screenshot(path=str(a.report.with_suffix('.png')),full_page=True)
  except Exception as e:report['failures'].append(str(e));await page.screenshot(path=str(a.report.with_suffix('.png')),full_page=True)
  finally:await browser.close()
 a.report.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({k:v for k,v in report.items() if k not in ('diagnostics','latencies','networkFailures')},indent=2))
 if report['failures'] or report['pageErrors'] or report['mutations']:raise SystemExit(1)
asyncio.run(main())
