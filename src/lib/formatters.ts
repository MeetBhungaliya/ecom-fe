/**
 * Format a number as Indian Rupee currency.
 * @example formatCurrency(1234567) → "₹12,34,567"
 */
export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with locale-aware separators.
 * @example formatNumber(1234567) → "12,34,567"
 */
export function formatNumber(value: number, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format a number as a compact string.
 * @example formatCompact(1234567) → "12.3L"
 */
export function formatCompact(value: number): string {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(1)}Cr`;
  }
  if (value >= 100000) {
    return `${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format a decimal as percentage.
 * @example formatPercentage(0.156) → "15.6%"
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis.
 * @example truncate("Hello World", 5) → "Hello…"
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

/**
 * Generate initials from a name.
 * @example getInitials("John Doe") → "JD"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Pluralize a word based on count.
 * @example pluralize(3, 'item', 'items') → "3 items"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${formatNumber(count)} ${word}`;
}
