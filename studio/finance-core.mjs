/** Fixed-rate, non-indexed simulation. No lender offer, eligibility or APR claim. */
const MAX_PRICE = 10_000_000;
export function calculateLoan(input) {
  if (!input || typeof input !== 'object') throw new RangeError('חסרים נתוני חישוב');
  const values = { price: input.price, downPayment: input.downPayment, annualRate: input.annualRate,
    months: input.months, balloon: input.balloon ?? 0, fees: input.fees ?? 0 };
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`נתון לא תקין: ${key}`);
  }
  const {price, downPayment, annualRate, months, balloon, fees} = values;
  if (price <= 0 || price > MAX_PRICE) throw new RangeError('מחיר הרכב חייב להיות חיובי');
  if (downPayment < 0 || downPayment > price) throw new RangeError('המקדמה צריכה להיות בין אפס למחיר הרכב');
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new RangeError('מספר התשלומים צריך להיות שלם ובין 1 ל־120');
  if (annualRate < 0 || annualRate > 50) throw new RangeError('הריבית לחישוב צריכה להיות בין 0% ל־50%');
  if (fees < 0 || fees > MAX_PRICE) throw new RangeError('עמלות אינן יכולות להיות שליליות');
  const principal = price - downPayment;
  if (balloon < 0 || balloon > principal) throw new RangeError('תשלום הסיום אינו יכול לעלות על סכום ההלוואה');
  if (principal === 0 && (fees !== 0 || balloon !== 0)) throw new RangeError('בתשלום מלא אין הלוואה לחישוב');
  const r = annualRate / 1200;
  const discount = Math.exp(-months * Math.log1p(r));
  const denominator = -Math.expm1(-months * Math.log1p(r));
  const monthlyPayment = principal === 0 ? 0 : r === 0 ? (principal - balloon) / months
    : (principal - balloon * discount) * r / denominator;
  const totalInstallments = monthlyPayment * months;
  const totalLoanRepayment = totalInstallments + balloon;
  const interest = Math.max(0, totalLoanRepayment - principal);
  const financingCost = interest + fees;
  const totalCashOutlay = downPayment + totalLoanRepayment + fees;
  // Return unrounded math. Display rounds only; actual lender's final installment may differ.
  return Object.freeze({...values, principal, monthlyPayment, totalInstallments, totalLoanRepayment,
    interest, financingCost, totalCashOutlay,
    finalMonthPayment: monthlyPayment + balloon,
    assumptions: 'Fixed nominal annual rate, monthly end-of-period payments, no indexation; fees paid upfront, not financed.'});
}

export function normalizeIsraeliPhone(raw) {
  if (typeof raw !== 'string' || raw.length > 40 || !/^[+\d\s().-]+$/.test(raw)) throw new RangeError('הזינו מספר נייד תקין');
  let s = raw.replace(/[\s().-]/g, '');
  if (s.startsWith('+972')) s = '0' + s.slice(4);
  else if (s.startsWith('972')) s = '0' + s.slice(3);
  if (!/^05\d{8}$/.test(s)) throw new RangeError('הזינו מספר נייד ישראלי בן 10 ספרות');
  return s;
}

export function normalizeLead(input) {
  const allowed = new Set(['idempotencyKey','name','phone','intent','channel','message','vehicle','finance','attribution','consent','privacyVersion','website']);
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k=>!allowed.has(k))) throw new RangeError('מבנה פנייה לא תקין');
  function text(v, limit, label) {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string' || v.length > limit || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v)) throw new RangeError(`שדה לא תקין: ${label}`);
    return v.trim();
  }
  const name = text(input.name, 80, 'שם');
  if (name.length < 2) throw new RangeError('הזינו שם כדי שנדע למי לחזור');
  const phone = normalizeIsraeliPhone(input.phone);
  if (!['availability','finance','trade-in','find-car'].includes(input.intent)) throw new RangeError('בחרו את נושא הפנייה');
  if (!['phone','whatsapp'].includes(input.channel)) throw new RangeError('בחרו דרך ליצירת קשר');
  if (input.consent !== true || input.privacyVersion !== 'vdrive-intake-v1') throw new RangeError('יש לאשר יצירת קשר לגבי הבקשה');
  const idempotencyKey = text(input.idempotencyKey, 36, 'מזהה פנייה');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) throw new RangeError('מזהה הפנייה לא תקין');
  const message = text(input.message, 900, 'הערה');
  const website = text(input.website, 100, 'website');
  let vehicle = null;
  if (input.vehicle != null) {
    const v = input.vehicle;
    if (!v || typeof v !== 'object' || Object.keys(v).some(k=>!['id','title','price','observedAt','fresh'].includes(k)) || !/^[a-f0-9]{24}$/.test(v.id || '')) throw new RangeError('פרטי הרכב לא תקינים');
    if (v.price != null && (typeof v.price !== 'number' || !Number.isFinite(v.price) || v.price <= 0 || v.price > MAX_PRICE)) throw new RangeError('מחיר הרכב לא תקין');
    const observedAt = text(v.observedAt, 35, 'זמן מקור');
    if (observedAt && !Number.isFinite(Date.parse(observedAt))) throw new RangeError('זמן המקור אינו תקין');
    vehicle = { id:v.id, title:text(v.title,140,'רכב'), price:v.price ?? null, observedAt, fresh:v.fresh === true };
  }
  let finance = null;
  if (input.finance != null) {
    if (!vehicle || vehicle.price == null) throw new RangeError('נדרש רכב לחישוב המימון');
    const f=input.finance;
    if (typeof f !== 'object' || Object.keys(f).some(k=>!['price','downPayment','annualRate','months','balloon','fees'].includes(k))) throw new RangeError('נתוני מימון לא תקינים');
    if (f.price !== vehicle.price) throw new RangeError('מחיר החישוב אינו תואם למחיר הרכב שבפנייה');
    const {price, downPayment, annualRate, months, balloon, fees, monthlyPayment, financingCost, totalCashOutlay} = calculateLoan(f);
    finance = {price, downPayment, annualRate, months, balloon, fees, monthlyPayment, financingCost, totalCashOutlay};
  }
  const attribution = {};
  if (input.attribution != null) {
    if (typeof input.attribution !== 'object' || Array.isArray(input.attribution)) throw new RangeError('מקור פנייה לא תקין');
    for (const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
      const v=text(input.attribution[k],100,k);
      // Deliberately exclude raw URLs, emails, phone numbers and click IDs from attribution.
      if (v && !/[?@:/]/.test(v) && !/\d{8}/.test(v)) attribution[k]=v;
    }
  }
  return {idempotencyKey,name,phone,intent:input.intent,channel:input.channel,message,vehicle,finance,attribution,consent:true,privacyVersion:input.privacyVersion,website};
}
