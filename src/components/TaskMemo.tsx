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
    <div className="text-amber-50 w-72 relative">
      {/* ノートの背景装飾 */}
      <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-600/30 via-amber-500/20 to-amber-600/30 rounded-full" />

      {/* メインカード - 紙のようなデザイン */}
      <div
        className="paper-texture warm-border rounded-2xl p-4 shadow-xl ml-2"
        style={{
          background: "linear-gradient(135deg, rgba(45, 40, 35, 0.85) 0%, rgba(35, 30, 25, 0.9) 100%)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 200, 150, 0.1)"
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-amber-500/20">
          {/* ペンアイコン */}
          <svg className="w-4 h-4 text-amber-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="font-medium text-amber-100/80">Todo</span>
          {tasks.length > 0 && (
            <span className="text-sm text-amber-300/40">
              {completedCount}/{tasks.length}
            </span>
          )}
          <button
            onClick={addTask}
            className="ml-auto text-amber-300/40 hover:text-amber-200/80 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* タスクリスト */}
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="flex items-center gap-3 group py-1 border-b border-amber-900/30"
              style={{
                borderBottomStyle: "dashed",
                animation: `fadeIn 0.3s ease ${index * 0.05}s both`
              }}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-4 h-4 rounded-sm border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  task.completed
                    ? "bg-amber-500/60 border-amber-500/60"
                    : "border-amber-400/40 hover:border-amber-400/70"
                }`}
              >
                {task.completed && (
                  <svg className="w-2.5 h-2.5 text-amber-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm transition-all ${
                  task.completed
                    ? "line-through text-amber-200/30"
                    : "text-amber-100/80"
                }`}
              >
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-amber-300/30 hover:text-amber-300/70 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-4 text-amber-200/30 text-sm">
              タスクを追加してください
            </div>
          )}
        </div>

        {/* 入力欄 */}
        <div className="relative">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="新しいタスクを追加..."
            className="w-full bg-amber-900/20 rounded-lg px-3 py-2.5 text-sm text-amber-50 placeholder-amber-200/30 border border-amber-500/20 focus:outline-none focus:border-amber-500/40 focus:bg-amber-900/30 transition-all"
          />
          {newTask && (
            <button
              onClick={addTask}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-400/60 hover:text-amber-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
