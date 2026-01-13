/**
 * MetricsService - Sentry Metrics for tracking critical user actions
 * Phase 8.1 - Reliability & Ops
 *
 * Usage:
 *   MetricsService.incrementCommitmentCreated();
 *   MetricsService.incrementCommitmentCompleted();
 *   MetricsService.trackReadingSession(durationMinutes);
 */

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '../config/env';

// Types for metrics
type MetricTags = Record<string, string>;

/**
 * MetricsService provides methods to track critical user actions
 * using Sentry's metrics API (breadcrumbs as fallback)
 */
export const MetricsService = {
  /**
   * Internal: Add metric as breadcrumb (Sentry metrics may not be available in RN)
   */
  _trackMetric(name: string, value: number, tags?: MetricTags): void {
    if (!SENTRY_DSN) return;

    // Add as breadcrumb for debugging context
    Sentry.addBreadcrumb({
      category: 'metric',
      message: `${name}: ${value}`,
      data: { name, value, ...tags },
      level: 'info',
    });

    // Log for debugging
    if (__DEV__) {
      console.log(`[Metrics] ${name}: ${value}`, tags);
    }
  },

  // ==========================================
  // Commitment Metrics
  // ==========================================

  /**
   * Track when a commitment is created
   */
  incrementCommitmentCreated(currency?: string): void {
    this._trackMetric('commitment.created', 1, { currency: currency || 'unknown' });
  },

  /**
   * Track when a commitment is completed successfully
   */
  incrementCommitmentCompleted(daysEarly?: number): void {
    this._trackMetric('commitment.completed', 1, {
      days_early: String(daysEarly || 0),
    });
  },

  /**
   * Track when a commitment defaults (deadline missed)
   */
  incrementCommitmentDefaulted(): void {
    this._trackMetric('commitment.defaulted', 1);
  },

  /**
   * Track lifeline usage
   */
  incrementLifelineUsed(): void {
    this._trackMetric('lifeline.used', 1);
  },

  // ==========================================
  // Reading Metrics
  // ==========================================

  /**
   * Track reading session duration (in minutes)
   */
  trackReadingSession(durationMinutes: number): void {
    this._trackMetric('reading.session_minutes', durationMinutes);
  },

  /**
   * Track pages read
   */
  trackPagesRead(pages: number): void {
    this._trackMetric('reading.pages', pages);
  },

  /**
   * Track Monk Mode session
   */
  trackMonkModeSession(durationMinutes: number): void {
    this._trackMetric('monk_mode.session_minutes', durationMinutes);
  },

  // ==========================================
  // User Engagement Metrics
  // ==========================================

  /**
   * Track book scan via ISBN
   */
  incrementBookScanned(): void {
    this._trackMetric('book.scanned', 1);
  },

  /**
   * Track book added to library
   */
  incrementBookAdded(): void {
    this._trackMetric('book.added', 1);
  },

  /**
   * Track verification photo submitted
   */
  incrementVerificationSubmitted(): void {
    this._trackMetric('verification.submitted', 1);
  },

  /**
   * Track receipt shared
   */
  incrementReceiptShared(): void {
    this._trackMetric('receipt.shared', 1);
  },

  // ==========================================
  // Payment Metrics
  // ==========================================

  /**
   * Track payment method added
   */
  incrementPaymentMethodAdded(): void {
    this._trackMetric('payment.method_added', 1);
  },

  /**
   * Track penalty charge processed
   */
  incrementPenaltyCharged(amount: number, currency: string): void {
    this._trackMetric('penalty.charged', amount, { currency });
  },

  /**
   * Track penalty charge failed
   */
  incrementPenaltyFailed(): void {
    this._trackMetric('penalty.failed', 1);
  },

  // ==========================================
  // Onboarding Metrics
  // ==========================================

  /**
   * Track onboarding screen viewed
   */
  trackOnboardingScreen(screenNumber: number): void {
    this._trackMetric('onboarding.screen_viewed', screenNumber, {
      screen: String(screenNumber),
    });
  },

  /**
   * Track onboarding completed
   */
  incrementOnboardingCompleted(): void {
    this._trackMetric('onboarding.completed', 1);
  },

  /**
   * Track subscription started
   */
  incrementSubscriptionStarted(): void {
    this._trackMetric('subscription.started', 1);
  },
};

export default MetricsService;
