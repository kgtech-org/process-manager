// Firebase Cloud Messaging Service
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { initializeMessaging } from '@/config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { DeviceResource, DeviceRegistrationRequest } from '@/lib/resources';

class FirebaseMessagingService {
  private deviceUuid: string | null = null;
  private fcmToken: string | null = null;
  private messaging: any = null;
  private messageListeners: Set<(message: any) => void> = new Set();

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.deviceUuid = this.getOrCreateDeviceUuid();
    }
  }

  // Initialize Firebase Messaging
  async initialize(): Promise<boolean> {
    try {
      this.messaging = await initializeMessaging();
      if (!this.messaging) {
        console.warn('Firebase Messaging not available');
        return false;
      }

      // Set up message listener for foreground messages
      this.setupMessageListener();

      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase messaging:', error);
      return false;
    }
  }

  // Get or create device UUID
  private getOrCreateDeviceUuid(): string {
    if (typeof window === 'undefined') return '';
    let uuid = localStorage.getItem('deviceUuid');
    if (!uuid) {
      uuid = uuidv4();
      localStorage.setItem('deviceUuid', uuid);
    }
    return uuid;
  }

  // Get device UUID
  getDeviceUuid(): string | null {
    return this.deviceUuid;
  }

  // Get FCM token
  getFcmToken(): string | null {
    return this.fcmToken;
  }

  // Get device information
  private getDeviceInfo(): Partial<DeviceRegistrationRequest> {
    if (typeof window === 'undefined') {
      return {
        deviceType: 'web',
        deviceName: 'Unknown',
        browser: 'Unknown',
        platform: 'Unknown'
      };
    }

    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // Detect browser
    let browser = 'Unknown';
    if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox';
    } else if (userAgent.indexOf('Chrome') > -1) {
      browser = 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = 'Safari';
    } else if (userAgent.indexOf('Edge') > -1) {
      browser = 'Edge';
    }

    // Create device name
    const deviceName = `${browser} on ${platform}`;

    return {
      deviceType: 'web',
      deviceName,
      browser,
      platform,
      userAgent
    };
  }

  // Request notification permission and get FCM token
  async requestPermission(): Promise<string | null> {
    try {
      if (!this.messaging) {
        await this.initialize();
      }

      if (!this.messaging) {
        throw new Error('Messaging not available');
      }

      // Request permission
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('Notifications not supported');
        return null;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      // Get FCM token with VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        console.error('Firebase VAPID key not configured. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY environment variable.');
        throw new Error('Firebase VAPID key not configured');
      }

      const token = await getToken(this.messaging, { vapidKey });

      if (token) {
        this.fcmToken = token;
        console.log('FCM Token obtained');
        return token;
      } else {
        console.warn('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Register device with backend
  async registerDevice() {
    try {
      // First get permission and token
      const token = await this.requestPermission();
      if (!token) {
        throw new Error('Failed to get FCM token');
      }

      // Prepare device registration data
      const deviceInfo = this.getDeviceInfo();
      const registrationData: DeviceRegistrationRequest = {
        deviceUuid: this.deviceUuid!,
        fcmToken: token,
        ...deviceInfo
      } as DeviceRegistrationRequest;

      // Register with backend using DeviceResource
      const device = await DeviceResource.register(registrationData);
      console.log('Device registered successfully');
      return device;
    } catch (error: any) {
      console.error('Device registration failed:', error);
      throw error;
    }
  }

  // Update FCM token (when it refreshes)
  async updateToken(newToken: string): Promise<boolean> {
    try {
      if (!this.deviceUuid) {
        throw new Error('No device UUID available');
      }

      await DeviceResource.updateToken(this.deviceUuid, newToken);
      this.fcmToken = newToken;
      console.log('FCM token updated successfully');
      return true;
    } catch (error: any) {
      console.error('Failed to update FCM token:', error);
      return false;
    }
  }

  // Deregister device
  async deregisterDevice(): Promise<boolean> {
    try {
      if (!this.deviceUuid) {
        throw new Error('No device UUID available');
      }

      // Delete token from Firebase
      if (this.messaging) {
        await deleteToken(this.messaging);
      }

      // Deregister from backend using DeviceResource
      await DeviceResource.deregister(this.deviceUuid);
      console.log('Device deregistered successfully');
      this.fcmToken = null;
      return true;
    } catch (error: any) {
      console.error('Failed to deregister device:', error);
      return false;
    }
  }

  // Setup message listener for foreground notifications
  private setupMessageListener() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);

      // Notify all registered listeners
      this.messageListeners.forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      });

      // Show notification if permission is granted
      if (typeof window !== 'undefined' && Notification.permission === 'granted' && payload.notification) {
        this.showNotification(payload.notification);
      }
    });
  }

  // Show notification in foreground
  private showNotification(notification: any) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const { title, body, icon } = notification;

    const options: NotificationOptions = {
      body,
      icon: icon || '/favicon.ico',
      requireInteraction: false,
      silent: false,
      tag: 'process-manager-notification'
    };

    // Create and show notification
    new Notification(title, options);
  }

  // Add message listener
  addMessageListener(listener: (message: any) => void) {
    this.messageListeners.add(listener);
  }

  // Remove message listener
  removeMessageListener(listener: (message: any) => void) {
    this.messageListeners.delete(listener);
  }

  // Clear all listeners
  clearMessageListeners() {
    this.messageListeners.clear();
  }
}

// Export singleton instance
export default new FirebaseMessagingService();
