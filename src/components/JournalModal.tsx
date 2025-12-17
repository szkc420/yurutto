"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDocFromCache, getDocFromServer, setDoc } from "firebase/firestore";
import MonthlyIntegratedView from "./MonthlyIntegratedView";
import MonthlyTasks from "./MonthlyTasks";

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = "daily" | "monthly";

interface JournalEntry {
  diary: string;
  tasks: { id: string; text: string; completed: boolean }[];
  updatedAt: string;
}

// ローカルキャッシュ用のキー
const getLocalCacheKey = (userId: string, dateKey: string) =>
  `yurutto_journal_cache_${userId}_${dateKey}`;

// タイムアウト付きPromise
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
};

export default function JournalModal({ isOpen, onClose }: JournalModalProps) {
  const { user, signOut } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [diary, setDiary] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [loadFailed, setLoadFailed] = useState(false); // 読み込み失敗フラグ
  const [hasUserEdited, setHasUserEdited] = useState(false); // ユーザーが編集したか
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  // ローカルキャッシュから読み込み（即座に表示）
  const loadFromLocalCache = (userId: string, dateKey: string) => {
    const cacheKey = getLocalCacheKey(userId, dateKey);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached) as JournalEntry;
        return data;
      } catch {
        return null;
      }
    }
    return null;
  };

  // ローカルキャッシュに保存
  const saveToLocalCache = (userId: string, dateKey: string, data: JournalEntry) => {
    const cacheKey = getLocalCacheKey(userId, dateKey);
    localStorage.setItem(cacheKey, JSON.stringify(data));
  };

  // ジャーナルデータを読み込み（楽観的UI）
  useEffect(() => {
    if (!isOpen || !user) return;

    const dateKey = formatDateKey(selectedDate);

    // 日付変更時はまずデータをクリア
    setDiary("");
    setTasks([]);
    setNewTaskText("");
    setLoadFailed(false);
    setHasUserEdited(false);

    // Step 1: まずローカルキャッシュから即座に表示
    const cached = loadFromLocalCache(user.uid, dateKey);
    let hasCache = false;
    if (cached) {
      setDiary(cached.diary || "");
      setTasks(cached.tasks || []);
      setLoading(false);
      setSyncing(true);
      hasCache = true;
    } else {
      // キャッシュがない場合は空で表示（ローディングなし）
      setLoading(false);
      setSyncing(true);
    }

    // Step 2: Firestoreからデータを取得（バックグラウンド、タイムアウト3秒）
    const loadJournal = async () => {
      const docRef = doc(db, "users", user.uid, "journal", dateKey);
      let loadedFromFirestore = false;

      // まずFirestoreのキャッシュから取得を試みる
      try {
        const cachedSnap = await getDocFromCache(docRef);
        if (cachedSnap.exists()) {
          const data = cachedSnap.data() as JournalEntry;
          setDiary(data.diary || "");
          setTasks(data.tasks || []);
          saveToLocalCache(user.uid, dateKey, data);
          setLoading(false);
          loadedFromFirestore = true;
        }
      } catch {
        // キャッシュにない場合は無視
      }

      // サーバーから最新を取得（3秒タイムアウト）
      try {
        const serverSnap = await withTimeout(getDocFromServer(docRef), 3000);
        if (serverSnap.exists()) {
          const data = serverSnap.data() as JournalEntry;
          setDiary(data.diary || "");
          setTasks(data.tasks || []);
          saveToLocalCache(user.uid, dateKey, data);
          loadedFromFirestore = true;
        }
        // サーバーからの読み込み成功（データなしも成功扱い）
        setLoadFailed(false);
      } catch (error) {
        // タイムアウトまたはオフラインエラー
        const isIgnorableError = error instanceof Error &&
          (error.message.includes("offline") || error.message === "Timeout");

        // キャッシュもなく、サーバーからも読み込めなかった場合は失敗フラグを立てる
        if (!hasCache && !loadedFromFirestore) {
          setLoadFailed(true);
        }

        if (!isIgnorableError) {
          console.error("Failed to load journal:", error);
        }
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    };

    loadJournal();
  }, [isOpen, user, selectedDate]);

  // ジャーナルを保存
  const saveJournal = async (diaryText: string, taskList: typeof tasks) => {
    if (!user) return;

    const dateKey = formatDateKey(selectedDate);
    const journalData: JournalEntry = {
      diary: diaryText,
      tasks: taskList,
      updatedAt: new Date().toISOString(),
    };

    // まずローカルキャッシュに保存（即座に反映）
    saveToLocalCache(user.uid, dateKey, journalData);

    // Firestoreへの保存はバックグラウンドで実行（UIをブロックしない）
    setSaving(true);
    try {
      const docRef = doc(db, "users", user.uid, "journal", dateKey);
      // 3秒タイムアウト
      await withTimeout(setDoc(docRef, journalData), 3000);
    } catch (error) {
      // タイムアウトやオフラインエラーは無視（ローカルキャッシュには保存済み）
      const isIgnorableError = error instanceof Error &&
        (error.message.includes("offline") || error.message === "Timeout");
      if (!isIgnorableError) {
        console.error("Failed to save journal:", error);
      }
    } finally {
      setSaving(false);
    }
  };

  // 変更時に自動保存（デバウンス）
  const triggerSave = (newDiary: string, newTasks: typeof tasks) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveJournal(newDiary, newTasks);
    }, 1000);
  };

  // 日記変更
  const handleDiaryChange = (newDiary: string) => {
    setDiary(newDiary);
    setHasUserEdited(true);
    if (!loadFailed) {
      triggerSave(newDiary, tasks);
    }
  };

  // タスク追加
  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    setNewTaskText("");
    setHasUserEdited(true);
    if (!loadFailed) {
      triggerSave(diary, newTasks);
    }
  };

  // タスク完了切り替え
  const toggleTask = (taskId: string) => {
    const newTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(newTasks);
    setHasUserEdited(true);
    if (!loadFailed) {
      triggerSave(diary, newTasks);
    }
  };

  // タスク削除
  const deleteTask = (taskId: string) => {
    const newTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(newTasks);
    setHasUserEdited(true);
    if (!loadFailed) {
      triggerSave(diary, newTasks);
    }
  };

  // 読み込み失敗時に再試行
  const retryLoad = () => {
    if (!user) return;
    setLoadFailed(false);
    setSyncing(true);
    const dateKey = formatDateKey(selectedDate);
    const docRef = doc(db, "users", user.uid, "journal", dateKey);

    getDocFromServer(docRef)
      .then((serverSnap) => {
        if (serverSnap.exists()) {
          const data = serverSnap.data() as JournalEntry;
          setDiary(data.diary || "");
          setTasks(data.tasks || []);
          saveToLocalCache(user.uid, dateKey, data);
        }
        setLoadFailed(false);
      })
      .catch(() => {
        setLoadFailed(true);
      })
      .finally(() => {
        setSyncing(false);
      });
  };

  // 読み込み失敗時でも強制的に保存
  const forceSave = () => {
    setLoadFailed(false);
    triggerSave(diary, tasks);
  };

  // 作業画面からタスクをコピー（今日のみ）
  const copyTasksFromWorkScreen = () => {
    const localTasks = localStorage.getItem("yurutto_tasks");
    if (localTasks) {
      try {
        const parsed = JSON.parse(localTasks);
        // 既存のタスクIDと重複しないように新しいIDを付与
        const copiedTasks = parsed.map((task: { text: string; completed: boolean }) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text: task.text,
          completed: task.completed,
        }));
        const newTasks = [...tasks, ...copiedTasks];
        setTasks(newTasks);
        triggerSave(diary, newTasks);
      } catch {
        // ignore
      }
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const changeMonth = (months: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + months);
    setSelectedMonth(newMonth);
  };

  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
    });
  };

  const isToday = formatDateKey(selectedDate) === formatDateKey(new Date());
  const isCurrentMonth = selectedMonth.getFullYear() === new Date().getFullYear() &&
    selectedMonth.getMonth() === new Date().getMonth();

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ - 夜の書斎の暗さ */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          background: "radial-gradient(ellipse at center, rgba(26, 24, 20, 0.85) 0%, rgba(15, 12, 10, 0.95) 100%)"
        }}
        onClick={onClose}
      />

      {/* モーダル - 古い革表紙の日記帳 */}
      <div
        className="relative w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col ink-spread"
        style={{
          background: "linear-gradient(165deg, rgba(55, 48, 40, 0.98) 0%, rgba(42, 36, 28, 0.99) 50%, rgba(50, 42, 34, 0.98) 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(139, 111, 71, 0.4)",
          boxShadow: `
            0 25px 60px rgba(0, 0, 0, 0.5),
            0 10px 30px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 213, 145, 0.08),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3)
          `
        }}
      >
        {/* 本の背表紙デコレーション */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 rounded-l-2xl"
          style={{
            background: "linear-gradient(90deg, rgba(107, 68, 35, 0.6), rgba(139, 111, 71, 0.4))",
            borderRight: "1px solid rgba(212, 165, 116, 0.2)"
          }}
        />
        <div
          className="absolute left-3 top-4 bottom-4 w-px"
          style={{ background: "rgba(255, 213, 145, 0.15)" }}
        />

        {/* ヘッダー */}
        <div
          className="flex items-center justify-between p-4 pl-8"
          style={{ borderBottom: "1px solid rgba(139, 111, 71, 0.25)" }}
        >
          <div className="flex items-center gap-3">
            {/* 本のアイコン */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(212, 165, 116, 0.15), rgba(139, 111, 71, 0.1))",
                border: "1px solid rgba(212, 165, 116, 0.25)"
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="rgba(255, 213, 145, 0.8)" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2
                className="text-lg font-medium tracking-wide"
                style={{ color: "#ffd591", textShadow: "0 2px 4px rgba(0, 0, 0, 0.4)" }}
              >
                ジャーナル
              </h2>
              <span
                className="text-xs"
                style={{
                  color: saving ? "rgba(255, 213, 145, 0.6)" :
                         syncing ? "rgba(212, 165, 116, 0.4)" :
                         loadFailed ? "rgba(255, 180, 100, 0.7)" :
                         "rgba(122, 155, 118, 0.7)"
                }}
              >
                {saving ? "保存中..." : syncing ? "同期中..." : loadFailed ? "読み込み失敗" : "同期完了"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "rgba(212, 165, 116, 0.5)" }}>{user.email}</span>
                <button
                  onClick={signOut}
                  className="text-xs transition-all hover:scale-105"
                  style={{ color: "rgba(212, 165, 116, 0.4)" }}
                >
                  ログアウト
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ color: "rgba(212, 165, 116, 0.5)" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ビュー切り替えタブ */}
        <div
          className="flex items-center gap-1 px-8 py-2"
          style={{ borderBottom: "1px solid rgba(139, 111, 71, 0.15)" }}
        >
          <button
            onClick={() => setViewMode("daily")}
            className="px-4 py-1.5 rounded-lg text-sm transition-all"
            style={{
              background: viewMode === "daily" ? "rgba(255, 213, 145, 0.12)" : "transparent",
              color: viewMode === "daily" ? "#ffd591" : "rgba(212, 165, 116, 0.5)",
              border: viewMode === "daily" ? "1px solid rgba(255, 213, 145, 0.25)" : "1px solid transparent"
            }}
          >
            日別
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className="px-4 py-1.5 rounded-lg text-sm transition-all"
            style={{
              background: viewMode === "monthly" ? "rgba(255, 213, 145, 0.12)" : "transparent",
              color: viewMode === "monthly" ? "#ffd591" : "rgba(212, 165, 116, 0.5)",
              border: viewMode === "monthly" ? "1px solid rgba(255, 213, 145, 0.25)" : "1px solid transparent"
            }}
          >
            月間
          </button>
        </div>

        {/* 日付/月ナビゲーション */}
        <div
          className="flex items-center justify-between px-8 py-3"
          style={{
            background: "linear-gradient(180deg, rgba(42, 37, 32, 0.5), transparent)",
            borderBottom: "1px dashed rgba(139, 111, 71, 0.2)"
          }}
        >
          {viewMode === "daily" ? (
            <>
              <button
                onClick={() => changeDate(-1)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ color: "rgba(212, 165, 116, 0.6)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <div
                  className="font-medium tracking-wide"
                  style={{ color: "#ffd591", textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)" }}
                >
                  {formatDisplayDate(selectedDate)}
                </div>
                {isToday && (
                  <span
                    className="text-xs"
                    style={{ color: "rgba(122, 155, 118, 0.7)" }}
                  >
                    今日
                  </span>
                )}
              </div>
              <button
                onClick={() => changeDate(1)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ color: "rgba(212, 165, 116, 0.6)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ color: "rgba(212, 165, 116, 0.6)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <div
                  className="font-medium tracking-wide"
                  style={{ color: "#ffd591", textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)" }}
                >
                  {formatMonthDisplay(selectedMonth)}
                </div>
                {isCurrentMonth && (
                  <span
                    className="text-xs"
                    style={{ color: "rgba(122, 155, 118, 0.7)" }}
                  >
                    今月
                  </span>
                )}
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ color: "rgba(212, 165, 116, 0.6)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* コンテンツ - 古い紙のようなページ */}
        <div className="flex-1 overflow-y-auto p-6 pl-8 space-y-5">
          {viewMode === "daily" ? (
            <>
              {/* 読み込み失敗警告 */}
              {loadFailed && (
                <div
                  className="rounded-xl p-4 text-sm"
                  style={{
                    background: "rgba(200, 150, 80, 0.1)",
                    border: "1px solid rgba(200, 150, 80, 0.3)"
                  }}
                >
                  <div className="mb-3" style={{ color: "rgba(255, 200, 150, 0.9)" }}>
                    データの読み込みに失敗しました。サーバーに既存のデータがある可能性があります。
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={retryLoad}
                      disabled={syncing}
                      className="px-4 py-1.5 rounded-lg transition-all hover:scale-105 disabled:opacity-50"
                      style={{
                        background: "rgba(200, 150, 80, 0.2)",
                        border: "1px solid rgba(200, 150, 80, 0.4)",
                        color: "rgba(255, 200, 150, 0.9)"
                      }}
                    >
                      {syncing ? "読み込み中..." : "再読み込み"}
                    </button>
                    {hasUserEdited && (
                      <button
                        onClick={forceSave}
                        className="px-4 py-1.5 rounded-lg transition-all hover:scale-105"
                        style={{
                          background: "rgba(180, 100, 80, 0.2)",
                          border: "1px solid rgba(180, 100, 80, 0.4)",
                          color: "rgba(255, 160, 140, 0.9)"
                        }}
                      >
                        現在の内容で上書き保存
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="space-y-5 animate-pulse">
                  <div>
                    <div className="h-4 w-28 rounded mb-3" style={{ background: "rgba(139, 111, 71, 0.2)" }} />
                    <div className="h-36 rounded-xl" style={{ background: "rgba(42, 37, 32, 0.5)" }} />
                  </div>
                  <div>
                    <div className="h-4 w-20 rounded mb-3" style={{ background: "rgba(139, 111, 71, 0.2)" }} />
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(42, 37, 32, 0.5)" }}>
                      <div className="h-5 rounded w-3/4" style={{ background: "rgba(139, 111, 71, 0.15)" }} />
                      <div className="h-5 rounded w-1/2" style={{ background: "rgba(139, 111, 71, 0.15)" }} />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 日記セクション - 万年筆で書いたような */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="rgba(255, 213, 145, 0.6)" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      <label
                        className="text-sm tracking-wide"
                        style={{ color: "rgba(212, 165, 116, 0.7)" }}
                      >
                        今日の出来事
                      </label>
                    </div>
                    <textarea
                      value={diary}
                      onChange={(e) => handleDiaryChange(e.target.value)}
                      placeholder="今日はどんな一日でしたか？"
                      className="w-full h-36 rounded-xl px-4 py-3 text-sm transition-all resize-none"
                      style={{
                        background: "rgba(42, 37, 32, 0.6)",
                        border: "1px solid rgba(139, 111, 71, 0.25)",
                        color: "rgba(245, 240, 232, 0.9)",
                        caretColor: "#ffd591"
                      }}
                    />
                  </div>

                  {/* タスクセクション - チェックリスト */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="rgba(255, 213, 145, 0.6)" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <label
                          className="text-sm tracking-wide"
                          style={{ color: "rgba(212, 165, 116, 0.7)" }}
                        >
                          タスク
                        </label>
                      </div>
                      {isToday && (
                        <button
                          onClick={copyTasksFromWorkScreen}
                          className="text-xs transition-all hover:scale-105"
                          style={{ color: "rgba(212, 165, 116, 0.5)" }}
                        >
                          作業画面からコピー
                        </button>
                      )}
                    </div>
                    <div
                      className="rounded-xl p-4 space-y-2"
                      style={{
                        background: "rgba(42, 37, 32, 0.6)",
                        border: "1px solid rgba(139, 111, 71, 0.25)"
                      }}
                    >
                      {tasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 py-2 group"
                          style={{
                            animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
                            borderBottom: "1px dashed rgba(139, 111, 71, 0.15)"
                          }}
                        >
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
                              <svg className="w-3 h-3" fill="none" stroke="#f0fff5" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
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

                      {/* 新規タスク入力 */}
                      <div className="flex items-center gap-3 pt-2">
                        <div
                          className="w-5 h-5 rounded flex-shrink-0"
                          style={{ border: "1.5px dashed rgba(139, 111, 71, 0.3)" }}
                        />
                        <input
                          type="text"
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTask();
                            }
                          }}
                          placeholder="新しいタスクを追加..."
                          className="flex-1 bg-transparent text-sm focus:outline-none"
                          style={{
                            color: "rgba(245, 240, 232, 0.85)",
                            caretColor: "#ffd591"
                          }}
                        />
                        {newTaskText.trim() && (
                          <button
                            onClick={addTask}
                            className="p-1 rounded-lg transition-all hover:scale-110"
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
                </>
              )}
            </>
          ) : (
            /* 月間ビュー */
            <div className="space-y-6">
              {/* 統合ビュー（2軸グラフ + 日付 + デイリートラッカー） */}
              <MonthlyIntegratedView selectedMonth={selectedMonth} />

              {/* 月間タスク */}
              <MonthlyTasks selectedMonth={selectedMonth} />
            </div>
          )}
        </div>

        {/* 装飾的な下部ライン */}
        <div
          className="h-1.5 rounded-b-2xl"
          style={{
            background: "linear-gradient(90deg, rgba(107, 68, 35, 0.4), rgba(139, 111, 71, 0.3), rgba(107, 68, 35, 0.4))"
          }}
        />
      </div>
    </div>
  );
}
