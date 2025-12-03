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

  return (
    <div className="text-white">
      <div className="text-4xl font-light tracking-wider text-white/80">
        {formatTime(time)}
      </div>
    </div>
  );
}
