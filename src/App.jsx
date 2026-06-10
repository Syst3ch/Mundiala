const translateTeam = (name) => TEAM_TRANSLATIONS[name] || name;

const generateDynamicStats = (teamName) => {
  if (!teamName) return { form: ["D", "D", "D", "D", "D"], h2h: { homeWins: 1, draws: 3, awayWins: 1 }, attack: 1.2, defense: 1.1, xG_attack: 1.4, xG_defense: 1.1 };
  if (!teamName) return { form: ["D", "D", "D", "D", "D"], h2h: { homeWins: 1, draws: 3, awayWins: 1 }, attack: 1.2, defense: 1.1, xG_attack: 1.6, xG_defense: 1.0 };
  const code = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const formsPool = [
@@ -34,8 +34,9 @@
    { homeWins: 1, draws: 3, awayWins: 1 }
  ];

  const xG_attack = parseFloat((1.0 + ((code % 16) / 10)).toFixed(2));
  const xG_defense = parseFloat((0.6 + (((code + 4) % 13) / 10)).toFixed(2));
  // הגבהנו מעט את בסיס ה-xG הראשוני כדי לעודד סקור גבוה יותר במודל הפנימי
  const xG_attack = parseFloat((1.2 + ((code % 16) / 8)).toFixed(2));
  const xG_defense = parseFloat((0.5 + (((code + 4) % 13) / 10)).toFixed(2));

  return {
    form: formsPool[code % formsPool.length],
@@ -109,7 +110,7 @@

          return {
            id: game.id || index,
            rawTime: dateObj.getTime(),
            rawTime: dateObj.getTime(), // עוגן קריטי לסידור כרונולוגי
            homeTeam: translateTeam(game.home_team),
            awayTeam: translateTeam(game.away_team),
            date: localDate,
@@ -120,8 +121,8 @@
            h2h: stats.h2h,
            homeAttack: stats.attack,
            homeDefense: stats.defense,
            awayAttack: stats.attack,
            awayDefense: stats.defense,
            awayAttack: awayStats.attack,
            awayDefense: awayStats.defense,
            homeXG: stats.xG_attack,
            homeExpectedConcedeXG: stats.xG_defense,
            awayXG: awayStats.xG_attack,
@@ -134,6 +135,7 @@
          };
        });

        // מיון אבסולוטי של מערך המקור לפי מילישניות של זמן פתיחה
        formattedMatches.sort((a, b) => a.rawTime - b.rawTime);

        localStorage.setItem('world_cup_matches_cache', JSON.stringify(formattedMatches));
@@ -162,18 +164,18 @@
    let baseAwayXG = match.awayXG;

    const motivationDiff = match.homeMotivation - match.awayMotivation;
    baseHomeXG += motivationDiff * 0.15;
    baseAwayXG -= motivationDiff * 0.15;
    baseHomeXG += motivationDiff * 0.20; // הגדלנו מעט את השפעת המוטיבציה על ה-xG
    baseAwayXG -= motivationDiff * 0.20;

    let homeDefFactor = match.homeDefense;
    let awayDefFactor = match.awayDefense;

    if (match.scenario === "rain") {
      baseHomeXG *= 0.75; 
      baseAwayXG *= 0.75;
      baseHomeXG *= 0.80; 
      baseAwayXG *= 0.80;
    } else if (match.scenario === "red_card") {
      awayDefFactor *= 1.6; 
      baseHomeXG *= 1.3;
      awayDefFactor *= 1.7; 
      baseHomeXG *= 1.4;
    }

    const impliedHomeProb = 1 / match.odds.home;
@@ -182,29 +184,49 @@
    const marketHomeProb = impliedHomeProb / totalProb;
    const marketAwayProb = impliedAwayProb / totalProb;

    if (match.homeInjuries.length > 0) baseHomeXG *= (1 - (match.homeInjuries.length * 0.08));
    if (match.awayInjuries.length > 0) baseAwayXG *= (1 - (match.awayInjuries.length * 0.08));
    if (match.homeInjuries.length > 0) baseHomeXG *= (1 - (match.homeInjuries.length * 0.10));
    if (match.awayInjuries.length > 0) baseAwayXG *= (1 - (match.awayInjuries.length * 0.10));

    let finalHomeExpected = ((baseHomeXG * (1 / awayDefFactor)) + (marketHomeProb * 2.6)) / 2;
    let finalAwayExpected = ((baseAwayXG * (1 / homeDefFactor)) + (marketAwayProb * 2.3)) / 2;
    // חישוב שערים צפויים משוקלל
    let finalHomeExpected = ((baseHomeXG * (1 / awayDefFactor)) + (marketHomeProb * 3.0)) / 2;
    let finalAwayExpected = ((baseAwayXG * (1 / homeDefFactor)) + (marketAwayProb * 2.6)) / 2;

    // --- אלגוריתם פיזור שערים דינמי (פותר את בעיית ה-1-1 הקבוע) ---
    // במקום לעגל פשוט, נבדוק את עוצמת ה-Expected וההפרשים כדי לאפשר פתיחת סקור
    let homeGoals = Math.round(finalHomeExpected);
    let awayGoals = Math.round(finalAwayExpected);

    let homePower = (marketHomeProb * 50) + (match.homeMotivation * 5);
    let awayPower = (marketAwayProb * 50) + (match.awayMotivation * 5);
    const totalPower = homePower + awayPower + 10;
    // אם הציפייה להתקפה גבוהה (מעל 1.6) ויש פער משמעותי, ניתן דחיפה למעלה לתוצאות כמו 3-1, 3-2
    if (finalHomeExpected > 1.65 && finalHomeExpected - finalAwayExpected > 0.3) {
      homeGoals = Math.max(homeGoals, 3);
    }
    if (finalAwayExpected > 1.65 && finalAwayExpected - finalHomeExpected > 0.3) {
      awayGoals = Math.max(awayGoals, 3);
    }

    // במקרה של משחקי קצוות מובהקים (למשל יחס בוקמייקרים נמוך מאוד לקבוצה אחת), פותחים פער ריאליסטי לטופס
    if (match.odds.home < 1.45 && homeGoals <= awayGoals) {
      homeGoals = awayGoals + 2;
    }
    if (match.odds.away < 1.45 && awayGoals <= homeGoals) {
      awayGoals = homeGoals + 2;
    }

    // חישוב אחוזי סיכויים
    let homePower = (marketHomeProb * 55) + (match.homeMotivation * 6);
    let awayPower = (marketAwayProb * 55) + (match.awayMotivation * 6);
    const totalPower = homePower + awayPower + 12;

    const homePercent = Math.round((homePower / totalPower) * 100);
    const awayPercent = Math.round((awayPower / totalPower) * 100);
    const drawPercent = 100 - homePercent - awayPercent;

    if (homePercent - awayPercent > 22 && homeGoals <= awayGoals) homeGoals = awayGoals + 1;
    if (awayPercent - homePercent > 22 && awayGoals <= homeGoals) awayGoals = homeGoals + 1;
    if (homePercent - awayPercent > 20 && homeGoals <= awayGoals) homeGoals = awayGoals + 1;
    if (awayPercent - homePercent > 20 && awayGoals <= homeGoals) awayGoals = homeGoals + 1;

    let recommendation = "תיקו קשוח (X)";
    if (homePercent > awayPercent && homePercent > 41) recommendation = `ניצחון ל${match.homeTeam} (1)`;
    if (awayPercent > homePercent && awayPercent > 41) recommendation = `ניצחון ל${match.awayTeam} (2)`;
    if (homePercent > awayPercent && homePercent > 40) recommendation = `ניצחון ל${match.homeTeam} (1)`;
    if (awayPercent > homePercent && awayPercent > 40) recommendation = `ניצחון ל${match.awayTeam} (2)`;

    return { 
      homePercent, 
@@ -246,7 +268,7 @@
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide text-emerald-400">יוצר חלוקה קלנדרית ומפריד ימי משחק...</p>
          <p className="text-sm font-semibold tracking-wide text-emerald-400">מחשב מחדש פיזור שערים ומסדר ימים כרונולוגית...</p>
        </div>
      </div>
    );
@@ -268,20 +290,25 @@

  const currentPrediction = predictions[selectedMatch?.id] || { homePercent: 33, drawPercent: 34, awayPercent: 33, predictedScore: "0-0", recommendation: "מחשב...", finalHomeXG: "0.0", finalAwayXG: "0.0" };

  // לוגיקה חכמה לקיבוץ המשחקים לפי תאריך
  // קיבוץ המשחקים לפי תאריך
  const groupedMatches = matches.reduce((groups, match) => {
    const date = match.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(match);
    return groups;
  }, {});

  // פתרון בעיית הסדר: מיון של מערך המפתחות (התאריכים) בצורה כרונולוגית לפי המשחק הראשון בכל יום
  const sortedDates = Object.keys(groupedMatches).sort((a, b) => {
    return groupedMatches[a][0].rawTime - groupedMatches[b][0].rawTime;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-4 gap-4">
        <div className="text-center sm:text-right">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            מונדיאל Predictor Pro <span className="text-xs text-slate-500 font-normal">v2.5 (xG Edition)</span>
            מונדיאל Predictor Pro <span className="text-xs text-slate-500 font-normal">v2.6 (Variance Edition)</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">אנליטיקה מתקדמת להימורים טרום-משחק בלבד</p>
        </div>
@@ -295,18 +322,16 @@

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* טור ימני: לוח משחקים - כעת מחולק קטגורית לפי ימים ושעות */}
        {/* טור ימני: לוח משחקים - כעת ממוין פיקס כרונולוגית גם ברמת הימים */}
        <div className="lg:col-span-1 space-y-5 max-h-[60vh] lg:max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
          <h2 className="text-lg font-bold text-slate-300">לוח משחקים לפי ימים ({matches.length})</h2>

          {Object.keys(groupedMatches).map(date => (
          {sortedDates.map(date => (
            <div key={date} className="space-y-2">
              {/* כותרת יום מפרידה */}
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 backdrop-blur border border-slate-700/60 px-3 py-1.5 rounded-lg inline-block shadow-sm">
                📅 משחקי ה-{date}
              </div>

              {/* רשימת המשחקים השייכת לאותו יום */}
              <div className="space-y-2 border-r-2 border-slate-800 pr-2 mr-1">
                {groupedMatches[date].map(match => {
                  const pred = predictions[match.id];
@@ -322,123 +347,123 @@
                    >
                      <div className="flex justify-between items-center text-[11px] mb-1.5">
                        <span className="text-emerald-400 font-semibold font-mono">⏰ {match.time}</span>
                        <span className="font-bold text-slate-400 text-xs">{pred ? pred.predictedScore : ''}</span>
                        <span className="font-bold text-slate-200">{pred ? pred.predictedScore : ''}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-xs md:text-sm gap-2">
                        <span className="truncate max-w-[105px]">{match.homeTeam}</span>
                        <span className="text-slate-600 text-[10px] font-normal">VS</span>
                        <span className="truncate max-w-[105px]">{match.awayTeam}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* טור מרכזי ושמאל: האנליזה */}
        {selectedMatch && (
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 bg-cyan-500 text-slate-950 font-bold text-[10px] px-3 py-1 rounded-br-lg shadow">
                מודל xG + מוטיבציה
              </div>

              <div className="flex justify-around items-center my-4 gap-1">
                <div className="text-center w-1/3">
                  <div className="text-base md:text-xl font-black truncate">{selectedMatch.homeTeam}</div>
                  <div className="text-lg md:text-2xl font-bold text-emerald-400 mt-1">{currentPrediction.homePercent}%</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">xG מחושב: {currentPrediction.finalHomeXG}</div>
                </div>

                <div className="text-center bg-slate-950/70 border border-slate-800 px-3 py-3 rounded-2xl w-1/3 shadow-inner">
                  <div className="text-[9px] font-bold uppercase text-slate-400">תוצאה משוערת</div>
                  <div className="text-2xl md:text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 my-1">
                    {currentPrediction.predictedScore}
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-1 mt-1">תיקו: {currentPrediction.drawPercent}%</div>
                </div>

                <div className="text-center w-1/3">
                  <div className="text-base md:text-xl font-black truncate">{selectedMatch.awayTeam}</div>
                  <div className="text-lg md:text-2xl font-bold text-cyan-400 mt-1">{currentPrediction.awayPercent}%</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">xG מחושב: {currentPrediction.finalAwayXG}</div>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs md:text-sm">
                <span className="text-slate-400">המלצת אלגוריתם לטופס:</span>
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 text-sm md:text-base">
                  {currentPrediction.recommendation}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">מדד מוטיבציה וחשיבות נקודות (1-5)</h4>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[150px]">{selectedMatch.homeTeam}:</span>
                    <span className="font-bold text-emerald-400">{selectedMatch.homeMotivation}</span>
                  </div>
                  <input type="range" min="1" max="5" value={selectedMatch.homeMotivation} onChange={(e) => updateMatchData('homeMotivation', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[150px]">{selectedMatch.awayTeam}:</span>
                    <span className="font-bold text-cyan-400">{selectedMatch.awayMotivation}</span>
                  </div>
                  <input type="range" min="1" max="5" value={selectedMatch.awayMotivation} onChange={(e) => updateMatchData('awayMotivation', parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">סימולטור תרחישי קצה (What-If)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => updateMatchData('scenario', 'normal')} className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${selectedMatch.scenario === 'normal' ? 'bg-slate-900 border-slate-600 text-slate-100 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>☀️ רגיל</button>
                  <button onClick={() => updateMatchData('scenario', 'rain')} className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${selectedMatch.scenario === 'rain' ? 'bg-cyan-950 text-cyan-400 border-cyan-800 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>🌧️ מבול</button>
                  <button onClick={() => updateMatchData('scenario', 'red_card')} className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${selectedMatch.scenario === 'red_card' ? 'bg-rose-950 text-rose-400 border-rose-800 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>🟥 אדום לחוץ</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">יחסים עולמיים עדכניים</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-500 truncate">{selectedMatch.homeTeam}</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.home} onChange={(e) => updateMatchData('odds', e.target.value, 'home')} className="bg-transparent w-full text-center font-mono font-bold text-emerald-400 text-xs focus:outline-none mt-0.5" />
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-500">X (תיקו)</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.draw} onChange={(e) => updateMatchData('odds', e.target.value, 'draw')} className="bg-transparent w-full text-center font-mono font-bold text-slate-300 text-xs focus:outline-none mt-0.5" />
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-500 truncate">{selectedMatch.awayTeam}</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.away} onChange={(e) => updateMatchData('odds', e.target.value, 'away')} className="bg-transparent w-full text-center font-mono font-bold text-cyan-400 text-xs focus:outline-none mt-0.5" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase">מצב פצועים משפיעי xG</h4>
                <div className="flex gap-2">
                  <button onClick={() => { const p = prompt(`שם פצוע ל${selectedMatch.homeTeam}:`); if(p) updateMatchData('homeInjuries', [...selectedMatch.homeInjuries, p]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded-lg transition-colors truncate">+ {selectedMatch.homeTeam.split(' ')[0]}</button>
                  <button onClick={() => { const p = prompt(`שם פצוע ל${selectedMatch.awayTeam}:`); if(p) updateMatchData('awayInjuries', [...selectedMatch.awayInjuries, p]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded-lg transition-colors truncate">+ {selectedMatch.awayTeam.split(' ')[0]}</button>
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
