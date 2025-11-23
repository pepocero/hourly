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
  
  // Para peticiones de API, usar estrategia "Network First"
  if (url.pathname.startsWith('/api/') || url.hostname.includes('workers.dev')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la respuesta es válida, devolverla
          if (response && response.status === 200) {
            return response;
          }
          throw new Error('Network response was not ok');
        })
        .catch((error) => {
          console.error('Network request failed:', error);
          // Si falla la red, intentar desde caché solo para recursos estáticos
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay caché, devolver error de red
            throw error;
          });
        })
    );
    return;
  }

  // Para recursos estáticos (HTML, CSS, JS, imágenes), usar estrategia "Cache First" con fallback a red
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si hay respuesta en caché, devolverla
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si no hay en caché, intentar desde la red
        return fetch(event.request)
          .then((response) => {
            // Verificar que la respuesta sea válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta para cachearla
            const responseToCache = response.clone();

            // Cachear la respuesta para futuras peticiones
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((err) => {
                console.error('Error caching response:', err);
              });

            return response;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            // Si es una petición de navegación (HTML), devolver index.html desde caché
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            throw error;
          });
      })
  );
});

