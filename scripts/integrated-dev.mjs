import { spawn } from 'node:child_process';
const port=process.env.PORT||'3000';
const env = { ...process.env, ATTEST_API_MODE: 'live', ATTEST_API_ORIGIN: process.env.ATTEST_API_ORIGIN || 'http://127.0.0.1:8080', ATTEST_INTERNAL_URL: `http://localhost:${port}`, NEXT_PUBLIC_API_BASE_URL: '', NEXT_PUBLIC_ATTEST_API_MODE: 'live' };
const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], { env, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', code => process.exit(code ?? 1));
