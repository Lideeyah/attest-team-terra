/* The field app's service worker.

   It exists so the app opens with no connection at all: an agent walking into
   a village with no signal taps the icon and the capture flow is there.

   Two things this has to get right, and the first version got neither. The
   app's JavaScript does not live under /field — it is at /_next/static — so a
   worker that only caches /field caches four documents and no application,
   and the app works offline exactly as long as the browser's own HTTP cache
   happens to hold the chunks. On the cheap phone this is built for, eviction
   is the normal case. And an install that drops one request has to be an
   install that failed, not a worker that activates holding half a shell:
   offline is the state this app is for, so a partial cache is a product that
   will fail in the field and say nothing. */

const CACHE = "attest-field-v3";

/* The screens an agent opens. Everything else the app needs — the framework,
   the chunks, the fonts — is cached as it is fetched, which is how the
   build's own hashed filenames stay correct without being listed here. */
const SHELL = ["/field", "/field/enrol", "/field/queue", "/field/me"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      /* addAll is all-or-nothing, which is what is wanted: a worker that
         activates with half a shell is a worker that fails in a village. If
         this throws, the install fails, the old worker stays in charge, and
         the browser tries again. */
      await cache.addAll(SHELL);

      /* The documents name their own scripts and stylesheets. Fetching them
         now is what makes the app run offline rather than merely render a
         shell: without this the HTML is served from the cache and no script
         loads, which looks like the app hanging on "Opening". */
      const assets = new Set();
      for (const path of SHELL) {
        const response = await cache.match(path);
        if (!response) {
          continue;
        }
        const html = await response.clone().text();
        for (const match of html.matchAll(/(?:src|href)="(\/_next\/[^"]+)"/g)) {
          assets.add(match[1]);
        }
      }
      await Promise.all(
        [...assets].map((url) =>
          cache.add(url).catch(() => {
            /* One asset the build no longer serves must not fail the whole
               install; the document it belongs to is already cached and the
               runtime handler will fetch the rest. */
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("attest-field-") && key !== CACHE).map((key) => caches.delete(key))),
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
  if (url.origin !== self.location.origin) {
    return;
  }

  /* An API answer is never served from the cache: a figure about money that
     is quietly out of date is worse than one the app says it cannot read. */
  if (url.pathname.startsWith("/api")) {
    return;
  }

  /* The app's own screens, and the build output they depend on. Nothing else
     on the origin is this worker's business. */
  const mine =
    url.pathname.startsWith("/field") || url.pathname.startsWith("/_next/");
  if (!mine) {
    return;
  }

  /* A screen's data payload is cached under a key that carries the header it
     was requested with, so a payload is never served where a document was
     asked for and the other way round. */
  const isData = request.headers.get("RSC") === "1";
  const key = isData
    ? new Request(`${url.pathname}?__rsc`, { headers: request.headers })
    : request;

  /* A hashed build asset never changes under its own name, so the cache is
     the answer and the network is the fallback. Everything else is the other
     way round: the network first, so a figure is current when it can be. */
  // Development chunks keep their URL when edited; only content-hashed
  // production assets are safe to serve without checking the network.
  const immutable = url.pathname.startsWith("/_next/static/") &&
    /[.-][a-f0-9]{8,}(?:\.[a-z0-9]+)+$/i.test(url.pathname);

  event.respondWith(
    (async () => {
      if (immutable) {
        const cached = await caches.match(key);
        if (cached) {
          return cached;
        }
      }

      const network = await fetch(request)
        .then(async (response) => {
          const cache = await caches.open(CACHE);
          await cache.put(key, response.clone()).catch(() => undefined);
          return response;
        })
        .catch(() => null);

      if (network) {
        return network;
      }

      const cached = await caches.match(key);
      if (cached) {
        return cached;
      }

      /* A screen this phone has not opened before still opens: every field
         route renders from the device's own session. A record route is the
         exception — an enrolment is the server's to answer for — so it says
         so rather than quietly showing a different screen. */
      if (request.mode === "navigate") {
        if (/^\/field\/enrolment\//.test(url.pathname)) {
          return new Response(OFFLINE_RECORD, {
            status: 503,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }
        const shell = await caches.match("/field");
        if (shell) {
          return shell;
        }
      }
      return Response.error();
    })(),
  );
});

/* Hand-written, because by definition there is nothing to load. */
const OFFLINE_RECORD = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Not on this phone</title>
<style>
  body { margin: 0; padding: 24px; background: #F7F4EB; color: #181816;
    font-family: Georgia, "Times New Roman", serif; font-size: 18px; line-height: 1.55; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  a { color: inherit; }
</style></head>
<body>
  <h1>This enrolment is not on this phone</h1>
  <p>A submitted enrolment is the project's record rather than the phone's, so
  reading one needs a connection. Everything captured here and not yet sent is
  on the queue and is safe.</p>
  <p><a href="/field/queue">The queue</a> · <a href="/field">Today</a></p>
</body></html>`;
