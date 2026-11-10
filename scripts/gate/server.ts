import { spawn, type ChildProcess } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

/* The gate's servers. Both are production builds: a development server does
   not hydrate under the headless browser the gate drives, so an assertion
   about anything the client does would pass against a dead page. One build
   carries the developer tooling and the mock server, the other carries
   neither, and they are served side by side from separate output
   directories. */

type RunningServer = {
  baseUrl: string;
  stop: () => void;
};

const READY_TIMEOUT_MS = 300_000;

const TOOLING_PORT = 3123;
const LIVE_PORT = 3124;

const TOOLING_ENV = {
  ATTEST_DEV_TOOLS: "1",
  ATTEST_API_MODE: "mock",
  NEXT_DIST_DIR: ".next-tooling",
  ATTEST_INTERNAL_URL: `http://127.0.0.1:${3123}`,
  /* A secret for the gate's own signing, so the inbound hook's accepting path
     is asserted rather than assumed. */
  FORGE_WEBHOOK_SECRET: "gate-forge-secret-not-a-real-credential",
};

const LIVE_ENV = {
  ATTEST_DEV_TOOLS: "0",
  ATTEST_API_MODE: "live",
  NEXT_DIST_DIR: ".next-live",
  ATTEST_INTERNAL_URL: `http://127.0.0.1:${3124}`,
};

async function waitForReady(baseUrl: string): Promise<void> {
  const started = Date.now();
  for (;;) {
    try {
      const response = await fetch(`${baseUrl}/healthz`, { cache: "no-store" });
      if (response.ok || response.status === 404) {
        return;
      }
    } catch {
      /* not up yet */
    }
    if (Date.now() - started > READY_TIMEOUT_MS) {
      throw new Error(`server did not become ready at ${baseUrl}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function run(args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npm", args, { stdio: "pipe", env });
    let output = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    proc.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${args.join(" ")} exited ${code}\n${output.slice(-1200)}`)),
    );
  });
}

type Slot = { running: RunningServer | null; child: ChildProcess | null };

const tooling: Slot = { running: null, child: null };
const live: Slot = { running: null, child: null };

async function start(
  slot: Slot,
  port: number,
  extraEnv: Record<string, string>,
): Promise<RunningServer> {
  if (slot.running) {
    return slot.running;
  }
  const env = { ...process.env, ...extraEnv };
  /* A build with a custom distDir writes that directory's generated types
     into tsconfig.json's include. Left there, the next `tsc --noEmit` reads a
     stale build's types and fails on files nobody wrote — which it has done
     once per phase for most of this build. The committed tsconfig is the
     canonical one, so the gate puts it back after building rather than
     leaving a landmine in the tree. */
  const tsconfig = await readFile("tsconfig.json", "utf8");
  try {
    await run(["run", "build"], env);
  } finally {
    if ((await readFile("tsconfig.json", "utf8")) !== tsconfig) {
      await writeFile("tsconfig.json", tsconfig);
    }
  }
  const baseUrl = `http://127.0.0.1:${port}`;
  slot.child = spawn("npm", ["run", "start", "--", "--port", String(port)], {
    stdio: "ignore",
    env,
  });
  await waitForReady(baseUrl);
  slot.running = {
    baseUrl,
    stop: () => {
      slot.child?.kill("SIGTERM");
      slot.child = null;
      slot.running = null;
    },
  };
  return slot.running;
}

/** The build the gate drives: production, with the developer tooling and the
    mock server included. */
export async function server(): Promise<RunningServer> {
  return start(tooling, TOOLING_PORT, TOOLING_ENV);
}

/** The build that goes to production: no developer tooling, no mock. */
export async function prodServer(): Promise<RunningServer> {
  return start(live, LIVE_PORT, LIVE_ENV);
}

export function stopServer(): void {
  tooling.running?.stop();
}

export function stopAll(): void {
  tooling.running?.stop();
  live.running?.stop();
}
