"""Focused student profile/password/logout checks using explicit API fixtures."""
import asyncio,importlib.util,sys
from pathlib import Path
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fieldqa',ROOT/'scripts/qa-field.py');qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=await browser.new_context(viewport={'width':390,'height':844});page=await context.new_page();state={};await qa.fixture(page,state)
  await page.goto(qa.qa.BASE+'/student/dashboard',wait_until='networkidle');await page.get_by_role('button',name='Profile settings',exact=True).click()
  await page.get_by_label('Your name',exact=True).fill('Test Explorer');await page.get_by_label('Grade',exact=True).fill('9');await page.get_by_label('Class',exact=True).fill('A');await page.get_by_role('button',name='Save profile',exact=True).click()
  await page.get_by_text('Profile updated successfully!',exact=True).wait_for();assert state['profile_update']=={'name':'Test Explorer','grade':'9','schoolClass':'A'}
  await page.get_by_label('Current password',exact=True).fill('fixture-current');await page.get_by_label('New password',exact=True).fill('fixture-new-strong');await page.get_by_label('Confirm new password',exact=True).fill('fixture-mismatch');await page.get_by_role('button',name='Update password',exact=True).click()
  await page.get_by_text('New passwords do not match',exact=True).wait_for();assert 'password_update' not in state
  await page.get_by_label('Confirm new password',exact=True).fill('fixture-new-strong');await page.get_by_role('button',name='Update password',exact=True).click();await page.get_by_text('Password updated successfully!',exact=True).wait_for()
  assert state['password_update']=={'currentPassword':'fixture-current','newPassword':'fixture-new-strong'};assert await page.get_by_label('Current password',exact=True).input_value()==''
  await qa.snapshot(page,'profile',390,844)
  await page.get_by_role('button',name='Sign Out',exact=True).click();await page.wait_for_url(qa.qa.BASE+'/');assert state.get('logged_out')
  assert not qa.errors,qa.errors
  await browser.close()
 print('PASS Profile/password payloads, mismatch validation, success feedback, cleared password fields, mobile layout and sign out; all auth responses are fixtures.')
asyncio.run(main())
