import ts from 'typescript';
import {readdir,readFile} from 'node:fs/promises';
async function scan(directory){for(const entry of await readdir(directory,{withFileTypes:true})){if(entry.name==='dist')continue;const path=directory+'/'+entry.name;if(entry.isDirectory())await scan(path);else if(/\.tsx?$/.test(path)){const source=ts.createSourceFile(path,await readFile(path,'utf8'),ts.ScriptTarget.Latest,true);const visit=node=>{if(node.kind===ts.SyntaxKind.AnyKeyword){const pos=source.getLineAndCharacterOfPosition(node.getStart(source));throw Error(`Explicit any is forbidden: ${path}:${pos.line+1}`);}ts.forEachChild(node,visit);};visit(source);}}}
for(const directory of ['src','scripts','tests','packages/contracts/src'])await scan(directory);
console.log('Type safety gate passed: no explicit any types.');
