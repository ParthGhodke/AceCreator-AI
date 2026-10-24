"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  History,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  getCreatorStrategy,
  getCreatorStrategyHistory,
  getCreatorStrategyVersion,
  getLatestCreator,
  regenerateCreatorStrategy,
  type CreatorStrategy,
  type StrategyHistoryItem,
} from "@/lib/api";

export default function StrategyPage() {
  const [strategy, setStrategy] = useState<CreatorStrategy | null>(null);
  const [creatorName, setCreatorName] = useState<string | undefined>();
  const [instagramHandle, setInstagramHandle] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [history, setHistory] = useState<StrategyHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(
    null,
  );
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);

  async function fetchStrategyHistory(id: string) {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const data = await getCreatorStrategyHistory(id, 20, 0);
      setHistory(data);
    } catch (err) {
      setHistoryError(
        err instanceof TypeError
          ? "Cannot reach the backend while loading strategy history."
          : err instanceof Error
            ? err.message
            : "Unable to load strategy history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openStrategyVersion(versionId: string) {
    if (!creatorId) return;

    setLoadingVersionId(versionId);
    setError(null);
    setNotice(null);

    try {
      const data = await getCreatorStrategyVersion(creatorId, versionId);
      setStrategy(data);
      setSelectedStrategyId(versionId);
      setNotice(
        "Viewing a saved strategy version. Your saved history has not been changed.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Make sure FastAPI is running."
          : err instanceof Error
            ? err.message
            : "Unable to load this strategy version.",
      );
    } finally {
      setLoadingVersionId(null);
    }
  }

  async function loadStrategy() {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const creator = await getLatestCreator();
      setCreatorId(creator.id);
      setCreatorName(creator.creatorName);
      setInstagramHandle(creator.instagram);

      const result = await getCreatorStrategy(creator.id);
      setStrategy(result);
      setSelectedStrategyId(result.id ?? null);
      await fetchStrategyHistory(creator.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your saved strategy.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    setNotice(null);

    try {
      const creator = await getLatestCreator();
      setCreatorId(creator.id);
      setCreatorName(creator.creatorName);
      setInstagramHandle(creator.instagram);

      const savedStrategy = await regenerateCreatorStrategy(creator.id);
      setStrategy(savedStrategy);
      setSelectedStrategyId(savedStrategy.id ?? null);
      await fetchStrategyHistory(creator.id);
      setNotice("Your new Instagram strategy has been generated and saved.");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Make sure FastAPI is running."
          : err instanceof Error
            ? err.message
            : "Unable to regenerate your strategy.",
      );
    } finally {
      setRegenerating(false);
    }
  }

  useEffect(() => {
    void loadStrategy();
  }, []);

  if (loading) {
    return (
      <AppShell creatorName={creatorName} instagramHandle={instagramHandle}>
        <div className="flex min-h-[75vh] items-center justify-center px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm text-muted-foreground">
              Loading your saved Instagram strategy...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !strategy) {
    return (
      <AppShell creatorName={creatorName} instagramHandle={instagramHandle}>
        <div className="flex min-h-[75vh] items-center justify-center px-6">
          <div className="y2k-chrome-card max-w-lg rounded-3xl p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Compass className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-2xl font-extrabold text-white">
              Ready to generate your strategy
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleRegenerate()}
                disabled={regenerating}
                className="y2k-cobalt-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50"
              >
                <Sparkles
                  className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
                />
                {regenerating ? "Generating..." : "Generate AI Strategy"}
              </button>

              <button
                type="button"
                onClick={() => void loadStrategy()}
                disabled={regenerating}
                className="y2k-chrome-pill inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!strategy) return null;

  return (
    <AppShell creatorName={creatorName} instagramHandle={instagramHandle}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {notice && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {error}
          </div>
        )}

        {/* Strategy Header Card */}
        <section className="y2k-iridescent-border overflow-hidden rounded-3xl">
          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="y2k-chrome-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-slate-200">
                <span className="h-2 w-2 rounded-full bg-[#CCFF00]" />
                INSTAGRAM STRATEGY BLUEPRINT
              </div>

              <h1 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {strategy.strategy_title}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {strategy.overview}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => void handleRegenerate()}
                disabled={regenerating}
                className="y2k-cobalt-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
                />
                {regenerating
                  ? "Generating new version..."
                  : "Regenerate strategy"}
              </button>

              <Link
                href="/studio"
                className="y2k-chrome-pill inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                Open Content Studio
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid border-t border-white/10 bg-black/40 sm:grid-cols-2">
            <div className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r sm:p-6">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-blue-400">
                <Target className="h-4 w-4" />
                Primary Growth Objective
              </div>

              <p className="mt-2.5 text-base font-bold text-white">
                {strategy.primary_goal}
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#CCFF00]">
                <Lightbulb className="h-4 w-4" />
                Target Instagram Audience
              </div>

              <p className="mt-2.5 text-sm leading-6 text-slate-300">
                {strategy.target_audience}
              </p>
            </div>
          </div>
        </section>

        {/* Content Pillars */}
        <section className="mt-10">
          <div className="mb-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#CCFF00]">
              100% Calibrated Mix
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-white">
              Instagram Content Pillars
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The core themes that shape your Reels, Carousels, Stories, and Static Posts.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {strategy.content_pillars.map((pillar, index) => (
              <article
                key={pillar.name}
                className="y2k-chrome-card rounded-2xl p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-blue-400">
                      PILLAR {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1.5 text-lg font-bold text-white">
                      {pillar.name}
                    </h3>
                  </div>

                  <div className="y2k-acid-badge rounded-xl px-3 py-1.5 font-mono text-sm font-bold">
                    {pillar.percentage}%
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {pillar.description}
                </p>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[#CCFF00]"
                    style={{ width: `${pillar.percentage}%` }}
                  />
                </div>

                <div className="mt-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Example Instagram Ideas
                  </p>
                  <ul className="mt-3 space-y-2">
                    {pillar.example_ideas.map((idea, ideaIndex) => (
                      <li
                        key={`${pillar.name}-${ideaIndex}`}
                        className="flex items-start gap-2.5 text-sm text-slate-200"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                        <span>{idea}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Weekly Action Plan */}
        <section className="mt-10">
          <div className="mb-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
              Execution Cadence
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-white">
              Weekly Instagram Action Plan
            </h2>
          </div>

          <div className="y2k-chrome-card overflow-hidden rounded-2xl">
            {strategy.weekly_actions.map((action, index) => (
              <div
                key={`${action.day}-${index}`}
                className="grid gap-3 border-b border-white/10 p-5 last:border-b-0 sm:grid-cols-[140px_1fr_auto] sm:items-center"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <CalendarDays className="h-4 w-4 text-blue-400" />
                  {action.day}
                </div>

                <p className="text-sm leading-6 text-slate-300">
                  {action.action}
                </p>

                <div className="y2k-chrome-pill inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-medium text-slate-200">
                  {action.content_format === "Analytics review" ? (
                    <Clock3 className="h-3.5 w-3.5 text-[#CCFF00]" />
                  ) : (
                    <Video className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  {action.content_format}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Growth Recommendations + Metrics */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="y2k-chrome-card rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Growth Recommendations
              </h2>
            </div>

            <ul className="mt-6 space-y-4">
              {strategy.growth_recommendations.map((recommendation, index) => (
                <li
                  key={`${index}-${recommendation}`}
                  className="flex items-start gap-3 text-sm leading-6 text-slate-300"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] font-mono text-xs font-semibold text-[#CCFF00]">
                    {index + 1}
                  </span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="y2k-chrome-card rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Success Metrics to Track
              </h2>
            </div>

            <ul className="mt-6 space-y-3">
              {strategy.success_metrics.map((metric, index) => (
                <li
                  key={`${index}-${metric}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3.5 text-sm text-slate-200"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#CCFF00]" />
                  {metric}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Version History */}
        <section className="y2k-chrome-card mt-10 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">
                  Saved Strategy Versions
                </h2>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                Browse immutable strategy snapshots. Viewing an older version never overwrites your history.
              </p>
            </div>
            <button
              type="button"
              onClick={() => creatorId && void fetchStrategyHistory(creatorId)}
              disabled={!creatorId || historyLoading}
              className="y2k-chrome-pill inline-flex w-fit items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`}
              />
              Refresh history
            </button>
          </div>

          {historyError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300"
            >
              {historyError}
            </p>
          )}

          {historyLoading && history.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading saved strategy versions...
            </div>
          ) : history.length === 0 ? (
            <p className="mt-5 rounded-xl bg-black/30 px-4 py-5 text-sm text-muted-foreground">
              No saved strategy versions were found yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {history.map((item, index) => {
                const isSelected = selectedStrategyId === item.id;
                const createdDate = new Date(item.created_at);
                const formattedDate = Number.isNaN(createdDate.getTime())
                  ? item.created_at
                  : createdDate.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      isSelected
                        ? "border-blue-500/50 bg-blue-600/10"
                        : "border-white/10 bg-black/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-white">
                          {item.strategy_title}
                        </p>
                        {index === 0 && (
                          <span className="y2k-acid-badge rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold">
                            LATEST
                          </span>
                        )}
                        {isSelected && (
                          <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white">
                            ACTIVE VIEW
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Goal: {item.primary_goal}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {formattedDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openStrategyVersion(item.id)}
                      disabled={loadingVersionId !== null || isSelected}
                      className="y2k-chrome-pill inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50"
                    >
                      {loadingVersionId === item.id && (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      )}
                      {isSelected ? "Viewing version" : "Open snapshot"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {selectedStrategyId &&
            history.length > 0 &&
            selectedStrategyId !== history[0]?.id && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-amber-200">
                  You are viewing an older strategy snapshot.
                </p>
                <button
                  type="button"
                  onClick={() => void loadStrategy()}
                  disabled={loading || regenerating || loadingVersionId !== null}
                  className="y2k-chrome-pill inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Return to latest strategy
                </button>
              </div>
            )}
        </section>
      </div>
    </AppShell>
  );
}
