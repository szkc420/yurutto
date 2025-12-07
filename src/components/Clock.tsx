"use client";

import { useState, useEffect } from "react";

export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
  };

  return (
    <div className="text-white">
      <div className="text-sm text-white/60 drop-shadow-md">
        {formatDate(time)}
      </div>
      <div className="text-4xl font-light tracking-wider drop-shadow-lg">
        {formatTime(time)}
      </div>
    </div>
  );
}
