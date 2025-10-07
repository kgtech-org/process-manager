// Notification Service for Firebase FCM integration
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { initializeMessaging } from '@/config/firebase';
import api from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Device {
  id: string;
  deviceUuid: string;
  deviceType: 'web' | 'android' | 'ios' | 'desktop';
  deviceName: string;
  browser?: string;
  platform?: string;
  isActive: boolean;
  lastActiveAt: string;
  registeredAt: string;
}

export interface DeviceRegistrationRequest {
  deviceUuid: string;
  fcmToken: string;
  deviceType: 'web' | 'android' | 'ios' | 'desktop';
  deviceName: string;
  browser?: string;
  platform?: string;
  userAgent?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'push' | 'in_app' | 'system';
  category: 'login' | 'activity' | 'system' | 'reminder' | 'approval' | 'meeting' | 'update' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  body: string;
  data?: any;
  imageUrl?: string;
  actionUrl?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
  categories: Record<string, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  thisWeek: number;
  failed: number;
}

class NotificationService {
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
      console.error('Failed to initialize notification service:', error);
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
      // To get this: Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        console.error('Firebase VAPID key not configured. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY environment variable.');
        throw new Error('Firebase VAPID key not configured');
      }

      const token = await getToken(this.messaging, { vapidKey });

      if (token) {
        this.fcmToken = token;
        console.log('FCM Token obtained:', token);
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
  async registerDevice(): Promise<Device | null> {
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

      // Register with backend
      const response = await api.post('/notifications/devices/register', registrationData);

      if (response.data.success) {
        console.log('Device registered successfully:', response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Device registration failed:', error);
      return null;
    }
  }

  // Update FCM token (when it refreshes)
  async updateToken(newToken: string): Promise<boolean> {
    try {
      if (!this.deviceUuid) {
        throw new Error('No device UUID available');
      }

      const response = await api.put(`/notifications/devices/${this.deviceUuid}/token`, {
        fcmToken: newToken
      });

      if (response.data.success) {
        this.fcmToken = newToken;
        console.log('FCM token updated successfully');
        return true;
      } else {
        throw new Error(response.data.error || 'Token update failed');
      }
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

      // Deregister from backend
      const response = await api.delete(`/notifications/devices/${this.deviceUuid}`);

      if (response.data.success) {
        console.log('Device deregistered successfully');
        this.fcmToken = null;
        return true;
      } else {
        throw new Error(response.data.error || 'Deregistration failed');
      }
    } catch (error: any) {
      console.error('Failed to deregister device:', error);
      return false;
    }
  }

  // Get user's registered devices
  async getUserDevices(): Promise<Device[]> {
    try {
      const response = await api.get('/notifications/devices');

      if (response.data.success) {
        return response.data.data.devices || [];
      } else {
        throw new Error(response.data.error || 'Failed to get devices');
      }
    } catch (error: any) {
      console.error('Failed to get user devices:', error);
      return [];
    }
  }

  // Get user notifications
  async getNotifications(page: number = 1, limit: number = 20, status?: string): Promise<{
    notifications: Notification[];
    pagination: any;
  }> {
    try {
      const params: any = { page, limit };
      if (status) params.status = status;

      const response = await api.get('/notifications', { params });

      if (response.data.success) {
        return {
          notifications: response.data.data || [],
          pagination: response.data.pagination || {}
        };
      } else {
        throw new Error(response.data.error || 'Failed to get notifications');
      }
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      return { notifications: [], pagination: {} };
    }
  }

  // Mark notifications as read
  async markAsRead(notificationIds: string[]): Promise<boolean> {
    try {
      const response = await api.post('/notifications/mark-read', {
        notificationIds
      });

      if (response.data.success) {
        console.log('Notifications marked as read');
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to mark as read');
      }
    } catch (error: any) {
      console.error('Failed to mark notifications as read:', error);
      return false;
    }
  }

  // Get notification statistics
  async getStats(): Promise<NotificationStats | null> {
    try {
      const response = await api.get('/notifications/stats');

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get stats');
      }
    } catch (error: any) {
      console.error('Failed to get notification stats:', error);
      return null;
    }
  }

  // Get notification preferences
  async getPreferences(): Promise<NotificationPreferences | null> {
    try {
      const response = await api.get('/notifications/preferences');

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get preferences');
      }
    } catch (error: any) {
      console.error('Failed to get notification preferences:', error);
      return null;
    }
  }

  // Update notification preferences
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences | null> {
    try {
      const response = await api.put('/notifications/preferences', preferences);

      if (response.data.success) {
        console.log('Preferences updated successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update preferences');
      }
    } catch (error: any) {
      console.error('Failed to update notification preferences:', error);
      return null;
    }
  }

  // Send test notification
  async sendTestNotification(): Promise<boolean> {
    try {
      const response = await api.post('/notifications/test');

      if (response.data.success) {
        console.log('Test notification sent');
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to send test notification');
      }
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
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
export default new NotificationService();