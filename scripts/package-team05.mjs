import {cp,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawnSync} from 'node:child_process';
await mkdir('.release/frontend/.next',{recursive:true});
await mkdir('.release/backend/dist',{recursive:true});
await cp('.next/standalone','.release/frontend',{recursive:true});
await cp('.next/static','.release/frontend/.next/static',{recursive:true});
await cp('public','.release/frontend/public',{recursive:true});
for(const name of ['node_modules','public','migrations','packages','package.json'])await cp('backend/'+name,'.release/backend/'+name,{recursive:true,dereference:true});
await cp('backend/dist/production','.release/backend/dist/production',{recursive:true});
const sums=[];
for(const name of ['frontend','backend']){
  const result=spawnSync('tar',['-czf',`.release/${name}.tar.gz`,'-C',`.release/${name}`,'.'],{stdio:'inherit'});
  if(result.status!==0)throw Error('Packaging failed: '+name);
  const digest=createHash('sha256');for await(const chunk of createReadStream(`.release/${name}.tar.gz`))digest.update(chunk);
  sums.push(digest.digest('hex')+`  ${name}.tar.gz`);
}
await writeFile('.release/SHA256SUMS',sums.join('\n')+'\n');
