import { ensure, bankMoney, cents, hash, canonical } from './core.js';
export interface Charge {fee:string;vat:string;stamp_duty:string;}
export interface TariffBand {max:string;fee:string;min?:string;}
export interface Tariff {currency:'NGN';sourceHash:string;bands:TariffBand[];vatBps:number;stampDuty:string;stampThreshold:string;intrabank:Charge;}
export function normalizeTariff(input:unknown):Tariff {
 ensure(typeof input==='object'&&input!==null,'TARIFF_REVIEW_REQUIRED',503);const raw=input as Record<string,unknown>;const candidate=(raw.schedule??raw) as Record<string,unknown>;
 // The deployed gateway publishes worked examples, rather than a bands object.
 // Band boundaries and VAT are specified by v2; every fee and duty comes from the response.
 if(candidate.examples&&typeof candidate.examples==='object'){
  const examples=candidate.examples as Record<string,Record<string,unknown>>;
  const read=(key:string):Charge=>{const r=examples[key];ensure(r&&typeof r==='object','TARIFF_REVIEW_REQUIRED',503);return {fee:bankMoney(r.fee),vat:bankMoney(r.vat),stamp_duty:bankMoney(r.stamp_duty)};};
  const nip=[read('nip_3000'),read('nip_25000'),read('nip_75000')],intra=[read('intrabank_3000'),read('intrabank_25000'),read('intrabank_75000')];
  ensure(intra.every(r=>canonical(r)===canonical(intra[0]))&&nip.every(r=>cents(r.vat)===(cents(r.fee)*750n+5000n)/10000n)&&nip[0].stamp_duty==='0.00'&&nip[1].stamp_duty===nip[2].stamp_duty,'TARIFF_REVIEW_REQUIRED',503);
  return {currency:'NGN',sourceHash:hash(canonical(input)),bands:[{max:'5000.00',fee:nip[0].fee},{max:'50000.00',fee:nip[1].fee},{max:'999999999999.99',fee:nip[2].fee}],vatBps:750,stampDuty:nip[1].stamp_duty,stampThreshold:'10000.00',intrabank:intra[0]};
 }
 const nip=(candidate.interbank??candidate.nip??candidate) as Record<string,unknown>;
 const intra=candidate.intrabank as Record<string,unknown>|undefined;
 ensure(Array.isArray(nip.bands)&&nip.bands.length>0&&nip.bands.length<=50&&intra,'TARIFF_REVIEW_REQUIRED',503);
 const bands=nip.bands.map((entry:unknown)=>{ensure(typeof entry==='object'&&entry!==null,'TARIFF_REVIEW_REQUIRED',503);const b=entry as Record<string,unknown>;return {max:bankMoney(b.max??b.max_amount),fee:bankMoney(b.fee)};}).sort((a,b)=>cents(a.max)<cents(b.max)?-1:1);
 const vatBps=Number(nip.vatBps??nip.vat_bps);ensure(Number.isInteger(vatBps)&&vatBps>=0&&vatBps<=10000,'TARIFF_REVIEW_REQUIRED',503);
 return {currency:'NGN',sourceHash:hash(canonical(input)),bands,vatBps,stampDuty:bankMoney(nip.stampDuty??nip.stamp_duty),stampThreshold:bankMoney(nip.stampThreshold??nip.stamp_threshold),intrabank:{fee:bankMoney(intra.fee),vat:bankMoney(intra.vat),stamp_duty:bankMoney(intra.stamp_duty)}};
}
export function charges(tariff:Tariff,amount:string,bankCode:string):Charge {
 if(bankCode==='000014')return tariff.intrabank;
 const band=tariff.bands.find(b=>cents(amount)<=cents(b.max));ensure(band,'TARIFF_REVIEW_REQUIRED',503);
 const fee=cents(band.fee),vat=(fee*BigInt(tariff.vatBps)+5000n)/10000n;
 const format=(n:bigint)=>`${n/100n}.${(n%100n).toString().padStart(2,'0')}`;
 return {fee:band.fee,vat:format(vat),stamp_duty:cents(amount)>=cents(tariff.stampThreshold)?tariff.stampDuty:'0.00'};
}
