"""Isolated book QA. --fixtures-root explicitly simulates media/SDK; never remote acceptance.
Run the preview with all four VITE_BOOK_* settings from docs/seven-emirates-gestures.md.
API authentication/progress is always fixture data; never invokes a reward mutation.
"""
import argparse
import json
import os
from pathlib import Path
import re
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright, expect

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base-url', default='http://127.0.0.1:4174')
p.add_argument('--fixtures-root', type=Path)
p.add_argument('--report', type=Path, default=Path('/tmp/seven-emirates-gesture-qa.json'))
a=p.parse_args()
ROOT=Path(__file__).resolve().parents[1]
HOST='https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/'
bindings=re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*missionSlug:\s*"([^"]+)"',(ROOT/'client/src/components/book/chapters.ts').read_text())
missions=[dict(id=i+1,slug=c[2],title=c[1]) for i,c in enumerate(bindings)]
report=dict(remoteVerified=False, simulatedMedia=bool(a.fixtures_root), simulatedSDK=bool(a.fixtures_root), checks=[], pageErrors=[])
def passed(name):
    report['checks'].append(name); print('PASS '+name,flush=True)
def api(route):
    rows=[]
    for name in unquote(urlparse(route.request.url).path.split('/api/trpc/')[-1]).split(','):
        if name=='auth.me': value=dict(id=9101,email='gesture-qa@example.invalid',name='Gesture QA',role='student',openId='gesture-qa')
        elif name=='missions.getAll': value=missions
        elif name=='passport.getMine': value=dict(missionStates=[],totalPoints=0,badges=[])
        elif name in ('projects.getStats','teacher.getAnalytics'): value=dict(totalProjects=0,totalStudents=0,totalVotes=0)
        else: value=[]
        rows.append({'result':{'data':{'json':value}}})
    route.fulfill(status=200,content_type='application/json',body=json.dumps(rows))
SIMULATED_SDK='''export class FilesetResolver { static async forVisionTasks(){return {}} }
export class GestureRecognizer { static async createFromOptions(){window.__models=(window.__models||0)+1;return {recognizeForVideo(){return window.__sample||{}},close(){window.__closed=(window.__closed||0)+1}}} }'''
SIMULATED_CAMERA='''window.__cameraCalls=0;window.__stopped=0;
window.__deny=false;
navigator.mediaDevices.getUserMedia=async()=>{window.__cameraCalls++;if(window.__deny)throw new DOMException('denied','NotAllowedError');
const stream=document.createElement('canvas').captureStream(24);for(const t of stream.getTracks()){const stop=t.stop.bind(t);t.stop=()=>{window.__stopped++;stop()};}return stream;};
HTMLMediaElement.prototype.play=async function(){};HTMLMediaElement.prototype.pause=function(){};
Object.defineProperty(HTMLMediaElement.prototype,'readyState',{get:()=>2});
Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{get:()=>performance.now()/1000,set:()=>{}});
window.__pose=(kind,x=.5,pinch=false)=>{const h=Array.from({length:21},()=>({x,y:.6,z:0}));h[0].y=.91;h[9].y=.65;h[5].y=.67;h[17].y=.69;h[4]={x:x-.2,y:.5};h[8]={x,y:.27};if(pinch)h[4]={x:x+.01,y:.27};window.__sample={landmarks:[h],gestures:[[{categoryName:kind,score:.9}]]};};'''
with sync_playwright() as pw:
    launch=dict(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    if os.environ.get('HTTPS_PROXY'): launch['proxy']=dict(server=os.environ['HTTPS_PROXY'],bypass='127.0.0.1,localhost')
    browser=pw.chromium.launch(**launch)
    context=browser.new_context(viewport=dict(width=1440,height=1100))
    page=context.new_page();page.route('**/api/trpc/**',api)
    page.on('pageerror',lambda error:report['pageErrors'].append(str(error)))
    if a.fixtures_root:
        def media(route):
            key=unquote(route.request.url.split(HOST,1)[1].split('?',1)[0])
            key=key.removeprefix('7e-1bc718ef5e77/')
            path=(a.fixtures_root/key).resolve()
            if a.fixtures_root.resolve() not in path.parents or not path.is_file(): route.abort(); return
            route.fulfill(path=str(path),content_type='application/json' if path.suffix=='.json' else 'image/webp',headers={'Access-Control-Allow-Origin':'*'})
        page.route(HOST+'**',media)
        page.route('**/*@mediapipe_tasks-vision*',lambda route:route.fulfill(content_type='text/javascript',body=SIMULATED_SDK))
        page.add_init_script(SIMULATED_CAMERA)
    page.goto(a.base_url+'/eco-journey?chapter=abu-dhabi')
    try:
        expect(page.locator('.frame-book-player')).to_be_visible(timeout=30000)
        page.wait_for_function("document.querySelector('.frame-book-player')?.dataset.frameDisplayed !== ''")
    except Exception as error:
        report['livePreview']='blocked: actual remote manifest/frame could not load; no local media substitution in this mode'
        report['failure']=str(error).splitlines()[0]
        page.screenshot(path='/tmp/seven-emirates-remote-blocked.png')
    else:
        report['livePreview']='local fixtures only' if a.fixtures_root else 'actual hosted manifest/frame decoded in the app'
        report['remoteVerified']=not bool(a.fixtures_root)
        passed('Frame player rendered a native Full HD frame')
        if a.fixtures_root:
            expect(page.get_by_role('button',name='Enable Hand Controls')).to_be_visible()
            page.locator('.frame-book-player canvas').focus()
            page.locator('.frame-book-player canvas').press('Home')
            assert page.evaluate('window.__cameraCalls')==0
            passed('No camera request on book mount')
            page.get_by_role('button',name='Enable Hand Controls').click()
            expect(page.get_by_role('button',name='Disable Camera')).to_be_visible()
            page.wait_for_function('window.__models === 1 && window.__cameraCalls === 1')
            page.wait_for_timeout(750) # settle physical-input handover, not a performance measurement
            page.evaluate("window.__pose('Closed_Fist',.5)")
            page.wait_for_timeout(250)
            start=int(page.locator('.frame-book-player').get_attribute('data-frame-requested'))
            page.evaluate("window.__pose('Closed_Fist',1)")
            page.wait_for_timeout(700)
            advanced=int(page.locator('.frame-book-player').get_attribute('data-frame-requested'))
            assert start < advanced <= 238,(start,advanced)
            assert page.locator('.book-edge-tabs button:disabled').count()==6
            passed('Simulated fist advances and cannot cross the first locked boundary')
            # Physical mouse takeover must stop the ongoing simulated fist.
            box=page.locator('.frame-book-player canvas').bounding_box()
            x=box['x']+box['width']*.4; y=box['y']+box['height']*.5
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+200,y,steps=5);page.mouse.up()
            assert int(page.locator('.frame-book-player').get_attribute('data-frame-requested')) < 238
            passed('Mouse drag overrides an ongoing fist without a competing seek')
            page.evaluate("window.__sample={}")
            expect(page.locator('.book-gesture-pointer')).to_have_count(0)
            frame=page.locator('.frame-book-player canvas')
            frame.focus();frame.press('Home')
            expect(page.locator('.frame-book-player')).to_have_attribute('data-frame-requested','0')
            frame.press('ArrowRight')
            expect(page.locator('.frame-book-player')).to_have_attribute('data-frame-requested','1')
            slider=page.get_by_role('slider',name='Book frame')
            slider.focus();slider.press('End')
            expect(page.locator('.frame-book-player')).to_have_attribute('data-frame-requested','238')
            passed('Keyboard and frame slider retain control while hand mode is enabled')
            # Native browser touch events exercise React Pointer Events and capture.
            cdp=context.new_cdp_session(page)
            cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True})
            box=frame.bounding_box();x=box['x']+box['width']*.4;y=box['y']+box['height']*.5
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+150,'y':y}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            assert int(page.locator('.frame-book-player').get_attribute('data-frame-requested')) < 238
            passed('Native touch drag retains proportional reverse scrubbing')
            page.wait_for_timeout(750)
            page.evaluate("window.__pose('Pointing_Up',.5)")
            expect(page.locator('.book-gesture-pointer')).to_be_visible()
            page.evaluate('window.__sample={}')
            expect(page.locator('.book-gesture-pointer')).to_have_count(0)
            passed('Pointer appears on pointing and hides on tracking loss')
            # Aim through original normalized landmark mapping at an opted-in React control.
            page.evaluate("""() => {
              window.__virtualClicks=0;
              document.querySelector('.travel-book').addEventListener('click',e=>{
                if(!e.isTrusted && e.target.closest('[data-book-gesture]')) window.__virtualClicks++;
              },true);
              window.__aim=(pinch)=>{
                const root=document.querySelector('.travel-book').getBoundingClientRect();
                const target=[...document.querySelectorAll('[data-book-gesture=spread]')].find(e=>e.textContent.includes('My travel stamps')).getBoundingClientRect();
                const left=Math.max(0,root.left),top=Math.max(0,root.top);
                const width=Math.min(innerWidth,root.right)-left,height=Math.min(innerHeight,root.bottom)-top;
                const x=.9-.8*(target.x+target.width/2-left)/width;
                const y=.1+.8*(target.y+target.height/2-top)/height;
                window.__pose('Pointing_Up',x,pinch);window.__sample.landmarks[0][8].y=y;
                if(pinch)window.__sample.landmarks[0][4]={x:x+.01,y};
              };
              window.__aim(false);
            }""")
            page.wait_for_timeout(500)
            page.evaluate('window.__aim(true)')
            expect(page.locator('.book-collection')).to_be_visible(timeout=20000)
            page.wait_for_timeout(700)
            assert page.evaluate('window.__virtualClicks')==1
            assert page.locator('.book-stamp.is-collected').count()==0
            passed('Stable pinch invokes one scoped React selection and navigation awards no stamps')
            page.evaluate('window.__sample={}')
            page.screenshot(path='/tmp/seven-emirates-gesture-controls.png')
            page.get_by_role('button',name='Disable Camera').click()
            assert page.evaluate('window.__stopped')==1
            page.evaluate('window.__deny=true')
            page.get_by_role('button',name='Enable Hand Controls').click()
            expect(page.get_by_role('status').filter(has_text='permission denied')).to_be_visible()
            passed('Camera permission denial is recoverable')
            page.evaluate('window.__deny=false')
            page.get_by_role('button',name='Enable Hand Controls').click()
            page.wait_for_function('window.__cameraCalls === 3')
            page.locator('.book-header .book-expo-link').click()
            expect(page.locator('.book-gesture-controls')).to_have_count(0)
            assert page.evaluate('window.__stopped')==2
            assert page.evaluate('window.__closed')==3
            passed('Route navigation releases every camera track and recognizer')
            calls=page.evaluate('window.__cameraCalls')
            page.goto(a.base_url+'/innovation-hub')
            expect(page.locator('.book-gesture-controls')).to_have_count(0)
            assert page.evaluate('window.__cameraCalls')==0
            passed('Projects page mounts no book gesture UI or camera')
    browser.close()
a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if report['pageErrors']:raise SystemExit('Browser page errors occurred')
if not report['checks']:raise SystemExit('Live preview blocked; see report. No remote acceptance claimed.')
