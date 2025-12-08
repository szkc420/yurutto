"use client";

import { useState, useEffect } from "react";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

const STORAGE_KEY = "yurutto_tasks";

export default function TaskMemo() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch {
        setTasks([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: crypto.randomUUID(),
      text: newTask.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, task]);
    setNewTask("");
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTask();
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="relative w-72">
      {/* 手書きノートのような背景装飾 */}
      <div
        className="absolute -left-3 top-4 bottom-4 w-1 rounded-full"
        style={{
          background: "linear-gradient(180deg, rgba(139, 111, 71, 0.4) 0%, rgba(107, 68, 35, 0.3) 50%, rgba(139, 111, 71, 0.4) 100%)"
        }}
      />

      {/* メインカード - 古いノートのような */}
      <div
        className="paper-texture wood-frame rounded-2xl p-5 ml-2 ink-spread"
        style={{
          background: "linear-gradient(165deg, rgba(55, 48, 40, 0.92) 0%, rgba(45, 38, 30, 0.95) 50%, rgba(50, 42, 35, 0.93) 100%)"
        }}
      >
        {/* ヘッダー - 万年筆で書いたような */}
        <div
          className="flex items-center gap-3 mb-4 pb-3"
          style={{ borderBottom: "1px solid rgba(139, 111, 71, 0.25)" }}
        >
          {/* ペンのアイコン */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(212, 165, 116, 0.15), rgba(139, 111, 71, 0.1))",
              border: "1px solid rgba(212, 165, 116, 0.2)"
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="rgba(255, 213, 145, 0.7)"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
          <span
            className="font-medium tracking-wide"
            style={{
              color: "#ffd591",
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)"
            }}
          >
            Todo
          </span>
          {tasks.length > 0 && (
            <span
              className="text-sm ml-auto"
              style={{ color: "rgba(212, 165, 116, 0.5)" }}
            >
              {completedCount}/{tasks.length}
            </span>
          )}
        </div>

        {/* タスクリスト */}
        <div className="space-y-1 mb-4 max-h-52 overflow-y-auto pr-1">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="group flex items-center gap-3 py-2 px-2 rounded-lg transition-all hover:bg-white/[0.02]"
              style={{
                animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
                borderBottom: "1px dashed rgba(139, 111, 71, 0.15)"
              }}
            >
              {/* チェックボックス - インクで描いたような */}
              <button
                onClick={() => toggleTask(task.id)}
                className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all"
                style={{
                  background: task.completed
                    ? "linear-gradient(135deg, rgba(122, 155, 118, 0.5), rgba(168, 213, 186, 0.4))"
                    : "transparent",
                  border: task.completed
                    ? "1.5px solid rgba(168, 213, 186, 0.6)"
                    : "1.5px solid rgba(212, 165, 116, 0.4)",
                  boxShadow: task.completed ? "0 0 8px rgba(122, 155, 118, 0.3)" : "none"
                }}
              >
                {task.completed && (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="#f0fff5"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* タスクテキスト */}
              <span
                className="flex-1 text-sm transition-all"
                style={{
                  color: task.completed ? "rgba(212, 165, 116, 0.35)" : "rgba(245, 240, 232, 0.85)",
                  textDecorationLine: task.completed ? "line-through" : "none",
                  textDecorationStyle: "solid",
                  textDecorationColor: "rgba(139, 111, 71, 0.4)"
                }}
              >
                {task.text}
              </span>

              {/* 削除ボタン */}
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 transition-all hover:scale-110"
                style={{ color: "rgba(212, 165, 116, 0.4)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {tasks.length === 0 && (
            <div
              className="text-center py-6 text-sm"
              style={{ color: "rgba(212, 165, 116, 0.35)" }}
            >
              タスクを追加してください
            </div>
          )}
        </div>

        {/* 入力欄 - 万年筆で書くような */}
        <div className="relative">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="新しいタスクを追加..."
            className="w-full rounded-xl px-4 py-3 text-sm transition-all"
            style={{
              background: "rgba(42, 37, 32, 0.6)",
              border: "1px solid rgba(139, 111, 71, 0.25)",
              color: "#f5f0e8",
              caretColor: "#ffd591"
            }}
          />
          {newTask && (
            <button
              onClick={addTask}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all hover:scale-110"
              style={{
                color: "#ffd591",
                background: "rgba(255, 213, 145, 0.1)"
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
