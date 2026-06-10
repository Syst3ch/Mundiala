import { useState, useEffect } from 'react';
import { getCombinedMatchData } from '.src/api';
import { teamNames } from '.src/teams';

export default function App() {
  const [matches, setMatches] = useState([]);

useEffect(() => {
  async function fetchTeamData(teamName) {
    // בדיקה ב-Cache לפני פנייה ל-API
    const cached = localStorage.getItem(`team_${teamName}`);
    if (cached) {
      console.log(`Using cache for ${teamName}`);
      return JSON.parse(cached);
    }

    // אם אין ב-Cache, רק אז פונים ל-API
    console.log(`Fetching from API for ${teamName}`);
    const response = await fetch(`https://api-football-v1.p.rapidapi.com/v3/teams?name=${teamName}`, {
       headers: { 'x-rapidapi-key': 'YOUR_KEY' }
    });
    
    const data = await response.json();
    localStorage.setItem(`team_${teamName}`, JSON.stringify(data)); // שמירה ל-Cache
    return data;
  }
  
  // קריאה לפונקציה
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
