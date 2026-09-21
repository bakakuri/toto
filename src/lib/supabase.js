import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const isConfigured = url.length > 10 && !url.includes('YOUR_')
export const supabase = isConfigured ? createClient(url, key) : null

// Data fetchers with fallback
export async function fetchMatches(leagueId) {
  if (!supabase) return null
  let q = supabase.from('matches').select(`*, home:teams!home_team_id(id,name,code,logo_url,elo_rating), away:teams!away_team_id(id,name,code,logo_url,elo_rating), league:leagues(id,name,country,color)`)
    .order('kickoff', { ascending: true }).eq('status', 'NS').limit(20)
  if (leagueId) q = q.eq('league_id', leagueId)
  const { data } = await q
  return data
}

export async function fetchStandings(leagueId) {
  if (!supabase) return null
  const { data } = await supabase.from('standings').select('*, team:teams(id,name,code,logo_url,elo_rating)')
    .eq('league_id', leagueId).order('rank')
  return data
}

export async function fetchTeam(teamId) {
  if (!supabase) return null
  const { data } = await supabase.from('teams').select('*').eq('id', teamId).single()
  const { data: players } = await supabase.from('players').select('*').eq('team_id', teamId).order('rating', { ascending: false })
  return { ...data, players }
}

export async function fetchPrediction(matchId) {
  if (!supabase) return null
  const { data } = await supabase.from('predictions').select('*').eq('match_id', matchId).single()
  return data
}

export async function fetchValueBets() {
  if (!supabase) return null
  const { data } = await supabase.from('value_bets').select('*').limit(10)
  return data
}

export async function subscribeLive(callback) {
  if (!supabase) return null
  return supabase.channel('live').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: 'is_live=eq.true' }, callback).subscribe()
}
