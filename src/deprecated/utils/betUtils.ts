/**
 * Calculate win rate percentage from won bets and total bets
 */
export const calculateWinRate = (wonBets: number, totalBets: number): number => {
  if (totalBets === 0) return 0;
  return Math.round((wonBets / totalBets) * 100);
};

/**
 * Format a number of points with commas
 */
export const formatPoints = (points: number): string => {
  return points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * Determine if a user is profitable
 */
export const isProfitable = (betInfo: { bets_won: number; bets_lost: number; }): boolean => {
  return betInfo.bets_won > betInfo.bets_lost;
}; 