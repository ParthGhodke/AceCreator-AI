"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";

import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginUser({ email: email.trim(), password });
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach FastAPI backend. Ensure Uvicorn is running on port 8000."
          : err instanceof Error
            ? err.message
            : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="y2k-grid-bg flex min-h-screen flex-col justify-center bg-background px-4 py-12 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <div className="y2k-iridescent-border rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="y2k-cobalt-button flex h-10 w-10 items-center justify-center rounded-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                AceCreator{" "}
                <span className="y2k-iridescent-text font-extrabold">AI</span>
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                CREATOR AUTHENTICATION
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-white">
            Sign in to your studio
          </h1>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Access your private Instagram strategy, content drafts, and AI Manager workspace.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@example.com"
                  className="w-full rounded-xl border border-input bg-black/60 py-3 pl-10 pr-4 text-sm text-white outline-none focus-visible:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-black/60 py-3 pl-10 pr-4 text-sm text-white outline-none focus-visible:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="y2k-cobalt-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5 text-center text-xs text-muted-foreground">
            New to AceCreator AI?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#CCFF00] hover:underline"
            >
              Create a creator account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
