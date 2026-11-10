/* The field app's queue. Offline is the normal case, so this is where an
   enrolment lives from the moment it is captured until the server has
   accepted it — through a lost connection, a force-quit and a restart.

   IndexedDB rather than localStorage: a photograph is a blob, a queue is a
   list that is read and written while the app is running, and localStorage is
   synchronous and capped at a few megabytes. */

export type EnrolmentFlag =
  | "boundary-outside"
  | "location-unavailable"
  | "identity-unreachable"
  | "identity-mismatch"
  | "photograph-missing";

export type CaptureLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
} | null;

export type QueuedEnrolment = {
  /** Minted on the device. The batch is idempotent on it, so a retry after a
      connection died mid-request cannot enrol the same household twice. */
  clientUuid: string;
  /** When the agent captured it, not when it synced. The difference is the
      sync delay the console shows against the agent. */
  capturedAt: string;
  agentId: string;
  projectId: string;
  consentAt: string;
  /* The number itself is never written to the device. What is queued is a
     hash of it and its last four digits, which is what the identity service
     needs to check it and what the console shows afterwards. A phone carried
     between villages is not a place to keep eleven digits of somebody's
     bank verification number. */
  identity: { type: "BVN" | "NIN"; hash: string; lastFour: string };
  details: {
    givenName: string;
    familyName: string;
    phone: string;
    accountNumber: string;
    bankCode: string;
    community: string;
  };
  /** Compressed on the device before it is queued: a 4MB camera frame is not
      something to carry over 3G. */
  photograph: string | null;
  location: CaptureLocation;
  boundaryReason: string | null;
  flags: EnrolmentFlag[];
  /** The capture signed with the device key, so an enrolment can be shown to
      have come from the device it says it did. */
  signature: string;
  state: "queued" | "syncing" | "failed";
  /** Why the server refused this item, when it did. Per item, because a batch
      that fails wholesale tells an agent nothing about which household to
      look at. */
  failure: { code: string; message: string } | null;
  attempts: number;
};

const DB = "attest-field";
const STORE = "enrolments";
const KEYS = "device";
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "clientUuid" });
      }
      if (!database.objectStoreNames.contains(KEYS)) {
        database.createObjectStore(KEYS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const database = await open();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(store, mode);
    const request = body(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to the queue. The shell's pending count and the queue screen
    read the same store, so they cannot disagree. */
export function onQueueChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function queueEnrolment(enrolment: QueuedEnrolment): Promise<void> {
  await withStore(STORE, "readwrite", (store) => store.put(enrolment));
  announce();
}

export async function readQueue(): Promise<QueuedEnrolment[]> {
  const rows = await withStore<QueuedEnrolment[]>(STORE, "readonly", (store) =>
    store.getAll(),
  );
  /* Oldest first: the household who has been waiting longest syncs first. */
  return [...rows].sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));
}

/* An enrolment marked "syncing" when the app was force-quit is not syncing:
   nothing is in flight, because the process that was sending it is gone. Left
   as it is, it stays in the queue, is skipped by every later drain, and the
   count keeps promising it will go — which is worse than losing it. On open,
   anything stranded goes back to queued and syncs with the rest. */
export async function recoverStranded(): Promise<number> {
  const rows = await readQueue();
  const stranded = rows.filter((row) => row.state === "syncing");
  for (const row of stranded) {
    await withStore(STORE, "readwrite", (store) =>
      store.put({ ...row, state: "queued" as const }),
    );
  }
  if (stranded.length > 0) {
    announce();
  }
  return stranded.length;
}

export async function updateEnrolment(
  clientUuid: string,
  change: Partial<QueuedEnrolment>,
): Promise<void> {
  const current = await withStore<QueuedEnrolment | undefined>(
    STORE,
    "readonly",
    (store) => store.get(clientUuid),
  );
  if (!current) {
    return;
  }
  await withStore(STORE, "readwrite", (store) => store.put({ ...current, ...change }));
  announce();
}

export async function removeEnrolment(clientUuid: string): Promise<void> {
  await withStore(STORE, "readwrite", (store) => store.delete(clientUuid));
  announce();
}

/* ---- The device key -------------------------------------------------------

   Generated once on this device and never leaves it. The capture is signed
   with it, so an enrolment carries evidence of the device it was captured on
   rather than only a claim about it. */

export async function deviceKey(): Promise<CryptoKey> {
  const stored = await withStore<JsonWebKey | undefined>(KEYS, "readonly", (store) =>
    store.get("key"),
  );
  if (stored) {
    return crypto.subtle.importKey(
      "jwk",
      stored,
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign"],
    );
  }
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );
  const exported = await crypto.subtle.exportKey("jwk", key);
  await withStore(KEYS, "readwrite", (store) => store.put(exported, "key"));
  return key;
}

/** The device's own identifier: the first twelve characters of the key's
    fingerprint, which is enough to tell two phones apart and carries nothing
    about either. */
export async function deviceId(): Promise<string> {
  const key = await deviceKey();
  const exported = await crypto.subtle.exportKey("jwk", key);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(exported.k ?? ""),
  );
  return hex(digest).slice(0, 12);
}

/** The identity number as the queue carries it: hashed with the device key,
    so the same number gives the same hash on this phone and nothing on the
    device can be read back into a number. */
export async function hashIdentity(number: string): Promise<string> {
  return signCapture(["identity", number]);
}

export async function signCapture(parts: string[]): Promise<string> {
  const key = await deviceKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(parts.join("|")),
  );
  return hex(signature);
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** A client UUID, from the platform where it has one. */
export function newClientUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `uuid-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
