import type { ErrorCode } from "@/lib/api/contract";

/* The dev state panel writes here and the mock router reads it. One forced
   code applies to the next matching call, so every error state in every phase
   is reachable by clicking rather than by editing a fixture. */

type Forced = {
  code: ErrorCode | null;
  /** Restrict the forced code to paths containing this fragment. */
  pathFragment: string | null;
  /** When true the code is cleared after one call. */
  once: boolean;
};

const state: Forced = { code: null, pathFragment: null, once: false };

export function setForced(
  code: ErrorCode | null,
  pathFragment: string | null = null,
  once = false,
): void {
  state.code = code;
  state.pathFragment = pathFragment;
  state.once = once;
}

export function readForced(path: string): ErrorCode | null {
  if (state.code === null) {
    return null;
  }
  if (state.pathFragment && !path.includes(state.pathFragment)) {
    return null;
  }
  const code = state.code;
  if (state.once) {
    state.code = null;
    state.pathFragment = null;
    state.once = false;
  }
  return code;
}

export function currentForced(): Forced {
  return { ...state };
}

/* The mock stream's emission rate and failure share, configurable so the live
   run screen can be profiled under load. */
type StreamConfig = {
  rate: number;
  failureShare: number;
  reversalShare: number;
  transfers: number;
};

const stream: StreamConfig = {
  rate: 40,
  failureShare: 0.12,
  reversalShare: 0.03,
  transfers: 500,
};

export function setStreamConfig(next: Partial<StreamConfig>): StreamConfig {
  Object.assign(stream, next);
  return { ...stream };
}

export function streamConfig(): StreamConfig {
  return { ...stream };
}

/* The roster size the mock serves for a project. It exists so a screen can be
   profiled at ten thousand rows without a query parameter the contract does
   not have. It is set from /api/dev, which no production build carries. */
const rosterSizes = new Map<string, number>();

export function setRosterSize(projectId: string, rows: number | null): void {
  if (rows === null) {
    rosterSizes.delete(projectId);
    return;
  }
  rosterSizes.set(projectId, rows);
}

export function rosterSizeFor(projectId: string, fallback: number): number {
  return rosterSizes.get(projectId) ?? fallback;
}

export function rosterSizes_(): Record<string, number> {
  return Object.fromEntries(rosterSizes);
}
