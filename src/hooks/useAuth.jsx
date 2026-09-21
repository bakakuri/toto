import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, isConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [favTeams, setFavTeams] = useState(new Set())

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      if (data.session?.user) loadProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setFavTeams(new Set()) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data)
    const { data: fav } = await supabase.from('favorite_teams').select('team_id').eq('user_id', uid)
    setFavTeams(new Set((fav || []).map(f => f.team_id)))
  }

  async function login(email, password) {
    if (!supabase) throw new Error('Supabase არ არის დაკავშირებული')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function register(email, password, name) {
    if (!supabase) throw new Error('Supabase არ არის დაკავშირებული')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
    if (error) throw error
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    setUser(null); setProfile(null); setFavTeams(new Set())
  }

  async function toggleFavTeam(teamId) {
    if (!supabase || !user) return
    if (favTeams.has(teamId)) {
      await supabase.from('favorite_teams').delete().eq('user_id', user.id).eq('team_id', teamId)
      setFavTeams(prev => { const s = new Set(prev); s.delete(teamId); return s })
    } else {
      await supabase.from('favorite_teams').insert({ user_id: user.id, team_id: teamId })
      setFavTeams(prev => new Set(prev).add(teamId))
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, favTeams, login, register, logout, toggleFavTeam, isConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
