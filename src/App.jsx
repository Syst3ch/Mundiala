import { useState, useEffect } from 'react';
import { getCombinedMatchData } from '.src/api';
import { teamNames } from '.src/teams';

export default function App() {
  const [matches, setMatches] = useState([]);

useEffect(() => {
  async function loadData() {
    const cachedData = localStorage.getItem('worldCupMatches');
    const cacheTimestamp = localStorage.getItem('worldCupCacheTime');
    
    // אם יש מידע טרי מהשעה האחרונה - אל תפנה ל-API!
    if (cachedData && (Date.now() - cacheTimestamp < 3600000)) {
      setMatches(JSON.parse(cachedData));
      return;
    }

    // רק אם אין cache, תמשוך מה-API
    const data = await getCombinedMatchData();
    localStorage.setItem('worldCupMatches', JSON.stringify(data));
    localStorage.setItem('worldCupCacheTime', Date.now().toString());
    setMatches(data);
  }
  loadData();
}, []);

  const translate = (name) => teamNames[name] || name;

  return (
    <div className="min-h-screen bg-gray-100 p-6" dir="rtl">
      <h1 className="text-3xl font-bold text-center mb-10">דאשבורד מונדיאל 2026</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => (
          <div key={m.id} className="bg-white p-6 rounded-2xl shadow-lg border-r-4 border-blue-600">
            <div className="flex justify-between font-bold text-lg mb-4">
              <span>{translate(m.homeTeam)}</span>
              <span className="text-gray-400">vs</span>
              <span>{translate(m.awayTeam)}</span>
            </div>
            <div className="mt-4 text-blue-700 font-bold">
              ניבוי: {m.homeXg > m.awayXg ? "ניצחון בית" : "ניצחון חוץ"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
