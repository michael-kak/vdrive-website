/** Test routing only: never place a call or send a WhatsApp message. */
const puppeteer=require('puppeteer');
const fs=require('node:fs');
const BASE=process.env.VDRIVE_REVIEW_URL||'http://127.0.0.1:18743/studio/';
const OUTPUT=process.env.VDRIVE_CONTACT_REPORT||'/tmp/vdrive-yuval-contact-qa.json';
const checks=[],errors=[];
const ok=(name,value,detail)=>{checks.push({name,passed:!!value,detail});console.log((value?'PASS ':'FAIL ')+name);if(!value)throw new Error(name)};
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));await p.setCacheEnabled(false);
  await p.setViewport({width:1440,height:1000});await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForFunction(()=>document.querySelector('[data-contact-open]')&&document.querySelector('#contact-dialog'),{timeout:15000});
  await p.click('.header [data-contact-open]');await p.waitForFunction(()=>document.querySelector('#contact-dialog').open,{timeout:12000});
  ok('desktop_contact_opens_choice',await p.$eval('#contact-dialog',e=>e.open));
  const links=await p.$$eval('#contact-dialog a',es=>es.map(e=>({href:e.getAttribute('href'),text:e.textContent})));
  ok('choice_tel_is_yuval',links.some(x=>x.href==='tel:0544555365'));
  ok('choice_whatsapp_is_yuval',links.some(x=>x.href==='https://wa.me/972544555365'));
  ok('yuval_name_and_number_visible',await p.$eval('#contact-dialog',e=>e.textContent.includes('יובל')&&e.textContent.includes('054-455-5365')));
  await p.keyboard.press('Escape');ok('escape_closes_contact',await p.$eval('#contact-dialog',e=>!e.open));
  await p.click('footer [data-contact-open]');ok('footer_contact_opens_choice',await p.$eval('#contact-dialog',e=>e.open));await p.click('#contact-dialog .dialog-close');
  for(const width of [320,390,768]){
   await p.setViewport({width,height:844});await p.evaluate(()=>scrollTo(0,0));
   ok('header_contact_visible_'+width,await p.$eval('.header [data-contact-open]',e=>{const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&r.width>0&&r.left>=0&&r.right<=innerWidth}));
   await p.click('.header [data-contact-open]');ok('header_contact_works_'+width,await p.$eval('#contact-dialog',e=>e.open));
   ok('dialog_fits_'+width,await p.$eval('#contact-dialog',e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&e.scrollWidth<=e.clientWidth+1}));await p.keyboard.press('Escape');
   ok('page_fits_'+width,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(width===390){await p.click('.menu-toggle');await p.click('#mobile-menu [data-contact-open]');ok('mobile_menu_to_contact',await p.evaluate(()=>!document.querySelector('#mobile-menu').open&&document.querySelector('#contact-dialog').open));await p.keyboard.press('Escape')}
  }
  await p.$eval('#contact',e=>e.scrollIntoView());await p.type('#contact-name','בדיקת ניתוב ליובל');await p.type('#contact-message','הודעת בדיקה שלא תישלח');
  await p.evaluate(()=>{window.__contactUrl=null;window.open=(url)=>{window.__contactUrl=String(url);return null}});
  await p.click('#contact-form button[type=submit]');ok('form_opens_yuval_not_previous_contact',await p.evaluate(()=>window.__contactUrl?.startsWith('https://wa.me/972544555365?text=')&&decodeURIComponent(window.__contactUrl).includes('בדיקת ניתוב ליובל')));
  await p.waitForSelector('.vehicle-card',{timeout:22000});await p.click('.vehicle-card [data-open]');await p.waitForFunction(()=>document.querySelector('#vehicle-dialog').open,{timeout:10000});
  ok('vehicle_enquiry_goes_to_yuval',await p.$eval('#vehicle-dialog a.send-cta',e=>e.href.startsWith('https://wa.me/972544555365?text=')));await p.keyboard.press('Escape');
  const all=await p.$$eval('a[href^="tel:"],a[href^="https://wa.me/"]',es=>es.map(e=>e.getAttribute('href')));
  ok('all_active_phone_and_wa_links_use_yuval',all.length>=6&&all.every(s=>s==='tel:0544555365'||s.startsWith('https://wa.me/972544555365')),{count:all.length});
  ok('previous_phone_absent',await p.evaluate(()=>!/(050.?422.?7052|972504227052)/.test(document.body.textContent)));
  ok('no_javascript_errors',errors.length===0,{errors});
  const report={tested_at:new Date().toISOString(),url:BASE,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks,errors,limits:['Routing and UI verified; no call was placed and no WhatsApp message sent.','Chromium responsive test, not physical iPhone verification.','No DNS, email, inventory or Xanadria CRM changes.']};fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2));console.log('CONTACT_QA',JSON.stringify({passed:report.passed,failed:report.failed,url:BASE}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);fs.writeFileSync(OUTPUT,JSON.stringify({failed:true,error:String(e),checks},null,2));process.exit(1)});
