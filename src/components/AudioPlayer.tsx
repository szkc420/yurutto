"use client";

import { useState } from "react";

interface AudioSource {
  id: string;
  name: string;
  type: "youtube" | "spotify";
  embedUrl: string;
}

const MUSIC_PRESETS: AudioSource[] = [
  {
    id: "lofi-girl",
    name: "Lofi Girl",
    type: "youtube",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
  },
  {
    id: "chillhop",
    name: "Chillhop Radio",
    type: "youtube",
    embedUrl: "https://www.youtube.com/embed/5yx6BWlEVcY",
  },
];

const AMBIENT_PRESETS: AudioSource[] = [
  {
    id: "rain",
    name: "雨音",
    type: "youtube",
    embedUrl: "https://www.youtube.com/embed/mPZkdNFkNps",
  },
  {
    id: "fireplace",
    name: "焚き火",
    type: "youtube",
    embedUrl: "https://www.youtube.com/embed/UgHKb_7884o",
  },
  {
    id: "cafe",
    name: "カフェ",
    type: "youtube",
    embedUrl: "https://www.youtube.com/embed/h2zkV-l_TbY",
  },
];

export default function AudioPlayer() {
  const [selectedMusic, setSelectedMusic] = useState<AudioSource | null>(null);
  const [selectedAmbient, setSelectedAmbient] = useState<AudioSource | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [showAmbientPlayer, setShowAmbientPlayer] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [customType, setCustomType] = useState<"music" | "ambient">("music");

  const convertToEmbedUrl = (url: string): string | null => {
    const youtubeMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    const spotifyMatch = url.match(
      /spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/
    );
    if (spotifyMatch) {
      return `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`;
    }
    return null;
  };

  const handleCustomUrl = () => {
    const embedUrl = convertToEmbedUrl(customUrl);
    if (embedUrl) {
      const source: AudioSource = {
        id: "custom",
        name: "カスタム",
        type: customUrl.includes("spotify") ? "spotify" : "youtube",
        embedUrl,
      };
      if (customType === "music") {
        setSelectedMusic(source);
        setIsMusicPlaying(true);
      } else {
        setSelectedAmbient(source);
        setIsAmbientPlaying(true);
      }
      setCustomUrl("");
    }
  };

  const selectMusic = (source: AudioSource) => {
    setSelectedMusic(source);
    setIsMusicPlaying(true);
  };

  const selectAmbient = (source: AudioSource) => {
    setSelectedAmbient(source);
    setIsAmbientPlaying(true);
  };

  const toggleMusic = () => {
    if (selectedMusic) {
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const toggleAmbient = () => {
    if (selectedAmbient) {
      setIsAmbientPlaying(!isAmbientPlaying);
    }
  };

  const nowPlayingText = () => {
    const parts = [];
    if (isMusicPlaying && selectedMusic) {
      parts.push(selectedMusic.name);
    }
    if (isAmbientPlaying && selectedAmbient) {
      parts.push(selectedAmbient.name);
    }
    return parts.length > 0 ? parts.join(" + ") : "再生停止中";
  };

  const isPlaying = isMusicPlaying || isAmbientPlaying;

  return (
    <>
      {/* 下部の音楽バー - 温かみのある木目調デザイン */}
      <div
        className="fixed bottom-0 left-0 right-0 backdrop-blur-md border-t"
        style={{
          background: "linear-gradient(to top, rgba(30, 25, 20, 0.95), rgba(40, 35, 28, 0.9))",
          borderColor: "rgba(212, 165, 116, 0.2)"
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto">
          {/* 左: メニューボタン */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="p-2 text-amber-200/50 hover:text-amber-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 中央: 曲名とコントロール */}
          <div className="flex items-center gap-4 flex-1 justify-center">
            <div className="flex items-center gap-3">
              {/* 前の曲 */}
              <button className="p-1 text-amber-300/30 hover:text-amber-200/70 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* 再生/一時停止 */}
              <button
                onClick={() => {
                  if (isPlaying) {
                    setIsMusicPlaying(false);
                    setIsAmbientPlaying(false);
                  } else {
                    if (selectedMusic) setIsMusicPlaying(true);
                    if (selectedAmbient) setIsAmbientPlaying(true);
                  }
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: isPlaying
                    ? "linear-gradient(135deg, rgba(255, 180, 100, 0.3), rgba(255, 150, 80, 0.2))"
                    : "rgba(255, 200, 150, 0.1)",
                  boxShadow: isPlaying ? "0 0 15px rgba(255, 180, 100, 0.3)" : "none"
                }}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 text-amber-100" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5 text-amber-200/70" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* 次の曲 */}
              <button className="p-1 text-amber-300/30 hover:text-amber-200/70 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* 曲名 + プログレスバー */}
            <div className="flex-1 max-w-md">
              <div className="text-amber-100/70 text-sm mb-1 text-center">
                {nowPlayingText()}
              </div>
              {/* 再生バー（音楽用） */}
              {isMusicPlaying && selectedMusic && (
                <div className="w-full h-1 bg-amber-900/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full w-1/3 animate-pulse"
                    style={{ background: "linear-gradient(90deg, rgba(255, 180, 100, 0.6), rgba(255, 200, 120, 0.8))" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 右: プレイヤー表示ボタン */}
          <div className="flex items-center gap-2">
            {/* 音楽プレイヤー表示 */}
            <button
              onClick={() => setShowMusicPlayer(!showMusicPlayer)}
              className={`p-2 transition-colors ${showMusicPlayer ? "text-amber-200" : "text-amber-300/40 hover:text-amber-200/70"}`}
              title="音楽プレイヤーを表示"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </button>

            {/* 環境音プレイヤー表示 */}
            <button
              onClick={() => setShowAmbientPlayer(!showAmbientPlayer)}
              className={`p-2 transition-colors ${showAmbientPlayer ? "text-amber-200" : "text-amber-300/40 hover:text-amber-200/70"}`}
              title="環境音プレイヤーを表示"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 12h.01M8 12a4 4 0 014-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 音源選択パネル */}
      {showPanel && (
        <div
          className="fixed bottom-16 left-4 backdrop-blur-md rounded-2xl p-4 w-80 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(45, 40, 35, 0.95), rgba(35, 30, 25, 0.98))",
            border: "1px solid rgba(212, 165, 116, 0.2)"
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-amber-100/80 font-medium">音源設定</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-amber-300/40 hover:text-amber-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 音楽セクション */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-200/50">音楽</span>
              <button
                onClick={toggleMusic}
                className={`w-8 h-4 rounded-full transition-colors ${
                  isMusicPlaying ? "bg-amber-500/60" : "bg-amber-900/40"
                }`}
              >
                <div
                  className={`w-3 h-3 bg-amber-100 rounded-full transition-transform mx-0.5 ${
                    isMusicPlaying ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {MUSIC_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectMusic(preset)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                    selectedMusic?.id === preset.id
                      ? "bg-amber-500/30 text-amber-100"
                      : "bg-amber-900/30 text-amber-200/50 hover:bg-amber-900/50"
                  }`}
                  style={selectedMusic?.id === preset.id ? { boxShadow: "0 0 8px rgba(255, 180, 100, 0.2)" } : {}}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* 環境音セクション */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-200/50">環境音</span>
              <button
                onClick={toggleAmbient}
                className={`w-8 h-4 rounded-full transition-colors ${
                  isAmbientPlaying ? "bg-amber-500/60" : "bg-amber-900/40"
                }`}
              >
                <div
                  className={`w-3 h-3 bg-amber-100 rounded-full transition-transform mx-0.5 ${
                    isAmbientPlaying ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {AMBIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectAmbient(preset)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                    selectedAmbient?.id === preset.id
                      ? "bg-amber-500/30 text-amber-100"
                      : "bg-amber-900/30 text-amber-200/50 hover:bg-amber-900/50"
                  }`}
                  style={selectedAmbient?.id === preset.id ? { boxShadow: "0 0 8px rgba(255, 180, 100, 0.2)" } : {}}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* カスタムURL */}
          <div>
            <span className="text-sm text-amber-200/50 block mb-2">カスタムURL</span>
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setCustomType("music")}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                  customType === "music" ? "bg-amber-500/30 text-amber-100" : "bg-amber-900/30 text-amber-200/40"
                }`}
              >
                音楽
              </button>
              <button
                onClick={() => setCustomType("ambient")}
                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                  customType === "ambient" ? "bg-amber-500/30 text-amber-100" : "bg-amber-900/30 text-amber-200/40"
                }`}
              >
                環境音
              </button>
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="YouTube/Spotify URL"
                className="flex-1 bg-amber-900/30 rounded-lg px-3 py-1.5 text-xs text-amber-50 placeholder-amber-200/30 border border-amber-500/20 focus:outline-none focus:border-amber-500/40"
              />
              <button
                onClick={handleCustomUrl}
                className="bg-amber-500/30 hover:bg-amber-500/40 rounded-lg px-3 text-xs text-amber-100 transition-colors"
              >
                追加
              </button>
            </div>
          </div>

          {/* 注意書き */}
          <p className="text-amber-200/20 text-xs mt-4">
            ※ 音量調節はプレイヤー内で行えます
          </p>
        </div>
      )}

      {/* 音楽プレイヤー（フローティング） */}
      {showMusicPlayer && isMusicPlaying && selectedMusic && (
        <div
          className="fixed bottom-20 right-4 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(45, 40, 35, 0.95), rgba(35, 30, 25, 0.98))",
            border: "1px solid rgba(212, 165, 116, 0.2)"
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 bg-amber-900/20">
            <span className="text-amber-200/60 text-xs">音楽: {selectedMusic.name}</span>
            <button
              onClick={() => setShowMusicPlayer(false)}
              className="text-amber-300/40 hover:text-amber-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <iframe
            src={`${selectedMusic.embedUrl}?autoplay=1`}
            allow="autoplay; encrypted-media"
            title="Music Player"
            className="w-80 h-20"
          />
        </div>
      )}

      {/* 環境音プレイヤー（フローティング） */}
      {showAmbientPlayer && isAmbientPlaying && selectedAmbient && (
        <div
          className="fixed bottom-20 right-24 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(45, 40, 35, 0.95), rgba(35, 30, 25, 0.98))",
            border: "1px solid rgba(212, 165, 116, 0.2)"
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 bg-amber-900/20">
            <span className="text-amber-200/60 text-xs">環境音: {selectedAmbient.name}</span>
            <button
              onClick={() => setShowAmbientPlayer(false)}
              className="text-amber-300/40 hover:text-amber-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <iframe
            src={`${selectedAmbient.embedUrl}?autoplay=1`}
            allow="autoplay; encrypted-media"
            title="Ambient Player"
            className="w-80 h-20"
          />
        </div>
      )}

      {/* 隠れたiframeプレイヤー（プレイヤー非表示時） */}
      {!showMusicPlayer && isMusicPlaying && selectedMusic && (
        <div className="hidden">
          <iframe
            src={`${selectedMusic.embedUrl}?autoplay=1`}
            allow="autoplay; encrypted-media"
            title="Music Player Hidden"
          />
        </div>
      )}
      {!showAmbientPlayer && isAmbientPlaying && selectedAmbient && (
        <div className="hidden">
          <iframe
            src={`${selectedAmbient.embedUrl}?autoplay=1`}
            allow="autoplay; encrypted-media"
            title="Ambient Player Hidden"
          />
        </div>
      )}
    </>
  );
}
