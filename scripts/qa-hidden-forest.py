#!/usr/bin/env python3
"""Exercise the production bundle with locally replayed book media and guest API responses."""
import argparse
import asyncio
import json
import re
from pathlib import Path
from time import perf_counter
from urllib.parse import urlparse

from playwright.async_api import async_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--app", required=True)
parser.add_argument("--library", required=True, type=Path)
parser.add_argument("--book", required=True, type=Path)
parser.add_argument("--output", required=True, type=Path)
parser.add_argument("--chromium", default="/usr/bin/chromium")
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
library = json.loads((args.library / "manifest.json").read_text())
book = json.loads((args.book / "manifest.json").read_text())
roots = {library["mediaVersion"]: args.library, book["mediaVersion"]: args.book}
bucket = "https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/"
errors = []
downloads = []


async def install_fixtures(context):
    async def media(route):
        version, asset = route.request.url.removeprefix(bucket).split("/", 1)
        directory = roots.get(version)
        source = (directory / asset).resolve() if directory else None
        if source is None or not source.is_relative_to(directory.resolve()) or not source.is_file():
            await route.abort()
            return
        mime = "application/json" if asset.endswith(".json") else "image/webp"
        await route.fulfill(path=source, content_type=mime, headers={"Access-Control-Allow-Origin": "*"})

    async def api(route):
        assert route.request.method == "GET", f"Guest sent a mutation: {route.request.url}"
        names = urlparse(route.request.url).path.split("/api/trpc/")[-1].split(",")
        result = [None if name == "auth.me" else [] for name in names]
        await route.fulfill(json=[{"result": {"data": {"json": value}}} for value in result])

    await context.route(bucket + "**", media)
    await context.route("**/api/trpc/**", api)
    await context.add_init_script("""
      window.forestReleased=0;
      const get=WebGL2RenderingContext.prototype.getExtension;
      WebGL2RenderingContext.prototype.getExtension=function(name) {
        const extension=get.call(this,name);
        if (name==="WEBGL_lose_context" && extension && !extension.wrapped) {
          const lose=extension.loseContext.bind(extension);
          extension.loseContext=()=>{window.forestReleased++;lose()};
          extension.wrapped=true;
        }
        return extension;
      };
    """)


async def collect_page(context):
    page = await context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if "Shader Error" in message.text else None)
    page.on("response", lambda response: downloads.append(response.url) if "/worlds/abu-dhabi/" in response.url and response.status == 200 else None)
    return page


async def ready(page):
    world = page.locator(".forest-world.is-ready")
    await expect(world).to_be_visible(timeout=30000)
    await expect(world.locator("canvas")).to_have_count(1)
    await expect(world).to_have_attribute("data-draw-calls", re.compile(r"[1-9]\d*"), timeout=15000)
    return world


async def screenshot(page, name):
    await page.screenshot(path=args.output / f"{name}.jpg", type="jpeg", quality=88)


async def world_action(page, title):
    await page.get_by_role("button", name=title, exact=True).click()
    await expect(page.get_by_role("link", name="Scientific source")).to_be_visible()


async def run(browser):
    context = await browser.new_context(viewport={"width": 1440, "height": 900})
    await install_fixtures(context)
    page = await collect_page(context)
    requests = []
    page.on("request", lambda request: requests.append(request.url))
    await page.goto(args.app, wait_until="domcontentloaded")
    player = page.locator(".frame-book-player")
    await expect(player).to_have_attribute("data-frame-displayed", "0", timeout=20000)
    assert not [url for url in requests if "AbuDhabiWorld-" in url or "/worlds/abu-dhabi/" in url]
    await page.get_by_role("button", name="Abu Dhabi", exact=True).click()
    target = str(library["frameCount"] + book["chapters"][0]["restingFrame"])
    await expect(player).to_have_attribute("data-frame-displayed", target, timeout=20000)
    await player.locator("canvas").evaluate("canvas => window.retainedBook = canvas")
    entry = page.get_by_role("button", name="Enter The Hidden Forest")
    start = perf_counter()
    await entry.click()
    world = await ready(page)
    entry_ms = round((perf_counter() - start) * 1000)
    await expect(page.get_by_role("button", name="Back to Book")).to_be_focused()
    await page.keyboard.press("Shift+Tab")
    await expect(page.get_by_role("button", name="Reset")).to_be_focused()
    await page.keyboard.press("Tab")
    await expect(page.get_by_role("button", name="Back to Book")).to_be_focused()
    assert not [url for url in requests if url.endswith(("mangrove-hero.glb", "roots-study.glb", "flathead-mullet.glb", "mangrove-crab.glb", "archive-fish.glb", "scarlet-plant.glb"))]
    await expect(world).to_have_attribute("data-frame-ms", re.compile(r"[0-9]"), timeout=30000)
    await page.wait_for_timeout(6000)
    await screenshot(page, "canopy")
    metrics = await world.evaluate("element => ({frameMs: element.dataset.frameMs, drawCalls: element.dataset.drawCalls, triangles: element.dataset.triangles, pixelRatio: element.dataset.pixelRatio, usedJsHeapBytes: performance.memory?.usedJSHeapSize})")
    await page.get_by_role("button", name="Settings", exact=True).click()
    await page.get_by_label("Reduce motion").check()
    await expect(world).to_have_attribute("data-render-quality", "on-demand")
    await page.get_by_role("button", name="Explore", exact=True).click()
    for title in ["Inspect the grey mangrove", "Magnify a leaf", "Reveal salt secretion"]:
        await world_action(page, title)
    await world_action(page, "Watch the bird in flight")
    await screenshot(page, "coastal-bird")
    async with page.expect_response(lambda response: response.url.endswith("mangrove-crab.glb") and response.ok, timeout=15000):
        await world_action(page, "Inspect the mud crab")
    await expect(world).to_have_attribute("data-triangles", re.compile(r"[0-9]+"))
    await screenshot(page, "mud-crab")
    area = page.get_by_label("Exploration area")
    async with page.expect_response(lambda response: response.url.endswith("flathead-mullet.glb") and response.ok, timeout=15000):
        await area.select_option("underwater")
    await world_action(page, "Follow the juvenile mullet")
    await screenshot(page, "mullet")
    await world_action(page, "Compare open water and roots")
    await screenshot(page, "underwater")
    async with page.expect_response(lambda response: response.url.endswith("archive-fish.glb") and response.ok, timeout=15000):
        await page.get_by_role("button", name="Gallery", exact=True).click()
    await expect(page.get_by_role("heading", name="Climbing perch")).to_be_visible()
    await expect(page.locator("[aria-busy=false]").filter(has=page.get_by_role("heading", name="Climbing perch"))).to_be_visible()
    await screenshot(page, "gallery-perch")
    async with page.expect_response(lambda response: response.url.endswith("scarlet-plant.glb") and response.ok, timeout=15000):
        await page.get_by_label("Gallery model").select_option("scarlet")
    await expect(page.get_by_role("link", name="Varvara")).to_be_visible()
    await expect(page.locator("[aria-busy=false]").filter(has=page.get_by_role("heading", name="Scarlet alien plant"))).to_be_visible()
    await screenshot(page, "gallery-plant")
    await page.get_by_role("button", name="Explore", exact=True).click()
    await expect(area).to_have_value("underwater")
    await area.select_option("roots")
    await world_action(page, "Inspect breathing roots")
    await world_action(page, "Reveal underground roots")
    await screenshot(page, "roots")
    await world_action(page, "Hide underground roots")
    await expect(page.get_by_role("button", name="Reveal underground roots")).to_be_visible()
    await area.select_option("tides")
    tide = page.get_by_label("Tide level")
    await tide.press("Home")
    await expect(tide).to_have_attribute("aria-valuetext", "Low tide")
    await tide.press("End")
    await expect(tide).to_have_attribute("aria-valuetext", "High tide")
    await world_action(page, "Inspect the tidal bank")
    await world_action(page, "Trace the creek to the coast")
    await area.select_option("carbon")
    for title in ["Trace plant uptake", "Follow fallen litter", "Follow burial", "Inspect sediment layers", "Compare sediment disturbance"]:
        await world_action(page, title)
    await screenshot(page, "carbon")
    await page.get_by_role("button", name="Atlas", exact=True).click()
    await expect(page.get_by_text("12 / 12")).to_be_visible()
    await expect(page.get_by_text("Abu Dhabi Legacy Seal", exact=True)).to_be_visible()
    await screenshot(page, "atlas")
    await page.get_by_role("button", name="Back to Book").click()
    await expect(world).to_have_count(0)
    await expect(entry).to_be_focused()
    await expect(page.get_by_text("Abu Dhabi Legacy Seal", exact=True)).to_be_visible()
    await expect(player).to_have_attribute("data-frame-displayed", target)
    assert await player.locator("canvas").evaluate("canvas => canvas === window.retainedBook")
    for _ in range(2):
        await entry.click()
        await ready(page)
        await page.get_by_role("button", name="Atlas", exact=True).click()
        await expect(page.get_by_text("12 / 12")).to_be_visible()
        await page.keyboard.press("Escape")
        await expect(world).to_have_count(0)
    assert await page.evaluate("forestReleased") >= 3
    for name, chapter in zip(["Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"], book["chapters"][1:]):
        await page.get_by_role("button", name=name, exact=True).click()
        await expect(player).to_have_attribute("data-frame-displayed", str(library["frameCount"] + chapter["restingFrame"]), timeout=20000)
        await expect(entry).to_have_count(0)
    await context.close()

    mobile = await browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    await install_fixtures(mobile)
    page = await collect_page(mobile)
    await page.goto(args.app + "/eco-journey/abu-dhabi-world", wait_until="domcontentloaded")
    world = await ready(page)
    await expect(world).to_have_attribute("data-render-quality", "30fps")
    await expect(world).to_have_attribute("data-frame-ms", re.compile(r"[0-9]"), timeout=30000)
    await page.wait_for_timeout(4500)
    mobile_metrics = await world.evaluate("element => ({frameMs: element.dataset.frameMs, drawCalls: element.dataset.drawCalls, triangles: element.dataset.triangles, pixelRatio: element.dataset.pixelRatio, usedJsHeapBytes: performance.memory?.usedJSHeapSize})")
    await page.get_by_label("Exploration area").select_option("tides")
    await page.get_by_role("button", name="Animate tide").tap()
    await expect(page.get_by_role("button", name="Pause tide")).to_be_visible()
    await page.get_by_role("button", name="Pause tide").tap()
    await screenshot(page, "mobile-tides")
    await page.get_by_role("button", name="Gallery", exact=True).tap()
    await expect(page.get_by_role("heading", name="Climbing perch")).to_be_visible()
    await page.get_by_label("Gallery model").select_option("scarlet")
    await expect(page.get_by_role("heading", name="Scarlet alien plant")).to_be_visible()
    await page.get_by_role("button", name="Explore", exact=True).tap()
    await expect(page.get_by_label("Exploration area")).to_have_value("tides")
    await mobile.close()
    detail = await browser.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
    await install_fixtures(detail)
    page = await collect_page(detail)
    await page.goto(args.app + "/eco-journey/abu-dhabi-world", wait_until="domcontentloaded")
    await ready(page)
    async with page.expect_response(lambda response: response.url.endswith("mangrove-hero.glb") and response.ok, timeout=15000):
        await world_action(page, "Inspect the grey mangrove")
    await page.get_by_role("button", name="Settings", exact=True).click()
    await page.get_by_role("button", name="Enable sound", exact=True).click()
    await expect(page.get_by_role("button", name="Mute all sound", exact=True)).to_be_visible()
    await page.get_by_role("button", name="Mute all sound", exact=True).click()
    await expect(page.get_by_role("button", name="Enable sound", exact=True)).to_be_visible()
    await detail.close()

    fallback = await browser.new_context()
    await install_fixtures(fallback)
    await fallback.add_init_script("""
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...options) {
        return type.startsWith("webgl") ? null : getContext.call(this,type,...options);
      };
    """)
    page = await collect_page(fallback)
    await page.goto(args.app + "/eco-journey/abu-dhabi-world", wait_until="domcontentloaded")
    await expect(page.get_by_text("WebGL is unavailable on this device.", exact=False)).to_be_visible()
    await world_action(page, "Inspect the grey mangrove")
    await page.get_by_role("button", name="Atlas", exact=True).click()
    await expect(page.get_by_text("1 / 12")).to_be_visible()
    await fallback.close()
    assert {"little-bird.glb", "mangrove-crab.glb", "flathead-mullet.glb", "archive-fish.glb", "scarlet-plant.glb"} <= {
        url.rsplit("/", 1)[-1] for url in downloads
    }
    assert not errors, errors
    return {"entryAndFirstDrawMs": entry_ms, "desktop": metrics, "mobile": mobile_metrics,
            "repeatedEntries": 3, "discoveryCount": 12, "otherChapterCount": 6, "webglFallback": "passed", "keyboardFocusReturn": "passed", "audioOptInAndMute": "passed",
            "browser": browser.version, "models": sorted(set(downloads)), "errors": errors,
            "conditions": "Headless Chromium SwiftShader, intercepted book CDN and guest tRPC responses"}


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=args.chromium, args=["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"])
        report = await run(browser)
        await browser.close()
    (args.output / "browser-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


asyncio.run(main())
