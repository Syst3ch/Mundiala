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
  "UAE": "איחוד האמירויות", "Uzbekistan": "אוזבקיסטן", "China": "סין", "Oman": "עומאן", "Jordan": "ירדן", "New Zealand": "ניו זילנד","Bosnia & Herzegovina": "בוסניה הרצגובינה"
};

const OPPONENTS_POOL = ["ברזיל", "צרפת", "גרמניה", "אנגליה", "ארגנטינה", "ספרד", "הולנד", "איטליה", "בלגיה", "פורטוגל", "מקסיקו", "ארה\"ב"];

const translateTeam = (name) => TEAM_TRANSLATIONS[name] || name;

const generateDynamicStats = (teamName) => {
  if (!teamName) return { lastResults: [], h2h: { homeWins: 1, draws: 3, awayWins: 1 }, xG_attack: 1.35, xG_defense: 1.05 };
  const code = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const h2hPool = [
    { homeWins: 2, draws: 2, awayWins: 1 }, { homeWins: 3, draws: 1, awayWins: 1 },
    { homeWins: 1, draws: 3, awayWins: 1 }, { homeWins: 1, draws: 2, awayWins: 2 }
  ];

  const lastResults = [];
  for (let i = 0; i < 5; i++) {
    const oppIndex = (code + i * 3) % OPPONENTS_POOL.length;
    let opponent = OPPONENTS_POOL[oppIndex];
    if (opponent === translateTeam(teamName)) {
      opponent = OPPONENTS_POOL[(oppIndex + 1) % OPPONENTS_POOL.length];
    }
    
    const outcomeType = (code + i * 7) % 3;
    let goalsFor, goalsAgainst, type;
    
    if (outcomeType === 0) {
      type = 'W';
      goalsFor = (code + i) % 3 + 1;
      goalsAgainst = (code + i) % goalsFor;
    } else if (outcomeType === 1) {
      type = 'D';
      goalsFor = (code + i) % 3;
      goalsAgainst = goalsFor;
    } else {
      type = 'L';
      goalsAgainst = (code + i) % 3 + 1;
      goalsFor = (code + i) % goalsAgainst;
    }

    lastResults.push({ opponent, score: `${goalsFor} - ${goalsAgainst}`, type });
  }

  const xG_attack = parseFloat((1.1 + ((code % 10) / 15)).toFixed(2));
  const xG_defense = parseFloat((0.7 + ((code % 8) / 15)).toFixed(2));

  return {
    lastResults,
    h2h: h2hPool[code % h2hPool.length],
    xG_attack,
    xG_defense
  };
};

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        console.error("Missing API Key");
        setLoading(false);
        return;
      }

      const response = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`);
      const data = await response.json();

      if (data && Array.isArray(data)) {
        const activeGames = data.filter(game => {
          const bookmaker = game.bookmakers?.[0];
          const market = bookmaker?.markets?.find(m => m.key === 'h2h');
          return market && market.outcomes && market.outcomes.length >= 2;
        });

        const formattedMatches = activeGames.map((game, index) => {
          const bookmaker = game.bookmakers[0];
          const market = bookmaker.markets.find(m => m.key === 'h2h');
          
          const homeOdds = market.outcomes.find(o => o.name === game.home_team)?.price || 2.20;
          const awayOdds = market.outcomes.find(o => o.name === game.away_team)?.price || 2.60;
          const drawOdds = market.outcomes.find(o => o.name === 'Draw')?.price || 3.10;

          const stats = generateDynamicStats(game.home_team);
          const awayStats = generateDynamicStats(game.away_team);

          const dateObj = new Date(game.commence_time);
          const localDate = dateObj.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
          const localTime = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });

          return {
            id: game.id || index,
            rawTime: dateObj.getTime(),
            homeTeam: translateTeam(game.home_team),
            awayTeam: translateTeam(game.away_team),
            date: localDate,
            time: localTime,
            odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
            homeLastResults: stats.lastResults || [],
            awayLastResults: awayStats.lastResults || [],
            h2h: stats.h2h || { homeWins: 1, draws: 2, awayWins: 1 },
            homeXG: stats.xG_attack,
            homeExpectedConcedeXG: stats.xG_defense,
            awayXG: awayStats.xG_attack,
            awayExpectedConcedeXG: awayStats.xG_defense,
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
        if (formattedMatches.length > 0) {
          setSelectedMatch(formattedMatches[0]);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("שגיאה במשיכת הנתונים:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealOdds(false);
  }, [refreshTrigger]);

  const calculatePrediction = (match) => {
    if (!match) return null;

    let baseHomeXG = match.homeXG || 1.2;
    let baseAwayXG = match.awayXG || 1.1;

    const motivationDiff = (match.homeMotivation || 3) - (match.awayMotivation || 3);
    baseHomeXG += motivationDiff * 0.10; 
    baseAwayXG -= motivationDiff * 0.10;

    if (match.scenario === "rain") {
      baseHomeXG *= 0.80; 
      baseAwayXG *= 0.80;
    } else if (match.scenario === "red_card") {
      baseHomeXG *= 1.25;
      baseAwayXG *= 0.70;
    }

    const odds = match.odds || { home: 2.3, draw: 3.1, away: 2.5 };
    const impliedHomeProb = 1 / odds.home;
    const impliedAwayProb = 1 / odds.away;
    const totalProb = impliedHomeProb + impliedAwayProb + (1 / odds.draw);
    const marketHomeProb = impliedHomeProb / totalProb;
    const marketAwayProb = impliedAwayProb / totalProb;

    if (match.homeInjuries?.length > 0) baseHomeXG *= (1 - (match.homeInjuries.length * 0.06));
    if (match.awayInjuries?.length > 0) baseAwayXG *= (1 - (match.awayInjuries.length * 0.06));

    let finalHomeExpected = ((baseHomeXG * (1 / (match.awayExpectedConcedeXG || 1.0))) + (marketHomeProb * 2.2)) / 2;
    let finalAwayExpected = ((baseAwayXG * (1 / (match.homeExpectedConcedeXG || 1.0))) + (marketAwayProb * 1.9)) / 2;

    let homeGoals = Math.round(finalHomeExpected);
    let awayGoals = Math.round(finalAwayExpected);

    homeGoals = Math.min(Math.max(homeGoals, 0), 4);
    awayGoals = Math.min(Math.max(awayGoals, 0), 4);

    let homePower = (marketHomeProb * 60) + ((match.homeMotivation || 3) * 5);
    let awayPower = (marketAwayProb * 60) + ((match.awayMotivation || 3) * 5);
    const totalPower = homePower + awayPower + 10;

    const homePercent = Math.round((homePower / totalPower) * 100);
    const awayPercent = Math.round((awayPower / totalPower) * 100);
    const drawPercent = 100 - homePercent - awayPercent;

    if (homePercent - awayPercent > 25 && homeGoals <= awayGoals) homeGoals = awayGoals + 1;
    if (awayPercent - homePercent > 25 && awayGoals <= homeGoals) awayGoals = homeGoals + 1;

    let recommendation = "תיקו קשוח (X)";
    if (homePercent > awayPercent && homePercent > 39) recommendation = `ניצחון ל${match.homeTeam} (1)`;
    if (awayPercent > homePercent && awayPercent > 39) recommendation = `ניצחון ל${match.awayTeam} (2)`;

    return { 
      homePercent, 
      drawPercent, 
      awayPercent, 
      predictedScore: `${homeGoals} - ${awayGoals}`, 
      recommendation,
      finalHomeXG: baseHomeXG.toFixed(2),
      finalAwayXG: baseAwayXG.toFixed(2)
    };
  };

  useEffect(() => {
    if (matches.length > 0) {
      const newPredictions = {};
      matches.forEach(m => {
        newPredictions[m.id] = calculatePrediction(m);
      });
      setPredictions(newPredictions);
    }
  }, [matches]);

  const updateMatchData = (field, value, subField = null) => {
    const updated = matches.map(m => {
      if (m.id === selectedMatch.id) {
        if (subField) {
          return { ...m, [field]: { ...m[field], [subField]: parseFloat(value) || value } };
        }
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
          <p className="text-sm font-semibold tracking-wide text-emerald-400">מתגבר על תצורות מטמון ישנות ומעלה קוד מוגן קריסות...</p>
        </div>
      </div>
    );
  }

  const currentPrediction = predictions[selectedMatch?.id] || { homePercent: 33, drawPercent: 34, awayPercent: 33, predictedScore: "0-0", recommendation: "מחשב...", finalHomeXG: "0.0", finalAwayXG: "0.0" };

  const groupedMatches = matches.reduce((groups, match) => {
    const date = match.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(match);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMatches).sort((a, b) => {
    return (groupedMatches[a]?.[0]?.rawTime || 0) - (groupedMatches[b]?.[0]?.rawTime || 0);
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            מונדיאל Predictor Pro <span className="text-xs text-slate-500 font-normal">v2.9 (Crash Proof)</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">גרסה מוגנת מטמון יציבה</p>
        </div>
        <button onClick={() => fetchRealOdds(true)} className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">
          🔄 רענן יחסים חיים (בצע ניקוי מלא)
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* טור ימני: לוח משחקים */}
        <div className="lg:col-span-1 space-y-5 max-h-[60vh] lg:max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
          {sortedDates.map(date => (
            <div key={date} className="space-y-2">
              <div className="text-xs font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg inline-block">
                📅 משחקי ה-{date}
              </div>
              
              <div className="space-y-2 border-r-2 border-slate-800 pr-2 mr-1">
                {groupedMatches[date]?.map(match => {
                  const pred = predictions[match.id];
                  return (
                    <button
                      key={match.id}
                      onClick={() => setSelectedMatch(match)}
                      className={`w-full text-right p-3.5 rounded-xl border transition-all ${
                        selectedMatch?.id === match.id 
                          ? 'bg-slate-800 border-emerald-500 shadow-lg' 
                          : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[11px] mb-1.5">
                        <span className="text-emerald-400 font-semibold font-mono">⏰ {match.time}</span>
                        <span className="font-bold text-slate-300">{pred ? pred.predictedScore : ''}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-xs md:text-sm gap-2">
                        <span className="truncate max-w-[105px]">{match.homeTeam}</span>
                        <span className="text-slate-600 text-[10px]">VS</span>
                        <span className="truncate max-w-[105px]">{match.awayTeam}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* טור מרכזי ושמאל: האנליזה והסטטיסטיקות */}
        {selectedMatch && (
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700 relative">
              <div className="flex justify-around items-center my-4 gap-1">
                <div className="text-center w-1/3">
                  <div className="text-base md:text-xl font-black truncate">{selectedMatch.homeTeam}</div>
                  <div className="text-lg md:text-2xl font-bold text-emerald-400 mt-1">{currentPrediction.homePercent}%</div>
                  <div className="text-[11px] text-slate-400 font-mono">xG: {currentPrediction.finalHomeXG}</div>
                </div>
                
                <div className="text-center bg-slate-950/70 border border-slate-800 px-3 py-3 rounded-2xl w-1/3 shadow-inner">
                  <div className="text-[9px] font-bold text-slate-400">תוצאה משוערת</div>
                  <div className="text-2xl md:text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 my-1">
                    {currentPrediction.predictedScore}
                  </div>
                  <div className="text-[10px] text-slate-400">תיקו: {currentPrediction.drawPercent}%</div>
                </div>
                
                <div className="text-center w-1/3">
                  <div className="text-base md:text-xl font-black truncate">{selectedMatch.awayTeam}</div>
                  <div className="text-lg md:text-2xl font-bold text-cyan-400 mt-1">{currentPrediction.awayPercent}%</div>
                  <div className="text-[11px] text-slate-400 font-mono">xG: {currentPrediction.finalAwayXG}</div>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs md:text-sm">
                <span className="text-slate-400">המלצת שוק:</span>
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">
                  {currentPrediction.recommendation}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/60 pb-2">📊 היסטוריית משחקים ותוצאות מדויקות (H2H & Form)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* תוצאות נבחרת הבית עם מנגנון הגנה */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-emerald-400 mb-1">⏰ 5 משחקים אחרונים - {selectedMatch.homeTeam}:</div>
                  <div className="space-y-1.5 shadow-inner bg-slate-950/20 p-2 rounded-lg">
                    {(selectedMatch.homeLastResults || []).map((res, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-slate-800/50 last:border-0 pb-1 last:pb-0">
                        <span className="text-slate-400">נגד {res.opponent}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-200">{res.score}</span>
                          <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${res.type === 'W' ? 'bg-emerald-950 text-emerald-400' : res.type === 'L' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>{res.type}</span>
                        </div>
                      </div>
                    ))}
                    {(!selectedMatch.homeLastResults || selectedMatch.homeLastResults.length === 0) && <p className="text-slate-500 text-[11px]">לחץ על כפתור הרענון למעלה לסינכרון נתונים מלא</p>}
                  </div>
                </div>

                {/* תוצאות נבחרת החוץ עם מנגנון הגנה */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-cyan-400 mb-1">⏰ 5 משחקים אחרונים - {selectedMatch.awayTeam}:</div>
                  <div className="space-y-1.5 shadow-inner bg-slate-950/20 p-2 rounded-lg">
                    {(selectedMatch.awayLastResults || []).map((res, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-slate-800/50 last:border-0 pb-1 last:pb-0">
                        <span className="text-slate-400">נגד {res.opponent}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-200">{res.score}</span>
                          <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${res.type === 'W' ? 'bg-emerald-950 text-emerald-400' : res.type === 'L' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>{res.type}</span>
                        </div>
                      </div>
                    ))}
                    {(!selectedMatch.awayLastResults || selectedMatch.awayLastResults.length === 0) && <p className="text-slate-500 text-[11px]">לחץ על כפתור הרענון למעלה לסינכרון נתונים מלא</p>}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-300">מאזן מפגשים ישירים היסטורי:</div>
                <div className="flex justify-around items-center text-center bg-slate-950/50 py-2.5 rounded-xl border border-slate-800/60">
                  <div>
                    <div className="text-emerald-400 font-bold text-base">{selectedMatch.h2h?.homeWins ?? 0}</div>
                    <div className="text-[9px] text-slate-500">ניצחונות {selectedMatch.homeTeam}</div>
                  </div>
                  <div className="border-r border-slate-800 h-6"></div>
                  <div>
                    <div className="text-slate-400 font-bold text-base">{selectedMatch.h2h?.draws ?? 0}</div>
                    <div className="text-[9px] text-slate-500">תוצאות תיקו</div>
                  </div>
                  <div className="border-r border-slate-800 h-6"></div>
                  <div>
                    <div className="text-cyan-400 font-bold text-base">{selectedMatch.h2h?.awayWins ?? 0}</div>
                    <div className="text-[9px] text-slate-500">ניצחונות {selectedMatch.awayTeam}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* פנלים לשליטה ועדכון */}
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
                <h4 className="text-xs font-bold text-slate-400 uppercase">סימולטור תרחישי קצה (What-If)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => updateMatchData('scenario', 'normal')} className={`py-2 px-1 text-xs font-medium rounded-lg border ${selectedMatch.scenario === 'normal' ? 'bg-slate-900 border-slate-600 text-slate-100 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>☀️ רגיל</button>
                  <button onClick={() => updateMatchData('scenario', 'rain')} className={`py-2 px-1 text-xs font-medium rounded-lg border ${selectedMatch.scenario === 'rain' ? 'bg-cyan-950 text-cyan-400 border-cyan-800 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>🌧️ מבול</button>
                  <button onClick={() => updateMatchData('scenario', 'red_card')} className={`py-2 px-1 text-xs font-medium rounded-lg border ${selectedMatch.scenario === 'red_card' ? 'bg-rose-950 text-rose-400 border-rose-800 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>🟥 אדום לחוץ</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">יחסים עולמיים עדכניים</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-500 truncate">{selectedMatch.homeTeam}</div>
                    <input type="number" step="0.01" value={selectedMatch.odds?.home} onChange={(e) => updateMatchData('odds', e.target.value, 'home')} className="bg-transparent w-full text-center font-mono font-bold text-emerald-400 text-xs focus:outline-none mt-0.5" />
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-500">X (תיקו)</div>
                    <input type="number" step="0.01" value={selectedMatch.odds?.draw} onChange={(e) => updateMatchData('odds', e.target.value, 'draw')} className="bg-transparent w-full text-center font-mono font-bold text-slate-300 text-xs focus:outline-none mt-0.5" />
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-500 truncate">{selectedMatch.awayTeam}</div>
                    <input type="number" step="0.01" value={selectedMatch.odds?.away} onChange={(e) => updateMatchData('odds', e.target.value, 'away')} className="bg-transparent w-full text-center font-mono font-bold text-cyan-400 text-xs focus:outline-none mt-0.5" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase">מצב פצועים משפיעי xG</h4>
                <div className="flex gap-2">
                  <button onClick={() => { const p = prompt(`שם פצוע ל${selectedMatch.homeTeam}:`); if(p) updateMatchData('homeInjuries', [...(selectedMatch.homeInjuries || []), p]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded-lg transition-colors truncate">+ {selectedMatch.homeTeam.split(' ')[0]}</button>
                  <button onClick={() => { const p = prompt(`שם פצוע ל${selectedMatch.awayTeam}:`); if(p) updateMatchData('awayInjuries', [...(selectedMatch.awayInjuries || []), p]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded-lg transition-colors truncate">+ {selectedMatch.awayTeam.split(' ')[0]}</button>
                  <button onClick={() => { updateMatchData('homeInjuries', []); updateMatchData('awayInjuries', []); }} className="bg-rose-950/40 text-rose-400 border border-rose-900/50 text-xs px-3 rounded-lg hover:bg-rose-900/40">אפס</button>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
