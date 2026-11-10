import type { CaptureLocation, EnrolmentFlag } from "@/lib/field/queue";

/* What the capture flow does that is not a form: compress a photograph, read
   a location, and decide whether a location is inside the project's own
   boundary. All of it on the device, because none of it can wait for a
   connection. */

/** The widest edge a queued photograph may have. A 12-megapixel camera frame
    is four megabytes; this is about sixty kilobytes, which is what a 3G
    connection in the field can actually carry. */
const MAX_EDGE = 720;
const QUALITY = 0.62;

export async function compressPhotograph(source: Blob): Promise<string> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no canvas context");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", QUALITY);
}

/** A location, or null when the device will not give one. A refusal is not an
    error here: the enrolment proceeds and carries the flag. */
export function readLocation(): Promise<CaptureLocation> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), 8000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  });
}

export type Boundary = {
  name: string;
  north: number;
  south: number;
  east: number;
  west: number;
};

/** Inside, outside, or unknown because there is no location to judge. */
export function boundaryOf(
  location: CaptureLocation,
  boundary: Boundary | null,
): "inside" | "outside" | "unknown" {
  if (location === null || boundary === null) {
    return "unknown";
  }
  const inside =
    location.latitude <= boundary.north &&
    location.latitude >= boundary.south &&
    location.longitude <= boundary.east &&
    location.longitude >= boundary.west;
  return inside ? "inside" : "outside";
}

export function flagsFor(options: {
  boundary: "inside" | "outside" | "unknown";
  photograph: string | null;
  identity: "checked" | "queued" | "mismatch";
}): EnrolmentFlag[] {
  const flags: EnrolmentFlag[] = [];
  if (options.boundary === "outside") {
    flags.push("boundary-outside");
  }
  if (options.boundary === "unknown") {
    flags.push("location-unavailable");
  }
  if (options.photograph === null) {
    flags.push("photograph-missing");
  }
  if (options.identity === "queued") {
    flags.push("identity-unreachable");
  }
  if (options.identity === "mismatch") {
    flags.push("identity-mismatch");
  }
  return flags;
}
