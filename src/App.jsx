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

const SOFASCORE_TEAM_IDS = {
  // אירופה (UEFA)
  "צרפת": 4481, "אנגליה": 4433, "ספרד": 4698, "גרמניה": 4711, "פורטוגל": 4704,
  "ההולנד": 4705, "הולנד": 4705, "איטליה": 4699, "בלגיה": 4714, "קרואטיה": 4715, 
  "דנמרק": 4483, "שוויץ": 4695, "אוסטריה": 4432, "אוקראינה": 4492, "טורקיה": 4758, 
  "פולין": 4703, "הונגריה": 4700, "שבדיה": 4706, "נורבגיה": 4702, "צ'כיה": 4482, 
  "סקוטלנד": 4435, "ויילס": 4436, "יוון": 4484, "סרביה": 4712, "רומניה": 4701,

  // דרום אמריקה (CONMEBOL)
  "ארגנטינה": 4819, "ברזיל": 4820, "אורוגוואי": 4825, "קולומביה": 4821, 
  "אקוודור": 4822, "פרו": 4824, "צ'ילה": 4823, "פרגוואי": 4826, "ונצואלה": 4827, "בוליביה": 4828,

  // צפון ומרכז אמריקה (CONCACAF)
  "ארה\"ב": 4767, "ארצות הברית": 4767, "מקסיקו": 4784, "קנדה": 4766, 
  "קוסטה ריקה": 4780, "פנמה": 4785, "ג'מייקה": 4783, "הונדורס": 4782, 
  "אל סלבדור": 4781, "גואטמלה": 4769, "טרינידד וטובגו": 4786, "קוראסאו": 4768,
  "האיטי": 4771, "סורינאם": 4773, "גיאנה": 4770,

  // אפריקה (CAF)
  "מרוקו": 4744, "סנגל": 4752, "תוניסיה": 4757, "אלג'יריה": 4719, 
  "מצרים": 4726, "ניגריה": 4747, "קמרון": 4723, "גאנה": 4731, 
  "חוף השנהב": 4725, "מאלי": 4742, "בורקינה פאסו": 4722, 
  "דרום אפריקה": 4761, "קונגו": 4724, "קונגו הדמוקרטית": 4724, "זמביה": 4764, "כף ורדה": 4721,

  // אסיה ואוקיאניה (AFC & OFC)
  "יפן": 4774, "דרום קוריאה": 4775, "איראן": 4777, "סעודיה": 4799, 
  "אוסטרליה": 4776, "קטאר": 4798, "עיראק": 4778, "איחוד האמירויות": 4803, 
  "אוזבקיסטן": 4804, "סין": 4765, "עומאן": 4796, "ירדן": 4787, "ניו זילנד": 4809
};

const translateTeam = (name) => TEAM_TRANSLATIONS[name] || name;

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [liveHistory, setLiveHistory] = useState({ home: [], away: [], loading: false });

  // משיכת לוח משחקים ויחסים עדכניים של Sofascore
  const fetchRealOdds = async (forceRefresh = false) => {
    setLoading(true);
    const sofascoreApiKey = import.meta.env.VITE_SOFASCORE_KEY;

    if (!sofascoreApiKey) {
      console.error("Missing VITE_SOFASCORE_KEY");
      setLoading(false);
      return;
    }

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

      // משיכת משחקים מתוכננים מתוך הטורניר הרלוונטי ב-Sofascore
      // כאן פונים לאנדפוינט המרכזי שמחזיר גם את יחסי ההימורים (Odds) המובנים של Sofascore
      const response = await fetch(`https://sofascore.p.rapidapi.com/tournaments/get-scheduled-events?tournamentId=16&seasonId=41031`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': sofascoreApiKey,
          'X-RapidAPI-Host': 'sofascore.p.rapidapi.com'
        }
      });
      const data = await response.json();

      if (data && data.events && Array.isArray(data.events)) {
        const formattedMatches = data.events.map((event, index) => {
          // שליפת יחסי הימורים (odds) מובנים מ-Sofascore במידה וקיימים, עם פולבק הגיוני
          const homeOdds = event.odds?.home || 2.10;
          const drawOdds = event.odds?.draw || 3.20;
          const awayOdds = event.odds?.away || 2.80;

          const dateObj = new Date(event.startTimestamp * 1000);
          const localDate = dateObj.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
          const localTime = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });

          const code = event.homeTeam?.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) || index;

          return {
            id: event.id || index,
            rawTime: dateObj.getTime(),
            homeTeam: translateTeam(event.homeTeam?.name),
            awayTeam: translateTeam(event.awayTeam?.name),
            date: localDate,
            time: localTime,
            odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
            homeXG: parseFloat((1.2 + ((code % 10) / 20)).toFixed(2)),
            homeExpectedConcedeXG: parseFloat((0.8 + ((code % 5) / 20)).toFixed(2)),
            awayXG: parseFloat((1.1 + ((code % 8) / 20)).toFixed(2)),
            awayExpectedConcedeXG: parseFloat((0.9 + ((code % 6) / 20)).toFixed(2)),
            homeMotivation: 3,
            awayMotivation: 3,
            scenario: "normal",
            homeInjuries: [],
            awayInjuries: []
          };
        });

        formattedMatches.sort((a, b) => a.rawTime - b.rawTime);
        localStorage.setItem('world_cup_matches_cache', JSON.stringify(formattedMatches));
        localStorage.setItem('world_cup_cache_time', now.toString());

        setMatches(formattedMatches);
        if (formattedMatches.length > 0) setSelectedMatch(formattedMatches[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching Sofascore schedule & odds:", error);
      setLoading(false);
    }
  };

  // משיכת היסטוריית אמת של 5 משחקים אחרונים
  const fetchRealTeamHistory = async (hebrewTeamName) => {
    const sofascoreApiKey = import.meta.env.VITE_SOFASCORE_KEY;
    if (!sofascoreApiKey) return [];

    const cleanName = hebrewTeamName.trim();
    const teamId = SOFASCORE_TEAM_IDS[cleanName];

    if (!teamId) return [];

    try {
      const response = await fetch(`https://sofascore.p.rapidapi.com/teams/get-last-matches?teamId=${teamId}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': sofascoreApiKey,
          'X-RapidAPI-Host': 'sofascore.p.rapidapi.com'
        }
      });
      const data = await response.json();
      
      if (data && data.events && Array.isArray(data.events)) {
        const lastFive = data.events.filter(e => e.status?.type === 'finished').slice(0, 5);

        return lastFive.map(event => {
          const isHome = event.homeTeam?.id === teamId;
          const currentTeamGoals = isHome ? event.homeScore?.current : event.awayScore?.current;
          const oppTeamGoals = isHome ? event.awayScore?.current : event.homeScore?.current;
          const opponentName = isHome ? event.awayTeam?.name : event.homeTeam?.name;

          let type = 'D';
          if (currentTeamGoals > oppTeamGoals) type = 'W';
          if (currentTeamGoals < oppTeamGoals) type = 'L';

          return {
            opponent: translateTeam(opponentName),
            score: `${event.homeScore?.current} - ${event.awayScore?.current}`,
            type
          };
        });
      }
      return [];
    } catch (err) {
      console.error(`Error fetching historical matches:`, err);
      return [];
    }
  };

  useEffect(() => {
    if (!selectedMatch) return;

    const loadSofascoreHistories = async () => {
      setLiveHistory({ home: [], away: [], loading: true });
      const homeHistory = await fetchRealTeamHistory(selectedMatch.homeTeam);
      const awayHistory = await fetchRealTeamHistory(selectedMatch.awayTeam);
      setLiveHistory({ home: homeHistory, away: awayHistory, loading: false });
    };

    loadSofascoreHistories();
  }, [selectedMatch]);

  useEffect(() =>
