import { supabase } from './supabaseClient';

// מפת הדגלים הרשמית והמלאה - מיוצאת החוצה לשימוש האפליקציה כולה
export const flagMap = {
  "מקסיקו": "mx", "ערב הסעודית": "sa", "דרום אפריקה": "za", "סקוטלנד": "gb-sct",
  "ארה\"ב": "us", "מרוקו": "ma", "ויילס": "gb-wls", "אוסטרליה": "au",
  "קנדה": "ca", "טוגו": "tg", "דרום קוריאה": "kr", "הולנד": "nl",
  "צרפת": "fr", "צ'ילה": "cl", "פולין": "pl", "תוניסיה": "tn",
  "ארגנטינה": "ar", "אוקראינה": "ua", "אלג'יריה": "dz", "פרו": "pe",
  "ספרד": "es", "קמרון": "cm", "שוודיה": "se", "קטר": "qa",
  "גרמניה": "de", "יפן": "jp", "אקוודור": "ec", "ניגריה": "ng",
  "פורטוגל": "pt", "דנמרק": "dk", "ג'מייקה": "jm", "עומאן": "om",
  "איטליה": "it", "גאנה": "gh", "קולומביה": "co", "סין": "cn",
  "אנגליה": "gb-eng", "בלגיה": "be", "ניו זילנד": "nz", "מצרים": "eg",
  "ברזיל": "br", "שווייץ": "ch", "קוסטה ריקה": "cr", "איראן": "ir",
  "אורוגוואי": "uy", "קרואטיה": "hr", "טורקיה": "tr", "סנגל": "sn",
  "סרביה": "rs", "אוסטריה": "at", "צ'כיה": "cz", "הונגריה": "hu", 
  "רומניה": "ro", "סלובקיה": "sk", "סלובניה": "si", "נורווגיה": "no", 
  "יוון": "gr", "חוף השנהב": "ci", "אירלנד": "ie", "איסלנד": "is", 
  "פינלנד": "fi", "פרגוואי": "py", "ונצואלה": "ve", "בוליביה": "bo", 
  "פנמה": "pa", "הונדורס": "hn", "אל סלבדור": "sv", "עיראק": "iq", 
  "איחוד האמירויות": "ae", "אוזבקיסטן": "uz", "מאלי": "ml", 
  "בורקינה פאסו": "bf", "דרום סודאן": "ss", "קונגו הדמוקרטית": "cd",
  "קוראסאו": "cw", "האיטי": "ht", "ירדן": "jo", "בוסניה והרצגובינה": "ba", 
  "איי קייפ ורדה": "cv"
};

export async function syncWorldCupMatches() {
  try {
    console.log("מנקה נתונים ישנים ומושך משחקים עדכניים מה-API...");

    // 1. ניקוי מלא של הטבלה ב-Supabase
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.warn("התרעונת ניקוי:", deleteError.message);
    }

    // 2. משיכת הנתונים מה-API דרך פרוקסי השרת המקומי
    const API_TOKEN = 'e5d8851e1254482fb11538df6d838be8'; 
    const url = '/api-football/v4/competitions/WC/matches';

    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_TOKEN }
    });

    if (!response.ok) {
      throw new Error(`שגיאה בתקשורת עם ה-API: ${response.status}`);
    }

    const data = await response.json();
    const apiMatches = data.matches;

    if (!apiMatches || apiMatches.length === 0) {
      alert("לא התקבלו משחקים מה-API.");
      return;
    }

    // 3. מיפוי ותרגום לעברית
    const formattedMatches = apiMatches.map(match => {
      const isFinished = match.status === 'FINISHED';
      
      const homeEnglish = match.homeTeam && match.homeTeam.name ? match.homeTeam.name : "TBD (Home)";
      const awayEnglish = match.awayTeam && match.awayTeam.name ? match.awayTeam.name : "TBD (Away)";

      const homeHebrew = translateTeamToHebrew(homeEnglish);
      const awayHebrew = translateTeamToHebrew(awayEnglish);

      return {
        id: match.id,
        home_team: homeHebrew, 
        away_team: awayHebrew, 
        match_time: match.utcDate,
        stage: match.stage.toLowerCase(),
        group_name: match.group ? translateGroup(match.group) : translateStage(match.stage),
        home_score: isFinished ? match.score.fullTime.home : null,
        away_score: isFinished ? match.score.fullTime.away : null,
        is_finished: isFinished
      };
    });

    // 4. שמירה ב-Supabase
    const { error: insertError } = await supabase
      .from('matches')
      .upsert(formattedMatches, { onConflict: 'id' });

    if (insertError) throw insertError;
    
    alert("🚀 הנתונים סונכרנו מחדש בהצלחה בעברית מלאה!");
  } catch (err) {
    console.error("שגיאה בתהליך:", err.message);
    alert("שגיאה: " + err.message);
  }
}

function translateTeamToHebrew(englishName) {
  const translationMap = {
    "Mexico": "מקסיקו", "Saudi Arabia": "ערב הסעודית", "South Africa": "דרום אפריקה", "Scotland": "סקוטלנד",
    "USA": "ארה\"ב", "United States": "ארה\"ב", "United States of America": "ארה\"ב", "Morocco": "מרוקו", 
    "Wales": "ויילס", "Australia": "אוסטרליה", "Canada": "קנדה", "Togo": "טוגו", 
    "South Korea": "דרום קוריאה", "Korea Republic": "דרום קוריאה", "Netherlands": "הולנד", 
    "France": "צרפת", "Chile": "צ'ילה", "Poland": "פולין", "Tunisia": "תוניסיה",
    "Argentina": "ארגנטינה", "Ukraine": "אוקראינה", "Algeria": "אלג'יריה", "Peru": "פרו",
    "Spain": "ספרד", "Cameroon": "קמרון", "Sweden": "שוודיה", "Qatar": "קטר",
    "Germany": "גרמניה", "Japan": "יפן", "Ecuador": "אקוודור", "Nigeria": "ניגריה",
    "Portugal": "פורטוגל", "Denmark": "דנמרק", "Jamaica": "ג'מייקה", "Oman": "עומאן",
    "Italy": "איטליה", "Ghana": "גאנה", "Colombia": "קולומביה", "China": "סין", "China PR": "סין",
    "England": "אנגליה", "Belgium": "בלגיה", "New Zealand": "ניו זילנד", "Egypt": "מצרים",
    "Brazil": "ברזיל", "Switzerland": "שווייץ", "Costa Rica": "קוסטה ריקה", "Iran": "איראן", "IR Iran": "איראן",
    "Uruguay": "אורוגוואי", "Croatia": "קרואטיה", "Turkey": "טורקיה", "Türkiye": "טורקיה", "Senegal": "סנגל",
    "Serbia": "סרביה", "Austria": "אוסטריה", "Czech Republic": "צ'כיה", "Czechia": "צ'כיה",
    "Hungary": "הונגריה", "Romania": "רומניה", "Slovakia": "סלובקיה", "Slovenia": "סלובניה",
    "Norway": "נורווגיה", "Greece": "יוון", "Ivory Coast": "חוף השנהב", "Côte d'Ivoire": "חוף השנהב",
    "Ireland": "אירלנד", "Republic of Ireland": "אירלנד", "Iceland": "איסלנד", "Finland": "פינלנד", 
    "Paraguay": "פרגוואי", "Venezuela": "ונצואלה", "Bolivia": "בוליביה", "Panama": "פנמה", 
    "Honduras": "הונדורס", "El Salvador": "אל סלבדור", "Iraq": "עיראק", "UAE": "איחוד האמירויות", 
    "United Arab Emirates": "איחוד האמירויות", "Uzbekistan": "אוזבקיסטן", "Mali": "מאלי", 
    "Burkina Faso": "בורקינה פאסו", "South Sudan": "דרום סודאן", "DR Congo": "קונגו הדמוקרטית",
    "Curaçao": "קוראסאו", "Curacao": "קוראסאו", "Haiti": "האיטי", "Jordan": "ירדן",
    "Bosnia-Herzegovina": "בוסניה והרצגובינה", "Bosnia and Herzegovina": "בוסניה והרצגובינה", 
    "Cape Verde Islands": "איי קייפ ורדה", "Cape Verde": "איי קייפ ורדה", "Cabo Verde": "איי קייפ ורדה",
    "TBD (Home)": "עוד לא נקבע (בית)", "TBD (Away)": "עוד לא נקבע (חוץ)"
  };

  return translationMap[englishName] || englishName;
}

function translateGroup(groupName) {
  const letter = groupName.replace('GROUP_', '');
  const lettersMap = { 'A': 'א', 'B': 'ב', 'C': 'ג', 'D': 'ד', 'E': 'ה', 'F': 'ו', 'G': 'ז', 'H': 'ח', 'I': 'ט', 'J': 'י', 'K': 'יא', 'L': 'יב' };
  return `בית ${lettersMap[letter] || letter}`;
}

function translateStage(stage) {
  const stagesMap = {
    'GROUP_STAGE': 'שלב הבתים',
    'LAST_32': 'שלב 32 האחרונות',
    'LAST_16': 'שמינית גמר',
    'QUARTER_FINALS': 'רבע גמר',
    'SEMI_FINALS': 'חצי גמר',
    'FINAL': 'הגמר הגדול'
  };
  return stagesMap[stage] || stage;
}