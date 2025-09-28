// Firebase Messaging Service Worker
// This service worker handles background notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBW-_LgoJF476j3dNmU6g2c0Z9rfPYP0aU",
  authDomain: "yas-process-manager.firebaseapp.com",
  projectId: "yas-process-manager",
  storageBucket: "yas-process-manager.firebasestorage.app",
  messagingSenderId: "504039959888",
  appId: "1:504039959888:web:6fa0a27fbf0426ca031055",
  measurementId: "G-CGRKEJKJ7P"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extract notification data
  const { title, body, icon, badge, image, data } = payload.notification || {};

  // Default values
  const notificationTitle = title || 'Process Manager Notification';
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: icon || '/favicon.ico',
    badge: badge || '/favicon.ico',
    image: image,
    vibrate: [200, 100, 200],
    data: data || payload.data,
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: false,
    silent: false,
    tag: 'process-manager-notification',
    renotify: true,
    timestamp: Date.now()
  };

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open
  let urlToOpen = '/notifications'; // Default URL

  // Check if there's a custom URL in the notification data
  if (event.notification.data) {
    if (event.notification.data.url) {
      urlToOpen = event.notification.data.url;
    } else if (event.notification.data.actionUrl) {
      urlToOpen = event.notification.data.actionUrl;
    } else if (event.notification.data.clickAction) {
      urlToOpen = event.notification.data.clickAction;
    }
  }

  // Open the URL in a new window or focus existing one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if no existing window found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  console.log('[firebase-messaging-sw.js] Message received:', event.data);

  // Handle different message types
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[firebase-messaging-sw.js] Service Worker loaded successfully');