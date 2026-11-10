import { mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('This installer is for Windows x64. Use the official installer for your platform.');
}
const directory = new URL('../.tools/bin/', import.meta.url);
const destination = new URL('kubectl.exe', directory);
const requested = process.argv[2];
if (requested && !/^v\d+\.\d+\.\d+$/.test(requested)) throw new Error('Expected a release such as v1.35.0.');

async function download(path) {
  for (const origin of ['https://dl.k8s.io', 'https://cdn.dl.k8s.io']) {
    try {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(path.endsWith('.exe') ? 180_000 : 30_000) });
      if (!response.ok) continue;
      return Buffer.from(await response.arrayBuffer());
    } catch (error) { console.log(`Official download attempt failed: ${error.name}. Trying the alternate official endpoint.`); }
  }
  throw new Error('Cannot reach the official Kubernetes download servers.');
}
const version = requested ?? (await download('/release/stable.txt')).toString().trim();
if (!/^v\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid upstream release response.');
console.log(`Downloading official kubectl ${version} for Windows x64.`);
const path = `/release/${version}/bin/windows/amd64/kubectl.exe`;
const binary = await download(path);
const expected = (await download(path + '.sha256')).toString().trim().toLowerCase();
const actual = createHash('sha256').update(binary).digest('hex');
if (!/^[a-f0-9]{64}$/.test(expected) || expected !== actual) throw new Error('kubectl checksum verification failed.');
await mkdir(directory, { recursive: true });
const pending = new URL('kubectl.download', directory);
await writeFile(pending, binary);
await rename(pending, destination);
await writeFile(new URL('kubectl-version.txt', directory), version + '\n');
console.log(`Verified SHA-256 and installed ${fileURLToPath(destination)}.`);
