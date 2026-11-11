import { ensure } from './core.js';
export function capabilityPath(template:string|undefined,account:string){ensure(template&&template.startsWith('/')&&!template.includes('://')&&template.includes('{account}'),'BANK_CAPABILITY_UNCONFIGURED',503);return template.replaceAll('{account}',encodeURIComponent(account));}
