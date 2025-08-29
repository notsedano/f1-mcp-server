/**
 * @deprecated This utility is deprecated and should no longer be used.
 * Do not add new functionality to this file.
 * This file will be removed in a future version.
 */

/**
 * Converts decimal (European) odds to American odds format
 * @param decimalOdds The decimal odds value
 * @returns The equivalent American odds value
 */
export const decimalToAmerican = (decimalOdds: number): string => {
  if (!decimalOdds || decimalOdds <= 1) return 'N/A';
  
  if (decimalOdds >= 2) {
    // Underdog (positive American odds)
    return `+${Math.round((decimalOdds - 1) * 100)}`;
  } else {
    // Favorite (negative American odds)
    return `-${Math.round(100 / (decimalOdds - 1))}`;
  }
};

/**
 * Formats decimal odds for display
 * @param decimalOdds The decimal odds value
 * @returns Formatted decimal odds with 2 decimal places
 */
export const formatDecimalOdds = (decimalOdds: number | null): string => {
  if (!decimalOdds) return 'N/A';
  return decimalOdds.toFixed(2);
}; 