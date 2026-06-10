// src/App.jsx
import { useState, useEffect } from 'react';
import { getCombinedMatchData } from './api';
import { teamNames } from './utils/teams'; // ייבוא המפה החדשה

export default function App() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    getCombinedMatchData().then(setMatches);
  }, []);

  // פונקציית עזר לתרגום
  const translate = (name) => teamNames[name] || name;

  const grouped = matches.reduce((acc, match) => {
    const date = new Date(match.commenceTime).toLocaleDateString('he-IL');
    (acc[date] = acc[date] || []).push(match);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans" dir="rtl">
      <h1 className="text-3xl font-bold text-center mb-8">מונדיאל 2026 - דאשבורד ניבויים</h1>
      {Object.entries(grouped).map(([date, dailyMatches]) => (
        <section key={date} className="mb-10">
          <h2 className="text-xl font-semibold mb-4 bg-blue-100 p-2 rounded">{date}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailyMatches.map(m => (
              <div key={m.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold">{translate(m.homeTeam)}</span>
                  <span className="text-gray-400">נגד</span>
                  <span className="text-lg font-bold">{translate(m.awayTeam)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>xG בית: {m.homeXg}</span>
                  <span>xG חוץ: {m.awayXg}</span>
                </div>
                <div className="mt-4 pt-4 border-t text-center font-medium text-blue-600">
                  ניבוי: {m.homeXg > m.awayXg ? "ניצחון בית" : "ניצחון חוץ"}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
