/* Grand Line Chronicles — service worker
   Strategia network-first: online usa sempre la rete (così vedi gli aggiornamenti),
   offline ripiega sulla copia salvata. Cache solo delle risposte GET dello stesso dominio. */
var CACHE = "glc-cache-v10";

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k.indexOf("glc-cache-") === 0 && k !== CACHE; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Arkalink and Forge have independent navigation and account lifecycles.
  if (url.origin !== location.origin || url.pathname === "/" || url.pathname.indexOf("/forgia/") === 0 || url.pathname.indexOf("/arkalink-assets/") === 0) return;

  // Versioned scripts can be reused offline without falling back to the old sync code.
  var vivo = /\/glc-auth\.js$/.test(url.pathname) && url.searchParams.get("v") !== "4";

  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (url.origin === location.origin && res && res.ok && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        if (vivo) return Response.error();
        return caches.match(req).then(function (r) {
          if (r) return r;
          if (req.mode === "navigate") return caches.match("/grand-line-chronicles/");
          return Response.error();
        });
      })
  );
});
