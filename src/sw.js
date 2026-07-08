const CACHE_NAME = 'xtraanim-v3';
const urlsToCache = [
  './',
  './index.html',
  './home.html',
  './explore.html',
  './profile.html',
  './xtraAnim.html',
  './styles/style.css',
  './viewmodel/script.js',
  './manifest.json'
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