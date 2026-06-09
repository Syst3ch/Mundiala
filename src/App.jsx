import React, { useState, useEffect } from 'react';

// נתוני פתיחה לדוגמה (Mock Data) שמדמים את מה שיגיע מה-APIs והאתרים
const INITIAL_MATCHES = [
  {
    id: 1,
    homeTeam: "צרפת",
    awayTeam: "איטליה",
    date: "2026-06-12",
    time: "22:00",
    odds: { home: 1.85, draw: 3.40, away: 4.20 }, // יחסי הימורים מהאינטרנט
    homeForm: ["W", "W", "D", "W", "L"], // 5 משחקים אחרונים נבחרת בית
    awayForm: ["W", "D", "L", "W", "D"], // 5 משחקים אחרונים נבחרת חוץ
    h2h: { homeWins: 3, draws: 1, awayWins: 1 }, // 5 משחקים אחרונים ביניהן
    homeInjuries: ["קיליאן אמבפה (ספק)", "אורליאן טשואמני"],
    awayInjuries: ["ניקולו בארלה"],
  },
  {
    id: 2,
    homeTeam: "אנגליה",
    awayTeam: "גרמניה",
    date: "2026-06-13",
    time: "21:45",
    odds: { home: 2.10, draw: 3.25, away: 3.10 },
    homeForm: ["W", "L", "W", "W", "W"],
    awayForm: ["D", "W", "W", "D", "L"],
    h2h: { homeWins: 2, draws: 2, awayWins: 1 },
    homeInjuries: [],
    awayInjuries: ["ג'מאל מוסיאלה", "לרוי סאנה"],
  }
];

export default function App() {
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [selectedMatch, setSelectedMatch] = useState(INITIAL_MATCHES[0]);
  const [predictions, setPredictions] = useState({});

  // אלגוריתם השקלול החכם שביקשת
  const calculatePrediction = (match) => {
    // 1. שקלול כושר נוכחי (5 משחקים אחרונים)
    const getFormPoints = (form) => form.reduce((acc, res) => acc + (res === 'W' ? 3 : res === 'D' ? 1 : 0), 0);
    const homeFormPoints = getFormPoints(match.homeForm); // מקסימום 15
    const awayFormPoints = getFormPoints(match.awayForm); // מקסימום 15

    // 2. שקלול מפגשים ישירים H2H
    const totalH2H = match.h2h.homeWins + match.h2h.draws + match.h2h.awayWins;
    const homeH2hRatio = totalH2H > 0 ? match.h2h.homeWins / totalH2H : 0.33;
    const awayH2hRatio = totalH2H > 0 ? match.h2h.awayWins / totalH2H : 0.33;

    // 3. שקלול דעת השוק (יחסי הימורים) - המרת יחס להסתברות מרומזת
    const impliedHomeProb = 1 / match.odds.home;
    const impliedDrawProb = 1 / match.odds.draw;
    const impliedAwayProb = 1 / match.odds.away;
    const totalProb = impliedHomeProb + impliedDrawProb + impliedAwayProb;
    
    // נרמול ל-100%
    const marketHomeProb = impliedHomeProb / totalProb;
    const marketAwayProb = impliedAwayProb / totalProb;

    // 4. קנס על שחקנים פצועים (כל פצוע מוריד מכוח הקבוצה)
    const homeInjuryPenalty = match.homeInjuries.length * 0.8;
    const awayInjuryPenalty = match.awayInjuries.length * 0.8;

    // חישוב ציון עוצמה סופי (משקולות לבחירתך)
    let homePower = (homeFormPoints * 0.3) + (homeH2hRatio * 20) + (marketHomeProb * 50) - homeInjuryPenalty;
    let awayPower = (awayFormPoints * 0.3) + (awayH2hRatio * 20) + (marketAwayProb * 50) - awayInjuryPenalty;

    // מניעת ערכים שליליים בטעות
    homePower = Math.max(homePower, 5);
    awayPower = Math.max(awayPower, 5);

    const totalPower = homePower + awayPower + 15; // 15 מייצג את סיכויי התיקו
    
    const homePercent = Math.round((homePower / totalPower) * 100);
    const awayPercent = Math.round((awayPower / totalPower) * 100);
    const drawPercent = 100 - homePercent - awayPercent;

    // חיזוי תוצאה מדויקת משוערת על בסיס יחסי הכוחות
    let predictedHomeGoals = 1;
    let predictedAwayGoals = 1;

    if (homePercent - awayPercent > 20) {
      predictedHomeGoals = 2; predictedAwayGoals = 0;
    } else if (homePercent - awayPercent > 5) {
      predictedHomeGoals = 2; predictedAwayGoals = 1;
    } else if (awayPercent - homePercent > 20) {
      predictedHomeGoals = 0; predictedAwayGoals = 2;
    } else if (awayPercent - homePercent > 5) {
      predictedHomeGoals = 1; predictedAwayGoals = 2;
    }

    // המלצת הימור חברים סופית
    let recommendation = "תיקו קשוח (X)";
    if (homePercent > awayPercent && homePercent > 45) recommendation = `ניצחון ל${match.homeTeam} (1)`;
    if (awayPercent > homePercent && awayPercent > 45) recommendation = `ניצחון ל${match.awayTeam} (2)`;

    return {
      homePercent,
      drawPercent,
      awayPercent,
      predictedScore: `${predictedHomeGoals} - ${predictedAwayGoals}`,
      recommendation
    };
  };

  // עדכון השקלול בכל פעם שמשחק נבחר או משתנה
  useEffect(() => {
    const newPredictions = {};
    matches.forEach(m => {
      newPredictions[m.id] = calculatePrediction(m);
    });
    setPredictions(newPredictions);
  }, [matches]);

  const currentPrediction = predictions[selectedMatch.id] || { homePercent: 33, drawPercent: 34, awayPercent: 33, predictedScore: "0-0", recommendation: "בחישוב..." };

  // פונקציה לעדכון מהיר של פצועים או יחסים שהחברים מצאו באתרי ספורט
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 text-center md:text-right border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          Mundiala Predictor Pro
        </h1>
        <p className="text-slate-400 text-sm mt-1">מערכת שקלול נתונים חכמה להימורי חברים</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* טור ימין: רשימת המשחקים */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-slate-300 mb-2">משחקים חמים</h2>
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
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>{match.homeTeam}</span>
                  <span className="text-slate-500 text-sm font-normal">נגד</span>
                  <span>{match.awayTeam}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* טור מרכזי ושמאל: ניתוח ושקלול הנתונים של המשחק הנבחר */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* כרטיס תוצאה מדוייקת משוקללת */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-bold text-xs px-3 py-1 rounded-br-lg">
              תוצאת האלגוריתם
            </div>
            
            <h3 className="text-sm font-semibold text-slate-400 mb-4">שקלול סופי והסתברויות</h3>
            
            <div className="flex justify-around items-center my-6">
              <div className="text-center">
                <div className="text-3xl font-black">{selectedMatch.homeTeam}</div>
                <div className="text-2xl font-bold text-emerald-400 mt-2">{currentPrediction.homePercent}%</div>
              </div>
              <div className="text-center bg-slate-700/50 px-4 py-2 rounded-xl">
                <div className="text-xs text-slate-400">תוצאה משוערת</div>
                <div className="text-4xl font-mono font-black tracking-widest text-cyan-400 my-1">
                  {currentPrediction.predictedScore}
                </div>
                <div className="text-xs text-slate-300 font-medium">תיקו: {currentPrediction.drawPercent}%</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black">{selectedMatch.awayTeam}</div>
                <div className="text-2xl font-bold text-cyan-400 mt-2">{currentPrediction.awayPercent}%</div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
              <span className="text-slate-400 text-sm">מה כדאי להמר עם החברים?</span>
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">
                {currentPrediction.recommendation}
              </span>
            </div>
          </div>

          {/* לוח הנתונים המלא המשפיע על השקלול */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 5 משחקים אחרונים */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-3">כושר נוכחי (5 משחקים אחרונים)</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{selectedMatch.homeTeam}:</span>
                  <div className="flex gap-1" dir="ltr">
                    {selectedMatch.homeForm.map((r, i) => (
                      <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${r === 'W' ? 'bg-emerald-600' : r === 'D' ? 'bg-slate-600' : 'bg-rose-600'}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{selectedMatch.awayTeam}:</span>
                  <div className="flex gap-1" dir="ltr">
                    {selectedMatch.awayForm.map((r, i) => (
                      <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${r === 'W' ? 'bg-emerald-600' : r === 'D' ? 'bg-slate-600' : 'bg-rose-600'}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-400 mt-6 mb-2">היסטוריה ביניהן (H2H 5 אחרונים)</h4>
              <div className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-800 text-center">
                ניצחונות ל{selectedMatch.homeTeam}: <span className="text-emerald-400 font-bold">{selectedMatch.h2h.homeWins}</span> | 
                תיקו: <span className="font-bold">{selectedMatch.h2h.draws}</span> | 
                ניצחונות ל{selectedMatch.awayTeam}: <span className="text-cyan-400 font-bold">{selectedMatch.h2h.awayWins}</span>
              </div>
            </div>

            {/* יחסי הימורים ופצועים מהרשת */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-3">יחסי הימורים באינטרנט (1 X 2)</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-400">{selectedMatch.homeTeam}</div>
                    <input 
                      type="number" 
                      step="0.01"
                      value={selectedMatch.odds.home} 
                      onChange={(e) => updateMatchData('odds', e.target.value, 'home')}
                      className="bg-transparent w-full text-center font-bold text-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-400">תיקו (X)</div>
                    <input 
                      type="number" 
                      step="0.01"
                      value={selectedMatch.odds.draw} 
                      onChange={(e) => updateMatchData('odds', e.target.value, 'draw')}
                      className="bg-transparent w-full text-center font-bold text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-400">{selectedMatch.awayTeam}</div>
                    <input 
                      type="number" 
                      step="0.01"
                      value={selectedMatch.odds.away} 
                      onChange={(e) => updateMatchData('odds', e.target.value, 'away')}
                      className="bg-transparent w-full text-center font-bold text-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-bold text-slate-400 mb-2">שחקנים פצועים / חיסורים</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <div className="font-semibold text-emerald-400 mb-1">{selectedMatch.homeTeam}:</div>
                    {selectedMatch.homeInjuries.length === 0 ? <span className="text-slate-500">אין פצועים</span> : 
                      selectedMatch.homeInjuries.map((inj, i) => <div key={i}>• {inj}</div>)
                    }
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <div className="font-semibold text-cyan-400 mb-1">{selectedMatch.awayTeam}:</div>
                    {selectedMatch.awayInjuries.length === 0 ? <span className="text-slate-500">אין פצועים</span> : 
                      selectedMatch.awayInjuries.map((inj, i) => <div key={i}>• {inj}</div>)
                    }
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* לוח בקרה לעדכון נתונים מהיר מהסמארטפון/אתרים בישראל */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h4 className="text-sm font-bold text-slate-300 mb-2">עדכון מהיר של חיסורים ופצועים מהאתרים</h4>
            <p className="text-xs text-slate-400 mb-3">קראת הרגע בוואלה! ספורט או בערוץ הספורט שמישהו נפצע? תעדכן פה והשקלול ישתנה מיד:</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={() => {
                  const p = prompt("הכנס שם שחקן פצוע עבור " + selectedMatch.homeTeam);
                  if(p) updateMatchData('homeInjuries', [...selectedMatch.homeInjuries, p]);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              >
                + הוסף פצוע ל{selectedMatch.homeTeam}
              </button>
              <button 
                onClick={() => {
                  const p = prompt("הכנס שם שחקן פצוע עבור " + selectedMatch.awayTeam);
                  if(p) updateMatchData('awayInjuries', [...selectedMatch.awayInjuries, p]);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              >
                + הוסף פצוע ל{selectedMatch.awayTeam}
              </button>
              <button 
                onClick={() => {
                  updateMatchData('homeInjuries', []);
                  updateMatchData('awayInjuries', []);
                }}
                className="bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-900/50 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
              >
                אפס פצועים
              </button>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
