/* The one place a thrown error is turned into a typed result. JSON.parse is
   the only operation in the product that can only be guarded by catching, and
   it guards input a reader pasted in, not an answer from the API. Everywhere
   else a caller switches on a code. */

export type Parsed<T> = { ok: true; value: T } | { ok: false };

export function parseJson<T = unknown>(raw: string): Parsed<T> {
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
}
