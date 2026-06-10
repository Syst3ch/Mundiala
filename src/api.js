// src/services/api.js
import axios from 'axios';

const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY;
const SOFASCORE_KEY = import.meta.env.VITE_SOFASCORE_KEY;

export async function getCombinedMatchData() {
  try {
    // 1. משיכת יחסי הימורים
    const oddsResponse = await axios.get(`https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h`);
    
    // 2. משיכת נתונים מ-SofaScore (דוגמה לשימוש ב-Endpoint הרלוונטי)
    // הערה: יש להתאים את ה-URL לתיעוד של ה-API של SofaScore שברשותך
    const statsResponse = await axios.get(`https://api.sofascore.com/api/v1/sport/football/events/live`, {
      headers: { 'x-api-key': SOFASCORE_KEY }
    });

    // 3. מיזוג הנתונים (Merge logic)
    return oddsResponse.data.map(match => {
      const stats = statsResponse.data.events?.find(e => e.id === match.id) || {};
      return {
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        commenceTime: match.commence_time,
        odds: match.bookmakers[0].markets[0].outcomes,
        homeXg: stats.homeXg || 0, // במידה וקיים ב-API
        awayXg: stats.awayXg || 0
      };
    });
  } catch (error) {
    console.error("Error fetching match data:", error);
    return [];
  }
}
