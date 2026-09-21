// Mock data — used when Supabase is not connected
export const LEAGUES = {
  39:{id:39,name:'Premier League',country:'ინგლისი',color:'#3d195b',priority:100},
  140:{id:140,name:'La Liga',country:'ესპანეთი',color:'#ee8707',priority:95},
  135:{id:135,name:'Serie A',country:'იტალია',color:'#008fd7',priority:90},
  78:{id:78,name:'Bundesliga',country:'გერმანია',color:'#d20515',priority:85},
  61:{id:61,name:'Ligue 1',country:'საფრანგეთი',color:'#091c3e',priority:80},
  2:{id:2,name:'Champions League',country:'UEFA',color:'#003399',priority:100}
}

export const TEAMS = {
  ars:{id:'ars',name:'Arsenal',short:'ARS',color:'#EF0107',elo:1920,gf:2.2,ga:.7,form:'WWDWW',
    players:[{n:'Saka',p:'RW',r:89},{n:'Saliba',p:'CB',r:87},{n:'Rice',p:'MF',r:88},{n:'Havertz',p:'FW',r:83},{n:'Raya',p:'GK',r:85}]},
  mci:{id:'mci',name:'Man City',short:'MCI',color:'#6CABDD',elo:1950,gf:2.4,ga:.8,form:'WDWWL',
    players:[{n:'Haaland',p:'ST',r:93},{n:'De Bruyne',p:'MF',r:91},{n:'Rodri',p:'MF',r:92},{n:'Foden',p:'MF',r:87},{n:'Ederson',p:'GK',r:86}]},
  liv:{id:'liv',name:'Liverpool',short:'LIV',color:'#C8102E',elo:1910,gf:2.3,ga:.8,form:'WWWDW',
    players:[{n:'Salah',p:'RW',r:90},{n:'Van Dijk',p:'CB',r:88},{n:'Mac Allister',p:'MF',r:85},{n:'Szoboszlai',p:'MF',r:83},{n:'Alisson',p:'GK',r:88}]},
  rma:{id:'rma',name:'Real Madrid',short:'RMA',color:'#002654',elo:1970,gf:2.3,ga:.6,form:'WWWWD',
    players:[{n:'Vinícius Jr',p:'LW',r:92},{n:'Bellingham',p:'MF',r:90},{n:'Mbappé',p:'ST',r:93},{n:'Rüdiger',p:'CB',r:86},{n:'Courtois',p:'GK',r:89}]},
  bar:{id:'bar',name:'Barcelona',short:'BAR',color:'#A50044',elo:1940,gf:2.5,ga:.8,form:'WDWWW',
    players:[{n:'Yamal',p:'RW',r:86},{n:'Raphinha',p:'LW',r:86},{n:'Lewandowski',p:'ST',r:88},{n:'Pedri',p:'MF',r:87},{n:'Ter Stegen',p:'GK',r:87}]},
  bay:{id:'bay',name:'Bayern München',short:'BAY',color:'#DC052D',elo:1940,gf:2.5,ga:.8,form:'WWWDW',
    players:[{n:'Kane',p:'ST',r:91},{n:'Musiala',p:'MF',r:88},{n:'Sané',p:'RW',r:86},{n:'Kim',p:'CB',r:85},{n:'Neuer',p:'GK',r:85}]},
  int:{id:'int',name:'Inter Milan',short:'INT',color:'#002F6C',elo:1920,gf:2.1,ga:.6,form:'WWWDW',
    players:[{n:'Lautaro',p:'ST',r:89},{n:'Barella',p:'MF',r:88},{n:'Çalhanoğlu',p:'MF',r:86},{n:'Bastoni',p:'CB',r:86},{n:'Sommer',p:'GK',r:84}]},
  lev:{id:'lev',name:'Bayer Leverkusen',short:'LEV',color:'#E32221',elo:1900,gf:2.2,ga:.7,form:'WWWWD',
    players:[{n:'Wirtz',p:'MF',r:88},{n:'Schick',p:'ST',r:82},{n:'Grimaldo',p:'LB',r:85},{n:'Tah',p:'CB',r:84},{n:'Hradecký',p:'GK',r:82}]},
  nap:{id:'nap',name:'Napoli',short:'NAP',color:'#12A0D7',elo:1880,gf:2.0,ga:.8,form:'WDWWL',
    players:[{n:'Osimhen',p:'ST',r:88},{n:'Kvaratskhelia',p:'LW',r:86},{n:'Zieliński',p:'MF',r:83},{n:'Kim',p:'CB',r:84},{n:'Meret',p:'GK',r:82}]},
  dor:{id:'dor',name:'Bor. Dortmund',short:'DOR',color:'#FDE100',elo:1860,gf:2.0,ga:1.0,form:'WDWLW',
    players:[{n:'Adeyemi',p:'FW',r:82},{n:'Brandt',p:'MF',r:83},{n:'Sabitzer',p:'MF',r:82},{n:'Hummels',p:'CB',r:83},{n:'Kobel',p:'GK',r:83}]}
}

export const MATCHES = [
  {id:1,home:'ars',away:'mci',league:39,date:'დღეს 18:30',round:'GW 8',status:'NS'},
  {id:2,home:'rma',away:'bar',league:140,date:'დღეს 21:00',round:'J 10',status:'NS'},
  {id:3,home:'int',away:'nap',league:135,date:'ხვალ 20:45',round:'GW 9',status:'NS'},
  {id:4,home:'bay',away:'dor',league:78,date:'ხვალ 18:30',round:'ST 8',status:'NS'},
  {id:5,home:'liv',away:'rma',league:2,date:'24 სექტ 21:00',round:'MD 2',status:'NS'},
  {id:6,home:'bar',away:'bay',league:2,date:'24 სექტ 21:00',round:'MD 2',status:'NS'},
  {id:7,home:'mci',away:'int',league:2,date:'25 სექტ 21:00',round:'MD 2',status:'NS'},
  {id:8,home:'lev',away:'ars',league:2,date:'25 სექტ 21:00',round:'MD 2',status:'NS'}
]

export const H2H = {
  'ars-mci':{played:10,homeWins:3,draws:2,awayWins:5,homeGoals:12,awayGoals:18,last:['L','D','W','L','L']},
  'rma-bar':{played:10,homeWins:5,draws:2,awayWins:3,homeGoals:16,awayGoals:13,last:['W','W','D','L','W']},
  'int-nap':{played:10,homeWins:4,draws:3,awayWins:3,homeGoals:14,awayGoals:11,last:['W','D','W','D','L']},
  'bay-dor':{played:10,homeWins:6,draws:2,awayWins:2,homeGoals:22,awayGoals:12,last:['W','W','D','W','L']}
}

export const VALUE_BETS = [
  {home:'ars',away:'mci',league:39,market:'1X2: Arsenal',pick:'1',edge:.08,odds:2.45,modelProb:.49,impliedProb:.41,conf:'high'},
  {home:'int',away:'nap',league:135,market:'Over 2.5',pick:'O2.5',edge:.06,odds:1.95,modelProb:.58,impliedProb:.51,conf:'med'},
  {home:'rma',away:'bar',league:140,market:'BTTS: Yes',pick:'BTTS',edge:.05,odds:1.72,modelProb:.63,impliedProb:.58,conf:'med'},
  {home:'bay',away:'dor',league:78,market:'1X2: Bayern',pick:'1',edge:.07,odds:1.55,modelProb:.72,impliedProb:.65,conf:'high'}
]

export const BACKTEST = [
  {period:'W30',preds:42,correct:24,acc:.571,brier:.228},
  {period:'W31',preds:38,correct:23,acc:.605,brier:.215},
  {period:'W32',preds:45,correct:28,acc:.622,brier:.208},
  {period:'W33',preds:40,correct:26,acc:.650,brier:.195},
  {period:'W34',preds:43,correct:29,acc:.674,brier:.189},
  {period:'W35',preds:41,correct:27,acc:.659,brier:.192}
]

export function getTeam(key) { return TEAMS[key] || null }
export function getLeague(id) { return LEAGUES[id] || null }
export function getH2H(h, a) { return H2H[h+'-'+a] || H2H[a+'-'+h] || null }
