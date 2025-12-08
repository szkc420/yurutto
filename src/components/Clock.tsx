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
    <div className="relative group">
      {/* ランプの光のような背景グロー */}
      <div
        className="absolute -inset-6 rounded-3xl opacity-60 lamp-flicker"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(255, 213, 145, 0.15) 0%, rgba(255, 179, 71, 0.05) 50%, transparent 80%)"
        }}
      />

      {/* メインコンテンツ */}
      <div className="relative">
        {/* 日付 - インクで書いたような */}
        <div
          className="text-sm tracking-widest mb-1 ink-text"
          style={{
            color: "rgba(212, 165, 116, 0.7)",
            fontWeight: 300,
            letterSpacing: "0.15em"
          }}
        >
          {formatDate(time)}
        </div>

        {/* 時刻 - ランプに照らされた大きな文字 */}
        <div
          className="font-light tracking-wider lamp-flicker"
          style={{
            fontSize: "3.5rem",
            lineHeight: 1,
            color: "#fff8f0",
            textShadow: `
              0 0 30px rgba(255, 213, 145, 0.4),
              0 0 60px rgba(255, 179, 71, 0.2),
              0 2px 4px rgba(0, 0, 0, 0.3)
            `,
            fontFamily: "var(--font-zen-maru), sans-serif"
          }}
        >
          {formatTime(time)}
        </div>

        {/* 秒のドット - 呼吸するような */}
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full gentle-pulse"
              style={{
                background: "rgba(255, 213, 145, 0.5)",
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
