/**
 * @deprecated This file is deprecated and should no longer be used.
 * Do not add new functionality to this file.
 * This file will be removed in a future version.
 */

export const POINTS_DISPLAY_CONFIG = {
  name: "$DARE points",
  shortName: "$DARE", 
  currency: "$DARE",
  // Plural forms
  namePlural: "$DARE points",
  // For different contexts
  dashboard: "$DARE POINTS",
  leaderboard: "$DARE Points",
  betting: "$DARE POINTS"
} as const;

export type PointsDisplayKey = keyof typeof POINTS_DISPLAY_CONFIG; 