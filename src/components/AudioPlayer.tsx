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
      {/* 下部の音楽バー */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/70 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto">
          {/* 左: メニューボタン */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="p-2 text-white/60 hover:text-white transition-colors drop-shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 中央: 曲名とコントロール */}
          <div className="flex items-center gap-4 flex-1 justify-center">
            <div className="flex items-center gap-3">
              {/* 前の曲 */}
              <button className="p-1 text-white/40 hover:text-white/80 transition-colors">
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
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* 次の曲 */}
              <button className="p-1 text-white/40 hover:text-white/80 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* 曲名 + プログレスバー */}
            <div className="flex-1 max-w-md">
              <div className="text-white/80 text-sm mb-1 text-center">
                {nowPlayingText()}
              </div>
              {/* 再生バー（音楽用） */}
              {isMusicPlaying && selectedMusic && (
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/60 rounded-full w-1/3 animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* 右: プレイヤー表示ボタン */}
          <div className="flex items-center gap-2">
            {/* 音楽プレイヤー表示 */}
            <button
              onClick={() => setShowMusicPlayer(!showMusicPlayer)}
              className={`p-2 transition-colors ${showMusicPlayer ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
              title="音楽プレイヤーを表示"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </button>

            {/* 環境音プレイヤー表示 */}
            <button
              onClick={() => setShowAmbientPlayer(!showAmbientPlayer)}
              className={`p-2 transition-colors ${showAmbientPlayer ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
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
        <div className="fixed bottom-16 left-4 bg-black/90 backdrop-blur-md rounded-xl p-4 w-80 border border-white/20 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-medium">音源設定</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 音楽セクション */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">音楽</span>
              <button
                onClick={toggleMusic}
                className={`w-8 h-4 rounded-full transition-colors ${
                  isMusicPlaying ? "bg-white/60" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full transition-transform mx-0.5 ${
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
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedMusic?.id === preset.id
                      ? "bg-white/30 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* 環境音セクション */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">環境音</span>
              <button
                onClick={toggleAmbient}
                className={`w-8 h-4 rounded-full transition-colors ${
                  isAmbientPlaying ? "bg-white/60" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full transition-transform mx-0.5 ${
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
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedAmbient?.id === preset.id
                      ? "bg-white/30 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* カスタムURL */}
          <div>
            <span className="text-sm text-white/60 block mb-2">カスタムURL</span>
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setCustomType("music")}
                className={`px-2 py-1 text-xs rounded ${
                  customType === "music" ? "bg-white/20" : "bg-white/5"
                }`}
              >
                音楽
              </button>
              <button
                onClick={() => setCustomType("ambient")}
                className={`px-2 py-1 text-xs rounded ${
                  customType === "ambient" ? "bg-white/20" : "bg-white/5"
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
                className="flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/30"
              />
              <button
                onClick={handleCustomUrl}
                className="bg-white/20 hover:bg-white/30 rounded px-3 text-xs transition-colors"
              >
                追加
              </button>
            </div>
          </div>

          {/* 注意書き */}
          <p className="text-white/30 text-xs mt-4">
            ※ 音量調節はプレイヤー内で行えます
          </p>
        </div>
      )}

      {/* 音楽プレイヤー（フローティング） */}
      {showMusicPlayer && isMusicPlaying && selectedMusic && (
        <div className="fixed bottom-20 right-4 bg-black/90 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 bg-white/5">
            <span className="text-white/60 text-xs">音楽: {selectedMusic.name}</span>
            <button
              onClick={() => setShowMusicPlayer(false)}
              className="text-white/40 hover:text-white transition-colors"
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
        <div className="fixed bottom-20 right-24 bg-black/90 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 bg-white/5">
            <span className="text-white/60 text-xs">環境音: {selectedAmbient.name}</span>
            <button
              onClick={() => setShowAmbientPlayer(false)}
              className="text-white/40 hover:text-white transition-colors"
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
