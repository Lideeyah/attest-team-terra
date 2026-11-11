import {spawn} from 'node:child_process';
const node=process.execPath,port=process.env.PORT||'3000';
const backendEnv={...process.env,PORT:'8080',HOST:'127.0.0.1'};
const frontendEnv={...process.env,PORT:port,ATTEST_API_MODE:'live',ATTEST_API_ORIGIN:'http://127.0.0.1:8080',ATTEST_INTERNAL_URL:`http://127.0.0.1:${port}`};
const children=[spawn(node,['dist/src/main.js'],{cwd:new URL('../backend/',import.meta.url),env:backendEnv,stdio:'inherit'}),spawn(node,['dist/src/worker.js'],{cwd:new URL('../backend/',import.meta.url),env:backendEnv,stdio:'inherit'}),spawn(node,['node_modules/next/dist/bin/next','start','--port',port],{env:frontendEnv,stdio:'inherit'})];
let stopping=false;function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
for(const child of children){child.on('error',()=>stop(1));child.on('exit',code=>stop(code??1));}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
