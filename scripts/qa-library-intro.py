"""Run local Chromium continuity checks against the verified intro and book packages."""
import argparse
import asyncio
import json
from pathlib import Path
from statistics import median
from time import perf_counter
from urllib.parse import urlparse
from playwright.async_api import async_playwright, expect

PARSER = argparse.ArgumentParser(description=__doc__)
PARSER.add_argument("--app", default="http://127.0.0.1:4283")
PARSER.add_argument("--library", required=True, type=Path)
PARSER.add_argument("--book", required=True, type=Path)
PARSER.add_argument("--report", required=True, type=Path)
PARSER.add_argument("--chromium", default="/usr/bin/chromium")
PARSER.add_argument("--asset-base", default="https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/")
args = PARSER.parse_args()
APP, ASSETS = args.app.rstrip("/"), args.asset_base.rstrip("/") + "/"
library = json.loads((args.library / "manifest.json").read_text())
book = json.loads((args.book / "manifest.json").read_text())
INTRO, BOOK = library["mediaVersion"], book["mediaVersion"]
BOOK_START = library["frameCount"]
last_frame = BOOK_START + book["frameCount"] - 1
roots = {INTRO: args.library, BOOK: args.book}

async def run(browser, mobile):
    viewport = {"width": 390 if mobile else 1440, "height": 844 if mobile else 1000}
    ctx = await browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile)
    requests, elapsed = [], {}
    gate = asyncio.Event()
    async def assets(route):
        key = urlparse(route.request.url).path.removeprefix(urlparse(ASSETS).path)
        requests.append(key)
        if key == f"{BOOK}/frames/01-AD/f_0000.webp" and not gate.is_set():
            await gate.wait()
            await asyncio.sleep(0.30)
        version, asset = key.split("/", 1)
        root = roots.get(version)
        if root is None:
            await route.abort()
            return
        path = (root / asset).resolve()
        if not path.is_relative_to(root.resolve()) or not path.is_file():
            await route.abort()
            return
        content_type = "application/json" if path.suffix == ".json" else "image/webp"
        await route.fulfill(path=path, content_type=content_type, headers={"Access-Control-Allow-Origin":"*"})
    await ctx.route(ASSETS+"**",assets)
    async def api(route):
        if route.request.method != "GET":
            raise RuntimeError("Unexpected API mutation")
        names = urlparse(route.request.url).path.split("/api/trpc/")[1].split(",")
        data = [{"result":{"data":{"json":None if name == "auth.me" else {"missionStates": [], "totalPoints": 0, "badges": []} if name == "passport.getMine" else []}}} for name in names]
        await route.fulfill(json=data)
    await ctx.route("**/api/trpc/**",api)
    await ctx.add_init_script('''window.cameraRequests=0; window.clearCalls=0;
       if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia=async()=>{window.cameraRequests++;throw Error("No webcam in fixture test")};
       const clear=CanvasRenderingContext2D.prototype.clearRect;
       CanvasRenderingContext2D.prototype.clearRect=function(...args) {
         if(this.canvas.closest(".frame-book-player"))window.clearCalls++;
         return clear.apply(this,args);
       };''')
    page = await ctx.new_page()
    page_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    start = perf_counter()
    await page.goto(APP+"/?bookDiagnostics=1",wait_until="domcontentloaded")
    player = page.locator(".frame-book-player")
    canvas = player.locator("canvas")
    slider = page.get_by_role("slider", name="Journey frame")
    async def frame(index):
        await expect(player).to_have_attribute("data-frame-displayed", str(index),timeout=10000)
    async def jump(index):
        await slider.evaluate('''(el,value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,String(value));
          el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true}));
        }''', index)
        await frame(index)
    await frame(0)
    elapsed["coldEntryMs"] = round((perf_counter()-start)*1000)
    assert await canvas.evaluate("el=>[el.width,el.height]") == [1920,1080]
    assert await page.locator(".book-compact-chapters button:enabled").count() == 7
    await expect(page.get_by_role("button",name="Enable Hand Controls")).to_be_visible()
    await page.wait_for_timeout(200)
    await frame(0)
    assert await page.evaluate("cameraRequests") == 0
    initial_requests = len([r for r in requests if r.startswith(INTRO) and "/frames/" in r])
    assert initial_requests < 15
    await jump(library["zones"][1]["startInclusive"] + 2)
    await expect(page.locator(".book-optional-mission")).to_have_count(0)
    await jump(BOOK_START - 1)
    await canvas.evaluate("""el=> {
      window.originalCanvas=el;
      window.pixel=Array.from(el.getContext("2d").getImageData(960,540,1,1).data);
    }""")
    scheduler = await player.get_attribute("data-scheduler-id")
    await canvas.focus()
    await canvas.press("ArrowRight")
    await expect(player).to_have_attribute("data-frame-requested",str(BOOK_START))
    await frame(BOOK_START - 1)
    assert await canvas.evaluate("el=>el===window.originalCanvas && JSON.stringify(Array.from(el.getContext('2d').getImageData(960,540,1,1).data))===JSON.stringify(window.pixel)")
    timer = perf_counter()
    gate.set()
    await frame(BOOK_START)
    elapsed["coldDelayedSeamMs"] = round((perf_counter()-timer)*1000)
    await canvas.press("ArrowRight")
    await frame(BOOK_START+1)
    await expect(page.get_by_role("heading", name="Abu Dhabi",exact=True)).to_be_visible()
    await canvas.press("ArrowLeft")
    await frame(BOOK_START)
    await expect(page.locator(".book-optional-mission")).to_have_count(0)
    timer = perf_counter()
    await canvas.press("ArrowLeft")
    await frame(BOOK_START - 1)
    elapsed["warmReverseSeamMs"] = round((perf_counter()-timer)*1000)
    assert await canvas.evaluate("el=>el===window.originalCanvas && window.clearCalls===0")
    assert await player.get_attribute("data-scheduler-id") == scheduler
    await jump(library["zones"][1]["startInclusive"] + 2)
    await canvas.press("Home")
    await frame(0)
    await page.get_by_role("button",name="Fujairah",exact=True).click()
    await frame(last_frame)
    await expect(page.get_by_role("heading",name="Fujairah",exact=True)).to_be_visible()
    assert await player.get_attribute("data-scheduler-id") == scheduler
    await jump(library["zones"][1]["startInclusive"])
    await canvas.scroll_into_view_if_needed()
    box = await canvas.bounding_box()
    assert box is not None
    x, y = box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.5
    previous = int(await player.get_attribute("data-frame-requested"))
    if mobile:
        cdp = await ctx.new_cdp_session(page)
        await cdp.send("Input.dispatchTouchEvent", {"type":"touchStart","touchPoints":[{"x":x, "y":y}]})
        await cdp.send("Input.dispatchTouchEvent", {"type":"touchMove","touchPoints":[{"x":x-80, "y":y}]})
        await cdp.send("Input.dispatchTouchEvent", {"type":"touchEnd","touchPoints":[]})
    else:
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x - 80, y, steps=8)
        await page.mouse.up()
    target = int(await player.get_attribute("data-frame-requested"))
    assert target > previous
    await frame(target)
    burst_target = BOOK_START + 12
    await slider.evaluate("""(el, target) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      const seek = value => {
        set.call(el, String(value));
        el.dispatchEvent(new Event("input", {bubbles: true}));
      };
      for (let i = 0; i < 120; i++) seek(target + (i % 30) - 20);
      seek(target);
    }""", burst_target)
    await frame(burst_target)
    assert await canvas.evaluate("el=>el===window.originalCanvas && window.clearCalls===0")
    diagnostics = await page.evaluate("window.__sevenEmiratesDiagnostics.snapshot()")
    cache = diagnostics["samples"]["scheduler"]
    assert all(
        row["decodedBytes"] <= row["policy"]["maxDecodedBytes"] and
        row["encodedBytes"] <= row["policy"]["maxEncodedBytes"] and
        row["activeRequests"] <= row["policy"]["maxConcurrentRequests"]
        for row in cache
    )
    pipeline = {}
    for kind in ("transfer", "sha256", "decode", "draw", "requestToDisplay"):
        durations = [
            row["duration"] for row in diagnostics["samples"].get(kind, [])
            if kind != "requestToDisplay" or row["exact"]
        ]
        if durations:
            ordered = sorted(durations)
            pipeline[kind] = {"samples": len(ordered), "medianMs": round(median(ordered), 2),
                              "p95Ms": round(ordered[int((len(ordered) - 1) * .95)], 2)}
    cache_result = {
        "peakDecodedBytes": max(row["decodedBytes"] for row in cache),
        "peakEncodedBytes": max(row["encodedBytes"] for row in cache),
        "peakActiveRequests": max(row["activeRequests"] for row in cache),
        "decodedBudgetBytes": cache[-1]["policy"]["maxDecodedBytes"],
        "cacheHits": cache[-1]["cacheHits"],
    }
    requests.clear()
    await page.goto(APP+"/eco-journey?chapter=fujairah",wait_until="domcontentloaded")
    await frame(last_frame)
    await page.wait_for_timeout(250)
    assert not [r for r in requests if r.startswith(INTRO) and "/frames/" in r]
    assert not page_errors, page_errors
    await ctx.close()
    return {"viewport":viewport, "initialIntroFrameRequests":initial_requests, "timings":elapsed,
            "pipeline":pipeline, "cache":cache_result, "rapidSliderEvents":121,
            "stableCanvasAndScheduler":True,"autoplay":False,"cameraOffByDefault":True,
            "directChapterIntroFrameRequests":0}

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=args.chromium,headless=True,args=["--no-sandbox"])
        results = [await run(browser, mobile) for mobile in (False,True)]
        report = {"libraryMedia":INTRO,"bookMedia":BOOK,"transport":"verified local packages replayed through browser interception",
                  "browser":browser.version,"measurements":results}
        args.report.write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps(report,indent=2))
        await browser.close()

asyncio.run(main())
