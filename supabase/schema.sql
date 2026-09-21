-- ==========================================
-- PredictX — Complete Supabase Schema
-- ==========================================
-- Run this in Supabase SQL Editor
-- Prerequisites: Enable Auth, create project

-- ==========================================
-- 1. CORE TABLES
-- ==========================================

-- Leagues / Competitions
CREATE TABLE public.leagues (
  id BIGINT PRIMARY KEY,                    -- API-Football league ID
  name TEXT NOT NULL,
  country TEXT,
  logo_url TEXT,
  flag_url TEXT,
  type TEXT DEFAULT 'league',               -- league | cup
  season INT NOT NULL DEFAULT 2026,
  priority INT DEFAULT 0,                   -- higher = more important
  is_active BOOLEAN DEFAULT TRUE,
  coverage JSONB DEFAULT '{}',              -- what data is available
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE public.teams (
  id BIGINT PRIMARY KEY,                    -- API-Football team ID
  name TEXT NOT NULL,
  short_name TEXT,
  code TEXT,                                -- 3-letter code
  logo_url TEXT,
  country TEXT,
  founded INT,
  venue_name TEXT,
  venue_capacity INT,
  elo_rating INT DEFAULT 1500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- League-Team junction (team can be in multiple leagues)
CREATE TABLE public.league_teams (
  league_id BIGINT REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE,
  season INT NOT NULL DEFAULT 2026,
  PRIMARY KEY (league_id, team_id, season)
);

-- Players
CREATE TABLE public.players (
  id BIGINT PRIMARY KEY,                    -- API-Football player ID
  name TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  photo_url TEXT,
  nationality TEXT,
  birth_date DATE,
  height TEXT,
  weight TEXT,
  position TEXT,                            -- GK | DF | MF | FW
  team_id BIGINT REFERENCES public.teams(id),
  rating NUMERIC(4,1) DEFAULT 50.0,        -- 1-100 PredictX rating
  api_rating NUMERIC(4,2),                  -- API-Football season rating
  appearances INT DEFAULT 0,
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  minutes INT DEFAULT 0,
  season INT NOT NULL DEFAULT 2026,
  injured BOOLEAN DEFAULT FALSE,
  injury_type TEXT,
  injury_return DATE,
  suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Standings
CREATE TABLE public.standings (
  id BIGSERIAL PRIMARY KEY,
  league_id BIGINT REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE,
  season INT NOT NULL DEFAULT 2026,
  rank INT,
  points INT DEFAULT 0,
  played INT DEFAULT 0,
  win INT DEFAULT 0,
  draw INT DEFAULT 0,
  lose INT DEFAULT 0,
  goals_for INT DEFAULT 0,
  goals_against INT DEFAULT 0,
  goal_diff INT DEFAULT 0,
  form TEXT,                                -- e.g. 'WDWLW'
  description TEXT,                         -- 'Champions League', 'Relegation' etc
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id, season)
);

-- ==========================================
-- 2. MATCHES & PREDICTIONS
-- ==========================================

-- Matches / Fixtures
CREATE TABLE public.matches (
  id BIGINT PRIMARY KEY,                    -- API-Football fixture ID
  league_id BIGINT REFERENCES public.leagues(id),
  season INT NOT NULL DEFAULT 2026,
  round TEXT,                               -- 'Regular Season - 8'
  home_team_id BIGINT REFERENCES public.teams(id),
  away_team_id BIGINT REFERENCES public.teams(id),
  status TEXT DEFAULT 'NS',                 -- NS|1H|HT|2H|FT|AET|PEN|PST|CANC|ABD
  kickoff TIMESTAMPTZ NOT NULL,
  venue TEXT,
  referee TEXT,
  home_goals INT,
  away_goals INT,
  home_goals_ht INT,
  away_goals_ht INT,
  elapsed INT,                              -- current minute for live
  -- Statistics
  home_shots INT,
  away_shots INT,
  home_shots_on INT,
  away_shots_on INT,
  home_possession NUMERIC(4,1),
  away_possession NUMERIC(4,1),
  home_corners INT,
  away_corners INT,
  home_fouls INT,
  away_fouls INT,
  home_xg NUMERIC(4,2),
  away_xg NUMERIC(4,2),
  -- Match events JSON
  events JSONB DEFAULT '[]',
  lineups JSONB DEFAULT '{}',
  statistics JSONB DEFAULT '{}',
  -- Metadata
  is_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PredictX Predictions
CREATE TABLE public.predictions (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES public.matches(id) ON DELETE CASCADE,
  model_version TEXT DEFAULT 'v1.0',
  -- 1X2
  prob_home NUMERIC(5,4),
  prob_draw NUMERIC(5,4),
  prob_away NUMERIC(5,4),
  prediction TEXT,                          -- '1' | 'X' | '2'
  -- Over/Under
  prob_over_15 NUMERIC(5,4),
  prob_over_25 NUMERIC(5,4),
  prob_over_35 NUMERIC(5,4),
  -- BTTS
  prob_btts NUMERIC(5,4),
  -- Goals
  expected_home_goals NUMERIC(4,2),
  expected_away_goals NUMERIC(4,2),
  expected_total_goals NUMERIC(4,2),
  -- Poisson distribution
  goal_probs JSONB DEFAULT '{}',           -- {0: 0.12, 1: 0.28, ...}
  -- Advanced metrics
  home_elo INT,
  away_elo INT,
  home_form_score NUMERIC(4,2),
  away_form_score NUMERIC(4,2),
  home_attack_strength NUMERIC(4,2),
  away_attack_strength NUMERIC(4,2),
  home_defense_strength NUMERIC(4,2),
  away_defense_strength NUMERIC(4,2),
  -- Context
  competition_importance NUMERIC(3,2),     -- 0-1
  motivation_home NUMERIC(3,2),
  motivation_away NUMERIC(3,2),
  rest_days_home INT,
  rest_days_away INT,
  -- Confidence
  confidence TEXT DEFAULT 'medium',         -- low | medium | high
  confidence_score NUMERIC(3,2),            -- 0-1
  -- AI explanation
  ai_explanation TEXT,
  -- Result tracking
  is_correct BOOLEAN,
  actual_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, model_version)
);

-- ==========================================
-- 3. ODDS & VALUE
-- ==========================================

CREATE TABLE public.odds (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES public.matches(id) ON DELETE CASCADE,
  bookmaker TEXT NOT NULL,
  market TEXT NOT NULL,                      -- '1x2' | 'ou25' | 'btts' | 'dc'
  -- Values
  home_odds NUMERIC(6,2),
  draw_odds NUMERIC(6,2),
  away_odds NUMERIC(6,2),
  over_odds NUMERIC(6,2),
  under_odds NUMERIC(6,2),
  yes_odds NUMERIC(6,2),
  no_odds NUMERIC(6,2),
  -- Implied probability
  implied_home NUMERIC(5,4),
  implied_draw NUMERIC(5,4),
  implied_away NUMERIC(5,4),
  -- Value detection
  is_value_bet BOOLEAN DEFAULT FALSE,
  edge NUMERIC(5,4),                        -- model_prob - implied_prob
  -- Timing
  is_opening BOOLEAN DEFAULT FALSE,
  is_live BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Value bets view
CREATE VIEW public.value_bets AS
SELECT
  o.*,
  m.kickoff,
  m.status,
  ht.name AS home_team,
  at.name AS away_team,
  l.name AS league_name,
  p.confidence
FROM public.odds o
JOIN public.matches m ON o.match_id = m.id
JOIN public.teams ht ON m.home_team_id = ht.id
JOIN public.teams at ON m.away_team_id = at.id
JOIN public.leagues l ON m.league_id = l.id
LEFT JOIN public.predictions p ON m.id = p.match_id
WHERE o.is_value_bet = TRUE
  AND m.status = 'NS'
ORDER BY o.edge DESC;

-- ==========================================
-- 4. USER SYSTEM
-- ==========================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',                 -- user | pro | admin
  timezone TEXT DEFAULT 'Asia/Tbilisi',
  language TEXT DEFAULT 'ka',
  notification_prefs JSONB DEFAULT '{
    "prediction_alerts": true,
    "odds_movement": false,
    "match_start": true,
    "lineup_change": false,
    "value_bets": false,
    "push_enabled": false,
    "email_enabled": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Favorite teams
CREATE TABLE public.favorite_teams (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, team_id)
);

-- Favorite leagues
CREATE TABLE public.favorite_leagues (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_id BIGINT REFERENCES public.leagues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, league_id)
);

-- Saved matches
CREATE TABLE public.saved_matches (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id BIGINT REFERENCES public.matches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, match_id)
);

-- User prediction history (user's own picks)
CREATE TABLE public.user_predictions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id BIGINT REFERENCES public.matches(id) ON DELETE CASCADE,
  pick TEXT NOT NULL,                        -- '1' | 'X' | '2' | 'O2.5' | 'U2.5' | 'BTTS' | 'NBTTS'
  confidence TEXT DEFAULT 'medium',
  stake_amount NUMERIC(10,2),
  odds_taken NUMERIC(6,2),
  is_correct BOOLEAN,
  profit_loss NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id, pick)
);

-- ==========================================
-- 5. NOTIFICATIONS
-- ==========================================

CREATE TABLE public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                        -- prediction | odds | match_start | lineup | value_bet
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  match_id BIGINT REFERENCES public.matches(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. MODEL TRACKING
-- ==========================================

CREATE TABLE public.model_versions (
  id SERIAL PRIMARY KEY,
  version TEXT UNIQUE NOT NULL,
  description TEXT,
  algorithm TEXT,                            -- 'elo_poisson_v1' | 'ensemble_v2'
  parameters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.model_performance (
  id BIGSERIAL PRIMARY KEY,
  model_version TEXT REFERENCES public.model_versions(version),
  league_id BIGINT REFERENCES public.leagues(id),
  period TEXT,                               -- '2026-W12' | '2026-09'
  total_predictions INT DEFAULT 0,
  correct_predictions INT DEFAULT 0,
  accuracy NUMERIC(5,4),
  brier_score NUMERIC(6,5),
  log_loss NUMERIC(6,5),
  roi NUMERIC(6,4),                          -- if odds data available
  calibration JSONB DEFAULT '{}',            -- {bin: actual_pct}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. ADMIN & SYNC
-- ==========================================

CREATE TABLE public.sync_log (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT DEFAULT 'api-football',
  endpoint TEXT NOT NULL,
  status TEXT DEFAULT 'success',             -- success | error | partial
  records_synced INT DEFAULT 0,
  requests_used INT DEFAULT 0,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,                           -- user | team | match | prediction
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API config (encrypted keys stored in Supabase Vault)
CREATE TABLE public.api_config (
  id SERIAL PRIMARY KEY,
  provider TEXT UNIQUE NOT NULL,
  base_url TEXT NOT NULL,
  rate_limit_per_day INT,
  requests_today INT DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}'
);

-- Insert default API config
INSERT INTO public.api_config (provider, base_url, rate_limit_per_day, config) VALUES
('api-football', 'https://v3.football.api-sports.io', 100, '{"headers": {"x-apisports-key": "YOUR_KEY_HERE"}}');

-- ==========================================
-- 8. PRIORITY LEAGUES (default data)
-- ==========================================

INSERT INTO public.leagues (id, name, country, type, season, priority) VALUES
(39, 'Premier League', 'England', 'league', 2026, 100),
(140, 'La Liga', 'Spain', 'league', 2026, 95),
(135, 'Serie A', 'Italy', 'league', 2026, 90),
(78, 'Bundesliga', 'Germany', 'league', 2026, 85),
(61, 'Ligue 1', 'France', 'league', 2026, 80),
(2, 'Champions League', 'World', 'cup', 2026, 100),
(3, 'Europa League', 'World', 'cup', 2026, 70),
(848, 'Conference League', 'World', 'cup', 2026, 60),
(1, 'World Cup', 'World', 'cup', 2026, 100)
ON CONFLICT (id) DO UPDATE SET priority = EXCLUDED.priority;

-- ==========================================
-- 9. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Public read for content tables
CREATE POLICY "Public read" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.standings FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.odds FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.model_versions FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.model_performance FOR SELECT USING (true);

-- Profile: own data only
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Favorites: own data
CREATE POLICY "Own favorites" ON public.favorite_teams
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own favorites" ON public.favorite_leagues
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own saved" ON public.saved_matches
  FOR ALL USING (auth.uid() = user_id);

-- User predictions: own data
CREATE POLICY "Own predictions" ON public.user_predictions
  FOR ALL USING (auth.uid() = user_id);

-- Notifications: own data
CREATE POLICY "Own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admin full access profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ==========================================
-- 10. INDEXES
-- ==========================================

CREATE INDEX idx_matches_kickoff ON public.matches(kickoff);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_league ON public.matches(league_id);
CREATE INDEX idx_matches_home ON public.matches(home_team_id);
CREATE INDEX idx_matches_away ON public.matches(away_team_id);
CREATE INDEX idx_matches_live ON public.matches(is_live) WHERE is_live = TRUE;
CREATE INDEX idx_predictions_match ON public.predictions(match_id);
CREATE INDEX idx_odds_match ON public.odds(match_id);
CREATE INDEX idx_odds_value ON public.odds(is_value_bet) WHERE is_value_bet = TRUE;
CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_standings_league ON public.standings(league_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_user_predictions_user ON public.user_predictions(user_id);

-- ==========================================
-- 11. FUNCTIONS
-- ==========================================

-- Calculate Elo after match
CREATE OR REPLACE FUNCTION public.update_elo(
  home_id BIGINT, away_id BIGINT,
  home_goals INT, away_goals INT
) RETURNS VOID AS $$
DECLARE
  k CONSTANT INT := 32;
  home_adv CONSTANT INT := 65;
  h_elo INT; a_elo INT;
  expected_h NUMERIC; expected_a NUMERIC;
  actual_h NUMERIC; actual_a NUMERIC;
BEGIN
  SELECT elo_rating INTO h_elo FROM public.teams WHERE id = home_id;
  SELECT elo_rating INTO a_elo FROM public.teams WHERE id = away_id;

  expected_h := 1.0 / (1.0 + POWER(10, ((a_elo - (h_elo + home_adv))::NUMERIC / 400)));
  expected_a := 1.0 - expected_h;

  IF home_goals > away_goals THEN
    actual_h := 1.0; actual_a := 0.0;
  ELSIF home_goals = away_goals THEN
    actual_h := 0.5; actual_a := 0.5;
  ELSE
    actual_h := 0.0; actual_a := 1.0;
  END IF;

  UPDATE public.teams SET
    elo_rating = elo_rating + ROUND(k * (actual_h - expected_h)),
    updated_at = NOW()
  WHERE id = home_id;

  UPDATE public.teams SET
    elo_rating = elo_rating + ROUND(k * (actual_a - expected_a)),
    updated_at = NOW()
  WHERE id = away_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate prediction for a match
CREATE OR REPLACE FUNCTION public.generate_prediction(fixture_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  m RECORD;
  h_elo INT; a_elo INT;
  elo_diff NUMERIC;
  p_home NUMERIC; p_away NUMERIC; p_draw NUMERIC;
  draw_base NUMERIC;
  home_adv CONSTANT INT := 65;
  exp_h NUMERIC; exp_a NUMERIC; total_xg NUMERIC;
  p_o25 NUMERIC; p_btts NUMERIC;
  conf TEXT; conf_score NUMERIC;
  poisson_cdf NUMERIC; best TEXT;
  result JSONB;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = fixture_id;
  SELECT elo_rating INTO h_elo FROM public.teams WHERE id = m.home_team_id;
  SELECT elo_rating INTO a_elo FROM public.teams WHERE id = m.away_team_id;

  elo_diff := (h_elo + home_adv) - a_elo;

  -- Win probabilities (Elo formula)
  p_home := 1.0 / (1.0 + POWER(10, -elo_diff / 400));
  p_away := 1.0 - p_home;

  -- Draw correction
  draw_base := 0.26 - ABS(elo_diff) * 0.0003;
  p_draw := GREATEST(0.12, LEAST(0.32, draw_base));
  p_home := p_home * (1 - p_draw);
  p_away := p_away * (1 - p_draw);

  -- Normalize
  DECLARE
    total NUMERIC := p_home + p_draw + p_away;
  BEGIN
    p_home := p_home / total;
    p_draw := p_draw / total;
    p_away := p_away / total;
  END;

  -- Expected goals (simplified)
  exp_h := 1.2 + (elo_diff / 400.0) * 0.5;
  exp_a := 1.2 - (elo_diff / 400.0) * 0.5;
  exp_h := GREATEST(0.4, LEAST(3.5, exp_h));
  exp_a := GREATEST(0.4, LEAST(3.5, exp_a));
  total_xg := exp_h + exp_a;

  -- O/U 2.5 (Poisson CDF)
  poisson_cdf := EXP(-total_xg) * (1 + total_xg + POWER(total_xg,2)/2);
  p_o25 := 1 - poisson_cdf;

  -- BTTS
  p_btts := 1 - (EXP(-exp_h) + EXP(-exp_a) - EXP(-total_xg));

  -- Confidence
  conf_score := GREATEST(p_home, p_draw, p_away);
  IF conf_score > 0.55 THEN conf := 'high';
  ELSIF conf_score > 0.42 THEN conf := 'medium';
  ELSE conf := 'low';
  END IF;

  -- Best prediction
  IF p_home >= p_draw AND p_home >= p_away THEN best := '1';
  ELSIF p_away >= p_home AND p_away >= p_draw THEN best := '2';
  ELSE best := 'X';
  END IF;

  -- Upsert prediction
  INSERT INTO public.predictions (
    match_id, prob_home, prob_draw, prob_away, prediction,
    prob_over_25, prob_btts,
    expected_home_goals, expected_away_goals, expected_total_goals,
    home_elo, away_elo, confidence, confidence_score
  ) VALUES (
    fixture_id, p_home, p_draw, p_away, best,
    p_o25, p_btts,
    exp_h, exp_a, total_xg,
    h_elo, a_elo, conf, conf_score
  )
  ON CONFLICT (match_id, model_version) DO UPDATE SET
    prob_home = EXCLUDED.prob_home,
    prob_draw = EXCLUDED.prob_draw,
    prob_away = EXCLUDED.prob_away,
    prediction = EXCLUDED.prediction,
    prob_over_25 = EXCLUDED.prob_over_25,
    prob_btts = EXCLUDED.prob_btts,
    expected_home_goals = EXCLUDED.expected_home_goals,
    expected_away_goals = EXCLUDED.expected_away_goals,
    expected_total_goals = EXCLUDED.expected_total_goals,
    confidence = EXCLUDED.confidence,
    confidence_score = EXCLUDED.confidence_score;

  result := jsonb_build_object(
    'match_id', fixture_id,
    'home', ROUND(p_home, 4), 'draw', ROUND(p_draw, 4), 'away', ROUND(p_away, 4),
    'prediction', best, 'confidence', conf,
    'xg_home', ROUND(exp_h, 2), 'xg_away', ROUND(exp_a, 2),
    'over_25', ROUND(p_o25, 4), 'btts', ROUND(p_btts, 4)
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Value bet detection
CREATE OR REPLACE FUNCTION public.detect_value_bets()
RETURNS INT AS $$
DECLARE
  cnt INT := 0;
  o RECORD;
  p RECORD;
  model_prob NUMERIC;
  edge_val NUMERIC;
  min_edge CONSTANT NUMERIC := 0.05; -- 5% minimum edge
BEGIN
  FOR o IN
    SELECT * FROM public.odds
    WHERE market = '1x2'
    AND match_id IN (SELECT id FROM public.matches WHERE status = 'NS')
  LOOP
    SELECT * INTO p FROM public.predictions WHERE match_id = o.match_id LIMIT 1;
    IF p IS NOT NULL THEN
      -- Check home value
      IF o.implied_home IS NOT NULL AND p.prob_home - o.implied_home > min_edge THEN
        UPDATE public.odds SET is_value_bet = TRUE, edge = p.prob_home - o.implied_home WHERE id = o.id;
        cnt := cnt + 1;
      -- Check draw value
      ELSIF o.implied_draw IS NOT NULL AND p.prob_draw - o.implied_draw > min_edge THEN
        UPDATE public.odds SET is_value_bet = TRUE, edge = p.prob_draw - o.implied_draw WHERE id = o.id;
        cnt := cnt + 1;
      -- Check away value
      ELSIF o.implied_away IS NOT NULL AND p.prob_away - o.implied_away > min_edge THEN
        UPDATE public.odds SET is_value_bet = TRUE, edge = p.prob_away - o.implied_away WHERE id = o.id;
        cnt := cnt + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 12. REALTIME
-- ==========================================

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.odds;

-- ==========================================
-- 13. INITIAL MODEL VERSION
-- ==========================================

INSERT INTO public.model_versions (version, description, algorithm, is_active) VALUES
('v1.0', 'Elo + Poisson baseline model', 'elo_poisson_v1', TRUE);

-- ==========================================
-- DONE! Next steps:
-- 1. Set API-Football key in api_config
-- 2. Deploy Edge Functions for data sync
-- 3. Set up cron jobs for periodic sync
-- ==========================================
