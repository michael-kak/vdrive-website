/* Browser acceptance for the isolated Vdrive studio route. No contact request is sent. */
const puppeteer=require('puppeteer');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const BASE=process.env.VDRIVE_REVIEW_URL || 'http://127.0.0.1:18741/studio/';
const results=[],errors=[],responses=[];
const assert=(name,ok,detail='')=>{results.push({name,passed:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 fs.mkdirSync(path.join(__dirname,'review'),{recursive:true});
 const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 let p=await browser.newPage();await p.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('getPublicCatalog'))responses.push({status:r.status(),cors:r.headers()['access-control-allow-origin']})});
 await p.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
 await p.waitForFunction(()=>document.querySelectorAll('.vehicle-card').length>0,{timeout:20000});
 await p.waitForFunction(()=>document.documentElement.dataset.catalog==='live',{timeout:23000});
 await p.evaluate(()=>document.fonts.ready);await pause(1000);
 assert('live_catalog_inside_page',await p.evaluate(()=>document.documentElement.dataset.catalog==='live'));
 const count=await p.$$eval('.vehicle-card',els=>els.length);assert('catalog_has_real_records',count>0,{count});
 assert('source_disclosed',await p.$eval('#source-note',e=>e.textContent.includes('אינו חיבור ל־Xanadria')));
 assert('one_main_heading',await p.$$eval('h1',e=>e.length)===1);
 assert('no_horizontal_overflow_1440',await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 await p.screenshot({path:path.join(__dirname,'review','vdrive-desktop.jpg'),type:'jpeg',quality:86});
 await p.$eval('#collection',e=>e.scrollIntoView());await pause(900);await p.screenshot({path:path.join(__dirname,'review','vdrive-inventory.jpg'),type:'jpeg',quality:84});
 await p.type('#search','BMW');assert('search_filters_bmw',await p.$$eval('.vehicle-card',es=>es.length===1&&es[0].textContent.includes('BMW')));
 await p.click('#reset-filters');await p.select('#budget','80000');assert('budget_filter_80000',await p.$$eval('.vehicle-card',es=>es.length===1&&es[0].textContent.includes('Honda')));
 await p.click('#reset-filters');assert('filter_reset_restores_catalog',await p.$$eval('.vehicle-card',e=>e.length)===count);
 await p.select('#sort','price-low');assert('price_order_is_ascending',await p.$$eval('.card-price',es=>{const nums=es.map(e=>Number(e.textContent.replace(/[^0-9]/g,'')));return nums.every((v,i)=>!i||v>=nums[i-1])}));
 await p.click('#reset-filters');await p.click('.like');assert('save_car_updates_counter',await p.$eval('#save-count',e=>Number(e.textContent))===1);
 await p.click('.saved-btn');assert('saved_only_view',await p.$$eval('.vehicle-card',e=>e.length)===1);await p.click('.saved-btn');
 await p.click('.vehicle-card:nth-child(1) .compare-input');await p.click('.vehicle-card:nth-child(2) .compare-input');await p.click('#open-compare');
 assert('comparison_dialog_two_cars',await p.evaluate(()=>document.querySelector('#compare-dialog').open&&document.querySelectorAll('.comparison-card').length===2));await p.screenshot({path:path.join(__dirname,'review','vdrive-comparison.jpg'),type:'jpeg',quality:82});await p.keyboard.press('Escape');
 await p.click('.vehicle-card:first-child [data-open]');assert('vehicle_detail_dialog_opens',await p.$eval('#vehicle-dialog',d=>d.open));
 const before=await p.$eval('#detail-main-photo',i=>i.src);await p.click('[data-photo-step="1"]');assert('vehicle_gallery_changes_photo',before!==await p.$eval('#detail-main-photo',i=>i.src));
 assert('suspect_fuel_not_rendered',await p.$eval('#vehicle-detail',d=>!d.textContent.includes('בנזין')));await p.keyboard.press('Escape');assert('escape_closes_dialog',await p.$eval('#vehicle-dialog',d=>!d.open));
 await p.click('#sold-tab');assert('sold_separate_and_honest',await p.$eval('#sold-state',e=>!e.hidden&&e.textContent.includes('טרם חובר')));assert('sold_view_hides_active_inventory',await p.$eval('#vehicle-grid',e=>e.hidden));
 await p.click('#active-tab');await p.click('#start-trade');await pause(600);assert('trade_in_intent_selected',await p.$eval('input[name=intent][value="טרייד־אין"]',e=>e.checked));
 await p.type('#contact-name','בדיקת עיצוב');await p.type('#contact-message','בירור ללא שליחה');
 await p.evaluate(()=>{window.__testOpened=null;window.open=(url)=>{window.__testOpened=String(url);return null;};});
 await p.click('#contact-form button[type=submit]');
 assert('contact_prepares_whatsapp_without_sending',await p.evaluate(()=>window.__testOpened?.startsWith('https://wa.me/972504227052?text=')&&decodeURIComponent(window.__testOpened).includes('בדיקת עיצוב')));
 await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,100))}scrollTo(0,0)});await pause(1400);
 const broken=await p.$$eval('img',es=>es.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')));assert('all_loaded_images_after_scroll',broken.length===0,{broken});
 await p.screenshot({path:path.join(__dirname,'review','vdrive-full.jpg'),fullPage:true,type:'jpeg',quality:78});
 for(const width of [320,390,768]){
   await p.setViewport({width,height:844,deviceScaleFactor:1});await p.evaluate(()=>scrollTo(0,0));await pause(300);
   assert('no_horizontal_overflow_'+width,await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
   if(width===390){await p.screenshot({path:path.join(__dirname,'review','vdrive-mobile.jpg'),type:'jpeg',quality:86});await p.click('.menu-toggle');assert('mobile_menu_opens',await p.$eval('#mobile-menu',e=>e.open));await p.click('#mobile-menu a[href="#contact"]');assert('mobile_menu_closes_after_navigation',await p.$eval('#mobile-menu',e=>!e.open));}
 }
 const reduced=await browser.newPage();await reduced.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await reduced.setViewport({width:390,height:844});await reduced.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});await reduced.waitForSelector('.vehicle-card',{timeout:20000});assert('reduced_motion_content_visible',await reduced.evaluate(()=>getComputedStyle(document.querySelector('h1')).opacity==='1'&&document.documentElement.scrollWidth===innerWidth));await reduced.close();
 const bad=await browser.newPage();await bad.setRequestInterception(true);bad.on('request',req=>{if(req.url().includes('/functions/getPublicCatalog')){req.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({organization:{id:'other-business'},vehicles:[{id:'abcdefabcdefabcdefabcdef',model:'FOREIGN-CAR'}]})})}else req.continue()});await bad.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});await bad.waitForFunction(()=>document.documentElement.dataset.catalog==='snapshot',{timeout:23000});assert('foreign_catalog_rejected',await bad.evaluate(()=>!document.body.textContent.includes('FOREIGN-CAR')&&document.documentElement.dataset.catalog!=='live'));await bad.close();
 assert('no_browser_javascript_errors',errors.length===0,{errors});
 const report={tested_at:new Date().toISOString(),target:BASE,results,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,errors,responses,limits:['Browser test is not live Xanadria CRM integration.','Source is the existing public Keez catalog.','Sold archive contains no records until connected.','No real WhatsApp or contact message was sent.','Visual review is not a WCAG certification or field Core Web Vitals measurement.']};
 fs.writeFileSync(path.join(__dirname,'STUDIO_BROWSER_ACCEPTANCE.json'),JSON.stringify(report,null,2));await browser.close();console.log('SUMMARY',JSON.stringify({passed:report.passed,failed:report.failed}));process.exitCode=report.failed?1:0;
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(__dirname,'STUDIO_BROWSER_FAILURE.json'),JSON.stringify({error:String(e),stack:e.stack,results},null,2));process.exit(1)});
