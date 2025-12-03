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

  // ローカルストレージから読み込み
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

  // ローカルストレージに保存
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
    <div className="text-white w-64">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-medium">Todo</span>
        {tasks.length > 0 && (
          <span className="text-sm text-white/40">
            {completedCount}/{tasks.length}
          </span>
        )}
        <button
          onClick={addTask}
          className="ml-auto text-white/40 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* タスクリスト */}
      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 group"
          >
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                task.completed
                  ? "bg-white/60 border-white/60"
                  : "border-white/40 hover:border-white/60"
              }`}
            >
              {task.completed && (
                <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                task.completed ? "line-through text-white/30" : "text-white/80"
              }`}
            >
              {task.text}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 入力欄 */}
      <input
        type="text"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="新しいタスクを追加..."
        className="w-full bg-transparent border-b border-white/20 px-0 py-1 text-sm placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
      />
    </div>
  );
}
