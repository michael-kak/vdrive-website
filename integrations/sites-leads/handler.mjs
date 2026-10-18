import { normalizeLead } from '../../studio/finance-core.mjs';

/** Mount at POST /api/leads in the identified Vdrive Site's existing runtime.
 * It accepts enquiries, not loan applications. No public read endpoint, no notifications sent here.
 * Required server-only bindings: DB, PUBLIC_ORIGIN, LEAD_HMAC_SECRET, INTAKE_PRIVACY_APPROVED.
 */
const LIMIT=8192, WINDOW=15*60, MAX_ATTEMPTS=5;
const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'"}});
const fail=(status,message)=>response(status,{saved:false,message});
async function hmac(secret,value){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
async function boundedJson(request){
 const stated=request.headers.get('content-length');
 if(stated&&(!/^\d+$/.test(stated)||Number(stated)>LIMIT))throw new RangeError('BODY_TOO_LARGE');
 if(!request.body)throw new RangeError('EMPTY_BODY');
 const reader=request.body.getReader();let total=0,chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>LIMIT){await reader.cancel();throw new RangeError('BODY_TOO_LARGE')}chunks.push(value)}}finally{reader.releaseLock()}
 const data=new Uint8Array(total);let offset=0;for(const part of chunks){data.set(part,offset);offset+=part.length}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
}
export async function handleLead(request,env){
 if(new URL(request.url).pathname!=='/api/leads')return fail(404,'לא נמצא');
 if(request.method!=='POST')return fail(405,'שיטה לא נתמכת');
 if(!env?.DB||typeof env.PUBLIC_ORIGIN!=='string'||typeof env.LEAD_HMAC_SECRET!=='string'||env.LEAD_HMAC_SECRET.length<32||env.INTAKE_PRIVACY_APPROVED!=='true')return fail(503,'שמירת הפניות עדיין לא הופעלה. פנו ישירות ליובל.');
 let expected;
 try{expected=new URL(env.PUBLIC_ORIGIN);if(expected.origin!==env.PUBLIC_ORIGIN||expected.protocol!=='https:')throw Error()}catch{return fail(503,'הגדרת האתר טרם הושלמה');}
 if(new URL(request.url).origin!==expected.origin||request.headers.get('origin')!==expected.origin||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'הפנייה לא נשלחה מהאתר המורשה');
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return fail(415,'פורמט פנייה לא נתמך');
 // Must be set by a trusted Sites edge, never accept client-supplied X-Forwarded-For.
 const clientIp=request.headers.get('cf-connecting-ip');
 if(!clientIp||clientIp.length>64||!/^[0-9a-fA-F.:]+$/.test(clientIp))return fail(503,'לא ניתן לאמת את מקור הבקשה כעת');
 let normalized;
 try{normalized=normalizeLead(await boundedJson(request))}catch(e){return fail(e.message==='BODY_TOO_LARGE'?413:400,e instanceof RangeError&&e.message!=='BODY_TOO_LARGE'?e.message:'פרטי הפנייה אינם תקינים');}
 if(normalized.website)return fail(400,'לא ניתן לקבל את הפנייה');
 const {idempotencyKey,website,...data}=normalized;
 // Vehicle fields are explicitly client-reported enquiry context, never an authoritative price/stock decision.
 const requestData={...data,vehicleContextVerified:false};
 const digest=await hmac(env.LEAD_HMAC_SECRET,'payload:'+JSON.stringify(requestData));
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 try{
  const prior=await db.prepare('SELECT id,payload_digest FROM vdrive_web_leads WHERE idempotency_key=? AND site_key=?').bind(idempotencyKey,'vdrive').first();
  if(prior){if(prior.payload_digest!==digest)return fail(409,'הבקשה שונתה. שלחו אותה מחדש עם מזהה חדש.');return response(200,{saved:true,id:prior.id,replayed:true})}
  const now=new Date(),epoch=Math.floor(now.getTime()/1000),windowStart=Math.floor(epoch/WINDOW)*WINDOW;
  const requesterHash=await hmac(env.LEAD_HMAC_SECRET,`rate:${clientIp}`);
  const rate=await db.prepare('INSERT INTO vdrive_lead_rate(requester_hash,window_start,attempts) VALUES(?,?,1) ON CONFLICT(requester_hash,window_start) DO UPDATE SET attempts=attempts+1 WHERE attempts<? RETURNING attempts').bind(requesterHash,windowStart,MAX_ATTEMPTS).first();
  if(!rate)return fail(429,'נשלחו כמה פניות בזמן קצר. המתינו מעט או פנו ישירות ליובל.');
  const id=crypto.randomUUID(),created=now.toISOString();
  const insert=db.prepare('INSERT INTO vdrive_web_leads(id,idempotency_key,payload_digest,site_key,created_at,name,phone,intent,contact_channel,request_json,privacy_version,consent_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING').bind(id,idempotencyKey,digest,'vdrive',created,data.name,data.phone,data.intent,data.channel,JSON.stringify(requestData),data.privacyVersion,created);
  const outbox=db.prepare("INSERT INTO vdrive_lead_outbox(lead_id,target,state,created_at,next_attempt_at) SELECT id,'yuval','pending',?,? FROM vdrive_web_leads WHERE idempotency_key=? AND payload_digest=? AND site_key='vdrive' ON CONFLICT(lead_id) DO NOTHING").bind(created,created,idempotencyKey,digest);
  // D1 batch is transactional. Failure must never leave a successful-looking, undeliverable partial intake.
  await db.batch([insert,outbox]);
  const saved=await db.prepare('SELECT id,payload_digest FROM vdrive_web_leads WHERE idempotency_key=? AND site_key=?').bind(idempotencyKey,'vdrive').first();
  if(!saved)throw Error('Missing persisted receipt');
  if(saved.payload_digest!==digest)return fail(409,'הבקשה שונתה. שלחו אותה מחדש עם מזהה חדש.');
  return response(saved.id===id?201:200,{saved:true,id:saved.id,replayed:saved.id!==id});
 }catch{return fail(503,'לא התקבל אישור שמירה. נסו שוב את אותה בקשה או פנו ליובל.');}
}
