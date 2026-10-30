import asyncio,importlib.util,sys,json
from pathlib import Path
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1];spec=importlib.util.spec_from_file_location('qa',ROOT/'scripts/qa-train.py');qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
OUT=Path('/tmp/tee-intro-identity');OUT.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width,height in [(1440,900),(390,844),(320,720),(844,390),(768,1024)]:
   c=await b.new_context(viewport={'width':width,'height':height},reduced_motion='reduce');page=await c.new_page();await qa.fixture(page,{},student=False)
   await page.goto(qa.BASE+'/eco-journey',wait_until='networkidle');await page.wait_for_timeout(500)
   await page.screenshot(path=str(OUT/f'opening-{width}x{height}.png'),full_page=True)
   await page.get_by_role('button',name='Board the Eco Train',exact=True).click()
   await page.locator('.story-slide-group[aria-hidden=false]').filter(has_text='Your eco-guide and travel companion.').wait_for();await page.wait_for_function("getComputedStyle(document.querySelector('.story-slide-group[aria-hidden=false]')).opacity==='1'");await page.wait_for_timeout(300)
   await page.screenshot(path=str(OUT/f'guide-{width}x{height}.png'),full_page=True)
   await page.locator('.story-slide-group[aria-hidden=false]').filter(has_text='Travel, explore, solve challenges').wait_for();await page.wait_for_timeout(300)
   await page.screenshot(path=str(OUT/f'mission-{width}x{height}.png'),full_page=True)
   await page.get_by_role('button',name='Continue to the platform').wait_for();await page.wait_for_timeout(1300)
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert await page.locator('.journey-intro').evaluate('(el)=>getComputedStyle(el).backgroundImage')=='none'
   assert 'Playfair Display' in await page.locator('.intro-map-slide .story-title').evaluate('(el)=>getComputedStyle(el).fontFamily')
   await page.screenshot(path=str(OUT/f'briefing-{width}x{height}.png'),full_page=True)
   await c.close()
  await b.close()
 print('PASS Five responsive intro layouts, shared fonts, no notebook background, guide/mission/map screenshots.')
asyncio.run(main())
