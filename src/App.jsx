import React, { useState, useEffect } from 'react';

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [predictions, setPredictions] = useState({});

  // משיכת נתונים אמיתיים מ-The Odds API ברגע שהאפליקציה עולה
  useEffect(() => {
    const fetchRealOdds = async () => {
      try {
        const apiKey = import.meta.env.VITE_ODDS_API_KEY;
        if (!apiKey) {
          console.error("Missing API Key in Environment Variables");
          setLoading(false);
          return;
        }

        // מושך משחקי כדורגל קרובים מליגת האלופות (או טורניר גדול אחר שתבחר)
        const response = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`);
        const data = await response.json();

        if (data && Array.isArray(data)) {
          const formattedMatches = data.slice(0, 8).map((game, index) => {
            // לוקח את יחסי ההימורים מהספק הראשון הזמין ברשימה (למשל Bet365 או 1xBet)
            const bookmaker = game.bookmakers[0];
            const market = bookmaker?.markets?.find(m => m.key === 'h2h');
            
            const homeOdds = market?.outcomes?.find(o => o.name === game.home_team)?.price || 2.10;
            const awayOdds = market?.outcomes?.find(o => o.name === game.away_team)?.price || 2.80;
            const drawOdds = market?.outcomes?.find(o => o.name === 'Draw')?.price || 3.20;

            return {
              id: game.id || index,
              homeTeam: game.home_team,
              awayTeam: game.away_team,
              date: game.commence_time.split('T')[0],
              time: game.commence_time.split('T')[1].substring(0, 5),
              odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
              // נתוני פתיחה למומנטום וחיסורים (ניתנים לשינוי ועריכה ידנית בזמן אמת)
              homeForm: ["W", "W", "D", "L", "W"], 
              awayForm: ["W", "D", "W", "D", "L"],
              h2h: { homeWins: 2, draws: 1, awayWins: 2 },
              homeInjuries: [],
              awayInjuries: []
            };
          });

          setMatches(formattedMatches);
          setSelectedMatch(formattedMatches[0]);
        }
        setLoading(false);
      } catch (error) {
        console.error("שגיאה במשיכת הנתונים:", error);
        setLoading(false);
      }
    };

    fetchRealOdds();
  }, []);

  // אלגוריתם השקלול המתמטי המשולב
  const calculatePrediction = (match) => {
    if (!match) return null;

    // 1. שקלול כושר (5 משחקים אחרונים)
    const getFormPoints = (form) => form.reduce((acc, res) => acc + (res === 'W' ? 3 : res === 'D' ? 1 : 0), 0);
    const homeFormPoints = getFormPoints(match.homeForm);
    const awayFormPoints = getFormPoints(match.awayForm);

    // 2. שקלול מפגשים ישירים H2H
    const totalH2H = match.h2h.homeWins + match.h2h.draws + match.h2h.awayWins;
    const homeH2hRatio = totalH2H > 0 ? match.h2h.homeWins / totalH2H : 0.33;
    const awayH2hRatio = totalH2H > 0 ? match.h2h.awayWins / totalH2H : 0.33;

    // 3. המרת יחסי ההימורים מהאינטרנט להסתברות מרומזת
    const impliedHomeProb = 1 / match.odds.home;
    const impliedDrawProb = 1 / match.odds.draw;
    const impliedAwayProb = 1 / match.odds.away;
    const totalProb = impliedHomeProb + impliedDrawProb + impliedAwayProb;
    
    const marketHomeProb = impliedHomeProb / totalProb;
    const marketAwayProb = impliedAwayProb / totalProb;

    // 4. קנס על שחקנים פצועים/חיסורים שהזנת
    const homeInjuryPenalty = match.homeInjuries.length * 1.2;
    const awayInjuryPenalty = match.awayInjuries.length * 1.2;

    // חישוב ציוני עוצמה סופיים
    let homePower = (homeFormPoints * 0.3) + (homeH2hRatio * 20) + (marketHomeProb * 50) - homeInjuryPenalty;
    let awayPower = (awayFormPoints * 0.3) + (awayH2hRatio * 20) + (marketAwayProb * 50) - awayInjuryPenalty;

    homePower = Math.max(homePower, 5);
    awayPower = Math.max(awayPower, 5);

    const totalPower = homePower + awayPower + 15; // 15 מוקצה לסיכויי תיקו מובנים במשחק
    
    const homePercent = Math.round((homePower / totalPower) * 100);
    const awayPercent = Math.round((awayPower / totalPower) * 100);
    const drawPercent = 100 - homePercent - awayPercent;

    // ניתוח לתוצאה מדוייקת משוערת
    let predictedHomeGoals = 1;
    let predictedAwayGoals = 1;

    if (homePercent - awayPercent > 22) {
      predictedHomeGoals = 2; predictedAwayGoals = 0;
    } else if (homePercent - awayPercent > 6) {
      predictedHomeGoals = 2; predictedAwayGoals = 1;
    } else if (awayPercent - homePercent > 22) {
      predictedHomeGoals = 0; predictedAwayGoals = 2;
    } else if (awayPercent - homePercent > 6) {
      predictedHomeGoals = 1; predictedAwayGoals = 2;
    }

    let recommendation = "תיקו קשוח (X)";
    if (homePercent > awayPercent && homePercent > 44) recommendation = `ניצחון ל${match.homeTeam} (1)`;
    if (awayPercent > homePercent && awayPercent > 44) recommendation = `ניצחון ל${match.awayTeam} (2)`;

    return { homePercent, drawPercent, awayPercent, predictedScore: `${predictedHomeGoals} - ${predictedAwayGoals}`, recommendation };
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
        return { ...m, [field]: value };
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
          <p className="text-sm font-semibold tracking-wide text-emerald-400">מושך משחקים ויחסי הימורים חיים מהאינטרנט...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100" dir="rtl">
        <p className="text-rose-400 font-bold">לא נמצאו משחקים פעילים כרגע ב-API. וודא שהגדרת את ה-Environment Variable ב-Vercel.</p>
      </div>
    );
  }

  const currentPrediction = predictions[selectedMatch?.id] || { homePercent: 33, drawPercent: 34, awayPercent: 33, predictedScore: "0-0", recommendation: "בחישוב..." };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-8 text-center md:text-right border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          Mundiala Predictor Pro
        </h1>
        <p className="text-slate-400 text-sm mt-1">מערכת שקלול נתונים חכמה להימורי חברים</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-slate-300 mb-2">משחקים חמים (לייב)</h2>
          {matches.map(match => {
            const pred = predictions[match.id];
            return (
              <button
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className={`w-full text-right p-4 rounded-xl border transition-all ${
                  selectedMatch.id === match.id 
                    ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10' 
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>{match.date} | {match.time}</span>
                  <span className="font-semibold text-emerald-400">
                    {pred ? `המלצה: ${pred.recommendation.split(' ')[0]}` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-sm md:text-base">
                  <span className="truncate max-w-[100px]">{match.homeTeam}</span>
                  <span className="text-slate-500 text-xs font-normal">VS</span>
                  <span className="truncate max-w-[100px]">{match.awayTeam}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-bold text-xs px-3 py-1 rounded-br-lg">
              תוצאת השקלול
            </div>
            <h3 className="text-sm font-semibold text-slate-400 mb-4">הסתברויות מבוססות אלגוריתם</h3>
            
            <div className="flex justify-around items-center my-6">
              <div className="text-center w-1/3">
                <div className="text-xl md:text-2xl font-black truncate">{selectedMatch.homeTeam}</div>
                <div className="text-2xl font-bold text-emerald-400 mt-2">{currentPrediction.homePercent}%</div>
              </div>
              <div className="text-center bg-slate-700/50 px-4 py-2 rounded-xl w-1/3 mx-2">
                <div className="text-[10px] text-slate-400">תוצאה משוערת</div>
                <div className="text-2xl md:text-3xl font-mono font-black tracking-widest text-cyan-400 my-1">
                  {currentPrediction.predictedScore}
                </div>
                <div className="text-[10px] text-slate-300">תיקו: {currentPrediction.drawPercent}%</div>
              </div>
              <div className="text-center w-1/3">
                <div className="text-xl md:text-2xl font-black truncate">{selectedMatch.awayTeam}</div>
                <div className="text-2xl font-bold text-cyan-400 mt-2">{currentPrediction.awayPercent}%</div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
              <span className="text-slate-400 text-xs md:text-sm">מה כדאי לסמן בטופס?</span>
              <span className="text-base md:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">
                {currentPrediction.recommendation}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-3">כושר נוכחי (5 משחקים אחרונים)</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm truncate max-w-[120px]">{selectedMatch.homeTeam}:</span>
                  <div className="flex gap-1" dir="ltr">
                    {selectedMatch.homeForm.map((r, i) => (
                      <span key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${r === 'W' ? 'bg-emerald-600' : r === 'D' ? 'bg-slate-600' : 'bg-rose-600'}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs md:text-sm truncate max-w-[120px]">{selectedMatch.awayTeam}:</span>
                  <div className="flex gap-1" dir="ltr">
                    {selectedMatch.awayForm.map((r, i) => (
                      <span key={i} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${r === 'W' ? 'bg-emerald-600' : r === 'D' ? 'bg-slate-600' : 'bg-rose-600'}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-400 mt-6 mb-2">היסטוריית מפגשים ישירים (H2H)</h4>
              <div className="text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-800 text-center">
                ניצחונות לבית: <span className="text-emerald-400 font-bold">{selectedMatch.h2h.homeWins}</span> | 
                X: <span className="font-bold">{selectedMatch.h2h.draws}</span> | 
                ניצחונות לחוץ: <span className="text-cyan-400 font-bold">{selectedMatch.h2h.awayWins}</span>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-3">יחסים חיים מהרשת (ניתן לערוך)</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 p-1 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-400 truncate">{selectedMatch.homeTeam}</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.home} onChange={(e) => updateMatchData('odds', e.target.value, 'home')} className="bg-transparent w-full text-center font-bold text-emerald-400 text-sm focus:outline-none" />
                  </div>
                  <div className="bg-slate-900 p-1 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-400">תיקו (X)</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.draw} onChange={(e) => updateMatchData('odds', e.target.value, 'draw')} className="bg-transparent w-full text-center font-bold text-slate-300 text-sm focus:outline-none" />
                  </div>
                  <div className="bg-slate-900 p-1 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-400 truncate">{selectedMatch.awayTeam}</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.away} onChange={(e) => updateMatchData('odds', e.target.value, 'away')} className="bg-transparent w-full text-center font-bold text-cyan-400 text-sm focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-bold text-slate-400 mb-2">פצועים וחיסורים משפיעי אלגוריתם</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <div className="font-semibold text-emerald-400 mb-1">בית:</div>
                    {selectedMatch.homeInjuries.length === 0 ? <span className="text-slate-500">אין חיסורים</span> : selectedMatch.homeInjuries.map((inj, i) => <div key={i}>• {inj}</div>)}
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <div className="font-semibold text-cyan-400 mb-1">חוץ:</div>
                    {selectedMatch.awayInjuries.length === 0 ? <span className="text-slate-500">אין חיסורים</span> : selectedMatch.awayInjuries.map((inj, i) => <div key={i}>• {inj}</div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h4 className="text-sm font-bold text-slate-300 mb-1">עדכון פצועים מהיר (ONE, ספורט 5 וכדומה)</h4>
            <p className="text-xs text-slate-400 mb-3">הזרק פצועים שגילית באתרי הספורט בארץ כדי לעדכן מיידית את יחסי הכוחות:</p>
            <div className="flex gap-2">
              <button onClick={() => { const p = prompt(`שם פצוע ל${selectedMatch.homeTeam}:`); if(p) updateMatchData('homeInjuries', [...selectedMatch.homeInjuries, p]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-semibold py-2 px-2 rounded-lg transition-colors">+ בית</button>
              <button onClick={() => { const p = prompt(`שם פצוע ל${selectedMatch.awayTeam}:`); if(p) updateMatchData('awayInjuries', [...selectedMatch.awayInjuries, p]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-semibold py-2 px-2 rounded-lg transition-colors">+ חוץ</button>
              <button onClick={() => { updateMatchData('homeInjuries', []); updateMatchData('awayInjuries', []); }} className="bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-900/50 text-xs font-semibold py-2 px-3 rounded-lg transition-colors">אפס</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
