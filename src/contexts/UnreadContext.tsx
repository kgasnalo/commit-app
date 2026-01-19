/**
 * UnreadContext - 未読状態を管理するContext
 *
 * お知らせ(announcements)と寄付投稿(donations)の未読数をグローバルに管理
 * Supabase Realtimeで新規投稿を監視し、自動的に未読数を更新
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  UnreadCounts,
  getUnreadCounts,
  markAsRead as markAsReadService,
  initializeLastSeenTimestamps,
} from '../lib/UnreadService';

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

    // Subscribe to announcements table changes
    const announcementsChannel = supabase
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
    const donationsChannel = supabase
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

    return () => {
      announcementsChannel.unsubscribe();
      donationsChannel.unsubscribe();
    };
  }, [isInitialized, refreshCounts]);

  const value: UnreadContextValue = {
    unreadCounts,
    isLoading,
    markAsRead,
    refreshCounts,
  };

  return (
    <UnreadContext.Provider value={value}>
      {children}
    </UnreadContext.Provider>
  );
}

/**
 * Hook to access unread state
 */
export function useUnread(): UnreadContextValue {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error('useUnread must be used within an UnreadProvider');
  }
  return context;
}
