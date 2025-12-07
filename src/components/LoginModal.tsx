"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "signup" | "reset";

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError("Googleログインに失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
        onClose();
      } else if (mode === "signup") {
        await signUpWithEmail(email, password);
        onClose();
      } else if (mode === "reset") {
        await resetPassword(email);
        setMessage("パスワードリセットメールを送信しました");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("user-not-found")) {
          setError("ユーザーが見つかりません");
        } else if (err.message.includes("wrong-password")) {
          setError("パスワードが間違っています");
        } else if (err.message.includes("email-already-in-use")) {
          setError("このメールアドレスは既に使用されています");
        } else if (err.message.includes("weak-password")) {
          setError("パスワードは6文字以上にしてください");
        } else if (err.message.includes("invalid-email")) {
          setError("メールアドレスの形式が正しくありません");
        } else {
          setError("エラーが発生しました");
        }
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setError("");
    setMessage("");
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-zinc-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-white/10">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* タイトル */}
        <h2 className="text-xl font-medium text-white mb-6 text-center">
          {mode === "login" && "ログイン"}
          {mode === "signup" && "アカウント作成"}
          {mode === "reset" && "パスワードリセット"}
        </h2>

        {/* Googleログイン */}
        {mode !== "reset" && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black rounded-lg py-3 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Googleでログイン
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/40 text-sm">または</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>
          </>
        )}

        {/* メールフォーム */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              required
              className="w-full bg-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/30"
            />
          </div>

          {mode !== "reset" && (
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                required
                minLength={6}
                className="w-full bg-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/30"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {message && (
            <p className="text-green-400 text-sm">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white/20 hover:bg-white/30 text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "処理中..." : (
              <>
                {mode === "login" && "ログイン"}
                {mode === "signup" && "アカウント作成"}
                {mode === "reset" && "リセットメールを送信"}
              </>
            )}
          </button>
        </form>

        {/* モード切替 */}
        <div className="mt-4 text-center text-sm">
          {mode === "login" && (
            <>
              <button
                onClick={() => switchMode("reset")}
                className="text-white/50 hover:text-white transition-colors"
              >
                パスワードを忘れた方
              </button>
              <span className="text-white/30 mx-2">|</span>
              <button
                onClick={() => switchMode("signup")}
                className="text-white/50 hover:text-white transition-colors"
              >
                新規登録
              </button>
            </>
          )}
          {mode === "signup" && (
            <button
              onClick={() => switchMode("login")}
              className="text-white/50 hover:text-white transition-colors"
            >
              既にアカウントをお持ちの方
            </button>
          )}
          {mode === "reset" && (
            <button
              onClick={() => switchMode("login")}
              className="text-white/50 hover:text-white transition-colors"
            >
              ログインに戻る
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
