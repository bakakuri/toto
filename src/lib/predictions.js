export function predict(home, away, h2hData) {
  const hAdv = 65
  const ed = (home.elo + hAdv) - away.elo
  let eloH = 1 / (1 + Math.pow(10, -ed / 400))

  // Form weighting
  const fw = [0.35, 0.25, 0.20, 0.12, 0.08]
  const formScore = (f) => {
    if (!f) return 0.5
    return f.split('').reduce((s, c, i) => s + (c === 'W' ? 1 : c === 'D' ? 0.4 : 0) * (fw[i] || 0.1), 0)
  }
  const hF = formScore(home.form), aF = formScore(away.form)
  const formAdj = (hF - aF) * 0.12

  // H2H
  let h2hAdj = 0
  if (h2hData && h2hData.played >= 3) {
    h2hAdj = (h2hData.homeWins / h2hData.played - 0.5) * 0.08
  }

  // Attack/Defense
  const avg = 1.4
  const hAtt = home.gf / avg, hDef = home.ga / avg
  const aAtt = away.gf / avg, aDef = away.ga / avg
  const strAdj = (hAtt / aDef - aAtt / hDef) * 0.03

  // Combine
  let pH = Math.max(0.05, Math.min(0.95, eloH + formAdj + h2hAdj + strAdj))
  let pA = 1 - pH
  let pD = Math.max(0.12, Math.min(0.32, 0.26 - Math.abs(ed) * 0.0003))
  pH *= (1 - pD); pA *= (1 - pD)
  const tot = pH + pD + pA
  pH /= tot; pD /= tot; pA /= tot

  // xG
  const xH = Math.max(0.4, Math.min(3.5, hAtt * aDef * avg * 1.05))
  const xA = Math.max(0.4, Math.min(3.5, aAtt * hDef * avg * 0.95))
  const xT = xH + xA

  // Poisson
  const poissonCDF = (k, l) => {
    let s = 0; for (let i = 0; i <= k; i++) { let f = 1; for (let j = 2; j <= i; j++) f *= j; s += Math.pow(l, i) * Math.exp(-l) / f; } return s
  }

  const o15 = 1 - poissonCDF(1, xT)
  const o25 = 1 - poissonCDF(2, xT)
  const o35 = 1 - poissonCDF(3, xT)
  const btts = 1 - (Math.exp(-xH) + Math.exp(-xA) - Math.exp(-xT))

  // Goal probs
  const goalProbs = [0, 1, 2, 3, 4, 5].map(g => {
    let f = 1; for (let j = 2; j <= g; j++) f *= j
    return { goals: g, prob: Math.pow(xT, g) * Math.exp(-xT) / f }
  })

  const mx = Math.max(pH, pD, pA)
  const confScore = mx + (h2hData ? 0.02 : 0) + (Math.abs(hF - aF) > 0.2 ? 0.03 : 0)

  return {
    home: pH, draw: pD, away: pA,
    o15, o25, o35, u25: 1 - o25, btts, nbtts: 1 - btts,
    xgH: xH, xgA: xA, xgT: xT, goalProbs,
    hForm: hF, aForm: aF, h2h: h2hData,
    conf: confScore > 0.58 ? 'high' : confScore > 0.44 ? 'med' : 'low',
    confScore,
    best: pH >= pD && pH >= pA ? '1' : pA >= pH && pA >= pD ? '2' : 'X',
    factors: { elo: eloH.toFixed(3), form: formAdj.toFixed(3), h2h: h2hAdj.toFixed(3), strength: strAdj.toFixed(3) }
  }
}

export const pct = (v) => Math.round(v * 100) + '%'

// Backtesting simulator
export function runBacktest(matches, model = 'v2') {
  const results = []
  let correct = 0, total = 0
  let brierSum = 0
  for (const m of matches) {
    if (!m.result) continue
    const p = predict(m.home, m.away)
    const predicted = p.best
    const isCorrect = predicted === m.result
    if (isCorrect) correct++
    total++
    const actual = m.result === '1' ? 1 : 0
    brierSum += Math.pow(p.home - actual, 2)
    results.push({ match: m, prediction: p, correct: isCorrect })
  }
  return { total, correct, accuracy: total ? correct / total : 0, brier: total ? brierSum / total : 0, results }
}
