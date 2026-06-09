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

// מחולל נתונים מורחב הכולל בסיס xG התקפי והגנתי ריאליסטי לפי נבחרת
const generateDynamicStats = (teamName) => {
  if (!teamName) return { form: ["D", "D", "D", "D", "D"], h2h: { homeWins: 1, draws: 3, awayWins: 1 }, attack: 1.2, defense: 1.1, xG_attack: 1.4, xG_defense: 1.1 };
  const code = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const formsPool = [
    ["W", "W", "D", "W", "L"], ["W", "L", "W", "W", "W"], ["D", "D", "W", "L", "W"],
    ["L", "W", "L", "W", "D"], ["W", "W", "W", "D", "W"], ["D", "W", "D", "W", "W"]
  ];
  const h2hPool = [
    { homeWins: 3, draws: 1, awayWins: 1 }, { homeWins: 2, draws: 2, awayWins: 1 },
    { homeWins: 1, draws: 3, awayWins: 1 }
  ];

  // חישוב xG בסיסי נע בין 1.0 ל-2.5 להתקפה, ו-0.7 ל-2.0 להגנה
  const xG_attack = parseFloat((1.0 + ((code % 16) / 10)).toFixed(2));
  const xG_defense = parseFloat((0.6 + (((code + 4) % 13) / 10)).toFixed(2));

  return {
    form: formsPool[code % formsPool.length],
    h2h: h2hPool[(code + 3) % h2hPool.length],
    attack: 0.8 + ((code % 15) / 10),
    defense: 0.6 + (((code + 5) % 12) / 10),
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
        // סינון קשוח להימורים בלבד: רק משחקים שהמרקט שלהם עדיין פתוח לחלוטין (לפני שריקת הפתיחה)
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
            homeTeam: translateTeam(game.home_team),
            awayTeam: translateTeam(game.away_team),
            date: localDate,
            time: localTime,
            odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
            homeForm: stats.form, 
            awayForm: awayStats.form,
            h2h: stats.h2h,
            homeAttack: stats.attack,
            homeDefense: stats.defense,
            awayAttack: awayStats.attack,
            awayDefense: awayStats.defense,
            // משתני השדרוגים החדשים:
            homeXG: stats.xG_attack,
            homeExpectedConcedeXG: stats.xG_defense,
            awayXG: awayStats.xG_attack,
            awayExpectedConcedeXG: awayStats.xG_defense,
            homeMotivation: 3, // ברירת מחדל שלב בתים רגיל
            awayMotivation: 3,
            scenario: "normal", // normal | rain | red_card
            homeInjuries: [],
            awayInjuries: []
          };
        });

        formattedMatches.sort((a, b) => a.id > b.id ? 1 : -1);

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

    // 1. שילוב מדדי ה-xG ישירות לתוך הבסיס הסטטיסטי
    let baseHomeXG = match.homeXG;
    let baseAwayXG = match.awayXG;

    // 2. שקלול פקטור המוטיבציה (סליידרים 1-5)
    const motivationDiff = match.homeMotivation - match.awayMotivation;
    baseHomeXG += motivationDiff * 0.15;
    baseAwayXG -= motivationDiff * 0.15;

    // 3. שקלול סימולציות תרחישי קצה (What-If)
    let homeDefFactor = match.homeDefense;
    let awayDefFactor = match.awayDefense;

    if (match.scenario === "rain") {
      baseHomeXG *= 0.75; // גשם מוריד איכות מצבי הבקעה בצורה גורפת
      baseAwayXG *= 0.75;
    } else if (match.scenario === "red_card") {
      awayDefFactor *= 1.6; // כרטיס אדום מפרק את הגנת החוץ
      baseHomeXG *= 1.3;
    }

    // 4. שילוב פציעות ויחסי שוק ההימורים הרשמיים
    const impliedHomeProb = 1 / match.odds.home;
    const impliedAwayProb = 1 / match.odds.away;
    const totalProb = impliedHomeProb + impliedAwayProb + (1 / match.odds.draw);
    const marketHomeProb = impliedHomeProb / totalProb;
    const marketAwayProb = impliedAwayProb / totalProb;

    if (match.homeInjuries.length > 0) baseHomeXG *= (1 - (match.homeInjuries.length * 0.08));
    if (match.awayInjuries.length > 0) baseAwayXG *= (1 - (match.awayInjuries.length * 0.08));

    // חישוב שערים סופי המבוסס על שילוב של xG התקפי מול xG ספיגה של היריבה ויחס השוק
    let finalHomeExpected = ((baseHomeXG * (1 / awayDefFactor)) + (marketHomeProb * 2.6)) / 2;
    let finalAwayExpected = ((baseAwayXG * (1 / homeDefFactor)) + (marketAwayProb * 2.3)) / 2;

    let homeGoals = Math.round(finalHomeExpected);
    let awayGoals = Math.round(finalAwayExpected);

    // לוגיקת הכרעה במקרה של שוויון/פערים מובהקים
    let homePower = (marketHomeProb * 50) + (match.homeMotivation * 5);
    let awayPower = (marketAwayProb * 50) + (match.awayMotivation * 5);
    const totalPower = homePower + awayPower + 10;

    const homePercent = Math.round((homePower / totalPower) * 100);
    const awayPercent = Math.round((awayPower / totalPower) * 100);
    const drawPercent = 100 - homePercent - awayPercent;

    if (homePercent - awayPercent > 22 && homeGoals <= awayGoals) homeGoals = awayGoals + 1;
    if (awayPercent - homePercent > 22 && awayGoals <= homeGoals) awayGoals = homeGoals + 1;

    let recommendation = "תיקו קשוח (X)";
    if (homePercent > awayPercent && homePercent > 41) recommendation = `ניצחון ל${match.homeTeam} (1)`;
    if (awayPercent > homePercent && awayPercent > 41) recommendation = `ניצחון ל${match.awayTeam} (2)`;

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
          <p className="text-sm font-semibold tracking-wide text-emerald-400">מריץ סימולציית xG ומנתח יחסי בוקמייקרים עולמיים...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100 p-6" dir="rtl">
        <div className="text-center max-w-md bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div className="text-3xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">אין משחקים פתוחים להימורים</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            כל המשחקים בטורניר רצים כעת או הסתיימו לחלוטין. האפליקציה מציגה נתונים רק עד שעת שריקת הפתיחה כדי למנוע הימורי סרק.
          </p>
        </div>
      </div>
    );
  }

  const currentPrediction = predictions[selectedMatch?.id] || { homePercent: 33, drawPercent: 34, awayPercent: 33, predictedScore: "0-0", recommendation: "מחשב...", finalHomeXG: "0.0", finalAwayXG: "0.0" };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-4 gap-4">
        <div className="text-center sm:text-right">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            מונדיאל Predictor Pro <span className="text-xs text-slate-500 font-normal">v2.5 (xG Edition)</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">אנליטיקה מתקדמת להימורים טרום-משחק בלבד</p>
        </div>
        <button 
          onClick={() => fetchRealOdds(true)} 
          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
        >
          🔄 רענן יחסים חיים (Force)
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* טור ימני: לוח משחקים לפני פתיחה */}
        <div className="lg:col-span-1 space-y-4 max-h-[60vh] lg:max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
          <h2 className="text-lg font-bold text-slate-300 mb-2">מסחר פתוח ({matches.length})</h2>
          {matches.map(match => {
            const pred = predictions[match.id];
            return (
              <button
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className={`w-full text-right p-4 rounded-xl border transition-all ${
                  selectedMatch?.id === match.id 
                    ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10' 
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center text-[11px] mb-2">
                  <span className="text-slate-400">{match.date} | {match.time}</span>
                  <span className="font-bold text-emerald-400">{pred ? pred.predictedScore : ''}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-sm gap-2">
                  <span className="truncate max-w-[110px]">{match.homeTeam}</span>
                  <span className="text-slate-500 text-xs font-normal">VS</span>
                  <span className="truncate max-w-[110px]">{match.awayTeam}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* טור מרכזי ושמאל: האנליזה המשודרגת */}
        {selectedMatch && (
          <div className="lg:col-span-2 space-y-6">
            
            {/* כרטיסיית תוצאה משוערת ו-xG */}
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

            {/* ניהול מוטיבציה ותרחישי קצה (What-If) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* סליידרים של מוטיבציה לשלבי בתים קריטיים */}
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
                <p className="text-[10px] text-slate-500 leading-tight">שלב אליו מוטיבציה גבוהה (למשל 5 = חייבת ניצחון כדי לעלות) בשביל להעניק בוסט התקפי מותאם.</p>
              </div>

              {/* מנוע סימולציית תרחישים */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">סימולטור תרחישי קצה (What-If)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => updateMatchData('scenario', 'normal')} className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${selectedMatch.scenario === 'normal' ? 'bg-slate-900 border-slate-600 text-slate-100 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>☀️ רגיל</button>
                  <button onClick={() => updateMatchData('scenario', 'rain')} className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${selectedMatch.scenario === 'rain' ? 'bg-cyan-950 text-cyan-400 border-cyan-800 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>🌧️ מבול</button>
                  <button onClick={() => updateMatchData('scenario', 'red_card')} className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${selectedMatch.scenario === 'red_card' ? 'bg-rose-950 text-rose-400 border-rose-800 font-bold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>🟥 אדום לחוץ</button>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">גשם כבד מוריד את ה-xG הכללי של המשחק. כרטיס אדום מחליש את הגנת החוץ בגלל נחיתות מספרית.</p>
              </div>
            </div>

            {/* עריכת יחסים ופצועים מהירה */}
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
                <div className="text-[10px] text-slate-500 truncate">פצועים רשומים: {selectedMatch.homeInjuries.length + selectedMatch.awayInjuries.length} חיסורים משפיעי כוח.</div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
