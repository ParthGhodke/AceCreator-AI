"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Eye,
  Heart,
  Lightbulb,
  ListChecks,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { API_BASE_URL, getAuthHeaders, getLatestCreator } from "@/lib/api";

type Insights = {
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saved: number | null;
  total_interactions: number | null;
};

type InstagramPost = {
  media_id: string;
  caption: string | null;
  media_type: string | null;
  permalink: string | null;
  published_at: string | null;
  insights: Insights;
  insights_available: boolean;
};

type AnalyticsResponse = {
  posts: InstagramPost[];
  posts_retrieved: number;
  posts_with_insights: number;
  posts_with_insight_errors: number;
};

type PerformanceFinding = {
  title: string;
  observation: string;
  evidence: string;
  implication: string;
  confidence: "high" | "medium" | "low";
};

type ContentExperiment = {
  idea: string;
  rationale: string;
  hook: string;
  call_to_action: string;
  success_metric:
    | "views"
    | "reach"
    | "engagement_rate"
    | "comments"
    | "shares"
    | "saves";
};

type WeeklyAction = {
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

type AIAnalysisResponse = {
  executive_summary: string;
  findings: PerformanceFinding[];
  content_experiments: ContentExperiment[];
  weekly_actions: WeeklyAction[];
  limitations: string[];
};

type PostingTimeRecommendation = {
  rank: number;
  weekday: string;
  time_window: string;
  average_score: number;
  metric: string;
  posts_analyzed: number;
};

type PostingTimeResponse = {
  timezone: string;
  metric_used: string;
  metric_label: string;
  minimum_posts_per_slot: number;
  posts_received: number;
  posts_with_valid_timestamps: number;
  posts_analyzed: number;
  invalid_timestamps: number;
  eligible_slots_found: number;
  recommendations: PostingTimeRecommendation[];
  message: string;
  limitations: string[];
};

function humanizeMetric(metric: ContentExperiment["success_metric"]) {
  return metric.replaceAll("_", " ");
}

function priorityStyles(priority: WeeklyAction["priority"]) {
  switch (priority) {
    case "high":
      return "border-rose-500/30 bg-rose-500/15 text-rose-300";
    case "medium":
      return "border-amber-500/30 bg-amber-500/15 text-amber-300";
    default:
      return "border-white/15 bg-white/[0.05] text-slate-300";
  }
}

function confidenceStyles(confidence: PerformanceFinding["confidence"]) {
  switch (confidence) {
    case "high":
      return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    case "medium":
      return "border border-amber-500/30 bg-amber-500/15 text-amber-300";
    default:
      return "border border-white/15 bg-white/[0.05] text-slate-300";
  }
}

const numberFormatter = new Intl.NumberFormat("en-IN");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCaption(post: InstagramPost) {
  const caption = post.caption?.trim();
  return caption || "No caption provided";
}

function getShortCaption(post: InstagramPost) {
  const firstLine = getCaption(post)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#"));

  if (!firstLine) return "Instagram post";

  return firstLine.length > 65 ? `${firstLine.slice(0, 65)}...` : firstLine;
}

function sumMetric(posts: InstagramPost[], metric: keyof Insights): number {
  return posts.reduce((total, post) => {
    const value = post.insights?.[metric];
    return total + (typeof value === "number" ? value : 0);
  }, 0);
}

function calculateEngagementRate(post: InstagramPost) {
  const reach = post.insights?.reach;
  const interactions = post.insights?.total_interactions;

  if (
    typeof reach !== "number" ||
    reach <= 0 ||
    typeof interactions !== "number"
  ) {
    return null;
  }

  return (interactions / reach) * 100;
}

function formatRate(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(2)}%`;
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
  icon: React.ElementType;
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
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#CCFF00]">
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [creatorName, setCreatorName] = useState<string | undefined>();
  const [instagramHandle, setInstagramHandle] = useState<string | undefined>();

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRefreshCount, setAiRefreshCount] = useState(0);

  const [postingTimes, setPostingTimes] =
    useState<PostingTimeResponse | null>(null);
  const [postingTimesLoading, setPostingTimesLoading] = useState(true);
  const [postingTimesError, setPostingTimesError] = useState<string | null>(
    null,
  );
  const [postingTimesRefreshCount, setPostingTimesRefreshCount] = useState(0);

  useEffect(() => {
    getLatestCreator()
      .then((creator) => {
        setCreatorName(creator.creatorName);
        setInstagramHandle(creator.instagram);
      })
      .catch(() => {});
  }, []);

  const loadAIAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/instagram/ai-analysis?limit=10`,
        { credentials: "include", headers: getAuthHeaders(), cache: "no-store" },
      );

      if (!response.ok) {
        let message = "Unable to generate AI performance insights.";

        try {
          const body = await response.json();
          if (typeof body.detail === "string") message = body.detail;
        } catch {
          // Keep the fallback message for non-JSON responses.
        }

        throw new Error(message);
      }

      const result: AIAnalysisResponse = await response.json();

      if (
        typeof result.executive_summary !== "string" ||
        !Array.isArray(result.findings) ||
        !Array.isArray(result.content_experiments) ||
        !Array.isArray(result.weekly_actions) ||
        !Array.isArray(result.limitations)
      ) {
        throw new Error("The AI analysis API returned an unexpected response.");
      }

      setAiAnalysis(result);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating AI insights.",
      );
    } finally {
      setAiLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/instagram?limit=10`,
        { credentials: "include", headers: getAuthHeaders(), cache: "no-store" },
      );

      if (!response.ok) {
        let message = "Unable to load Instagram analytics.";

        try {
          const body = await response.json();
          if (typeof body.detail === "string") message = body.detail;
        } catch {
          // Keep the fallback message for non-JSON responses.
        }

        throw new Error(message);
      }

      const result: AnalyticsResponse = await response.json();

      if (!Array.isArray(result.posts)) {
        throw new Error("The analytics API returned an unexpected response.");
      }

      setAnalytics(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading analytics.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPostingTimes = useCallback(async () => {
    setPostingTimesLoading(true);
    setPostingTimesError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/instagram/posting-times?limit=10&timezone_name=Asia%2FKolkata`,
        { credentials: "include", headers: getAuthHeaders(), cache: "no-store" },
      );

      if (!response.ok) {
        let message = "Unable to load posting-time recommendations.";

        try {
          const body = await response.json();
          if (typeof body.detail === "string") message = body.detail;
        } catch {
          // Keep the fallback message for non-JSON responses.
        }

        throw new Error(message);
      }

      const result: PostingTimeResponse = await response.json();

      if (!Array.isArray(result.recommendations)) {
        throw new Error(
          "The posting-time API returned an unexpected response.",
        );
      }

      setPostingTimes(result);
    } catch (err) {
      setPostingTimesError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading posting-time recommendations.",
      );
    } finally {
      setPostingTimesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, refreshCount]);

  useEffect(() => {
    void loadAIAnalysis();
  }, [loadAIAnalysis, aiRefreshCount]);

  useEffect(() => {
    void loadPostingTimes();
  }, [loadPostingTimes, postingTimesRefreshCount]);

  const posts = analytics?.posts ?? [];

  const metrics = useMemo(() => {
    const views = sumMetric(posts, "views");
    const reach = sumMetric(posts, "reach");
    const interactions = sumMetric(posts, "total_interactions");

    const rates = posts
      .map(calculateEngagementRate)
      .filter((rate): rate is number => rate !== null);

    const averageRate =
      rates.length > 0
        ? rates.reduce((total, rate) => total + rate, 0) / rates.length
        : null;

    const overallRate = reach > 0 ? (interactions / reach) * 100 : null;

    return {
      views,
      reach,
      interactions,
      likes: sumMetric(posts, "likes"),
      comments: sumMetric(posts, "comments"),
      shares: sumMetric(posts, "shares"),
      saves: sumMetric(posts, "saved"),
      averageRate,
      overallRate,
      postsWithInsights: posts.filter((post) => post.insights_available).length,
    };
  }, [posts]);

  const chartData = useMemo(() => {
    return [...posts].reverse().map((post, index) => ({
      name: `Post ${index + 1}`,
      caption: getShortCaption(post),
      views: post.insights?.views ?? 0,
      permalink: post.permalink,
    }));
  }, [posts]);

  const topPosts = useMemo(() => {
    return [...posts]
      .filter((post) => typeof post.insights?.views === "number")
      .sort((a, b) => (b.insights.views ?? 0) - (a.insights.views ?? 0))
      .slice(0, 3);
  }, [posts]);

  return (
    <AppShell creatorName={creatorName} instagramHandle={instagramHandle}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="y2k-iridescent-border flex flex-col justify-between gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <div className="y2k-chrome-pill mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-slate-200">
              <BarChart3 size={14} className="text-[#CCFF00]" />
              <span>INSTAGRAM GRAPH API TELEMETRY</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Instagram Analytics &amp; Insights
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real post metrics, historical posting-window rankings, and AI performance analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="y2k-chrome-pill inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-200">
              <span
                className={`h-2 w-2 rounded-full ${
                  error
                    ? "bg-rose-500"
                    : loading
                      ? "bg-amber-400"
                      : "bg-[#CCFF00]"
                }`}
              />
              {error ? "API Issue" : loading ? "Syncing" : "Graph API Connected"}
            </span>

            <button
              type="button"
              onClick={() => setRefreshCount((count) => count + 1)}
              disabled={loading}
              className="y2k-cobalt-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh telemetry
            </button>
          </div>
        </header>

        {error && (
          <section
            role="alert"
            className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 shrink-0 text-rose-400"
                size={21}
              />
              <div className="flex-1">
                <h2 className="font-bold text-white">
                  Could not load Instagram analytics
                </h2>
                <p className="mt-1 text-sm text-rose-200">{error}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ensure FastAPI is running and INSTAGRAM_ACCESS_TOKEN is valid in .env.
                </p>
                <button
                  type="button"
                  onClick={() => setRefreshCount((count) => count + 1)}
                  className="y2k-chrome-pill mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                >
                  <RefreshCw size={14} />
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        {loading && !analytics ? (
          <section
            aria-label="Loading analytics"
            className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </section>
        ) : !error && analytics && posts.length === 0 ? (
          <section className="y2k-chrome-card mt-6 rounded-2xl p-10 text-center">
            <Video className="mx-auto text-muted-foreground" size={32} />
            <h2 className="mt-4 text-lg font-bold text-white">
              No Instagram posts found
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              When your connected Instagram account has accessible posts, their
              metrics will appear here.
            </p>
          </section>
        ) : analytics ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Views"
                value={formatNumber(metrics.views)}
                description="Sum of views across retrieved posts"
                icon={Eye}
              />
              <MetricCard
                label="Total Reach"
                value={formatNumber(metrics.reach)}
                description="Summed post reach (may overlap across posts)"
                icon={Activity}
              />
              <MetricCard
                label="Total Interactions"
                value={formatNumber(metrics.interactions)}
                description="Likes, comments, shares, and saves"
                icon={Heart}
              />
              <MetricCard
                label="Avg Engagement Rate"
                value={formatRate(metrics.averageRate)}
                description="Mean of per-post interactions / reach"
                icon={TrendingUp}
              />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="y2k-chrome-card rounded-2xl p-5 sm:p-6 xl:col-span-2">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Views by Instagram Post
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Compare reported views across your 10 most recent posts
                    </p>
                  </div>
                  <span className="y2k-acid-badge inline-flex items-center gap-2 self-start rounded-full px-3 py-1 font-mono text-xs font-semibold">
                    <span className="h-2 w-2 rounded-full bg-[#CCFF00]" />
                    Views
                  </span>
                </div>

                <div className="mt-6 h-[300px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -16, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient
                            id="y2kBarGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#CCFF00" />
                            <stop offset="55%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.08)"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#94A3B8" }}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94A3B8" }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const item = payload[0]
                              .payload as (typeof chartData)[number];

                            return (
                              <div className="y2k-glass-panel max-w-64 rounded-xl p-3 shadow-2xl">
                                <p className="font-mono text-xs text-[#CCFF00]">
                                  {item.name}
                                </p>
                                <p className="mt-1 font-mono text-sm font-bold text-white">
                                  {formatNumber(item.views)} views
                                </p>
                                <p className="mt-1 text-xs text-slate-300">
                                  {item.caption}
                                </p>
                                {item.permalink && (
                                  <a
                                    href={item.permalink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-400 underline underline-offset-4"
                                  >
                                    Open on Instagram <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey="views"
                          fill="url(#y2kBarGradient)"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={42}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No chart data available.
                    </div>
                  )}
                </div>
              </div>

              <div className="y2k-chrome-card rounded-2xl p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Interaction Breakdown
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Distribution of likes, comments, shares, and saves
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  {[
                    {
                      label: "Likes",
                      value: metrics.likes,
                      icon: Heart,
                      color: "bg-pink-500",
                    },
                    {
                      label: "Comments",
                      value: metrics.comments,
                      icon: MessageCircle,
                      color: "bg-blue-500",
                    },
                    {
                      label: "Shares",
                      value: metrics.shares,
                      icon: Send,
                      color: "bg-purple-500",
                    },
                    {
                      label: "Saves",
                      value: metrics.saves,
                      icon: Bookmark,
                      color: "bg-[#CCFF00]",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const percentage =
                      metrics.interactions > 0
                        ? Math.min(
                            (item.value / metrics.interactions) * 100,
                            100,
                          )
                        : 0;

                    return (
                      <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                            <Icon size={15} />
                            {item.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            {formatNumber(item.value)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-7 rounded-xl border border-white/10 bg-black/40 p-4">
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">
                    Overall Interactions / Summed Reach
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#CCFF00]">
                    {formatRate(metrics.overallRate)}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Aggregate ratio across retrieved posts.
                  </p>
                </div>
              </div>
            </section>

            {/* Top-Performing Posts */}
            <section className="y2k-chrome-card mt-6 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Top-Performing Instagram Posts
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ranked by reported views (not age-adjusted)
                  </p>
                </div>
                <span className="y2k-acid-badge inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-xs font-semibold">
                  <CheckCircle2 size={14} />
                  LIVE INSTAGRAM DATA
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {topPosts.map((post, index) => {
                  const engagementRate = calculateEngagementRate(post);

                  return (
                    <div
                      key={post.media_id}
                      className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/30 p-4 transition hover:border-blue-500/40 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-3 sm:w-10">
                        <span className="y2k-acid-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold">
                          #{index + 1}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold text-white">
                          {getShortCaption(post)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={13} />
                            {formatDate(post.published_at)}
                          </span>
                          <span>{post.media_type ?? "Media"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-5 gap-y-2 font-mono text-xs sm:min-w-48">
                        <div>
                          <p className="text-muted-foreground">Views</p>
                          <p className="mt-0.5 font-bold text-white">
                            {formatNumber(post.insights.views ?? 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reach</p>
                          <p className="mt-0.5 font-bold text-white">
                            {post.insights.reach === null
                              ? "N/A"
                              : formatNumber(post.insights.reach)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Likes</p>
                          <p className="mt-0.5 text-slate-200">
                            {post.insights.likes === null
                              ? "N/A"
                              : formatNumber(post.insights.likes)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Engagement</p>
                          <p className="mt-0.5 text-[#CCFF00]">
                            {formatRate(engagementRate)}
                          </p>
                        </div>
                      </div>

                      {post.permalink && (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open Instagram post"
                          className="y2k-chrome-pill inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-white"
                        >
                          View <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Posting-time recommendations */}
            <section
              aria-labelledby="posting-times-heading"
              className="y2k-chrome-card mt-6 overflow-hidden rounded-2xl"
            >
              <div className="border-b border-white/10 bg-black/40 p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-[#CCFF00]">
                      <CalendarDays size={22} />
                    </div>
                    <div>
                      <h2
                        id="posting-times-heading"
                        className="text-lg font-bold text-white"
                      >
                        Best Times to Post on Instagram
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Historical posting windows ranked by your Instagram performance ({postingTimes?.timezone ?? "Asia/Kolkata"}).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPostingTimesRefreshCount((count) => count + 1)
                    }
                    disabled={postingTimesLoading}
                    className="y2k-chrome-pill inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-slate-200 disabled:opacity-60"
                  >
                    <RefreshCw
                      size={14}
                      className={postingTimesLoading ? "animate-spin" : ""}
                    />
                    {postingTimesLoading ? "Analyzing..." : "Refresh slots"}
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {postingTimesLoading && !postingTimes ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-20 animate-pulse rounded-xl bg-white/5"
                      />
                    ))}
                  </div>
                ) : postingTimes ? (
                  <div className="space-y-5">
                    {postingTimes.recommendations.length > 0 ? (
                      <div className="space-y-3">
                        {postingTimes.recommendations.map((recommendation) => (
                          <article
                            key={`${recommendation.weekday}-${recommendation.time_window}`}
                            className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center"
                          >
                            <div className="y2k-acid-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold">
                              #{recommendation.rank}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-white">
                                {recommendation.weekday} ·{" "}
                                {recommendation.time_window}
                              </h3>
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                {recommendation.posts_analyzed} historical posts analyzed
                              </p>
                            </div>
                            <div className="sm:min-w-36 sm:text-right">
                              <p className="font-mono text-xl font-bold text-[#CCFF00]">
                                {recommendation.metric === "engagement_rate"
                                  ? `${recommendation.average_score.toFixed(2)}%`
                                  : recommendation.average_score.toFixed(2)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {recommendation.metric === "engagement_rate"
                                  ? "Avg engagement rate"
                                  : "Avg interactions"}
                              </p>
                            </div>
                            <Link
                              href={`/studio?postingDay=${encodeURIComponent(
                                recommendation.weekday,
                              )}&postingWindow=${encodeURIComponent(
                                recommendation.time_window,
                              )}`}
                              className="y2k-cobalt-button inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold"
                            >
                              Draft for slot <ArrowRight size={14} />
                            </Link>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/15 p-6 text-center">
                        <p className="text-sm text-slate-300">
                          {postingTimes.message}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            {/* AI Performance Insights */}
            <section
              aria-labelledby="ai-insights-heading"
              className="y2k-chrome-card mt-6 overflow-hidden rounded-2xl"
            >
              <div className="border-b border-white/10 bg-black/40 p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          id="ai-insights-heading"
                          className="text-lg font-bold text-white"
                        >
                          AI Performance Insights
                        </h2>
                        <span className="y2k-acid-badge rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold">
                          GROQ ANALYST
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Evidence-led findings and experiments grounded in your retrieved Instagram posts.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAiRefreshCount((count) => count + 1)}
                    disabled={aiLoading}
                    className="y2k-chrome-pill inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-slate-200 disabled:opacity-60"
                  >
                    <RefreshCw
                      size={14}
                      className={aiLoading ? "animate-spin" : ""}
                    />
                    {aiLoading ? "Analyzing..." : "Refresh AI insights"}
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {aiLoading && !aiAnalysis ? (
                  <div className="space-y-4">
                    <div className="h-20 animate-pulse rounded-xl bg-white/5" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="h-36 animate-pulse rounded-xl bg-white/5" />
                      <div className="h-36 animate-pulse rounded-xl bg-white/5" />
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-7">
                    <div className="rounded-xl border border-blue-500/30 bg-blue-600/10 p-4 sm:p-5">
                      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#CCFF00]">
                        Executive Summary
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-200">
                        {aiAnalysis.executive_summary}
                      </p>
                    </div>

                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <Target size={18} className="text-blue-400" />
                        <h3 className="font-bold text-white">Key Findings</h3>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        {aiAnalysis.findings.map((finding, index) => (
                          <article
                            key={`${finding.title}-${index}`}
                            className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {finding.title}
                              </h4>
                              <span
                                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold capitalize ${confidenceStyles(finding.confidence)}`}
                              >
                                {finding.confidence} confidence
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              {finding.observation}
                            </p>
                            <div className="mt-3 rounded-lg border border-white/10 bg-black/50 p-3">
                              <p className="font-mono text-[10px] uppercase tracking-wide text-[#CCFF00]">
                                Evidence
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-200">
                                {finding.evidence}
                              </p>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-muted-foreground">
                              <span className="font-semibold text-white">
                                Implication:{" "}
                              </span>
                              {finding.implication}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <Lightbulb size={18} className="text-[#CCFF00]" />
                        <h3 className="font-bold text-white">
                          Content Experiments
                        </h3>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {aiAnalysis.content_experiments.map(
                          (experiment, index) => (
                            <article
                              key={`${experiment.idea}-${index}`}
                              className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5"
                            >
                              <p className="font-mono text-xs text-blue-400">
                                EXPERIMENT {String(index + 1).padStart(2, "0")}
                              </p>
                              <h4 className="mt-1.5 font-bold text-white">
                                {experiment.idea}
                              </h4>
                              <p className="mt-2 text-xs leading-6 text-slate-300">
                                {experiment.rationale}
                              </p>
                              <div className="mt-4 rounded-lg border border-white/10 bg-black/50 p-3">
                                <p className="font-mono text-[10px] text-[#CCFF00]">
                                  SUGGESTED HOOK
                                </p>
                                <p className="mt-1 text-xs font-semibold text-white">
                                  &ldquo;{experiment.hook}&rdquo;
                                </p>
                              </div>
                              <div className="mt-3 grid gap-3 font-mono text-xs sm:grid-cols-2">
                                <div>
                                  <p className="text-muted-foreground">CTA</p>
                                  <p className="mt-0.5 text-slate-200">
                                    {experiment.call_to_action}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Success Metric
                                  </p>
                                  <p className="mt-0.5 capitalize text-[#CCFF00]">
                                    {humanizeMetric(experiment.success_metric)}
                                  </p>
                                </div>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <ListChecks size={18} className="text-emerald-400" />
                        <h3 className="font-bold text-white">
                          Recommended Weekly Actions
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {aiAnalysis.weekly_actions.map((action, index) => (
                          <article
                            key={`${action.action}-${index}`}
                            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-start"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] font-mono text-xs font-bold text-[#CCFF00]">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-white">
                                {action.action}
                              </h4>
                              <p className="mt-1 text-xs leading-6 text-slate-300">
                                {action.reason}
                              </p>
                            </div>
                            <span
                              className={`self-start rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold capitalize ${priorityStyles(action.priority)}`}
                            >
                              {action.priority} priority
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
