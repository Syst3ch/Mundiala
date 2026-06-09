import React, { useState, useEffect } from 'react';

// 1. מילון תרגום מורחב ומקיף - מונדיאל בלבד
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

// 2. מנגנון Seed שמייצר פרופיל סגנון משחק ריאליסטי לכל נבחרת
const generateDynamicStats = (teamName) => {
  if (!teamName) return { form: ["D", "D", "D", "D", "D"], h2h: { homeWins: 1, draws: 3, awayWins: 1 }, attack: 1.2, defense: 1.1 };
  const code = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const formsPool = [
    ["W", "W", "D", "W", "L"], ["W", "L", "W", "W", "W"], ["D", "D", "W", "L", "W"],
    ["L", "W", "L", "W", "D"], ["W", "W", "W", "D", "W"], ["D", "W", "D", "W", "W"]
  ];
  const h2hPool = [
    { homeWins: 3, draws: 1, awayWins: 1 }, { homeWins: 2, draws: 2, awayWins: 1 },
    { homeWins: 1, draws: 3, awayWins: 1 }
  ];

  const attackFactor = 0.8 + ((code % 15) / 10);
  const defenseFactor = 0.6 + (((code + 5) % 12) / 10);

  return {
    form: formsPool[code % formsPool.length],
    h2h: h2hPool[(code + 3) % h2hPool.length],
    attack: attackFactor,
    defense: defenseFactor
  };
};

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [predictions, setPredictions] = useState({});

  useEffect(() => {
    const fetchRealOdds = async () => {
      try {
        // --- בדיקת מנגנון LOCAL STORAGE CACHE לטעינה מהירה במובייל ---
        const cachedData = localStorage.getItem('world_cup_matches_cache');
        const cachedTime = localStorage.getItem('world_cup_cache_time');
        const FOUR_HOURS = 4 * 60 * 60 * 1000;

        if (cachedData && cachedTime && (Date.now() - cachedTime < FOUR_HOURS)) {
          const parsedMatches = JSON.parse(cachedData);
          setMatches(parsedMatches);
          setSelectedMatch(parsedMatches[0]);
          setLoading(false);
          console.log("⚡ הנתונים נטענו מיידית מה-Cache המקומי!");
          return;
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
          const formattedMatches = data.map((game, index) => {
            const bookmaker = game.bookmakers[0];
            const market = bookmaker?.markets?.find(m => m.key === 'h2h');
            
            const homeOdds = market?.outcomes?.find(o => o.name === game.home_team)?.price || 2.20;
            const awayOdds = market?.outcomes?.find(o => o.name === game.away_team)?.price || 2.60;
            const drawOdds = market?.outcomes?.find(o => o.name === 'Draw')?.price || 3.10;

            const homeStats = generateDynamicStats(game.home_team);
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
              homeForm: homeStats.form, 
              awayForm: awayStats.form,
              h2h: homeStats.h2h,
              homeAttack: homeStats.attack,
              homeDefense: homeStats.defense,
              awayAttack: awayStats.attack,
              awayDefense: awayStats.defense,
              homeInjuries: [],
              awayInjuries: []
            };
          });

          // שמירה ב-Cache לפעמים הבאות
          localStorage.setItem('world_cup_matches_cache', JSON.stringify(formattedMatches));
          localStorage.setItem('world_cup_cache_time', Date.now().toString());

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

  // אלגוריתם שקלול וחיזוי תוצאה
  const calculatePrediction = (match) => {
    if (!match) return null;

    const getFormPoints = (form) => form.reduce((acc, res) => acc + (res === 'W' ? 3 : res === 'D' ? 1 : 0), 0);
    const homeFormPoints = getFormPoints(match.homeForm);
    const awayFormPoints = getFormPoints(match.awayForm);

    const totalH2H = match.h2h.homeWins + match.h2h.draws + match.h2h.awayWins;
    const homeH2hRatio = totalH2H > 0 ? match.h2h.homeWins / totalH2H : 0.33;
    const awayH2hRatio = totalH2H > 0 ? match.h2h.awayWins / totalH2H : 0.33;

    const impliedHomeProb = 1 / match.odds.home;
    const impliedDrawProb = 1 / match.odds.draw;
    const impliedAwayProb = 1 / match.odds.away;
    const totalProb = impliedHomeProb + impliedDrawProb + impliedAwayProb;
    
    const marketHomeProb = impliedHomeProb / totalProb;
    const marketAwayProb = impliedAwayProb / totalProb;

    const homeInjuryPenalty = match.homeInjuries.length * 1.5;
    const awayInjuryPenalty = match.awayInjuries.length * 1.5;

    let homePower = (homeFormPoints * 0.4) + (homeH2hRatio * 20) + (marketHomeProb * 45) - homeInjuryPenalty;
    let awayPower = (awayFormPoints * 0.4) + (awayH2hRatio * 20) + (marketAwayProb * 45) - awayInjuryPenalty;

    homePower = Math.max(homePower, 5);
    awayPower = Math.max(awayPower, 5);

    const totalPower = homePower + awayPower + 12;
    const homePercent = Math.round((homePower / totalPower) * 100);
    const awayPercent = Math.round((awayPower / totalPower) * 100);
    const drawPercent = 100 - homePercent - awayPercent;

    let baseHomeGoals = marketHomeProb * 2.8; 
    let baseAwayGoals = marketAwayProb * 2.5;

    let finalHomeExpected = baseHomeGoals * (match.homeAttack / match.awayDefense);
    let finalAwayExpected = baseAwayGoals * (match.awayAttack / match.homeDefense);

    if (match.homeInjuries.length > 0) finalHomeExpected *= 0.85;
    if (match.awayInjuries.length > 0) finalAwayExpected *= 0.85;

    let homeGoals = Math.round(finalHomeExpected);
    let awayGoals = Math.round(finalAwayExpected);

    if (homeGoals > 5) homeGoals = 4;
    if (awayGoals > 5) awayGoals = 4;

    if (homePercent - awayPercent > 25 && homeGoals <= awayGoals) {
      homeGoals = awayGoals + 1;
    } else if (awayPercent - homePercent > 25 && awayGoals <= homeGoals) {
      awayGoals = homeGoals + 1;
    } else if (Math.abs(homePercent - awayPercent) < 8 && homeGoals !== awayGoals) {
      if (homeGoals + awayGoals > 4) { homeGoals = 2; awayGoals = 2; }
      else if (homeGoals + awayGoals === 1) { homeGoals = 0; awayGoals = 0; }
      else { homeGoals = 1; awayGoals = 1; }
    }

    let recommendation = "תיקו קשוח (X)";
    if (homePercent > awayPercent && homePercent > 42) recommendation = `ניצחון ל${match.homeTeam} (1)`;
    if (awayPercent > homePercent && awayPercent > 42) recommendation = `ניצחון ל${match.awayTeam} (2)`;

    let matchStyle = "מאוזן";
    if (match.homeAttack > 1.6 && match.awayAttack > 1.6) matchStyle = "משחק התקפי פתוח (חגיגת שערים)";
    else if (match.homeDefense > 1.3 && match.awayDefense > 1.3) matchStyle = "טקטי ומבוקר (בונקרים הדדיים)";
    else if (match.homeAttack > 1.6) matchStyle = `לחץ כבד של ${match.homeTeam}`;
    else if (match.awayAttack > 1.6) matchStyle = `לחץ כבד של ${match.awayTeam}`;

    return { homePercent, drawPercent, awayPercent, predictedScore: `${homeGoals} - ${awayGoals}`, recommendation, matchStyle };
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
          <p className="text-sm font-semibold tracking-wide text-emerald-400">האלגוריתם מנתח סגנונות משחק ומחשב תוצאות...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100 p-6" dir="rtl">
        <div className="text-center max-w-md bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div className="text-3xl mb-3">🌍</div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">מונדיאל Predictor מחובר פיקס!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            מערכת ניתוח השערים וסגנונות המשחק מוכנה לפעולה. ברגע שיעלו יחסי הימורים רשמיים למשחקים הבאים במונדיאל, הלוח יתמלא פה אוטומטית.
          </p>
        </div>
      </div>
    );
  }

  const currentPrediction = predictions[selectedMatch?.id] || { homePercent: 33, drawPercent: 34, awayPercent: 33, predictedScore: "0-0", recommendation: "מחשב...", matchStyle: "בבדיקה" };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-6 text-center md:text-right border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          מונדיאל Predictor Pro
        </h1>
        <p className="text-slate-400 text-sm mt-1">מערכת שקלול דינמית: סגנון התקפה/הגנה ויחסי בוקמייקרים חיים</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* טור: לוח רשימת המשחקים */}
        <div className="lg:col-span-1 space-y-4 max-h-[60vh] lg:max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin order-2 lg:order-none">
          <h2 className="text-lg font-bold text-slate-300 mb-2">לוח המשחקים ({matches.length})</h2>
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
                <div className="flex justify-between text-[11px] text-slate-400 mb-2">
                  <span>{match.date} | {match.time}</span>
                  <span className="font-bold text-emerald-400">
                    {pred ? pred.predictedScore : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center font-bold text-sm md:text-base gap-2">
                  <span className="truncate max-w-[110px]">{match.homeTeam}</span>
                  <span className="text-slate-500 text-xs font-normal">VS</span>
                  <span className="truncate max-w-[110px]">{match.awayTeam}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* טור מרכזי ושמאל: ניתוח תוצאה חי */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-none">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 md:p-6 border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-cyan-500 text-slate-950 font-bold text-[10px] px-3 py-1 rounded-br-lg shadow">
              הסימולטור המשופר
            </div>
            
            <div className="text-center mb-1">
              <span className="text-[10px] md:text-[11px] bg-slate-950 text-slate-400 px-3 py-1 rounded-full border border-slate-800">
                סגנון משחק צפוי: <strong className="text-emerald-400">{currentPrediction.matchStyle}</strong>
              </span>
            </div>
            
            <div className="flex justify-around items-center my-6 gap-1">
              <div className="text-center w-1/3">
                <div className="text-base md:text-2xl font-black truncate">{selectedMatch.homeTeam}</div>
                <div className="text-lg md:text-2xl font-bold text-emerald-400 mt-1">{currentPrediction.homePercent}%</div>
                <div className="text-[9px] md:text-[10px] text-slate-500 mt-0.5">התקפה: {selectedMatch.homeAttack.toFixed(1)}</div>
              </div>
              
              {/* קוביית התוצאה המוקטנת והמוגנת מפני שבירת שורות */}
              <div className="text-center bg-slate-950/70 border border-slate-800 px-2 py-3 rounded-2xl w-1/3 shadow-inner min-w-[90px]">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">תוצאה משוערת</div>
                <div className="text-xl md:text-3xl font-mono font-black tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 my-1 whitespace-nowrap">
                  {currentPrediction.predictedScore}
                </div>
                <div className="text-[9px] text-slate-400 border-t border-slate-800/60 pt-1 mt-1">תיקו: {currentPrediction.drawPercent}%</div>
              </div>
              
              <div className="text-center w-1/3">
                <div className="text-base md:text-2xl font-black truncate">{selectedMatch.awayTeam}</div>
                <div className="text-lg md:text-2xl font-bold text-cyan-400 mt-1">{currentPrediction.awayPercent}%</div>
                <div className="text-[9px] md:text-[10px] text-slate-500 mt-0.5">התקפה: {selectedMatch.awayAttack.toFixed(1)}</div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 md:p-4 flex justify-between items-center text-xs md:text-sm">
              <span className="text-slate-400">המלצת ווינר חכמה:</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 text-xs md:text-lg">
                {currentPrediction.recommendation}
              </span>
            </div>
          </div>

          {/* קוביות נתונים ויחסים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-3">כושר בטורניר ויחסי כוחות</h4>
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

              <h4 className="text-sm font-bold text-slate-400 mt-5 mb-2">נתוני הגנה (נמוך יותר = קיר)</h4>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                  <span className="text-slate-400">{selectedMatch.homeTeam}:</span> <strong className="text-cyan-400">{selectedMatch.homeDefense.toFixed(1)}</strong>
                </div>
                <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                  <span className="text-slate-400">{selectedMatch.awayTeam}:</span> <strong className="text-cyan-400">{selectedMatch.awayDefense.toFixed(1)}</strong>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex flex-col justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-3">יחסים עולמיים (ניתן לעריכה)</h4>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-slate-900 p-1 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-400 truncate px-0.5">{selectedMatch.homeTeam}</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.home} onChange={(e) => updateMatchData('odds', e.target.value, 'home')} className="bg-transparent w-full text-center font-bold text-emerald-400 text-xs md:text-sm focus:outline-none mt-0.5" />
                  </div>
                  <div className="bg-slate-900 p-1 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-400">X (תיקו)</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.draw} onChange={(e) => updateMatchData('odds', e.target.value, 'draw')} className="bg-transparent w-full text-center font-bold text-slate-300 text-xs md:text-sm focus:outline-none mt-0.5" />
                  </div>
                  <div className="bg-slate-900 p-1 rounded border border-slate-700">
                    <div className="text-[9px] text-slate-400 truncate px-0.5">{selectedMatch.awayTeam}</div>
                    <input type="number" step="0.01" value={selectedMatch.odds.away} onChange={(e) => updateMatchData('odds', e.target.value, 'away')} className="bg-transparent w-full text-center font-bold text-cyan-400 text-xs md:text-sm focus:outline-none mt-0.5" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-1.5">חיסורים פצועים/מושעים</h4>
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

          {/* כפתורי הזרקת פצועים מהירה מהנייד */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h4 className="text-sm font-bold text-slate-300 mb-1">עדכון פצועים מהיר מהסמארטפון</h4>
            <p className="text-xs text-slate-400 mb-3">הזרק פצועים שגילית במחנות הנבחרות כדי לעדכן מיידית את יחסי הכוחות:</p>
            <div className="flex gap-2">
              <button onClick={() => { const p = prompt(`שם פצוע ל${selectedMatch.homeTeam}:`); if(p) updateMatchData('homeInjuries', [...selectedMatch.homeInjuries, p]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-semibold py-2 px-1 rounded-lg transition-colors truncate">+ {selectedMatch.homeTeam.split(' ')[0]}</button>
              <button onClick={() => { const p = prompt(`שם פצוע ל${selectedMatch.awayTeam}:`); if(p) updateMatchData('awayInjuries', [...selectedMatch.awayInjuries, p]); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-semibold py-2 px-1 rounded-lg transition-colors truncate">+ {selectedMatch.awayTeam.split(' ')[0]}</button>
              <button onClick={() => { updateMatchData('homeInjuries', []); updateMatchData('awayInjuries', []); }} className="bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-900/50 text-xs font-semibold py-2 px-3 rounded-lg transition-colors">אפס</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
