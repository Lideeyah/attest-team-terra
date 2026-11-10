/* The one place in the field app where a throw is turned into a value.

   Device storage is not an API: a private window, a device with site data
   blocked, a quota already full — each of these throws from the platform
   rather than answering, and there is no typed result to switch on. Every
   other failure in the product comes back as a code; these two functions are
   the boundary where the platform's own refusal becomes one. */

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* A device that will not store it still works while there is a
       connection; it simply cannot work without one. */
  }
}

/** Compressing a photograph on the device. A camera frame that will not
    decode is a device failure, not an answer, so it comes back as nothing
    and the enrolment carries the flag. */
export async function tryCompress(
  file: Blob,
  compress: (source: Blob) => Promise<string>,
): Promise<string | null> {
  try {
    return await compress(file);
  } catch {
    return null;
  }
}
