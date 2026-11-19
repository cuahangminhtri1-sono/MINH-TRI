/* ═══════════════════════════════════════════════════════════════
   nhaclich-sw.js — SW RIÊNG nhận THÔNG BÁO LỊCH (báo trước 1 ngày)
   của app Gà Nòi QT (kho GA-NOI) và Gà Nòi QTC (kho MINH-TRI).
   • Đặt CẠNH index.html (cùng thư mục với sw.js). KHÔNG thay sw.js.
   • Chạy ở phạm vi riêng ./nhaclich/ nên không đụng bộ nhớ đệm,
     không đụng việc cập nhật bản mới của sw.js.
   • Không dùng Cache Storage (sw.js của app xoá mọi kho khác tên
     mỗi lần cập nhật).
   • Máy chủ "nhaclich" gửi tin ⇒ hiện thông báo kể cả khi app đã
     TẮT HẲN. Bấm thông báo ⇒ mở / đưa app lên trước, tới khung
     🔔 NGÀY MAI LÀM GÌ.
   ═══════════════════════════════════════════════════════════════ */
var NL_SW = 'NL1';
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(Promise.resolve()); });

function gocApp(){
  /* .../GA-NOI/nhaclich/  ⇒  .../GA-NOI/ */
  return String(self.registration.scope || '').replace(/nhaclich\/?$/, '');
}
function laCuaSoApp(u, goc){
  u = String(u || '').toLowerCase();
  return u.indexOf(goc.toLowerCase()) === 0 && u.indexOf('/nhaclich/') < 0 && u.indexOf('/nhan-lienhe/') < 0;
}

self.addEventListener('push', function(e){
  var p = {};
  try{ p = e.data ? e.data.json() : {}; }
  catch(_){ try{ p = { data: { body: e.data ? e.data.text() : '' } }; }catch(__){ p = {}; } }
  var d = (p && p.data) ? p.data : (p || {});
  var n = (p && p.notification) ? p.notification : {};
  var title = String(d.title || n.title || 'Gà Nòi · lịch ngày mai');
  var opt = {
    body: String(d.body || n.body || ''),
    data: { url: String(d.url || '') || gocApp() },
    timestamp: Date.now(),
    vibrate: [200, 100, 200]
  };
  if(d.tag){ opt.tag = String(d.tag); opt.renotify = true; }
  /* Mỗi tin đẩy PHẢI hiện thông báo (Chrome / Safari bắt buộc) */
  e.waitUntil(self.registration.showNotification(title, opt));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var goc = gocApp();
  var url = (e.notification.data && e.notification.data.url) || goc;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(ds){
      for(var i = 0; i < ds.length; i++){
        var c = ds[i];
        if(laCuaSoApp(c.url, goc) && 'focus' in c){
          try{ c.postMessage({ nl: 'mo', tag: e.notification.tag || '' }); }catch(_){}
          return c.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : null;
    })
  );
});
