import { ensure, bankMoney, cents, hash, canonical } from './core.js';
export interface Charge {fee:string;vat:string;stamp_duty:string;}
export interface TariffBand {max:string;fee:string;min?:string;}
export interface Tariff {currency:'NGN';sourceHash:string;bands:TariffBand[];vatBps:number;stampDuty:string;stampThreshold:string;intrabank:Charge;}
export function normalizeTariff(input:unknown):Tariff {
 ensure(typeof input==='object'&&input!==null,'TARIFF_REVIEW_REQUIRED',503);const raw=input as Record<string,unknown>;const candidate=(raw.schedule??raw) as Record<string,unknown>;
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
