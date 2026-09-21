import { useNavigate } from 'react-router-dom'
import { getTeam, getLeague, getH2H } from '../lib/data'
import { predict, pct } from '../lib/predictions'
import { t } from '../lib/i18n'

function Badge({ team, size = 30 }) {
  return <div className="mc-badge" style={{ width: size, height: size, background: team.color, fontSize: size < 24 ? 8 : 10 }}>{team.short}</div>
}

function FormBadges({ form }) {
  if (!form) return null
  return <div className="form-row">{form.split('').map((c, i) => <div key={i} className={`form-b form-${c.toLowerCase()}`}>{c}</div>)}</div>
}

export default function MatchCard({ match }) {
  const nav = useNavigate()
  const h = getTeam(match.home), a = getTeam(match.away), lg = getLeague(match.league)
  if (!h || !a || !lg) return null
  const h2h = getH2H(match.home, match.away)
  const p = predict(h, a, h2h)
  const isLive = ['1H', 'HT', '2H'].includes(match.status)

  return (
    <div className="card card-interactive" onClick={() => nav(`/match/${match.id}`)}>
      <div className="mc-league">
        <span className="mc-dot" style={{ background: lg.color }} />
        {lg.name} · {match.round}
        {isLive && <span className="tag tag-live" style={{ marginLeft: 'auto' }}><span className="live-dot" />{match.elapsed}'</span>}
      </div>
      <div className="mc-teams">
        <div className="mc-team"><Badge team={h} /><span className="mc-name">{h.name}</span></div>
        {isLive
          ? <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--px-green)', padding: '0 6px', fontFamily: 'var(--mono)' }}>{match.hg ?? 0} - {match.ag ?? 0}</div>
          : <span className="mc-vs">vs</span>}
        <div className="mc-team away"><span className="mc-name">{a.name}</span><Badge team={a} /></div>
      </div>
      <div className="pred-bar">
        <div className={`pred-item ${p.best === '1' ? 'highlight' : ''}`}><span className="val">{pct(p.home)}</span>1</div>
        <div className={`pred-item ${p.best === 'X' ? 'highlight' : ''}`}><span className="val">{pct(p.draw)}</span>X</div>
        <div className={`pred-item ${p.best === '2' ? 'highlight' : ''}`}><span className="val">{pct(p.away)}</span>2</div>
      </div>
      <div className="prob-bar">
        <div style={{ width: pct(p.home), background: 'var(--px-blue)', borderRadius: 3 }} />
        <div style={{ width: pct(p.draw), background: 'var(--px-text3)', borderRadius: 3 }} />
        <div style={{ width: pct(p.away), background: 'var(--px-red)', borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--px-text3)' }}>{match.date}</span>
        <span className={`tag ${p.conf === 'high' ? 'tag-w' : p.conf === 'med' ? 'tag-d' : 'tag-l'}`}>
          {t(`pred.${p.conf === 'med' ? 'medium' : p.conf}`)}
        </span>
      </div>
    </div>
  )
}

export { Badge, FormBadges }
