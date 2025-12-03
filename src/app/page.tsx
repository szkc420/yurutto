import BackgroundVideo from "@/components/BackgroundVideo";
import Clock from "@/components/Clock";
import PomodoroTimer from "@/components/PomodoroTimer";
import TaskMemo from "@/components/TaskMemo";
import AudioPlayer from "@/components/AudioPlayer";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      {/* 背景 */}
      <BackgroundVideo
        imageSrc="/backgrounds/night.jpeg"
        // videoSrc="/backgrounds/night.mp4" // 動画が用意できたらコメントを外す
      />

      {/* メインコンテンツ */}
      <div className="min-h-screen flex pb-16">
        {/* 左側: タスクメモ */}
        <div className="fixed left-8 top-8">
          <TaskMemo />
        </div>

        {/* 右側: タイマー */}
        <div className="fixed right-8 top-8">
          <PomodoroTimer />
        </div>

        {/* 左下: 時計 */}
        <div className="fixed left-8 bottom-20">
          <Clock />
        </div>

        {/* 右下: ジャーナルボタン */}
        <div className="fixed right-8 bottom-20">
          <button className="text-white/40 hover:text-white/60 transition-colors text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>ジャーナル</span>
          </button>
        </div>
      </div>

      {/* 音楽プレイヤー（下部バー） */}
      <AudioPlayer />
    </div>
  );
}
