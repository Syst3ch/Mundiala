import React, { useState, useEffect } from 'react';

const TEAM_TRANSLATIONS = {
  "Curaçao": "קוראסאו", "Curacao": "קוראסאו", "Cape Verde": "כף ורדה", "Cabo Verde": "כף ורדה",
  "Suriname": "סורינאם", "Haiti": "האיטי", "Trinidad and Tobago": "טרינידד וטובגו", "Guyana": "גיאנה", "Guatemala": "גואטמלה",
  "France": "צרפת", "England": "אנגליה", "Spain": "ספרד", "Germany": "גרמניה", "Portugal": "פורטוגל",
  "Netherlands": "הולנד", "Italy": "איטליה", "Belgium": "בלגיה", "Croatia": "קרואטיה", "Denmark": "דנמרק",
  "Switzerland": "שוויץ", "Austria": "אוסטריה", "Ukraine": "אוקראינה", "Turkey": "טורקיה", "Poland": "פולין",
  "Hungary": "הונגריה", "Sweden": "שבדיה", "Norway": "נורבגיה", "Czech Republic": "צ'כיה", "Scotland": "סקוטלנד",
  "Wales": "ויילס", "Greece": "יוון", "Serbia": "סרביה", "Romania": "רומניה", "Argentina": "ארגנטינה",
  "Brazil": "ברזיל", "Uruguay": "אורוגוואי", "Colombia": "קולומביה", "Ecuador": "אקוודור", "Peru": "פרו",
  "Chile": "צ'ילה", "Paraguay": "פרגוואי", "Venezuela": "ונצואלה", "Bolivia": "בוליביה", "USA": "ארה\"ב",
  "United States": "ארה\"ב", "Mexico": "מקסיקו", "Canada": "קנדה", "Costa Rica": "קוסטה ריקה", "Panama": "פנמה",
  "Jamaica": "ג'מייקה", "Honduras": "הונדורס", "El Salvador": "אל סלבדור", "Morocco": "מרוקו", "Senegal": "סנגל",
  "Tunisia": "תוניסיה", "Algeria": "אלג'יריה", "Egypt": "מצרים", "Nigeria": "ניגריה", "Cameroon": "קמרון",
  "Ghana": "גאנה", "Ivory Coast": "חוף השנהב", "Mali": "מאלי", "Burkina Faso": "בורקינה פאסו", "South Africa": "דרום אפריקה",
  "DR Congo": "קונגו", "Congo": "קונגו", "Zambia": "זמביה", "Japan": "יפן", "South Korea": "דרום קוריאה",
  "Iran": "איראן", "Saudi Arabia": "סעודיה", "Australia": "אוסטרליה", "Qatar": "קטאר", "Iraq": "עיראק",
  "UAE": "איחוד האמירויות", "Uzbekistan": "אוזבקיסטן", "China": "סין", "Oman": "עומאן", "Jordan": "ירדן", "New Zealand": "ניו זילנד"
};

const translateTeam = (name) => TEAM_TRANSLATIONS[name] || name;

// מיפוי שמות קבוצות חזרה לאנגלית בשביל ה-API החיצוני
const reverseTranslateTeam = (hebrewName) => {
  return Object.keys(TEAM_TRANSLATIONS).find(key => TEAM_TRANSLATIONS[key] === hebrewName) || hebrewName;
};

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // סטייטים חדשים להיסטוריית אמת דינמית
  const [liveHistory, setLiveHistory] = useState({ home: [], away: [], loading: false });

  // 1. משיכת היחסי הימורים והמשחקים הקרובים
  const fetchRealOdds = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const now = Date.now();
      const FOUR_HOURS = 4 * 60 * 60 * 1000;

      if (!forceRefresh) {
        const cachedData = localStorage.getItem('world_cup_matches_cache');
        const cachedTime = localStorage.getItem('world_cup_cache_time');

        if (cachedData && cachedTime && (now - parseInt(cachedTime) < FOUR_HOURS)) {
          const parsedMatches = JSON.parse(cachedData);
          if (parsedMatches.length > 0) {
            setMatches(parsedMatches);
            setSelectedMatch(parsedMatches[0]);
            setLoading(false);
            return;
          }
        }
      }

      const apiKey = import.meta.env.VITE_ODDS_API_KEY;
      if (!apiKey) {
        console.error("Missing Odds API Key");
        setLoading(false);
        return;
      }

      const response = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`);
      const data = await response.json();

      if (data && Array.isArray(data)) {
        const activeGames = data.filter(game => game.bookmakers?.[0]);

        const formattedMatches = activeGames.map((game, index) => {
          const bookmaker = game.bookmakers[0];
          const market = bookmaker.markets.find(m => m.key === 'h2h');
          
          const homeOdds = market?.outcomes.find(o => o.name === game.home_team)?.price || 2.20;
          const awayOdds = market?.outcomes.find(o => o.name === game.away_team)?.price || 2.60;
          const drawOdds = market?.outcomes.find(o => o.name === 'Draw')?.price || 3.10;

          const dateObj = new Date(game.commence_time);
          const localDate = dateObj.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
          const localTime = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });

          // יצירת קוד יציב ל-xG בסיסי ראשוני בלבד
          const code = game.home_team.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

          return {
            id: game.id || index,
            rawTime: dateObj.getTime(),
            homeTeamRaw: game.home_team,
            awayTeamRaw: game.away_team,
            homeTeam: translateTeam(game.home_team),
            awayTeam: translateTeam(game.away_team),
            date: localDate,
            time: localTime,
            odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
            homeXG: parseFloat((1.1 + ((code % 10) / 20)).toFixed(2)),
            homeExpectedConcedeXG: parseFloat((0.8 + ((code % 5) / 20)).toFixed(2)),
            awayXG: parseFloat((1.0 + ((code % 8) / 20)).toFixed(2)),
            awayExpectedConcedeXG: parseFloat((0.9 + ((code % 6) / 20)).toFixed(2)),
            homeMotivation: 3, 
            awayMotivation: 3,
            scenario: "normal", 
            homeInjuries: [],
            awayInjuries: []
          };
        });

        formattedMatches.sort((a, b) => a.rawTime - b.rawTime);
        localStorage.setItem('world_cup_matches_cache', JSON.stringify(formattedMatches));
        localStorage.setItem('world_cup_cache_time', now.toString());

        setMatches(formattedMatches);
        if (formattedMatches.length > 0) setSelectedMatch(formattedMatches[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching odds:", error);
      setLoading(false);
    }
  };

  // 2. משיכת תוצאות אמת היסטוריות מ-API חיצוני לפי שם הנבחרת
  const fetchRealTeamHistory = async (teamRawName, side) => {
    const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
    if (!rapidApiKey) return [];

    try {
      // שלב א': מציאת ה-ID של הנבחרת ב-API
      const searchRes = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?name=${encodeURIComponent(teamRawName)}`, {
        method: 'GET',
        headers: { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' }
      });
      const searchData = await searchRes.json();
      const teamId = searchData?.response?.[0]?.team?.id;

      if (!teamId) return [];

      // שלב ב': הבאת 5 משחקים אחרונים שהסתיימו
      const fixturesRes = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?team=${teamId}&last=5&status=FT`, {
        method: 'GET',
        headers: { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' }
      });
      const fixturesData = await fixturesRes.json();

      if (fixturesData?.response) {
        return fixturesData.response.map(f => {
          const isHome = f.teams.home.id === teamId;
          const currentTeamGoals = isHome ? f.goals.home : f.goals.away;
          const oppTeamGoals = isHome ? f.goals.away : f.goals.home;
          const opponentName = isHome ? f.teams.away.name : f.teams.home.name;

          let type = 'D';
          if (currentTeamGoals > oppTeamGoals) type = 'W';
          if (currentTeamGoals < oppTeamGoals) type = 'L';

          return {
            opponent: translateTeam(opponentName),
            score: isHome ? `${f.goals.home} - ${f.goals.away}` : `${f.goals.away} - ${f.goals.home}`,
            type
          };
        });
      }
      return [];
    } catch (err) {
      console.error("Error fetching live history for " + teamRawName, err);
      return [];
    }
  };

  // מפעיל משיכת היסטוריה אמיתית בכל פעם שנבחר משחק אחר בלוח
  useEffect(() => {
    if (!selectedMatch) return;

    const loadRealHistories = async () => {
      setLiveHistory(prev => ({ ...prev, loading: true }));
      
      const homeHistory = await fetchRealTeamHistory(selectedMatch.homeTeamRaw, 'home');
      const awayHistory = await fetchRealTeamHistory(selectedMatch.awayTeamRaw, 'away');

      setLiveHistory({
        home: homeHistory,
        away: awayHistory,
        loading: false
      });
    };

    loadRealHistories();
  }, [selectedMatch]);

  useEffect(() => {
    fetchRealOdds(false);
  }, [refreshTrigger]);

  // 3. אלגוריתם חיזוי מסונכרן ללא סתירות
  const calculatePrediction = (match) => {
    if (!match) return null;

    let baseHomeXG = match.homeXG || 1.2;
    let baseAwayXG = match.awayXG || 1.1;

    const motivationDiff = (match.homeMotivation || 3) - (match.awayMotivation || 3);
    baseHomeXG += motivationDiff * 0.12; 
    baseAwayXG -= motivationDiff * 0.12;

    if (match.scenario === "rain") {
      baseHomeXG *= 0.85; baseAwayXG *= 0.85;
    } else if (match.scenario === "red_card") {
      baseHomeXG *= 1.30; baseAwayXG *= 0.65;
    }

    if (match.homeInjuries?.length > 0) baseHomeXG *= (1 - (match.homeInjuries.length * 0.07));
    if (match.awayInjuries?.length > 0) baseAwayXG *= (1 - (match.awayInjuries.length * 0.07));

    let homeGoals = Math.round(baseHomeXG);
    let awayGoals = Math.round(baseAwayXG);

    homeGoals = Math.min(Math.max(homeGoals, 0), 4);
    awayGoals = Math.min(Math.max(awayGoals, 0), 4);

    let recommendation = "תיקו קשוח (X)";
    let homePercent = 33; let awayPercent = 33; let drawPercent = 34;

    if (homeGoals > awayGoals) {
      recommendation = `ניצחון ל${match.homeTeam} (1)`;
      homePercent = Math.round(52 + (homeGoals - awayGoals) * 10);
      awayPercent = Math.round((100 - homePercent) * 0.4);
      drawPercent = 100 - homePercent - awayPercent;
    } else if (awayGoals > homeGoals) {
      recommendation = `ניצחון ל${match.awayTeam} (2)`;
      awayPercent = Math.round(52 + (awayGoals - homeGoals) * 10);
      homePercent = Math.round((100 - awayPercent) * 0.4);
      drawPercent = 100 - homePercent - awayPercent;
    } else {
      drawPercent = 45; homePercent = 28; awayPercent = 27;
    }

    return { 
      homePercent, drawPercent, awayPercent, 
      predictedScore: `${homeGoals} - ${awayGoals}`, recommendation,
      finalHomeXG: baseHomeXG.toFixed(2), finalAwayXG: baseAwayXG.toFixed(2)
    };
  };

  useEffect(() => {
    if (matches.length > 0) {
      const newPredictions = {};
      matches.forEach(m => { newPredictions[m.id] = calculatePrediction(m); });
      setPredictions(newPredictions);
    }
  }, [matches]);

  const updateMatchData = (field, value, subField = null) => {
    const updated = matches.map(m => {
      if (m.id === selectedMatch.id) {
        if (subField) return { ...m, [field]: { ...m[field], [subField]: parseFloat(value) || value } };
        return { ...m, [field]: typeof value === 'number' ? value : value };
      }
      return m;
    });
    setMatches(updated);
    setSelectedMatch(updated.find(m => m.id === selectedMatch.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-emerald-400">טוען יחסי הימורים עדכניים...</p>
        </div>
      </div>
    );
  }

  const currentPrediction = predictions[selectedMatch?.id] || { homePercent: 33, drawPercent: 34, awayPercent: 33, predictedScore: "0-0", recommendation: "מחשב..." };

  const groupedMatches = matches.reduce((groups, match) => {
    const date = match.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(match);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMatches).sort((a, b) => groupedMatches[a][0].rawTime - groupedMatches[b][0].rawTime);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            מונדיאל Predictor Pro <span className="text-xs text-slate-500 font-normal">v4.0 (Live API History)</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">נתוני אמת היסטוריים הנמשכים בלייב ממאגרי הכדורגל העולמיים</p>
        </div>
        <button onClick={() => { localStorage.clear(); fetchRealOdds(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">
          🔄 רענן נתונים ויחסים
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* טור משחקים */}
        <div className="lg:col-span-1 space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {sortedDates.map(date => (
            <div key={date} className="space-y-2">
              <div className="text-xs font-bold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg inline-block">📅 {date}</div>
              <div className="space-y-2 pr-2 border-r-2 border-slate-800">
                {groupedMatches[date]?.map(match => (
                  <button key={match.id} onClick={() => setSelectedMatch(match)} className={`w-full text-right p-3.5 rounded-xl border transition-all ${selectedMatch?.id === match.id ? 'bg-slate-800 border-emerald-500 shadow-lg' : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'}`}>
                    <div className="flex justify-between items-center text-[11px] mb-1.5">
                      <span className="text-emerald-400 font-mono">⏰ {match.time}</span>
                      <span className="font-bold text-slate-300">{predictions[match.id]?.predictedScore || ''}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-sm">
                      <span>{match.homeTeam}</span> <span className="text-slate-600 text-[10px]">VS</span> <span>{match.awayTeam}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* פנל אנליזה מרכזי */}
        {selectedMatch && (
          <div className="lg:col-span-2 space-y-6">
            
            {/* כרטיס תוצאה משוערת */}
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
                <span className="text-slate-400">המלצת סימולטור קבועה ומיושרת:</span>
                <span className="font-bold text-amber-400">{currentPrediction.recommendation}</span>
              </div>
            </div>

            {/* פנל היסטוריה אמיתית - נמשך חי מה-API */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/60 pb-2">📋 תוצאות אמת אחרונות ממאגר הכדורגל העולמי (Real API History)</h3>
              
              {liveHistory.loading ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">⚡ מושך תוצאות אמת מ-API-Football...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* משחקי בית אמיתיים */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="font-bold text-emerald-400 mb-2">⚽ 5 משחקים אחרונים במציאות - {selectedMatch.homeTeam}:</div>
                    <div className="space-y-1.5">
                      {liveHistory.home.length > 0 ? liveHistory.home.map((res, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-slate-800/60 pb-1 last:border-0">
                          <span className="text-slate-400">נגד {res.opponent}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-200">{res.score}</span>
                            <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${res.type === 'W' ? 'bg-emerald-950 text-emerald-400' : res.type === 'L' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>{res.type}</span>
                          </div>
                        </div>
                      )) : <p className="text-slate-500 italic text-[11px]">לא הוגדר VITE_RAPIDAPI_KEY או שהנבחרת לא נמצאה</p>}
                    </div>
                  </div>

                  {/* משחקי חוץ אמיתיים */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="font-bold text-cyan-400 mb-2">⚽ 5 משחקים אחרונים במציאות - {selectedMatch.awayTeam}:</div>
                    <div className="space-y-1.5">
                      {liveHistory.away.length > 0 ? liveHistory.away.map((res, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-slate-800/60 pb-1 last:border-0">
                          <span className="text-slate-400">נגד {res.opponent}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-200">{res.score}</span>
                            <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${res.type === 'W' ? 'bg-emerald-950 text-emerald-400' : res.type === 'L' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>{res.type}</span>
                          </div>
                        </div>
                      )) : <p className="text-slate-500 italic text-[11px]">לא הוגדר VITE_RAPIDAPI_KEY או שהנבחרת לא נמצאה</p>}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* בקרי שליטה וסימולציה */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase">מדד מוטיבציה וחשיבות נקודות (1-5)</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{selectedMatch.homeTeam}:</span><span className="font-bold text-emerald-400">{selectedMatch.homeMotivation}</span></div>
                  <input type="range" min="1" max="5" value={selectedMatch.homeMotivation} onChange={(e) => updateMatchData('homeMotivation', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{selectedMatch.awayTeam}:</span><span className="font-bold text-cyan-400">{selectedMatch.awayMotivation}</span></div>
                  <input type="range" min="1" max="5" value={selectedMatch.awayMotivation} onChange={(e) => updateMatchData('awayMotivation', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
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
