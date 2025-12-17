"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface MonthlyTask {
  id: string;
  text: string;
  targetCount: number; // 目標回数
  completedCount: number; // 完了回数
}

interface MonthlyTasksData {
  tasks: MonthlyTask[];
  updatedAt: string;
}

interface MonthlyTasksProps {
  selectedMonth: Date;
}

export default function MonthlyTasks({ selectedMonth }: MonthlyTasksProps) {
  const { user } = useAuth();
  const [tasksData, setTasksData] = useState<MonthlyTasksData>({
    tasks: [],
    updatedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskCount, setNewTaskCount] = useState(1);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // データ読み込み
  useEffect(() => {
    if (!user) return;

    const loadTasks = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "users", user.uid, "monthlyTasks", monthKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTasksData(docSnap.data() as MonthlyTasksData);
        } else {
          setTasksData({ tasks: [], updatedAt: new Date().toISOString() });
        }
      } catch (error) {
        console.error("Failed to load monthly tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [user, monthKey]);

  // データ保存
  const saveTasks = async (newData: MonthlyTasksData) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "monthlyTasks", monthKey);
      await setDoc(docRef, newData);
    } catch (error) {
      console.error("Failed to save monthly tasks:", error);
    }
  };

  // タスク追加
  const addTask = () => {
    if (!newTaskText.trim() || newTaskCount < 1) return;

    const newTask: MonthlyTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      targetCount: newTaskCount,
      completedCount: 0,
    };

    const newData = {
      tasks: [...tasksData.tasks, newTask],
      updatedAt: new Date().toISOString(),
    };

    setTasksData(newData);
    saveTasks(newData);
    setNewTaskText("");
    setNewTaskCount(1);
    setShowAddTask(false);
  };

  // 完了数を増やす
  const incrementCompleted = (taskId: string) => {
    const newTasks = tasksData.tasks.map((task) => {
      if (task.id === taskId && task.completedCount < task.targetCount) {
        return { ...task, completedCount: task.completedCount + 1 };
      }
      return task;
    });

    const newData = { tasks: newTasks, updatedAt: new Date().toISOString() };
    setTasksData(newData);
    saveTasks(newData);
  };

  // 完了数を減らす
  const decrementCompleted = (taskId: string) => {
    const newTasks = tasksData.tasks.map((task) => {
      if (task.id === taskId && task.completedCount > 0) {
        return { ...task, completedCount: task.completedCount - 1 };
      }
      return task;
    });

    const newData = { tasks: newTasks, updatedAt: new Date().toISOString() };
    setTasksData(newData);
    saveTasks(newData);
  };

  // タスク削除
  const deleteTask = (taskId: string) => {
    const newTasks = tasksData.tasks.filter((task) => task.id !== taskId);
    const newData = { tasks: newTasks, updatedAt: new Date().toISOString() };
    setTasksData(newData);
    saveTasks(newData);
  };

  // プログレスボックスをレンダリング
  const renderProgressBoxes = (task: MonthlyTask) => {
    const boxes = [];
    for (let i = 0; i < task.targetCount; i++) {
      const isCompleted = i < task.completedCount;
      boxes.push(
        <div
          key={i}
          className="w-4 h-4 rounded-sm transition-all"
          style={{
            background: isCompleted
              ? "rgba(80, 80, 80, 0.9)"
              : "transparent",
            border: isCompleted
              ? "1px solid rgba(100, 100, 100, 0.8)"
              : "1px solid rgba(139, 111, 71, 0.4)",
          }}
        />
      );
    }
    return boxes;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-6 w-32 rounded" style={{ background: "rgba(139, 111, 71, 0.2)" }} />
        <div className="h-32 rounded-xl" style={{ background: "rgba(42, 37, 32, 0.5)" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="rgba(255, 213, 145, 0.6)" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          <span className="text-sm tracking-wide" style={{ color: "rgba(212, 165, 116, 0.7)" }}>
            月間タスク
          </span>
        </div>
        <button
          onClick={() => setShowAddTask(!showAddTask)}
          className="text-xs transition-all hover:scale-105"
          style={{ color: "rgba(212, 165, 116, 0.5)" }}
        >
          {showAddTask ? "キャンセル" : "+ タスクを追加"}
        </button>
      </div>

      {/* 新規追加フォーム */}
      {showAddTask && (
        <div
          className="mb-3 p-3 rounded-lg space-y-2"
          style={{ background: "rgba(42, 37, 32, 0.6)", border: "1px solid rgba(139, 111, 71, 0.25)" }}
        >
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="タスク名を入力..."
            className="w-full bg-transparent text-sm focus:outline-none"
            style={{ color: "rgba(245, 240, 232, 0.85)", caretColor: "#ffd591" }}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: "rgba(212, 165, 116, 0.6)" }}>
              目標回数:
            </label>
            <input
              type="number"
              value={newTaskCount}
              onChange={(e) => setNewTaskCount(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={31}
              className="w-16 px-2 py-1 rounded text-sm"
              style={{
                background: "rgba(42, 37, 32, 0.8)",
                border: "1px solid rgba(139, 111, 71, 0.3)",
                color: "rgba(245, 240, 232, 0.9)"
              }}
            />
            <button
              onClick={addTask}
              className="ml-auto px-3 py-1 rounded text-xs transition-all hover:scale-105"
              style={{ background: "rgba(255, 213, 145, 0.15)", color: "#ffd591" }}
            >
              追加
            </button>
          </div>
        </div>
      )}

      {/* タスクリスト */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "rgba(42, 37, 32, 0.6)", border: "1px solid rgba(139, 111, 71, 0.25)" }}
      >
        {tasksData.tasks.length === 0 ? (
          <div className="text-center py-4 text-sm" style={{ color: "rgba(212, 165, 116, 0.4)" }}>
            まだタスクがありません
          </div>
        ) : (
          tasksData.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2 group"
              style={{ borderBottom: "1px dashed rgba(139, 111, 71, 0.15)" }}
            >
              {/* プログレスボックス */}
              <div className="flex gap-1 flex-shrink-0">
                {renderProgressBoxes(task)}
              </div>

              {/* タスク名 */}
              <span
                className="flex-1 text-sm"
                style={{
                  color: task.completedCount >= task.targetCount
                    ? "rgba(168, 213, 186, 0.8)"
                    : "rgba(245, 240, 232, 0.8)"
                }}
              >
                {task.text}
                {task.completedCount >= task.targetCount && (
                  <span className="ml-2 text-xs" style={{ color: "rgba(168, 213, 186, 0.6)" }}>
                    ✓ 達成
                  </span>
                )}
              </span>

              {/* 操作ボタン */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => decrementCompleted(task.id)}
                  className="p-1 rounded transition-all hover:scale-110"
                  style={{ color: "rgba(212, 165, 116, 0.5)" }}
                  disabled={task.completedCount === 0}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </button>
                <button
                  onClick={() => incrementCompleted(task.id)}
                  className="p-1 rounded transition-all hover:scale-110"
                  style={{ color: "rgba(255, 213, 145, 0.7)" }}
                  disabled={task.completedCount >= task.targetCount}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 rounded transition-all hover:scale-110"
                  style={{ color: "rgba(212, 165, 116, 0.4)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 説明 */}
      <div className="mt-2 text-xs" style={{ color: "rgba(212, 165, 116, 0.4)" }}>
        タスク名をホバーして +/- で進捗を更新
      </div>
    </div>
  );
}
