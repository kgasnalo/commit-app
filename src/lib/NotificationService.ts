/**
 * NotificationService - Smart notification orchestration singleton
 * Phase 4.1 - Dynamic Pacemaker
 *
 * Handles local push notifications for reading reminders.
 * Calculates daily reading targets based on remaining pages/days.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import i18n from '../i18n';

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATION_ENABLED: 'notification_enabled',
  NOTIFICATION_TIME: 'notification_time', // HH:mm format
  LAST_SCHEDULED_DATE: 'notification_last_scheduled',
};

// Default notification time: 8:00 AM
const DEFAULT_NOTIFICATION_TIME = '08:00';

export interface NotificationPreferences {
  enabled: boolean;
  dailyTime: string; // HH:mm format
}

export interface PacemakerData {
  bookTitle: string;
  remainingPages: number;
  remainingDays: number;
  dailyTarget: number;
  isUrgent: boolean; // <= 3 days remaining
  isBehind: boolean; // progress < expected
  deadlineDate: string;
}

class NotificationServiceClass {
  private isInitialized = false;
  private preferences: NotificationPreferences = {
    enabled: true,
    dailyTime: DEFAULT_NOTIFICATION_TIME,
  };

  /**
   * Initialize notification service
   * - Configure notification handler
   * - Load saved preferences
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Load saved preferences
      await this.loadPreferences();

      this.isInitialized = true;
      console.log('[NotificationService] Initialized successfully');
      return true;
    } catch (error) {
      console.warn('[NotificationService] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   * Returns true if granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      if (existingStatus === 'granted') return true;

      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('[NotificationService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('[NotificationService] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Load preferences from AsyncStorage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const enabled = await AsyncStorage.getItem(
        STORAGE_KEYS.NOTIFICATION_ENABLED
      );
      const time = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_TIME);

      this.preferences = {
        enabled: enabled !== 'false', // default true
        dailyTime: time || DEFAULT_NOTIFICATION_TIME,
      };
    } catch (error) {
      console.warn('[NotificationService] Failed to load preferences:', error);
    }
  }

  /**
   * Save preferences to AsyncStorage
   */
  async savePreferences(
    prefs: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      if (prefs.enabled !== undefined) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.NOTIFICATION_ENABLED,
          String(prefs.enabled)
        );
        this.preferences.enabled = prefs.enabled;
      }

      if (prefs.dailyTime) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.NOTIFICATION_TIME,
          prefs.dailyTime
        );
        this.preferences.dailyTime = prefs.dailyTime;
      }

      // Reschedule notifications with new preferences
      if (this.preferences.enabled) {
        await this.scheduleAllNotifications();
      } else {
        await this.cancelAllNotifications();
      }
    } catch (error) {
      console.error('[NotificationService] Failed to save preferences:', error);
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Calculate pacemaker data for a commitment
   */
  calculatePacemakerData(
    commitment: {
      deadline: string;
      target_pages: number;
      created_at: string;
    },
    bookTitle: string,
    pagesAlreadyRead: number = 0
  ): PacemakerData {
    const now = new Date();
    const deadline = new Date(commitment.deadline);
    const createdAt = new Date(commitment.created_at);
    const diffMs = deadline.getTime() - now.getTime();
    const remainingDays = Math.max(
      1,
      Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    );

    const remainingPages = Math.max(
      0,
      commitment.target_pages - pagesAlreadyRead
    );
    const dailyTarget = Math.ceil(remainingPages / remainingDays);

    // Calculate if behind schedule
    const totalDurationMs = deadline.getTime() - createdAt.getTime();
    const elapsedMs = now.getTime() - createdAt.getTime();
    const expectedProgress = elapsedMs / totalDurationMs;
    const actualProgress = pagesAlreadyRead / commitment.target_pages;
    const isBehind = actualProgress < expectedProgress * 0.8;

    return {
      bookTitle,
      remainingPages,
      remainingDays,
      dailyTarget,
      isUrgent: remainingDays <= 3,
      isBehind,
      deadlineDate: deadline.toISOString(),
    };
  }

  /**
   * Get notification content based on progress state
   * Personalized, high-tier copywriting
   */
  private getNotificationContent(data: PacemakerData): {
    title: string;
    body: string;
  } {
    const { dailyTarget, remainingDays, bookTitle, isBehind, isUrgent } = data;

    if (isUrgent) {
      if (remainingDays <= 1) {
        return {
          title: i18n.t('notifications.final_day_title'),
          body: i18n.t('notifications.final_day_body', {
            pages: dailyTarget,
            book: bookTitle,
          }),
        };
      }
      return {
        title: i18n.t('notifications.urgent_title', { days: remainingDays }),
        body: i18n.t('notifications.urgent_body', {
          days: remainingDays,
          pages: dailyTarget,
          book: bookTitle,
        }),
      };
    }

    if (isBehind) {
      return {
        title: i18n.t('notifications.behind_title'),
        body: i18n.t('notifications.behind_body', {
          pages: dailyTarget,
          book: bookTitle,
        }),
      };
    }

    // On track
    return {
      title: i18n.t('notifications.daily_title'),
      body: i18n.t('notifications.daily_body', {
        pages: dailyTarget,
        book: bookTitle,
      }),
    };
  }

  /**
   * Schedule daily reading reminder
   */
  async scheduleDailyReminder(data: PacemakerData): Promise<string | null> {
    if (!this.preferences.enabled) return null;

    const hasPermission = await this.hasPermissions();
    if (!hasPermission) return null;

    try {
      // Parse notification time
      const [hours, minutes] = this.preferences.dailyTime
        .split(':')
        .map(Number);

      // Get notification content based on progress state
      const { title, body } = this.getNotificationContent(data);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'daily_reminder', bookTitle: data.bookTitle },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });

      console.log(
        '[NotificationService] Scheduled daily reminder:',
        identifier
      );
      return identifier;
    } catch (error) {
      console.error(
        '[NotificationService] Failed to schedule notification:',
        error
      );
      return null;
    }
  }

  /**
   * Schedule notifications for all active commitments
   */
  async scheduleAllNotifications(): Promise<void> {
    if (!this.preferences.enabled) return;

    try {
      // Cancel existing notifications first
      await this.cancelAllNotifications();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active commitments with book info
      const { data: commitments, error } = await supabase
        .from('commitments')
        .select(
          `
          id,
          deadline,
          target_pages,
          created_at,
          book:books(id, title)
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error || !commitments?.length) {
        console.log(
          '[NotificationService] No active commitments to schedule notifications for'
        );
        return;
      }

      // Find the most urgent commitment to schedule notification for
      let mostUrgent: (typeof commitments)[0] | null = null;
      let earliestDeadline = new Date('2099-12-31');

      for (const commitment of commitments) {
        const deadline = new Date(commitment.deadline);
        if (deadline < earliestDeadline) {
          earliestDeadline = deadline;
          mostUrgent = commitment;
        }
      }

      if (mostUrgent) {
        // Get book title (handle array response from Supabase join)
        const bookData = mostUrgent.book;
        const bookTitle = Array.isArray(bookData)
          ? bookData[0]?.title || 'Unknown'
          : (bookData as { title: string })?.title || 'Unknown';

        const pacemakerData = this.calculatePacemakerData(
          {
            deadline: mostUrgent.deadline,
            target_pages: mostUrgent.target_pages,
            created_at: mostUrgent.created_at,
          },
          bookTitle,
          0 // For simplicity, assume starting fresh
        );

        await this.scheduleDailyReminder(pacemakerData);
      }

      // Store last scheduled date
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SCHEDULED_DATE,
        new Date().toISOString()
      );

      console.log('[NotificationService] All notifications scheduled');
    } catch (error) {
      console.error(
        '[NotificationService] Failed to schedule all notifications:',
        error
      );
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[NotificationService] Cancelled all notifications');
    } catch (error) {
      console.error(
        '[NotificationService] Failed to cancel notifications:',
        error
      );
    }
  }

  /**
   * Enable/disable notifications
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.savePreferences({ enabled });
  }

  /**
   * Set daily notification time
   */
  async setDailyTime(time: string): Promise<void> {
    await this.savePreferences({ dailyTime: time });
  }

  /**
   * Get all currently scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error(
        '[NotificationService] Failed to get scheduled notifications:',
        error
      );
      return [];
    }
  }

  /**
   * Schedule timer completion notification for Monk Mode
   * Uses TIME_INTERVAL trigger to fire after specified seconds
   */
  async scheduleTimerCompletion(
    durationSeconds: number,
    bookTitle?: string
  ): Promise<string | null> {
    if (!this.preferences.enabled) return null;

    const hasPermission = await this.hasPermissions();
    if (!hasPermission) return null;

    try {
      const title = i18n.t('monkmode.notification_title');
      const body = bookTitle
        ? i18n.t('monkmode.notification_body_book', { book: bookTitle })
        : i18n.t('monkmode.notification_body');

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'monk_mode_complete', bookTitle },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: durationSeconds,
          repeats: false,
        },
      });

      console.log(
        '[NotificationService] Scheduled timer completion:',
        identifier,
        'in',
        durationSeconds,
        'seconds'
      );
      return identifier;
    } catch (error) {
      console.error(
        '[NotificationService] Failed to schedule timer completion:',
        error
      );
      return null;
    }
  }

  /**
   * Cancel a specific scheduled notification by ID
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('[NotificationService] Cancelled notification:', identifier);
    } catch (error) {
      console.error(
        '[NotificationService] Failed to cancel notification:',
        error
      );
    }
  }
}

// Singleton export
export const NotificationService = new NotificationServiceClass();
