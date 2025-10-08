'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { NotificationResource, DeviceResource, type NotificationStats, type Notification } from '@/lib/resources';
import firebaseMessaging from '@/services/firebase-messaging.service';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export const NotificationBell: React.FC = () => {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial stats
    loadNotificationStats();

    // Initialize notification service
    initializeNotifications();

    // Set up real-time listener
    firebaseMessaging.addMessageListener(handleNewNotification);

    return () => {
      firebaseMessaging.removeMessageListener(handleNewNotification);
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      await firebaseMessaging.initialize();

      // Check if device is registered
      const devices = await DeviceResource.getAll();
      if (devices.length === 0) {
        // Auto-register device if no devices are registered
        await firebaseMessaging.registerDevice();
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const loadNotificationStats = async () => {
    try {
      const statsData = await NotificationResource.getStats();
      setStats(statsData);

      // Load recent unread notifications
      if (statsData && statsData.unread > 0) {
        const notifications = await NotificationResource.getUnread(5);
        setRecentNotifications(notifications);
      }
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    }
  };

  const handleNewNotification = (message: any) => {
    // Reload stats when new notification arrives
    loadNotificationStats();

    // Show toast
    toast({
      title: message.notification?.title || 'New Notification',
      description: message.notification?.body || 'You have a new notification',
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationResource.markAsRead([notificationId]);
      // Reload stats
      await loadNotificationStats();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (recentNotifications.length === 0) return;

    try {
      const ids = recentNotifications.map(n => n.id);
      await NotificationResource.markAsRead(ids);

      // Clear recent notifications and reload stats
      setRecentNotifications([]);
      await loadNotificationStats();

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive'
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system':
        return '🔧';
      case 'alert':
        return '🚨';
      case 'activity':
        return '📊';
      case 'approval':
        return '✅';
      default:
        return '📬';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {stats && stats.unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {stats.unread > 99 ? '99+' : stats.unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {stats && stats.unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No unread notifications
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg">{getCategoryIcon(notification.category)}</span>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-tight">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="w-full text-center text-sm">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};