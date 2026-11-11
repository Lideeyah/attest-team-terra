import {spawnSync} from 'node:child_process';
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,ATTEST_API_MODE:'live',ATTEST_DEV_TOOLS:'0',NEXT_DIST_DIR:'.next',ATTEST_API_ORIGIN:process.env.ATTEST_API_ORIGIN||'http://127.0.0.1:8080'}});
process.exit(result.status??1);
