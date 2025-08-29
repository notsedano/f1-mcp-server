# Matches Table

This document describes the new matches table added to persist NBA match data in the application.

## Purpose

The matches table allows the application to persist NBA match data that has been scraped from external sources (The Odds API, Yahoo Sports) or generated as mock data. This provides several benefits:

1. **Reduced API Calls**: By storing match data, we reduce the number of API calls needed, avoiding rate limits
2. **Improved Performance**: Faster loading times as matches can be loaded from the database instead of external APIs
3. **Data Consistency**: Ensures consistent match data across sessions and users
4. **Offline Capability**: The application can function even when external APIs are unavailable

## Table Schema

The matches table has the following structure:

```sql
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  sport_key TEXT NOT NULL,
  sport_title TEXT NOT NULL,
  commence_time TIMESTAMP WITH TIME ZONE NOT NULL,
  home_team_id TEXT NOT NULL,
  home_team_name TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_id TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  away_team_logo TEXT,
  bookmakers JSONB,
  scores JSONB,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

- `idx_matches_commence_time`: For faster querying of upcoming matches
- `idx_matches_completed`: For filtering completed vs. upcoming matches

## Data Flow

1. The application first attempts to load matches from the database
2. If no matches are found or the data is stale, it fetches from external APIs
3. New match data is stored in the database for future use
4. Mock data is also stored in the database when used as a fallback

## API Functions

The following functions are available in `supabaseService.ts` for interacting with the matches table:

- `storeMatch(match)`: Store a single match
- `storeMatches(matches)`: Store multiple matches in batches
- `getMatchById(id)`: Retrieve a specific match by ID
- `getUpcomingMatches(limit)`: Get upcoming matches (not yet started)
- `updateMatchScores(matchId, homeScore, awayScore, completed)`: Update match scores and completion status

## Integration

The matches table is integrated with the application through:

1. `MatchesContext`: Dedicated context for match data management with configurable data sources
2. `BettingContext`: Focuses purely on betting operations, uses `MatchesContext` for match data when needed
3. `MatchesPage`: Uses `useMatches()` hook and displays data source (database, api, mock)

## Future Enhancements

Potential future enhancements for the matches persistence system:

1. Add a scheduled job to refresh match data periodically
2. Implement a cache invalidation strategy for older matches
3. Add analytics for match data usage and API call reduction
4. Develop admin tools for managing stored match data 