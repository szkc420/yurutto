"use client";

import { useState } from "react";

interface BackgroundVideoProps {
  // 動画が用意できるまでは静止画を表示
  videoSrc?: string;
  imageSrc?: string;
}

export default function BackgroundVideo({ videoSrc, imageSrc }: BackgroundVideoProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* 静止画（フォールバック） */}
      {imageSrc && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            isVideoLoaded ? "opacity-0" : "opacity-100"
          }`}
          style={{ backgroundImage: `url(${imageSrc})` }}
        />
      )}

      {/* 動画 */}
      {videoSrc && (
        <video
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            isVideoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* デフォルト背景色（画像も動画もない場合） */}
      {!imageSrc && !videoSrc && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
      )}

      {/* オーバーレイ（少し暗くして文字を読みやすく） */}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}
