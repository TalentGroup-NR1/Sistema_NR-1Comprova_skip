import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export const ADMIN_NOTIFICATIONS_KEY = ['admin-notifications'];

export function useAdminNotifications(limit = 20) {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [...ADMIN_NOTIFICATIONS_KEY, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_notifications', { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as unknown as AdminNotification[];
    },
    enabled: !!isSuperAdmin,
    refetchOnWindowFocus: true,
  });

  // Realtime: novas solicitações chegam sem refresh
  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const channel = supabase
      .channel(`admin_notifications_stream_${Date.now()}_${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_notifications' },
        () => {
          qc.invalidateQueries({ queryKey: ADMIN_NOTIFICATIONS_KEY });
          qc.invalidateQueries({ queryKey: ['contact-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, qc]);

  return query;
}

export function useMarkAdminNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('mark_admin_notification_read', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllAdminNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_admin_notifications_read');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_NOTIFICATIONS_KEY }),
  });
}
