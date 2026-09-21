import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { isConfigured } from './lib/supabase'
import { LEAGUES, TEAMS, MATCHES, VALUE_BETS, BACKTEST, getTeam, getLeague, getH2H } from './lib/data'
import { predict, pct } from './lib/predictions'
import { t } from './lib/i18n'
import MatchCard, { Badge, FormBadges } from './components/MatchCard'

function toggleTheme() {
  const c = document.documentElement.getAttribute('data-theme')
  const n = c === 'light' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', n)
  localStorage.setItem('px-theme', n)
}

// SEO helper
function useTitle(title) { useEffect(() => { document.title = title + ' — PredictX' }, [title]) }

// Toast
let toastTimer
function Toast({ msg, show }) {
  return <div className="toast" style={{ opacity: show ? 1 : 0 }}>{msg}</div>
}

function rCol(r) { return r >= 90 ? 'var(--px-green)' : r >= 85 ? 'var(--px-blue)' : r >= 80 ? 'var(--px-amber)' : 'var(--px-text3)' }
function rBg(r) { return r >= 90 ? 'var(--px-green-bg)' : r >= 85 ? 'var(--px-blue-bg)' : r >= 80 ? 'var(--px-amber-bg)' : 'var(--px-surface2)' }

// ===================== PAGES =====================

function Dashboard() {
  useTitle('მთავარი')
  const nav = useNavigate()
  const { user, profile } = useAuth()
  const [search, setSearch] = useState('')

  const filtered = search.length >= 2
    ? MATCHES.filter(m => { const h = getTeam(m.home), a = getTeam(m.away); return h?.name.toLowerCase().includes(search.toLowerCase()) || a?.name.toLowerCase().includes(search.toLowerCase()) })
    : null

  return <div className="page-enter">
    <div className="header">
      <div><div className="logo"><span className="logo-p">Predict</span><span className="logo-x">X</span></div>
        <div style={{ fontSize: 11, color: 'var(--px-text3)', marginTop: 1 }}>AI ფეხბურთის პროგნოზები</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="theme-btn" onClick={toggleTheme}>☀</button>
        {user ? <div style={{ fontSize: 11, color: 'var(--px-text2)', cursor: 'pointer' }} onClick={() => nav('/profile')}>{profile?.display_name || '👤'}</div>
          : <button className="btn btn-primary btn-sm" onClick={() => nav('/login')}>შესვლა</button>}
      </div>
    </div>

    <div className="search-wrap"><span className="search-icon">🔍</span>
      <input className="input" placeholder={t('search.placeholder')} value={search} onChange={e => setSearch(e.target.value)} /></div>

    {!isConfigured && <div className="card" style={{ borderColor: 'var(--px-amber)', padding: 10, fontSize: 11, color: 'var(--px-amber)' }}>⚠️ {t('common.demoMode')} — .env ფაილში შეცვალე VITE_SUPABASE_URL</div>}

    {filtered ? <>
      <div className="section-title">{t('search.matches')}</div>
      {filtered.length ? filtered.map(m => <MatchCard key={m.id} match={m} />) : <div className="empty">{t('search.noResults')}</div>}
    </> : <>
      <div className="section-title">{t('dash.daily')} <span className="streak">🔥 3 {t('dash.streak')}</span></div>
      {MATCHES.slice(0, 2).map(m => <MatchCard key={m.id} match={m} />)}

      <div className="section-title">{t('dash.upcoming')} <span className="link" onClick={() => nav('/matches')}>{t('dash.seeAll')}</span></div>
      {MATCHES.slice(2, 5).map(m => <MatchCard key={m.id} match={m} />)}

      <div className="section-title">💰 Value Bets <span className="link" onClick={() => nav('/value')}>{t('dash.seeAll')}</span></div>
      {VALUE_BETS.slice(0, 2).map((v, i) => {
        const h = getTeam(v.home), a = getTeam(v.away)
        return <div key={i} className="card value-card" onClick={() => nav('/value')}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: 12, fontWeight: 600 }}>{h?.name} vs {a?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--px-text3)', marginTop: 2 }}>{v.market} @ {v.odds}</div></div>
            <div style={{ textAlign: 'right' }}><div className="edge-value">+{pct(v.edge)}</div><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>edge</div></div>
          </div>
          <div className="edge-bar"><div className="edge-bar-fill" style={{ width: Math.min(100, v.edge * 600) + '%' }} /></div>
        </div>
      })}

      <div className="section-title">🏆 {t('nav.leagues')}</div>
      {Object.values(LEAGUES).slice(0, 4).map(lg =>
        <div key={lg.id} className="league-pill" onClick={() => nav(`/league/${lg.id}`)}>
          <span className="mc-dot" style={{ background: lg.color, width: 10, height: 10 }} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{lg.name}</div><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>{lg.country}</div></div>
          <span style={{ fontSize: 11, color: 'var(--px-text3)' }}>→</span>
        </div>
      )}
    </>}
  </div>
}

function MatchesPage() {
  useTitle('მატჩები')
  const [tab, setTab] = useState(0)
  const lids = Object.keys(LEAGUES).map(Number)
  const filtered = tab === 0 ? MATCHES : MATCHES.filter(m => m.league === lids[tab - 1])
  return <div className="page-enter">
    <div className="header"><h1 style={{ fontSize: 18, fontWeight: 700 }}>{t('nav.matches')}</h1></div>
    <div className="tabs">
      {['ყველა', ...Object.values(LEAGUES).map(l => l.name)].map((name, i) =>
        <button key={i} className={`tab ${i === tab ? 'active' : ''}`} onClick={() => setTab(i)}>{name}</button>)}
    </div>
    {filtered.length ? filtered.map(m => <MatchCard key={m.id} match={m} />) : <div className="empty">{t('league.noMatches')}</div>}
  </div>
}

function ValueBetsPage() {
  useTitle('Value Bets')
  return <div className="page-enter">
    <div className="header"><h1 style={{ fontSize: 18, fontWeight: 700 }}>💰 {t('value.title')}</h1></div>
    <p style={{ fontSize: 12, color: 'var(--px-text3)', marginBottom: 14 }}>{t('value.desc')}</p>
    {VALUE_BETS.map((v, i) => {
      const h = getTeam(v.home), a = getTeam(v.away), lg = getLeague(v.league)
      return <div key={i} className="card value-card">
        <div className="mc-league"><span className="mc-dot" style={{ background: lg?.color }} />{lg?.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div><div style={{ fontSize: 14, fontWeight: 600 }}>{h?.name} vs {a?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--px-blue)', fontWeight: 600, marginTop: 3 }}>{v.market}</div></div>
          <div style={{ textAlign: 'right' }}><div className="edge-value">+{pct(v.edge)}</div></div>
        </div>
        <div className="grid-3" style={{ marginBottom: 8 }}>
          <div className="analysis"><div className="analysis-title">Odds</div><div className="analysis-value" style={{ fontSize: 20, color: 'var(--px-amber)' }}>{v.odds}</div></div>
          <div className="analysis"><div className="analysis-title">{t('pred.model')}</div><div className="analysis-value" style={{ fontSize: 20, color: 'var(--px-green)' }}>{pct(v.modelProb)}</div></div>
          <div className="analysis"><div className="analysis-title">{t('pred.market')}</div><div className="analysis-value" style={{ fontSize: 20, color: 'var(--px-text2)' }}>{pct(v.impliedProb)}</div></div>
        </div>
        <div className="edge-bar"><div className="edge-bar-fill" style={{ width: Math.min(100, v.edge * 600) + '%' }} /></div>
      </div>
    })}
  </div>
}

function LeaguesPage() {
  useTitle('ლიგები')
  const nav = useNavigate()
  return <div className="page-enter">
    <div className="header"><h1 style={{ fontSize: 18, fontWeight: 700 }}>{t('nav.leagues')}</h1></div>
    {Object.values(LEAGUES).map(lg =>
      <div key={lg.id} className="league-pill" onClick={() => nav(`/league/${lg.id}`)}>
        <span className="mc-dot" style={{ background: lg.color, width: 12, height: 12 }} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{lg.name}</div><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>{lg.country} · Priority {lg.priority}</div></div>
        <span style={{ fontSize: 11, color: 'var(--px-text3)' }}>→</span>
      </div>
    )}
  </div>
}

function LeagueDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const lg = getLeague(Number(id))
  useTitle(lg?.name || 'ლიგა')
  if (!lg) return <div className="empty">ლიგა ვერ მოიძებნა</div>
  const teams = Object.values(TEAMS).sort((a, b) => b.elo - a.elo).slice(0, 6)
  const matches = MATCHES.filter(m => m.league === Number(id))
  return <div className="page-enter">
    <button className="back-btn" onClick={() => nav(-1)}>{t('match.back')}</button>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: lg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{lg.name[0]}</div>
      <div><div style={{ fontSize: 17, fontWeight: 700 }}>{lg.name}</div><div style={{ fontSize: 11, color: 'var(--px-text3)' }}>{lg.country}</div></div>
    </div>
    <div className="section-title">{t('league.table')}</div>
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table className="table"><thead><tr><th>#</th><th>{t('league.team')}</th><th>M</th><th>W</th><th>D</th><th>L</th><th style={{ fontWeight: 700, color: 'var(--px-blue)' }}>PTS</th></tr></thead>
        <tbody>{teams.map((team, i) => {
          const w = team.form.split('').filter(c => c === 'W').length, d = team.form.split('').filter(c => c === 'D').length, l = team.form.split('').filter(c => c === 'L').length
          return <tr key={team.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/team/${Object.keys(TEAMS).find(k => TEAMS[k] === team)}`)}>
            <td style={{ fontWeight: 600, color: 'var(--px-text3)', width: 22 }}>{i + 1}</td>
            <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Badge team={team} size={20} /><span style={{ fontSize: 12, fontWeight: 500 }}>{team.short}</span></div></td>
            <td>8</td><td>{w + 1}</td><td>{d}</td><td>{l}</td>
            <td style={{ fontWeight: 700, color: 'var(--px-blue)', fontFamily: 'var(--mono)' }}>{(w + 1) * 3 + d}</td>
          </tr>
        })}</tbody></table>
    </div>
    <div className="section-title">{t('nav.matches')}</div>
    {matches.length ? matches.map(m => <MatchCard key={m.id} match={m} />) : <div className="empty">{t('league.noMatches')}</div>}
  </div>
}

function MatchDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const m = MATCHES.find(x => x.id === Number(id))
  if (!m) return <div className="empty">მატჩი ვერ მოიძებნა</div>
  const h = getTeam(m.home), a = getTeam(m.away), lg = getLeague(m.league)
  const h2h = getH2H(m.home, m.away)
  const p = predict(h, a, h2h)
  useTitle(`${h?.name} vs ${a?.name}`)

  return <div className="page-enter">
    <button className="back-btn" onClick={() => nav(-1)}>{t('match.back')}</button>
    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--px-text3)', marginBottom: 6 }}>
      <span className="mc-dot" style={{ background: lg?.color, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />{lg?.name} · {m.round}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, margin: '10px 0 4px' }}>
      <div style={{ textAlign: 'center' }}><Badge team={h} size={42} /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>{h.name}</div><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>Elo {h.elo}</div><FormBadges form={h.form} /></div>
      <div style={{ fontSize: 14, color: 'var(--px-text3)' }}>vs</div>
      <div style={{ textAlign: 'center' }}><Badge team={a} size={42} /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>{a.name}</div><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>Elo {a.elo}</div><FormBadges form={a.form} /></div>
    </div>
    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--px-text3)', marginBottom: 14 }}>{m.date}</div>

    <div className="section-title">{t('match.prediction')} 1X2</div>
    <div className="pred-bar">
      <div className={`pred-item ${p.best === '1' ? 'highlight' : ''}`}><span className="val">{pct(p.home)}</span>1 — {h.short}</div>
      <div className={`pred-item ${p.best === 'X' ? 'highlight' : ''}`}><span className="val">{pct(p.draw)}</span>X</div>
      <div className={`pred-item ${p.best === '2' ? 'highlight' : ''}`}><span className="val">{pct(p.away)}</span>2 — {a.short}</div>
    </div>
    <div className="prob-bar">
      <div style={{ width: pct(p.home), background: 'var(--px-blue)', borderRadius: 3 }} />
      <div style={{ width: pct(p.draw), background: 'var(--px-text3)', borderRadius: 3 }} />
      <div style={{ width: pct(p.away), background: 'var(--px-red)', borderRadius: 3 }} />
    </div>

    <div className="section-title">{t('match.totals')}</div>
    <div className="grid-3">
      <div className="analysis"><div className="analysis-title">O/U 1.5</div><div className="analysis-value" style={{ fontSize: 20, color: rCol(p.o15 * 100) }}>{pct(p.o15)}</div></div>
      <div className="analysis"><div className="analysis-title">O/U 2.5</div><div className="analysis-value" style={{ fontSize: 20, color: rCol(p.o25 * 100) }}>{pct(p.o25)}</div></div>
      <div className="analysis"><div className="analysis-title">O/U 3.5</div><div className="analysis-value" style={{ fontSize: 20, color: rCol(p.o35 * 100) }}>{pct(p.o35)}</div></div>
    </div>
    <div className="grid-2" style={{ marginTop: 8 }}>
      <div className="analysis"><div className="analysis-title">🎯 BTTS</div><div className="analysis-value" style={{ color: p.btts > .55 ? 'var(--px-green)' : 'var(--px-amber)' }}>{pct(p.btts)}</div></div>
      <div className="analysis"><div className="analysis-title">📊 xG</div><div className="analysis-value" style={{ color: 'var(--px-blue)' }}>{p.xgH.toFixed(1)} - {p.xgA.toFixed(1)}</div></div>
    </div>

    <div className="section-title">{t('match.goals')} (Poisson)</div>
    <div className="card">{p.goalProbs.slice(0, 5).map(g =>
      <div key={g.goals} className="stat-row">
        <span className="stat-label">{g.goals} {t('common.goal')}</span>
        <div style={{ flex: 1, margin: '0 10px' }}><div style={{ height: 5, borderRadius: 3, background: 'var(--px-surface2)' }}><div style={{ height: 5, borderRadius: 3, background: 'var(--px-blue)', width: pct(g.prob) }} /></div></div>
        <span className="stat-value">{pct(g.prob)}</span>
      </div>
    )}</div>

    {h2h && <>
      <div className="section-title">{t('match.h2h')}</div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{h.short}</span>
          <span style={{ fontSize: 11, color: 'var(--px-text3)' }}>{h2h.played} მატჩი</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{a.short}</span>
        </div>
        <div className="h2h-bar">
          <div style={{ width: `${Math.round(h2h.homeWins / h2h.played * 100)}%`, background: 'var(--px-blue)' }} />
          <div style={{ width: `${Math.round(h2h.draws / h2h.played * 100)}%`, background: 'var(--px-text3)' }} />
          <div style={{ width: `${Math.round(h2h.awayWins / h2h.played * 100)}%`, background: 'var(--px-red)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--px-text3)' }}>
          <span>{h2h.homeWins}W</span><span>{h2h.draws}D</span><span>{h2h.awayWins}W</span>
        </div>
        {h2h.last && <div style={{ marginTop: 8 }}><FormBadges form={h2h.last.join('')} /></div>}
      </div>
    </>}

    <div className="section-title">{t('match.factors')} (Ensemble v2)</div>
    <div className="card">{Object.entries({ Elo: p.factors.elo, Form: p.factors.form, 'H2H': p.factors.h2h, Strength: p.factors.strength }).map(([k, v]) => {
      const val = parseFloat(v)
      return <div key={k} className="stat-row">
        <span className="stat-label">{k}</span>
        <span className="stat-value" style={{ color: val >= 0 ? 'var(--px-green)' : 'var(--px-red)' }}>{val >= 0 ? '+' : ''}{v}</span>
      </div>
    })}</div>

    <div className="section-title">{t('match.players')}</div>
    {[h, a].map(team => <div key={team.short} className="card">
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--px-text2)', marginBottom: 6 }}>{team.name}</div>
      {team.players.sort((a, b) => b.r - a.r).map(pl =>
        <div key={pl.n} className="player-row">
          <div className="player-rating" style={{ background: rBg(pl.r), color: rCol(pl.r) }}>{pl.r}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{pl.n}</div><div style={{ fontSize: 11, color: 'var(--px-text3)' }}>{pl.p}</div></div>
          <span style={{ fontSize: 10, color: 'var(--px-text3)' }}>{pl.r >= 90 ? t('team.worldClass') : pl.r >= 85 ? t('team.elite') : pl.r >= 80 ? t('team.veryGood') : t('team.good')}</span>
        </div>
      )}
    </div>)}
  </div>
}

function TeamDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const team = getTeam(id)
  useTitle(team?.name || 'გუნდი')
  if (!team) return <div className="empty">გუნდი ვერ მოიძებნა</div>
  const avg = Math.round(team.players.reduce((s, p) => s + p.r, 0) / team.players.length)
  const matches = MATCHES.filter(m => m.home === id || m.away === id)
  return <div className="page-enter">
    <button className="back-btn" onClick={() => nav(-1)}>{t('match.back')}</button>
    <div style={{ textAlign: 'center', marginBottom: 14 }}>
      <Badge team={team} size={50} />
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{team.name}</div>
      <div style={{ fontSize: 11, color: 'var(--px-text3)', margin: '2px 0' }}>Elo {team.elo}</div>
      <FormBadges form={team.form} />
    </div>
    <div className="grid-2" style={{ marginBottom: 14 }}>
      <div className="analysis" style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>{t('team.avgRating')}</div><div className="analysis-value" style={{ color: rCol(avg), marginTop: 3 }}>{avg}</div></div>
      <div className="analysis" style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>გოლი/მატჩი</div><div className="analysis-value" style={{ color: 'var(--px-blue)', marginTop: 3 }}>{team.gf.toFixed(1)}</div></div>
    </div>
    <div className="section-title">{t('team.squad')}</div>
    <div className="card">{team.players.sort((a, b) => b.r - a.r).map(pl =>
      <div key={pl.n} className="player-row">
        <div className="player-rating" style={{ background: rBg(pl.r), color: rCol(pl.r) }}>{pl.r}</div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{pl.n}</div><div style={{ fontSize: 11, color: 'var(--px-text3)' }}>{pl.p}</div></div>
      </div>
    )}</div>
    {matches.length > 0 && <><div className="section-title">{t('nav.matches')}</div>{matches.map(m => <MatchCard key={m.id} match={m} />)}</>}
  </div>
}

function ModelLab() {
  useTitle('Model Lab')
  const nav = useNavigate()
  const avgAcc = (BACKTEST.reduce((s, b) => s + b.acc, 0) / BACKTEST.length * 100).toFixed(1)
  const avgBrier = (BACKTEST.reduce((s, b) => s + b.brier, 0) / BACKTEST.length).toFixed(3)
  return <div className="page-enter">
    <button className="back-btn" onClick={() => nav(-1)}>{t('match.back')}</button>
    <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>🧪 {t('model.title')}</div>
    <div style={{ fontSize: 11, color: 'var(--px-text3)', marginBottom: 14 }}>Ensemble v2.0 — Elo + Poisson + Form + H2H</div>
    <div className="grid-2" style={{ marginBottom: 14 }}>
      <div className="analysis" style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>{t('model.accuracy')}</div><div className="analysis-value" style={{ color: 'var(--px-green)', marginTop: 3 }}>{avgAcc}%</div></div>
      <div className="analysis" style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--px-text3)' }}>Brier Score</div><div className="analysis-value" style={{ color: 'var(--px-blue)', marginTop: 3 }}>{avgBrier}</div></div>
    </div>
    <div className="section-title">{t('model.factors')}</div>
    <div className="card">{[{ n: 'Elo Rating', w: 55, c: 'var(--px-blue)' }, { n: 'Form (weighted)', w: 20, c: 'var(--px-green)' }, { n: 'H2H History', w: 12, c: 'var(--px-amber)' }, { n: 'Attack/Defense', w: 8, c: 'var(--px-purple)' }].map(f =>
      <div key={f.n} className="stat-row"><span className="stat-label">{f.n}</span>
        <div style={{ flex: 1, margin: '0 10px' }}><div style={{ height: 5, borderRadius: 3, background: 'var(--px-surface2)' }}><div style={{ height: 5, borderRadius: 3, background: f.c, width: f.w + '%' }} /></div></div>
        <span className="stat-value">{f.w}%</span></div>
    )}</div>
    <div className="section-title">{t('model.backtesting')}</div>
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table className="table"><thead><tr><th>{t('model.week')}</th><th>{t('model.predictions')}</th><th>{t('model.correct')}</th><th>Acc</th><th>Brier</th></tr></thead>
        <tbody>{BACKTEST.map(b => <tr key={b.period}><td style={{ fontSize: 11 }}>{b.period}</td><td>{b.preds}</td><td style={{ color: 'var(--px-green)' }}>{b.correct}</td><td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{(b.acc * 100).toFixed(0)}%</td><td style={{ fontFamily: 'var(--mono)' }}>{b.brier.toFixed(3)}</td></tr>)}</tbody></table>
    </div>
    <div className="section-title">{t('model.calibration')}</div>
    <div className="card">{[{ bin: '0-20%', exp: 10, act: 8 }, { bin: '20-40%', exp: 30, act: 27 }, { bin: '40-60%', exp: 50, act: 48 }, { bin: '60-80%', exp: 70, act: 66 }, { bin: '80-100%', exp: 90, act: 85 }].map(c =>
      <div key={c.bin} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--px-text3)', width: 50 }}>{c.bin}</span>
        <div style={{ flex: 1, position: 'relative', height: 14 }}>
          <div style={{ position: 'absolute', height: 14, borderRadius: 3, background: 'var(--px-blue-bg)', width: c.exp + '%' }} />
          <div style={{ position: 'absolute', height: 14, borderRadius: 3, background: 'var(--px-blue)', width: c.act + '%', opacity: .7 }} />
        </div>
        <span style={{ fontSize: 11, width: 30, textAlign: 'right', color: Math.abs(c.exp - c.act) < 5 ? 'var(--px-green)' : 'var(--px-amber)' }}>{c.act}%</span>
      </div>
    )}</div>
  </div>
}

function MorePage() {
  const nav = useNavigate()
  const { user, profile, logout } = useAuth()
  return <div className="page-enter">
    <div className="header"><h1 style={{ fontSize: 18, fontWeight: 700 }}>{t('nav.more')}</h1></div>
    {user ? <div className="card card-interactive" onClick={() => nav('/profile')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--px-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{(profile?.display_name || 'U')[0].toUpperCase()}</div>
        <div><div style={{ fontSize: 14, fontWeight: 600 }}>{profile?.display_name}</div><div style={{ fontSize: 11, color: 'var(--px-text3)' }}>{user.email}</div></div>
      </div>
    </div> : <div className="card card-interactive" onClick={() => nav('/login')}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--px-blue)' }}>{t('auth.login')} / {t('auth.register')}</div>
    </div>}
    <div className="section-title">მენიუ</div>
    <div className="card card-interactive" onClick={() => nav('/model')}>🧪 Model Lab<div style={{ fontSize: 11, color: 'var(--px-text3)' }}>Accuracy, Brier Score, Calibration</div></div>
    <div className="card card-interactive" onClick={() => nav('/profile')}>👤 {t('profile.title')}</div>
    {profile?.role === 'admin' && <div className="card card-interactive" style={{ borderColor: 'var(--px-purple)' }} onClick={() => nav('/admin')}>👨‍💼 Admin Panel</div>}
    {user && <button className="btn btn-danger" onClick={logout} style={{ marginTop: 16 }}>{t('auth.logout')}</button>}
  </div>
}

// ===================== APP =====================

export default function App() {
  const location = useLocation()
  const nav = useNavigate()
  const pages = [
    { path: '/', icon: '⚽', label: t('nav.home') },
    { path: '/matches', icon: '📊', label: t('nav.matches') },
    { path: '/value', icon: '💰', label: t('nav.value') },
    { path: '/leagues', icon: '🏆', label: t('nav.leagues') },
    { path: '/more', icon: '☰', label: t('nav.more') },
  ]
  const isMain = pages.some(p => p.path === location.pathname)

  return <>
    <div className="container">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/match/:id" element={<MatchDetail />} />
        <Route path="/value" element={<ValueBetsPage />} />
        <Route path="/leagues" element={<LeaguesPage />} />
        <Route path="/league/:id" element={<LeagueDetail />} />
        <Route path="/team/:id" element={<TeamDetail />} />
        <Route path="/model" element={<ModelLab />} />
        <Route path="/more" element={<MorePage />} />
      </Routes>
    </div>
    <nav className="nav">
      {pages.map(p => <button key={p.path} className={`nav-item ${location.pathname === p.path ? 'active' : ''}`} onClick={() => nav(p.path)}>
        <span className="nav-icon">{p.icon}</span>{p.label}
      </button>)}
    </nav>
  </>
}
