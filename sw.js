/* ============================================================
   sw-qtc.js  ·  Service worker cho Gà Nòi QTC  ·  V7
   ĐẶT FILE NÀY CÙNG THƯ MỤC với trang indexQTC.html
   Thiếu file này -> Chrome / Android KHÔNG cho cài app.
   Chiến lược: NETWORK-FIRST (luôn lấy bản mới, mất mạng dùng bản đã lưu)
   ============================================================ */
var CACHE = "ganoi-qtc-v7";

self.addEventListener("install", function(){ self.skipWaiting(); });

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function(res){
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ try { c.put(req, copy); } catch (err) {} });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match(self.registration.scope);
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});
