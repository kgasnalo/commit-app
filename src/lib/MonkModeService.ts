/**
 * MonkModeService - Monk Mode session management singleton
 * Phase 4.3 - Deep Reading Timer
 *
 * Handles:
 * - Saving reading sessions to database
 * - Retrieving session statistics
 * - Timer state persistence for background/crash recovery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Database } from '../types/database.types';

// Storage keys for timer state persistence
const STORAGE_KEYS = {
  TIMER_STATE: 'monk_mode_timer_state',
  LAST_DURATION: 'monk_mode_last_duration',
};

// Database types
type ReadingSession = Database['public']['Tables']['reading_sessions']['Row'];
type ReadingSessionInsert = Database['public']['Tables']['reading_sessions']['Insert'];

// Timer state for persistence
export interface PersistedTimerState {
  durationMinutes: number;
  startedAt: string; // ISO timestamp
  pausedAt: string | null; // ISO timestamp when paused
  totalPausedMs: number; // Total milliseconds spent paused
  bookId?: string;
  bookTitle?: string;
  notificationId?: string;
}

// Session summary for display
export interface SessionSummary {
  id: string;
  durationSeconds: number;
  bookTitle?: string;
  completedAt: Date;
}

class MonkModeServiceClass {
  /**
   * Save a completed reading session to the database
   */
  async saveSession(params: {
    durationSeconds: number;
    bookId?: string;
  }): Promise<{ success: boolean; error?: string; sessionId?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const sessionData: ReadingSessionInsert = {
        user_id: user.id,
        book_id: params.bookId || null,
        duration_seconds: params.durationSeconds,
        completed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('reading_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (error) {
        console.error('[MonkModeService] Failed to save session:', error);
        return { success: false, error: error.message };
      }

      console.log('[MonkModeService] Session saved:', data.id);
      return { success: true, sessionId: data.id };
    } catch (error) {
      console.error('[MonkModeService] Unexpected error saving session:', error);
      return { success: false, error: 'Unexpected error' };
    }
  }

  /**
   * Get total reading time for the current user (in seconds)
   */
  async getTotalReadingTime(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('duration_seconds')
        .eq('user_id', user.id);

      if (error || !data) {
        console.error('[MonkModeService] Failed to get total reading time:', error);
        return 0;
      }

      const totalSeconds = data.reduce((sum, session) => sum + session.duration_seconds, 0);
      return totalSeconds;
    } catch (error) {
      console.error('[MonkModeService] Unexpected error getting total reading time:', error);
      return 0;
    }
  }

  /**
   * Get recent reading sessions
   */
  async getRecentSessions(limit: number = 5): Promise<SessionSummary[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('reading_sessions')
        .select(`
          id,
          duration_seconds,
          completed_at,
          book:books(title)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error || !data) {
        console.error('[MonkModeService] Failed to get recent sessions:', error);
        return [];
      }

      return data.map(session => {
        // Handle book join response (array or object)
        const bookData = session.book;
        const bookTitle = Array.isArray(bookData)
          ? bookData[0]?.title
          : (bookData as { title: string } | null)?.title;

        return {
          id: session.id,
          durationSeconds: session.duration_seconds,
          bookTitle,
          completedAt: new Date(session.completed_at),
        };
      });
    } catch (error) {
      console.error('[MonkModeService] Unexpected error getting recent sessions:', error);
      return [];
    }
  }

  /**
   * Get monthly reading stats for the last n months
   */
  async getMonthlyStats(months: number = 6): Promise<{ labels: string[]; data: number[] }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { labels: [], data: [] };

      // Calculate start date (first day of n months ago)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - (months - 1));
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('duration_seconds, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error || !data) {
        console.error('[MonkModeService] Failed to get monthly stats:', error);
        return { labels: [], data: [] };
      }

      // Initialize map for all months in range
      const statsMap = new Map<string, number>();
      const labels: string[] = [];
      const currentDate = new Date(startDate);
      const now = new Date();

      while (currentDate <= now) {
        const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        // For label, use month name/number (e.g., "Jan" or "1月")
        // Storing ISO key in map, will generate labels later
        statsMap.set(key, 0);
        
        // Next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Aggregate data
      data.forEach(session => {
        const date = new Date(session.completed_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (statsMap.has(key)) {
          statsMap.set(key, statsMap.get(key)! + session.duration_seconds);
        }
      });

      // Prepare result
      const resultData: number[] = [];
      const resultLabels: string[] = [];

      statsMap.forEach((seconds, key) => {
        const [year, month] = key.split('-');
        resultLabels.push(month); // Just month number for brevity
        resultData.push(Math.round(seconds / 3600 * 10) / 10); // Convert to hours with 1 decimal
      });

      return { labels: resultLabels, data: resultData };
    } catch (error) {
      console.error('[MonkModeService] Unexpected error getting monthly stats:', error);
      return { labels: [], data: [] };
    }
  }

  /**
   * Persist timer state to AsyncStorage for background/crash recovery
   */
  async persistTimerState(state: PersistedTimerState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(state));
      console.log('[MonkModeService] Timer state persisted');
    } catch (error) {
      console.error('[MonkModeService] Failed to persist timer state:', error);
    }
  }

  /**
   * Restore timer state from AsyncStorage
   */
  async restoreTimerState(): Promise<PersistedTimerState | null> {
    try {
      const stateJson = await AsyncStorage.getItem(STORAGE_KEYS.TIMER_STATE);
      if (!stateJson) return null;

      const state: PersistedTimerState = JSON.parse(stateJson);
      console.log('[MonkModeService] Timer state restored');
      return state;
    } catch (error) {
      console.error('[MonkModeService] Failed to restore timer state:', error);
      return null;
    }
  }

  /**
   * Clear persisted timer state
   */
  async clearTimerState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
      console.log('[MonkModeService] Timer state cleared');
    } catch (error) {
      console.error('[MonkModeService] Failed to clear timer state:', error);
    }
  }

  /**
   * Save last used duration for convenience
   */
  async saveLastDuration(minutes: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_DURATION, String(minutes));
    } catch (error) {
      console.error('[MonkModeService] Failed to save last duration:', error);
    }
  }

  /**
   * Get last used duration
   */
  async getLastDuration(): Promise<number | null> {
    try {
      const duration = await AsyncStorage.getItem(STORAGE_KEYS.LAST_DURATION);
      return duration ? parseInt(duration, 10) : null;
    } catch (error) {
      console.error('[MonkModeService] Failed to get last duration:', error);
      return null;
    }
  }

  /**
   * Format duration for display (returns hours and minutes)
   */
  formatDuration(totalSeconds: number): { hours: number; minutes: number } {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return { hours, minutes };
  }

  /**
   * Format duration as string (e.g., "2h 30m" or "45m")
   */
  formatDurationString(totalSeconds: number, locale: string = 'ja'): string {
    const { hours, minutes } = this.formatDuration(totalSeconds);

    if (locale === 'ja') {
      if (hours > 0) {
        return `${hours}時間${minutes}分`;
      }
      return `${minutes}分`;
    } else if (locale === 'ko') {
      if (hours > 0) {
        return `${hours}시간 ${minutes}분`;
      }
      return `${minutes}분`;
    } else {
      // English
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
  }
}

// Singleton export
export const MonkModeService = new MonkModeServiceClass();
