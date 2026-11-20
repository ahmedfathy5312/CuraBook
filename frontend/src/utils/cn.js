import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — combines Tailwind classes safely, merging conflicting ones.
 * Example: cn('px-4', isActive && 'bg-blue-500', 'px-6') → 'bg-blue-500 px-6'
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;
