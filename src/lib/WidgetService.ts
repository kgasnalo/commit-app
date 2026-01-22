/**
 * WidgetService
 *
 * Service for updating iOS home screen widget data.
 * Communicates with the native WidgetModule to update widget content.
 */

import { NativeModules, Platform } from 'react-native';
import { captureError } from '../utils/errorLogger';

const { WidgetModule } = NativeModules;

interface WidgetData {
  bookTitle: string | null;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  deadline: string | null; // ISO 8601 format
  pagesRead: number;
  totalPages: number;
  hasActiveCommitment: boolean;
}

class WidgetServiceClass {
  private isAvailable: boolean;

  constructor() {
    // Widget is only available on iOS
    this.isAvailable = Platform.OS === 'ios' && WidgetModule !== null;
  }

  /**
   * Update widget with current commitment data
   */
  async updateWidget(data: WidgetData): Promise<boolean> {
    if (!this.isAvailable) {
      console.log('[WidgetService] Widget not available on this platform');
      return false;
    }

    try {
      await WidgetModule.updateWidget(
        data.bookTitle,
        data.bookAuthor,
        data.bookCoverUrl,
        data.deadline,
        data.pagesRead,
        data.totalPages,
        data.hasActiveCommitment
      );
      console.log('[WidgetService] Widget updated successfully');
      return true;
    } catch (error) {
      captureError(error, { location: 'WidgetService.updateWidget' });
      console.error('[WidgetService] Failed to update widget:', error);
      return false;
    }
  }

  /**
   * Clear widget data (show empty state)
   */
  async clearWidget(): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await WidgetModule.clearWidget();
      console.log('[WidgetService] Widget cleared');
      return true;
    } catch (error) {
      captureError(error, { location: 'WidgetService.clearWidget' });
      console.error('[WidgetService] Failed to clear widget:', error);
      return false;
    }
  }

  /**
   * Force reload widget timelines
   */
  async reloadWidget(): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      await WidgetModule.reloadWidget();
      console.log('[WidgetService] Widget reloaded');
      return true;
    } catch (error) {
      captureError(error, { location: 'WidgetService.reloadWidget' });
      console.error('[WidgetService] Failed to reload widget:', error);
      return false;
    }
  }

  /**
   * Helper to update widget from commitment data
   */
  async updateFromCommitment(commitment: {
    book?: {
      title: string;
      author: string;
      cover_url?: string | null;
    };
    deadline: string;
    target_pages: number;
  } | null, pagesRead: number = 0): Promise<boolean> {
    if (!commitment) {
      return this.clearWidget();
    }

    return this.updateWidget({
      bookTitle: commitment.book?.title || null,
      bookAuthor: commitment.book?.author || null,
      bookCoverUrl: commitment.book?.cover_url || null,
      deadline: commitment.deadline,
      pagesRead,
      totalPages: commitment.target_pages,
      hasActiveCommitment: true,
    });
  }
}

export const WidgetService = new WidgetServiceClass();
