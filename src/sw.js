const CACHE_NAME = 'xtraanim-v31'; // Increment version to force update
const urlsToCache = [
  '/', // Root path serves index.html
  '/views/index.html',
  '/views/login.html',
  '/views/signup.html',
  '/views/explore.html',
  '/views/reels.html',
  '/views/profile.html',
  '/views/dashboard.html',
  '/views/settings.html',
  '/views/xtraTools.html',
  '/views/xtraAnim.html',
  '/views/xtraGraph.html',
  '/views/xtraBook.html',
  '/views/xtraCourse.html',
  '/views/xtraArticle.html',
  '/views/courseView.html',
  '/views/bookView.html',
  '/views/articleView.html',
  '/views/lineage.html',
  '/views/store.html',
  '/styles/style.css',
  // Cache versioned scripts to ensure offline reliability with the correct versions
  '/viewmodel/script.js?v=31',
  '/viewmodel/dashboard_script.js?v=31',
  '/viewmodel/xtraTools_script.js?v=23',
  '/viewmodel/store_script.js?v=20',
  '/viewmodel/course_script.js?v=20',
  '/viewmodel/course_view_script.js?v=23',
  '/viewmodel/book_view_script.js?v=23',
  '/viewmodel/book_script.js?v=20',
  '/viewmodel/article_script.js?v=20',
  '/viewmodel/graph_script.js?v=20',
  '/viewmodel/mermaid_handler.js?v=23',
  '/viewmodel/katex_handler.js?v=23',
  '/viewmodel/jsxgraph_handler.js?v=23',
  '/viewmodel/zdog_handler.js?v=23',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force activation immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // This cleanup process ensures that your PWA uses only the latest assets.
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

self.addEventListener('fetch', event => {
  // 1. Ignore API calls (POST requests or specific endpoints)
  if (event.request.method !== 'GET' ||
    event.request.url.includes('/render') ||
    event.request.url.includes('/status') ||
    event.request.url.includes('/upload')) {
    return;
  }

  // 2. Network First, Fallback to Cache.
  // This is a robust strategy that ensures users get the latest updates as soon
  // as they are available, while still providing offline access if the network fails.
  event.respondWith(
    fetch(event.request).catch(() => {
      // If the network request fails (e.g., offline),
      // try to serve the response from the cache.
      return caches.match(event.request);
    })
  );
});