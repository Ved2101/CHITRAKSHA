"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Calendar as CalendarIcon, BarChart2, Download, Check, AlertCircle, Sparkles } from "lucide-react";

interface MoodLog {
  id: number;
  date: string;
  mood_score: number;
  notes: string;
}

interface Insights {
  average_mood: number;
  total_days_logged: number;
  mood_distribution: Record<number, number>;
  recent_trend: Array<{ date: string; score: number }>;
}

const EMOJIS = [
  { score: 1, label: "Deeply Overwhelmed", emoji: "😢", color: "bg-terracotta", text: "text-terracotta" },
  { score: 2, label: "Anxious / Low", emoji: "😕", color: "bg-saffron", text: "text-saffron" },
  { score: 3, label: "Neutral / Restless", emoji: "😐", color: "bg-sand-dark", text: "text-charcoal-light" },
  { score: 4, label: "Calm / Comfortable", emoji: "🙂", color: "bg-sage-light", text: "text-sage" },
  { score: 5, label: "Peaceful / Centered", emoji: "🌸", color: "bg-sage", text: "text-sage-dark" }
];

export default function MoodTracker() {
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  
  const [selectedScore, setSelectedScore] = useState<number>(3);
  const [notes, setNotes] = useState("");
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().split("T")[0]);
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchMoodData = async () => {
    try {
      const logs = await api.getMoods();
      setMoodLogs(logs);
      const ins = await api.getMoodInsights();
      setInsights(ins);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to load mood logs.");
    }
  };

  useEffect(() => {
    fetchMoodData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await api.logMood(dateInput, selectedScore, notes);
      setSuccessMsg("Your mood has been logged securely.");
      setNotes("");
      await fetchMoodData();
      
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to save mood check-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await api.exportMoodCsv();
    } catch (e: any) {
      setErrorMsg("Failed to download CSV.");
    }
  };

  // Generate Calendar Days for Current Month
  const renderCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    
    // First day of current month
    const firstDay = new Date(year, month, 1).getDay();
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Pad previous month's blank days
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }
    
    // Loop over current month's days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const log = moodLogs.find(l => l.date === dateStr);
      
      let bgStyle = "bg-sand hover:bg-sand-dark border border-sage/10";
      let textStyle = "text-charcoal";
      let titleTooltip = `No entry for ${dateStr}`;
      
      if (log) {
        const emojiData = EMOJIS.find(e => e.score === log.mood_score);
        if (emojiData) {
          bgStyle = `${emojiData.color} text-sand border-none font-bold`;
          textStyle = "text-sand-dark";
          titleTooltip = `${emojiData.label} (${emojiData.emoji}) - ${log.notes || "No notes"}`;
        }
      }
      
      days.push(
        <div 
          key={day} 
          title={titleTooltip}
          className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold cursor-help transition-all duration-200 shadow-sm relative ${bgStyle} ${textStyle}`}
        >
          <span>{day}</span>
          {log && (
            <span className="absolute bottom-1 text-[8px]">
              {EMOJIS.find(e => e.score === log.mood_score)?.emoji}
            </span>
          )}
        </div>
      );
    }
    
    return days;
  };

  // Generate Custom SVG Line Graph Path
  const renderSVGGraph = () => {
    if (!insights || !insights.recent_trend || insights.recent_trend.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center bg-sand/30 border border-dashed border-sage/10 rounded-xl">
          <p className="text-xs text-charcoal-light">Log your mood for a few days to view trends.</p>
        </div>
      );
    }

    const trend = insights.recent_trend;
    const width = 600;
    const height = 150;
    const padding = 30;
    
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = trend.map((val, idx) => {
      const x = padding + (idx / Math.max(trend.length - 1, 1)) * chartWidth;
      // Score range 1 to 5 maps to chartHeight to 0
      const y = padding + chartHeight - ((val.score - 1) / 4) * chartHeight;
      return { x, y, ...val };
    });

    let pathD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        // Curve fitting
        const prev = points[i - 1];
        const curr = points[i];
        const cpX1 = prev.x + (curr.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (curr.x - prev.x) / 2;
        const cpY2 = curr.y;
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
      }
    }

    return (
      <div className="overflow-x-auto pt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[450px]">
          {/* Horizontal lines */}
          {[1, 2, 3, 4, 5].map((lvl) => {
            const y = padding + chartHeight - ((lvl - 1) / 4) * chartHeight;
            return (
              <g key={lvl}>
                <line 
                  x1={padding} 
                  y1={y} 
                  x2={width - padding} 
                  y2={y} 
                  className="stroke-sage/10 stroke-1" 
                  strokeDasharray="4 4"
                />
                <text 
                  x={padding - 10} 
                  y={y + 4} 
                  className="fill-charcoal-light text-[9px] font-medium text-right"
                  textAnchor="end"
                >
                  {EMOJIS.find(e => e.score === lvl)?.emoji}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          {points.length > 1 && (
            <path 
              d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`} 
              className="fill-gradient" 
              fill="url(#mood-area-grad)"
              opacity="0.15"
            />
          )}

          {/* Sparkline curve */}
          <path 
            d={pathD} 
            className="stroke-saffron stroke-2 fill-none" 
            strokeLinecap="round"
          />

          {/* Data nodes */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4.5" 
                className="fill-sand stroke-saffron stroke-2 cursor-pointer hover:r-6 transition-all"
              />
              <text 
                x={p.x} 
                y={height - 8} 
                className="fill-charcoal-light text-[8px] font-semibold" 
                textAnchor="middle"
              >
                {p.date.split("-")[2]}
              </text>
            </g>
          ))}

          {/* Definitions */}
          <defs>
            <linearGradient id="mood-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e08e45" />
              <stop offset="100%" stopColor="#f9f6f0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  const getMonthName = () => {
    return new Date().toLocaleString("default", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-8 animate-float">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl md:text-4xl font-serif text-terracotta font-semibold flex items-center gap-2">
            Mood Sanctuary
          </h2>
          <p className="text-charcoal-light max-w-md">
            Log your daily feelings. Reflect on your emotional trends over time and export your records privately.
          </p>
        </div>
        
        <button 
          onClick={handleExport}
          className="flex items-center justify-center space-x-2 bg-sand-dark text-charcoal hover:bg-sage/10 px-4 py-2 border border-sage/20 rounded-xl text-xs font-semibold shadow-sm transition-all self-start md:self-center"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Mood History (CSV)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Check-in Form */}
        <div className="lg:col-span-1 bg-sand/60 border border-sage/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-serif font-bold text-sage flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-saffron" /> Log Today's Mood
            </h3>

            {/* Success and Error messages */}
            {successMsg && (
              <div className="flex items-center space-x-2 bg-sage/10 border border-sage/20 text-sage-dark text-xs p-3 rounded-xl">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center space-x-2 bg-terracotta/10 border border-terracotta/20 text-terracotta-dark text-xs p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Date Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-charcoal-light uppercase tracking-wider">Date of log</label>
              <input 
                type="date" 
                max={new Date().toISOString().split("T")[0]}
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-3 py-2 border border-sage/20 bg-sand/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal"
              />
            </div>

            {/* Emoji Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-charcoal-light uppercase tracking-wider">How do you feel?</label>
              <div className="grid grid-cols-5 gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e.score}
                    type="button"
                    onClick={() => setSelectedScore(e.score)}
                    className={`p-3 rounded-xl text-2xl transition-all duration-300 transform border flex flex-col items-center gap-1 ${
                      selectedScore === e.score 
                        ? "bg-sand border-saffron scale-110 shadow-sm" 
                        : "bg-sand/30 border-sage/10 opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <span>{e.emoji}</span>
                    <span className="text-[7px] text-charcoal-light font-bold text-center leading-none mt-1">
                      {e.score}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-center mt-2 italic text-saffron">
                "{EMOJIS.find(e => e.score === selectedScore)?.label}"
              </p>
            </div>

            {/* Note text field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-charcoal-light uppercase tracking-wider">Reflections / Vent notes</label>
              <textarea
                placeholder="What is making you feel this way? (Optional, completely private)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 border border-sage/20 bg-sand/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage focus:bg-sand text-charcoal resize-none placeholder:text-charcoal-light/40"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-terracotta hover:bg-terracotta-dark text-sand text-xs font-semibold rounded-xl transition-all duration-300 shadow-md shadow-terracotta/25 flex items-center justify-center"
            >
              {loading ? "Saving log..." : "Record secure entry"}
            </button>
          </form>
        </div>

        {/* Right Col: Visuals (Calendar + Graph) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Calendar Widget */}
          <div className="bg-sand/60 border border-sage/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-sage/10">
              <CalendarIcon className="w-5 h-5 text-terracotta" />
              <h3 className="text-lg font-serif font-bold text-charcoal">
                Feelings Calendar &bull; <span className="text-sm text-sage font-medium">{getMonthName()}</span>
              </h3>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold text-charcoal-light uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {renderCalendar()}
            </div>
          </div>

          {/* Visual Trend Chart */}
          <div className="bg-sand/60 border border-sage/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-sage/10">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-saffron" />
                <h3 className="text-lg font-serif font-bold text-charcoal">
                  Recent Emotional Flow (Past 7 Logs)
                </h3>
              </div>
              {insights && (
                <div className="text-xs font-semibold bg-saffron/10 text-saffron border border-saffron/20 px-2.5 py-1 rounded-lg">
                  Avg Score: {insights.average_mood} / 5
                </div>
              )}
            </div>
            {renderSVGGraph()}
          </div>

        </div>
      </div>
    </div>
  );
}
