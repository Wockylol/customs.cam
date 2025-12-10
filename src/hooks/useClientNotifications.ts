// Client-side notification system for creators
// Separate from the team notification system

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string; // For replacing notifications
  requireInteraction?: boolean;
}

export const useClientNotifications = (clientId?: string) => {
  const permissionGranted = useRef(false);
  const lastNotificationTime = useRef<{ [key: string]: number }>({});

  /**
   * Request notification permission from the browser
   */
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionGranted.current = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionGranted.current = permission === 'granted';
      return permission === 'granted';
    }

    return false;
  }, []);

  /**
   * Show a browser notification
   */
  const showNotification = useCallback((options: NotificationOptions) => {
    if (!permissionGranted.current || Notification.permission !== 'granted') {
      return;
    }

    // Rate limit: Don't show same notification type more than once per minute
    const now = Date.now();
    const tag = options.tag || 'default';
    const lastTime = lastNotificationTime.current[tag] || 0;
    
    if (now - lastTime < 60000) {
      // Less than 1 minute since last notification of this type
      return;
    }

    lastNotificationTime.current[tag] = now;

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      silent: false,
    });

    // Auto-close after 10 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }

    // Handle click - focus the window
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, []);

  /**
   * Subscribe to new custom requests for this client
   */
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`client_customs_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'custom_requests',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const custom = payload.new as any;
          
          // Only notify for requests needing client approval
          if (custom.status === 'pending_client_approval') {
            showNotification({
              title: '💰 New Request Waiting!',
              body: `${custom.fan_name} wants a custom - $${custom.proposed_amount}`,
              tag: 'new_custom',
              requireInteraction: true,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_requests',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const custom = payload.new as any;
          const oldCustom = payload.old as any;
          
          // Notify when status changes to in_progress (ready for upload)
          if (oldCustom.status !== 'in_progress' && custom.status === 'in_progress') {
            showNotification({
              title: '📸 Ready to Upload!',
              body: `${custom.fan_name}'s request was approved - time to create!`,
              tag: 'ready_upload',
            });
          }
          
          // Notify when status changes to delivered (completed)
          if (oldCustom.status !== 'delivered' && custom.status === 'delivered') {
            showNotification({
              title: '🎉 Request Delivered!',
              body: `${custom.fan_name} received their custom - $${custom.proposed_amount} earned!`,
              tag: 'delivered',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, showNotification]);

  /**
   * Subscribe to new scene assignments
   */
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`client_scenes_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_scene_assignments',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          showNotification({
            title: '🎬 New Scene Assigned!',
            body: 'Your team assigned you a new content scene',
            tag: 'new_scene',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, showNotification]);

  /**
   * Request permission on mount (after short delay)
   */
  useEffect(() => {
    if (clientId && Notification.permission === 'default') {
      // Wait 5 seconds before asking
      const timer = setTimeout(() => {
        requestPermission();
      }, 5000);
      
      return () => clearTimeout(timer);
    } else if (Notification.permission === 'granted') {
      permissionGranted.current = true;
    }
  }, [clientId, requestPermission]);

  return {
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window,
    permission: typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied',
  };
};

