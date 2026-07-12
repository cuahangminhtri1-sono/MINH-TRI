/* =====================================================================
   Gà Nòi QTC · Khóa 6 Bệnh  ·  SERVICE WORKER
   Nhiem vu: (1) co 'fetch' handler -> Chrome moi bat nut CAI DAT APP
             (2) cache trang -> mo duoc khi mat mang
   Doi noi dung app? -> tang VER (v1 -> v2) roi upload lai.
   ===================================================================== */
var VER   = "v1";
var CACHE = "ganoi-qtc-" + VER;
var FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", function (e) {
  e.waitUntil((async function () {
    try {
      var c = await caches.open(CACHE);
      await c.add(new Request(self.registration.scope, { cache: "reload" }));
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) {
      return (k.indexOf("ganoi-qtc-") === 0 && k !== CACHE) ? caches.delete(k) : Promise.resolve();
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  var same = (url.origin === self.location.origin);
  var font = FONTS.test(req.url);
  if (!same && !font) return;                       /* thu khac -> de trinh duyet tu lo */

  /* 1) Trang HTML -> NETWORK-FIRST: online luon lay ban moi nhat, mat mang thi lay cache */
  if (req.mode === "navigate" || (same && req.destination === "document")) {
    e.respondWith((async function () {
      try {
        var fresh = await fetch(req);
        if (fresh && fresh.ok && fresh.type === "basic") {
          var c = await caches.open(CACHE);
          try { await c.put(req, fresh.clone()); } catch (_) {}
        }
        return fresh;
      } catch (_) {
        var c2  = await caches.open(CACHE);
        var hit = await c2.match(req, { ignoreSearch: true });
        if (hit) return hit;
        hit = await c2.match(self.registration.scope, { ignoreSearch: true });
        if (hit) return hit;
        return new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
          "<body style='background:#0A0A0F;color:#fff;font-family:system-ui;text-align:center;padding:60px 20px'>" +
          "<div style='font-size:52px'>\ud83d\udcf6</div><h2 style='color:#FF4500;margin:14px 0 8px'>CHUA CO MANG</h2>" +
          "<p style='color:#888;line-height:1.7'>Hay mo app 1 lan khi co mang<br/>de luu ban offline.</p></body>",
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  /* 2) Tai nguyen khac (font Google trong iframe...) -> CACHE-FIRST, nen cap nhat */
  e.respondWith((async function () {
    var c   = await caches.open(CACHE);
    var hit = await c.match(req);
    var net = fetch(req).then(function (r) {
      if (r && (r.ok || r.type === "opaque")) { try { c.put(req, r.clone()); } catch (_) {} }
      return r;
    }).catch(function () { return null; });
    if (hit) return hit;
    var r2 = await net;
    return r2 || new Response("", { status: 504, statusText: "offline" });
  })());
});
