"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDocFromCache, getDocFromServer, setDoc } from "firebase/firestore";

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  const [selectedDate, setSelectedDate] = useState(new Date());
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

  const isToday = formatDateKey(selectedDate) === formatDateKey(new Date());

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
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-zinc-900 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl border border-white/10 max-h-[80vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-white">ジャーナル</h2>
            {saving ? (
              <span className="text-xs text-white/40">保存中...</span>
            ) : syncing ? (
              <span className="text-xs text-white/30">同期中...</span>
            ) : loadFailed ? (
              <span className="text-xs text-yellow-400">読み込み失敗</span>
            ) : (
              <span className="text-xs text-green-400">読み込み完了</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">{user.email}</span>
                <button
                  onClick={signOut}
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  ログアウト
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 日付ナビゲーション */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/5">
          <button
            onClick={() => changeDate(-1)}
            className="p-1 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <div className="text-white font-medium">{formatDisplayDate(selectedDate)}</div>
            {isToday && <span className="text-xs text-white/40">今日</span>}
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-1 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 読み込み失敗警告 */}
          {loadFailed && (
            <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3 text-sm">
              <div className="text-yellow-200 mb-2">
                データの読み込みに失敗しました。サーバーに既存のデータがある可能性があります。
              </div>
              <div className="flex gap-2">
                <button
                  onClick={retryLoad}
                  disabled={syncing}
                  className="px-3 py-1 bg-yellow-500/30 hover:bg-yellow-500/50 rounded text-yellow-100 transition-colors disabled:opacity-50"
                >
                  {syncing ? "読み込み中..." : "再読み込み"}
                </button>
                {hasUserEdited && (
                  <button
                    onClick={forceSave}
                    className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 rounded text-red-100 transition-colors"
                  >
                    現在の内容で上書き保存
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {/* スケルトン: 日記エリア */}
              <div>
                <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
                <div className="h-32 bg-white/5 rounded-lg"></div>
              </div>
              {/* スケルトン: タスクエリア */}
              <div>
                <div className="h-4 w-20 bg-white/10 rounded mb-2"></div>
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="h-5 bg-white/10 rounded w-3/4"></div>
                  <div className="h-5 bg-white/10 rounded w-1/2"></div>
                  <div className="h-5 bg-white/10 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 日記 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/60">今日の出来事</label>
                </div>
                <textarea
                  value={diary}
                  onChange={(e) => handleDiaryChange(e.target.value)}
                  placeholder="今日はどんな一日でしたか？"
                  className="w-full h-32 bg-white/5 rounded-lg px-4 py-3 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              {/* タスク */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-white/60">タスク</label>
                  {isToday && (
                    <button
                      onClick={copyTasksFromWorkScreen}
                      className="text-xs text-white/40 hover:text-white transition-colors"
                    >
                      作業画面からコピー
                    </button>
                  )}
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
                  {/* タスク一覧 */}
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 group">
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
                          task.completed ? "line-through text-white/40" : "text-white/80"
                        }`}
                      >
                        {task.text}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {/* 新規タスク入力 */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-4 h-4 rounded border border-white/20 flex-shrink-0" />
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
                      className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                    />
                    {newTaskText.trim() && (
                      <button
                        onClick={addTask}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
