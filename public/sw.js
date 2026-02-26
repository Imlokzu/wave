/**
 * Service Worker for Push Notifications
 * Handles background notifications when app is closed
 */

const CACHE_NAME = 'wave-messenger-v1';
const CACHE_VERSION = '1.0.0';

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/chat.html',
        '/login.html',
        '/css/theme.css',
        '/js/app.js'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    data = { title: 'Wave Messenger', body: 'New message' };
  }

  const title = data.title || 'Wave Messenger';
  const options = {
    body: data.body || 'You have a new message',
    icon: '/wavechat.png',
    badge: '/wavechat.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/chat.html',
      roomId: data.roomId,
      messageId: data.messageId,
      senderId: data.senderId,
      senderName: data.senderName,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/icons/reply.png'
      },
      {
        action: 'mark-read',
        title: 'Mark as Read',
        icon: '/icons/check.png'
      }
    ],
    tag: data.tag || 'wave-message',
    renotify: true,
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'reply') {
    // Handle reply action
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/chat.html')
    );
    return;
  }

  if (event.action === 'mark-read') {
    // Mark message as read
    event.waitUntil(
      fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: event.notification.data.messageId })
      })
    );
    return;
  }

  // Default action - open chat
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if we already have a Wave window open
      for (const client of clientList) {
        if (client.url.includes('localhost:3001') && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: event.notification.data
          });
          return client.focus();
        }
      }
      // No window open, open a new one
      return clients.openWindow(event.notification.data.url || '/chat.html');
    })
  );
});

// Message event from main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message from main app:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});
