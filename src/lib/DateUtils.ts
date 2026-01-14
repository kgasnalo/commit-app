/**
 * DateUtils - UTC-first date handling utilities
 * Prevents timezone bugs by standardizing on UTC for all logical operations
 */

/**
 * Get current time in UTC (ISO string)
 * Use this instead of new Date() for any deadline/timestamp logic
 */
export function getNowUTC(): string {
  return new Date().toISOString();
}

/**
 * Get current time as Date object (UTC-based)
 */
export function getNowDate(): Date {
  return new Date();
}

/**
 * Compare two ISO date strings
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareUTCDates(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

/**
 * Check if deadline has passed (UTC comparison)
 */
export function isDeadlinePassed(deadline: string): boolean {
  return new Date(deadline).getTime() < Date.now();
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format UTC date to local display string
 * Uses user's locale for formatting
 */
export function formatToLocalDisplay(
  utcDateString: string,
  locale: string = 'ja-JP',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(utcDateString);
  return date.toLocaleDateString(locale, options);
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 */
export function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date string in YYYY-MM-DD format (UTC)
 */
export function getYesterdayUTC(): string {
  const yesterday = new Date(Date.now() - 86400000);
  return yesterday.toISOString().split('T')[0];
}
