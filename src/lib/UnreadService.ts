/**
 * UnreadService - 未読管理サービス
 *
 * お知らせ(announcements)と寄付投稿(donations)の未読数を管理する
 * AsyncStorageに「最後に見た日時」を保存し、Supabaseからその日時以降の件数を取得
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseInitialized } from './supabase';
import { getNowUTC } from './DateUtils';

// AsyncStorage keys
const LAST_SEEN_ANNOUNCEMENTS_KEY = 'unread_last_seen_announcements';
const LAST_SEEN_DONATIONS_KEY = 'unread_last_seen_donations';

export interface UnreadCounts {
  announcements: number;
  donations: number;
  total: number;
}

/**
 * Get the last seen timestamp for a content type
 */
async function getLastSeenTimestamp(type: 'announcements' | 'donations'): Promise<string | null> {
  const key = type === 'announcements' ? LAST_SEEN_ANNOUNCEMENTS_KEY : LAST_SEEN_DONATIONS_KEY;
  return AsyncStorage.getItem(key);
}

/**
 * Set the last seen timestamp for a content type to now
 */
async function setLastSeenTimestamp(type: 'announcements' | 'donations'): Promise<void> {
  const key = type === 'announcements' ? LAST_SEEN_ANNOUNCEMENTS_KEY : LAST_SEEN_DONATIONS_KEY;
  await AsyncStorage.setItem(key, getNowUTC());
}

/**
 * Get count of unread announcements (published after last seen)
 */
async function getUnreadAnnouncementsCount(): Promise<number> {
  // Supabase が初期化されていない場合は 0 を返す
  if (!isSupabaseInitialized()) {
    return 0;
  }

  try {
    const lastSeen = await getLastSeenTimestamp('announcements');

    let query = supabase
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .not('published_at', 'is', null)
      .lte('published_at', getNowUTC());

    // Filter by last seen time if available
    if (lastSeen) {
      query = query.gt('published_at', lastSeen);
    }

    // Also filter out expired announcements
    const now = getNowUTC();
    query = query.or(`expires_at.is.null,expires_at.gt.${now}`);

    const { count, error } = await query;

    if (error) {
      console.error('[UnreadService] Error fetching announcements count:', error);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error('[UnreadService] Unexpected error in getUnreadAnnouncementsCount:', err);
    return 0;
  }
}

/**
 * Get count of unread donations (created after last seen)
 */
async function getUnreadDonationsCount(): Promise<number> {
  // Supabase が初期化されていない場合は 0 を返す
  if (!isSupabaseInitialized()) {
    return 0;
  }

  try {
    const lastSeen = await getLastSeenTimestamp('donations');

    let query = supabase
      .from('donations')
      .select('id', { count: 'exact', head: true });

    // Filter by last seen time if available
    if (lastSeen) {
      query = query.gt('created_at', lastSeen);
    }

    const { count, error } = await query;

    if (error) {
      console.error('[UnreadService] Error fetching donations count:', error);
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error('[UnreadService] Unexpected error in getUnreadDonationsCount:', err);
    return 0;
  }
}

/**
 * Get all unread counts at once
 */
export async function getUnreadCounts(): Promise<UnreadCounts> {
  const [announcements, donations] = await Promise.all([
    getUnreadAnnouncementsCount(),
    getUnreadDonationsCount(),
  ]);

  return {
    announcements,
    donations,
    total: announcements + donations,
  };
}

/**
 * Mark content type as read (update last seen timestamp to now)
 */
export async function markAsRead(type: 'announcements' | 'donations'): Promise<void> {
  await setLastSeenTimestamp(type);
}

/**
 * Clear all last seen timestamps (for testing or reset)
 */
export async function clearLastSeenTimestamps(): Promise<void> {
  await AsyncStorage.multiRemove([LAST_SEEN_ANNOUNCEMENTS_KEY, LAST_SEEN_DONATIONS_KEY]);
}

/**
 * Initialize last seen timestamps if not set
 * Call this when user first logs in to avoid showing all existing content as unread
 */
export async function initializeLastSeenTimestamps(): Promise<void> {
  const [announcementsSeen, donationsSeen] = await Promise.all([
    getLastSeenTimestamp('announcements'),
    getLastSeenTimestamp('donations'),
  ]);

  const now = getNowUTC();

  if (!announcementsSeen) {
    await AsyncStorage.setItem(LAST_SEEN_ANNOUNCEMENTS_KEY, now);
  }

  if (!donationsSeen) {
    await AsyncStorage.setItem(LAST_SEEN_DONATIONS_KEY, now);
  }
}
