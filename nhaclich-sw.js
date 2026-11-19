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
   • [NL3] Tin mang dấu bản app đã soạn lịch (đuôi tag "-v…"). Lúc
     nhận tin hỏi GitHub giờ sửa index.html (HEAD, tối đa 4 giây):
     tệp mới hơn ⇒ app có bản mới (vd đổi lịch 120 ngày) mà máy này
     chưa mở ⇒ thêm dòng ⚠ nhắc mở app. Hỏi không được ⇒ hiện như cũ.
   ═══════════════════════════════════════════════════════════════ */
var NL_SW = 'NL3';
var NHAC_BAN_MOI = '⚠ App vừa có BẢN MỚI — mở app 1 lần (có mạng) để nhận lịch mới. Tin này có thể còn theo lịch cũ.';
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

/* [NL3] dấu bản app trong tag: "...-v<giây base36>" ⇒ mili giây (0 = không có / không hợp lệ) */
function dauTag(tag){
  var m = /-v([0-9a-z]{6,8})$/.exec(String(tag || ''));
  if(!m) return 0;
  var s = parseInt(m[1], 36);
  return (s >= 1700000000 && s < 4102444800) ? s * 1000 : 0;
}
/* [NL3] giờ sửa index.html của app trên GitHub (HEAD, không lấy bản lưu sẵn) — lỗi / quá 4 giây ⇒ 0 */
function gioSuaApp(url){
  return new Promise(function(ok){
    var xong = false;
    function tra(v){ if(!xong){ xong = true; ok(v); } }
    var hen = setTimeout(function(){ tra(0); }, 4000);
    try{
      var u = new URL(url, self.registration.scope); u.hash = ''; u.search = '';
      if(u.origin !== self.location.origin){ clearTimeout(hen); tra(0); return; }
      fetch(u.href, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' }).then(function(r){
        var t = (r && r.ok) ? Date.parse(r.headers.get('last-modified') || '') : NaN;
        clearTimeout(hen); tra(isFinite(t) ? t : 0);
      }, function(){ clearTimeout(hen); tra(0); });
    }catch(_){ clearTimeout(hen); tra(0); }
  });
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
  var dau = dauTag(d.tag);
  var hoi = dau ? gioSuaApp(opt.data.url) : Promise.resolve(0);
  function hien(){ return self.registration.showNotification(title, opt); }
  /* Mỗi tin đẩy PHẢI hiện thông báo (Chrome / Safari bắt buộc) — hỏi GitHub lỗi gì cũng vẫn hiện */
  e.waitUntil(hoi.then(function(sua){
    if(sua && sua > dau + 60000) opt.body = NHAC_BAN_MOI + (opt.body ? '\n' + opt.body : '');
    return hien();
  }, hien));
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
