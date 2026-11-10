/* The field app's service worker.

   It exists so the app opens with no connection at all: an agent walking into
   a village with no signal taps the icon and the capture flow is there. The
   app shell is cached on install and served from the cache when the network
   does not answer; everything the API returns is left alone, because a stale
   figure about money is worse than no figure. */

const CACHE = "attest-field-v1";

/* The shell: the routes an agent opens, and nothing that is a record. */
const SHELL = ["/field", "/field/enrol", "/field/queue", "/field/me"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/field")) {
    return;
  }
  /* An API answer is never served from the cache: a figure about money that
     is quietly out of date is worse than one the app says it cannot read. */
  if (url.pathname.startsWith("/api")) {
    return;
  }

  /* A screen's data payload is cached under a key that carries the header it
     was requested with, so a payload is never served where a document was
     asked for and the other way round. */
  const isData = request.headers.get("RSC") === "1";
  const key = isData ? new Request(`${url.pathname}?__rsc`, { headers: request.headers }) : request;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(key, copy)).catch(() => undefined);
        return response;
      })
      .catch(() =>
        caches.match(key).then((cached) => {
          if (cached) {
            return cached;
          }
          /* A screen the phone has not opened before still opens: every
             field route renders from the device's own session, so the shell
             it was given is the shell it needs. */
          if (request.mode === "navigate") {
            return caches.match("/field");
          }
          return undefined;
        }),
      )
      .then((response) => response || Response.error()),
  );
});
