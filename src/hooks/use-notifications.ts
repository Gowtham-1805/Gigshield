import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  type: 'weather' | 'claim' | 'payout';
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    const mapped = (data || []).map((n: any) => ({
      ...n,
      type: n.type as Notification['type'],
      metadata: (n.metadata || {}) as Record<string, unknown>,
    }));

    setNotifications(mapped);
    setUnreadCount(mapped.filter((n: Notification) => !n.is_read).length);
    setLoading(false);
  }, [user]);

  // Subscribe to realtime inserts for this user
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = {
            ...payload.new,
            type: (payload.new as any).type as Notification['type'],
            metadata: ((payload.new as any).metadata || {}) as Record<string, unknown>,
          } as Notification;

          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show WhatsApp-styled toast
          const iconMap: Record<string, string> = {
            weather: '🌧️',
            claim: '📋',
            payout: '💰',
          };

          toast.success(newNotif.title, {
            description: newNotif.message,
            duration: 5000,
            icon: iconMap[newNotif.type] || '🔔',
            style: {
              background: newNotif.type === 'weather'
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : newNotif.type === 'payout'
                ? 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
