import React, { useEffect, useMemo, useState } from 'react';

const TEAM_TRANSLATIONS = {
  "Argentina": "ארגנטינה", "Australia": "אוסטרליה", "Austria": "אוסטריה", "Belgium": "בלגיה",
  "Brazil": "ברזיל", "Canada": "קנדה", "Chile": "צ'ילה", "Colombia": "קולומביה",
  "Costa Rica": "קוסטה ריקה", "Croatia": "קרואטיה", "Denmark": "דנמרק", "Ecuador": "אקוודור",
  "Egypt": "מצרים", "England": "אנגליה", "France": "צרפת", "Germany": "גרמניה", "Ghana": "גאנה",
  "Greece": "יוון", "Iran": "איראן", "Iraq": "עיראק", "Italy": "איטליה", "Japan": "יפן",
  "Mexico": "מקסיקו", "Morocco": "מרוקו", "Netherlands": "הולנד", "New Zealand": "ניו זילנד",
  "Nigeria": "ניגריה", "Norway": "נורבגיה", "Panama": "פנמה", "Paraguay": "פרגוואי",
  "Peru": "פרו", "Poland": "פולין", "Portugal": "פורטוגל", "Qatar": "קטאר", "Saudi Arabia": "סעודיה",
  "Scotland": "סקוטלנד", "Senegal": "סנגל", "Serbia": "סרביה", "South Africa": "דרום אפריקה",
  "South Korea": "דרום קוריאה", "Spain": "ספרד", "Sweden": "שבדיה", "Switzerland": "שוויץ",
  "Tunisia": "תוניסיה", "Turkey": "טורקיה", "Ukraine": "אוקראינה", "Uruguay": "אורוגוואי",
  "USA": "ארה\"ב", "United States": "ארה\"ב", "Uzbekistan": "אוזבקיסטן", "Wales": "ויילס"
};

// 48 נבחרות לתצוגה קבועה. אפשר להחליף/לעדכן כשיש העפלות סופיות.
const WORLD_CUP_48_TEAMS = [
  "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Canada", "Chile", "Colombia",
  "Costa Rica", "Croatia", "Denmark", "Ecuador", "Egypt", "England", "France", "Germany",
  "Ghana", "Greece", "Iran", "Iraq", "Italy", "Japan", "Mexico", "Morocco",
  "Netherlands", "New Zealand", "Nigeria", "Norway", "Panama", "Paraguay", "Peru", "Poland",
  "Portugal", "Qatar", "Saudi Arabia", "Scotland", "Senegal", "Serbia", "South Africa", "South Korea",
  "Spain", "Sweden", "Switzerland", "Tunisia", "Turkey", "Ukraine", "Uruguay", "USA",
];

const translateTeam = (name) => TEAM_TRANSLATIONS[name] || name;

const getOutcomeType = (teamGoals, opponentGoals) => {
  if (teamGoals > opponentGoals) return 'W';
  if (teamGoals < opponentGoals) return 'L';
  return 'D';
};

const normalizeEventForTeam = (event, teamId) => {
  const home = event?.homeTeam || event?.home || event?.teams?.home;
  const away = event?.awayTeam || event?.away || event?.teams?.away;
  const homeScore = event?.homeScore?.current ?? event?.goals?.home ?? event?.score?.home ?? null;
  const awayScore = event?.awayScore?.current ?? event?.goals?.away ?? event?.score?.away ?? null;
  const isHome = String(home?.id) === String(teamId);

  const teamGoals = isHome ? homeScore : awayScore;
  const opponentGoals = isHome ? awayScore : homeScore;
  const opponent = isHome ? away?.name : home?.name;

  return {
    id: event?.id,
    date: event?.startTimestamp ? new Date(event.startTimestamp * 1000).toLocaleDateString('he-IL') : '',
    opponent: translateTeam(opponent || 'לא ידוע'),
    score: teamGoals !== null && opponentGoals !== null ? `${teamGoals} - ${opponentGoals}` : '-',
    type: teamGoals !== null && opponentGoals !== null ? getOutcomeType(teamGoals, opponentGoals) : 'D',
    tournament: event?.tournament?.name || event?.league?.name || '',
  };
};

export default function App() {
  const [teamsData, setTeamsData] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rapidApiKey = import.meta.env.VITE_SOFASCORE_KEY;
  const rapidApiHost = import.meta.env.VITE_SOFASCORE_HOST || 'sofascore.p.rapidapi.com';

  const initialTeams = useMemo(() => WORLD_CUP_48_TEAMS.map((name, index) => ({
    index: index + 1,
    nameRaw: name,
    nameHe: translateTeam(name),
    sofaId: null,
    lastMatches: [],
    loading: false,
    status: 'ממתין למשיכה',
  })), []);

  useEffect(() => {
    setTeamsData(initialTeams);
    setSelectedTeam(initialTeams[0]);
  }, [initialTeams]);

  const rapidHeaders = {
    'X-RapidAPI-Key': rapidApiKey,
    'X-RapidAPI-Host': rapidApiHost,
  };

  const fetchJson = async (url, headers = {}) => {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  };

  const findTeamOnSofaScore = async (teamName) => {
    if (!rapidApiKey) throw new Error('חסר VITE_SOFASCORE_KEY בקובץ .env');

    // כמה נתיבי RapidAPI נפוצים. השארתי fallback כדי שלא תיפול אם שם endpoint שונה בחשבון שלך.
    const candidates = [
      `https://${rapidApiHost}/teams/search?name=${encodeURIComponent(teamName)}`,
      `https://${rapidApiHost}/search?query=${encodeURIComponent(teamName)}`,
      `https://${rapidApiHost}/search/all?q=${encodeURIComponent(teamName)}`,
    ];

    for (const url of candidates) {
      try {
        const data = await fetchJson(url, rapidHeaders);
        const list = data?.teams || data?.response || data?.results || data?.data || data?.entities || [];
        const flatList = Array.isArray(list) ? list : [];
        const team = flatList.find(item => {
          const candidate = item?.team || item?.entity || item;
          const name = candidate?.name || candidate?.shortName || '';
          return name.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(name.toLowerCase());
        });
        const cleanTeam = team?.team || team?.entity || team;
        if (cleanTeam?.id) return cleanTeam;
      } catch (_) {
        // ממשיך ל-endpoint הבא
      }
    }

    throw new Error(`לא נמצא מזהה SofaScore עבור ${teamName}`);
  };

  const fetchLastMatches = async (teamId) => {
    const candidates = [
      `https://${rapidApiHost}/teams/get-events?teamId=${teamId}&page=0`,
      `https://${rapidApiHost}/team/${teamId}/events/last/0`,
      `https://${rapidApiHost}/teams/events?teamId=${teamId}&page=0`,
    ];

    for (const url of candidates) {
      try {
        const data = await fetchJson(url, rapidHeaders);
        const events = data?.events || data?.response || data?.data || [];
        if (Array.isArray(events) && events.length) {
          return events.slice(0, 5).map(event => normalizeEventForTeam(event, teamId));
        }
      } catch (_) {
        // ממשיך ל-endpoint הבא
      }
    }

    return [];
  };

  const loadTeamData = async (team) => {
    setTeamsData(prev => prev.map(t => t.nameRaw === team.nameRaw ? { ...t, loading: true, status: 'מושך נתונים...' } : t));

    try {
      const sofaTeam = await findTeamOnSofaScore(team.nameRaw);
      const lastMatches = await fetchLastMatches(sofaTeam.id);
      const updatedTeam = {
        ...team,
        sofaId: sofaTeam.id,
        nameRaw: sofaTeam.name || team.nameRaw,
        nameHe: translateTeam(sofaTeam.name || team.nameRaw),
        lastMatches,
        loading: false,
        status: lastMatches.length ? 'עודכן מה-API' : 'נמצא מזהה, אין משחקים אחרונים',
      };

      setTeamsData(prev => prev.map(t => t.index === team.index ? updatedTeam : t));
      setSelectedTeam(updatedTeam);
    } catch (err) {
      setTeamsData(prev => prev.map(t => t.index === team.index ? { ...t, loading: false, status: err.message } : t));
    }
  };

  const loadAllTeams = async () => {
    setLoading(true);
    setError('');

    try {
      // משיכה מדורגת כדי לא להפיל rate limit של RapidAPI.
      for (const team of teamsData) {
        // eslint-disable-next-line no-await-in-loop
        await loadTeamData(team);
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    } catch (err) {
      setError(err.message || 'שגיאה כללית במשיכת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const selected = selectedTeam || teamsData[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8" dir="rtl">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-emerald-400">מונדיאל Predictor Pro</h1>
          <p className="text-sm text-slate-400 mt-1">48 נבחרות - נתוני SofaScore API לכל נבחרת: מזהה, משחקים אחרונים ותוצאות</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAllTeams}
            disabled={loading}
            className="bg-emerald-500 disabled:bg-slate-700 text-slate-950 font-bold px-4 py-2 rounded-xl"
          >
            {loading ? 'מושך נתונים...' : 'משוך נתונים לכל 48 הנבחרות'}
          </button>
        </div>
      </header>

      {error && <div className="max-w-7xl mx-auto bg-rose-950 text-rose-200 border border-rose-800 rounded-xl p-3 mb-4">{error}</div>}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1 bg-slate-800/50 rounded-2xl border border-slate-700 p-3 max-h-[78vh] overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 mb-3">רשימת 48 נבחרות</div>
          <div className="space-y-2">
            {teamsData.map(team => (
              <button
                key={team.index}
                onClick={() => { setSelectedTeam(team); if (!team.sofaId && !team.loading) loadTeamData(team); }}
                className={`w-full text-right p-3 rounded-xl border transition ${selected?.index === team.index ? 'bg-slate-900 border-emerald-500' : 'bg-slate-900/40 border-slate-700 hover:border-slate-500'}`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-bold">{team.index}. {team.nameHe}</span>
                  <span className="text-[11px] text-slate-400">ID: {team.sofaId || '-'}</span>
                </div>
                <div className={`text-[11px] mt-1 ${team.status === 'עודכן מה-API' ? 'text-emerald-400' : 'text-slate-500'}`}>{team.loading ? 'טוען...' : team.status}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2 space-y-5">
          {selected && (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-700 pb-4 mb-4">
                <div>
                  <h2 className="text-2xl font-black">{selected.nameHe}</h2>
                  <p className="text-sm text-slate-400">שם API: {selected.nameRaw} | SofaScore ID: {selected.sofaId || '-'}</p>
                </div>
                <button
                  onClick={() => loadTeamData(selected)}
                  disabled={selected.loading}
                  className="bg-cyan-500 disabled:bg-slate-700 text-slate-950 font-bold px-4 py-2 rounded-xl"
                >
                  {selected.loading ? 'מעדכן...' : 'רענן נבחרת'}
                </button>
              </div>

              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">5 משחקים אחרונים מה-API</h3>
              <div className="space-y-2">
                {selected.lastMatches?.length ? selected.lastMatches.map((match, i) => (
                  <div key={`${match.id || i}`} className="bg-slate-900/70 border border-slate-700 rounded-xl p-3 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-bold">נגד {match.opponent}</div>
                      <div className="text-xs text-slate-500">{match.date} {match.tournament ? `| ${match.tournament}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-lg">{match.score}</span>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${match.type === 'W' ? 'bg-emerald-950 text-emerald-400' : match.type === 'L' ? 'bg-rose-950 text-rose-400' : 'bg-slate-700 text-slate-300'}`}>{match.type}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-slate-500 text-sm bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                    עדיין אין נתונים לנבחרת הזו. לחץ “רענן נבחרת” או “משוך נתונים לכל 48 הנבחרות”.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
