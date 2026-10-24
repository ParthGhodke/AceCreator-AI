"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { API_BASE_URL, getAuthHeaders, getLatestCreator } from "@/lib/api";

type Platform = "Instagram";
type DraftStatus = "draft" | "ready" | "scheduled" | "published";
type CalendarStatus = "Draft" | "Ready" | "Scheduled" | "Published";

type ContentDraft = {
  id: string;
  title: string;
  topic: string;
  content_format: string;
  platform: Platform;
  status: DraftStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type CalendarEntry = ContentDraft & {
  calendarStatus: CalendarStatus;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusStyles: Record<CalendarStatus, string> = {
  Draft: "border-white/15 bg-white/[0.05] text-slate-300",
  Ready: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  Scheduled: "border-purple-500/40 bg-purple-500/15 text-purple-300",
  Published: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
};

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));

  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth();

  const startText = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const endText = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startText} – ${endText}`;
}

function formatTime(value: string | null) {
  if (!value) return "Time not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString();
}

function getCalendarStatus(draft: ContentDraft): CalendarStatus {
  if (draft.status === "published" || draft.published_at) {
    return "Published";
  }

  if (draft.scheduled_at) {
    return "Scheduled";
  }

  if (draft.status === "ready") {
    return "Ready";
  }

  return "Draft";
}

export default function CalendarPage() {
  const [creatorName, setCreatorName] = useState<string | undefined>();
  const [instagramHandle, setInstagramHandle] = useState<string | undefined>();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const [formatFilter, setFormatFilter] = useState("All formats");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/content-drafts?limit=100`,
        {
          credentials: "include", headers: getAuthHeaders(), cache: "no-store",
        },
      );

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          typeof data === "object" &&
          data !== null &&
          "detail" in data &&
          typeof data.detail === "string"
            ? data.detail
            : `Could not load content drafts (HTTP ${response.status}).`;

        throw new Error(detail);
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "The content drafts API returned an unexpected response.",
        );
      }

      setDrafts(data as ContentDraft[]);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Check that FastAPI is running."
          : err instanceof Error
            ? err.message
            : "Something went wrong while loading content.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
    getLatestCreator()
      .then((creator) => {
        setCreatorName(creator.creatorName);
        setInstagramHandle(creator.instagram);
      })
      .catch(() => {});
  }, [loadDrafts]);

  const days = useMemo(
    () =>
      weekdays.map((label, index) => ({
        label,
        date: addDays(weekStart, index),
      })),
    [weekStart],
  );

  const entries = useMemo<CalendarEntry[]>(() => {
    return drafts
      .map((draft) => ({
        ...draft,
        calendarStatus: getCalendarStatus(draft),
      }))
      .filter((draft) => {
        const formatMatches =
          formatFilter === "All formats" ||
          draft.content_format === formatFilter;

        const statusMatches =
          statusFilter === "All statuses" ||
          draft.calendarStatus === statusFilter;

        return formatMatches && statusMatches;
      });
  }, [drafts, formatFilter, statusFilter]);

  const scheduledEntries = entries.filter(
    (item) => item.scheduled_at && item.calendarStatus === "Scheduled",
  );

  const stats = [
    {
      label: "Total items",
      value: entries.length,
      description: "Saved Instagram drafts",
      icon: CalendarDays,
    },
    {
      label: "Scheduled",
      value: entries.filter((item) => item.calendarStatus === "Scheduled")
        .length,
      description: "Assigned a publishing slot",
      icon: Clock3,
    },
    {
      label: "Drafts",
      value: entries.filter((item) => item.calendarStatus === "Draft").length,
      description: "In progress",
      icon: FileText,
    },
    {
      label: "Ready",
      value: entries.filter((item) => item.calendarStatus === "Ready").length,
      description: "Prepared to post",
      icon: FileText,
    },
    {
      label: "Published",
      value: entries.filter((item) => item.calendarStatus === "Published")
        .length,
      description: "Recorded as published",
      icon: Sparkles,
    },
  ];

  return (
    <AppShell creatorName={creatorName} instagramHandle={instagramHandle}>
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="y2k-iridescent-border flex flex-col justify-between gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <div className="y2k-chrome-pill mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-slate-200">
              <CalendarDays className="h-3.5 w-3.5 text-[#CCFF00]" />
              <span>INSTAGRAM PUBLISHING CALENDAR</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Content Calendar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visualize your weekly Instagram Reels, Carousels, Stories, and Static Posts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void loadDrafts()}
              disabled={loading}
              className="y2k-chrome-pill inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <Link
              href="/studio"
              className="y2k-cobalt-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              Create Draft
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="y2k-chrome-card rounded-2xl p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <Icon className="h-4 w-4 text-[#CCFF00]" />
                </div>

                <p className="mt-3 font-mono text-3xl font-extrabold tabular-nums text-white">
                  {stat.value}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </section>

        <section className="y2k-chrome-card rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Weekly Publishing Grid
              </h2>
              <p className="mt-1 font-mono text-xs text-[#CCFF00]">
                {formatRange(weekStart, addDays(weekStart, 6))}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="y2k-chrome-pill rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200"
              >
                This Week
              </button>

              <div className="flex items-center rounded-xl border border-white/15 bg-black/40">
                <button
                  type="button"
                  aria-label="Previous week"
                  onClick={() => setWeekStart((date) => addDays(date, -7))}
                  className="p-2.5 text-slate-200 transition hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="h-5 border-l border-white/10" />

                <button
                  type="button"
                  aria-label="Next week"
                  onClick={() => setWeekStart((date) => addDays(date, 7))}
                  className="p-2.5 text-slate-200 transition hover:bg-white/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <select
                aria-label="Filter by Instagram format"
                value={formatFilter}
                onChange={(event) => setFormatFilter(event.target.value)}
                className="rounded-xl border border-input bg-black/60 px-3 py-2 text-xs text-white"
              >
                <option>All formats</option>
                <option>Reel</option>
                <option>Carousel</option>
                <option>Story</option>
                <option>Static Post</option>
              </select>

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-input bg-black/60 px-3 py-2 text-xs text-white"
              >
                <option>All statuses</option>
                <option>Draft</option>
                <option>Ready</option>
                <option>Scheduled</option>
                <option>Published</option>
              </select>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 sm:flex-row sm:items-center sm:justify-between"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadDrafts()}
                className="shrink-0 rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs font-semibold hover:bg-rose-500/20"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
              <p className="text-sm">Loading your saved content...</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {days.map(({ label, date }) => {
                const isToday = dateKey(date) === dateKey(new Date());

                const dayEntries = scheduledEntries.filter((item) => {
                  if (!item.scheduled_at) return false;

                  const scheduledDate = new Date(item.scheduled_at);

                  return (
                    !Number.isNaN(scheduledDate.getTime()) &&
                    dateKey(scheduledDate) === dateKey(date)
                  );
                });

                return (
                  <div
                    key={dateKey(date)}
                    className={`min-h-64 rounded-2xl border p-3.5 ${
                      isToday
                        ? "border-blue-500/50 bg-blue-600/10"
                        : "border-white/10 bg-black/30"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold uppercase text-slate-300">
                        {label}
                      </span>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${
                          isToday
                            ? "bg-[#CCFF00] font-bold text-black"
                            : "text-muted-foreground"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {dayEntries.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-[#0E1017] p-3"
                        >
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#CCFF00]">
                              <Camera className="h-3 w-3" />
                              {item.content_format}
                            </span>
                          </div>

                          <h3 className="mt-2 text-xs font-bold leading-snug text-white">
                            {item.title}
                          </h3>

                          <div className="mt-2.5 flex items-center gap-1 font-mono text-[11px] text-slate-300">
                            <Clock3 className="h-3 w-3 text-blue-400" />
                            {formatTime(item.scheduled_at)}
                          </div>

                          <span
                            className={`mt-2.5 inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${statusStyles[item.calendarStatus]}`}
                          >
                            {item.calendarStatus}
                          </span>

                          <Link
                            href={`/studio?draftId=${encodeURIComponent(item.id)}`}
                            className="mt-2.5 block text-[11px] font-semibold text-blue-400 hover:underline"
                          >
                            Open in Studio →
                          </Link>
                        </article>
                      ))}

                      {dayEntries.length === 0 && (
                        <div className="rounded-xl border border-dashed border-white/10 px-2 py-6 text-center">
                          <p className="text-xs text-muted-foreground">
                            Open slot
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="y2k-chrome-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-white">
            All Saved Instagram Drafts Overview
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Click any item to edit or schedule it in Content Studio.
          </p>

          {entries.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No content is available for the selected filters.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {entries.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Instagram · {item.content_format}
                    </p>

                    {item.calendarStatus === "Published" &&
                      item.published_at && (
                        <p className="mt-1 font-mono text-xs text-emerald-300">
                          Publication recorded:{" "}
                          {formatDateTime(item.published_at)}
                        </p>
                      )}

                    {item.calendarStatus === "Scheduled" &&
                      item.scheduled_at && (
                        <p className="mt-1 font-mono text-xs text-purple-300">
                          Scheduled for: {formatDateTime(item.scheduled_at)}
                        </p>
                      )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1 font-mono text-xs font-semibold ${statusStyles[item.calendarStatus]}`}
                    >
                      {item.calendarStatus}
                    </span>

                    <Link
                      href={`/studio?draftId=${encodeURIComponent(item.id)}`}
                      className="y2k-chrome-pill rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                    >
                      Edit
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}