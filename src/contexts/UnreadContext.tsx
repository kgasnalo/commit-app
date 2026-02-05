/**
 * UnreadContext - 未読状態を管理するContext
 *
 * お知らせ(announcements)と寄付投稿(donations)の未読数をグローバルに管理
 * Supabase Realtimeで新規投稿を監視し、自動的に未読数を更新
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase, isSupabaseInitialized } from '../lib/supabase';
import {
  UnreadCounts,
  getUnreadCounts,
  markAsRead as markAsReadService,
  initializeLastSeenTimestamps,
} from '../lib/UnreadService';
import { captureError } from '../utils/errorLogger';

interface UnreadContextValue {
  /** Current unread counts */
  unreadCounts: UnreadCounts;
  /** Whether the counts are being loaded */
  isLoading: boolean;
  /** Mark a content type as read */
  markAsRead: (type: 'announcements' | 'donations') => Promise<void>;
  /** Refresh unread counts from server */
  refreshCounts: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextValue | null>(null);

interface UnreadProviderProps {
  children: ReactNode;
}

export function UnreadProvider({ children }: UnreadProviderProps) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    announcements: 0,
    donations: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Fetch unread counts from server
   */
  const refreshCounts = useCallback(async () => {
    try {
      const counts = await getUnreadCounts();
      setUnreadCounts(counts);
    } catch (err) {
      console.error('[UnreadContext] Error refreshing counts:', err);
    }
  }, []);

  /**
   * Mark a content type as read and update counts
   */
  const markAsRead = useCallback(async (type: 'announcements' | 'donations') => {
    try {
      await markAsReadService(type);
      // Update local state immediately
      setUnreadCounts((prev) => {
        const newCount = type === 'announcements'
          ? { ...prev, announcements: 0, total: prev.donations }
          : { ...prev, donations: 0, total: prev.announcements };
        return newCount;
      });
    } catch (err) {
      console.error('[UnreadContext] Error marking as read:', err);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    async function initialize() {
      // Supabase が初期化されていない場合はスキップ
      if (!isSupabaseInitialized()) {
        console.warn('[UnreadContext] Supabase not initialized, skipping');
        setIsLoading(false);
        return;
      }

      try {
        // Initialize last seen timestamps for new users
        await initializeLastSeenTimestamps();
        // Fetch initial counts
        await refreshCounts();
        setIsInitialized(true);
      } catch (err) {
        console.error('[UnreadContext] Error initializing:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [refreshCounts]);

  /**
   * Subscribe to Realtime changes for announcements and donations
   */
  useEffect(() => {
    if (!isInitialized) return;

    // Supabase が初期化されていない場合は Realtime をスキップ
    if (!isSupabaseInitialized()) {
      console.warn('[UnreadContext] Supabase not initialized, skipping Realtime');
      return;
    }

    let announcementsChannel: ReturnType<typeof supabase.channel> | null = null;
    let donationsChannel: ReturnType<typeof supabase.channel> | null = null;

    try {
      // Subscribe to announcements table changes
      announcementsChannel = supabase
        .channel('unread-announcements')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'announcements',
          },
          (payload) => {
            // Check if this is a publish event (published_at changed from null to non-null)
            const oldPublishedAt = payload.old?.published_at;
            const newPublishedAt = payload.new?.published_at;

            if (!oldPublishedAt && newPublishedAt) {
              // New announcement published, refresh counts
              refreshCounts();
            }
          }
        )
        .subscribe();

      // Subscribe to donations table changes
      donationsChannel = supabase
        .channel('unread-donations')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'donations',
          },
          () => {
            // New donation posted, refresh counts
            refreshCounts();
          }
        )
        .subscribe();
    } catch (err) {
      console.error('[UnreadContext] Error setting up Realtime subscriptions:', err);
      captureError(err, { location: 'UnreadContext.Realtime.subscribe' });
    }

    return () => {
      try {
        announcementsChannel?.unsubscribe();
        donationsChannel?.unsubscribe();
      } catch (err) {
        // Non-critical: silently ignore unsubscribe errors
        if (__DEV__) console.warn('[UnreadContext] Error unsubscribing:', err);
      }
    };
  }, [isInitialized, refreshCounts]);

  const value = useMemo<UnreadContextValue>(() => ({
    unreadCounts,
    isLoading,
    markAsRead,
    refreshCounts,
  }), [unreadCounts, isLoading, markAsRead, refreshCounts]);

  return (
    <UnreadContext.Provider value={value}>
      {children}
    </UnreadContext.Provider>
  );
}

/**
 * Safe default values for when useUnread is called outside of provider
 * This prevents crashes during navigation stack transitions
 */
const SAFE_DEFAULTS: UnreadContextValue = {
  unreadCounts: { announcements: 0, donations: 0, total: 0 },
  isLoading: true,
  markAsRead: async () => {},
  refreshCounts: async () => {},
};

/**
 * Hook to access unread state
 * Returns safe defaults if called outside UnreadProvider (prevents crashes during stack transitions)
 */
export function useUnread(): UnreadContextValue {
  const context = useContext(UnreadContext);
  if (!context) {
    // Don't throw - return safe defaults to prevent crashes during navigation transitions
    if (__DEV__) console.warn('[UnreadContext] useUnread called outside UnreadProvider, returning safe defaults');
    captureError(new Error('useUnread called outside UnreadProvider'), {
      location: 'UnreadContext.useUnread',
    });
    return SAFE_DEFAULTS;
  }
  return context;
}
