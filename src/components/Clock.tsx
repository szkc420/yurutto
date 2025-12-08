"use client";

import { useState, useEffect } from "react";

export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
  };

  return (
    <div className="relative">
      {/* 温かみのあるグロー背景 */}
      <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl blur-xl" />

      <div className="relative text-amber-50/90">
        {/* 日付 */}
        <div className="text-sm text-amber-200/60 tracking-wide" style={{ textShadow: '0 2px 8px rgba(255, 180, 100, 0.3)' }}>
          {formatDate(time)}
        </div>
        {/* 時刻 */}
        <div
          className="text-5xl font-light tracking-wider lamp-glow"
          style={{
            textShadow: '0 0 20px rgba(255, 200, 120, 0.4), 0 0 40px rgba(255, 180, 100, 0.2)',
            color: '#fff5e6'
          }}
        >
          {formatTime(time)}
        </div>
      </div>
    </div>
  );
}
