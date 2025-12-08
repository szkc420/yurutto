"use client";

import { useState, useEffect, useCallback } from "react";

type TimerMode = "work" | "break";

interface PomodoroSettings {
  workMinutes: number;
  breakMinutes: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  breakMinutes: 5,
};

export default function PomodoroTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [timeLeft, setTimeLeft] = useState(settings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>("work");
  const [showSettings, setShowSettings] = useState(false);

  const getTotalTime = useCallback(() => {
    return mode === "work" ? settings.workMinutes * 60 : settings.breakMinutes * 60;
  }, [mode, settings]);

  const switchMode = (newMode: TimerMode) => {
    if (isRunning) return;
    if (newMode === mode) return;
    setMode(newMode);
    setTimeLeft(newMode === "work" ? settings.workMinutes * 60 : settings.breakMinutes * 60);
  };

  const handleTimerComplete = useCallback(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(mode === "work" ? "休憩時間です！" : "作業再開！");
      }
    }
    const nextMode = mode === "work" ? "break" : "work";
    setMode(nextMode);
    setTimeLeft(nextMode === "work" ? settings.workMinutes * 60 : settings.breakMinutes * 60);
    setIsRunning(false);
  }, [mode, settings]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, handleTimerComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(getTotalTime());
  };

  const handleSettingChange = (key: keyof PomodoroSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (!isRunning) {
      setTimeLeft(
        mode === "work" ? newSettings.workMinutes * 60 : newSettings.breakMinutes * 60
      );
    }
  };

  const progress = (timeLeft / getTotalTime()) * 100;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  const isWorkMode = mode === "work";

  // 水彩画の背景に合わせた色調
  const colors = isWorkMode
    ? {
        stroke: "#ffd591",
        glow: "rgba(255, 213, 145, 0.4)",
        bg: "rgba(255, 179, 71, 0.08)",
        text: "#fff8f0",
        accent: "rgba(255, 213, 145, 0.6)"
      }
    : {
        stroke: "#a8d5ba",
        glow: "rgba(122, 155, 118, 0.4)",
        bg: "rgba(122, 155, 118, 0.08)",
        text: "#f0fff5",
        accent: "rgba(168, 213, 186, 0.6)"
      };

  return (
    <div className="relative">
      {showSettings ? (
        <div
          className="paper-texture wood-frame rounded-2xl p-5 w-56 ink-spread"
          style={{
            background: "linear-gradient(145deg, rgba(55, 48, 40, 0.95), rgba(45, 38, 30, 0.98))"
          }}
        >
          <h3 className="text-base font-medium mb-4 ink-text" style={{ color: colors.text }}>
            タイマー設定
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "rgba(212, 165, 116, 0.6)" }}>
                作業時間（分）
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.workMinutes}
                onChange={(e) => handleSettingChange("workMinutes", parseInt(e.target.value) || 1)}
                className="w-full rounded-lg px-3 py-2 text-sm transition-all"
                style={{
                  background: "rgba(139, 111, 71, 0.15)",
                  border: "1px solid rgba(212, 165, 116, 0.2)",
                  color: "#f5f0e8"
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "rgba(212, 165, 116, 0.6)" }}>
                休憩時間（分）
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.breakMinutes}
                onChange={(e) => handleSettingChange("breakMinutes", parseInt(e.target.value) || 1)}
                className="w-full rounded-lg px-3 py-2 text-sm transition-all"
                style={{
                  background: "rgba(139, 111, 71, 0.15)",
                  border: "1px solid rgba(212, 165, 116, 0.2)",
                  color: "#f5f0e8"
                }}
              />
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full rounded-lg py-2 transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(139, 111, 71, 0.15))",
                border: "1px solid rgba(212, 165, 116, 0.3)",
                color: "#f5f0e8"
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center relative">
          {/* 背景グロー - ランプの光のような */}
          <div
            className="absolute inset-0 rounded-full blur-3xl transition-all duration-1000"
            style={{
              background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
              opacity: isRunning ? 0.6 : 0.3
            }}
          />

          {/* 円形タイマー */}
          <div className="relative w-44 h-44">
            <svg className="w-full h-full transform -rotate-90">
              {/* 背景の円 - 古い紙のような */}
              <circle
                cx="88"
                cy="88"
                r={radius}
                fill="rgba(42, 37, 32, 0.5)"
                stroke="rgba(139, 111, 71, 0.2)"
                strokeWidth="3"
              />
              {/* プログレスの円 */}
              <circle
                cx="88"
                cy="88"
                r={radius}
                fill="none"
                stroke={colors.stroke}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
                style={{
                  filter: `drop-shadow(0 0 8px ${colors.glow})`,
                  opacity: 0.9
                }}
              />
              {/* 装飾的な内側の円 */}
              <circle
                cx="88"
                cy="88"
                r={radius - 12}
                fill="none"
                stroke="rgba(212, 165, 116, 0.1)"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
            </svg>

            {/* 中央のコンテンツ */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="text-xs tracking-widest mb-1"
                style={{ color: colors.accent }}
              >
                {isWorkMode ? "作業中" : "休憩中"}
              </div>
              <div
                className="text-4xl font-light tracking-wider lamp-flicker"
                style={{
                  color: colors.text,
                  textShadow: `0 0 20px ${colors.glow}, 0 2px 4px rgba(0, 0, 0, 0.3)`,
                  fontFamily: "var(--font-zen-maru), sans-serif"
                }}
              >
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* コントロールボタン */}
          <div className="flex items-center gap-4 mt-4 relative z-10">
            {/* 設定ボタン */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 transition-all hover:scale-110"
              style={{ color: "rgba(212, 165, 116, 0.5)" }}
              title="設定"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* 再生/一時停止ボタン - 木のボタンのような */}
            <button
              onClick={toggleTimer}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{
                background: `linear-gradient(145deg, rgba(60, 52, 42, 0.9), rgba(45, 38, 30, 0.95))`,
                boxShadow: `
                  0 0 20px ${colors.glow},
                  inset 0 1px 0 rgba(255, 213, 145, 0.1),
                  0 4px 12px rgba(0, 0, 0, 0.3)
                `,
                border: `1px solid ${colors.accent}`
              }}
            >
              {isRunning ? (
                <svg className="w-5 h-5" fill={colors.text} viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill={colors.text} viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* リセットボタン */}
            <button
              onClick={handleReset}
              className="p-2 transition-all hover:scale-110"
              style={{ color: "rgba(212, 165, 116, 0.5)" }}
              title="リセット"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* モード切替（停止中のみ） */}
          {!isRunning && (
            <div className="flex gap-2 mt-3 relative z-10">
              <button
                onClick={() => switchMode("work")}
                className="px-4 py-1.5 rounded-full text-xs transition-all"
                style={{
                  background: isWorkMode
                    ? "linear-gradient(135deg, rgba(255, 213, 145, 0.2), rgba(255, 179, 71, 0.15))"
                    : "rgba(139, 111, 71, 0.1)",
                  border: isWorkMode
                    ? "1px solid rgba(255, 213, 145, 0.4)"
                    : "1px solid rgba(139, 111, 71, 0.2)",
                  color: isWorkMode ? "#ffd591" : "rgba(212, 165, 116, 0.5)",
                  boxShadow: isWorkMode ? "0 0 12px rgba(255, 213, 145, 0.2)" : "none"
                }}
              >
                作業
              </button>
              <button
                onClick={() => switchMode("break")}
                className="px-4 py-1.5 rounded-full text-xs transition-all"
                style={{
                  background: !isWorkMode
                    ? "linear-gradient(135deg, rgba(122, 155, 118, 0.2), rgba(168, 213, 186, 0.15))"
                    : "rgba(139, 111, 71, 0.1)",
                  border: !isWorkMode
                    ? "1px solid rgba(122, 155, 118, 0.4)"
                    : "1px solid rgba(139, 111, 71, 0.2)",
                  color: !isWorkMode ? "#a8d5ba" : "rgba(212, 165, 116, 0.5)",
                  boxShadow: !isWorkMode ? "0 0 12px rgba(122, 155, 118, 0.2)" : "none"
                }}
              >
                休憩
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
