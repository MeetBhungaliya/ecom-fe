import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with conflict resolution.
 * Uses clsx for conditional classes + tailwind-merge to resolve conflicts.
 *
 * @example
 * cn('px-2 py-1', condition && 'bg-primary', 'px-4') // → 'py-1 px-4 bg-primary'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
