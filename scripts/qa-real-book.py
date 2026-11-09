"""Independent local-browser acceptance: actual hosted media and actual MediaPipe.
No media/SDK/model interception, camera frames, synthetic video, or storage writes.
Only authentication/progress API responses are controlled read-only QA fixtures.
Requires the Vite DEVELOPMENT preview with the documented four VITE_BOOK_* flags.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import statistics
import time
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
MEDIA = 'https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/7e-1bc718ef5e77/'
MODEL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'
WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm/'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', default='http://127.0.0.1:4174')
parser.add_argument('--channel', choices=['chrome', 'msedge'])
parser.add_argument('--report', type=Path, default=Path('artifacts/real-book-acceptance.json'))
args = parser.parse_args()
if urlparse(args.base_url).hostname not in ('localhost', '127.0.0.1'):
    raise SystemExit('Use the isolated localhost development preview, never production.')
expected_raw = (ROOT / 'media/seven-emirates/manifest.json').read_bytes()
expected_manifest = json.loads(expected_raw)
expected_sha = hashlib.sha256(expected_raw).hexdigest()
bindings = re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*missionSlug:\s*"([^"]+)"',
                      (ROOT / 'client/src/components/book/chapters.ts').read_text())
state = {'verified': []}
report = dict(remoteVerified=False, modelInitialized=False, physicalCameraVerified=False,
              syntheticVideoUsed=False, mediaOrModelMocked=False, authAndProgressFixtures=True,
              checks=[], failures=[], networkFailures=[], timings={}, chapterRanges=[], resources=[])

def failure_text(error):
    return (str(error).strip().splitlines() or [type(error).__name__])[0]

def passed(message):
    report['checks'].append(message)
    print('PASS ' + message, flush=True)

def api(route):
    if route.request.method not in ('GET', 'OPTIONS'):
        route.abort()
        raise AssertionError('Acceptance must not send API mutations')
    rows = []
    for name in unquote(urlparse(route.request.url).path.split('/api/trpc/')[-1]).split(','):
        if name == 'auth.me':
            value = dict(id=9101, email='real-book-qa@example.invalid', name='Browser QA', role='student', openId='browser-qa')
        elif name == 'missions.getAll':
            value = [dict(id=i+1, slug=c[2], title=c[1]) for i, c in enumerate(bindings)]
        elif name == 'passport.getMine':
            value = dict(missionStates=[dict(missionId=i, status='verified') for i in state['verified']],
                         totalPoints=25*len(state['verified']), badges=[])
        elif name in ('projects.getStats', 'teacher.getAnalytics'):
            value = dict(totalProjects=0, totalStudents=0, totalVotes=0)
        else:
            value = []
        rows.append({'result': {'data': {'json': value}}})
    route.fulfill(content_type='application/json', body=json.dumps(rows))

MODEL_PAGE = '''<!doctype html><meta charset="utf-8"><title>Real MediaPipe acceptance</title>
<button id="verify">Verify actual hand model (no camera)</button><output id="status">Not started</output>
<script type="module">
import {createBookRecognizer,HAND_RESOURCES} from '/src/components/book/gestures/HandTrackingRuntime.ts';
window.__resources=HAND_RESOURCES;window.__cameraCalls=0;
if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraCalls++;throw Error('Unexpected camera request in model-only acceptance')};
document.querySelector('#verify').onclick=async()=>{
 const start=performance.now();window.__modelResult=null;
 let recognizer;
 try {recognizer=await createBookRecognizer();window.__modelResult={passed:true,elapsedMs:performance.now()-start};}
 catch(error){window.__modelResult={passed:false,elapsedMs:performance.now()-start,error:String(error).slice(0,500)};}
 finally{try{recognizer?.close();window.__modelResult.closed=!!recognizer;}catch(error){window.__modelResult.passed=false;window.__modelResult.error='Recognizer cleanup failed';}document.querySelector('#status').textContent=JSON.stringify(window.__modelResult);}
};
</script>'''

with sync_playwright() as pw:
    launch = dict(headless=True, args=[])
    if os.name != 'nt' and Path('/.dockerenv').exists():
        launch['args'] = ['--no-sandbox', '--enable-unsafe-swiftshader']
    if args.channel:
        launch['channel'] = args.channel
    elif os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'):
        launch['executable_path'] = os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
    elif Path('/usr/bin/chromium').exists():
        launch['executable_path'] = '/usr/bin/chromium'
    if os.environ.get('HTTPS_PROXY'):
        launch['proxy'] = dict(server=os.environ['HTTPS_PROXY'], bypass='localhost,127.0.0.1')
    browser = pw.chromium.launch(**launch)
    context = browser.new_context(viewport=dict(width=1440, height=1000), reduced_motion='reduce')
    context.route('**/api/trpc/**', api)
    context.add_init_script('''window.__cameraCalls=0;window.__initialFrameAt=null;
new MutationObserver(()=>{const f=document.querySelector('.frame-book-player')?.dataset.frameDisplayed;
if(window.__initialFrameAt===null&&f!==undefined&&f!==''&&Number.isInteger(Number(f)))window.__initialFrameAt=performance.now();
}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-frame-displayed']});
if(navigator.mediaDevices){const native=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
navigator.mediaDevices.getUserMedia=(...args)=>{window.__cameraCalls++;return native(...args)};}''')
    page = context.new_page()
    requests = []
    page.on('request', lambda r: requests.append(r.url))
    page.on('requestfailed', lambda r: report['networkFailures'].append(dict(url=r.url, error=r.failure))
            if r.url.startswith((MEDIA, MODEL, WASM)) else None)
    page.on('pageerror', lambda error: report['failures'].append('Browser: '+str(error)))
    try:
        page.goto(args.base_url+'/innovation-hub', wait_until='domcontentloaded')
        page.wait_for_timeout(500)
        assert page.evaluate('window.__cameraCalls') == 0
        assert not any(url.startswith((MEDIA, MODEL, WASM)) or urlparse(url).path.startswith('/book/') for url in requests)
        assert page.locator('.book-gesture-controls').count() == 0
        passed('Projects initializes no camera, book media or recognizer')
        page.goto(args.base_url+'/eco-journey?chapter=abu-dhabi', wait_until='domcontentloaded')
        start = time.perf_counter()
        data = page.evaluate('''async url=>{
          const response=await fetch(url,{credentials:'omit'});if(!response.ok)throw Error('Manifest HTTP '+response.status);
          if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Manifest MIME mismatch');
          const bytes=await response.arrayBuffer();
          const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
          return {sha,manifest:JSON.parse(new TextDecoder().decode(bytes))};
        }''', MEDIA+'manifest.json')
        assert data['sha'] == expected_sha
        manifest = data['manifest']
        assert manifest['frameCount'] == 1673 and len(manifest['frames']) == 1673
        cursor = 0
        for index, chapter in enumerate(manifest['chapters']):
            assert chapter['chapterId'] == bindings[index][0] and chapter['startInclusive'] == cursor
            assert chapter['startInclusive'] <= chapter['restingFrame'] < chapter['endExclusive']
            cursor = chapter['endExclusive']
            report['chapterRanges'].append({k: chapter[k] for k in ('chapterId', 'startInclusive', 'endExclusive', 'restingFrame')})
        assert cursor == 1673 and len(report['chapterRanges']) == 7
        report['manifestSha256'] = data['sha']
        report['timings']['manifestFetchAndValidationMs'] = round((time.perf_counter()-start)*1000, 1)
        samples = [i for c in manifest['chapters'] for i in (c['startInclusive'], c['endExclusive']-1)]
        report['samples'] = page.evaluate('''async ({base,frames,indices})=>{
          const results=[];
          for(const index of indices){const f=frames[index],start=performance.now();
            const response=await fetch(new URL(f.url,base),{credentials:'omit'});
            if(!response.ok||!response.headers.get('content-type')?.startsWith('image/webp'))throw Error('Frame HTTP/MIME '+index);
            const bytes=await response.arrayBuffer();const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
            if(sha!==f.sha256||bytes.byteLength!==f.byteLength)throw Error('Frame integrity '+index);
            const bitmap=await createImageBitmap(new Blob([bytes]));
            try{if(bitmap.width!==1920||bitmap.height!==1080)throw Error('Frame dimensions '+index);}
            finally{bitmap.close();}
            results.push({index,sha256:sha,byteLength:bytes.byteLength,elapsedMs:performance.now()-start});
          }return results;
        }''', dict(base=MEDIA, frames=manifest['frames'], indices=samples))
        passed('Actual public manifest and all 14 chapter edge frames pass CORS, MIME, SHA, size and Full HD decoding')
        player = page.locator('.frame-book-player')
        expect(player).to_have_attribute('data-frame-displayed', '238', timeout=45000)
        report['timings']['initialAppFrameMs'] = round(page.evaluate('window.__initialFrameAt'), 1)
        report['timings']['boundaryCacheCondition'] = 'after explicit edge-frame fetches; browser cache may be warm'
        assert page.evaluate('window.__cameraCalls') == 0
        assert not any(url.startswith((MODEL,WASM)) for url in requests)
        canvas = player.locator('canvas')
        canvas.focus(); canvas.press('ArrowRight')
        expect(player).to_have_attribute('data-frame-displayed','238')
        expect(page.locator('.book-edge-tabs button:disabled')).to_have_count(6)
        canvas.press('Home'); expect(player).to_have_attribute('data-frame-displayed','0')
        page.wait_for_timeout(500); expect(player).to_have_attribute('data-frame-displayed','0')
        passed('Locked chapters cannot be crossed; camera is lazy and there is no autoplay')
        # Controlled progress fixture only: no missions are completed on a real server.
        state['verified'] = list(range(1,8))
        page.evaluate('(ids)=>localStorage.setItem("sevenEmiratesBook:v1:9101",JSON.stringify({chapter:0,seenStamps:ids}))', [c[0] for c in bindings])
        page.reload(wait_until='domcontentloaded')
        expect(page.locator('.book-phase-ready')).to_be_visible(timeout=45000)
        timings = []
        for index, chapter in enumerate(manifest['chapters']):
            page.goto(args.base_url+'/eco-journey?chapter='+chapter['chapterId'],wait_until='domcontentloaded')
            expect(player).to_have_attribute('data-frame-displayed',str(chapter['restingFrame']),timeout=45000)
            expect(page.get_by_role('heading',name=bindings[index][1],exact=True)).to_be_visible()
        passed('All seven educational deep links display their exact live resting frames')
        for index, following in enumerate(manifest['chapters'][1:],1):
            edge = following['startInclusive']
            slider = page.get_by_role('slider',name='Book frame')
            slider.evaluate('''(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));
              el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}''',edge-1)
            expect(player).to_have_attribute('data-frame-displayed',str(edge-1),timeout=45000)
            expect(page.get_by_role('heading',name=bindings[index-1][1],exact=True)).to_be_visible()
            for key, target, name in [('ArrowRight',edge,bindings[index][1]),('ArrowLeft',edge-1,bindings[index-1][1])]:
                canvas=player.locator('canvas');canvas.focus();start=time.perf_counter();canvas.press(key)
                expect(player).to_have_attribute('data-frame-displayed',str(target),timeout=45000)
                expect(page.get_by_role('heading',name=name,exact=True)).to_be_visible()
                timings.append(round((time.perf_counter()-start)*1000,1))
        report['timings']['boundaryKeyToDisplayedMs'] = timings
        report['timings']['boundaryMedianMs'] = round(statistics.median(timings),1)
        report['timings']['boundaryMaxMs'] = max(timings)
        passed('All six live chapter boundaries stay synchronized in both directions')
        report['remoteVerified'] = True
    except Exception as error:
        report['failures'].append('Live media/app: '+failure_text(error))
    # Separate real model initialization from media reachability; never mock the model/SDK.
    model_page = context.new_page()
    model_responses = []
    model_page.on('pageerror',lambda error:report['failures'].append('Model browser: '+str(error)))
    model_page.on('response',lambda response:model_responses.append(response) if response.url.startswith((MODEL,WASM)) else None)
    model_page.on('requestfailed',lambda r:report['networkFailures'].append(dict(url=r.url,error=r.failure)) if r.url.startswith((MODEL,WASM)) else None)
    model_page.route(args.base_url+'/__gesture_model_acceptance__',lambda route:route.fulfill(content_type='text/html',body=MODEL_PAGE))
    try:
        model_page.goto(args.base_url+'/__gesture_model_acceptance__')
        model_page.wait_for_function('window.__resources?.sdkVersion === "1.2.2"')
        assert model_page.evaluate('window.__resources.model') == MODEL
        assert not model_responses
        attempts = []
        for _ in range(2):
            model_page.locator('#verify').click()
            model_page.wait_for_function('window.__modelResult !== null',timeout=120000)
            result = model_page.evaluate('window.__modelResult')
            attempts.append(result)
            if not result['passed']: break
        report['modelAttempts'] = attempts
        report['modelInitialized'] = len(attempts)==2 and all(r['passed'] and r.get('closed') for r in attempts)
        assert model_page.evaluate('window.__cameraCalls') == 0
        for response in model_responses:
            record = dict(url=response.url,status=response.status,contentType=response.headers.get('content-type'))
            if response.ok:
                body = response.body();record.update(byteLength=len(body),sha256=hashlib.sha256(body).hexdigest())
                if response.url.startswith(WASM):
                    installed = ROOT / 'node_modules/@mediapipe/tasks-vision/wasm' / urlparse(response.url).path.split('/')[-1]
                    assert hashlib.sha256(installed.read_bytes()).hexdigest()==record['sha256']
            report['resources'].append(record)
        if not report['modelInitialized']: raise AssertionError('Actual recognizer initialization failed; see modelAttempts/resources')
        model_hashes = {r['sha256'] for r in report['resources'] if r['url']==MODEL and r.get('sha256')}
        assert len(model_hashes) == 1
        report['modelSha256'] = next(iter(model_hashes))
        try:
            original = model_page.evaluate('''async url=>{
              const response=await fetch(url,{credentials:'omit'});if(!response.ok)throw Error('Original model HTTP '+response.status);
              const bytes=await response.arrayBuffer();return {byteLength:bytes.byteLength,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('')};
            }''','https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task')
            report['originalModelComparison'] = dict(**original, sameBytes=original['sha256']==report['modelSha256'])
            if not report['originalModelComparison']['sameBytes']:
                report['failures'].append('Original unversioned model differs from pinned version 1; review model provenance and physical behavior before activation.')
        except Exception as error:
            report['originalModelComparison'] = dict(verified=False,error=failure_text(error))
        passed('Actual pinned SDK/WASM/model initialized twice after explicit opt-in, then closed, without requesting a camera')
    except Exception as error:
        report['failures'].append('Actual model: '+failure_text(error))
    browser.close()
args.report.parent.mkdir(parents=True,exist_ok=True)
args.report.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if report['failures'] or not report['remoteVerified'] or not report['modelInitialized']:
    raise SystemExit('Real acceptance incomplete; see the report. No physical-camera or publication claim.')
