"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

interface MoodGraphProps {
  selectedMonth: Date;
}

const DEFAULT_GRAPH_DATA: GraphData = {
  axis1: { name: "MOOD", min: -2, max: 2 },
  axis2: { name: "SLEEP", min: 4, max: 8 },
  records: {},
  updatedAt: new Date().toISOString(),
};

// 軸のプリセット
const AXIS_PRESETS: { label: string; config: AxisConfig }[] = [
  { label: "MOOD（気分）", config: { name: "MOOD", min: -2, max: 2 } },
  { label: "SLEEP（睡眠時間）", config: { name: "SLEEP", min: 4, max: 8 } },
  { label: "エネルギー", config: { name: "ENERGY", min: 1, max: 5 } },
  { label: "ストレス", config: { name: "STRESS", min: 1, max: 5 } },
  { label: "運動時間（分）", config: { name: "運動", min: 0, max: 60 } },
  { label: "水分摂取（L）", config: { name: "水分", min: 0, max: 3 } },
  { label: "集中度", config: { name: "集中", min: 1, max: 5 } },
  { label: "カスタム", config: { name: "カスタム", min: 0, max: 10 } },
];

export default function MoodGraph({ selectedMonth }: MoodGraphProps) {
  const { user } = useAuth();
  const [graphData, setGraphData] = useState<GraphData>(DEFAULT_GRAPH_DATA);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [tempValue1, setTempValue1] = useState<string>("");
  const [tempValue2, setTempValue2] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempAxis1, setTempAxis1] = useState<AxisConfig>(DEFAULT_GRAPH_DATA.axis1);
  const [tempAxis2, setTempAxis2] = useState<AxisConfig>(DEFAULT_GRAPH_DATA.axis2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // データ読み込み
  useEffect(() => {
    if (!user) return;

    const loadGraph = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    loadGraph();
  }, [user, monthKey]);

  // グラフ描画
  useEffect(() => {
    if (loading || !canvasRef.current) return;

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
    const padding = { top: 20, right: 40, bottom: 30, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // クリア
    ctx.clearRect(0, 0, width, height);

    // 背景グリッド
    ctx.strokeStyle = "rgba(139, 111, 71, 0.15)";
    ctx.lineWidth = 1;

    // 横線（5本）
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // 縦線（週区切り）
    for (let day = 1; day <= daysInMonth; day++) {
      const x = padding.left + ((day - 1) / (daysInMonth - 1)) * graphWidth;
      const dayOfWeek = new Date(year, month, day).getDay();
      if (dayOfWeek === 0) {
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }
    }

    // Y軸ラベル（左: axis1）
    ctx.fillStyle = "rgba(255, 213, 145, 0.6)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    const axis1Range = graphData.axis1.max - graphData.axis1.min;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      const value = graphData.axis1.max - (axis1Range / 4) * i;
      ctx.fillText(value.toString(), padding.left - 5, y + 3);
    }

    // Y軸ラベル（右: axis2）
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(168, 213, 186, 0.6)";
    const axis2Range = graphData.axis2.max - graphData.axis2.min;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      const value = graphData.axis2.max - (axis2Range / 4) * i;
      ctx.fillText(value.toString(), width - padding.right + 5, y + 3);
    }

    // X軸ラベル（日付）
    ctx.fillStyle = "rgba(212, 165, 116, 0.5)";
    ctx.textAlign = "center";
    for (let day = 1; day <= daysInMonth; day += 5) {
      const x = padding.left + ((day - 1) / (daysInMonth - 1)) * graphWidth;
      ctx.fillText(day.toString(), x, height - padding.bottom + 15);
    }

    // データポイントを収集
    const points1: { x: number; y: number; value: number }[] = [];
    const points2: { x: number; y: number; value: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const record = graphData.records[dateKey];
      const x = padding.left + ((day - 1) / (daysInMonth - 1)) * graphWidth;

      if (record?.value1 !== null && record?.value1 !== undefined) {
        const y = padding.top + ((graphData.axis1.max - record.value1) / axis1Range) * graphHeight;
        points1.push({ x, y, value: record.value1 });
      }
      if (record?.value2 !== null && record?.value2 !== undefined) {
        const y = padding.top + ((graphData.axis2.max - record.value2) / axis2Range) * graphHeight;
        points2.push({ x, y, value: record.value2 });
      }
    }

    // 線を描画（axis1 - 白丸）
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

    // 線を描画（axis2 - 黒丸）
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

    // ポイントを描画（axis2 - 黒丸）
    points2.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 213, 186, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(168, 213, 186, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

  }, [loading, graphData, daysInMonth, year, month]);

  // データ保存
  const saveGraph = async (newData: GraphData) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "graph", monthKey);
      await setDoc(docRef, newData);
    } catch (error) {
      console.error("Failed to save graph:", error);
    }
  };

  // 値を更新
  const updateValue = (day: number) => {
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

  // 編集開始
  const startEditing = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = graphData.records[dateKey];
    setTempValue1(record?.value1?.toString() ?? "");
    setTempValue2(record?.value2?.toString() ?? "");
    setEditingDay(day);
  };

  // 設定を開く
  const openSettings = () => {
    setTempAxis1({ ...graphData.axis1 });
    setTempAxis2({ ...graphData.axis2 });
    setShowSettings(true);
  };

  // 軸設定を保存
  const saveAxisSettings = () => {
    const newData = {
      ...graphData,
      axis1: tempAxis1,
      axis2: tempAxis2,
      updatedAt: new Date().toISOString(),
    };

    setGraphData(newData);
    saveGraph(newData);
    setShowSettings(false);
  };

  // プリセットを適用
  const applyPreset = (axisNum: 1 | 2, preset: AxisConfig) => {
    if (axisNum === 1) {
      setTempAxis1(preset);
    } else {
      setTempAxis2(preset);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-6 w-32 rounded" style={{ background: "rgba(139, 111, 71, 0.2)" }} />
        <div className="h-48 rounded-xl" style={{ background: "rgba(42, 37, 32, 0.5)" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="rgba(255, 213, 145, 0.6)" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          <span className="text-sm tracking-wide" style={{ color: "rgba(212, 165, 116, 0.7)" }}>
            2軸グラフ
          </span>
        </div>
        <button
          onClick={openSettings}
          className="text-xs transition-all hover:scale-105 flex items-center gap-1"
          style={{ color: "rgba(212, 165, 116, 0.5)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          軸設定
        </button>
      </div>

      {/* グラフ */}
      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(42, 37, 32, 0.6)", border: "1px solid rgba(139, 111, 71, 0.25)" }}
      >
        {/* 軸ラベル */}
        <div className="flex justify-between mb-2 text-xs">
          <span style={{ color: "rgba(255, 213, 145, 0.7)" }}>○ {graphData.axis1.name}</span>
          <span style={{ color: "rgba(168, 213, 186, 0.7)" }}>● {graphData.axis2.name}</span>
        </div>

        {/* キャンバス */}
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: "180px" }}
        />

        {/* 日付選択バー */}
        <div className="flex gap-0.5 mt-3 overflow-x-auto pb-2">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasData = graphData.records[dateKey]?.value1 !== null || graphData.records[dateKey]?.value2 !== null;
            const isToday = new Date().getDate() === day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <button
                key={day}
                onClick={() => startEditing(day)}
                className="flex-shrink-0 w-6 h-6 rounded text-xs transition-all hover:scale-110"
                style={{
                  background: hasData
                    ? "rgba(139, 111, 71, 0.3)"
                    : "transparent",
                  border: isToday
                    ? "1px solid rgba(255, 213, 145, 0.5)"
                    : "1px solid rgba(139, 111, 71, 0.2)",
                  color: "rgba(212, 165, 116, 0.6)"
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* 編集モーダル */}
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

            {/* axis1入力 */}
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

            {/* axis2入力 */}
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
                onClick={() => updateValue(editingDay)}
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
      {showSettings && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={() => setShowSettings(false)}
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

            {/* 軸1設定 */}
            <div className="mb-4">
              <label className="text-xs block mb-2" style={{ color: "rgba(255, 213, 145, 0.7)" }}>
                軸1（○白丸）
              </label>

              {/* プリセット選択 */}
              <div className="flex flex-wrap gap-1 mb-2">
                {AXIS_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(1, preset.config)}
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

              {/* カスタム入力 */}
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

            {/* 軸2設定 */}
            <div className="mb-4">
              <label className="text-xs block mb-2" style={{ color: "rgba(168, 213, 186, 0.7)" }}>
                軸2（●黒丸）
              </label>

              {/* プリセット選択 */}
              <div className="flex flex-wrap gap-1 mb-2">
                {AXIS_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(2, preset.config)}
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

              {/* カスタム入力 */}
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
                onClick={() => setShowSettings(false)}
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
