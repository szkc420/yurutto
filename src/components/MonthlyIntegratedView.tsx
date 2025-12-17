"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ===== 型定義 =====

interface AxisConfig {
  name: string;
  min: number;
  max: number;
}

interface GraphData {
  axis1: AxisConfig;
  axis2: AxisConfig;
  records: { [date: string]: { value1: number | null; value2: number | null } };
  updatedAt: string;
}

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

interface MonthlyIntegratedViewProps {
  selectedMonth: Date;
}

// ===== デフォルト値 =====

const DEFAULT_GRAPH_DATA: GraphData = {
  axis1: { name: "MOOD", min: -2, max: 2 },
  axis2: { name: "SLEEP", min: 4, max: 8 },
  records: {},
  updatedAt: new Date().toISOString(),
};

const DEFAULT_TRACKER_ITEMS: TrackerItem[] = [
  { id: "water", name: "水を飲む", excludedDays: [] },
  { id: "exercise", name: "運動", excludedDays: [] },
  { id: "reading", name: "読書", excludedDays: [] },
];

const AXIS_PRESETS: { label: string; config: AxisConfig }[] = [
  { label: "MOOD", config: { name: "MOOD", min: -2, max: 2 } },
  { label: "SLEEP", config: { name: "SLEEP", min: 4, max: 8 } },
  { label: "エネルギー", config: { name: "ENERGY", min: 1, max: 5 } },
  { label: "ストレス", config: { name: "STRESS", min: 1, max: 5 } },
  { label: "集中度", config: { name: "集中", min: 1, max: 5 } },
];

// ===== セルサイズ定数 =====
const CELL_WIDTH = 24; // 各日付セルの幅
const LABEL_WIDTH = 80; // 左のラベル列の幅
const RIGHT_LABEL_WIDTH = 36; // 右のラベル列の幅（軸2用）

export default function MonthlyIntegratedView({ selectedMonth }: MonthlyIntegratedViewProps) {
  const { user } = useAuth();

  // グラフ関連state
  const [graphData, setGraphData] = useState<GraphData>(DEFAULT_GRAPH_DATA);
  const [graphLoading, setGraphLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [tempValue1, setTempValue1] = useState("");
  const [tempValue2, setTempValue2] = useState("");
  const [showAxisSettings, setShowAxisSettings] = useState(false);
  const [tempAxis1, setTempAxis1] = useState<AxisConfig>(DEFAULT_GRAPH_DATA.axis1);
  const [tempAxis2, setTempAxis2] = useState<AxisConfig>(DEFAULT_GRAPH_DATA.axis2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // トラッカー関連state
  const [trackerData, setTrackerData] = useState<TrackerData>({
    items: DEFAULT_TRACKER_ITEMS,
    records: {},
    updatedAt: new Date().toISOString(),
  });
  const [trackerLoading, setTrackerLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : null;

  // ===== データ読み込み =====

  useEffect(() => {
    if (!user) return;

    const loadGraph = async () => {
      setGraphLoading(true);
      try {
        const docRef = doc(db, "users", user.uid, "graph", monthKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGraphData(docSnap.data() as GraphData);
        } else {
          setGraphData(DEFAULT_GRAPH_DATA);
        }
      } catch (error) {
        console.error("Failed to load graph:", error);
      } finally {
        setGraphLoading(false);
      }
    };

    const loadTracker = async () => {
      setTrackerLoading(true);
      try {
        const docRef = doc(db, "users", user.uid, "tracker", monthKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTrackerData(docSnap.data() as TrackerData);
        } else {
          setTrackerData({
            items: DEFAULT_TRACKER_ITEMS,
            records: {},
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Failed to load tracker:", error);
      } finally {
        setTrackerLoading(false);
      }
    };

    loadGraph();
    loadTracker();
  }, [user, monthKey]);

  // ===== グラフ描画 =====

  useEffect(() => {
    if (graphLoading || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    // グラフのパディングなし - 日付セルと完全に合わせる
    const padding = { top: 10, right: 0, bottom: 5, left: 0 };
    const graphHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    // 背景グリッド（横線）
    ctx.strokeStyle = "rgba(139, 111, 71, 0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const axis1Range = graphData.axis1.max - graphData.axis1.min;
    const axis2Range = graphData.axis2.max - graphData.axis2.min;

    // データポイントを収集 - 日付セルの中央に配置
    const points1: { x: number; y: number; value: number }[] = [];
    const points2: { x: number; y: number; value: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const record = graphData.records[dateKey];
      // 各日のセル中央に配置
      const x = (day - 1) * CELL_WIDTH + CELL_WIDTH / 2;

      if (record?.value1 !== null && record?.value1 !== undefined) {
        const y = padding.top + ((graphData.axis1.max - record.value1) / axis1Range) * graphHeight;
        points1.push({ x, y, value: record.value1 });
      }
      if (record?.value2 !== null && record?.value2 !== undefined) {
        const y = padding.top + ((graphData.axis2.max - record.value2) / axis2Range) * graphHeight;
        points2.push({ x, y, value: record.value2 });
      }
    }

    // 線を描画（axis1）
    if (points1.length > 1) {
      ctx.strokeStyle = "rgba(255, 213, 145, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(points1[0].x, points1[0].y);
      for (let i = 1; i < points1.length; i++) {
        ctx.lineTo(points1[i].x, points1[i].y);
      }
      ctx.stroke();
    }

    // 線を描画（axis2）
    if (points2.length > 1) {
      ctx.strokeStyle = "rgba(168, 213, 186, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(points2[0].x, points2[0].y);
      for (let i = 1; i < points2.length; i++) {
        ctx.lineTo(points2[i].x, points2[i].y);
      }
      ctx.stroke();
    }

    // ポイントを描画（axis1 - 白丸）
    points1.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(42, 37, 32, 1)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 213, 145, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // ポイントを描画（axis2 - 緑丸）
    points2.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 213, 186, 0.9)";
      ctx.fill();
    });

    // ホバー中の日に縦線を描画
    if (hoveredDay !== null) {
      const x = (hoveredDay - 1) * CELL_WIDTH + CELL_WIDTH / 2;
      ctx.strokeStyle = "rgba(255, 213, 145, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [graphLoading, graphData, daysInMonth, year, month, hoveredDay]);

  // ===== データ保存 =====

  const saveGraph = async (newData: GraphData) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "graph", monthKey);
      await setDoc(docRef, newData);
    } catch (error) {
      console.error("Failed to save graph:", error);
    }
  };

  const saveTracker = async (newData: TrackerData) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "tracker", monthKey);
      await setDoc(docRef, newData);
    } catch (error) {
      console.error("Failed to save tracker:", error);
    }
  };

  // ===== グラフ操作 =====

  const updateGraphValue = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const value1 = tempValue1 === "" ? null : parseFloat(tempValue1);
    const value2 = tempValue2 === "" ? null : parseFloat(tempValue2);

    const newRecords = { ...graphData.records };
    newRecords[dateKey] = { value1, value2 };

    const newData = {
      ...graphData,
      records: newRecords,
      updatedAt: new Date().toISOString(),
    };

    setGraphData(newData);
    saveGraph(newData);
    setEditingDay(null);
  };

  const startEditingGraph = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = graphData.records[dateKey];
    setTempValue1(record?.value1?.toString() ?? "");
    setTempValue2(record?.value2?.toString() ?? "");
    setEditingDay(day);
  };

  const openAxisSettings = () => {
    setTempAxis1({ ...graphData.axis1 });
    setTempAxis2({ ...graphData.axis2 });
    setShowAxisSettings(true);
  };

  const saveAxisSettings = () => {
    // 既存の記録を新しい軸の範囲内にクランプする
    const clampedRecords: { [date: string]: { value1: number | null; value2: number | null } } = {};

    Object.entries(graphData.records).forEach(([dateKey, record]) => {
      let value1 = record.value1;
      let value2 = record.value2;

      // value1を新しい軸1の範囲内にクランプ
      if (value1 !== null) {
        value1 = Math.max(tempAxis1.min, Math.min(tempAxis1.max, value1));
      }

      // value2を新しい軸2の範囲内にクランプ
      if (value2 !== null) {
        value2 = Math.max(tempAxis2.min, Math.min(tempAxis2.max, value2));
      }

      clampedRecords[dateKey] = { value1, value2 };
    });

    const newData = {
      ...graphData,
      axis1: tempAxis1,
      axis2: tempAxis2,
      records: clampedRecords,
      updatedAt: new Date().toISOString(),
    };
    setGraphData(newData);
    saveGraph(newData);
    setShowAxisSettings(false);
  };

  // ===== トラッカー操作 =====

  const toggleTrackerCell = (day: number, itemId: string) => {
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

  const addTrackerItem = () => {
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

  const deleteTrackerItem = (itemId: string) => {
    const newItems = trackerData.items.filter((item) => item.id !== itemId);
    const newData = {
      ...trackerData,
      items: newItems,
      updatedAt: new Date().toISOString(),
    };
    setTrackerData(newData);
    saveTracker(newData);
  };

  // ===== ヘルパー関数 =====

  const getCellState = (day: number, itemId: string): "done" | "not-done" | "excluded" => {
    const item = trackerData.items.find((i) => i.id === itemId);
    if (item?.excludedDays.includes(day)) {
      return "excluded";
    }
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return trackerData.records[dateKey]?.[itemId] ? "done" : "not-done";
  };

  const isWeekend = (day: number) => {
    const dow = new Date(year, month, day).getDay();
    return dow === 0 || dow === 6;
  };

  const isFiveDayMark = (day: number) => {
    return day % 5 === 0 && day !== daysInMonth;
  };

  const isHighlighted = (day: number, itemId: string) => {
    return hoveredDay === day || hoveredItemId === itemId;
  };

  // ===== ローディング表示 =====

  if (graphLoading || trackerLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-xl" style={{ background: "rgba(42, 37, 32, 0.5)" }} />
        <div className="h-8 rounded" style={{ background: "rgba(42, 37, 32, 0.5)" }} />
        <div className="h-24 rounded-xl" style={{ background: "rgba(42, 37, 32, 0.5)" }} />
      </div>
    );
  }

  // ===== 共通の日付幅を計算 =====
  const totalWidth = LABEL_WIDTH + (daysInMonth * CELL_WIDTH) + RIGHT_LABEL_WIDTH;

  // 軸の目盛り値を計算
  const axis1Range = graphData.axis1.max - graphData.axis1.min;
  const axis2Range = graphData.axis2.max - graphData.axis2.min;
  const axis1Ticks = [0, 1, 2, 3, 4].map(i => graphData.axis1.max - (axis1Range / 4) * i);
  const axis2Ticks = [0, 1, 2, 3, 4].map(i => graphData.axis2.max - (axis2Range / 4) * i);

  return (
    <div className="space-y-0">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="rgba(255, 213, 145, 0.6)" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          <span className="text-sm tracking-wide" style={{ color: "rgba(212, 165, 116, 0.7)" }}>
            月間ビュー
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAxisSettings}
            className="text-xs transition-all hover:scale-105 flex items-center gap-1"
            style={{ color: "rgba(212, 165, 116, 0.5)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            グラフ設定
          </button>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="text-xs transition-all hover:scale-105"
            style={{ color: "rgba(212, 165, 116, 0.5)" }}
          >
            {showAddItem ? "キャンセル" : "+ 習慣"}
          </button>
        </div>
      </div>

      {/* 新規習慣追加フォーム */}
      {showAddItem && (
        <div
          className="flex items-center gap-2 mb-3 p-2 rounded-lg"
          style={{ background: "rgba(42, 37, 32, 0.6)", border: "1px solid rgba(139, 111, 71, 0.25)" }}
        >
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTrackerItem()}
            placeholder="習慣名を入力..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: "rgba(245, 240, 232, 0.85)", caretColor: "#ffd591" }}
            autoFocus
          />
          <button
            onClick={addTrackerItem}
            className="px-3 py-1 rounded text-xs transition-all hover:scale-105"
            style={{ background: "rgba(255, 213, 145, 0.15)", color: "#ffd591" }}
          >
            追加
          </button>
        </div>
      )}

      {/* 統合ビュー */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "rgba(42, 37, 32, 0.6)", border: "1px solid rgba(139, 111, 71, 0.25)" }}
      >
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${totalWidth}px` }}>

            {/* 2軸グラフ部分 */}
            <div className="flex">
              {/* 左ラベル（軸1の目盛り） */}
              <div
                className="flex-shrink-0 flex flex-col justify-between py-1 pr-1"
                style={{ width: `${LABEL_WIDTH}px` }}
              >
                {axis1Ticks.map((tick, i) => (
                  <span key={i} className="text-xs text-right leading-none" style={{ color: "rgba(255, 213, 145, 0.6)", fontSize: "11px" }}>
                    {tick}
                  </span>
                ))}
              </div>
              {/* グラフ本体 */}
              <div style={{ width: `${daysInMonth * CELL_WIDTH}px` }}>
                <canvas
                  ref={canvasRef}
                  style={{ width: `${daysInMonth * CELL_WIDTH}px`, height: "120px" }}
                />
              </div>
              {/* 右ラベル（軸2の目盛り） */}
              <div
                className="flex-shrink-0 flex flex-col justify-between py-1 pl-1"
                style={{ width: `${RIGHT_LABEL_WIDTH}px` }}
              >
                {axis2Ticks.map((tick, i) => (
                  <span key={i} className="text-xs leading-none" style={{ color: "rgba(168, 213, 186, 0.6)", fontSize: "11px" }}>
                    {tick}
                  </span>
                ))}
              </div>
            </div>

            {/* 日付行（中央） */}
            <div
              className="flex"
              style={{
                background: "rgba(50, 44, 38, 0.8)",
                borderTop: "1px solid rgba(139, 111, 71, 0.2)",
                borderBottom: "1px solid rgba(139, 111, 71, 0.2)"
              }}
            >
              {/* 左ラベル */}
              <div
                className="flex-shrink-0 px-2 py-1.5 flex items-center justify-end"
                style={{
                  width: `${LABEL_WIDTH}px`,
                  color: "rgba(212, 165, 116, 0.6)",
                  fontSize: "11px"
                }}
              >
                日付
              </div>
              {/* 日付セル */}
              <div className="flex">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => startEditingGraph(day)}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-shrink-0 py-1.5 text-center transition-all"
                    style={{
                      width: `${CELL_WIDTH}px`,
                      fontSize: "11px",
                      color: day === todayDay
                        ? "#ffd591"
                        : isWeekend(day)
                          ? "rgba(255, 180, 150, 0.7)"
                          : hoveredDay === day
                            ? "rgba(255, 213, 145, 0.9)"
                            : "rgba(212, 165, 116, 0.6)",
                      background: day === todayDay
                        ? "rgba(255, 213, 145, 0.15)"
                        : hoveredDay === day
                          ? "rgba(255, 213, 145, 0.08)"
                          : "transparent",
                      borderRight: isFiveDayMark(day) ? "1px solid rgba(139, 111, 71, 0.3)" : "none",
                      fontWeight: day === todayDay ? "bold" : "normal"
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {/* 右側スペーサー */}
              <div className="flex-shrink-0" style={{ width: `${RIGHT_LABEL_WIDTH}px` }} />
            </div>

            {/* デイリートラッカー部分 */}
            {trackerData.items.map((item) => (
              <div
                key={item.id}
                className="flex group"
                style={{
                  borderBottom: "1px solid rgba(139, 111, 71, 0.1)"
                }}
              >
                {/* 左ラベル（習慣名） */}
                <div
                  className="flex-shrink-0 px-2 py-1 flex items-center gap-1"
                  style={{
                    width: `${LABEL_WIDTH}px`,
                    background: hoveredItemId === item.id
                      ? "rgba(50, 44, 38, 0.98)"
                      : "transparent",
                    color: hoveredItemId === item.id
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
                      className="w-full bg-transparent focus:outline-none"
                      style={{ color: "rgba(245, 240, 232, 0.85)", caretColor: "#ffd591", fontSize: "11px" }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span
                        className="cursor-pointer hover:underline truncate"
                        style={{ fontSize: "11px" }}
                        onClick={() => setEditingItem(item.id)}
                      >
                        {item.name}
                      </span>
                      <button
                        onClick={() => deleteTrackerItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        style={{ color: "rgba(212, 165, 116, 0.4)" }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                {/* チェックセル */}
                <div className="flex">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const state = getCellState(day, item.id);
                    const highlighted = isHighlighted(day, item.id);
                    const isToday = day === todayDay;
                    return (
                      <div
                        key={day}
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{
                          width: `${CELL_WIDTH}px`,
                          height: "26px",
                          background: isToday
                            ? "rgba(255, 213, 145, 0.08)"
                            : highlighted
                              ? "rgba(255, 213, 145, 0.04)"
                              : "transparent",
                          borderRight: isFiveDayMark(day) ? "1px solid rgba(139, 111, 71, 0.3)" : "none"
                        }}
                        onMouseEnter={() => {
                          setHoveredDay(day);
                          setHoveredItemId(item.id);
                        }}
                        onMouseLeave={() => {
                          setHoveredDay(null);
                          setHoveredItemId(null);
                        }}
                      >
                        <button
                          onClick={() => toggleTrackerCell(day, item.id)}
                          className="w-5 h-5 rounded transition-all hover:scale-110 flex items-center justify-center"
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
                            <span style={{ color: "rgba(212, 165, 116, 0.4)", fontSize: "10px" }}>×</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/* 右側スペーサー */}
                <div className="flex-shrink-0" style={{ width: `${RIGHT_LABEL_WIDTH}px` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 mt-2" style={{ color: "rgba(212, 165, 116, 0.5)", fontSize: "11px" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "rgba(255, 213, 145, 0.6)" }}>○</span>
          <span>{graphData.axis1.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "rgba(168, 213, 186, 0.6)" }}>●</span>
          <span>{graphData.axis2.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded"
            style={{ background: "rgba(80, 80, 80, 0.9)", border: "1px solid rgba(100, 100, 100, 0.8)" }}
          />
          <span>実施</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded"
            style={{ border: "1px solid rgba(139, 111, 71, 0.3)" }}
          />
          <span>未実施</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span style={{ color: "rgba(212, 165, 116, 0.4)" }}>日付クリック → グラフ入力</span>
        </div>
      </div>

      {/* グラフ値入力モーダル */}
      {editingDay !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={() => setEditingDay(null)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative rounded-xl p-4 w-72"
            style={{
              background: "linear-gradient(165deg, rgba(55, 48, 40, 0.98) 0%, rgba(42, 36, 28, 0.99) 100%)",
              border: "1px solid rgba(139, 111, 71, 0.4)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm mb-4" style={{ color: "#ffd591" }}>
              {month + 1}月{editingDay}日のデータ
            </h3>

            <div className="mb-3">
              <label className="text-xs block mb-1" style={{ color: "rgba(255, 213, 145, 0.7)" }}>
                {graphData.axis1.name}（{graphData.axis1.min}〜{graphData.axis1.max}）
              </label>
              <input
                type="number"
                value={tempValue1}
                onChange={(e) => setTempValue1(e.target.value)}
                min={graphData.axis1.min}
                max={graphData.axis1.max}
                step="0.5"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(42, 37, 32, 0.8)",
                  border: "1px solid rgba(139, 111, 71, 0.3)",
                  color: "rgba(245, 240, 232, 0.9)"
                }}
              />
            </div>

            <div className="mb-4">
              <label className="text-xs block mb-1" style={{ color: "rgba(168, 213, 186, 0.7)" }}>
                {graphData.axis2.name}（{graphData.axis2.min}〜{graphData.axis2.max}）
              </label>
              <input
                type="number"
                value={tempValue2}
                onChange={(e) => setTempValue2(e.target.value)}
                min={graphData.axis2.min}
                max={graphData.axis2.max}
                step="0.5"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(42, 37, 32, 0.8)",
                  border: "1px solid rgba(139, 111, 71, 0.3)",
                  color: "rgba(245, 240, 232, 0.9)"
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingDay(null)}
                className="flex-1 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(139, 111, 71, 0.3)",
                  color: "rgba(212, 165, 116, 0.6)"
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => updateGraphValue(editingDay)}
                className="flex-1 py-2 rounded-lg text-sm transition-all hover:scale-105"
                style={{
                  background: "rgba(255, 213, 145, 0.15)",
                  border: "1px solid rgba(255, 213, 145, 0.3)",
                  color: "#ffd591"
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 軸設定モーダル */}
      {showAxisSettings && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={() => setShowAxisSettings(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative rounded-xl p-4 w-80 max-h-[80vh] overflow-y-auto"
            style={{
              background: "linear-gradient(165deg, rgba(55, 48, 40, 0.98) 0%, rgba(42, 36, 28, 0.99) 100%)",
              border: "1px solid rgba(139, 111, 71, 0.4)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm mb-4" style={{ color: "#ffd591" }}>
              グラフの軸設定
            </h3>

            {/* 軸1 */}
            <div className="mb-4">
              <label className="text-xs block mb-2" style={{ color: "rgba(255, 213, 145, 0.7)" }}>
                軸1（○白丸）
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {AXIS_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setTempAxis1(preset.config)}
                    className="px-2 py-1 rounded text-xs transition-all hover:scale-105"
                    style={{
                      background: tempAxis1.name === preset.config.name
                        ? "rgba(255, 213, 145, 0.2)"
                        : "rgba(42, 37, 32, 0.6)",
                      border: tempAxis1.name === preset.config.name
                        ? "1px solid rgba(255, 213, 145, 0.4)"
                        : "1px solid rgba(139, 111, 71, 0.25)",
                      color: "rgba(245, 240, 232, 0.8)"
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(212, 165, 116, 0.5)" }}>名前</label>
                  <input
                    type="text"
                    value={tempAxis1.name}
                    onChange={(e) => setTempAxis1({ ...tempAxis1, name: e.target.value })}
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{
                      background: "rgba(42, 37, 32, 0.8)",
                      border: "1px solid rgba(139, 111, 71, 0.3)",
                      color: "rgba(245, 240, 232, 0.9)"
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(212, 165, 116, 0.5)" }}>最小</label>
                  <input
                    type="number"
                    value={tempAxis1.min}
                    onChange={(e) => setTempAxis1({ ...tempAxis1, min: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{
                      background: "rgba(42, 37, 32, 0.8)",
                      border: "1px solid rgba(139, 111, 71, 0.3)",
                      color: "rgba(245, 240, 232, 0.9)"
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(212, 165, 116, 0.5)" }}>最大</label>
                  <input
                    type="number"
                    value={tempAxis1.max}
                    onChange={(e) => setTempAxis1({ ...tempAxis1, max: parseFloat(e.target.value) || 10 })}
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{
                      background: "rgba(42, 37, 32, 0.8)",
                      border: "1px solid rgba(139, 111, 71, 0.3)",
                      color: "rgba(245, 240, 232, 0.9)"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 軸2 */}
            <div className="mb-4">
              <label className="text-xs block mb-2" style={{ color: "rgba(168, 213, 186, 0.7)" }}>
                軸2（●緑丸）
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {AXIS_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setTempAxis2(preset.config)}
                    className="px-2 py-1 rounded text-xs transition-all hover:scale-105"
                    style={{
                      background: tempAxis2.name === preset.config.name
                        ? "rgba(168, 213, 186, 0.2)"
                        : "rgba(42, 37, 32, 0.6)",
                      border: tempAxis2.name === preset.config.name
                        ? "1px solid rgba(168, 213, 186, 0.4)"
                        : "1px solid rgba(139, 111, 71, 0.25)",
                      color: "rgba(245, 240, 232, 0.8)"
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(212, 165, 116, 0.5)" }}>名前</label>
                  <input
                    type="text"
                    value={tempAxis2.name}
                    onChange={(e) => setTempAxis2({ ...tempAxis2, name: e.target.value })}
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{
                      background: "rgba(42, 37, 32, 0.8)",
                      border: "1px solid rgba(139, 111, 71, 0.3)",
                      color: "rgba(245, 240, 232, 0.9)"
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(212, 165, 116, 0.5)" }}>最小</label>
                  <input
                    type="number"
                    value={tempAxis2.min}
                    onChange={(e) => setTempAxis2({ ...tempAxis2, min: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{
                      background: "rgba(42, 37, 32, 0.8)",
                      border: "1px solid rgba(139, 111, 71, 0.3)",
                      color: "rgba(245, 240, 232, 0.9)"
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(212, 165, 116, 0.5)" }}>最大</label>
                  <input
                    type="number"
                    value={tempAxis2.max}
                    onChange={(e) => setTempAxis2({ ...tempAxis2, max: parseFloat(e.target.value) || 10 })}
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{
                      background: "rgba(42, 37, 32, 0.8)",
                      border: "1px solid rgba(139, 111, 71, 0.3)",
                      color: "rgba(245, 240, 232, 0.9)"
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAxisSettings(false)}
                className="flex-1 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(139, 111, 71, 0.3)",
                  color: "rgba(212, 165, 116, 0.6)"
                }}
              >
                キャンセル
              </button>
              <button
                onClick={saveAxisSettings}
                className="flex-1 py-2 rounded-lg text-sm transition-all hover:scale-105"
                style={{
                  background: "rgba(255, 213, 145, 0.15)",
                  border: "1px solid rgba(255, 213, 145, 0.3)",
                  color: "#ffd591"
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
