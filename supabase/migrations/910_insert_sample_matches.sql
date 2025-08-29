-- Migration: 910_insert_sample_matches.sql
-- Inserts sample matches for testing purposes

-- NBA Games for Q4 2025
-- Insert NBA match details first
INSERT INTO match_details_basketball_nba (id, home_team_id, away_team_id, game_subtitle, venue, timezone) VALUES
  ('nba-2025-10-01', 'los-angeles-lakers', 'golden-state-warriors', 'Opening Night', 'Crypto.com Arena', 'America/Los_Angeles'),
  ('nba-2025-10-15', 'boston-celtics', 'philadelphia-76ers', 'Atlantic Division Rivalry', 'TD Garden', 'America/New_York'),
  ('nba-2025-11-01', 'milwaukee-bucks', 'chicago-bulls', 'Central Division Matchup', 'Fiserv Forum', 'America/Chicago'),
  ('nba-2025-11-15', 'phoenix-suns', 'dallas-mavericks', 'Western Conference Showdown', 'Footprint Center', 'America/Phoenix'),
  ('nba-2025-12-25', 'new-york-knicks', 'brooklyn-nets', 'Christmas Day - Battle of New York', 'Madison Square Garden', 'America/New_York');

-- Insert corresponding matches
INSERT INTO matches (id, event_type, details_id, status, scheduled_start_time) VALUES
  ('nba-game-2025-10-01', 'basketball_nba', 'nba-2025-10-01', 'upcoming', '2025-10-01 19:30:00-07'),
  ('nba-game-2025-10-15', 'basketball_nba', 'nba-2025-10-15', 'upcoming', '2025-10-15 19:30:00-04'),
  ('nba-game-2025-11-01', 'basketball_nba', 'nba-2025-11-01', 'upcoming', '2025-11-01 19:00:00-05'),
  ('nba-game-2025-11-15', 'basketball_nba', 'nba-2025-11-15', 'upcoming', '2025-11-15 19:00:00-07'),
  ('nba-game-2025-12-25', 'basketball_nba', 'nba-2025-12-25', 'upcoming', '2025-12-25 12:00:00-05');

-- Sandbox Metaverse Matches for Q4 2025
-- Insert Sandbox match details
INSERT INTO match_details_sandbox_metaverse (id, player1_id, player1_name, player1_subtitle, player1_image_url, player2_id, player2_name, player2_subtitle, player2_image_url) VALUES
  ('sb-2025-10-05', 'p1-uuid-1', 'CryptoKing', 'Season 5 Champion', null, 'p2-uuid-1', 'MetaQueen', 'Rising Star', null),
  ('sb-2025-10-20', 'p1-uuid-2', 'VoxelWarrior', 'Top Ranked Player', null, 'p2-uuid-2', 'PixelMaster', 'Community Favorite', null),
  ('sb-2025-11-05', 'p1-uuid-3', 'BlockchainBoss', 'Tournament Winner', null, 'p2-uuid-3', 'NFTNinja', 'Creative Builder', null),
  ('sb-2025-11-25', 'p1-uuid-4', 'MetaArchitect', 'Design Expert', null, 'p2-uuid-4', 'VirtualVanguard', 'Battle Specialist', null),
  ('sb-2025-12-15', 'p1-uuid-5', 'SandboxSage', 'Veteran Player', null, 'p2-uuid-5', 'LandLegend', 'Territory Master', null);

-- Insert corresponding matches
INSERT INTO matches (id, event_type, details_id, status, scheduled_start_time) VALUES
  ('sb-match-2025-10-05', 'sandbox_metaverse', 'sb-2025-10-05', 'upcoming', '2025-10-05 18:00:00+00'),
  ('sb-match-2025-10-20', 'sandbox_metaverse', 'sb-2025-10-20', 'upcoming', '2025-10-20 19:00:00+00'),
  ('sb-match-2025-11-05', 'sandbox_metaverse', 'sb-2025-11-05', 'upcoming', '2025-11-05 20:00:00+00'),
  ('sb-match-2025-11-25', 'sandbox_metaverse', 'sb-2025-11-25', 'upcoming', '2025-11-25 18:30:00+00'),
  ('sb-match-2025-12-15', 'sandbox_metaverse', 'sb-2025-12-15', 'upcoming', '2025-12-15 19:30:00+00'); 