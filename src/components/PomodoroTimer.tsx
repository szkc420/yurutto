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

  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className="text-white">
      {showSettings ? (
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-5 w-56 shadow-lg">
          <h3 className="text-base font-medium mb-4 drop-shadow-md">タイマー設定</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">作業時間（分）</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.workMinutes}
                onChange={(e) => handleSettingChange("workMinutes", parseInt(e.target.value) || 1)}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white border border-white/20 focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">休憩時間（分）</label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.breakMinutes}
                onChange={(e) => handleSettingChange("breakMinutes", parseInt(e.target.value) || 1)}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white border border-white/20 focus:outline-none focus:border-white/40"
              />
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-white/20 hover:bg-white/30 rounded-lg py-2 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* 円形タイマー */}
          <div className="relative w-48 h-48 drop-shadow-lg">
            <svg className="w-full h-full transform -rotate-90">
              {/* 背景の円 */}
              <circle
                cx="96"
                cy="96"
                r={radius}
                fill="rgba(0,0,0,0.3)"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />
              {/* プログレスの円 */}
              <circle
                cx="96"
                cy="96"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear drop-shadow-md"
                style={{
                  filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))"
                }}
              />
            </svg>

            {/* 中央のコンテンツ */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-sm text-white/60 mb-1 drop-shadow-md">
                {mode === "work" ? "作業中" : "休憩中"}
              </div>
              <div className="text-4xl font-light tracking-wider drop-shadow-lg">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* コントロールボタン */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-white/50 hover:text-white transition-colors drop-shadow-md"
              title="設定"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={toggleTimer}
              className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shadow-lg"
            >
              {isRunning ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleReset}
              className="p-2 text-white/50 hover:text-white transition-colors drop-shadow-md"
              title="リセット"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* モード切替（停止中のみ） */}
          {!isRunning && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => switchMode("work")}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  mode === "work" ? "bg-white/25 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"
                }`}
              >
                作業
              </button>
              <button
                onClick={() => switchMode("break")}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  mode === "break" ? "bg-white/25 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"
                }`}
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
