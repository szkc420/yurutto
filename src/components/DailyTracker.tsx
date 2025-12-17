"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface TrackerItem {
  id: string;
  name: string;
  excludedDays: number[]; // 対象外の日（×を表示）
}

interface TrackerData {
  items: TrackerItem[];
  records: { [date: string]: { [itemId: string]: boolean } }; // 日付 -> アイテムID -> 実施したか
  updatedAt: string;
}

interface DailyTrackerProps {
  selectedMonth: Date;
}

const DEFAULT_TRACKER_ITEMS: TrackerItem[] = [
  { id: "water", name: "水を飲む", excludedDays: [] },
  { id: "exercise", name: "運動", excludedDays: [] },
  { id: "reading", name: "読書", excludedDays: [] },
  { id: "meditation", name: "瞑想", excludedDays: [] },
  { id: "gratitude", name: "感謝", excludedDays: [] },
];

export default function DailyTracker({ selectedMonth }: DailyTrackerProps) {
  const { user } = useAuth();
  const [trackerData, setTrackerData] = useState<TrackerData>({
    items: DEFAULT_TRACKER_ITEMS,
    records: {},
    updatedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ day: number; itemId: string } | null>(null);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // 今日の日付
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : null;

  // データ読み込み
  useEffect(() => {
    if (!user) return;

    const loadTracker = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "users", user.uid, "tracker", monthKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTrackerData(docSnap.data() as TrackerData);
        } else {
          // デフォルトデータを設定
          setTrackerData({
            items: DEFAULT_TRACKER_ITEMS,
            records: {},
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Failed to load tracker:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTracker();
  }, [user, monthKey]);

  // データ保存
  const saveTracker = async (newData: TrackerData) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "tracker", monthKey);
      await setDoc(docRef, newData);
    } catch (error) {
      console.error("Failed to save tracker:", error);
    }
  };

  // セルをトグル
  const toggleCell = (day: number, itemId: string) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

  // 項目名を更新
  const updateItemName = (itemId: string, newName: string) => {
    if (!newName.trim()) return;

    const newItems = trackerData.items.map((item) =>
      item.id === itemId ? { ...item, name: newName.trim() } : item
    );

    const newData = {
      ...trackerData,
      items: newItems,
      updatedAt: new Date().toISOString(),
    };

    setTrackerData(newData);
    saveTracker(newData);
    setEditingItem(null);
  };

  // 項目を追加
  const addItem = () => {
    if (!newItemName.trim()) return;

    const newItem: TrackerItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      excludedDays: [],
    };

    const newData = {
      ...trackerData,
      items: [...trackerData.items, newItem],
      updatedAt: new Date().toISOString(),
    };

    setTrackerData(newData);
    saveTracker(newData);
    setNewItemName("");
    setShowAddItem(false);
  };

  // 項目を削除
  const deleteItem = (itemId: string) => {
    const newItems = trackerData.items.filter((item) => item.id !== itemId);

    const newData = {
      ...trackerData,
      items: newItems,
      updatedAt: new Date().toISOString(),
    };

    setTrackerData(newData);
    saveTracker(newData);
  };

  // セルの状態を取得
  const getCellState = (day: number, itemId: string): "done" | "not-done" | "excluded" => {
    const item = trackerData.items.find((i) => i.id === itemId);
    if (item?.excludedDays.includes(day)) {
      return "excluded";
    }

    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return trackerData.records[dateKey]?.[itemId] ? "done" : "not-done";
  };

  // 曜日を取得（日=0, 月=1, ...）
  const getDayOfWeek = (day: number) => {
    return new Date(year, month, day).getDay();
  };

  // 週末かどうか
  const isWeekend = (day: number) => {
    const dow = getDayOfWeek(day);
    return dow === 0 || dow === 6;
  };

  // 5日区切りかどうか
  const isFiveDayMark = (day: number) => {
    return day % 5 === 0 && day !== daysInMonth;
  };

  // ハイライト対象かどうか
  const isHighlighted = (day: number, itemId: string) => {
    if (!hoveredCell) return false;
    return hoveredCell.day === day || hoveredCell.itemId === itemId;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-6 w-32 rounded" style={{ background: "rgba(139, 111, 71, 0.2)" }} />
        <div className="h-40 rounded-xl" style={{ background: "rgba(42, 37, 32, 0.5)" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="rgba(255, 213, 145, 0.6)" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm tracking-wide" style={{ color: "rgba(212, 165, 116, 0.7)" }}>
            デイリートラッカー
          </span>
        </div>
        <button
          onClick={() => setShowAddItem(!showAddItem)}
          className="text-xs transition-all hover:scale-105"
          style={{ color: "rgba(212, 165, 116, 0.5)" }}
        >
          {showAddItem ? "キャンセル" : "+ 習慣を追加"}
        </button>
      </div>

      {/* 新規追加フォーム */}
      {showAddItem && (
        <div
          className="flex items-center gap-2 mb-3 p-2 rounded-lg"
          style={{ background: "rgba(42, 37, 32, 0.6)", border: "1px solid rgba(139, 111, 71, 0.25)" }}
        >
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="習慣名を入力..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: "rgba(245, 240, 232, 0.85)", caretColor: "#ffd591" }}
            autoFocus
          />
          <button
            onClick={addItem}
            className="px-3 py-1 rounded text-xs transition-all hover:scale-105"
            style={{ background: "rgba(255, 213, 145, 0.15)", color: "#ffd591" }}
          >
            追加
          </button>
        </div>
      )}

      {/* トラッカーテーブル */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "rgba(42, 37, 32, 0.6)", border: "1px solid rgba(139, 111, 71, 0.25)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: "600px" }}>
            {/* ヘッダー: 日付 */}
            <thead>
              <tr>
                <th
                  className="sticky left-0 p-2 text-left z-10"
                  style={{
                    background: "rgba(42, 37, 32, 0.95)",
                    color: "rgba(212, 165, 116, 0.6)",
                    borderBottom: "1px solid rgba(139, 111, 71, 0.2)",
                    minWidth: "80px"
                  }}
                >
                  習慣
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <th
                    key={day}
                    className="p-1 text-center"
                    style={{
                      color: day === todayDay
                        ? "#ffd591"
                        : isWeekend(day)
                          ? "rgba(255, 180, 150, 0.6)"
                          : hoveredCell?.day === day
                            ? "rgba(255, 213, 145, 0.8)"
                            : "rgba(212, 165, 116, 0.5)",
                      borderBottom: "1px solid rgba(139, 111, 71, 0.2)",
                      borderRight: isFiveDayMark(day) ? "2px solid rgba(139, 111, 71, 0.4)" : "none",
                      background: day === todayDay
                        ? "rgba(255, 213, 145, 0.1)"
                        : hoveredCell?.day === day
                          ? "rgba(255, 213, 145, 0.05)"
                          : "transparent",
                      minWidth: "24px",
                      fontWeight: day === todayDay ? "bold" : "normal"
                    }}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trackerData.items.map((item) => (
                <tr key={item.id} className="group">
                  {/* 習慣名 */}
                  <td
                    className="sticky left-0 p-2 z-10"
                    style={{
                      background: hoveredCell?.itemId === item.id
                        ? "rgba(50, 44, 38, 0.98)"
                        : "rgba(42, 37, 32, 0.95)",
                      borderBottom: "1px solid rgba(139, 111, 71, 0.1)",
                      color: hoveredCell?.itemId === item.id
                        ? "rgba(255, 213, 145, 0.9)"
                        : "rgba(245, 240, 232, 0.8)"
                    }}
                  >
                    {editingItem === item.id ? (
                      <input
                        type="text"
                        defaultValue={item.name}
                        onBlur={(e) => updateItemName(item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateItemName(item.id, (e.target as HTMLInputElement).value);
                          } else if (e.key === "Escape") {
                            setEditingItem(null);
                          }
                        }}
                        className="w-full bg-transparent text-xs focus:outline-none"
                        style={{ color: "rgba(245, 240, 232, 0.85)", caretColor: "#ffd591" }}
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => setEditingItem(item.id)}
                        >
                          {item.name}
                        </span>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "rgba(212, 165, 116, 0.4)" }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                  {/* 各日のセル */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const state = getCellState(day, item.id);
                    const highlighted = isHighlighted(day, item.id);
                    const isToday = day === todayDay;
                    return (
                      <td
                        key={day}
                        className="p-0.5 text-center"
                        style={{
                          borderBottom: "1px solid rgba(139, 111, 71, 0.1)",
                          borderRight: isFiveDayMark(day) ? "2px solid rgba(139, 111, 71, 0.4)" : "none",
                          background: isToday
                            ? "rgba(255, 213, 145, 0.08)"
                            : highlighted
                              ? "rgba(255, 213, 145, 0.04)"
                              : "transparent"
                        }}
                        onMouseEnter={() => setHoveredCell({ day, itemId: item.id })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <button
                          onClick={() => toggleCell(day, item.id)}
                          className="w-5 h-5 rounded transition-all hover:scale-110 flex items-center justify-center mx-auto"
                          style={{
                            background: state === "done"
                              ? "rgba(80, 80, 80, 0.9)"
                              : "transparent",
                            border: state === "done"
                              ? "1px solid rgba(100, 100, 100, 0.8)"
                              : isToday
                                ? "1.5px solid rgba(255, 213, 145, 0.5)"
                                : "1px solid rgba(139, 111, 71, 0.3)",
                            boxShadow: isToday && state !== "done"
                              ? "0 0 4px rgba(255, 213, 145, 0.3)"
                              : "none"
                          }}
                        >
                          {state === "excluded" && (
                            <span style={{ color: "rgba(212, 165, 116, 0.4)" }}>×</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "rgba(212, 165, 116, 0.5)" }}>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ background: "rgba(80, 80, 80, 0.9)", border: "1px solid rgba(100, 100, 100, 0.8)" }}
          />
          <span>実施</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ border: "1px solid rgba(139, 111, 71, 0.3)" }}
          />
          <span>未実施</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ border: "1.5px solid rgba(255, 213, 145, 0.5)", boxShadow: "0 0 4px rgba(255, 213, 145, 0.3)" }}
          />
          <span>今日</span>
        </div>
      </div>
    </div>
  );
}
