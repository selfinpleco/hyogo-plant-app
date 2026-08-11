// 兵庫植物ノート — オフライン対応用サービスワーカー
// キャッシュ名は「更新のたびに自動で最新化」する仕組み（バージョン番号の手動管理は不要）。
const CACHE_NAME = "hyogo-plant-app-cache-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// インストール時：主要ファイルを事前キャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュの掃除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 取得戦略：まずネットワークを試し、成功したら最新版をキャッシュに保存。
// ネットワークが使えない（電波なし・機内モードなど）場合はキャッシュから返す。
// これにより、通常は常に最新のデータを表示しつつ、圏外でも直前に開いた内容が使える。
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // ナビゲーション（ページ遷移）のフォールバックとしてindex.htmlを返す
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return undefined;
        })
      )
  );
});