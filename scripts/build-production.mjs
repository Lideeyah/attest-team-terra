import {build} from 'esbuild';
import {mkdir,readFile} from 'node:fs/promises';
import './check-secrets.mjs';
await mkdir('dist/production',{recursive:true});
for(const [name,entry]of Object.entries({main:'src/main.ts',worker:'src/worker.ts',migrate:'scripts/migrate.ts'})){
 const output=`dist/production/${name}.mjs`;
 await build({entryPoints:[entry],outfile:output,bundle:true,platform:'node',format:'esm',target:'node24',packages:'external',define:{__ATTEST_DEV__:'false','process.env.NODE_ENV':'"production"'},minifySyntax:true,sourcemap:false});
 const source=await readFile(output,'utf8');for(const marker of ['/api/dev/trigger','/dev/states','registerDevTools','embedded-db','local-settings.json'])if(source.includes(marker))throw Error(`Development tooling leaked into ${name}`);
}
console.log('Production API, worker and migrator built; development tools absent.');
