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

        {/* 右下: ジャーナルボタン */}
        <div className="fixed right-8 bottom-20">
          <button
            onClick={handleJournalClick}
            className="text-white/50 hover:text-white/80 transition-colors text-sm flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>ジャーナル</span>
            {!loading && (
              <span className="text-xs text-white/30">
                {user ? "" : "(ログイン)"}
              </span>
            )}
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
