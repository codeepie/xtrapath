const CACHE_NAME = 'xtraanim-v7'; // Increment version to force update
const urlsToCache = [
  '/', // Root path serves index.html
  '/views/index.html',
  '/views/explore.html',
  '/views/reels.html',
  '/views/profile.html',
  '/views/xtraAnim.html',
  '/views/xtraGraph.html',
  '/views/xtraBook.html',
  '/views/xtraArticle.html',
  '/views/bookView.html',
  '/views/articleView.html',
  '/views/lineage.html',
  '/styles/style.css',
  '/viewmodel/script.js',
  '/viewmodel/book_view_script.js',
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
  event.waitUntil(self.clients.claim()); // Take control of all clients immediately
});

self.addEventListener('fetch', event => {
  // 1. Ignore API calls (POST requests or specific endpoints)
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/render') || 
      event.request.url.includes('/status') || 
      event.request.url.includes('/upload')) {
    return;
  }

  // 2. Cache First, Fallback to Network
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});