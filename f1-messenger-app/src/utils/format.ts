// Lightweight formatting utilities for F1 data

/**
 * Format time differences with proper units
 */
export function prettyDelta(seconds: number): string {
  if (Math.abs(seconds) < 0.001) return 'identical';
  if (seconds < 0) {
    return `${Math.abs(seconds).toFixed(3)} s slower`;
  }
  return `${seconds.toFixed(3)} s quicker`;
}

/**
 * Format lap times consistently
 */
export function formatLapTime(timeString: string): string {
  if (!timeString) return 'N/A';
  
  // Handle "0 days 00:01:34.396000" format
  if (timeString.includes('days')) {
    const match = timeString.match(/(\d{2}):(\d{2}):(\d{2}\.\d+)/);
    if (match) {
      const [, minutes, seconds, milliseconds] = match;
      return `${minutes}:${seconds}.${milliseconds.split('.')[1].substring(0, 3)}`;
    }
  }
  
  return timeString;
}

/**
 * Format driver names consistently
 */
export function formatDriverName(givenName: string, familyName: string): string {
  return `${givenName} ${familyName}`;
}

/**
 * Format constructor names (remove array brackets)
 */
export function formatConstructor(constructorNames: string): string {
  if (!constructorNames) return 'Unknown';
  return constructorNames.replace(/[\[\]']/g, '');
}

/**
 * Format points with proper decimal places
 */
export function formatPoints(points: string | number): string {
  const num = parseFloat(points as string);
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

/**
 * Get ordinal suffix for positions
 */
export function getOrdinal(num: number): string {
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  return ordinals[num - 1] || `${num}th`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
} 