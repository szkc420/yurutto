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

        {/* 右下: ジャーナルボタン - 古い革表紙の本のようなデザイン */}
        <div className="fixed right-8 bottom-20">
          <button
            onClick={handleJournalClick}
            className="group relative flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 ink-spread"
            style={{
              background: "linear-gradient(145deg, rgba(65, 55, 45, 0.95), rgba(45, 38, 30, 0.98))",
              boxShadow: `
                0 6px 24px rgba(0, 0, 0, 0.35),
                inset 0 1px 0 rgba(255, 213, 145, 0.08),
                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
              `,
              border: "1px solid rgba(139, 111, 71, 0.35)"
            }}
          >
            {/* 本の背表紙デコレーション - より詳細な装飾 */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl"
              style={{
                background: "linear-gradient(90deg, rgba(107, 68, 35, 0.6), rgba(139, 111, 71, 0.4))",
                borderRight: "1px solid rgba(212, 165, 116, 0.2)"
              }}
            />
            <div
              className="absolute left-2 top-3 bottom-3 w-px"
              style={{ background: "rgba(255, 213, 145, 0.15)" }}
            />

            {/* 本のアイコン - より装飾的に */}
            <div
              className="relative w-10 h-10 rounded-lg flex items-center justify-center transition-all group-hover:scale-110"
              style={{
                background: "linear-gradient(135deg, rgba(212, 165, 116, 0.12), rgba(139, 111, 71, 0.08))",
                border: "1px solid rgba(212, 165, 116, 0.2)"
              }}
            >
              <svg
                className="w-5 h-5 transition-all"
                fill="none"
                stroke="rgba(255, 213, 145, 0.8)"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              {/* アイコンのグロー */}
              <div
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "radial-gradient(circle, rgba(255, 213, 145, 0.2) 0%, transparent 70%)"
                }}
              />
            </div>

            {/* テキスト */}
            <div className="flex flex-col items-start">
              <span
                className="text-sm font-medium tracking-wide transition-all group-hover:text-white"
                style={{
                  color: "#ffd591",
                  textShadow: "0 1px 3px rgba(0, 0, 0, 0.4)"
                }}
              >
                ジャーナル
              </span>
              {!loading && !user && (
                <span
                  className="text-xs transition-colors"
                  style={{ color: "rgba(212, 165, 116, 0.5)" }}
                >
                  ログインして記録
                </span>
              )}
              {!loading && user && (
                <span
                  className="text-xs transition-colors"
                  style={{ color: "rgba(122, 155, 118, 0.7)" }}
                >
                  今日の記録を書く
                </span>
              )}
            </div>

            {/* 右側の装飾線 */}
            <div
              className="absolute right-3 top-4 bottom-4 w-px"
              style={{ background: "rgba(139, 111, 71, 0.2)" }}
            />

            {/* ホバー時のグロー効果 */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 30% 50%, rgba(255, 213, 145, 0.12) 0%, transparent 60%)"
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
