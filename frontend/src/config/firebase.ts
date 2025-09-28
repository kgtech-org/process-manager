// Firebase configuration for Process Manager
import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase configuration object
// These are public keys and safe to expose in frontend code
const firebaseConfig = {
  apiKey: "AIzaSyBW-_LgoJF476j3dNmU6g2c0Z9rfPYP0aU",
  authDomain: "yas-process-manager.firebaseapp.com",
  projectId: "yas-process-manager",
  storageBucket: "yas-process-manager.firebasestorage.app",
  messagingSenderId: "504039959888",
  appId: "1:504039959888:web:6fa0a27fbf0426ca031055",
  measurementId: "G-CGRKEJKJ7P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and export
let messaging: any = null;

// Check if messaging is supported (not all browsers support it)
export const initializeMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      return messaging;
    }
    console.warn('Firebase Messaging is not supported in this browser');
    return null;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
};

export { app, messaging };