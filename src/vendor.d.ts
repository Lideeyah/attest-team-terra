import 'fastify';
declare global{const __ATTEST_DEV__:boolean;}
declare module 'fastify' {interface FastifyRequest {rawBody?:string;}}
