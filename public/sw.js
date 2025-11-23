// Service Worker para Hourly
const CACHE_NAME = 'hourly-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/letraht.png',
  '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  // Forzar la actualización inmediata del Service Worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // No esperar a que se complete el cache, instalar inmediatamente
        return cache.addAll(urlsToCache).catch((err) => {
          console.error('Error caching files:', err);
        });
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  // Tomar control inmediatamente de todas las páginas
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control de todas las páginas
      self.clients.claim()
    ])
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean http/https
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // NO interceptar peticiones de API - dejar que pasen directamente
  // Esto evita problemas de timeout y permite que las peticiones funcionen normalmente
  if (url.pathname.startsWith('/api/') || url.hostname.includes('workers.dev')) {
    // No interceptar, dejar que la petición pase directamente
    return;
  }

  // Solo interceptar recursos estáticos (HTML, CSS, JS, imágenes)
  // Usar estrategia "Network First" para evitar problemas de carga
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Verificar que la respuesta sea válida
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clonar la respuesta para cachearla
        const responseToCache = response.clone();

        // Cachear la respuesta para futuras peticiones (solo si es un recurso estático)
        if (event.request.method === 'GET') {
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch((err) => {
              console.error('Error caching response:', err);
            });
        }

        return response;
      })
      .catch((error) => {
        console.error('Fetch failed, trying cache:', error);
        // Si falla la red, intentar desde caché
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si es una petición de navegación (HTML) y no hay caché, devolver index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // Si no hay caché, devolver error
            throw error;
          });
      })
  );
});

