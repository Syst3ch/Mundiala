return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto mb-6 text-center md:text-right border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          מונדיאל Predictor Pro
        </h1>
        <p className="text-slate-400 text-sm mt-1">מערכת שקלול דינמית: סגנון התקפה/הגנה ויחסי בוקמייקרים חיים</p>
      </header>

      {/* שינוי קל ב-Grid: במובייל הניתוח (order-1) יופיע מעל רשימת המשחקים (order-2) */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* טור: רשימת המשחקים - מקבל order-2 במובייל וחוזר ל-order-none במסכים גדולים */}
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

        {/* טור מרכזי ושמאל: ניתוח תוצאה חי - מקבל order-1 כדי לקפוץ לראש המסך במובייל */}
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
                <div className="text-lg md:text-2xl font-black truncate">{selectedMatch.homeTeam}</div>
                <div className="text-xl md:text-2xl font-bold text-emerald-400 mt-1">{currentPrediction.homePercent}%</div>
                <div className="text-[9px] md:text-[10px] text-slate-500 mt-0.5">התקפה: {selectedMatch.homeAttack.toFixed(1)}</div>
              </div>
              
              <div className="text-center bg-slate-950/70 border border-slate-800 px-3 py-3 rounded-2xl w-1/3 shadow-inner">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">תוצאה משוערת</div>
                <div className="text-2xl md:text-4xl font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 my-1">
                  {currentPrediction.predictedScore}
                </div>
                <div className="text-[9px] text-slate-400 border-t border-slate-800/60 pt-1 mt-1">תיקו: {currentPrediction.drawPercent}%</div>
              </div>
              
              <div className="text-center w-1/3">
                <div className="text-lg md:text-2xl font-black truncate">{selectedMatch.awayTeam}</div>
                <div className="text-xl md:text-2xl font-bold text-cyan-400 mt-1">{currentPrediction.awayPercent}%</div>
                <div className="text-[9px] md:text-[10px] text-slate-500 mt-0.5">התקפה: {selectedMatch.awayAttack.toFixed(1)}</div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 md:p-4 flex justify-between items-center text-xs md:text-sm">
              <span className="text-slate-400">המלצת ווינר חכמה:</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 text-sm md:text-lg">
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
