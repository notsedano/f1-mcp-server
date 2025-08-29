-- Create event type enum for different sports/esports
CREATE TYPE event_type_enum AS ENUM ('basketball_nba', 'sandbox_metaverse');

-- Create match status enum 
CREATE TYPE match_status_enum AS ENUM ('upcoming', 'live', 'finished', 'cancelled');

-- Create NBA teams table (must come before basketball details table due to foreign keys)
CREATE TABLE IF NOT EXISTS teams_nba (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  conference TEXT NOT NULL CHECK (conference IN ('Eastern', 'Western')),
  division TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert all 30 NBA teams
INSERT INTO teams_nba (id, name, city, abbreviation, conference, division, logo_url, primary_color, secondary_color) VALUES
-- Eastern Conference - Atlantic Division
('atlanta-hawks', 'Hawks', 'Atlanta', 'ATL', 'Eastern', 'Southeast', null, '#E03A3E', '#C1D32F'),
('boston-celtics', 'Celtics', 'Boston', 'BOS', 'Eastern', 'Atlantic', null, '#007A33', '#BA9653'),
('brooklyn-nets', 'Nets', 'Brooklyn', 'BKN', 'Eastern', 'Atlantic', null, '#000000', '#FFFFFF'),
('charlotte-hornets', 'Hornets', 'Charlotte', 'CHA', 'Eastern', 'Southeast', null, '#1D1160', '#00788C'),
('chicago-bulls', 'Bulls', 'Chicago', 'CHI', 'Eastern', 'Central', null, '#CE1141', '#000000'),
('cleveland-cavaliers', 'Cavaliers', 'Cleveland', 'CLE', 'Eastern', 'Central', null, '#860038', '#FDBB30'),
('detroit-pistons', 'Pistons', 'Detroit', 'DET', 'Eastern', 'Central', null, '#C8102E', '#1D42BA'),
('indiana-pacers', 'Pacers', 'Indiana', 'IND', 'Eastern', 'Central', null, '#002D62', '#FDBB30'),
('miami-heat', 'Heat', 'Miami', 'MIA', 'Eastern', 'Southeast', null, '#98002E', '#F9A01B'),
('milwaukee-bucks', 'Bucks', 'Milwaukee', 'MIL', 'Eastern', 'Central', null, '#00471B', '#EEE1C6'),
('new-york-knicks', 'Knicks', 'New York', 'NYK', 'Eastern', 'Atlantic', null, '#006BB6', '#F58426'),
('orlando-magic', 'Magic', 'Orlando', 'ORL', 'Eastern', 'Southeast', null, '#0077C0', '#C4CED4'),
('philadelphia-76ers', '76ers', 'Philadelphia', 'PHI', 'Eastern', 'Atlantic', null, '#006BB6', '#ED174C'),
('toronto-raptors', 'Raptors', 'Toronto', 'TOR', 'Eastern', 'Atlantic', null, '#CE1141', '#000000'),
('washington-wizards', 'Wizards', 'Washington', 'WAS', 'Eastern', 'Southeast', null, '#002B5C', '#E31837'),

-- Western Conference
('dallas-mavericks', 'Mavericks', 'Dallas', 'DAL', 'Western', 'Southwest', null, '#00538C', '#002F5F'),
('denver-nuggets', 'Nuggets', 'Denver', 'DEN', 'Western', 'Northwest', null, '#0E2240', '#FEC524'),
('golden-state-warriors', 'Warriors', 'Golden State', 'GSW', 'Western', 'Pacific', null, '#1D428A', '#FFC72C'),
('houston-rockets', 'Rockets', 'Houston', 'HOU', 'Western', 'Southwest', null, '#CE1141', '#000000'),
('los-angeles-clippers', 'Clippers', 'Los Angeles', 'LAC', 'Western', 'Pacific', null, '#C8102E', '#1D428A'),
('los-angeles-lakers', 'Lakers', 'Los Angeles', 'LAL', 'Western', 'Pacific', null, '#552583', '#FDB927'),
('memphis-grizzlies', 'Grizzlies', 'Memphis', 'MEM', 'Western', 'Southwest', null, '#5D76A9', '#12173F'),
('minnesota-timberwolves', 'Timberwolves', 'Minnesota', 'MIN', 'Western', 'Northwest', null, '#0C2340', '#236192'),
('new-orleans-pelicans', 'Pelicans', 'New Orleans', 'NOP', 'Western', 'Southwest', null, '#0C2340', '#C8102E'),
('oklahoma-city-thunder', 'Thunder', 'Oklahoma City', 'OKC', 'Western', 'Northwest', null, '#007AC1', '#EF3B24'),
('phoenix-suns', 'Suns', 'Phoenix', 'PHX', 'Western', 'Pacific', null, '#1D1160', '#E56020'),
('portland-trail-blazers', 'Trail Blazers', 'Portland', 'POR', 'Western', 'Northwest', null, '#E03A3E', '#000000'),
('sacramento-kings', 'Kings', 'Sacramento', 'SAC', 'Western', 'Pacific', null, '#5A2D81', '#63727A'),
('san-antonio-spurs', 'Spurs', 'San Antonio', 'SAS', 'Western', 'Southwest', null, '#C4CED4', '#000000'),
('utah-jazz', 'Jazz', 'Utah', 'UTA', 'Western', 'Northwest', null, '#002B5C', '#F9A01B');

-- Create indexes for NBA teams
CREATE INDEX IF NOT EXISTS idx_teams_nba_name ON teams_nba(name);
CREATE INDEX IF NOT EXISTS idx_teams_nba_abbreviation ON teams_nba(abbreviation);
CREATE INDEX IF NOT EXISTS idx_teams_nba_conference ON teams_nba(conference);
CREATE INDEX IF NOT EXISTS idx_teams_nba_division ON teams_nba(division);

-- Create main matches table (universal for all sports)
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  event_type event_type_enum NOT NULL,
  details_id TEXT NOT NULL,
  status match_status_enum NOT NULL DEFAULT 'upcoming',
  scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  external_id TEXT, -- External API identifier (universal across all sports)
  
  -- Temporary: Keep for frontend compatibility during Phase 1
  bookmakers JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create basketball-specific details table
CREATE TABLE IF NOT EXISTS match_details_basketball_nba (
  id TEXT PRIMARY KEY,
  home_team_id TEXT NOT NULL REFERENCES teams_nba(id) ON DELETE CASCADE,
  away_team_id TEXT NOT NULL REFERENCES teams_nba(id) ON DELETE CASCADE,
  game_subtitle TEXT,
  venue TEXT,
  timezone TEXT, -- Store the timezone used for match entry (for display/editing purposes)
  scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Sandbox Metaverse esports details table
CREATE TABLE IF NOT EXISTS match_details_sandbox_metaverse (
  id TEXT PRIMARY KEY,
  player1_id TEXT NOT NULL, -- Auto-generated UUID
  player1_name TEXT NOT NULL,
  player1_subtitle TEXT,
  player1_image_url TEXT,
  player2_id TEXT NOT NULL, -- Auto-generated UUID
  player2_name TEXT NOT NULL,
  player2_subtitle TEXT,
  player2_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_start_time ON matches(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_event_type ON matches(event_type);
CREATE INDEX IF NOT EXISTS idx_matches_details_id ON matches(details_id);

-- Add index for external_id in main matches table
CREATE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id);

-- Basketball details indexes
CREATE INDEX IF NOT EXISTS idx_basketball_details_home_team_id ON match_details_basketball_nba(home_team_id);
CREATE INDEX IF NOT EXISTS idx_basketball_details_away_team_id ON match_details_basketball_nba(away_team_id);
CREATE INDEX IF NOT EXISTS idx_basketball_details_venue ON match_details_basketball_nba(venue);

-- Sandbox details indexes
CREATE INDEX IF NOT EXISTS idx_sandbox_details_player1_id ON match_details_sandbox_metaverse(player1_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_details_player2_id ON match_details_sandbox_metaverse(player2_id);

-- Add foreign key constraint to ensure details_id points to correct table
-- Note: Using a trigger instead of CHECK constraint since PostgreSQL doesn't allow subqueries in CHECK constraints
CREATE OR REPLACE FUNCTION validate_match_details_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that details_id exists in the appropriate details table
  IF NEW.event_type = 'basketball_nba' THEN
    IF NOT EXISTS (SELECT 1 FROM match_details_basketball_nba WHERE id = NEW.details_id) THEN
      RAISE EXCEPTION 'details_id % does not exist in match_details_basketball_nba table', NEW.details_id;
    END IF;
  ELSIF NEW.event_type = 'sandbox_metaverse' THEN
    IF NOT EXISTS (SELECT 1 FROM match_details_sandbox_metaverse WHERE id = NEW.details_id) THEN
      RAISE EXCEPTION 'details_id % does not exist in match_details_sandbox_metaverse table', NEW.details_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate details_id on insert and update
CREATE TRIGGER validate_match_details_trigger
  BEFORE INSERT OR UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION validate_match_details_id();

-- Add RLS policies for matches table
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to matches" 
  ON matches FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated users to read matches" 
  ON matches FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous users to insert matches" 
  ON matches FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert matches" 
  ON matches FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update matches" 
  ON matches FOR UPDATE 
  TO authenticated 
  USING (true);

-- Add RLS policies for basketball details table
ALTER TABLE match_details_basketball_nba ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to basketball details" 
  ON match_details_basketball_nba FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated users to read basketball details" 
  ON match_details_basketball_nba FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous users to insert basketball details" 
  ON match_details_basketball_nba FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert basketball details" 
  ON match_details_basketball_nba FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update basketball details" 
  ON match_details_basketball_nba FOR UPDATE 
  TO authenticated 
  USING (true);

-- Add RLS policies for Sandbox details table
ALTER TABLE match_details_sandbox_metaverse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to sandbox details" 
  ON match_details_sandbox_metaverse FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated users to read sandbox details" 
  ON match_details_sandbox_metaverse FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous users to insert sandbox details" 
  ON match_details_sandbox_metaverse FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert sandbox details" 
  ON match_details_sandbox_metaverse FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sandbox details" 
  ON match_details_sandbox_metaverse FOR UPDATE 
  TO authenticated 
  USING (true);

-- Add RLS policies for NBA teams table
ALTER TABLE teams_nba ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to NBA teams" 
  ON teams_nba FOR SELECT 
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated users to read NBA teams" 
  ON teams_nba FOR SELECT 
  TO authenticated
  USING (true);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.match_details_basketball_nba TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.match_details_sandbox_metaverse TO authenticated;
GRANT SELECT ON public.teams_nba TO authenticated;
GRANT SELECT ON public.teams_nba TO anon;
GRANT SELECT ON public.match_details_sandbox_metaverse TO anon;
GRANT SELECT ON public.match_details_basketball_nba TO anon;
GRANT SELECT ON public.matches TO anon;
GRANT INSERT ON public.matches TO anon;
GRANT INSERT ON public.match_details_basketball_nba TO anon;
GRANT INSERT ON public.match_details_sandbox_metaverse TO anon; 