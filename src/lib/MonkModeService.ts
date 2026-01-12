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

// Reading DNA types
export interface HeatmapDay {
  date: string;
  level: 0 | 1 | 2 | 3;
  totalSeconds: number;
  isToday: boolean;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalReadingDays: number;
  lastReadingDate: string | null;
}

export type ReaderType =
  | 'morning_reader'
  | 'night_reader'
  | 'sprinter'
  | 'marathon_runner'
  | 'weekend_warrior'
  | 'streak_reader'
  | 'balanced_reader';

export interface ReaderTypeResult {
  primary: ReaderType;
  secondary?: ReaderType;
  confidence: number;
}

export interface ReadingInsights {
  peakHour: number;
  avgSessionMinutes: number;
  totalSessions: number;
  thisMonthVsLast: number;
}

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

  // ========================================
  // Reading DNA Methods (Phase 4.6)
  // ========================================

  /**
   * Get heatmap data for the last N days
   * Level: 0=0min, 1=1-15min, 2=16-45min, 3=46min+
   */
  async getHeatmapData(days: number = 30): Promise<HeatmapDay[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Calculate start date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('duration_seconds, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString());

      if (error) {
        console.error('[MonkModeService] Failed to get heatmap data:', error);
        return [];
      }

      // Group by date
      const dailyTotals = new Map<string, number>();
      (data || []).forEach(session => {
        const date = new Date(session.completed_at).toISOString().split('T')[0];
        dailyTotals.set(date, (dailyTotals.get(date) || 0) + session.duration_seconds);
      });

      // Generate array for all days
      const today = new Date().toISOString().split('T')[0];
      const result: HeatmapDay[] = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const totalSeconds = dailyTotals.get(dateStr) || 0;
        const totalMinutes = totalSeconds / 60;

        let level: 0 | 1 | 2 | 3 = 0;
        if (totalMinutes >= 46) level = 3;
        else if (totalMinutes >= 16) level = 2;
        else if (totalMinutes >= 1) level = 1;

        result.push({
          date: dateStr,
          level,
          totalSeconds,
          isToday: dateStr === today,
        });
      }

      return result;
    } catch (error) {
      console.error('[MonkModeService] Unexpected error getting heatmap data:', error);
      return [];
    }
  }

  /**
   * Get streak statistics
   */
  async getStreakStats(): Promise<StreakStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { currentStreak: 0, longestStreak: 0, totalReadingDays: 0, lastReadingDate: null };
      }

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return { currentStreak: 0, longestStreak: 0, totalReadingDays: 0, lastReadingDate: null };
      }

      // Get unique dates
      const uniqueDates = [...new Set(
        data.map(s => new Date(s.completed_at).toISOString().split('T')[0])
      )].sort();

      const totalReadingDays = uniqueDates.length;
      const lastReadingDate = uniqueDates[uniqueDates.length - 1];

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 1;

      // Check if today or yesterday has activity for current streak
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const hasRecentActivity = lastReadingDate === today || lastReadingDate === yesterday;

      // Calculate longest streak
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      // Calculate current streak (counting backwards from most recent)
      if (hasRecentActivity) {
        currentStreak = 1;
        for (let i = uniqueDates.length - 2; i >= 0; i--) {
          const currDate = new Date(uniqueDates[i + 1]);
          const prevDate = new Date(uniqueDates[i]);
          const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      return { currentStreak, longestStreak, totalReadingDays, lastReadingDate };
    } catch (error) {
      console.error('[MonkModeService] Unexpected error getting streak stats:', error);
      return { currentStreak: 0, longestStreak: 0, totalReadingDays: 0, lastReadingDate: null };
    }
  }

  /**
   * Detect reader type based on reading patterns
   */
  async detectReaderType(): Promise<ReaderTypeResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { primary: 'balanced_reader', confidence: 0 };
      }

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('duration_seconds, completed_at')
        .eq('user_id', user.id);

      if (error || !data || data.length < 3) {
        return { primary: 'balanced_reader', confidence: data?.length ? 30 : 0 };
      }

      // Analyze patterns
      let morningCount = 0;
      let nightCount = 0;
      let weekendCount = 0;
      let totalDuration = 0;

      data.forEach(session => {
        const date = new Date(session.completed_at);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();

        // Time of day analysis
        if (hour >= 5 && hour < 12) morningCount++;
        else if (hour >= 19 || hour < 3) nightCount++;

        // Weekend analysis
        if (dayOfWeek === 0 || dayOfWeek === 6) weekendCount++;

        totalDuration += session.duration_seconds;
      });

      const avgSessionMinutes = totalDuration / data.length / 60;
      const weekendRatio = weekendCount / data.length;
      const morningRatio = morningCount / data.length;
      const nightRatio = nightCount / data.length;

      // Get streak for streak_reader detection
      const streakStats = await this.getStreakStats();

      // Determine primary type
      const scores: { type: ReaderType; score: number }[] = [];

      // Morning vs Night reader
      if (morningRatio > 0.5) {
        scores.push({ type: 'morning_reader', score: morningRatio * 100 });
      }
      if (nightRatio > 0.5) {
        scores.push({ type: 'night_reader', score: nightRatio * 100 });
      }

      // Sprinter vs Marathon runner
      if (avgSessionMinutes < 20) {
        scores.push({ type: 'sprinter', score: (20 - avgSessionMinutes) * 3 });
      }
      if (avgSessionMinutes > 45) {
        scores.push({ type: 'marathon_runner', score: (avgSessionMinutes - 45) * 2 });
      }

      // Weekend warrior
      if (weekendRatio > 0.6) {
        scores.push({ type: 'weekend_warrior', score: weekendRatio * 100 });
      }

      // Streak reader
      if (streakStats.currentStreak >= 7) {
        scores.push({ type: 'streak_reader', score: streakStats.currentStreak * 10 });
      }

      // Sort by score
      scores.sort((a, b) => b.score - a.score);

      if (scores.length === 0) {
        return { primary: 'balanced_reader', confidence: 50 };
      }

      const primary = scores[0].type;
      const secondary = scores.length > 1 ? scores[1].type : undefined;
      const confidence = Math.min(Math.round(scores[0].score), 95);

      return { primary, secondary, confidence };
    } catch (error) {
      console.error('[MonkModeService] Unexpected error detecting reader type:', error);
      return { primary: 'balanced_reader', confidence: 0 };
    }
  }

  /**
   * Get reading insights
   */
  async getReadingInsights(): Promise<ReadingInsights> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { peakHour: 0, avgSessionMinutes: 0, totalSessions: 0, thisMonthVsLast: 0 };
      }

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('duration_seconds, completed_at')
        .eq('user_id', user.id);

      if (error || !data || data.length === 0) {
        return { peakHour: 0, avgSessionMinutes: 0, totalSessions: 0, thisMonthVsLast: 0 };
      }

      // Calculate peak hour
      const hourCounts = new Array(24).fill(0);
      let totalDuration = 0;

      data.forEach(session => {
        const hour = new Date(session.completed_at).getHours();
        hourCounts[hour]++;
        totalDuration += session.duration_seconds;
      });

      const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
      const avgSessionMinutes = Math.round(totalDuration / data.length / 60);
      const totalSessions = data.length;

      // Calculate this month vs last month
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      let thisMonthMinutes = 0;
      let lastMonthMinutes = 0;

      data.forEach(session => {
        const date = new Date(session.completed_at);
        if (date >= thisMonthStart) {
          thisMonthMinutes += session.duration_seconds / 60;
        } else if (date >= lastMonthStart && date <= lastMonthEnd) {
          lastMonthMinutes += session.duration_seconds / 60;
        }
      });

      let thisMonthVsLast = 0;
      if (lastMonthMinutes > 0) {
        thisMonthVsLast = Math.round(((thisMonthMinutes - lastMonthMinutes) / lastMonthMinutes) * 100);
      } else if (thisMonthMinutes > 0) {
        thisMonthVsLast = 100;
      }

      return { peakHour, avgSessionMinutes, totalSessions, thisMonthVsLast };
    } catch (error) {
      console.error('[MonkModeService] Unexpected error getting reading insights:', error);
      return { peakHour: 0, avgSessionMinutes: 0, totalSessions: 0, thisMonthVsLast: 0 };
    }
  }
}

// Singleton export
export const MonkModeService = new MonkModeServiceClass();
