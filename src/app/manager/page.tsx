"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FilePlus2,
  Filter,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  generateDraftFromRecommendation,
  generateManagerRecommendations,
  getLatestCreator,
  getManagerRecommendations,
  updateManagerRecommendationStatus,
  type ManagerRecommendation,
  type RecommendationStatus,
} from "@/lib/api";

const PAGE_SIZE = 10;

const statusOptions: {
  value: RecommendationStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All recommendations" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Dismissed" },
];

const statusStyles: Record<RecommendationStatus, string> = {
  new: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  in_progress: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  completed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  dismissed: "border-white/15 bg-white/[0.05] text-slate-400",
};

const priorityStyles = {
  high: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  medium: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  low: "border-white/15 bg-white/[0.05] text-slate-300",
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) =>
    char.toUpperCase(),
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ManagerPage() {
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState("Creator");
  const [instagramHandle, setInstagramHandle] = useState<string | undefined>();
  const [items, setItems] = useState<ManagerRecommendation[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<
    RecommendationStatus | "all"
  >("all");

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [generatingDraftId, setGeneratingDraftId] = useState<string | null>(
    null,
  );
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);

  const loadRecommendations = useCallback(
    async (id: string, nextOffset = offset) => {
      setLoading(true);
      setError(null);

      try {
        const result = await getManagerRecommendations(id, {
          limit: PAGE_SIZE,
          offset: nextOffset,
          status: statusFilter,
        });

        setItems(result.items);
        setTotal(result.total);
        setOffset(result.offset);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load recommendations.",
        );
      } finally {
        setLoading(false);
      }
    },
    [offset, statusFilter],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setError(null);

      try {
        const creator = await getLatestCreator();

        if (cancelled) return;

        setCreatorId(creator.id);
        setCreatorName(creator.creatorName || "Creator");
        setInstagramHandle(creator.instagram);

        const result = await getManagerRecommendations(creator.id, {
          limit: PAGE_SIZE,
          offset: 0,
          status: "all",
        });

        if (cancelled) return;

        setItems(result.items);
        setTotal(result.total);
        setOffset(0);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your Manager workspace.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!creatorId) return;
    void loadRecommendations(creatorId, 0);
  }, [creatorId, statusFilter, loadRecommendations]);

  async function handleGenerate() {
    if (!creatorId) return;

    setGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const generated = await generateManagerRecommendations(creatorId);

      setNotice(
        `Generated ${generated.length} Instagram recommendations successfully.`,
      );
      setStatusFilter("all");
      setOffset(0);

      const result = await getManagerRecommendations(creatorId, {
        limit: PAGE_SIZE,
        offset: 0,
        status: "all",
      });

      setItems(result.items);
      setTotal(result.total);
      setOffset(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate recommendations.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(
    recommendation: ManagerRecommendation,
    status: RecommendationStatus,
  ) {
    if (!creatorId) return;

    setUpdatingId(recommendation.id);
    setError(null);
    setNotice(null);

    try {
      await updateManagerRecommendationStatus(
        creatorId,
        recommendation.id,
        status,
      );

      setNotice(`Recommendation marked ${formatLabel(status).toLowerCase()}.`);
      await loadRecommendations(creatorId, offset);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update recommendation status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleGenerateDraft(item: ManagerRecommendation) {
    if (!creatorId || generatingDraftId) return;

    setGeneratingDraftId(item.id);
    setError(null);
    setNotice(null);
    setSavedDraftId(null);

    try {
      const draft = await generateDraftFromRecommendation(creatorId, item.id, {
        topic: item.title,
        contentFormat: "Reel",
        platform: "Instagram",
      });

      setSavedDraftId(draft.id);
      setNotice(
        `Instagram Reel draft "${draft.title}" was generated and saved to your library.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate a draft from this recommendation.",
      );
    } finally {
      setGeneratingDraftId(null);
    }
  }

  const highPriorityCount = items.filter(
    (item) => item.priority === "high",
  ).length;

  const completedCount = items.filter(
    (item) => item.status === "completed",
  ).length;

  const startItem = total === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + items.length, total);

  return (
    <AppShell creatorName={creatorName} instagramHandle={instagramHandle}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="y2k-iridescent-border mb-8 flex flex-col justify-between gap-5 rounded-3xl p-6 md:flex-row md:items-center sm:p-8">
          <div>
            <div className="y2k-chrome-pill mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-slate-200">
              <Brain className="h-3.5 w-3.5 text-[#CCFF00]" />
              <span>AI INSTAGRAM CREATOR MANAGER</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your AI Manager
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Hi {creatorName}. Synthesize your creator profile, saved strategy,
              recent drafts, and available Instagram analytics into prioritized
              next actions—and convert any action into a Reel draft in one click.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!creatorId || generating || loading}
            className="y2k-cobalt-button inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Synthesizing..." : "Generate Recommendations"}
          </button>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Saved Recommendations"
            value={String(total)}
            description="Matching current status filter"
            icon={Lightbulb}
          />
          <MetricCard
            label="High Priority (This Page)"
            value={String(highPriorityCount)}
            description="Actions to prioritize first"
            icon={Target}
          />
          <MetricCard
            label="Completed (This Page)"
            value={String(completedCount)}
            description="Executed actions"
            icon={CheckCircle2}
          />
        </section>

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{notice}</p>

              {savedDraftId && (
                <Link
                  href={`/studio?draftId=${encodeURIComponent(savedDraftId)}`}
                  className="mt-2 inline-flex items-center gap-2 font-bold text-[#CCFF00] underline underline-offset-4"
                >
                  Open Generated Draft in Studio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-white">
                Something needs your attention
              </p>
              <p className="mt-1">{error}</p>
            </div>
            {creatorId && (
              <button
                type="button"
                onClick={() => void loadRecommendations(creatorId, 0)}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <section className="y2k-chrome-card overflow-hidden rounded-2xl">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Action Queue
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Inspect the reasoning and supporting evidence before acting.
              </p>
            </div>

            <label className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setOffset(0);
                  setStatusFilter(
                    event.target.value as RecommendationStatus | "all",
                  );
                }}
                className="min-h-10 rounded-xl border border-input bg-black/60 px-3 text-xs font-semibold text-white outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8">
              <LoaderCircle className="h-7 w-7 animate-spin text-blue-400" />
              <p className="text-sm text-muted-foreground">
                Loading your recommendations...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                <Lightbulb className="h-7 w-7" />
              </div>

              <h3 className="text-lg font-bold text-white">
                {statusFilter === "all"
                  ? "Your next Instagram growth steps start here"
                  : "No recommendations in this status"}
              </h3>

              <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                {statusFilter === "all"
                  ? "Generate personalized recommendations grounded in your profile, strategy, drafts, and Instagram metrics."
                  : "Try another status filter or generate fresh recommendations."}
              </p>

              {statusFilter === "all" && (
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={!creatorId || generating}
                  className="y2k-cobalt-button mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  {generating ? "Generating..." : "Generate recommendations"}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {items.map((item) => (
                <article key={item.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-semibold ${priorityStyles[item.priority]}`}
                        >
                          {formatLabel(item.priority)} priority
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-slate-300">
                          {formatLabel(item.category)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-semibold ${statusStyles[item.status]}`}
                        >
                          {formatLabel(item.status)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold leading-6 text-white sm:text-lg">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(item.created_at)}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                      <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                        <Target className="h-4 w-4" />
                        Strategic Reasoning
                      </h4>
                      <p className="text-xs leading-6 text-slate-300">
                        {item.reasoning}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                      <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#CCFF00]">
                        <Lightbulb className="h-4 w-4" />
                        Supporting Evidence
                      </h4>

                      {item.evidence.length > 0 ? (
                        <ul className="space-y-2">
                          {item.evidence.map((evidence, index) => (
                            <li
                              key={`${item.id}-evidence-${index}`}
                              className="flex items-start gap-2 text-xs leading-5 text-slate-300"
                            >
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CCFF00]" />
                              <span>{evidence}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs leading-6 text-muted-foreground">
                          No specific metric evidence attached; evaluate as a strategic hypothesis.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
                    <p className="font-mono text-xs text-muted-foreground">
                      Updated {formatDate(item.updated_at)}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={generatingDraftId !== null || loading}
                        onClick={() => void handleGenerateDraft(item)}
                        className="y2k-cobalt-button inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {generatingDraftId === item.id ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FilePlus2 className="h-3.5 w-3.5" />
                        )}
                        {generatingDraftId === item.id
                          ? "Generating draft..."
                          : "Generate Reel Draft"}
                      </button>

                      {item.status !== "in_progress" &&
                        item.status !== "completed" &&
                        item.status !== "dismissed" && (
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() =>
                              void handleStatusChange(item, "in_progress")
                            }
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Start Action
                          </button>
                        )}

                      {item.status !== "completed" && (
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() =>
                            void handleStatusChange(item, "completed")
                          }
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {updatingId === item.id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Complete
                        </button>
                      )}

                      {item.status !== "dismissed" &&
                        item.status !== "completed" && (
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() =>
                              void handleStatusChange(item, "dismissed")
                            }
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Dismiss
                          </button>
                        )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-white/10 bg-black/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="font-mono text-xs text-muted-foreground">
              Showing {startItem}–{endItem} of {total}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || offset === 0}
                onClick={() => {
                  if (creatorId) {
                    void loadRecommendations(
                      creatorId,
                      Math.max(0, offset - PAGE_SIZE),
                    );
                  }
                }}
                className="y2k-chrome-pill inline-flex min-h-9 items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                type="button"
                disabled={loading || offset + items.length >= total}
                onClick={() => {
                  if (creatorId) {
                    void loadRecommendations(creatorId, offset + PAGE_SIZE);
                  }
                }}
                className="y2k-chrome-pill inline-flex min-h-9 items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Lightbulb;
}) {
  return (
    <div className="y2k-chrome-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 font-mono text-3xl font-extrabold tracking-tight tabular-nums text-white">
            {value}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-[#CCFF00]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
