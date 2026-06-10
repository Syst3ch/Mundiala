import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// מיפוי שמות קבוצות
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
  "Iran": "איראן", "Saudi Arabia": "סעודיה", "Australia": "אוסטליה", "Qatar": "קטאר", "Iraq": "עיראק",
  "UAE": "איחוד האמירויות", "Uzbekistan": "אוזבקיסטן", "China": "סין", "Oman": "עומאן", "Jordan": "ירדן", "New Zealand": "ניו זילנד"
};

const translateTeam = (name) => TEAM_TRANSLATIONS[name] || name;

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [liveHistory, setLiveHistory] = useState({ home: [], away: [], loading: false });

  const predictions = useMemo(() => {
    const newPredictions = {};
    matches.forEach(m => {
      let homeXG = m.homeXG || 1.2;
      let awayXG = m.awayXG || 1.1;
      const motivationDiff = (m.homeMotivation || 3) - (m.awayMotivation || 3);
      homeXG += motivationDiff * 0.12;
      awayXG -= motivationDiff * 0.12;

      const homePercent = Math.min(Math.max(Math.round(40 + (homeXG - awayXG) * 15), 10), 80);
      const awayPercent = Math.min(Math.max(Math.round(40 + (awayXG - homeXG) * 15), 10), 80);
      const drawPercent = 100 - homePercent - awayPercent;

      newPredictions[m.id] = {
        homePercent, drawPercent, awayPercent,
        predictedScore: `${Math.round(homeXG)} - ${Math.round(awayXG)}`,
        recommendation: homePercent > awayPercent ? `ניצחון ל${m.homeTeam}` : `ניצחון ל${m.awayTeam}`
      };
    });
    return newPredictions;
  }, [matches]);

  const chartData = useMemo(() => {
    if (!selectedMatch || !predictions[selectedMatch.id]) return [];
    const p = predictions[selectedMatch.id];
    return [
      { name: selectedMatch.homeTeam, value: p.homePercent, color: '#10b981' },
      { name: 'תיקו', value: p.drawPercent, color: '#64748b' },
      { name: selectedMatch.awayTeam, value: p.awayPercent, color: '#22d3ee' },
    ];
  }, [selectedMatch, predictions]);

  const fetchRealOdds = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_ODDS_API_KEY;
      const response = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`);
      const data = await response.json();
      
      const formattedMatches = data.map((game, index) => ({
        id: game.id || index,
        homeTeamRaw: game.home_team,
        awayTeamRaw: game.away_team,
        homeTeam: translateTeam(game.home_team),
        awayTeam: translateTeam(game.away_team),
        time: new Date(game.commence_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(game.commence_time).toLocaleDateString('he-IL'),
        homeMotivation: 3, awayMotivation: 3,
        homeXG: 1.2, awayXG: 1.1
      }));
      setMatches(formattedMatches);
      if (formattedMatches.length > 0) setSelectedMatch(formattedMatches[0]);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  useEffect(() => { fetchRealOdds(); }, []);

  const updateMatchData = (id, field, value) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-emerald-500">טוען נתונים...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8" dir="rtl">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">מונדיאל Predictor Pro</h1>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {matches.map(m => (
            <button key={m.id} onClick={() => setSelectedMatch(m)} className={`w-full p-4 rounded-xl border ${selectedMatch?.id === m.id ? 'bg-slate-800 border-emerald-500' : 'bg-slate-800/40 border-slate-700'}`}>
              <div className="font-bold">{m.homeTeam} vs {m.awayTeam}</div>
              <div className="text-xs text-slate-400">{m.date} | {m.time}</div>
            </button>
          ))}
        </div>

        {selectedMatch && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-4">סיכויי ניצחון</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center font-bold text-emerald-400 text-lg">
                תוצאה משוערת: {predictions[selectedMatch.id]?.predictedScore}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 p-4 rounded-xl">
                <label className="block text-xs font-bold mb-2">מוטיבציה {selectedMatch.homeTeam}</label>
                <input type="range" min="1" max="5" value={selectedMatch.homeMotivation} onChange={(e) => updateMatchData(selectedMatch.id, 'homeMotivation', parseInt(e.target.value))} className="w-full accent-emerald-500" />
              </div>
              <div className="bg-slate-800 p-4 rounded-xl">
                <label className="block text-xs font-bold mb-2">מוטיבציה {selectedMatch.awayTeam}</label>
                <input type="range" min="1" max="5" value={selectedMatch.awayMotivation} onChange={(e) => updateMatchData(selectedMatch.id, 'awayMotivation', parseInt(e.target.value))} className="w-full accent-cyan-500" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
