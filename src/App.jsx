import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { syncWorldCupMatches, flagMap } from './fetchMatches.jsx';

// האימייל של מנהל המערכת (האדמין)
const ADMIN_EMAIL = 'or.shkefati@gmail.com';

const DEFAULT_SCORING_SETTINGS = {
  exact: 5,
  direction: 2,
  round32Exact: 6,
  round32Direction: 3,
  round16Exact: 7,
  round16Direction: 3,
  quarterExact: 9,
  quarterDirection: 4,
  semiExact: 12,
  semiDirection: 5,
  thirdPlaceExact: 12,
  finalExact: 15,
  thirdPlaceDirection: 5,
  finalDirection: 6,
  topScorerBonus: 10,
  championBonus: 15
};

const topScorersList = [
  "קיליאן אמבפה", "הארי קיין", "ג'וד בלינגהאם", "ארלינג הולאנד", 
  "וירג'יל ואן דייק", "רוברט לבנדובסקי", "כריסטיאנו רונאלדו", "ליונל מסי",
  "ויניסיוס ג'וניור", "לואיס דיאז", "לאוטרו מרטינס", "חוליאן אלברס",
  "בנימין ששקו", "אנטואן גריזמן", "פיל פודן"
];

const topTeamsList = [
  "אנגליה", "צרפת", "גרמניה", "ספרד", "פורטוגל", 
  "ברזיל", "ארגנטינה", "איטליה", "הולנד", "בלגיה", 
  "קרואטיה", "אורוגוואי", "קולומביה", "ארה\"ב", "מרוקו"
];

export default function App() {
  const [session, setSession] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [editingUserId, setEditingUserId] = useState('');
  const [adminDisplayName, setAdminDisplayName] = useState('');
  const [activeTab, setActiveTab] = useState('home'); 
  const [matches, setMatches] = useState([]);
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [userBets, setUserBets] = useState({});
  const [allBets, setAllBets] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [longTermBets, setLongTermBets] = useState({ topScorer: '', champion: '' });
  const [allLongTermBets, setAllLongTermBets] = useState([]);

  // הגדרות אדמין לניקוד
  const [scoringSettings, setScoringSettings] = useState(() => {
    const saved = localStorage.getItem('mundiala_scoring');

    if (!saved) return DEFAULT_SCORING_SETTINGS;

    try {
      return { ...DEFAULT_SCORING_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SCORING_SETTINGS;
    }
  });
  
  // תוצאות אמת - מלך השערים והאלופה
  const [actualTopScorers, setActualTopScorers] = useState(() => {
    const saved = localStorage.getItem('mundiala_actual_top_scorers');
    return saved ? JSON.parse(saved) : [];
  });
  const [actualChampion, setActualChampion] = useState(() => {
    const saved = localStorage.getItem('mundiala_actual_champion');
    return saved ? saved : '';
  });

  const [customAdminScorer, setCustomAdminScorer] = useState('');
  const [isOtherScorer, setIsOtherScorer] = useState(false);
  const [isOtherChampion, setIsOtherChampion] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      // יצרנו פונקציה אסינכרונית כדי לוודא שקודם נוצר הפרופיל ורק אז נשאבת הטבלה!
      const initData = async () => {
        await ensureProfileExists(session.user);
        fetchMatchesFromSupabase();
        fetchLeaderboard();
        fetchUserBets(session.user.id);
        fetchAllBets();
        fetchLongTermBets(session.user.id);
        fetchAllLongTermBets();
        
        if (session.user.email !== ADMIN_EMAIL && activeTab === 'admin') {
          setActiveTab('home');
        }
      };
      initData();
    }
  }, [session]);

  useEffect(() => { localStorage.setItem('mundiala_scoring', JSON.stringify(scoringSettings)); }, [scoringSettings]);
  useEffect(() => { localStorage.setItem('mundiala_actual_top_scorers', JSON.stringify(actualTopScorers)); }, [actualTopScorers]);
  useEffect(() => { localStorage.setItem('mundiala_actual_champion', actualChampion); }, [actualChampion]);

  useEffect(() => {
    if (longTermBets.topScorer && !topScorersList.includes(longTermBets.topScorer)) setIsOtherScorer(true);
    if (longTermBets.champion && !topTeamsList.includes(longTermBets.champion)) setIsOtherChampion(true);
  }, [longTermBets]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert("שגיאה בהתחברות: " + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const ensureProfileExists = async (user) => {
    const fallbackName = user.user_metadata.full_name || user.email.split('@')[0];

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: user.id,
        display_name: fallbackName
      });

      setDisplayName('');
      setShowNameModal(true);
      return;
    }

    if (!existingProfile.display_name || existingProfile.display_name === fallbackName) {
      setDisplayName(existingProfile.display_name || '');
      setShowNameModal(true);
    } else {
      setDisplayName(existingProfile.display_name);
      setShowNameModal(false);
    }
  };

  const saveDisplayName = async () => {
    const cleanName = displayName.trim();

    if (!cleanName) {
      alert('יש להזין שם משתתף');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: cleanName })
      .eq('id', session.user.id);

    if (error) {
      alert('שגיאה בשמירת שם המשתתף: ' + error.message);
      return;
    }

    setDisplayName(cleanName);
    setShowNameModal(false);
    await fetchLeaderboard();
  };

  const updateParticipantNameByAdmin = async () => {
    if (!editingUserId) {
      alert('בחר משתתף לעדכון');
      return;
    }

    const cleanName = adminDisplayName.trim();

    if (!cleanName) {
      alert('יש להזין שם חדש');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: cleanName })
      .eq('id', editingUserId);

    if (error) {
      alert('שגיאה בעדכון שם המשתתף: ' + error.message);
      return;
    }

    alert('שם המשתתף עודכן בהצלחה');
    setEditingUserId('');
    setAdminDisplayName('');
    await fetchLeaderboard();
  };

  const deleteParticipant = async (userId, userName) => {
    const confirmed = window.confirm(
      `למחוק את המשתתף "${userName || 'ללא שם'}" וכל ההימורים שלו?\n\nהפעולה בלתי הפיכה.`
    );

    if (!confirmed) return;

    const { error: betsError } = await supabase
      .from('user_bets')
      .delete()
      .eq('user_id', userId);

    if (betsError) {
      alert('שגיאה במחיקת הימורי המשחקים: ' + betsError.message);
      return;
    }

    const { error: longTermError } = await supabase
      .from('long_term_bets')
      .delete()
      .eq('user_id', userId);

    if (longTermError) {
      alert('שגיאה במחיקת הימורי הטורניר: ' + longTermError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      alert('שגיאה במחיקת המשתתף: ' + profileError.message);
      return;
    }

    alert('המשתתף וכל ההימורים שלו נמחקו בהצלחה');

    if (editingUserId === userId) {
      setEditingUserId('');
      setAdminDisplayName('');
    }

    await fetchLeaderboard();
  };

  async function fetchLeaderboard() {
    const { data } = await supabase.from('profiles').select('*');

    if (data) {
      const sorted = [...data].sort((a, b) => {
        if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
        if ((b.exact_count || 0) !== (a.exact_count || 0)) return (b.exact_count || 0) - (a.exact_count || 0);
        if ((b.direction_count || 0) !== (a.direction_count || 0)) return (b.direction_count || 0) - (a.direction_count || 0);
        return (a.display_name || '').localeCompare(b.display_name || '', 'he');
      });

      setLeaderboard(sorted);
    }
  }

  async function fetchMatchesFromSupabase() {
    const { data } = await supabase.from('matches').select('*').order('match_time', { ascending: true });
    if (data) setMatches(data);
  }

  async function fetchUserBets(userId) {
    const { data } = await supabase.from('user_bets').select('*').eq('user_id', userId);
    if (data) {
      const betsObj = {};
      data.forEach(bet => {
        betsObj[bet.match_id] = { home: bet.home_score, away: bet.away_score };
      });
      setUserBets(betsObj);
    }
  }

  async function fetchAllBets() {
    const { data, error } = await supabase
      .from('user_bets')
      .select('*');

    if (error) {
      console.error('שגיאה בשליפת כל ההימורים:', error);
      return;
    }

    setAllBets(data || []);
  }

  async function fetchLongTermBets(userId) {
    const { data } = await supabase.from('long_term_bets').select('*').eq('user_id', userId).single();
    if (data) {
      setLongTermBets({ topScorer: data.top_scorer || '', champion: data.champion || '' });
    }
  }

  async function fetchAllLongTermBets() {
    const { data, error } = await supabase
      .from('long_term_bets')
      .select('*');

    if (error) {
      console.error('שגיאה בשליפת הימורי טורניר:', error);
      return;
    }

    setAllLongTermBets(data || []);
  }

  const getUserLongTermBet = (userId) => {
    return allLongTermBets.find(bet => bet.user_id === userId) || null;
  };

  const handleBetChange = (matchId, team, value) => {
    if (value.includes('-')) return;
    if (value.length > 2) value = value.slice(0, 2);
    setUserBets(prev => ({ ...prev, [matchId]: { ...prev[matchId], [team]: value } }));
  };

  const saveBet = async (matchId) => {
    const match = matches.find(m => m.id === matchId);

    if (match && isMatchBetLocked(match.match_time)) {
      alert("🔒 ההימור למשחק זה כבר ננעל. אפשר לשנות עד דקה לפני פתיחת המשחק.");
      return;
    }

    const bet = userBets[matchId];
    if (!bet || bet.home === undefined || bet.away === undefined || bet.home === '' || bet.away === '') {
      alert("נא להזין את שתי התוצאות כדי לשמור את ההימור!");
      return;
    }

    const { error } = await supabase.from('user_bets').upsert({
      user_id: session.user.id,
      match_id: matchId,
      home_score: parseInt(bet.home),
      away_score: parseInt(bet.away)
    }, { onConflict: 'user_id,match_id' });

    if (error) alert("שגיאה בשמירת ההימור: " + error.message);
    else {
      alert(`🎯 ההימור נשמר במסד הנתונים!`);
      await fetchAllBets();
    }
  };

  const saveLongTermBets = async () => {
    if (isTournamentBetLocked()) {
      alert("הימורי מלך השערים והאלופה ננעלו. אפשר לשנות רק עד דקה לפני שריקת הפתיחה הראשונה.");
      return;
    }

    const { error } = await supabase.from('long_term_bets').upsert({
      user_id: session.user.id,
      top_scorer: longTermBets.topScorer,
      champion: longTermBets.champion
    }, { onConflict: 'user_id' });

    if (error) alert("שגיאה: " + error.message);
    else {
      alert("🔒 הימורי הטורניר שלך נשמרו לענן בהצלחה!");
      await fetchAllLongTermBets();
    }
  };

  const handleAdminResultChange = async (matchId, homeScore, awayScore) => {
    if (homeScore && homeScore.toString().includes('-')) return;
    if (awayScore && awayScore.toString().includes('-')) return;
    if (homeScore && homeScore.toString().length > 2) homeScore = homeScore.toString().slice(0, 2);
    if (awayScore && awayScore.toString().length > 2) awayScore = awayScore.toString().slice(0, 2);

    const parsedHome = homeScore !== '' ? parseInt(homeScore) : null;
    const parsedAway = awayScore !== '' ? parseInt(awayScore) : null;

    const { error } = await supabase.from('matches').update({ home_score: parsedHome, away_score: parsedAway, is_finished: parsedHome !== null && parsedAway !== null }).eq('id', matchId);

    if (error) {
      alert("שגיאה בעדכון תוצאת המשחק: " + error.message);
      return;
    }

    await fetchMatchesFromSupabase();

    setTimeout(async () => {
      await calculatePoints();
      await fetchLeaderboard();
    }, 500);
  };

  const toggleActualScorer = (playerName) => {
    setActualTopScorers(prev => prev.includes(playerName) ? prev.filter(name => name !== playerName) : [...prev, playerName]);
  };

  // מנוע חישוב הנקודות האוטומטי (כולל משחקים, מלך השערים ואלופה!)
  const calculatePoints = async () => {
    const { data: finishedMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('is_finished', true);

    const { data: allBets, error: betsError } = await supabase
      .from('user_bets')
      .select('*');

    const { data: allLongTermBets, error: longTermError } = await supabase
      .from('long_term_bets')
      .select('*');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (matchesError || betsError || longTermError || profilesError) {
      console.error("שגיאה בשליפת נתונים לחישוב:", {
        matchesError,
        betsError,
        longTermError,
        profilesError
      });
      alert("שגיאה בשליפת נתונים לחישוב הנקודות. בדוק Console.");
      return;
    }

    const scorerPts = Number(scoringSettings.topScorerBonus ?? DEFAULT_SCORING_SETTINGS.topScorerBonus);
    const champPts = Number(scoringSettings.championBonus ?? DEFAULT_SCORING_SETTINGS.championBonus);

    for (const profile of profiles || []) {
      let points = 0;
      let exactCount = 0;
      let directionCount = 0;
      let missedCount = 0;
      let finishedWithBet = 0;

      const userMatchBets = (allBets || []).filter(b => b.user_id === profile.id);

      for (const bet of userMatchBets) {
        const match = (finishedMatches || []).find(m => m.id === bet.match_id);
        if (!match) continue;

        const betHome = Number(bet.home_score);
        const betAway = Number(bet.away_score);
        const realHome = Number(match.home_score);
        const realAway = Number(match.away_score);

        if (
          Number.isNaN(betHome) ||
          Number.isNaN(betAway) ||
          Number.isNaN(realHome) ||
          Number.isNaN(realAway)
        ) {
          continue;
        }

        finishedWithBet += 1;

        const matchScoring = getMatchScoring(match);

        if (betHome === realHome && betAway === realAway) {
          points += matchScoring.exact;
          exactCount += 1;
          continue;
        }

        const betDiff = betHome - betAway;
        const matchDiff = realHome - realAway;

        if (
          (betDiff > 0 && matchDiff > 0) ||
          (betDiff < 0 && matchDiff < 0) ||
          (betDiff === 0 && matchDiff === 0)
        ) {
          points += matchScoring.direction;
          directionCount += 1;
        } else {
          missedCount += 1;
        }
      }

      const ltBet = (allLongTermBets || []).find(b => b.user_id === profile.id);

      if (ltBet) {
        if (actualTopScorers.includes(ltBet.top_scorer)) {
          points += scorerPts;
        }

        if (actualChampion && ltBet.champion === actualChampion) {
          points += champPts;
        }
      }

      const capturePercent = finishedWithBet
        ? Math.round(((exactCount + directionCount) / finishedWithBet) * 100)
        : 0;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          points,
          base_points: points,
          exact_count: exactCount,
          direction_count: directionCount,
          missed_count: missedCount,
          capture_percent: capturePercent
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error("שגיאה בעדכון ניקוד:", profile.display_name, updateError);
      }
    }

    alert("🧮 הנקודות חושבו ועודכנו בהצלחה לכל המשתתפים!");
    await fetchLeaderboard();
  };

  const formatMatchDate = (isoString) => {
    const d = new Date(isoString);
    const datePart = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' });
    const timePart = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${timePart}`;
  };

  const getFlagImg = (teamName) => {
    const code = flagMap[teamName];
    return code ? `https://flagcdn.com/w40/${code}.png` : null;
  };

  

  const normalizeStageText = (value = '') => {
    return value.toString().toLowerCase().trim();
  };

  const getMatchStageText = (match) => {
    return normalizeStageText([
      match.group_name,
      match.stage,
      match.round,
      match.phase,
      match.match_stage,
      match.competition_stage,
      match.name,
      match.description
    ].filter(Boolean).join(' '));
  };

  const getMatchScoring = (match) => {
    const rawStage = [
      match.group_name,
      match.stage,
      match.round,
      match.phase,
      match.match_stage,
      match.competition_stage,
      match.name,
      match.description
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .trim();

    if (
      rawStage.includes('third place') ||
      rawStage.includes('3rd place') ||
      rawStage.includes('place 3') ||
      rawStage.includes('מקום שלישי') ||
      rawStage.includes('מקום 3')
    ) {
      return {
        exact: Number(scoringSettings.thirdPlaceExact ?? DEFAULT_SCORING_SETTINGS.thirdPlaceExact),
        direction: Number(scoringSettings.thirdPlaceDirection ?? DEFAULT_SCORING_SETTINGS.thirdPlaceDirection),
        label: 'מקום שלישי'
      };
    }

    if (
      rawStage.includes('round of 32') ||
      rawStage.includes('last 32') ||
      rawStage.includes('32 האחרונות') ||
      rawStage.includes('שלב 32')
    ) {
      return {
        exact: Number(scoringSettings.round32Exact ?? DEFAULT_SCORING_SETTINGS.round32Exact),
        direction: Number(scoringSettings.round32Direction ?? DEFAULT_SCORING_SETTINGS.round32Direction),
        label: 'שלב 32 האחרונות'
      };
    }

    if (
      rawStage.includes('round of 16') ||
      rawStage.includes('last 16') ||
      rawStage.includes('16 האחרונות') ||
      rawStage.includes('שמינית')
    ) {
      return {
        exact: Number(scoringSettings.round16Exact ?? DEFAULT_SCORING_SETTINGS.round16Exact),
        direction: Number(scoringSettings.round16Direction ?? DEFAULT_SCORING_SETTINGS.round16Direction),
        label: 'שמינית גמר'
      };
    }

    if (
      rawStage.includes('quarter') ||
      rawStage.includes('רבע')
    ) {
      return {
        exact: Number(scoringSettings.quarterExact ?? DEFAULT_SCORING_SETTINGS.quarterExact),
        direction: Number(scoringSettings.quarterDirection ?? DEFAULT_SCORING_SETTINGS.quarterDirection),
        label: 'רבע גמר'
      };
    }

    if (
      rawStage.includes('semi') ||
      rawStage.includes('חצי')
    ) {
      return {
        exact: Number(scoringSettings.semiExact ?? DEFAULT_SCORING_SETTINGS.semiExact),
        direction: Number(scoringSettings.semiDirection ?? DEFAULT_SCORING_SETTINGS.semiDirection),
        label: 'חצי גמר'
      };
    }

    const isFinal =
      rawStage === 'final' ||
      rawStage === 'גמר' ||
      rawStage.includes(' final') ||
      rawStage.includes('final ') ||
      rawStage.includes(' גמר') ||
      rawStage.includes('גמר ');

    if (isFinal) {
      return {
        exact: Number(scoringSettings.finalExact ?? DEFAULT_SCORING_SETTINGS.finalExact),
        direction: Number(scoringSettings.finalDirection ?? DEFAULT_SCORING_SETTINGS.finalDirection),
        label: 'גמר'
      };
    }

    return {
      exact: Number(scoringSettings.exact ?? DEFAULT_SCORING_SETTINGS.exact),
      direction: Number(scoringSettings.direction ?? DEFAULT_SCORING_SETTINGS.direction),
      label: 'שלב הבתים'
    };
  };

  const getBetResult = (match) => {
    if (!match.is_finished) return null;

    const bet = userBets[match.id];
    if (!bet || bet.home === '' || bet.away === '') return null;

    const betHome = parseInt(bet.home);
    const betAway = parseInt(bet.away);

    if (betHome === match.home_score && betAway === match.away_score) {
      return {
        text: "🎯 תפסת בול!",
        boxClass: "bg-emerald-400/20 border-emerald-300/40 text-emerald-100 shadow-emerald-900/20"
      };
    }

    const betDiff = betHome - betAway;
    const realDiff = match.home_score - match.away_score;

    if (
      (betDiff > 0 && realDiff > 0) ||
      (betDiff < 0 && realDiff < 0) ||
      (betDiff === 0 && realDiff === 0)
    ) {
      return {
        text: "✅ תפסת כיוון!",
        boxClass: "bg-orange-400/20 border-orange-300/40 text-orange-100 shadow-orange-900/20"
      };
    }

    return {
      text: "❌ לא תפסת כלום, נסה משחק הבא",
      boxClass: "bg-red-400/20 border-red-300/40 text-red-100 shadow-red-900/20"
    };
  };




  const getFirstKickoffTime = () => {
    if (!matches.length) return null;

    const validTimes = matches
      .map(match => new Date(match.match_time))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);

    return validTimes[0] || null;
  };

  const isTournamentBetLocked = () => {
    const firstKickoff = getFirstKickoffTime();
    if (!firstKickoff) return false;

    const lockTime = new Date(firstKickoff.getTime() - 60 * 1000);
    return new Date() >= lockTime;
  };

  const getTournamentLockText = () => {
    const firstKickoff = getFirstKickoffTime();
    if (!firstKickoff) return "הבחירות פתוחות עד דקה לפני שריקת הפתיחה הראשונה.";

    const lockTime = new Date(firstKickoff.getTime() - 60 * 1000);
    return `ניתן לשנות עד ${lockTime.toLocaleDateString('he-IL')} בשעה ${lockTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const resetTopScorerBet = () => {
    if (isTournamentBetLocked()) {
      alert("הימורי הטורניר ננעלו. אי אפשר לאפס אחרי דקה לפני שריקת הפתיחה הראשונה.");
      return;
    }

    setIsOtherScorer(false);
    setLongTermBets(prev => ({ ...prev, topScorer: '' }));
    await fetchAllLongTermBets();
  };

  const resetChampionBet = () => {
    if (isTournamentBetLocked()) {
      alert("הימורי הטורניר ננעלו. אי אפשר לאפס אחרי דקה לפני שריקת הפתיחה הראשונה.");
      return;
    }

    setIsOtherChampion(false);
    setLongTermBets(prev => ({ ...prev, champion: '' }));
    await fetchAllLongTermBets();
  };



  const getUserMatchStats = (targetUserId = session?.user?.id) => {
    const stats = {
      points: 0,
      exact: 0,
      direction: 0,
      missed: 0,
      finishedWithBet: 0,
      capturePercent: 0
    };

    if (!targetUserId) return stats;

    matches
      .filter(match => match.is_finished)
      .forEach(match => {
        const bet = targetUserId === session?.user?.id
          ? userBets[match.id]
          : null;

        if (!bet || bet.home === '' || bet.away === '') return;

        stats.finishedWithBet += 1;

        const betHome = parseInt(bet.home);
        const betAway = parseInt(bet.away);

        if (betHome === match.home_score && betAway === match.away_score) {
          const matchScoring = getMatchScoring(match);
          stats.exact += 1;
          stats.points += matchScoring.exact;
          return;
        }

        const betDiff = betHome - betAway;
        const realDiff = match.home_score - match.away_score;

        if (
          (betDiff > 0 && realDiff > 0) ||
          (betDiff < 0 && realDiff < 0) ||
          (betDiff === 0 && realDiff === 0)
        ) {
          const matchScoring = getMatchScoring(match);
          stats.direction += 1;
          stats.points += matchScoring.direction;
          return;
        }

        stats.missed += 1;
      });

    stats.capturePercent = stats.finishedWithBet
      ? Math.round(((stats.exact + stats.direction) / stats.finishedWithBet) * 100)
      : 0;

    return stats;
  };

  const getLeaderboardMedal = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };



  const isMatchBetLocked = (matchTime) => {
    const kickoff = new Date(matchTime);
    if (Number.isNaN(kickoff.getTime())) return false;

    const lockTime = new Date(kickoff.getTime() - 60 * 1000);
    return new Date() >= lockTime;
  };

  const getMatchLockText = (matchTime) => {
    const kickoff = new Date(matchTime);
    if (Number.isNaN(kickoff.getTime())) return "";

    const lockTime = new Date(kickoff.getTime() - 60 * 1000);
    return lockTime.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) + " בשעה " + lockTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  const getMatchBetStatus = (matchTime) => {
    return isMatchBetLocked(matchTime)
      ? "🔒 ההימור נעול - לא ניתן לשנות"
      : `🔓 ההימור פתוח עד ${getMatchLockText(matchTime)}`;
  };




  const getBetDistribution = (matchId) => {
    const matchBets = allBets.filter(bet => bet.match_id === matchId);
    const total = matchBets.length;

    const distribution = {
      homeWin: 0,
      draw: 0,
      awayWin: 0,
      popularScores: []
    };

    if (!total) return { ...distribution, total: 0 };

    const scoreMap = {};

    matchBets.forEach(bet => {
      const home = Number(bet.home_score);
      const away = Number(bet.away_score);

      if (Number.isNaN(home) || Number.isNaN(away)) return;

      if (home > away) distribution.homeWin += 1;
      else if (home < away) distribution.awayWin += 1;
      else distribution.draw += 1;

      const key = `${home}-${away}`;
      scoreMap[key] = (scoreMap[key] || 0) + 1;
    });

    distribution.popularScores = Object.entries(scoreMap)
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 1);

    return {
      ...distribution,
      total,
      homeWinPercent: Math.round((distribution.homeWin / total) * 100),
      drawPercent: Math.round((distribution.draw / total) * 100),
      awayWinPercent: Math.round((distribution.awayWin / total) * 100)
    };
  };

  const getExactLeaders = () => {
    return [...leaderboard]
      .sort((a, b) => {
        if ((b.exact_count || 0) !== (a.exact_count || 0)) return (b.exact_count || 0) - (a.exact_count || 0);
        if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
        return (a.display_name || '').localeCompare(b.display_name || '', 'he');
      })
      .slice(0, 10);
  };

  const getUserAchievements = () => {
    const currentProfile = leaderboard.find(user => user.id === session?.user?.id);
    const stats = getUserMatchStats();

    const achievements = [
      {
        icon: "🎯",
        title: "בול ראשון",
        unlocked: stats.exact >= 1,
        description: "תפסת תוצאה מדויקת אחת לפחות"
      },
      {
        icon: "🔥",
        title: "5 בולים",
        unlocked: stats.exact >= 5,
        description: "הגעת ל-5 פגיעות בול"
      },
      {
        icon: "🧭",
        title: "10 כיוונים",
        unlocked: stats.direction >= 10,
        description: "תפסת כיוון ב-10 משחקים"
      },
      {
        icon: "💯",
        title: "100 נקודות",
        unlocked: (currentProfile?.points || stats.points) >= 100,
        description: "הגעת ל-100 נקודות"
      },
      {
        icon: "📈",
        title: "70% תפיסה",
        unlocked: stats.finishedWithBet >= 5 && stats.capturePercent >= 70,
        description: "לפחות 70% תפיסה אחרי 5 משחקים ומעלה"
      },
      {
        icon: "🥇",
        title: "מקום ראשון",
        unlocked: leaderboard[0]?.id === session?.user?.id,
        description: "אתה במקום הראשון בטבלת המשתתפים"
      }
    ];

    return achievements;
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('הדפדפן לא תומך בהתראות');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      setNotificationsEnabled(true);
      alert('התראות הופעלו. תקבל התראה לפני נעילת משחקים כשהאפליקציה פתוחה.');
    } else {
      setNotificationsEnabled(false);
      alert('לא אושרה הרשאה להתראות');
    }
  };




  const getMyLeaderboardRank = () => {
    const index = leaderboard.findIndex(user => user.id === session?.user?.id);
    return index >= 0 ? index + 1 : null;
  };

  const getMyProfile = () => {
    return leaderboard.find(user => user.id === session?.user?.id) || null;
  };

  const getNextOpenMatch = () => {
    const now = new Date();

    return matches
      .filter(match => !match.is_finished)
      .filter(match => {
        const kickoff = new Date(match.match_time);
        if (Number.isNaN(kickoff.getTime())) return false;
        return kickoff > now;
      })
      .sort((a, b) => new Date(a.match_time) - new Date(b.match_time))[0] || null;
  };

  const getTimeUntilLock = (matchTime) => {
    const kickoff = new Date(matchTime);
    if (Number.isNaN(kickoff.getTime())) return "";

    const lockTime = new Date(kickoff.getTime() - 60 * 1000);
    const diffMs = lockTime.getTime() - Date.now();

    if (diffMs <= 0) return "ההימור ננעל";

    const totalMinutes = Math.ceil(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) return `${hours} שעות ו-${minutes} דקות`;
    return `${minutes} דקות`;
  };

  const getTeamFlagUrl = (teamName) => {
    const code = flagMap[teamName];
    return code ? `https://flagcdn.com/w80/${code}.png` : null;
  };

  const getScorerImageUrl = (playerName) => {
    if (!playerName) return null;

    const map = {
      "קיליאן אמבפה": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/2019-07-17_SG_Dynamo_Dresden_vs._Paris_Saint-Germain_by_Sandro_Halank%E2%80%93129.jpg/240px-2019-07-17_SG_Dynamo_Dresden_vs._Paris_Saint-Germain_by_Sandro_Halank%E2%80%93129.jpg",
      "הארי קיין": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Harry_Kane_in_Russia_2.jpg/240px-Harry_Kane_in_Russia_2.jpg",
      "ג'וד בלינגהאם": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/25th_Laureus_World_Sports_Awards_-_Red_Carpet_-_Jude_Bellingham_-_240422_190617_%28cropped%29.jpg/240px-25th_Laureus_World_Sports_Awards_-_Red_Carpet_-_Jude_Bellingham_-_240422_190617_%28cropped%29.jpg",
      "ארלינג הולאנד": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/2019-07-30_Fu%C3%9Fball%2C_M%C3%A4nner%2C_UEFA_Champions_League%2C_FC_Red_Bull_Salzburg_-_HJK_Helsinki_1DX_0614_by_Stepro_%28cropped%29.jpg/240px-2019-07-30_Fu%C3%9Fball%2C_M%C3%A4nner%2C_UEFA_Champions_League%2C_FC_Red_Bull_Salzburg_-_HJK_Helsinki_1DX_0614_by_Stepro_%28cropped%29.jpg",
      "כריסטיאנו רונאלדו": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/240px-Cristiano_Ronaldo_2018.jpg",
      "ליונל מסי": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lionel_Messi_20180626.jpg/240px-Lionel_Messi_20180626.jpg",
      "ויניסיוס ג'וניור": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Vinicius_Jr_2021.jpg/240px-Vinicius_Jr_2021.jpg",
      "רוברט לבנדובסקי": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Robert_Lewandowski_2018.jpg/240px-Robert_Lewandowski_2018.jpg"
    };

    return map[playerName] || null;
  };

  const getMySameBetCount = (matchId) => {
    const myBet = userBets[matchId];
    if (!myBet || myBet.home === '' || myBet.away === '') return 0;

    const myHome = Number(myBet.home);
    const myAway = Number(myBet.away);

    return allBets.filter(bet => {
      if (bet.user_id === session?.user?.id) return false;
      return Number(bet.home_score) === myHome && Number(bet.away_score) === myAway;
    }).filter(bet => bet.match_id === matchId).length;
  };

  const getAveragePointsPerFinishedBet = (profile) => {
    if (!profile) return 0;
    const played = (profile.exact_count || 0) + (profile.direction_count || 0) + (profile.missed_count || 0);
    if (!played) return 0;
    return ((profile.points || 0) / played).toFixed(1);
  };

  const renderLongTermPickCard = (type) => {
    const isChampion = type === 'champion';
    const title = isChampion ? 'הנבחרת הזוכה שלי' : 'כובש השערים המצטיין שלי';
    const value = isChampion ? longTermBets.champion : longTermBets.topScorer;
    const image = isChampion ? getTeamFlagUrl(value) : getScorerImageUrl(value);
    const actualValue = isChampion ? actualChampion : null;
    const isActualScorerSet = !isChampion && actualTopScorers.length > 0;
    const isCorrect = isChampion
      ? Boolean(actualChampion && value && value === actualChampion)
      : Boolean(value && actualTopScorers.includes(value));
    const isWrong = isChampion
      ? Boolean(actualChampion && value && value !== actualChampion)
      : Boolean(isActualScorerSet && value && !actualTopScorers.includes(value));

    return (
      <button
        onClick={() => setActiveTab('longTerm')}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-right hover:border-emerald-500/40 transition shadow-lg"
      >
        <div className="text-xs text-slate-400 font-bold mb-2">{isChampion ? '🏆' : '⚽'} {title}</div>

        <div className="flex items-center gap-3">
          {image ? (
            <img src={image} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-700 bg-slate-950" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-xl">
              {isChampion ? '🏳️' : '👤'}
            </div>
          )}

          <div className="min-w-0">
            <div className="font-black text-slate-100 truncate">
              {value || 'עדיין לא נבחר'}
            </div>
            <div className={`text-xs font-bold mt-1 ${
              isCorrect ? 'text-emerald-300' : isWrong ? 'text-red-300' : 'text-amber-300'
            }`}>
              {isCorrect ? '🥇 פגעת!' : isWrong ? '❌ לא פגעת' : '⏳ ממתין להכרעה'}
            </div>
          </div>
        </div>
      </button>
    );
  };

  const renderPerformanceBar = (label, value, maxValue, colorClass) => {
    const percent = maxValue ? Math.min(100, Math.round((value / maxValue) * 100)) : 0;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-bold text-slate-400">
          <span>{label}</span>
          <span>{value}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };


  useEffect(() => {
    if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;

    const timers = [];

    matches.forEach(match => {
      const kickoff = new Date(match.match_time);
      if (Number.isNaN(kickoff.getTime())) return;

      [
        { minutesBefore: 60, label: 'עוד שעה ההימור ננעל' },
        { minutesBefore: 15, label: 'עוד 15 דקות ההימור ננעל' }
      ].forEach(reminder => {
        const notifyTime = new Date(kickoff.getTime() - (reminder.minutesBefore + 1) * 60 * 1000);
        const delay = notifyTime.getTime() - Date.now();

        if (delay > 0) {
          const timerId = setTimeout(() => {
            new Notification('Mundiala 2026', {
              body: `${reminder.label}: ${match.home_team} נגד ${match.away_team}`,
              icon: '/favicon.ico'
            });
          }, delay);

          timers.push(timerId);
        }
      });
    });

    return () => timers.forEach(timerId => clearTimeout(timerId));
  }, [matches, notificationsEnabled]);


  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-8 animate-fadeIn">
          <div className="text-7xl mb-2 drop-shadow-lg">⚽</div>
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 tracking-wider">MUNDIALA</h1>
            <h2 className="text-xl font-bold text-slate-300 mt-1">2026</h2>
          </div>
          <p className="text-slate-400 text-sm px-2">התחבר כדי להזין את הימורי הטורניר שלך ולראות את מצב הנקודות בזמן אמת.</p>
          
          <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-md">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            התחברות מהירה עם Google
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = session.user.email === ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-28" dir="rtl">
      <style>{`
`}</style>
      {showNameModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center">
            <div className="text-5xl mb-3">👤</div>
            <h3 className="text-2xl font-black text-white mb-2">בחר שם משתתף</h3>
            <p className="text-sm text-slate-400 mb-5">
              זה השם שיופיע בטבלת המשתתפים ובכל הדירוגים.
            </p>

            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveDisplayName(); }}
              placeholder="לדוגמה: דוד"
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-center text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
              autoFocus
            />

            <button
              onClick={saveDisplayName}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl transition"
            >
              שמור שם משתתף
            </button>
          </div>
        </div>
      )}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-white">כרטיס משתתף</h3>
              <button onClick={() => setSelectedProfile(null)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>

            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-3xl mb-3">
                👤
              </div>
              <div className="text-2xl font-black text-emerald-300">{selectedProfile.display_name || 'ללא שם'}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <div className="text-2xl font-black text-emerald-300">{selectedProfile.points || 0}</div>
                <div className="text-xs text-slate-400 font-bold">נקודות</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <div className="text-2xl font-black text-green-300">{selectedProfile.exact_count || 0}</div>
                <div className="text-xs text-slate-400 font-bold">בולים</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <div className="text-2xl font-black text-orange-300">{selectedProfile.direction_count || 0}</div>
                <div className="text-xs text-slate-400 font-bold">כיוון</div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <div className="text-2xl font-black text-sky-300">{selectedProfile.capture_percent || 0}%</div>
                <div className="text-xs text-slate-400 font-bold">אחוז תפיסה</div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-slate-500">
              ממוצע נקודות למשחק: <span className="font-black text-slate-300">{getAveragePointsPerFinishedBet(selectedProfile)}</span>
            </div>
          </div>
        </div>
      )}

      <header className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-emerald-500/20 p-5 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">⚽</span>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 tracking-wider flex items-center gap-3">
                MUNDIALA 2026
                <button onClick={() => setShowNameModal(true)} className="text-xs text-slate-500 hover:text-emerald-400 underline font-normal transition">שנה שם</button>
                <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-400 underline font-normal transition">התנתק</button>
              </h1>
              <p className="text-xs text-green-400/85">מחובר בתור: <span className="font-bold text-white">{displayName || session.user.user_metadata.full_name || session.user.email}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={requestNotificationPermission} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg transition duration-200">
              {notificationsEnabled ? '🔔 התראות פעילות' : '🔔 הפעל התראות'}
            </button>

            {isAdmin && (
              <button onClick={async () => { await syncWorldCupMatches(); fetchMatchesFromSupabase(); fetchAllBets(); }} className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg transition duration-200 flex items-center gap-2">
                🔄 סנכרן משחקים (אדמין)
              </button>
            )}
          </div>
        </div>
      </header>

      
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-700 shadow-2xl">
        <div className={`max-w-4xl mx-auto grid ${isAdmin ? 'grid-cols-7' : 'grid-cols-6'} h-16`}>

          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition ${
              activeTab === 'home' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none mb-1">🏠</span>
            בית
          </button>

          <button
            onClick={() => setActiveTab('bets')}
            className={`flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition ${
              activeTab === 'bets' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none mb-1">🏃</span>
            הימורים
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition ${
              activeTab === 'leaderboard' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none mb-1">📊</span>
            דירוג
          </button>

          <button
            onClick={() => setActiveTab('myStats')}
            className={`flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition ${
              activeTab === 'myStats' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none mb-1">🎯</span>
            סטט׳
          </button>

          <button
            onClick={() => setActiveTab('exactLeaders')}
            className={`flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition ${
              activeTab === 'exactLeaders' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none mb-1">🏅</span>
            בולים
          </button>

          <button
            onClick={() => setActiveTab('longTerm')}
            className={`flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition ${
              activeTab === 'longTerm' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none mb-1">🏆</span>
            טורניר
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center text-[10px] sm:text-xs font-bold transition ${
                activeTab === 'admin' ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              <span className="text-lg leading-none mb-1">👑</span>
              אדמין
            </button>
          )}
        </div>
      </nav>


      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        {activeTab === 'home' && (() => {
          const myProfile = getMyProfile();
          const myStats = getUserMatchStats();
          const myRank = getMyLeaderboardRank();
          const nextMatch = getNextOpenMatch();
          const played = myStats.finishedWithBet;
          const maxStat = Math.max(myStats.exact, myStats.direction, myStats.missed, 1);

          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderLongTermPickCard('champion')}
                {renderLongTermPickCard('topScorer')}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h2 className="text-xl font-extrabold mb-4 text-emerald-400" style={{ fontFamily: 'Rubik, sans-serif' }}>
                  📌 מצב אישי
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-amber-300">{myRank ? `#${myRank}` : '-'}</div>
                    <div className="text-xs text-slate-400 mt-1 font-bold">דירוג</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-emerald-300">{myProfile?.points || myStats.points || 0}</div>
                    <div className="text-xs text-slate-400 mt-1 font-bold">נקודות</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-green-300">{myStats.exact}</div>
                    <div className="text-xs text-slate-400 mt-1 font-bold">בול</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-orange-300">{myStats.direction}</div>
                    <div className="text-xs text-slate-400 mt-1 font-bold">כיוון</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
                    <div className="text-2xl font-black text-sky-300">{getAveragePointsPerFinishedBet(myProfile)}</div>
                    <div className="text-xs text-slate-400 mt-1 font-bold">ממוצע נק׳ למשחק</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h2 className="text-xl font-extrabold mb-4 text-emerald-400" style={{ fontFamily: 'Rubik, sans-serif' }}>
                  🔥 המשחק הבא
                </h2>

                {nextMatch ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black text-slate-100">{nextMatch.home_team}</div>
                      <div className="text-slate-500 font-black">נגד</div>
                      <div className="font-black text-slate-100">{nextMatch.away_team}</div>
                    </div>
                    <div className="text-center text-xs text-slate-400 mt-3">{formatMatchDate(nextMatch.match_time)}</div>
                    <div className="text-center text-sm font-black text-amber-300 mt-2">
                      ההימור נסגר בעוד {getTimeUntilLock(nextMatch.match_time)}
                    </div>
                    <button onClick={() => setActiveTab('bets')} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition">
                      עבור להימור
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-5">אין כרגע משחק פתוח קרוב.</div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h2 className="text-xl font-extrabold mb-4 text-emerald-400" style={{ fontFamily: 'Rubik, sans-serif' }}>
                  📈 גרף ביצועים
                </h2>

                <div className="space-y-4">
                  {renderPerformanceBar('תפיסות בול', myStats.exact, maxStat, 'bg-emerald-400')}
                  {renderPerformanceBar('תפיסות כיוון', myStats.direction, maxStat, 'bg-orange-400')}
                  {renderPerformanceBar('לא נתפס', myStats.missed, maxStat, 'bg-red-400')}
                  {renderPerformanceBar('אחוז תפיסה', myStats.capturePercent, 100, 'bg-sky-400')}
                </div>

                <div className="text-xs text-slate-500 mt-4 text-center">
                  מחושב לפי {played} משחקים שהסתיימו ויש בהם הימור שמור.
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'bets' && (
          <div>
            <h2
  className="text-xl font-extrabold mb-2 text-emerald-400"
  style={{ fontFamily: 'Rubik, sans-serif' }}
>
  הזנת הימורים לטורניר
</h2>
            {matches.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400">לוח המשחקים ריק. יתעדכן בקרוב.</div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => {
                  const homeFlag = getFlagImg(match.home_team);
                  const awayFlag = getFlagImg(match.away_team);
                  const betResult = getBetResult(match);
                  const matchLocked = isMatchBetLocked(match.match_time);
                  const matchScoring = getMatchScoring(match);
                  return (
                    <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition">
                      <div className="grid grid-cols-[92px_1fr_132px] sm:grid-cols-[150px_1fr_180px] items-center gap-2 text-slate-400 border-b border-slate-800 pb-2 mb-3">
                        <span className="justify-self-end inline-flex items-center justify-center text-center bg-emerald-950 text-green-400 font-black px-2 py-1 rounded-full border border-green-500/20 text-[11px] sm:text-xs leading-tight min-h-[34px] min-w-[72px] sm:min-w-[110px]">
                          {getMatchScoring(match).label || 'שלב הטורניר'}
                        </span>

                        <span className="justify-self-center text-center text-[10px] sm:text-xs whitespace-nowrap leading-none">
                          {formatMatchDate(match.match_time)}
                        </span>

                        <span className="justify-self-start inline-flex items-center justify-center whitespace-nowrap bg-sky-400/10 text-sky-200 font-bold px-2 py-1 rounded-full border border-sky-300/20 text-[10px] sm:text-xs leading-none">
                          {matchScoring.label}: בול {matchScoring.exact} | כיוון {matchScoring.direction}
                        </span>
                      </div>

                      <div className={`mb-4 text-center rounded-2xl border px-4 py-3 text-sm sm:text-base font-black ${
                        matchLocked
                          ? 'bg-red-400/15 border-red-300/30 text-red-100'
                          : 'bg-emerald-400/15 border-emerald-300/30 text-emerald-100'
                      }`}>
                        {getMatchBetStatus(match.match_time)}
                      </div>

                      {(() => {
                        const distribution = getBetDistribution(match.id);

                        return (
                          <div className="mb-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-black text-slate-300">📊 התפלגות הימורים</span>
                              <span className="text-xs text-slate-500">{distribution.total} משתתפים הימרו</span>
                            </div>

                            {distribution.total < 5 ? (
                              <p className="text-xs text-slate-500 text-center py-2">
                                ההתפלגות תוצג רק אחרי שלפחות 5 משתתפים ישמרו הימור למשחק הזה
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                                  <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-2">
                                    <div className="text-emerald-300">{match.home_team}</div>
                                    <div className="text-white text-lg">{distribution.homeWinPercent}%</div>
                                  </div>
                                  <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-2">
                                    <div className="text-amber-300">תיקו</div>
                                    <div className="text-white text-lg">{distribution.drawPercent}%</div>
                                  </div>
                                  <div className="bg-sky-400/10 border border-sky-400/20 rounded-xl p-2">
                                    <div className="text-sky-300">{match.away_team}</div>
                                    <div className="text-white text-lg">{distribution.awayWinPercent}%</div>
                                  </div>
                                </div>

                                {distribution.popularScores.length > 0 && (
                                  <div className="text-xs text-slate-400 text-center">
                                    התוצאה הפופולרית: {distribution.popularScores[0].score} ({distribution.popularScores[0].count} משתתפים)
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {(() => {
                        const sameBetCount = getMySameBetCount(match.id);
                        const myBet = userBets[match.id];

                        if (!myBet || myBet.home === '' || myBet.away === '') return null;

                        return (
                          <div className="mb-4 rounded-2xl border border-purple-300/20 bg-purple-400/10 px-4 py-3 text-center text-xs font-bold text-purple-100">
                            👥 עוד {sameBetCount} משתתפים הימרו כמוך על {myBet.home}-{myBet.away}
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-12 items-center gap-2">
                        <div className="col-span-4 flex items-center justify-end gap-2 font-bold text-sm sm:text-base">
                          <span>{match.home_team}</span>
                          {homeFlag && <img src={homeFlag} alt="" className="w-6 h-4 object-cover rounded shadow-sm border border-slate-700" />}
                        </div>
                        <div className="col-span-4 flex justify-center items-center gap-2">
                          <input disabled={matchLocked} type="number" min="0" placeholder="0" value={userBets[match.id]?.home ?? ''} onChange={(e) => handleBetChange(match.id, 'home', e.target.value)} className={`w-12 h-10 bg-slate-950 border border-slate-700 rounded-xl text-center font-bold text-lg text-emerald-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${matchLocked ? 'opacity-50 cursor-not-allowed' : ''}`} />
                          <span className="text-slate-600 font-bold">:</span>
                          <input disabled={matchLocked} type="number" min="0" placeholder="0" value={userBets[match.id]?.away ?? ''} onChange={(e) => handleBetChange(match.id, 'away', e.target.value)} className={`w-12 h-10 bg-slate-950 border border-slate-700 rounded-xl text-center font-bold text-lg text-emerald-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${matchLocked ? 'opacity-50 cursor-not-allowed' : ''}`} />
                        </div>
                        <div className="col-span-4 flex items-center justify-start gap-2 font-bold text-sm sm:text-base">
                          {awayFlag && <img src={awayFlag} alt="" className="w-6 h-4 object-cover rounded shadow-sm border border-slate-700" />}
                          <span>{match.away_team}</span>
                        </div>
                      </div>
<div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800/60 text-xs">
                        <div className="flex-1">
                          {match.is_finished ? (
                            <div className="space-y-2 text-center">
                              <div className="text-amber-300 font-bold">
                                תוצאת אמת: {match.home_score} - {match.away_score}
                              </div>

                              {betResult && (
                                <div className={`mx-auto max-w-xs rounded-2xl border px-4 py-3 text-lg sm:text-xl font-black shadow-lg ${betResult.boxClass}`}>
                                  {betResult.text}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">טרם נקבעה תוצאה</span>
                          )}
                        </div>
                        <button disabled={matchLocked} onClick={() => saveBet(match.id)} className={`border font-bold py-1.5 px-4 rounded-xl transition ${matchLocked ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-slate-800 hover:bg-emerald-700 text-slate-200 hover:text-white border-slate-700'}`}>
                          {matchLocked ? '🔒 נעול - לא ניתן לשנות' : '💾 שמור הימור'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2
  className="text-xl font-extrabold mb-2 text-emerald-400"
  style={{ fontFamily: 'Rubik, sans-serif' }}
>
  📊 טבלת משתתפים
</h2>
            <p className="text-xs text-slate-400 mb-4">
              במקרה של תיקו בנקודות: קודם יותר פגיעות בול, אחר כך יותר פגיעות כיוון.
              {isTournamentBetLocked() && (
                <span className="block mt-1 text-amber-300">
                  הימורי נבחרת זוכה ומלך שערים מוצגים אחרי נעילת המשחק הראשון.
                </span>
              )}
            </p>

            {leaderboard.length === 0 ? (
              <p className="text-slate-400 text-center py-4">אין משתתפים כרגע או שהנתונים נטענים...</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-right border-collapse min-w-[980px]">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-xs font-bold border-b border-slate-800">
                      <th className="p-3">מיקום</th>
                      <th className="p-3">שם משתתף</th>
                      {isTournamentBetLocked() && (
                        <>
                          <th className="p-3 text-center">נבחרת זוכה</th>
                          <th className="p-3 text-center">מלך שערים</th>
                        </>
                      )}
                      <th className="p-3 text-center">בול</th>
                      <th className="p-3 text-center">כיוון</th>
                      <th className="p-3 text-center">לא תפס</th>
                      <th className="p-3 text-center">אחוז תפיסה</th>
                      <th className="p-3 text-center">ממוצע</th>
                      <th className="p-3 text-left">סה"כ נקודות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {leaderboard.map((user, index) => (
                      <tr key={user.id} onClick={() => setSelectedProfile(user)} className="hover:bg-slate-800/50 transition cursor-pointer">
                        <td className="p-3 font-black text-lg text-amber-300">{getLeaderboardMedal(index)}</td>
                        <td className="p-3 font-semibold">{user.display_name}</td>
                        {isTournamentBetLocked() && (() => {
                          const userLongTermBet = getUserLongTermBet(user.id);

                          return (
                            <>
                              <td className="p-3 text-center">
                                <span className="inline-flex items-center justify-center rounded-full bg-emerald-400/10 border border-emerald-300/20 text-emerald-100 px-3 py-1 text-xs font-bold whitespace-nowrap">
                                  {userLongTermBet?.champion || 'לא בחר'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="inline-flex items-center justify-center rounded-full bg-amber-400/10 border border-amber-300/20 text-amber-100 px-3 py-1 text-xs font-bold whitespace-nowrap">
                                  {userLongTermBet?.top_scorer || 'לא בחר'}
                                </span>
                              </td>
                            </>
                          );
                        })()}
                        <td className="p-3 text-center font-bold text-emerald-300">{user.exact_count || 0}</td>
                        <td className="p-3 text-center font-bold text-orange-300">{user.direction_count || 0}</td>
                        <td className="p-3 text-center font-bold text-red-300">{user.missed_count || 0}</td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[58px] rounded-full bg-sky-400/15 border border-sky-300/30 text-sky-100 px-3 py-1 font-bold">
                            {user.capture_percent || 0}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-sky-300">{getAveragePointsPerFinishedBet(user)}</td>
                        <td className="p-3 font-black text-left text-emerald-400">{user.points || 0} נק'</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'myStats' && (() => {
          const myStats = getUserMatchStats();

          return (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2
  className="text-xl font-extrabold mb-2 text-emerald-400"
  style={{ fontFamily: 'Rubik, sans-serif' }}
>
🎯 הסטטיסטיקה שלי
</h2>
              
                <p className="text-xs text-slate-400 mb-5">
                  הסיכום מחושב לפי המשחקים שכבר הסתיימו ושיש לך בהם הימור שמור.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-emerald-400/15 border border-emerald-300/30 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-black text-emerald-200">{myStats.points}</div>
                    <div className="text-xs font-bold text-emerald-100/80 mt-1">נקודות</div>
                  </div>

                  <div className="bg-green-400/15 border border-green-300/30 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-black text-green-200">{myStats.exact}</div>
                    <div className="text-xs font-bold text-green-100/80 mt-1">תפסת בול</div>
                  </div>

                  <div className="bg-orange-400/15 border border-orange-300/30 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-black text-orange-200">{myStats.direction}</div>
                    <div className="text-xs font-bold text-orange-100/80 mt-1">תפסת כיוון</div>
                  </div>

                  <div className="bg-red-400/15 border border-red-300/30 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-black text-red-200">{myStats.missed}</div>
                    <div className="text-xs font-bold text-red-100/80 mt-1">לא תפסתי</div>
                  </div>

                  <div className="bg-sky-400/15 border border-sky-300/30 rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
                    <div className="text-3xl font-black text-sky-200">{myStats.capturePercent}%</div>
                    <div className="text-xs font-bold text-sky-100/80 mt-1">אחוז תפיסה</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2
  className="text-xl font-extrabold mb-2 text-emerald-400"
  style={{ fontFamily: 'Rubik, sans-serif' }}
>
📋 פירוט ההימורים שלי
</h2>
            

                <div className="space-y-3">
                  {matches.filter(match => match.is_finished).length === 0 ? (
                    <p className="text-slate-400 text-center py-4">אין עדיין משחקים שהסתיימו.</p>
                  ) : (
                    matches.filter(match => match.is_finished).map(match => {
                      const bet = userBets[match.id];
                      const betResult = getBetResult(match);

                      return (
                        <div key={match.id} className={`rounded-2xl border p-4 ${betResult ? betResult.boxClass : 'bg-slate-800/40 border-slate-700 text-slate-300'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="font-bold">
                              {match.home_team} נגד {match.away_team}
                            </div>

                            <div className="text-sm font-bold">
                              תוצאה: {match.home_score} - {match.away_score}
                              {bet ? ` | ההימור שלי: ${bet.home} - ${bet.away}` : ' | לא נמצא הימור'}
                            </div>
                          </div>

                          {betResult && (
                            <div className="text-center text-lg font-black mt-3">
                              {betResult.text}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'exactLeaders' && (() => {
          const achievements = getUserAchievements();
          const exactLeaders = getExactLeaders();

          return (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                                <h2
  className="text-xl font-extrabold mb-2 text-emerald-400"
  style={{ fontFamily: 'Rubik, sans-serif' }}
>
🏅 טבלת הבולים
</h2>
                
                <p className="text-xs text-slate-400 mb-4">
                  דירוג לפי מספר הפגיעות המדויקות. במקרה של תיקו - לפי נקודות.
                </p>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-xs font-bold border-b border-slate-800">
                        <th className="p-3">מיקום</th>
                        <th className="p-3">משתתף</th>
                        <th className="p-3 text-center">בולים</th>
                        <th className="p-3 text-center">כיוון</th>
                        <th className="p-3 text-left">נקודות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm">
                      {exactLeaders.map((user, index) => (
                        <tr key={user.id} className="hover:bg-slate-800/50 transition">
                          <td className="p-3 font-black text-lg text-amber-300">{getLeaderboardMedal(index)}</td>
                          <td className="p-3 font-semibold">{user.display_name}</td>
                          <td className="p-3 text-center font-black text-emerald-300">{user.exact_count || 0}</td>
                          <td className="p-3 text-center font-bold text-orange-300">{user.direction_count || 0}</td>
                          <td className="p-3 text-left font-black text-emerald-400">{user.points || 0} נק'</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                                                <h2
  className="text-xl font-extrabold mb-2 text-emerald-400"
  style={{ fontFamily: 'Rubik, sans-serif' }}
>
🏆 ההישגים שלי
</h2>
             
                <p className="text-xs text-slate-400 mb-4">
                  הישגים נפתחים לפי הביצועים שלך בטורניר.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievements.map(achievement => (
                    <div
                      key={achievement.title}
                      className={`rounded-2xl border p-4 transition ${
                        achievement.unlocked
                          ? 'bg-emerald-400/15 border-emerald-300/30'
                          : 'bg-slate-950 border-slate-800 opacity-55'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div>
                          <div className={`font-black ${achievement.unlocked ? 'text-emerald-300' : 'text-slate-400'}`}>
                            {achievement.unlocked ? 'נפתח · ' : 'נעול · '}{achievement.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {achievement.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'longTerm' && (() => {
          const tournamentLocked = isTournamentBetLocked();

          return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-xl font-extrabold text-emerald-400">🏆 הימורים ארוכי טווח</h2>
            <div className={`rounded-2xl border p-4 text-center font-bold ${tournamentLocked ? 'bg-red-400/20 border-red-300/40 text-red-100' : 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'}`}>
              {tournamentLocked ? '🔒 ההימורים ננעלו אחרי דקה לפני שריקת הפתיחה הראשונה' : '🔓 ההימורים עדיין פתוחים'}
              <div className="text-xs font-semibold opacity-80 mt-1">{getTournamentLockText()}</div>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60">
                <label className="block text-sm font-bold text-slate-300 mb-2">⚽ מי יהיה מלך השערים של הטורניר?</label>
                <select disabled={tournamentLocked} value={isOtherScorer ? "other" : longTermBets.topScorer} onChange={(e) => { if (e.target.value === "other") { setIsOtherScorer(true); setLongTermBets(p => ({ ...p, topScorer: '' })); } else { setIsOtherScorer(false); setLongTermBets(p => ({ ...p, topScorer: e.target.value })); } }} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500 mb-3 font-medium cursor-pointer">
                  <option value="">-- בחר שחקן מהרשימה --</option>
                  {topScorersList.map(player => (<option key={player} value={player}>{player}</option>))}
                  <option value="other">✍️ אחר (הקלדה חופשית...)</option>
                </select>
                {isOtherScorer && (<input type="text" placeholder="הקלד שם שחקן אחר..." disabled={tournamentLocked} value={longTermBets.topScorer} onChange={(e) => setLongTermBets(p => ({ ...p, topScorer: e.target.value }))} className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed" />)}
                <button disabled={tournamentLocked} onClick={resetTopScorerBet} className={`mt-3 w-full px-4 py-2 rounded-xl text-sm font-bold transition ${tournamentLocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                  ❌ אפס מלך שערים
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60">
                <label className="block text-sm font-bold text-slate-300 mb-2">🥇 מי הנבחרת שתזכה במונדיאל?</label>
                <select disabled={tournamentLocked} value={isOtherChampion ? "other" : longTermBets.champion} onChange={(e) => { if (e.target.value === "other") { setIsOtherChampion(true); setLongTermBets(p => ({ ...p, champion: '' })); } else { setIsOtherChampion(false); setLongTermBets(p => ({ ...p, champion: e.target.value })); } }} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500 mb-3 font-medium cursor-pointer">
                  <option value="">-- בחר נבחרת מהרשימה --</option>
                  {topTeamsList.map(team => (<option key={team} value={team}>{team}</option>))}
                  <option value="other">✍️ אחר (הקלדה חופשית...)</option>
                </select>
                {isOtherChampion && (<input type="text" placeholder="הקלד שם נבחרת אחרת..." disabled={tournamentLocked} value={longTermBets.champion} onChange={(e) => setLongTermBets(p => ({ ...p, champion: e.target.value }))} className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed" />)}
                <button disabled={tournamentLocked} onClick={resetChampionBet} className={`mt-3 w-full px-4 py-2 rounded-xl text-sm font-bold transition ${tournamentLocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                  ❌ אפס נבחרת זוכה
                </button>
              </div>
              <button disabled={tournamentLocked} onClick={saveLongTermBets} className={`w-full font-bold py-3 rounded-xl transition text-sm shadow-md ${tournamentLocked ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                {tournamentLocked ? '🔒 ההימורים ננעלו' : '🔒 נעל ושמור הימורי טורניר לענן'}
              </button>
            </div>
          </div>
          );
        })()}

        {/* טאב 4: אדמין - מוגן לחלוטין */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl text-center">
              <h3 className="text-lg font-bold text-emerald-400 mb-2">🔄 משיכת תוצאות אמת מפיפ"א</h3>
              <button onClick={async () => { await syncWorldCupMatches(); fetchMatchesFromSupabase(); }} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition text-sm shadow-md">סנכרן לוח משחקים ותוצאות</button>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl text-center">
              <h3 className="text-lg font-bold text-amber-400 mb-2">✅ הניקוד מתעדכן אוטומטית</h3>
              <button onClick={calculatePoints} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition text-sm shadow-md">חשב נקודות ועדכן את הלידרבורד</button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-200 mb-2">✏️ שינוי שם משתתף</h3>
              <p className="text-xs text-slate-400 mb-4">
                בחר משתתף ועדכן את השם שיופיע בטבלת המשתתפים ובסטטיסטיקות.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={editingUserId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedUser = leaderboard.find(user => user.id === selectedId);

                    setEditingUserId(selectedId);
                    setAdminDisplayName(selectedUser?.display_name || '');
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">בחר משתתף</option>
                  {leaderboard.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.display_name || 'ללא שם'}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={adminDisplayName}
                  onChange={(e) => setAdminDisplayName(e.target.value)}
                  placeholder="שם חדש למשתתף"
                  className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                />

                <button
                  onClick={updateParticipantNameByAdmin}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition text-sm shadow-md"
                >
                  שמור שם
                </button>
              </div>

              {editingUserId && (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/30 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-red-200">
                        מחיקת משתתף מלאה
                      </p>
                      <p className="text-xs text-red-300/80 mt-1">
                        פעולה זו תמחק את המשתתף, הימורי המשחקים שלו והימורי הטורניר שלו. אי אפשר לשחזר דרך המערכת.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const selectedUser = leaderboard.find(user => user.id === editingUserId);
                        deleteParticipant(editingUserId, selectedUser?.display_name);
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-5 rounded-xl transition text-sm shadow-md"
                    >
                      🗑️ מחק משתתף
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-200 mb-2">⚙️ קביעת שיטת הניקוד לחישוב</h3>
              <p className="text-xs text-slate-400 mb-4">
                הניקוד מחושב לפי שלב המשחק. שים לב שהמשחק חייב לכלול בשם השלב/round/group_name טקסט כמו Round of 32, Round of 16, Quarter, Semi, Final או מקום שלישי.
              </p>

              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-black text-emerald-300 mb-2">שלב הבתים</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בול:</label><input type="number" min="0" value={scoringSettings.exact} onChange={(e) => setScoringSettings(p => ({ ...p, exact: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-amber-400" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">כיוון:</label><input type="number" min="0" value={scoringSettings.direction} onChange={(e) => setScoringSettings(p => ({ ...p, direction: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-amber-400" /></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-cyan-300 mb-2">שלב 32 האחרונות</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בול:</label><input type="number" min="0" value={scoringSettings.round32Exact ?? 6} onChange={(e) => setScoringSettings(p => ({ ...p, round32Exact: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-cyan-300" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">כיוון:</label><input type="number" min="0" value={scoringSettings.round32Direction ?? 3} onChange={(e) => setScoringSettings(p => ({ ...p, round32Direction: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-cyan-300" /></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-sky-300 mb-2">שמינית גמר</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בול:</label><input type="number" min="0" value={scoringSettings.round16Exact ?? 7} onChange={(e) => setScoringSettings(p => ({ ...p, round16Exact: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-sky-300" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">כיוון:</label><input type="number" min="0" value={scoringSettings.round16Direction ?? 3} onChange={(e) => setScoringSettings(p => ({ ...p, round16Direction: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-sky-300" /></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-purple-300 mb-2">רבע גמר</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בול:</label><input type="number" min="0" value={scoringSettings.quarterExact ?? 9} onChange={(e) => setScoringSettings(p => ({ ...p, quarterExact: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-purple-300" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">כיוון:</label><input type="number" min="0" value={scoringSettings.quarterDirection ?? 4} onChange={(e) => setScoringSettings(p => ({ ...p, quarterDirection: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-purple-300" /></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-orange-300 mb-2">חצי גמר</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בול:</label><input type="number" min="0" value={scoringSettings.semiExact ?? 12} onChange={(e) => setScoringSettings(p => ({ ...p, semiExact: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-orange-300" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">כיוון:</label><input type="number" min="0" value={scoringSettings.semiDirection ?? 5} onChange={(e) => setScoringSettings(p => ({ ...p, semiDirection: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-orange-300" /></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-pink-300 mb-2">משחק על מקום שלישי</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בול:</label><input type="number" min="0" value={scoringSettings.thirdPlaceExact ?? 12} onChange={(e) => setScoringSettings(p => ({ ...p, thirdPlaceExact: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-pink-300" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">כיוון:</label><input type="number" min="0" value={scoringSettings.thirdPlaceDirection ?? 5} onChange={(e) => setScoringSettings(p => ({ ...p, thirdPlaceDirection: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-pink-300" /></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-red-300 mb-2">גמר</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בול:</label><input type="number" min="0" value={scoringSettings.finalExact ?? 15} onChange={(e) => setScoringSettings(p => ({ ...p, finalExact: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-red-300" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">כיוון:</label><input type="number" min="0" value={scoringSettings.finalDirection ?? 6} onChange={(e) => setScoringSettings(p => ({ ...p, finalDirection: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-red-300" /></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-black text-emerald-300 mb-2">בונוסים לטורניר</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בונוס מלך שערים:</label><input type="number" min="0" value={scoringSettings.topScorerBonus ?? 10} onChange={(e) => setScoringSettings(p => ({ ...p, topScorerBonus: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-emerald-400" /></div>
                    <div><label className="block text-xs font-bold text-slate-400 mb-1">בונוס אלופה:</label><input type="number" min="0" value={scoringSettings.championBonus ?? 15} onChange={(e) => setScoringSettings(p => ({ ...p, championBonus: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-emerald-400" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-200 mb-1">👑 קביעת מלך השערים האמיתי</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 max-h-[160px] overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 pr-2">
                {topScorersList.map(player => (
                  <label key={player} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition">
                    <input type="checkbox" checked={actualTopScorers.includes(player)} onChange={() => toggleActualScorer(player)} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500" />
                    <span>{player}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input type="text" placeholder="שחקן אחר (הקלדה)..." value={customAdminScorer} onChange={(e) => setCustomAdminScorer(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none" />
                <button onClick={() => { if(customAdminScorer.trim() && !actualTopScorers.includes(customAdminScorer.trim())) { setActualTopScorers(prev => [...prev, customAdminScorer.trim()]); setCustomAdminScorer(''); } }} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition">➕ הוסף</button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-3 gap-3">
                <h3 className="text-lg font-bold text-slate-200">🥇 קביעת הנבחרת הזוכה האמיתית</h3>
                <button onClick={() => setActualChampion('')} className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition">
                  איפוס אלופה
                </button>
              </div>
              <select value={actualChampion} onChange={(e) => setActualChampion(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-amber-500 font-medium">
                 <option value="">-- בחר נבחרת שזכתה בטורניר --</option>
                 {topTeamsList.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl opacity-80 hover:opacity-100 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-slate-200">🛠️ התערבות ידנית בתוצאות (גיבוי)</h3>
                <button onClick={async () => { await fetchMatchesFromSupabase();

setTimeout(async () => {
  await calculatePoints();
  await fetchLeaderboard();
}, 500); }} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition">
                  🔄 רענן ניקוד אחרי עדכון תוצאות
                </button>
              </div>
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                {matches.map(m => {
                  return (
                    <div key={m.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center gap-4 text-xs sm:text-sm">
                      <div className="font-bold w-1/3 flex justify-end gap-2">{m.home_team}</div>
                      <div className="flex items-center gap-1.5 justify-center w-1/3">
                        <input type="number" min="0" placeholder="?" value={m.home_score ?? ''} onChange={(e) => handleAdminResultChange(m.id, e.target.value, m.away_score ?? '')} className="w-9 h-8 bg-slate-900 border border-slate-700 rounded text-center text-amber-400 font-bold" />
                        <span>:</span>
                        <input type="number" min="0" placeholder="?" value={m.away_score ?? ''} onChange={(e) => handleAdminResultChange(m.id, m.home_score ?? '', e.target.value)} className="w-9 h-8 bg-slate-900 border border-slate-700 rounded text-center text-amber-400 font-bold" />
                      </div>
                      <div className="font-bold w-1/3 flex justify-start gap-2">{m.away_team}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
