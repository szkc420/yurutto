"use client";

import { useState, useRef, useEffect } from "react";

interface AudioSource {
  id: string;
  name: string;
  type: "youtube" | "spotify" | "local";
  embedUrl: string;
}

const MUSIC_PRESETS: AudioSource[] = [
  {
    id: "local-lofi1",
    name: "Lo-Fi 1",
    type: "local",
    embedUrl: "/sounds/songs/lo-fi1.mp3",
  },
  {
    id: "local-lofi2",
    name: "Lo-Fi 2",
    type: "local",
    embedUrl: "/sounds/songs/lo-fi2.mp3",
  },
  {
    id: "lofi-girl",
    name: "Lofi Girl (YouTube)",
    type: "youtube",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
  },
  {
    id: "chillhop",
    name: "Chillhop (YouTube)",
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
  const [localMusicVolume, setLocalMusicVolume] = useState(0.5);

  // ローカル音楽再生用のref（JSXのaudio要素を参照）
  const localMusicRef = useRef<HTMLAudioElement>(null);

  // 再生/停止の制御
  useEffect(() => {
    const audio = localMusicRef.current;
    if (!audio || selectedMusic?.type !== "local") return;

    if (isMusicPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isMusicPlaying, selectedMusic?.type, selectedMusic?.embedUrl]);

  // 音量の制御
  useEffect(() => {
    const audio = localMusicRef.current;
    if (audio) {
      audio.volume = localMusicVolume;
    }
  }, [localMusicVolume, selectedMusic?.embedUrl]);

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
      {/* 下部の音楽バー - 木製レコードプレイヤーのような */}
      <div
        className="fixed bottom-0 left-0 right-0 backdrop-blur-md"
        style={{
          background: "linear-gradient(to top, rgba(35, 30, 25, 0.98), rgba(45, 38, 30, 0.95))",
          borderTop: "1px solid rgba(139, 111, 71, 0.25)",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.3)"
        }}
      >
        <div className="flex items-center justify-between px-6 py-3 max-w-screen-xl mx-auto">
          {/* 左: メニューボタン - 木彫りのような */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="p-2.5 rounded-xl transition-all hover:scale-105"
            style={{
              background: showPanel
                ? "linear-gradient(135deg, rgba(255, 213, 145, 0.15), rgba(139, 111, 71, 0.1))"
                : "transparent",
              border: showPanel ? "1px solid rgba(212, 165, 116, 0.3)" : "1px solid transparent",
              color: showPanel ? "#ffd591" : "rgba(212, 165, 116, 0.5)"
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* 中央: 曲名とコントロール */}
          <div className="flex items-center gap-6 flex-1 justify-center">
            <div className="flex items-center gap-4">
              {/* 前の曲 */}
              <button
                className="p-1.5 transition-all hover:scale-110"
                style={{ color: "rgba(212, 165, 116, 0.4)" }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* 再生/一時停止 - レコードプレイヤーのボタンのような */}
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
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style={{
                  background: isPlaying
                    ? "linear-gradient(145deg, rgba(60, 52, 42, 0.95), rgba(45, 38, 30, 1))"
                    : "linear-gradient(145deg, rgba(50, 44, 36, 0.9), rgba(40, 34, 28, 0.95))",
                  boxShadow: isPlaying
                    ? "0 0 25px rgba(255, 213, 145, 0.25), inset 0 1px 0 rgba(255, 213, 145, 0.1)"
                    : "inset 0 1px 0 rgba(255, 213, 145, 0.05), 0 4px 12px rgba(0, 0, 0, 0.3)",
                  border: isPlaying
                    ? "1px solid rgba(255, 213, 145, 0.4)"
                    : "1px solid rgba(139, 111, 71, 0.25)"
                }}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="#ffd591" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="rgba(212, 165, 116, 0.7)" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* 次の曲 */}
              <button
                className="p-1.5 transition-all hover:scale-110"
                style={{ color: "rgba(212, 165, 116, 0.4)" }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* 曲名 + プログレスバー */}
            <div className="flex-1 max-w-md">
              <div
                className="text-sm mb-1.5 text-center tracking-wide"
                style={{
                  color: isPlaying ? "#ffd591" : "rgba(212, 165, 116, 0.5)",
                  textShadow: isPlaying ? "0 0 10px rgba(255, 213, 145, 0.3)" : "none"
                }}
              >
                {nowPlayingText()}
              </div>
              {/* 再生バー - ビニールの溝のような */}
              {isPlaying && (
                <div
                  className="w-full h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(139, 111, 71, 0.2)" }}
                >
                  <div
                    className="h-full rounded-full w-1/3 gentle-pulse"
                    style={{
                      background: "linear-gradient(90deg, rgba(255, 179, 71, 0.5), rgba(255, 213, 145, 0.7))"
                    }}
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
              className="p-2.5 rounded-xl transition-all hover:scale-105"
              style={{
                background: showMusicPlayer
                  ? "linear-gradient(135deg, rgba(255, 213, 145, 0.15), rgba(139, 111, 71, 0.1))"
                  : "transparent",
                border: showMusicPlayer ? "1px solid rgba(212, 165, 116, 0.3)" : "1px solid transparent",
                color: showMusicPlayer ? "#ffd591" : "rgba(212, 165, 116, 0.5)"
              }}
              title="音楽プレイヤーを表示"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </button>

            {/* 環境音プレイヤー表示 */}
            <button
              onClick={() => setShowAmbientPlayer(!showAmbientPlayer)}
              className="p-2.5 rounded-xl transition-all hover:scale-105"
              style={{
                background: showAmbientPlayer
                  ? "linear-gradient(135deg, rgba(255, 213, 145, 0.15), rgba(139, 111, 71, 0.1))"
                  : "transparent",
                border: showAmbientPlayer ? "1px solid rgba(212, 165, 116, 0.3)" : "1px solid transparent",
                color: showAmbientPlayer ? "#ffd591" : "rgba(212, 165, 116, 0.5)"
              }}
              title="環境音プレイヤーを表示"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 音源選択パネル - 古いラジオのダイヤルのような */}
      {showPanel && (
        <div
          className="fixed bottom-16 left-4 paper-texture wood-frame rounded-2xl p-5 w-80 ink-spread"
          style={{
            background: "linear-gradient(155deg, rgba(55, 48, 40, 0.98), rgba(40, 34, 28, 0.99))"
          }}
        >
          <div className="flex justify-between items-center mb-5">
            <h3
              className="font-medium tracking-wide"
              style={{ color: "#ffd591", textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)" }}
            >
              音源設定
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              className="p-1 transition-all hover:scale-110"
              style={{ color: "rgba(212, 165, 116, 0.5)" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 音楽セクション */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: "rgba(212, 165, 116, 0.6)" }}>音楽</span>
              <button
                onClick={toggleMusic}
                className="w-10 h-5 rounded-full transition-all relative"
                style={{
                  background: isMusicPlaying
                    ? "linear-gradient(90deg, rgba(255, 179, 71, 0.4), rgba(255, 213, 145, 0.5))"
                    : "rgba(139, 111, 71, 0.2)",
                  border: "1px solid rgba(139, 111, 71, 0.3)"
                }}
              >
                <div
                  className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                  style={{
                    background: isMusicPlaying ? "#ffd591" : "rgba(212, 165, 116, 0.5)",
                    left: isMusicPlaying ? "calc(100% - 18px)" : "2px",
                    boxShadow: isMusicPlaying ? "0 0 8px rgba(255, 213, 145, 0.5)" : "none"
                  }}
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {MUSIC_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectMusic(preset)}
                  className="px-3 py-1.5 text-xs rounded-lg transition-all hover:scale-105"
                  style={{
                    background: selectedMusic?.id === preset.id
                      ? "linear-gradient(135deg, rgba(255, 213, 145, 0.2), rgba(255, 179, 71, 0.15))"
                      : "rgba(139, 111, 71, 0.15)",
                    border: selectedMusic?.id === preset.id
                      ? "1px solid rgba(255, 213, 145, 0.4)"
                      : "1px solid rgba(139, 111, 71, 0.2)",
                    color: selectedMusic?.id === preset.id ? "#ffd591" : "rgba(212, 165, 116, 0.6)",
                    boxShadow: selectedMusic?.id === preset.id ? "0 0 10px rgba(255, 213, 145, 0.2)" : "none"
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            {/* ローカル音楽の音量スライダー */}
            {selectedMusic?.type === "local" && (
              <div className="mt-3 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="rgba(212, 165, 116, 0.6)" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={localMusicVolume}
                  onChange={(e) => setLocalMusicVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255, 213, 145, 0.7) ${localMusicVolume * 100}%, rgba(139, 111, 71, 0.3) ${localMusicVolume * 100}%)`
                  }}
                />
                <span className="text-xs" style={{ color: "rgba(212, 165, 116, 0.5)", minWidth: "2rem" }}>
                  {Math.round(localMusicVolume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* 環境音セクション */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: "rgba(212, 165, 116, 0.6)" }}>環境音</span>
              <button
                onClick={toggleAmbient}
                className="w-10 h-5 rounded-full transition-all relative"
                style={{
                  background: isAmbientPlaying
                    ? "linear-gradient(90deg, rgba(122, 155, 118, 0.4), rgba(168, 213, 186, 0.5))"
                    : "rgba(139, 111, 71, 0.2)",
                  border: "1px solid rgba(139, 111, 71, 0.3)"
                }}
              >
                <div
                  className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                  style={{
                    background: isAmbientPlaying ? "#a8d5ba" : "rgba(212, 165, 116, 0.5)",
                    left: isAmbientPlaying ? "calc(100% - 18px)" : "2px",
                    boxShadow: isAmbientPlaying ? "0 0 8px rgba(122, 155, 118, 0.5)" : "none"
                  }}
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {AMBIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectAmbient(preset)}
                  className="px-3 py-1.5 text-xs rounded-lg transition-all hover:scale-105"
                  style={{
                    background: selectedAmbient?.id === preset.id
                      ? "linear-gradient(135deg, rgba(122, 155, 118, 0.2), rgba(168, 213, 186, 0.15))"
                      : "rgba(139, 111, 71, 0.15)",
                    border: selectedAmbient?.id === preset.id
                      ? "1px solid rgba(122, 155, 118, 0.4)"
                      : "1px solid rgba(139, 111, 71, 0.2)",
                    color: selectedAmbient?.id === preset.id ? "#a8d5ba" : "rgba(212, 165, 116, 0.6)",
                    boxShadow: selectedAmbient?.id === preset.id ? "0 0 10px rgba(122, 155, 118, 0.2)" : "none"
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* カスタムURL */}
          <div>
            <span className="text-sm block mb-2" style={{ color: "rgba(212, 165, 116, 0.6)" }}>
              カスタムURL
            </span>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setCustomType("music")}
                className="px-3 py-1 text-xs rounded-lg transition-all"
                style={{
                  background: customType === "music"
                    ? "linear-gradient(135deg, rgba(255, 213, 145, 0.15), rgba(255, 179, 71, 0.1))"
                    : "rgba(139, 111, 71, 0.1)",
                  border: customType === "music"
                    ? "1px solid rgba(255, 213, 145, 0.3)"
                    : "1px solid rgba(139, 111, 71, 0.15)",
                  color: customType === "music" ? "#ffd591" : "rgba(212, 165, 116, 0.5)"
                }}
              >
                音楽
              </button>
              <button
                onClick={() => setCustomType("ambient")}
                className="px-3 py-1 text-xs rounded-lg transition-all"
                style={{
                  background: customType === "ambient"
                    ? "linear-gradient(135deg, rgba(122, 155, 118, 0.15), rgba(168, 213, 186, 0.1))"
                    : "rgba(139, 111, 71, 0.1)",
                  border: customType === "ambient"
                    ? "1px solid rgba(122, 155, 118, 0.3)"
                    : "1px solid rgba(139, 111, 71, 0.15)",
                  color: customType === "ambient" ? "#a8d5ba" : "rgba(212, 165, 116, 0.5)"
                }}
              >
                環境音
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="YouTube/Spotify URL"
                className="flex-1 rounded-lg px-3 py-2 text-xs transition-all"
                style={{
                  background: "rgba(42, 37, 32, 0.6)",
                  border: "1px solid rgba(139, 111, 71, 0.25)",
                  color: "#f5f0e8",
                  caretColor: "#ffd591"
                }}
              />
              <button
                onClick={handleCustomUrl}
                className="rounded-lg px-4 text-xs transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(139, 111, 71, 0.15))",
                  border: "1px solid rgba(212, 165, 116, 0.3)",
                  color: "#ffd591"
                }}
              >
                追加
              </button>
            </div>
          </div>

          <p className="text-xs mt-4" style={{ color: "rgba(212, 165, 116, 0.3)" }}>
            ※ 音量調節はプレイヤー内で行えます
          </p>
        </div>
      )}

      {/* 音楽プレイヤー（フローティング） */}
      {showMusicPlayer && isMusicPlaying && selectedMusic && (
        <div
          className="fixed bottom-20 right-4 paper-texture wood-frame rounded-2xl overflow-hidden ink-spread"
          style={{
            background: "linear-gradient(155deg, rgba(55, 48, 40, 0.98), rgba(40, 34, 28, 0.99))"
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ borderBottom: "1px solid rgba(139, 111, 71, 0.2)" }}
          >
            <span className="text-xs" style={{ color: "rgba(255, 213, 145, 0.7)" }}>
              音楽: {selectedMusic.name}
            </span>
            <button
              onClick={() => setShowMusicPlayer(false)}
              className="p-1 transition-all hover:scale-110"
              style={{ color: "rgba(212, 165, 116, 0.5)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <iframe
            src={`${selectedMusic.embedUrl}?autoplay=1&controls=1`}
            allow="autoplay; encrypted-media"
            title="Music Player"
            className="w-96 h-56"
          />
        </div>
      )}

      {/* 環境音プレイヤー（フローティング） */}
      {showAmbientPlayer && isAmbientPlaying && selectedAmbient && (
        <div
          className="fixed bottom-20 right-[26rem] paper-texture wood-frame rounded-2xl overflow-hidden ink-spread"
          style={{
            background: "linear-gradient(155deg, rgba(55, 48, 40, 0.98), rgba(40, 34, 28, 0.99))"
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ borderBottom: "1px solid rgba(139, 111, 71, 0.2)" }}
          >
            <span className="text-xs" style={{ color: "rgba(168, 213, 186, 0.7)" }}>
              環境音: {selectedAmbient.name}
            </span>
            <button
              onClick={() => setShowAmbientPlayer(false)}
              className="p-1 transition-all hover:scale-110"
              style={{ color: "rgba(212, 165, 116, 0.5)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <iframe
            src={`${selectedAmbient.embedUrl}?autoplay=1&controls=1`}
            allow="autoplay; encrypted-media"
            title="Ambient Player"
            className="w-96 h-56"
          />
        </div>
      )}

      {/* ローカル音楽用のaudio要素 */}
      {selectedMusic?.type === "local" && (
        <audio
          ref={localMusicRef}
          src={selectedMusic.embedUrl}
          loop
          style={{ display: 'none' }}
        />
      )}

      {/* 隠れたiframeプレイヤー（プレイヤー非表示時、ローカル以外） */}
      {!showMusicPlayer && isMusicPlaying && selectedMusic && selectedMusic.type !== "local" && (
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
