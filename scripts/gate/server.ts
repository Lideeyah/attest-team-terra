import { spawn, type ChildProcess } from "node:child_process";

type RunningServer = {
  baseUrl: string;
  stop: () => void;
};

let running: RunningServer | null = null;
let child: ChildProcess | null = null;

const PORT = 3123;
const READY_TIMEOUT_MS = 180_000;

async function waitForReady(baseUrl: string): Promise<void> {
  const started = Date.now();
  for (;;) {
    try {
      const response = await fetch(baseUrl, { cache: "no-store" });
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

/** Starts the development server once per gate run and reuses it. */
export async function server(): Promise<RunningServer> {
  if (running) {
    return running;
  }
  const baseUrl = `http://127.0.0.1:${PORT}`;
  child = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
    stdio: "ignore",
    env: {
      ...process.env,
      ATTEST_DEV_TOOLS: "1",
      NEXT_PUBLIC_ATTEST_DEV_TOOLS: "1",
      /* A secret for the gate's own signing, so the hook's accepting path is
         asserted rather than assumed. */
      FORGE_WEBHOOK_SECRET:
        process.env.FORGE_WEBHOOK_SECRET ?? "gate-forge-secret-not-a-real-credential",
    },
  });
  await waitForReady(baseUrl);
  running = {
    baseUrl,
    stop: () => {
      child?.kill("SIGTERM");
      child = null;
      running = null;
    },
  };
  return running;
}

export function stopServer(): void {
  running?.stop();
}

let prodRunning: RunningServer | null = null;
let prodChild: ChildProcess | null = null;
const PROD_PORT = 3124;

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: "inherit", env });
    proc.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)),
    );
  });
}

/** Builds and starts a production server. Used for bundle budgets and for
    asserting that developer tooling is absent from a production build. */
export async function prodServer(): Promise<RunningServer> {
  if (prodRunning) {
    return prodRunning;
  }
  const env = { ...process.env, ATTEST_DEV_TOOLS: "0", NEXT_PUBLIC_ATTEST_DEV_TOOLS: "0" };
  await run("npm", ["run", "build"], env);
  const baseUrl = `http://127.0.0.1:${PROD_PORT}`;
  prodChild = spawn("npm", ["run", "start", "--", "--port", String(PROD_PORT)], {
    stdio: "ignore",
    env,
  });
  await waitForReady(baseUrl);
  prodRunning = {
    baseUrl,
    stop: () => {
      prodChild?.kill("SIGTERM");
      prodChild = null;
      prodRunning = null;
    },
  };
  return prodRunning;
}

export function stopAll(): void {
  running?.stop();
  prodRunning?.stop();
}
