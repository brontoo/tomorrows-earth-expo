"""Real prepared images and React player; auth/educational responses are explicit fixtures.

Start the separate media server and a frames-configured app first. No camera is used.
"""
import json
import os
from pathlib import Path
import re
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("FRAME_QA_BASE_URL", "http://127.0.0.1:3002")
chapters = re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*missionSlug:\s*"([^"]+)"', (ROOT / "client/src/components/book/chapters.ts").read_text())
missions = [dict(id=i+1, slug=c[2], title=c[1]) for i,c in enumerate(chapters)]
user = dict(id=9101, email="frame-qa@example.com", name="Frame QA", role="student", openId="frame-qa")
report = {"checks": [], "pageErrors": [], "scope": "Real Full HD images/player, fixture auth/passport; no camera or backend reward verification"}

def passed(message):
    report["checks"].append(message)
    print("PASS " + message, flush=True)

def fixture(page, state):
    def handle(route):
        names = unquote(urlparse(route.request.url).path.split("/api/trpc/")[-1]).split(",")
        results = []
        for name in names:
            if name == "auth.me": value = user
            elif name == "missions.getAll": value = missions
            elif name == "passport.getMine": value = dict(missionStates=[dict(missionId=i,status="verified") for i in state.get("verified",[])],totalPoints=len(state.get("verified",[]))*25,badges=[])
            else: route.continue_(); return
            results.append({"result":{"data":{"json":value}}})
        route.fulfill(status=200, content_type="application/json", body=json.dumps(results))
    page.route("**/api/trpc/**", handle)
    page.on("pageerror", lambda error: report["pageErrors"].append(str(error)))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox","--enable-unsafe-swiftshader"])
    context = browser.new_context(viewport={"width":1440,"height":1000}, has_touch=True)
    page = context.new_page(); state = {"verified":[]}; fixture(page,state)
    page.add_init_script("window.__cameraRequests=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraRequests++;return Promise.reject(new Error('Camera must remain unused'))}")
    requests = []; page.on("request", lambda r: requests.append(r.url))
    page.goto(BASE+"/eco-journey?chapter=abu-dhabi",wait_until="networkidle")
    player = page.locator(".frame-book-player")
    expect(player).to_have_attribute("data-frame-displayed","238",timeout=20000)
    expect(page.locator('[data-book-engine="frames"]')).to_be_visible()
    canvas = player.locator("canvas")
    expect(canvas).to_have_attribute("width","1920");expect(canvas).to_have_attribute("height","1080")
    assert page.locator("video").count()==0
    page.screenshot(path="/tmp/7e-frame-desktop.png",full_page=True)
    passed("Real 1920x1080 frame canvas replaces chapter imagery only when explicitly configured")
    canvas.focus();page.keyboard.press("ArrowRight")
    expect(player).to_have_attribute("data-frame-displayed","238")
    page.keyboard.press("ArrowLeft");expect(player).to_have_attribute("data-frame-displayed","237")
    page.keyboard.press("Home");expect(player).to_have_attribute("data-frame-displayed","0")
    page.wait_for_timeout(800);expect(player).to_have_attribute("data-frame-displayed","0")
    assert not any("/frames/02-DXB/" in r for r in requests)
    passed("Exact forward/reverse keyboard stepping, no autoplay and no requests for locked chapter frames")
    box=canvas.bounding_box();x,y=box["x"]+60,box["y"]+60
    page.mouse.move(x+140,y);page.mouse.down();page.mouse.move(x,y,steps=4);page.mouse.up()
    page.wait_for_function("Number(document.querySelector('.frame-book-player').dataset.frameDisplayed)>0")
    passed("Mouse dragging scrubs the native frame sequence")
    canvas.focus();page.keyboard.press("Home");expect(player).to_have_attribute("data-frame-displayed","0")
    session=context.new_cdp_session(page)
    session.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x+180,"y":y}]})
    session.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x+40,"y":y}]})
    session.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
    page.wait_for_function("Number(document.querySelector('.frame-book-player').dataset.frameDisplayed)>0")
    passed("Native touch dragging remains available without a camera")
    state["verified"]=[1]
    # This case tests navigation for a returning student; new-stamp animation is covered by qa-book.py.
    page.evaluate("localStorage.setItem('sevenEmiratesBook:v1:9101',JSON.stringify({chapter:0,seenStamps:['abu-dhabi']}))")
    page.reload(wait_until="networkidle")
    expect(page.locator('.book-phase-ready')).to_be_visible(timeout=10000)
    canvas=page.locator(".frame-book-player canvas")
    expect(player).to_have_attribute("data-frame-displayed","238")
    canvas.focus()
    page.keyboard.press("ArrowRight");expect(player).to_have_attribute("data-frame-displayed","239")
    expect(page.get_by_role("heading",name="Dubai",exact=True)).to_be_visible()
    page.keyboard.press("ArrowLeft");expect(player).to_have_attribute("data-frame-displayed","238")
    expect(page.get_by_role("heading",name="Abu Dhabi",exact=True)).to_be_visible()
    passed("Scrubbing across an unlocked boundary updates the educational chapter and reverses accurately")
    state["verified"]=list(range(1,8))
    page.evaluate("localStorage.setItem('sevenEmiratesBook:v1:9101',JSON.stringify({chapter:6,seenStamps:"+json.dumps([c[0] for c in chapters])+"}))")
    for index,(chapter_id,name,_) in enumerate(chapters):
        page.goto(BASE+"/eco-journey?chapter="+chapter_id,wait_until="networkidle")
        expect(player).to_have_attribute("data-frame-displayed",str((index+1)*239-1),timeout=20000)
    passed("All seven supplied Full HD chapter resting frames render through existing deep links")
    # Newly seen seventh stamp may open the existing final spread; suppress presentation-only animations.
    page.evaluate("localStorage.setItem('sevenEmiratesBook:v1:9101',JSON.stringify({chapter:6,seenStamps:"+json.dumps([c[0] for c in chapters])+"}))")
    page.goto(BASE+"/eco-journey?chapter=fujairah",wait_until="networkidle")
    expect(player).to_have_attribute("data-frame-displayed","1672")
    page.emulate_media(reduced_motion="reduce")
    page.set_viewport_size({"width":390,"height":844})
    expect(page.get_by_text("Reduced motion: frames move only with your input.",exact=True)).to_be_visible()
    assert not page.evaluate("document.documentElement.scrollWidth>innerWidth")
    page.screenshot(path="/tmp/7e-frame-mobile.png",full_page=True)
    assert page.evaluate("window.__cameraRequests")==0
    assert len([r for r in requests if "/frames/" in r])<100
    passed("Reduced motion/mobile layout retain controls; no camera requests or whole-sequence download")
    # Integrity failure remains recoverable and the legacy book can be selected locally.
    # Use a non-prefetched frame: adjacent frames are now intentionally cached.
    page.route("**/frames/07-FUJ/f_0200.webp",lambda r:r.fulfill(status=200,body=b"invalid"))
    page.get_by_role('slider',name='Book frame').evaluate("el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1634');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}")
    expect(player).to_have_attribute('data-frame-requested','1634')
    expect(page.get_by_role("button",name="Retry frame",exact=True)).to_be_visible()
    page.get_by_role("button",name="Use legacy book",exact=True).click()
    expect(page.locator('[data-book-engine="legacy"]')).to_be_visible()
    passed("Corrupt frame bytes are rejected and the existing legacy book remains recoverable")
    context.close();browser.close()
assert not report["pageErrors"],report["pageErrors"]
Path("/tmp/7e-frame-browser-report.json").write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
