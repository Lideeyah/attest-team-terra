import {describe,it,expect} from 'vitest';
import {adaptRequest,adaptResponse} from './wire';
describe('implemented backend contracts',()=>{
  it('preserves reconciliation differences without inventing candidate causes',()=>{
    const result=adaptResponse('/api/projects/p/reconciliation',{projectId:'p',bankBalance:'100.00',charges:'2.00',difference:'-12.34',status:'mismatch'}) as {delta:string;candidateCauses:string[]}[];
    expect(result[0].delta).toBe('-12.34');expect(result[0].candidateCauses).toEqual([]);
  });
  it('uses signed historical denominators and excludes superseded periods',()=>{
    const document={projectId:'p',period:'2026',enrolledCount:500,paidCount:300,amountCommitted:'300.00',amountMovedToHouseholds:'200.00',chargesBorne:'0.00',shortfall:'100.00',confirmationCount:150,closedAt:'2027-01-01T00:00:00Z'};
    const result=adaptResponse('/api/public/projects/p',{id:'p',enrolled:900,commitment:{percentage:60},attestations:[{id:'old',document},{id:'new',document:{...document,paidCount:350,supersedes:'old'}}]}) as {project:{periods:{enrolled:number;paid:number}[]}};
    expect(result.project.periods).toHaveLength(1);expect(result.project.periods[0].enrolled).toBe(500);expect(result.project.periods[0].paid).toBe(350);
  });
  it('maps exclusions and monetary alert percentages to the implemented request shapes',()=>{
    expect(adaptRequest('/api/runs/r/preflight','POST',{excluding:[{participantId:'p',reason:'reviewed'}]},undefined).body).toEqual({exclusions:[{participantId:'p',reason:'reviewed'}]});
    expect(adaptRequest('/api/verifier/alerts','POST',{condition:'coverage-below',threshold:0.5},undefined).body).toEqual({condition:'coverage_below',threshold:50});
  });
});
