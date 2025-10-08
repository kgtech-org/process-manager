import { apiClient } from '../api';

// Device types
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

export interface DeviceTokenUpdateRequest {
  fcmToken: string;
}

export interface DeviceListResponse {
  count: number;
  devices: Device[];
}

// Device Resource API
export class DeviceResource {
  /**
   * Register a new device
   */
  static async register(data: DeviceRegistrationRequest): Promise<Device> {
    const response = await apiClient.post('/notifications/devices/register', data);
    return response.data;
  }

  /**
   * Get all user devices
   */
  static async getAll(): Promise<Device[]> {
    const response = await apiClient.get('/notifications/devices');
    return response.data?.devices || [];
  }

  /**
   * Get device list with count
   */
  static async getList(): Promise<DeviceListResponse> {
    const response = await apiClient.get('/notifications/devices');
    return response.data || { count: 0, devices: [] };
  }

  /**
   * Get a specific device by UUID
   */
  static async getByUuid(deviceUuid: string): Promise<Device> {
    const response = await apiClient.get(`/notifications/devices/${deviceUuid}`);
    return response.data;
  }

  /**
   * Update device FCM token
   */
  static async updateToken(deviceUuid: string, fcmToken: string): Promise<Device> {
    const response = await apiClient.put(`/notifications/devices/${deviceUuid}/token`, {
      fcmToken
    });
    return response.data;
  }

  /**
   * Deregister a device
   */
  static async deregister(deviceUuid: string): Promise<void> {
    await apiClient.delete(`/notifications/devices/${deviceUuid}`);
  }

  /**
   * Get active devices only
   */
  static async getActive(): Promise<Device[]> {
    const devices = await this.getAll();
    return devices.filter(device => device.isActive);
  }

  /**
   * Get inactive devices only
   */
  static async getInactive(): Promise<Device[]> {
    const devices = await this.getAll();
    return devices.filter(device => !device.isActive);
  }

  /**
   * Get devices by type
   */
  static async getByType(deviceType: 'web' | 'android' | 'ios' | 'desktop'): Promise<Device[]> {
    const devices = await this.getAll();
    return devices.filter(device => device.deviceType === deviceType);
  }

  /**
   * Get web devices
   */
  static async getWebDevices(): Promise<Device[]> {
    return this.getByType('web');
  }

  /**
   * Get mobile devices (Android and iOS)
   */
  static async getMobileDevices(): Promise<Device[]> {
    const devices = await this.getAll();
    return devices.filter(device =>
      device.deviceType === 'android' || device.deviceType === 'ios'
    );
  }

  /**
   * Check if current device is registered
   */
  static async isDeviceRegistered(deviceUuid: string): Promise<boolean> {
    try {
      await this.getByUuid(deviceUuid);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get device count
   */
  static async getCount(): Promise<number> {
    const response = await this.getList();
    return response.count;
  }

  /**
   * Get active device count
   */
  static async getActiveCount(): Promise<number> {
    const devices = await this.getActive();
    return devices.length;
  }
}
