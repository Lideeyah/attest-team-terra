import reference from '../data/plan-vivo-tgb.json' with {type:'json'};
import {row} from '../src/core.js';
import type {Store} from '../src/store.js';
import type {Principal} from '../src/core.js';

export async function alignDemoFixture(db:Store,principal:Principal){
 for(const p of await db.list('projects',{registryId:reference.record.registryId,organisationId:principal.organisationId})){
  await db.lock('demo-direction:'+p.id,async tx=>{
   const project=await tx.get('projects',p.id);if(!project)return;
   await tx.put('projects',{...project,isDemonstration:true,referenceStatistics:reference.record.referenceStatistics,operator:reference.record.operator});
   const latest=(await tx.list('commitments',{projectId:p.id,accepted:true})).at(-1);
   if(latest?.specificationVersion==='2026-11-10-consolidated')return;
   const commitment=await tx.put('commitments',row({...reference.commitment,id:'demo-direction-v4:'+p.id,projectId:p.id,percentage:Number(reference.commitment.source_quote.match(/(\d+(?:\.\d+)?)%/)![1]),accepted:true,original:!latest,supersedes:latest?.id,reason:'Align payment cadence and source metadata with the consolidated backend specification; preserve signed histories.',specificationVersion:'2026-11-10-consolidated'}));
   for(const run of await tx.list('runs',{projectId:p.id,state:'draft'}))if(!(await tx.list('transfers',{runId:run.id})).length)await tx.put('runs',{...run,commitmentId:commitment.id});
  });
 }
}
