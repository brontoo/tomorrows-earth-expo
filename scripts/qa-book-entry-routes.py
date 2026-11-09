"""Regression: / and /eco-journey must show the same original frame 0.

Default mode uses real APIs/media. --local-media-root explicitly supplies original
Full HD reference bytes and read-only guest API fixtures; it is not live acceptance.
Camera activation and all non-read requests are blocked in either mode.
"""
import argparse
import asyncio
import json
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
MEDIA = "https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/7e-1bc718ef5e77/"
FRAME_ZERO = json.loads((ROOT / "media/seven-emirates/manifest.json").read_text())["frames"][0]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base-url", default="http://127.0.0.1:4182")
parser.add_argument("--local-media-root", type=Path)
parser.add_argument("--report", type=Path, default=Path("/tmp/book-entry-routes.json"))
args = parser.parse_args()
report = {
    "baseUrl": args.base_url,
    "scope": "original local media and read-only guest fixtures" if args.local_media_root else "actual APIs and remote media",
    "checks": [], "failures": [], "pageErrors": [], "blockedMutations": [],
    "physicalCameraTested": False,
}


async def main():
    args.report.parent.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        launch = dict(executable_path=os.getenv("PLAYWRIGHT_CHROMIUM_EXECUTABLE", "/usr/bin/chromium"), headless=True, args=["--no-sandbox"])
        if os.getenv("HTTPS_PROXY"):
            launch["proxy"] = dict(server=os.environ["HTTPS_PROXY"], bypass="localhost,127.0.0.1")
        browser = await pw.chromium.launch(**launch)
        report["browserVersion"] = browser.version
        for route_path in ["/", "/eco-journey"]:
            context = await browser.new_context(reduced_motion="reduce")
            page = await context.new_page()
            page.on("pageerror", lambda error: report["pageErrors"].append(str(error)))

            async def read_only(route):
                if route.request.method not in ("GET", "HEAD", "OPTIONS"):
                    report["blockedMutations"].append(route.request.method)
                    await route.abort()
                else:
                    await route.continue_()

            await context.route("**/*", read_only)
            await context.add_init_script("window.__cameraCalls=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{window.__cameraCalls++;throw Error('Camera not enabled by entry regression test')}")
            if args.local_media_root:
                async def api(route):
                    if route.request.method != "GET":
                        await read_only(route)
                        return
                    names = unquote(urlparse(route.request.url).path.split("/api/trpc/")[-1]).split(",")
                    rows = [{"result": {"data": {"json": None if name == "auth.me" else []}}} for name in names]
                    await route.fulfill(content_type="application/json", body=json.dumps(rows))

                async def media(route):
                    key = unquote(route.request.url.removeprefix(MEDIA).split("?", 1)[0])
                    file = (args.local_media_root / key).resolve()
                    if args.local_media_root.resolve() not in file.parents or not file.is_file():
                        await route.abort()
                        return
                    await route.fulfill(path=str(file), content_type="application/json" if file.suffix == ".json" else "image/webp", headers={"Access-Control-Allow-Origin": "*"})

                await context.route("**/api/trpc/**", api)
                await context.route(MEDIA + "**", media)
            try:
                response = await page.goto(args.base_url.rstrip("/") + route_path, wait_until="domcontentloaded", timeout=25000)
                assert response and response.status == 200
                await expect(page.locator(".book-continuous")).to_have_count(1)
                player = page.locator(".frame-book-player")
                await expect(player).to_have_attribute("data-frame-displayed", "0", timeout=45000)
                await expect(page.locator(".book-phase-cover,.book-contents,.book-webgl,.book-optional-mission")).to_have_count(0)
                await expect(page.get_by_role("button", name="Open the book", exact=False)).to_have_count(0)
                await expect(page.get_by_role("button", name="Preview chapters", exact=False)).to_have_count(0)
                await expect(page.get_by_text("TABLE OF CONTENTS", exact=True)).to_have_count(0)
                await expect(page.get_by_role("button", name="Enable Hand Controls", exact=True)).to_be_visible()
                await expect(page.locator(".book-compact-chapters button")).to_have_count(7)
                await expect(page.locator(".book-compact-chapters button:disabled")).to_have_count(0)
                assert await page.evaluate("window.__cameraCalls") == 0
                pixels = await page.evaluate("""async ({url,sha,size})=>{
                  const bytes=await (await fetch(url,{credentials:'omit'})).arrayBuffer();
                  const digest=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(v=>v.toString(16).padStart(2,'0')).join('');
                  if(bytes.byteLength!==size||await digest(bytes)!==sha)throw Error('Original frame-0 integrity mismatch');
                  const bitmap=await createImageBitmap(new Blob([bytes]));
                  try {
                    const canvas=document.querySelector('.frame-book-player canvas');
                    if(canvas.width!==1920||canvas.height!==1080||bitmap.width!==1920||bitmap.height!==1080)throw Error('Not Full HD');
                    const reference=new OffscreenCanvas(1920,1080);const ctx=reference.getContext('2d',{alpha:false});ctx.drawImage(bitmap,0,0);
                    const original=await digest(ctx.getImageData(0,0,1920,1080).data);
                    const visible=await digest(canvas.getContext('2d').getImageData(0,0,1920,1080).data);
                    if(original!==visible)throw Error('Visible pixels do not match original closed-book frame');
                    return visible;
                  } finally {bitmap.close();}
                }""", dict(url=MEDIA + FRAME_ZERO["url"], sha=FRAME_ZERO["sha256"], size=FRAME_ZERO["byteLength"]))
                report["checks"].append(dict(route=route_path, frame=0, component="FrameTravelBook", pixelSha256=pixels, intro=False, cameraCalls=0, unlockedChapters=7))
                name = "home" if route_path == "/" else "eco-journey"
                await page.screenshot(path=str(args.report.with_name(args.report.stem + "-" + name + ".png")), full_page=True)
            except Exception as error:
                report["failures"].append(dict(route=route_path, error=str(error)))
            finally:
                await context.close()
        await browser.close()
    if len(report["checks"]) == 2:
        assert report["checks"][0]["pixelSha256"] == report["checks"][1]["pixelSha256"]
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if report["failures"] or report["pageErrors"] or report["blockedMutations"]:
        raise SystemExit(1)


asyncio.run(main())
