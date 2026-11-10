import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {PDFParse} from 'pdf-parse';
import {hash,ensure} from '../src/core.js';
import {MemoryStore} from '../src/store.js';
import {Providers,extractionCandidates} from '../src/providers.js';
import reference from '../data/plan-vivo-tgb.json' with {type:'json'};

ensure(process.env.NODE_ENV!=='production','FORBIDDEN',403);
await mkdir('output/plan-vivo',{recursive:true});await mkdir('demo',{recursive:true});
const documents=[{file:'tgb-pdd.pdf',url:reference.record.sources[0].url,sha256:reference.record.sources[0].sha256},{file:'tgb-annual-report-2024.pdf',url:'https://s3.eu-west-2.amazonaws.com/assets.planvivo.org/documents/PV-Climate-Certified-Projects/TGB-Project-Documents/trees-for-global-benefits-annual-report-2024.pdf'}];
const sources=[];
for(const doc of documents){
 const path='output/plan-vivo/'+doc.file;let bytes:Buffer;
 try{bytes=await readFile(path);}catch(error){if(!(error&&typeof error==='object'&&'code'in error&&error.code==='ENOENT'))throw error;const response=await fetch(doc.url,{signal:AbortSignal.timeout(60000)});ensure(response.ok,'REGISTRY_UNREACHABLE',503);bytes=Buffer.from(await response.arrayBuffer());await writeFile(path,bytes);}
 ensure(bytes.subarray(0,5).toString()==='%PDF-','PDD_UNREADABLE',422);if(doc.sha256)ensure(hash(bytes)===doc.sha256,'SOURCE_CHANGED_REVIEW_REQUIRED',409);
 sources.push({...doc,sha256:hash(bytes),bytes:bytes.length});
}
const parser=new PDFParse({data:await readFile('output/plan-vivo/tgb-pdd.pdf')});
try{
 const result=await parser.getText(),pages=result.pages.map(p=>p.text);
 // PDF engines differ in line wrapping. Compare a whitespace-normalized source excerpt.
 ensure(pages[reference.commitment.page-1]?.replace(/\s+/g,' ').includes(reference.commitment.source_quote.replace(/\s+/g,' ')),'SOURCE_CHANGED_REVIEW_REQUIRED',409);
 const selected=extractionCandidates(pages);ensure(selected.some(c=>c.page===reference.commitment.page),'PDD_NO_COMMITMENT',422);
 const proposal=await new Providers(new MemoryStore()).extract(pages);ensure(proposal.percentage===60&&proposal.page===47,'EXTRACTION_LOW_CONFIDENCE',422);
 await writeFile('output/plan-vivo/extraction-proposal.json',JSON.stringify({...proposal,requiresReview:true},null,2));
 await writeFile('output/plan-vivo/sources.json',JSON.stringify({documents:sources},null,2));
 await copyFile('output/plan-vivo/tgb-annual-report-2024.pdf','demo/tgb-annual-report-2024.pdf');
 await writeFile('demo/sources.json',JSON.stringify({documents:sources,commitment:{sourceLocator:reference.commitment.sourceLocator,page:reference.commitment.page,specifiedSourceLocator:reference.commitment.specifiedSourceLocator,sourceAlignment:reference.commitment.sourceAlignment}},null,2));
 console.log(JSON.stringify({project:reference.record.name,pddPages:pages.length,candidatePages:selected.map(c=>c.page),proposal:{percentage:proposal.percentage,page:proposal.page,requiresReview:true},assets:'output/plan-vivo'},null,2));
}finally{await parser.destroy();}
