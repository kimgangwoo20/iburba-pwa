// iBurBa PWA - Service Worker
const CACHE_NAME = 'iburba-pwa-v1.0.0';
const urlsToCache = [
  '/',
  '/fitting.html',        // ✅ 실제 파일명으로 수정
  '/index.html',          // ✅ 메인 페이지 추가
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache 열림:', CACHE_NAME);
        // 개별적으로 추가하여 하나가 실패해도 전체가 실패하지 않도록
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`⚠️ 캐싱 실패 (무시): ${url}`, err);
              return Promise.resolve(); // 에러 무시하고 계속 진행
            });
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker 설치 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
      .catch(err => {
        console.error('❌ Service Worker 설치 실패:', err);
      })
  );
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker 활성화 중...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker 활성화 완료');
      return self.clients.claim(); // 즉시 제어권 획득
    })
  );
});

// Fetch 이벤트
self.addEventListener('fetch', (event) => {
  // Chrome Extension의 요청은 무시
  if (event.request.url.includes('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시에서 반환
        if (response) {
          console.log('📦 캐시에서 반환:', event.request.url);
          return response;
        }
        
        // 없으면 네트워크 요청
        console.log('🌐 네트워크 요청:', event.request.url);
        return fetch(event.request).then((response) => {
          // 유효한 응답이 아니면 그대로 반환
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 응답을 캐시에 저장
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(err => {
          console.error('❌ 네트워크 요청 실패:', event.request.url, err);
          // 오프라인 페이지 반환 (선택사항)
          return new Response('오프라인 상태입니다', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});