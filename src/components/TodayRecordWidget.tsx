"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface TrackerItem {
  id: string;
  name: string;
  excludedDays: number[];
}

interface TrackerData {
  items: TrackerItem[];
  records: { [date: string]: { [itemId: string]: boolean } };
  updatedAt: string;
}

interface GraphData {
  axis1: { name: string; min: number; max: number };
  axis2: { name: string; min: number; max: number };
  records: { [date: string]: { value1: number | null; value2: number | null } };
  updatedAt: string;
}

const DEFAULT_TRACKER_ITEMS: TrackerItem[] = [
  { id: "water", name: "水を飲む", excludedDays: [] },
  { id: "exercise", name: "運動", excludedDays: [] },
  { id: "reading", name: "読書", excludedDays: [] },
  { id: "meditation", name: "瞑想", excludedDays: [] },
  { id: "gratitude", name: "感謝", excludedDays: [] },
];

const DEFAULT_GRAPH_DATA: GraphData = {
  axis1: { name: "MOOD", min: -2, max: 2 },
  axis2: { name: "SLEEP", min: 4, max: 8 },
  records: {},
  updatedAt: new Date().toISOString(),
};

export default function TodayRecordWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [trackerData, setTrackerData] = useState<TrackerData>({
    items: DEFAULT_TRACKER_ITEMS,
    records: {},
    updatedAt: new Date().toISOString(),
  });
  const [graphData, setGraphData] = useState<GraphData>(DEFAULT_GRAPH_DATA);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // データ読み込み
  useEffect(() => {
    if (!user || !isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // トラッカーデータ
        const trackerRef = doc(db, "users", user.uid, "tracker", monthKey);
        const trackerSnap = await getDoc(trackerRef);
        if (trackerSnap.exists()) {
          setTrackerData(trackerSnap.data() as TrackerData);
        }

        // グラフデータ
        const graphRef = doc(db, "users", user.uid, "graph", monthKey);
        const graphSnap = await getDoc(graphRef);
        if (graphSnap.exists()) {
          setGraphData(graphSnap.data() as GraphData);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, isOpen, monthKey]);

  // トラッカー保存
  const saveTracker = async (newData: TrackerData) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "tracker", monthKey);
      await setDoc(docRef, newData);
    } catch (error) {
      console.error("Failed to save tracker:", error);
    }
  };

  // グラフ保存
  const saveGraph = async (newData: GraphData) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "graph", monthKey);
      await setDoc(docRef, newData);
    } catch (error) {
      console.error("Failed to save graph:", error);
    }
  };

  // 習慣トグル
  const toggleHabit = (itemId: string) => {
    const newRecords = { ...trackerData.records };
    if (!newRecords[dateKey]) {
      newRecords[dateKey] = {};
    }
    newRecords[dateKey][itemId] = !newRecords[dateKey][itemId];

    const newData = {
      ...trackerData,
      records: newRecords,
      updatedAt: new Date().toISOString(),
    };
    setTrackerData(newData);
    saveTracker(newData);
  };

  // MOOD更新
  const updateMood = (value: number) => {
    const newRecords = { ...graphData.records };
    if (!newRecords[dateKey]) {
      newRecords[dateKey] = { value1: null, value2: null };
    }
    newRecords[dateKey].value1 = value;

    const newData = {
      ...graphData,
      records: newRecords,
      updatedAt: new Date().toISOString(),
    };
    setGraphData(newData);
    saveGraph(newData);
  };

  // SLEEP更新
  const updateSleep = (value: number) => {
    const newRecords = { ...graphData.records };
    if (!newRecords[dateKey]) {
      newRecords[dateKey] = { value1: null, value2: null };
    }
    newRecords[dateKey].value2 = value;

    const newData = {
      ...graphData,
      records: newRecords,
      updatedAt: new Date().toISOString(),
    };
    setGraphData(newData);
    saveGraph(newData);
  };

  // 現在の値を取得
  const currentMood = graphData.records[dateKey]?.value1 ?? null;
  const currentSleep = graphData.records[dateKey]?.value2 ?? null;
  const completedHabits = trackerData.items.filter(
    (item) => trackerData.records[dateKey]?.[item.id]
  ).length;
  const totalHabits = trackerData.items.length;

  // ログインしていない場合は表示しない
  if (!user) return null;

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-40 p-3 rounded-full transition-all hover:scale-110 paper-texture wood-frame"
        style={{
          background: "linear-gradient(135deg, rgba(55, 48, 40, 0.95), rgba(42, 36, 28, 0.98))",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="relative">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="rgba(255, 213, 145, 0.8)"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {/* 進捗インジケーター */}
          {(completedHabits > 0 || currentMood !== null) && (
            <div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
              style={{
                background: completedHabits === totalHabits && currentMood !== null && currentSleep !== null
                  ? "rgba(122, 155, 118, 0.9)"
                  : "rgba(255, 213, 145, 0.8)",
              }}
            />
          )}
        </div>
      </button>

      {/* ウィジェットパネル */}
      {isOpen && (
        <div
          className="fixed bottom-36 right-4 z-40 w-72 rounded-xl paper-texture wood-frame overflow-hidden"
          style={{
            background: "linear-gradient(165deg, rgba(55, 48, 40, 0.98) 0%, rgba(42, 36, 28, 0.99) 100%)",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* ヘッダー */}
          <div
            className="flex items-center justify-between p-3"
            style={{ borderBottom: "1px solid rgba(139, 111, 71, 0.25)" }}
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="rgba(255, 213, 145, 0.8)"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
              <span className="text-sm font-medium" style={{ color: "#ffd591" }}>
                今日の記録
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded transition-all hover:scale-110"
              style={{ color: "rgba(212, 165, 116, 0.5)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="p-4 animate-pulse space-y-3">
              <div className="h-8 rounded" style={{ background: "rgba(139, 111, 71, 0.2)" }} />
              <div className="h-8 rounded" style={{ background: "rgba(139, 111, 71, 0.2)" }} />
              <div className="h-16 rounded" style={{ background: "rgba(139, 111, 71, 0.2)" }} />
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {/* MOOD入力 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "rgba(255, 213, 145, 0.7)" }}>
                    {graphData.axis1.name}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(212, 165, 116, 0.5)" }}>
                    {currentMood !== null ? currentMood : "未入力"}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[-2, -1, 0, 1, 2].map((value) => (
                    <button
                      key={value}
                      onClick={() => updateMood(value)}
                      className="flex-1 py-1.5 rounded text-xs transition-all hover:scale-105"
                      style={{
                        background: currentMood === value
                          ? "rgba(255, 213, 145, 0.25)"
                          : "rgba(42, 37, 32, 0.6)",
                        border: currentMood === value
                          ? "1px solid rgba(255, 213, 145, 0.5)"
                          : "1px solid rgba(139, 111, 71, 0.25)",
                        color: currentMood === value
                          ? "#ffd591"
                          : "rgba(212, 165, 116, 0.6)",
                      }}
                    >
                      {value > 0 ? `+${value}` : value}
                    </button>
                  ))}
                </div>
              </div>

              {/* SLEEP入力 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "rgba(168, 213, 186, 0.7)" }}>
                    {graphData.axis2.name}（時間）
                  </span>
                  <span className="text-xs" style={{ color: "rgba(212, 165, 116, 0.5)" }}>
                    {currentSleep !== null ? `${currentSleep}h` : "未入力"}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[4, 5, 6, 7, 8].map((value) => (
                    <button
                      key={value}
                      onClick={() => updateSleep(value)}
                      className="flex-1 py-1.5 rounded text-xs transition-all hover:scale-105"
                      style={{
                        background: currentSleep === value
                          ? "rgba(168, 213, 186, 0.25)"
                          : "rgba(42, 37, 32, 0.6)",
                        border: currentSleep === value
                          ? "1px solid rgba(168, 213, 186, 0.5)"
                          : "1px solid rgba(139, 111, 71, 0.25)",
                        color: currentSleep === value
                          ? "rgba(168, 213, 186, 0.9)"
                          : "rgba(212, 165, 116, 0.6)",
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {/* 習慣トラッカー */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "rgba(212, 165, 116, 0.7)" }}>
                    習慣トラッカー
                  </span>
                  <span className="text-xs" style={{ color: "rgba(212, 165, 116, 0.5)" }}>
                    {completedHabits}/{totalHabits}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {trackerData.items.map((item) => {
                    const isChecked = trackerData.records[dateKey]?.[item.id] || false;
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleHabit(item.id)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg transition-all hover:scale-[1.02]"
                        style={{
                          background: isChecked
                            ? "rgba(80, 80, 80, 0.3)"
                            : "rgba(42, 37, 32, 0.4)",
                          border: isChecked
                            ? "1px solid rgba(100, 100, 100, 0.5)"
                            : "1px solid rgba(139, 111, 71, 0.2)",
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                          style={{
                            background: isChecked ? "rgba(80, 80, 80, 0.9)" : "transparent",
                            border: isChecked
                              ? "1px solid rgba(100, 100, 100, 0.8)"
                              : "1px solid rgba(139, 111, 71, 0.4)",
                          }}
                        >
                          {isChecked && (
                            <svg className="w-2.5 h-2.5" fill="none" stroke="rgba(245, 240, 232, 0.9)" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className="text-xs"
                          style={{
                            color: isChecked
                              ? "rgba(212, 165, 116, 0.5)"
                              : "rgba(245, 240, 232, 0.8)",
                            textDecoration: isChecked ? "line-through" : "none",
                          }}
                        >
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
