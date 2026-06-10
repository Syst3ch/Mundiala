import React, { useEffect, useMemo, useState } from 'react';

// ⚠️ שים לב: לא להכניס מפתחות API ישירות לקוד.
// שים אותם בקובץ .env.local:
// VITE_SOFASCORE_KEY=your_rapidapi_key
// VITE_RAPIDAPI_KEY=your_rapidapi_key   // אופציונלי לתאימות אחורה
//
// הקובץ מחשב Fair Odds פנימיים מתוך הסתברויות המודל.
// אין כאן חיבור לשירותי הימורים או המלצה כספית.

const WORLD_CUP_48_TEAMS = [
  { name: 'Canada', he: 'קנדה', confederation: 'CONCACAF' },
  { name: 'Mexico', he: 'מקסיקו', confederation: 'CONCACAF' },
  { name: 'United States', aliases: ['USA'], he: 'ארה"ב', confederation: 'CONCACAF' },
  { name: 'Japan', he: 'יפן', confederation: 'AFC' },
  { name: 'New Zealand', he: 'ניו זילנד', confederation: 'OFC' },
  { name: 'Iran', he: 'איראן', confederation: 'AFC' },
  { name: 'Argentina', he: 'ארגנטינה', confederation: 'CONMEBOL' },
  { name: 'Uzbekistan', he: 'אוזבקיסטן', confederation: 'AFC' },
  { name: 'South Korea', aliases: ['Korea Republic'], he: 'דרום קוריאה', confederation: 'AFC' },
  { name: 'Jordan', he: 'ירדן', confederation: 'AFC' },
  { name: 'Australia', he: 'אוסטרליה', confederation: 'AFC' },
  { name: 'Brazil', he: 'ברזיל', confederation: 'CONMEBOL' },
  { name: 'Ecuador', he: 'אקוודור', confederation: 'CONMEBOL' },
  { name: 'Uruguay', he: 'אורוגוואי', confederation: 'CONMEBOL' },
  { name: 'Colombia', he: 'קולומביה', confederation: 'CONMEBOL' },
  { name: 'Paraguay', he: 'פרגוואי', confederation: 'CONMEBOL' },
  { name: 'Morocco', he: 'מרוקו', confederation: 'CAF' },
  { name: 'Tunisia', he: 'תוניסיה', confederation: 'CAF' },
  { name: 'Egypt', he: 'מצרים', confederation: 'CAF' },
  { name: 'Algeria', he: 'אלג׳יריה', confederation: 'CAF' },
  { name: 'Ghana', he: 'גאנה', confederation: 'CAF' },
  { name: 'Cape Verde', aliases: ['Cabo Verde'], he: 'כף ורדה', confederation: 'CAF' },
  { name: 'Senegal', he: 'סנגל', confederation: 'CAF' },
  { name: 'Ivory Coast', aliases: ['Côte d’Ivoire', 'Cote dIvoire'], he: 'חוף השנהב', confederation: 'CAF' },
  { name: 'South Africa', he: 'דרום אפריקה', confederation: 'CAF' },
  { name: 'Qatar', he: 'קטאר', confederation: 'AFC' },
  { name: 'Saudi Arabia', he: 'סעודיה', confederation: 'AFC' },
  { name: 'Panama', he: 'פנמה', confederation: 'CONCACAF' },
  { name: 'Haiti', he: 'האיטי', confederation: 'CONCACAF' },
  { name: 'Curacao', aliases: ['Curaçao'], he: 'קוראסאו', confederation: 'CONCACAF' },
  { name: 'England', he: 'אנגליה', confederation: 'UEFA' },
  { name: 'France', he: 'צרפת', confederation: 'UEFA' },
  { name: 'Germany', he: 'גרמניה', confederation: 'UEFA' },
  { name: 'Spain', he: 'ספרד', confederation: 'UEFA' },
  { name: 'Portugal', he: 'פורטוגל', confederation: 'UEFA' },
  { name: 'Netherlands', he: 'הולנד', confederation: 'UEFA' },
  { name: 'Croatia', he: 'קרואטיה', confederation: 'UEFA' },
  { name: 'Switzerland', he: 'שוויץ', confederation: 'UEFA' },
  { name: 'Austria', he: 'אוסטריה', confederation: 'UEFA' },
  { name: 'Belgium', he: 'בלגיה', confederation: 'UEFA' },
  { name: 'Norway', he: 'נורבגיה', confederation: 'UEFA' },
  { name: 'Scotland', he: 'סקוטלנד', confederation: 'UEFA' },
  { name: 'Sweden', he: 'שבדיה', confederation: 'UEFA' },
  { name: 'Czechia', aliases: ['Czech Republic'], he: 'צ׳כיה', confederation: 'UEFA' },
  { name: 'Türkiye', aliases: ['Turkey'], he: 'טורקיה', confederation: 'UEFA' },
  { name: 'Denmark', he: 'דנמרק', confederation: 'UEFA' },
  { name: 'DR Congo', aliases: ['Congo DR', 'Congo'], he: 'קונגו', confederation: 'CAF' },
  { name: 'Iraq', he: 'עיראק', confederation: 'AFC' }
];

const TEAM_TRANSLATIONS = WORLD_CUP_48_TEAMS.reduce((acc, team) => {
  acc[team.name] = team.he;
  (team.aliases || []).forEach(alias => { acc[alias] = team.he; });
  return acc;
}, {});

const translateTeam = (name) => TEAM_TRANSLATIONS[name] || name;

const getTeamByApiName = (name) => {
  const normalized = String(name || '').toLowerCase();
  return WORLD_CUP_48_TEAMS.find(team =>
    team.name.toLowerCase() === normalized ||
    team.he === name ||
    (team.aliases || []).some(alias => alias.toLowerCase() === normalized)
  );
};

const getStableCode = (text) => String(text || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

const buildSyntheticMatch = (home, away, index) => {
  const code = getStableCode(home.name + away.name);
  const dateObj = new Date(Date.now() + index * 24 * 60 * 60 * 1000);

  return {
    id: `team-${home.name}-${away.name}`,
    rawTime: dateObj.getTime(),
    homeTeamRaw: home.name,
    awayTeamRaw: away.name,
    homeTeam: home.he,
    awayTeam: away.he,
    date: dateObj.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    time: 'טרם נקבע',
    homeXG: Number((1.05 + ((code % 12) / 20)).toFixed(2)),
    awayXG: Number((1.00 + ((code % 10) / 22)).toFixed(2)),
    homeMotivation: 3,
    awayMotivation: 3,
    scenario: 'normal',
    homeInjuries: [],
    awayInjuries: [],
    source: '48_TEAMS_FALLBACK'
  };
};

const buildFallbackMatchesFrom48Teams = () => {
  const matches = [];
  for (let i = 0; i < WORLD_CUP_48_TEAMS.length; i += 2) {
    matches.push(buildSyntheticMatch(WORLD_CUP_48_TEAMS[i], WORLD_CUP_48_TEAMS[i + 1], i / 2));
  }
  return matches;
};

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [liveHistory, setLiveHistory] = useState({ home: [], away: [], loading: false });
  const [apiStatus, setApiStatus] = useState('');

  const fetchMatches = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const now = Date.now();
      const FOUR_HOURS = 4 * 60 * 60 * 1000;

      if (!forceRefresh) {
        const cachedData = localStorage.getItem('world_cup_matches_cache_v48');
        const cachedTime = localStorage.getItem('world_cup_cache_time_v48');
        if (cachedData && cachedTime && now - Number(cachedTime) < FOUR_HOURS) {
          const parsedMatches = JSON.parse(cachedData);
          setMatches(parsedMatches);
          setSelectedMatch(parsedMatches[0] || null);
          setLoading(false);
          return;
        }
      }

      // מקור חוקי ונייטרלי: משחקים ונתוני נבחרות בלבד, בלי יחסי הימורים.
      // אם אין משחקים זמינים מה-API, האפליקציה מציגה את כל 48 הנבחרות כזוגות זמניים.
      const fallbackMatches = buildFallbackMatchesFrom48Teams();
      localStorage.setItem('world_cup_matches_cache_v48', JSON.stringify(fallbackMatches));
      localStorage.setItem('world_cup_cache_time_v48', String(now));
      setMatches(fallbackMatches);
      setSelectedMatch(fallbackMatches[0] || null);
      setApiStatus('מציג 48 נבחרות. משחקים רשמיים ייכנסו ברגע שתחבר API לוח משחקים תקין.');
    } catch (error) {
      console.error('Error loading matches:', error);
      const fallbackMatches = buildFallbackMatchesFrom48Teams();
      setMatches(fallbackMatches);
      setSelectedMatch(fallbackMatches[0] || null);
      setApiStatus('נטען מצב גיבוי של 48 הנבחרות.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTeamHistory = async (teamRawName) => {
    const rapidApiKey = import.meta.env.VITE_SOFASCORE_KEY || import.meta.env.VITE_RAPIDAPI_KEY;
    if (!rapidApiKey) return [];

    try {
      const searchName = getTeamByApiName(teamRawName)?.name || teamRawName;
      const headers = {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      };

      const searchRes = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?name=${encodeURIComponent(searchName)}`, { headers });
      const searchData = await searchRes.json();
      const teamId = searchData?.response?.[0]?.team?.id;
      if (!teamId) return [];

      const fixturesRes = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?team=${teamId}&last=5&status=FT`, { headers });
      const fixturesData = await fixturesRes.json();

      return (fixturesData?.response || []).map(f => {
        const isHome = f.teams.home.id === teamId;
        const currentGoals = isHome ? f.goals.home : f.goals.away;
        const opponentGoals = isHome ? f.goals.away : f.goals.home;
        const opponentName = isHome ? f.teams.away.name : f.teams.home.name;

        let type = 'D';
        if (currentGoals > opponentGoals) type = 'W';
        if (currentGoals < opponentGoals) type = 'L';

        return {
          opponent: translateTeam(opponentName),
          score: `${currentGoals} - ${opponentGoals}`,
          type
        };
      });
    } catch (err) {
      console.error(`Error fetching history for ${teamRawName}:`, err);
      return [];
    }
  };

  useEffect(() => {
    fetchMatches(false);
  }, []);

  useEffect(() => {
    if (!selectedMatch) return;

    const loadRealHistories = async () => {
      setLiveHistory(prev => ({ ...prev, loading: true }));
      const [homeHistory, awayHistory] = await Promise.all([
        fetchRealTeamHistory(selectedMatch.homeTeamRaw),
        fetchRealTeamHistory(selectedMatch.awayTeamRaw)
      ]);
      setLiveHistory({ home: homeHistory, away: awayHistory, loading: false });
    };

    loadRealHistories();
  }, [selectedMatch]);

  const calculatePrediction = (match) => {
    if (!match) return null;

    let baseHomeXG = match.homeXG || 1.2;
    let baseAwayXG = match.awayXG || 1.1;

    const motivationDiff = (match.homeMotivation || 3) - (match.awayMotivation || 3);
    baseHomeXG += motivationDiff * 0.12;
    baseAwayXG -= motivationDiff * 0.12;

    if (match.scenario === 'rain') {
      baseHomeXG *= 0.85;
      baseAwayXG *= 0.85;
    } else if (match.scenario === 'red_card') {
      baseHomeXG *= 1.3;
      baseAwayXG *= 0.65;
    }

    if (match.homeInjuries?.length > 0) baseHomeXG *= 1 - match.homeInjuries.length * 0.07;
    if (match.awayInjuries?.length > 0) baseAwayXG *= 1 - match.awayInjuries.length * 0.07;

    let homeGoals = Math.min(Math.max(Math.round(baseHomeXG), 0), 4);
    let awayGoals = Math.min(Math.max(Math.round(baseAwayXG), 0), 4);

    let recommendation = 'תיקו קשוח (X)';
    let homePercent = 33;
    let awayPercent = 33;
    let drawPercent = 34;

    if (homeGoals > awayGoals) {
      recommendation = `יתרון מקצועי ל${match.homeTeam}`;
      homePercent = Math.round(52 + (homeGoals - awayGoals) * 10);
      awayPercent = Math.round((100 - homePercent) * 0.4);
      drawPercent = 100 - homePercent - awayPercent;
    } else if (awayGoals > homeGoals) {
      recommendation = `יתרון מקצועי ל${match.awayTeam}`;
      awayPercent = Math.round(52 + (awayGoals - homeGoals) * 10);
      homePercent = Math.round((100 - awayPercent) * 0.4);
      drawPercent = 100 - homePercent - awayPercent;
    } else {
      drawPercent = 45;
      homePercent = 28;
      awayPercent = 27;
    }

    const toFairOdds = (percent) => {
      const safePercent = Math.max(Number(percent) || 1, 1);
      return (100 / safePercent).toFixed(2);
    };

    const valuePick = [
      { key: '1', label: match.homeTeam, percent: homePercent, odds: Number(toFairOdds(homePercent)) },
      { key: 'X', label: 'תיקו', percent: drawPercent, odds: Number(toFairOdds(drawPercent)) },
      { key: '2', label: match.awayTeam, percent: awayPercent, odds: Number(toFairOdds(awayPercent)) }
    ].sort((a, b) => b.percent - a.percent)[0];

    return {
      homePercent,
      drawPercent,
      awayPercent,
      fairOdds: {
        home: toFairOdds(homePercent),
        draw: toFairOdds(drawPercent),
        away: toFairOdds(awayPercent)
      },
      valuePick,
      predictedScore: `${homeGoals} - ${awayGoals}`,
      recommendation,
      finalHomeXG: baseHomeXG.toFixed(2),
      finalAwayXG: baseAwayXG.toFixed(2)
    };
  };

  useEffect(() => {
    const newPredictions = {};
    matches.forEach(m => { newPredictions[m.id] = calculatePrediction(m); });
    setPredictions(newPredictions);
  }, [matches]);

  const updateMatchData = (field, value, subField = null) => {
    if (!selectedMatch) return;
    const updated = matches.map(m => {
      if (m.id !== selectedMatch.id) return m;
      if (subField) return { ...m, [field]: { ...m[field], [subField]: Number(value) || value } };
      return { ...m, [field]: typeof value === 'number' ? value : value };
    });
    setMatches(updated);
    setSelectedMatch(updated.find(m => m.id === selectedMatch.id));
  };

  const currentPrediction = predictions[selectedMatch?.id] || {
    homePercent: 33,
    drawPercent: 34,
    awayPercent: 33,
    predictedScore: '0 - 0',
    recommendation: 'מחשב...',
    fairOdds: { home: '3.03', draw: '2.94', away: '3.03' },
    valuePick: { key: 'X', label: 'תיקו', percent: 34, odds: 2.94 }
  };

  const groupedMatches = useMemo(() => {
    return matches.reduce((groups, match) => {
      const date = match.date || 'ללא תאריך';
      if (!groups[date]) groups[date] = [];
      groups[date].push(match);
      return groups;
    }, {});
  }, [matches]);

  const sortedDates = Object.keys(groupedMatches).sort((a, b) => groupedMatches[a][0].rawTime - groupedMatches[b][0].rawTime);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-emerald-400">טוען נתוני נבחרות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            מונדיאל Predictor Pro <span className="text-xs text-slate-500 font-normal">v5.0 - 48 Teams</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">48 נבחרות, תרגום עברי, היסטוריה חיה וניתוח מקצועי</p>
          {apiStatus && <p className="text-amber-400 text-xs mt-2">{apiStatus}</p>}
        </div>
        <button
          onClick={() => { localStorage.clear(); fetchMatches(true); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
        >
          🔄 רענן נתונים
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {sortedDates.map(date => (
            <div key={date} className="space-y-2">
              <div className="text-xs font-bold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg inline-block">📅 {date}</div>
              <div className="space-y-2 pr-2 border-r-2 border-slate-800">
                {groupedMatches[date]?.map(match => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(match)}
                    className={`w-full text-right p-3.5 rounded-xl border transition-all ${selectedMatch?.id === match.id ? 'bg-slate-800 border-emerald-500 shadow-lg' : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'}`}
                  >
                    <div className="flex justify-between items-center text-[11px] mb-1.5">
                      <span className="text-emerald-400 font-mono">⏰ {match.time}</span>
                      <span className="font-bold text-slate-300">{predictions[match.id]?.predictedScore || ''}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-sm">
                      <span>{match.homeTeam}</span>
                      <span className="text-slate-600 text-[10px]">VS</span>
                      <span>{match.awayTeam}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedMatch && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700">
              <div className="flex justify-around items-center my-4">
                <div className="text-center w-1/3">
                  <div className="text-lg font-black">{selectedMatch.homeTeam}</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{currentPrediction.homePercent}%</div>
                </div>
                <div className="text-center bg-slate-950/70 border border-slate-800 px-4 py-3 rounded-2xl w-1/3">
                  <div className="text-[10px] font-bold text-slate-400">תוצאה משוערת</div>
                  <div className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 my-1">{currentPrediction.predictedScore}</div>
                  <div className="text-[11px] text-slate-500">תיקו: {currentPrediction.drawPercent}%</div>
                </div>
                <div className="text-center w-1/3">
                  <div className="text-lg font-black">{selectedMatch.awayTeam}</div>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">{currentPrediction.awayPercent}%</div>
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-sm">
                <span className="text-slate-400">המלצת ניתוח:</span>
                <span className="font-bold text-amber-400">{currentPrediction.recommendation}</span>
              </div>

              <div className="mt-4 bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-400">יחסים מחושבים למילוי טור חברים</span>
                  <span className="text-[11px] font-bold text-amber-400">בחירה מובילה: {currentPrediction.valuePick?.key} - {currentPrediction.valuePick?.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                    <div className="text-slate-500 mb-1">1 - {selectedMatch.homeTeam}</div>
                    <div className="font-mono text-lg font-black text-emerald-400">{currentPrediction.fairOdds?.home}</div>
                    <div className="text-slate-500">{currentPrediction.homePercent}%</div>
                  </div>
                  <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                    <div className="text-slate-500 mb-1">X - תיקו</div>
                    <div className="font-mono text-lg font-black text-amber-400">{currentPrediction.fairOdds?.draw}</div>
                    <div className="text-slate-500">{currentPrediction.drawPercent}%</div>
                  </div>
                  <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                    <div className="text-slate-500 mb-1">2 - {selectedMatch.awayTeam}</div>
                    <div className="font-mono text-lg font-black text-cyan-400">{currentPrediction.fairOdds?.away}</div>
                    <div className="text-slate-500">{currentPrediction.awayPercent}%</div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3">היחס כאן הוא Fair Odds פנימי לפי 100 חלקי אחוז ההסתברות, בלי מרווח bookmaker.</p>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/60 pb-2">📋 5 משחקים אחרונים מה-API</h3>
              {liveHistory.loading ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">⚡ מושך תוצאות אמת...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {['home', 'away'].map(side => {
                    const teamName = side === 'home' ? selectedMatch.homeTeam : selectedMatch.awayTeam;
                    const history = liveHistory[side];
                    const color = side === 'home' ? 'text-emerald-400' : 'text-cyan-400';
                    return (
                      <div key={side} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <div className={`font-bold ${color} mb-2`}>⚽ {teamName}</div>
                        <div className="space-y-1.5">
                          {history.length > 0 ? history.map((res, i) => (
                            <div key={i} className="flex justify-between items-center border-b border-slate-800/60 pb-1 last:border-0">
                              <span className="text-slate-400">נגד {res.opponent}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-200">{res.score}</span>
                                <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${res.type === 'W' ? 'bg-emerald-950 text-emerald-400' : res.type === 'L' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>{res.type}</span>
                              </div>
                            </div>
                          )) : <p className="text-slate-500 italic text-[11px]">לא נמצאה היסטוריה או שלא הוגדר VITE_SOFASCORE_KEY</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase">מדד מוטיבציה וחשיבות נקודות (1-5)</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{selectedMatch.homeTeam}:</span><span className="font-bold text-emerald-400">{selectedMatch.homeMotivation}</span></div>
                  <input type="range" min="1" max="5" value={selectedMatch.homeMotivation} onChange={(e) => updateMatchData('homeMotivation', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{selectedMatch.awayTeam}:</span><span className="font-bold text-cyan-400">{selectedMatch.awayMotivation}</span></div>
                  <input type="range" min="1" max="5" value={selectedMatch.awayMotivation} onChange={(e) => updateMatchData('awayMotivation', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase">סימולטור תרחישי קצה</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => updateMatchData('scenario', 'normal')} className={`py-2 px-1 text-xs font-medium rounded-lg border ${selectedMatch.scenario === 'normal' ? 'bg-slate-900 border-slate-600 text-slate-100 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>☀️ רגיל</button>
                  <button onClick={() => updateMatchData('scenario', 'rain')} className={`py-2 px-1 text-xs font-medium rounded-lg border ${selectedMatch.scenario === 'rain' ? 'bg-cyan-950 text-cyan-400 border-cyan-800 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>🌧️ מבול</button>
                  <button onClick={() => updateMatchData('scenario', 'red_card')} className={`py-2 px-1 text-xs font-medium rounded-lg border ${selectedMatch.scenario === 'red_card' ? 'bg-rose-950 text-rose-400 border-rose-800 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>🟥 אדום לחוץ</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
