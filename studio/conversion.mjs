import { calculateLoan, normalizeLead } from './finance-core.mjs';

const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:2}).format(n);
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.5"/></svg>';
const labels={availability:'פרטים וזמינות',finance:'בירור אפשרויות מימון','trade-in':'טרייד־אין','find-car':'איתור רכב'};
const title = car => `${car.displayTitle || [car.manufacturer,car.model].join(' ')} · ${car.year??''}`;
let currentFinance=null, quote=null, leadContext={vehicle:null,finance:null}, submitting=false, previousSignature='', requestId='', retryPayload=null;
const simulations = new Map();
const attribution={};
for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const v=new URL(location.href).searchParams.get(k);if(v&&v.length<=100&&!/[?@:/]/.test(v)&&!/\d{8}/.test(v))attribution[k]=v}
function metric(event,vehicleId=null){
 // No tracker installed. Consumers must configure a consent-aware collector. Never include PII/loan values here.
 window.dispatchEvent(new CustomEvent('vdrive:conversion-event',{detail:{event,vehicleId}}));
}
function getCar(id){return window.VdriveApp?.getCars().find(v=>v.id===id)}
function getStatus(){return window.VdriveApp?.getStatus()||{fresh:false,observedAt:''}}
function intakeEndpoint(){
 const config=window.VDRIVE_INTAKE_CONFIG;
 if(config?.enabled!==true||typeof config.endpoint!=='string')return null;
 try{const u=new URL(config.endpoint,location.href);return u.origin===location.origin&&u.pathname==='/api/leads'&&!u.search&&!u.hash?u.href:null}catch{return null}
}
function leadMode(){
 const ready=!!intakeEndpoint();
 $('#lead-submit-label').textContent=ready?'שלחו בקשה לחזרה אליי':'המשך לפנייה לצוות Vdrive ב־WhatsApp';
 $('#lead-storage-note').textContent=ready?'נציג אישור רק אחרי שהפנייה נשמרה. אישור פנייה אינו אישור מימון או הזמנה.':'עד לחיבור שמירת הפניות ב־Sites, הבקשה תיפתח ב־WhatsApp לשליחה ידנית. אין עדיין שמירה אוטומטית.';
}
function numeric(id){const s=$(id).value.trim();return s===''?NaN:Number(s)}
function resetResult(message='הזינו ריבית כדי לחשב את ההחזר.'){
 quote=null;$('#finance-monthly').textContent='—';$('#finance-result-hint').textContent=message;
 for(const s of ['#finance-principal','#finance-final','#finance-cost','#finance-total'])$(s).textContent='—';
 $('#finance-request').disabled=true;
}
function inputs(){return {price:currentFinance.asking_price,downPayment:numeric('#finance-down'),annualRate:numeric('#finance-rate'),months:numeric('#finance-months'),balloon:numeric('#finance-balloon'),fees:numeric('#finance-fees')}}
function calculate(){
 if(!currentFinance)return;
 $('#finance-error').hidden=true;
 try{
  const latest=getCar(currentFinance.id);
  if(!latest || latest.asking_price!==currentFinance.asking_price)throw new RangeError('פרטי הרכב השתנו. סגרו את המחשבון ופתחו אותו מחדש מהקטלוג המעודכן.');
  const input=inputs();
  if(Number.isNaN(input.annualRate)){resetResult();return}
  quote=calculateLoan(input);
  $('#finance-monthly').textContent=money(quote.monthlyPayment);
  $('#finance-result-hint').textContent=quote.principal===0?'לפי המקדמה שבחרתם, אין צורך בהלוואה.':`${quote.months} תשלומים · ריבית שנתית ${quote.annualRate}%${quote.balloon?` · ועוד תשלום סיום ${money(quote.balloon)}`:' · ללא תשלום סיום נוסף'}`;
  $('#finance-principal').textContent=money(quote.principal);$('#finance-final').textContent=money(quote.balloon);
  $('#finance-cost').textContent=money(quote.financingCost);$('#finance-total').textContent=money(quote.totalCashOutlay);
  $('#finance-request').disabled=false;
  simulations.set(currentFinance.id,{input,result:quote});
  refreshCardSummaries();metric('finance_calculated',currentFinance.id);
 }catch(error){resetResult('תקנו את השדה כדי לקבל חישוב.');$('#finance-error').textContent=error.message;$('#finance-error').hidden=false;metric('finance_validation_error',currentFinance.id)}
}
function refreshCardSummaries(){
 document.querySelectorAll('[data-finance]').forEach(button=>{
  const id=button.dataset.finance,car=getCar(id),saved=simulations.get(id);
  if(saved&&car?.asking_price!==saved.input.price){simulations.delete(id)}
  if(!button.classList.contains('finance-card-button'))return;
  button.setAttribute('aria-label',`מחשבון מימון עבור ${car?title(car):'הרכב'}`);
  const entry=button.closest('.finance-card-entry');let summary=entry.querySelector('.finance-card-summary');
  if(!simulations.has(id)){summary?.remove();return}
  const {input,result}=simulations.get(id);
  if(!summary){summary=document.createElement('p');summary.className='finance-card-summary';entry.append(summary)}
  summary.textContent=`חישוב שלכם: ${money(result.monthlyPayment)} לחודש · מקדמה ${money(input.downPayment)} · ${input.months} חודשים · ${input.annualRate}% לשנה${input.balloon?` · בלון ${money(input.balloon)}`:''}. לא הצעה.`;
 });
}
function openFinance(id){
 const car=getCar(id);
 if(!car||!(car.asking_price>0)){window.dispatchEvent(new CustomEvent('vdrive:request-lead',{detail:{intent:'finance',id}}));return}
 const saved=simulations.get(id);
 currentFinance=car;
 if($('#vehicle-dialog').open)$('#vehicle-dialog').close();
 const status=getStatus();
 $('#finance-vehicle').innerHTML=`<div><b dir="auto">${esc(title(car))}</b><span>מחיר קטלוג: ${money(car.asking_price)}</span></div><small>${status.fresh?'נקרא מהקטלוג; זמינות עדיין דורשת אישור הסוכנות.':'עותק מתוארך; מחיר וזמינות נוכחיים לא אומתו.'}</small>`;
 $('#finance-down').max=car.asking_price;$('#finance-down-range').max=car.asking_price;
 $('#finance-down').value=saved?.input.downPayment??Math.round(car.asking_price*.2);
 $('#finance-down-range').value=$('#finance-down').value;
 $('#finance-months').value=saved?.input.months??60;$('#finance-rate').value=saved?.input.annualRate??'';
 $('#finance-balloon').value=saved?.input.balloon??0;$('#finance-fees').value=saved?.input.fees??0;
 calculate();$('#finance-dialog').showModal();metric('finance_open',id);
}
function selectLead(intent,id=null,finance=null){
 const car=id?getCar(id):null;
 const status=getStatus();
 leadContext={vehicle:car?{id:car.id,title:title(car),price:car.asking_price,observedAt:status.observedAt,fresh:status.fresh}:null,finance};
 for(const d of document.querySelectorAll('dialog[open]'))d.close();
 const radio=document.querySelector(`input[name="lead-intent"][value="${intent}"]`);if(radio)radio.checked=true;
 const summary=$('#lead-vehicle-summary');summary.hidden=!car;
 if(car){summary.innerHTML=`<span>הבקשה שלכם</span><strong dir="auto">${esc(title(car))}</strong><p>${finance?`מקדמה ${money(finance.downPayment)} · ${finance.months} חודשים · ${finance.annualRate}% לחישוב${finance.balloon?` · תשלום סיום ${money(finance.balloon)}`:''}`:'בירור מחיר, פרטים וזמינות לרכב שבחרתם'}</p><button type="button" id="clear-lead-car">ביטול בחירת הרכב</button>`;$('#clear-lead-car').onclick=()=>selectLead('find-car')}
 $('#lead-success').hidden=true;$('#lead-error').hidden=true;$('#lead-submit').disabled=false;
 $('#contact').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 $('#lead-name').focus({preventScroll:true});metric('lead_start',id);
}
function rawLead(){
 if(leadContext.vehicle){
  const latest=getCar(leadContext.vehicle.id);
  if(!latest || latest.asking_price!==leadContext.vehicle.price)throw new RangeError('הרכב או המחיר השתנו מאז הבחירה. בחרו את הרכב מחדש לפני שליחת הפנייה.');
  const status=getStatus();leadContext.vehicle.fresh=status.fresh;leadContext.vehicle.observedAt=status.observedAt;
 }
 const raw={name:$('#lead-name').value,phone:$('#lead-phone').value,intent:document.querySelector('input[name="lead-intent"]:checked').value,
  channel:document.querySelector('input[name="lead-channel"]:checked').value,message:$('#lead-message').value,
  consent:$('#lead-consent').checked,privacyVersion:'vdrive-intake-v1',website:$('#lead-website').value,
  vehicle:leadContext.vehicle,finance:leadContext.finance,attribution};
 // Same payload keeps the same idempotency key after timeout; editing it starts a new request.
 const signature=JSON.stringify({...raw,vehicle:raw.vehicle?{id:raw.vehicle.id,title:raw.vehicle.title,price:raw.vehicle.price}:null});
 if(signature!==previousSignature){requestId=crypto.randomUUID();previousSignature=signature;retryPayload=null}
 if(retryPayload)return structuredClone(retryPayload);
 raw.idempotencyKey=requestId;
 const checked=normalizeLead(raw);raw.name=checked.name;raw.phone=checked.phone;
 retryPayload=structuredClone(raw);
 return raw;
}
function prepareMessage(raw){
 const lines=[`שלום צוות Vdrive, אני ${raw.name}. אשמח ל${labels[raw.intent]}.`,`טלפון לחזרה: ${raw.phone}. דרך מועדפת: ${raw.channel==='phone'?'שיחה':'WhatsApp'}.`];
 if(raw.vehicle)lines.push(`רכב: ${raw.vehicle.title}. מזהה קטלוג: ${raw.vehicle.id}. המחיר טעון אימות.`);
 if(raw.finance){const q=calculateLoan(raw.finance);lines.push(`סימולציה בלבד: מחיר ${money(q.price)}, מקדמה ${money(q.downPayment)}, ${q.months} חודשים, ריבית שנתית ${q.annualRate}%.`,`החזר משוער ${money(q.monthlyPayment)}, תשלום סיום נוסף ${money(q.balloon)}, עמלות במזומן ${money(q.fees)}. סך הכול כולל מקדמה ${money(q.totalCashOutlay)}. זו אינה הצעה או בקשה לאישור אשראי אוטומטי.`)}
 if(raw.message)lines.push(raw.message);
 return 'https://wa.me/972544555365?text='+encodeURIComponent(lines.join('\n'));
}
async function submitLead(e){
 e.preventDefault();if(submitting)return;
 $('#lead-error').hidden=true;$('#lead-success').hidden=true;
 let payload;
 try{payload=rawLead()}catch(error){$('#lead-error').textContent=error.message;$('#lead-error').hidden=false;metric('lead_validation_error');return}
 const endpoint=intakeEndpoint();
 if(!endpoint){
  window.open(prepareMessage(payload),'_blank','noopener,noreferrer');
  $('#lead-success').textContent='הבקשה הוכנה ב־WhatsApp. עדיין צריך ללחוץ שם על שליחה; הפנייה לא נשמרה באתר.';$('#lead-success').hidden=false;metric('whatsapp_open',payload.vehicle?.id||null);return;
 }
 submitting=true;$('#lead-submit').disabled=true;$('#lead-submit-label').textContent='שומרים את הפנייה…';
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),14000);
 try{
  const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:control.signal});
  let data={};try{data=await response.json()}catch{}
  if(!response.ok||data.saved!==true||!/^[a-f0-9-]{36}$/i.test(data.id||''))throw new Error(data.message||'לא התקבל אישור שמירה. נסו שוב או פנו ישירות לצוות Vdrive.');
  $('#lead-success').textContent=`הפנייה נשמרה. מספר הפנייה: ${data.id.slice(0,8)}. זו בקשה לחזרה — לא אישור זמינות, פגישה או מימון.`;$('#lead-success').hidden=false;metric('lead_saved',payload.vehicle?.id||null);
 }catch(error){$('#lead-error').textContent=error.name==='AbortError'?'טרם התקבל אישור מהשרת. ניסיון חוזר של אותה בקשה לא אמור ליצור כפילות. אפשר גם לפנות לצוות Vdrive.':error.message;$('#lead-error').hidden=false;metric('lead_submit_error',payload.vehicle?.id||null)}
 finally{clearTimeout(timer);submitting=false;$('#lead-submit').disabled=false;leadMode()}
}

function init(){
 if(!$('#lead-form'))return;
 document.addEventListener('click',e=>{
  const finance=e.target.closest('[data-finance]'),lead=e.target.closest('[data-lead-vehicle]');
  if(finance){e.preventDefault();openFinance(finance.dataset.finance)}
  if(lead){e.preventDefault();selectLead('availability',lead.dataset.leadVehicle)}
 });
 $('#finance-form').addEventListener('submit',e=>e.preventDefault());
 for(const id of ['finance-down','finance-months','finance-rate','finance-balloon','finance-fees'])$('#'+id).addEventListener('input',()=>{if(id==='finance-down')$('#finance-down-range').value=$('#finance-down').value;calculate()});
 $('#finance-down-range').addEventListener('input',()=>{$('#finance-down').value=$('#finance-down-range').value;calculate()});
 $('#finance-example').addEventListener('click',()=>{$('#finance-rate').value=8;calculate()});
 $('#finance-request').addEventListener('click',()=>{if(quote&&currentFinance)selectLead('finance',currentFinance.id,inputs())});
 $('#finance-dialog .dialog-close').addEventListener('click',()=>$('#finance-dialog').close());
 $('#lead-form').addEventListener('submit',submitLead);
  document.querySelectorAll('input[name="lead-intent"]').forEach(r=>r.addEventListener('change',()=>{if(r.checked && r.value!=='finance' && leadContext.finance){leadContext.finance=null;const summary=$('#lead-vehicle-summary p');if(summary)summary.textContent='הרכב שבחרתם נשאר מצורף לפנייה; חישוב המימון הוסר בהתאם לנושא שבחרתם.'}}));
 $('#lead-privacy-link').addEventListener('click',()=>$('#privacy-dialog').showModal());
 window.addEventListener('vdrive:request-lead',e=>{const {intent='find-car',id=null}=e.detail||{};if(labels[intent])selectLead(intent,id)});
 window.addEventListener('vdrive:catalog-render',()=>{refreshCardSummaries();if($('#finance-dialog').open&&currentFinance)calculate()});
 document.querySelectorAll('[data-lead-global]').forEach(b=>b.addEventListener('click',()=>selectLead('find-car')));
 leadMode();refreshCardSummaries();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
