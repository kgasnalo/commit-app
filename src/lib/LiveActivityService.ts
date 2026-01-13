/**
 * LiveActivityService - iOS Live Activity management for Monk Mode timer
 * Phase 4.4 - Lock Screen Live Activity
 *
 * Handles:
 * - Starting Live Activity when timer begins
 * - Updating Live Activity every second
 * - Ending Live Activity on completion/cancel
 * - Graceful degradation for Android and iOS < 16.2
 */

import { Platform } from 'react-native';
import i18n from '../i18n';

// Types for expo-live-activity
interface LiveActivityState {
  title: string;
  subtitle?: string;
  progress?: {
    current: number;
    total: number;
  };
  timer?: {
    date: number; // End time in epoch milliseconds
  };
}

interface LiveActivityConfig {
  activityType?: string;
}

// Conditional import for iOS-only functionality
let ExpoLiveActivity: {
  startActivity: (state: LiveActivityState, config?: LiveActivityConfig) => string;
  updateActivity: (activityId: string, state: LiveActivityState) => void;
  endActivity: (activityId: string, state?: LiveActivityState) => void;
  areActivitiesEnabled: () => boolean;
} | null = null;

if (Platform.OS === 'ios') {
  try {
    ExpoLiveActivity = require('expo-live-activity');
  } catch (e) {
  }
}

class LiveActivityServiceClass {
  private currentActivityId: string | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.checkSupport();
  }

  /**
   * Check if Live Activities are supported on this device
   */
  private checkSupport(): void {
    if (Platform.OS !== 'ios' || !ExpoLiveActivity) {
      this.isSupported = false;
      return;
    }

    try {
      if (typeof ExpoLiveActivity.areActivitiesEnabled !== 'function') {
        this.isSupported = false;
        return;
      }
      this.isSupported = ExpoLiveActivity.areActivitiesEnabled();
    } catch (e) {
      this.isSupported = false;
    }
  }

  /**
   * Check if Live Activities are supported
   */
  isLiveActivitySupported(): boolean {
    return this.isSupported;
  }

  /**
   * Start a Live Activity for Monk Mode timer
   */
  startTimerActivity(params: {
    durationSeconds: number;
    bookTitle?: string;
  }): string | null {
    if (!this.isSupported || !ExpoLiveActivity) {
      return null;
    }

    try {
      // Calculate end time
      const endTime = Date.now() + params.durationSeconds * 1000;

      const state: LiveActivityState = {
        title: params.bookTitle || i18n.t('monkmode.live_activity_title'),
        subtitle: i18n.t('monkmode.live_activity_subtitle_reading'),
        timer: {
          date: endTime,
        },
        progress: {
          current: 0,
          total: params.durationSeconds,
        },
      };

      this.currentActivityId = ExpoLiveActivity.startActivity(state);
      return this.currentActivityId;
    } catch (error) {
      console.error('[LiveActivityService] Failed to start activity:', error);
      return null;
    }
  }

  /**
   * Update Live Activity with new remaining time
   * Called every second by the timer
   */
  updateTimerActivity(params: {
    remainingSeconds: number;
    totalSeconds: number;
    isPaused: boolean;
    bookTitle?: string;
  }): void {
    if (!this.isSupported || !ExpoLiveActivity || !this.currentActivityId) {
      return;
    }

    try {
      const elapsedSeconds = params.totalSeconds - params.remainingSeconds;

      const state: LiveActivityState = {
        title: params.bookTitle || i18n.t('monkmode.live_activity_title'),
        subtitle: params.isPaused
          ? i18n.t('monkmode.live_activity_subtitle_paused')
          : i18n.t('monkmode.live_activity_subtitle_reading'),
        progress: {
          current: elapsedSeconds,
          total: params.totalSeconds,
        },
      };

      // Only include timer countdown if not paused
      if (!params.isPaused) {
        state.timer = {
          date: Date.now() + params.remainingSeconds * 1000,
        };
      }

      ExpoLiveActivity.updateActivity(this.currentActivityId, state);
    } catch (error) {
      console.error('[LiveActivityService] Failed to update activity:', error);
    }
  }

  /**
   * End the Live Activity (on complete or cancel)
   */
  stopTimerActivity(params?: {
    completed: boolean;
    bookTitle?: string;
  }): void {
    if (!this.isSupported || !ExpoLiveActivity || !this.currentActivityId) {
      return;
    }

    try {
      const finalState: LiveActivityState = {
        title: params?.completed
          ? i18n.t('monkmode.live_activity_completed')
          : i18n.t('monkmode.live_activity_ended'),
        subtitle: params?.bookTitle || i18n.t('monkmode.live_activity_title'),
        progress: {
          current: params?.completed ? 1 : 0,
          total: 1,
        },
      };

      ExpoLiveActivity.endActivity(this.currentActivityId, finalState);
      this.currentActivityId = null;
    } catch (error) {
      console.error('[LiveActivityService] Failed to stop activity:', error);
      this.currentActivityId = null;
    }
  }

  /**
   * Get current activity ID (for debugging/state management)
   */
  getCurrentActivityId(): string | null {
    return this.currentActivityId;
  }

  /**
   * Check if an activity is currently running
   */
  hasActiveActivity(): boolean {
    return this.currentActivityId !== null;
  }
}

// Singleton export
export const LiveActivityService = new LiveActivityServiceClass();
