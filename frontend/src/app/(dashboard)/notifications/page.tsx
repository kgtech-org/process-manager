'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Settings, Trash2, Check, RefreshCw, Smartphone, Monitor, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import notificationService, { Notification, Device, NotificationPreferences, NotificationStats } from '@/services/notification.service';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('notifications');
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadData();
    setupNotificationListener();

    return () => {
      // Cleanup listeners
      notificationService.clearMessageListeners();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Initialize notification service
      await notificationService.initialize();

      // Load all data in parallel
      const [notificationsData, devicesData, prefsData, statsData] = await Promise.all([
        notificationService.getNotifications(),
        notificationService.getUserDevices(),
        notificationService.getPreferences(),
        notificationService.getStats()
      ]);

      setNotifications(notificationsData.notifications);
      setDevices(devicesData);
      setPreferences(prefsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Setup real-time notification listener
  const setupNotificationListener = () => {
    notificationService.addMessageListener((message) => {
      console.log('New notification received:', message);

      // Reload notifications
      loadNotifications();

      // Show toast for new notification
      toast({
        title: message.notification?.title || 'New Notification',
        description: message.notification?.body || 'You have a new notification',
      });
    });
  };

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);

      // Update stats
      const statsData = await notificationService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Register device for push notifications
  const handleRegisterDevice = async () => {
    setRegistering(true);
    try {
      const device = await notificationService.registerDevice();
      if (device) {
        toast({
          title: 'Success',
          description: 'Device registered for push notifications',
        });

        // Reload devices
        const devicesData = await notificationService.getUserDevices();
        setDevices(devicesData);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to register device. Please check notification permissions.',
        variant: 'destructive'
      });
    } finally {
      setRegistering(false);
    }
  };

  // Deregister device
  const handleDeregisterDevice = async (deviceUuid: string) => {
    try {
      const success = await notificationService.deregisterDevice();
      if (success) {
        toast({
          title: 'Success',
          description: 'Device unregistered successfully',
        });

        // Reload devices
        const devicesData = await notificationService.getUserDevices();
        setDevices(devicesData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unregister device',
        variant: 'destructive'
      });
    }
    setDeleteDeviceId(null);
  };

  // Mark notifications as read
  const handleMarkAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      const success = await notificationService.markAsRead(Array.from(selectedNotifications));
      if (success) {
        toast({
          title: 'Success',
          description: `Marked ${selectedNotifications.size} notification(s) as read`,
        });

        // Reload notifications
        await loadNotifications();
        setSelectedNotifications(new Set());
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive'
      });
    }
  };

  // Send test notification
  const handleSendTestNotification = async () => {
    try {
      const success = await notificationService.sendTestNotification();
      if (success) {
        toast({
          title: 'Success',
          description: 'Test notification sent. You should receive it shortly.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive'
      });
    }
  };

  // Update preferences
  const handleUpdatePreferences = async (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;

    try {
      const updatedPrefs = await notificationService.updatePreferences({
        [key]: value
      });

      if (updatedPrefs) {
        setPreferences(updatedPrefs);
        toast({
          title: 'Success',
          description: 'Preferences updated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive'
      });
    }
  };

  // Toggle notification selection
  const toggleNotificationSelection = (id: string) => {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNotifications(newSelection);
  };

  // Get notification badge variant
  const getNotificationBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'login': return 'text-blue-600';
      case 'activity': return 'text-green-600';
      case 'system': return 'text-purple-600';
      case 'alert': return 'text-red-600';
      case 'approval': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Manage your notifications and preferences</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.unread}</div>
                <p className="text-xs text-muted-foreground">Unread</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.today}</div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
            {stats?.unread ? (
              <Badge className="ml-2" variant="destructive">{stats.unread}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Smartphone className="h-4 w-4 mr-2" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                onClick={handleMarkAsRead}
                disabled={selectedNotifications.size === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Read ({selectedNotifications.size})
              </Button>
              <Button variant="outline" onClick={loadNotifications}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <Button variant="secondary" onClick={handleSendTestNotification}>
              Send Test Notification
            </Button>
          </div>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>Your latest notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.has(notification.id)}
                          onChange={() => toggleNotificationSelection(notification.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{notification.title}</h4>
                            <Badge variant={getNotificationBadgeVariant(notification.priority)}>
                              {notification.priority}
                            </Badge>
                            <span className={`text-xs ${getCategoryColor(notification.category)}`}>
                              {notification.category}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.body}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                            {notification.status === 'read' && (
                              <span className="text-green-600">Read</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Registered Devices</h2>
            <Button onClick={handleRegisterDevice} disabled={registering}>
              {registering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Register This Device
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-4">
            {devices.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No devices registered for push notifications</p>
                  <Button onClick={handleRegisterDevice} className="mt-4">
                    Register This Device
                  </Button>
                </CardContent>
              </Card>
            ) : (
              devices.map((device) => (
                <Card key={device.id}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      {device.deviceType === 'web' ? (
                        <Monitor className="h-8 w-8" />
                      ) : (
                        <Smartphone className="h-8 w-8" />
                      )}
                      <div>
                        <h3 className="font-semibold">{device.deviceName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {device.browser} • {device.platform}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Registered {formatDistanceToNow(new Date(device.registeredAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {device.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDeviceId(device.deviceUuid)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          {preferences ? (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Global Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Global Settings</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive push notifications to your devices</p>
                    </div>
                    <Switch
                      checked={preferences.pushEnabled}
                      onCheckedChange={(checked) => handleUpdatePreferences('pushEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={preferences.emailEnabled}
                      onCheckedChange={(checked) => handleUpdatePreferences('emailEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">Show notifications within the app</p>
                    </div>
                    <Switch
                      checked={preferences.inAppEnabled}
                      onCheckedChange={(checked) => handleUpdatePreferences('inAppEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sound</Label>
                      <p className="text-sm text-muted-foreground">Play sound for notifications</p>
                    </div>
                    <Switch
                      checked={preferences.soundEnabled}
                      onCheckedChange={(checked) => handleUpdatePreferences('soundEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Badge</Label>
                      <p className="text-sm text-muted-foreground">Show notification count badge</p>
                    </div>
                    <Switch
                      checked={preferences.badgeEnabled}
                      onCheckedChange={(checked) => handleUpdatePreferences('badgeEnabled', checked)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Category Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Notification Categories</h3>

                  {Object.entries(preferences.categories || {}).map(([category, enabled]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="capitalize">{category}</Label>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => {
                          const updatedCategories = { ...preferences.categories, [category]: checked };
                          handleUpdatePreferences('categories', updatedCategories);
                        }}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Quiet Hours */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Quiet Hours</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Quiet Hours</Label>
                      <p className="text-sm text-muted-foreground">Mute notifications during specified hours</p>
                    </div>
                    <Switch
                      checked={preferences.quietHoursEnabled}
                      onCheckedChange={(checked) => handleUpdatePreferences('quietHoursEnabled', checked)}
                    />
                  </div>

                  {preferences.quietHoursEnabled && (
                    <div className="text-sm text-muted-foreground">
                      Quiet hours: {preferences.quietHoursStart || '22:00'} - {preferences.quietHoursEnd || '08:00'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Loading preferences...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Device Dialog */}
      <AlertDialog open={!!deleteDeviceId} onOpenChange={() => setDeleteDeviceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this device? You will no longer receive push notifications on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDeviceId && handleDeregisterDevice(deleteDeviceId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}