"use client";

import { useState } from "react";
import BackgroundVideo from "@/components/BackgroundVideo";
import Clock from "@/components/Clock";
import PomodoroTimer from "@/components/PomodoroTimer";
import TaskMemo from "@/components/TaskMemo";
import AudioPlayer from "@/components/AudioPlayer";
import LoginModal from "@/components/LoginModal";
import JournalModal from "@/components/JournalModal";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);

  const handleJournalClick = () => {
    if (user) {
      setShowJournalModal(true);
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* 背景 */}
      <BackgroundVideo
        imageSrc="/backgrounds/night.jpeg"
        // videoSrc="/backgrounds/night.mp4"
      />

      {/* メインコンテンツ */}
      <div className="min-h-screen flex pb-16">
        {/* 左上: 時計 */}
        <div className="fixed left-8 top-8">
          <Clock />
        </div>

        {/* 右上: タイマー */}
        <div className="fixed right-8 top-8">
          <PomodoroTimer />
        </div>

        {/* 左下: タスクメモ */}
        <div className="fixed left-8 bottom-20">
          <TaskMemo />
        </div>

        {/* 右下: ジャーナルボタン - 本のようなデザイン */}
        <div className="fixed right-8 bottom-20">
          <button
            onClick={handleJournalClick}
            className="group relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(60, 50, 40, 0.9), rgba(45, 38, 30, 0.95))",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 200, 150, 0.1)",
              border: "1px solid rgba(212, 165, 116, 0.25)"
            }}
          >
            {/* 本の背表紙デコレーション */}
            <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-amber-600/40 via-amber-500/30 to-amber-600/40 rounded-full" />

            {/* 本のアイコン */}
            <svg
              className="w-5 h-5 text-amber-300/70 group-hover:text-amber-200 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>

            <span className="text-amber-100/80 group-hover:text-amber-50 text-sm font-medium transition-colors">
              ジャーナル
            </span>

            {!loading && !user && (
              <span className="text-xs text-amber-300/40 group-hover:text-amber-300/60 transition-colors">
                (ログイン)
              </span>
            )}

            {/* ホバー時のグロー効果 */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: "radial-gradient(circle at center, rgba(255, 180, 100, 0.15) 0%, transparent 70%)"
              }}
            />
          </button>
        </div>
      </div>

      {/* 音楽プレイヤー */}
      <AudioPlayer />

      {/* ログインモーダル */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* ジャーナルモーダル */}
      <JournalModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
      />
    </div>
  );
}
