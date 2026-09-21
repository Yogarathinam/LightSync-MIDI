import React, { useEffect, useState } from 'react';
import { BarChart2, CheckCircle, Clock, Award, History, TrendingUp } from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { SessionResult } from '../../types';

export const AnalyzeStudio: React.FC = () => {
  const { sessionHistory, setSessionHistory } = useLightSyncStore();
  const [loading, setLoading] = useState(false);

  // Fetch past sessions from SQLite API
  useEffect(() => {
    fetch('/api/analytics/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.sessions && Array.isArray(data.sessions)) {
          setSessionHistory(data.sessions);
        }
      })
      .catch(() => {
        // Fallback local session data if offline
      });
  }, [setSessionHistory]);

  const latestSession: SessionResult = sessionHistory.length > 0 ? sessionHistory[0] : {
    song_id: 'ode_to_joy',
    song_title: 'Ode to Joy',
    mode: 'learn',
    duration_sec: 24.5,
    total_notes: 30,
    correct_notes: 28,
    missed_notes: 2,
    accuracy_pct: 93.3,
    avg_deviation_ms: 18.2,
    ratings_count: {
      PERFECT: 22,
      GREAT: 6,
      EARLY: 1,
      LATE: 1,
      MISS: 2
    }
  };

  const ratings = latestSession.ratings_count || { PERFECT: 0, GREAT: 0, EARLY: 0, LATE: 0, MISS: 0 };
  const totalRatings = Math.max(1, latestSession.total_notes);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      
      {/* Overview Top Metric Cards */}
      <div className="md:col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1 transition-colors">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Accuracy Rate
          </span>
          <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {latestSession.accuracy_pct.toFixed(0)}%
          </span>
          <span className="text-[11px] text-slate-400">Target: 90%+ Mastery</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1 transition-colors">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Avg Deviation
          </span>
          <span className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {latestSession.avg_deviation_ms > 0 ? `+${latestSession.avg_deviation_ms.toFixed(0)}` : latestSession.avg_deviation_ms.toFixed(0)} ms
          </span>
          <span className="text-[11px] text-slate-400">
            {Math.abs(latestSession.avg_deviation_ms) < 15 ? 'In the pocket' : (latestSession.avg_deviation_ms < 0 ? 'Anticipating early' : 'Dragging slightly')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1 transition-colors">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            Notes Struck
          </span>
          <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
            {latestSession.correct_notes} / {latestSession.total_notes}
          </span>
          <span className="text-[11px] text-slate-400">{latestSession.missed_notes} missed key(s)</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1 transition-colors">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
            Piece
          </span>
          <span className="text-lg font-bold truncate text-slate-900 dark:text-white">
            {latestSession.song_title}
          </span>
          <span className="text-[11px] font-mono text-slate-400">{latestSession.duration_sec.toFixed(1)}s session</span>
        </div>

      </div>

      {/* Timing Deviation Breakdown (6 Cols) */}
      <div className="md:col-span-6 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              Timing Precision Distribution
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Micro-timing Breakdown</span>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {[
              { label: 'PERFECT (within ±35ms)', count: ratings.PERFECT, color: 'bg-emerald-500', text: 'text-emerald-500' },
              { label: 'GREAT (within ±75ms)', count: ratings.GREAT, color: 'bg-sky-500', text: 'text-sky-500' },
              { label: 'EARLY (rushed >75ms)', count: ratings.EARLY, color: 'bg-amber-500', text: 'text-amber-500' },
              { label: 'LATE (lagged >75ms)', count: ratings.LATE, color: 'bg-orange-500', text: 'text-orange-500' },
              { label: 'MISS (wrong pitch)', count: ratings.MISS, color: 'bg-rose-500', text: 'text-rose-500' },
            ].map((item) => {
              const pct = Math.round((item.count / totalRatings) * 100);
              return (
                <div key={item.label} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-600 dark:text-zinc-300">{item.label}</span>
                    <span className={`font-bold ${item.text}`}>{item.count} notes ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <div className={`h-full ${item.color} transition-all duration-300`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs text-slate-500 dark:text-zinc-400 font-mono">
          Consistency Quotient: {Math.max(0, 100 - Math.abs(latestSession.avg_deviation_ms)).toFixed(0)}%
        </div>
      </div>

      {/* Historical Session Log (6 Cols) */}
      <div className="md:col-span-6 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              SQLite Practice Session History
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Local Persistence</span>
          </div>

          <div className="flex flex-col gap-2 mt-4 max-h-64 overflow-y-auto">
            {sessionHistory.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">No recorded practice sessions yet. Complete a song in Learn Mode to view history!</div>
            ) : (
              sessionHistory.map((sess, idx) => (
                <div
                  key={sess.id || idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-zinc-200">{sess.song_title}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {sess.duration_sec.toFixed(0)}s &bull; Mode: {sess.mode}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className={`font-bold block ${sess.accuracy_pct >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {sess.accuracy_pct.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-400">{sess.correct_notes}/{sess.total_notes} Hit</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
