import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number | string): string {
  if (typeof timestamp === 'number') {
    // If Unix timestamp in seconds
    const d = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getResultBadge(result: string, isWhitePlayer: boolean): { text: string; color: string } {
  const winResults = ['win'];
  const drawResults = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'];
  
  if (winResults.includes(result)) {
    return { text: 'Won', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }
  if (drawResults.includes(result)) {
    return { text: 'Draw', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  }
  return { text: 'Lost', color: 'bg-red-100 text-red-800 border-red-300' };
}
