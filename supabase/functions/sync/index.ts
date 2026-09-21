// ==========================================
// PredictX — Supabase Edge Function
// File: supabase/functions/sync/index.ts
// Deploy: supabase functions deploy sync
// Cron: every 30 min via Supabase dashboard
// ==========================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("API_FOOTBALL_KEY")!;
const API_BASE = "https://v3.football.api-sports.io";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Priority league IDs (API-Football)
const PRIORITY_LEAGUES = [39, 140, 135, 78, 61, 2, 3, 848];

// ============= API HELPERS =============

async function apiFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const start = Date.now();
  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const duration = Date.now() - start;

  // Log sync
  await supabase.from("sync_log").insert({
    endpoint,
    status: data.errors?.length ? "error" : "success",
    records_synced: data.results || 0,
    requests_used: 1,
    duration_ms: duration,
    error_message: data.errors?.length ? JSON.stringify(data.errors) : null,
  });

  // Track daily requests
  await supabase.rpc("increment_daily_requests");

  return data.response || [];
}

// ============= SYNC FUNCTIONS =============

async function syncTeams(leagueId: number, season: number = 2026) {
  const teams = await apiFetch("teams", {
    league: String(leagueId),
    season: String(season),
  });

  for (const item of teams) {
    const t = item.team;
    const v = item.venue;

    await supabase.from("teams").upsert({
      id: t.id,
      name: t.name,
      short_name: t.code || t.name.substring(0, 3).toUpperCase(),
      code: t.code,
      logo_url: t.logo,
      country: t.country,
      founded: t.founded,
      venue_name: v?.name,
      venue_capacity: v?.capacity,
      updated_at: new Date().toISOString(),
    });

    await supabase.from("league_teams").upsert({
      league_id: leagueId,
      team_id: t.id,
      season,
    });
  }

  return teams.length;
}

async function syncFixtures(leagueId: number, season: number = 2026) {
  const fixtures = await apiFetch("fixtures", {
    league: String(leagueId),
    season: String(season),
  });

  const batch = fixtures.map((item: any) => ({
    id: item.fixture.id,
    league_id: leagueId,
    season,
    round: item.league.round,
    home_team_id: item.teams.home.id,
    away_team_id: item.teams.away.id,
    status: item.fixture.status.short,
    kickoff: item.fixture.date,
    venue: item.fixture.venue?.name,
    referee: item.fixture.referee,
    home_goals: item.goals.home,
    away_goals: item.goals.away,
    home_goals_ht: item.score.halftime.home,
    away_goals_ht: item.score.halftime.away,
    elapsed: item.fixture.status.elapsed,
    is_live: ["1H", "HT", "2H", "ET", "BT", "P"].includes(
      item.fixture.status.short
    ),
    updated_at: new Date().toISOString(),
  }));

  // Upsert in chunks of 50
  for (let i = 0; i < batch.length; i += 50) {
    await supabase.from("matches").upsert(batch.slice(i, i + 50));
  }

  return batch.length;
}

async function syncLiveMatches() {
  const live = await apiFetch("fixtures", { live: "all" });

  for (const item of live) {
    const f = item.fixture;
    const stats = item.statistics || [];

    const homeStats = stats.find((s: any) => s.team.id === item.teams.home.id);
    const awayStats = stats.find((s: any) => s.team.id === item.teams.away.id);

    const getStat = (teamStats: any, type: string) => {
      if (!teamStats) return null;
      const s = teamStats.statistics?.find((st: any) => st.type === type);
      return s ? parseInt(s.value) || s.value : null;
    };

    await supabase
      .from("matches")
      .update({
        status: f.status.short,
        elapsed: f.status.elapsed,
        home_goals: item.goals.home,
        away_goals: item.goals.away,
        home_shots: getStat(homeStats, "Total Shots"),
        away_shots: getStat(awayStats, "Total Shots"),
        home_shots_on: getStat(homeStats, "Shots on Goal"),
        away_shots_on: getStat(awayStats, "Shots on Goal"),
        home_possession: getStat(homeStats, "Ball Possession")
          ? parseFloat(getStat(homeStats, "Ball Possession"))
          : null,
        away_possession: getStat(awayStats, "Ball Possession")
          ? parseFloat(getStat(awayStats, "Ball Possession"))
          : null,
        home_corners: getStat(homeStats, "Corner Kicks"),
        away_corners: getStat(awayStats, "Corner Kicks"),
        is_live: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", f.id);
  }

  // Mark finished matches as not live
  const liveIds = live.map((l: any) => l.fixture.id);
  if (liveIds.length > 0) {
    await supabase
      .from("matches")
      .update({ is_live: false })
      .eq("is_live", true)
      .not("id", "in", `(${liveIds.join(",")})`);
  }

  return live.length;
}

async function syncStandings(leagueId: number, season: number = 2026) {
  const data = await apiFetch("standings", {
    league: String(leagueId),
    season: String(season),
  });

  if (!data.length) return 0;

  const standings = data[0].league.standings.flat();

  for (const s of standings) {
    await supabase.from("standings").upsert(
      {
        league_id: leagueId,
        team_id: s.team.id,
        season,
        rank: s.rank,
        points: s.points,
        played: s.all.played,
        win: s.all.win,
        draw: s.all.draw,
        lose: s.all.lose,
        goals_for: s.all.goals.for,
        goals_against: s.all.goals.against,
        goal_diff: s.goalsDiff,
        form: s.form,
        description: s.description,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "league_id,team_id,season" }
    );
  }

  return standings.length;
}

async function syncPlayers(teamId: number, season: number = 2026) {
  let page = 1;
  let total = 0;

  do {
    const data = await apiFetch("players", {
      team: String(teamId),
      season: String(season),
      page: String(page),
    });

    if (!data.length) break;

    for (const item of data) {
      const p = item.player;
      const stats = item.statistics?.[0];

      // Calculate PredictX rating (1-100)
      const apiRating = stats?.games?.rating
        ? parseFloat(stats.games.rating)
        : null;
      const predictxRating = apiRating
        ? Math.min(99, Math.round(apiRating * 10 + Math.random() * 5))
        : 50;

      await supabase.from("players").upsert({
        id: p.id,
        name: p.name,
        firstname: p.firstname,
        lastname: p.lastname,
        photo_url: p.photo,
        nationality: p.nationality,
        birth_date: p.birth?.date,
        height: p.height,
        weight: p.weight,
        position: stats?.games?.position?.substring(0, 2).toUpperCase(),
        team_id: teamId,
        rating: predictxRating,
        api_rating: apiRating,
        appearances: stats?.games?.appearences || 0,
        goals: stats?.goals?.total || 0,
        assists: stats?.goals?.assists || 0,
        minutes: stats?.games?.minutes || 0,
        season,
        injured: p.injured || false,
        updated_at: new Date().toISOString(),
      });
    }

    total += data.length;
    page++;
  } while (page <= 3); // Max 3 pages per team

  return total;
}

async function syncOdds(fixtureId: number) {
  const data = await apiFetch("odds", {
    fixture: String(fixtureId),
    bookmaker: "8", // Bet365
  });

  if (!data.length) return 0;
  let cnt = 0;

  for (const item of data) {
    for (const bk of item.bookmakers || []) {
      for (const bet of bk.bets || []) {
        const market =
          bet.name === "Match Winner"
            ? "1x2"
            : bet.name === "Goals Over/Under"
              ? "ou25"
              : bet.name === "Both Teams Score"
                ? "btts"
                : null;

        if (!market) continue;

        const values: Record<string, number> = {};
        for (const v of bet.values) {
          values[v.value] = parseFloat(v.odd);
        }

        const odds: any = {
          match_id: fixtureId,
          bookmaker: bk.name,
          market,
          fetched_at: new Date().toISOString(),
        };

        if (market === "1x2") {
          odds.home_odds = values["Home"];
          odds.draw_odds = values["Draw"];
          odds.away_odds = values["Away"];
          odds.implied_home = values["Home"]
            ? 1 / values["Home"]
            : null;
          odds.implied_draw = values["Draw"]
            ? 1 / values["Draw"]
            : null;
          odds.implied_away = values["Away"]
            ? 1 / values["Away"]
            : null;
        } else if (market === "ou25") {
          odds.over_odds = values["Over 2.5"];
          odds.under_odds = values["Under 2.5"];
        } else if (market === "btts") {
          odds.yes_odds = values["Yes"];
          odds.no_odds = values["No"];
        }

        await supabase.from("odds").insert(odds);
        cnt++;
      }
    }
  }

  return cnt;
}

async function generateAllPredictions() {
  // Get upcoming matches without predictions
  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "NS")
    .order("kickoff", { ascending: true })
    .limit(50);

  let cnt = 0;
  for (const m of matches || []) {
    await supabase.rpc("generate_prediction", { fixture_id: m.id });
    cnt++;
  }

  // Detect value bets
  await supabase.rpc("detect_value_bets");

  return cnt;
}

async function updateEloAfterResults() {
  // Find recently finished matches without Elo update
  const { data: finished } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, home_goals, away_goals")
    .eq("status", "FT")
    .is("home_xg", null) // Use as a flag for "not yet processed"
    .limit(20);

  for (const m of finished || []) {
    if (m.home_goals !== null && m.away_goals !== null) {
      await supabase.rpc("update_elo", {
        home_id: m.home_team_id,
        away_id: m.away_team_id,
        home_goals: m.home_goals,
        away_goals: m.away_goals,
      });

      // Mark prediction result
      const result =
        m.home_goals > m.away_goals
          ? "1"
          : m.home_goals < m.away_goals
            ? "2"
            : "X";

      await supabase
        .from("predictions")
        .update({
          actual_result: result,
          is_correct: undefined, // Will be set by trigger or manual
        })
        .eq("match_id", m.id);

      // Check if prediction was correct
      const { data: pred } = await supabase
        .from("predictions")
        .select("prediction")
        .eq("match_id", m.id)
        .single();

      if (pred) {
        await supabase
          .from("predictions")
          .update({ is_correct: pred.prediction === result })
          .eq("match_id", m.id);
      }
    }
  }

  return (finished || []).length;
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "full";

    const results: Record<string, any> = { action, timestamp: new Date().toISOString() };

    switch (action) {
      case "full": {
        // Full sync — run daily or on demand
        for (const lid of PRIORITY_LEAGUES) {
          results[`teams_${lid}`] = await syncTeams(lid);
          results[`fixtures_${lid}`] = await syncFixtures(lid);
          results[`standings_${lid}`] = await syncStandings(lid);
        }
        results.predictions = await generateAllPredictions();
        results.elo_updates = await updateEloAfterResults();
        break;
      }

      case "live": {
        // Live sync — run every 1-2 min during match days
        results.live = await syncLiveMatches();
        break;
      }

      case "fixtures": {
        // Fixtures only
        for (const lid of PRIORITY_LEAGUES) {
          results[`fixtures_${lid}`] = await syncFixtures(lid);
        }
        break;
      }

      case "predictions": {
        // Re-generate predictions
        results.predictions = await generateAllPredictions();
        break;
      }

      case "odds": {
        // Sync odds for upcoming matches
        const { data: upcoming } = await supabase
          .from("matches")
          .select("id")
          .eq("status", "NS")
          .order("kickoff")
          .limit(20);

        let oddsCnt = 0;
        for (const m of upcoming || []) {
          oddsCnt += await syncOdds(m.id);
        }
        results.odds = oddsCnt;
        break;
      }

      case "players": {
        // Sync players — run weekly (quota heavy)
        const { data: teams } = await supabase
          .from("league_teams")
          .select("team_id")
          .in("league_id", PRIORITY_LEAGUES);

        const uniqueTeams = [...new Set((teams || []).map((t) => t.team_id))];
        for (const tid of uniqueTeams.slice(0, 10)) {
          // 10 teams per run
          results[`players_${tid}`] = await syncPlayers(tid);
        }
        break;
      }

      case "standings": {
        for (const lid of PRIORITY_LEAGUES) {
          results[`standings_${lid}`] = await syncStandings(lid);
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
        });
    }

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sync error:", err);

    await supabase.from("sync_log").insert({
      endpoint: "sync-function",
      status: "error",
      error_message: (err as Error).message,
    });

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ==========================================
// CRON SCHEDULE (set in Supabase Dashboard):
//
// Every 30 min:  ?action=fixtures
// Every 1 min:   ?action=live       (match days only)
// Every 6 hours: ?action=predictions
// Every 6 hours: ?action=odds
// Every 12 hours:?action=standings
// Weekly:        ?action=players
// Daily:         ?action=full        (off-peak)
// ==========================================
