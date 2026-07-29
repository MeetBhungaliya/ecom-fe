import {
  format,
  formatDistanceToNow,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  isAfter,
  isBefore,
} from 'date-fns';

/**
 * Format a date for display.
 * @example formatDate('2024-01-15T10:30:00Z') → "Jan 15, 2024"
 */
export function formatDate(date: string | Date, formatStr = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, formatStr);
}

/**
 * Format a date with time.
 * @example formatDateTime('2024-01-15T10:30:00Z') → "Jan 15, 2024 10:30 AM"
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

/**
 * Relative time from now.
 * @example timeAgo('2024-01-15T10:30:00Z') → "3 hours ago"
 */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Predefined date ranges for filters.
 */
export function getDateRange(range: 'today' | '7d' | '30d' | '90d' | '12m') {
  const now = new Date();
  const end = endOfDay(now);

  switch (range) {
    case 'today':
      return { start: startOfDay(now), end };
    case '7d':
      return { start: startOfDay(subDays(now, 7)), end };
    case '30d':
      return { start: startOfDay(subDays(now, 30)), end };
    case '90d':
      return { start: startOfDay(subDays(now, 90)), end };
    case '12m':
      return { start: startOfDay(subMonths(now, 12)), end };
  }
}

export { isAfter, isBefore, parseISO, isValid };
