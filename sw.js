/* Grand Line Chronicles — service worker
   Strategia network-first: online usa sempre la rete (così vedi gli aggiornamenti),
   offline ripiega sulla copia salvata. Cache solo delle risposte GET dello stesso dominio. */
var CACHE = "glc-cache-v1";

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; })
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
        return caches.match(req).then(function (r) {
          if (r) return r;
          if (req.mode === "navigate") return caches.match("/");
          return Response.error();
        });
      })
  );
});
