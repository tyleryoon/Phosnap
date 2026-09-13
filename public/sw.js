// 캐시 이름을 바꾸면 activate 가 옛 캐시를 지운다.
// **배포 내용을 바꿀 때마다 이 숫자를 올린다.**
//
// 예전에는 'phosnap-v1' 로 고정돼 있었다. 그래서 아래 activate 의
// 정리 코드가 영원히 아무것도 안 지웠다 — 지울 대상이 자기 자신뿐이라.
const CACHE_NAME = 'phosnap-v2';
const OFFLINE_URL = '/offline.html';

// 미리 받아둘 것.
//
// **HTML 은 넣지 않는다.** 이게 핵심이다.
//
// 번들 파일에는 해시가 붙는다 — index-Bvi0kZ9t.js. 내용이 바뀌면 이름이
// 바뀌니 캐시가 옛것을 줄 수 없다. 그런데 index.html 은 이름이 그대로다.
// 그래서 옛 index.html 이 캐시에 남으면 그것이 가리키는 옛 번들까지
// 통째로 되살아난다. **배포를 해도 앱이 과거로 돌아간다.**
//
// 오류도 안 나고 화면도 멀쩡하다. 고친 게 안 고쳐진 것처럼 보일 뿐이라,
// 멀쩡한 코드를 의심하며 시간을 버리게 된다. (규칙 5-18)
//
// HTML 은 항상 네트워크에서 받고, 네트워크가 죽었을 때만 offline.html 을
// 보여준다. 그 편이 "오프라인입니다" 라고 정직하게 말한다.
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json'
];

// ─── Install: pre-cache assets ────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Precache failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch: Network-first for API, Cache-first for static ────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API calls: Network-first, fallback to offline page
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            // Clone and cache successful API responses
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cache as fallback
          return caches.match(request).then((cached) => {
            return cached || new Response('Network error. Please try again.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
        })
    );
    return;
  }

  // 페이지(HTML): 항상 네트워크. 캐시에 넣지 않는다.
  //
  // 넣으면 위 PRECACHE_URLS 주석의 문제가 그대로 생긴다 —
  // 옛 HTML 이 옛 번들을 불러와 배포가 무효가 된다.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets (CSS, JS, images): Cache-first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Fallback for missing assets
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#1a1a1a" width="100" height="100"/></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // Default: Network-first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});
