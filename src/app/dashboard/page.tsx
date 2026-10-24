"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  Camera,
  ChevronRight,
  Compass,
  Eye,
  FileText,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WandSparkles,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  API_BASE_URL,
  getContentDrafts,
  getCreatorStrategy,
  getLatestCreator,
  type CreatorStrategy,
  type GeneratedContentDraft,
} from "@/lib/api";
import {
  getCreatorProfile,
  type CreatorProfile,
} from "@/lib/creator-profile";

type InstagramOverview = {
  postsRetrieved: number;
  totalViews: number;
  avgEngagementRate: string;
};

const numberFormatter = new Intl.NumberFormat("en-IN");

export default function DashboardPage() {
  const [profile, setProfile] = useState<(CreatorProfile & { id?: string }) | null>(
    null,
  );
  const [strategy, setStrategy] = useState<CreatorStrategy | null>(null);
  const [drafts, setDrafts] = useState<GeneratedContentDraft[]>([]);
  const [igOverview, setIgOverview] = useState<InstagramOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);

      let resolvedCreatorId: string | null = null;

      try {
        const creatorProfile = await getLatestCreator();
        if (!cancelled) {
          setProfile(creatorProfile);
          resolvedCreatorId = creatorProfile.id;
          const { id: _id, ...profileWithoutId } = creatorProfile;
          localStorage.setItem(
            "acecreator_creator_profile",
            JSON.stringify(profileWithoutId),
          );
        }
      } catch {
        const localProfile = getCreatorProfile();
        if (!cancelled && localProfile) {
          setProfile(localProfile);
        }
      }

      // Load saved drafts
      try {
        const savedDrafts = await getContentDrafts({ limit: 100 });
        if (!cancelled) {
          setDrafts(savedDrafts);
        }
      } catch {
        // Ignore if no drafts or backend unavailable
      }

      // Load latest saved strategy if creator exists
      if (resolvedCreatorId) {
        try {
          const savedStrategy = await getCreatorStrategy(resolvedCreatorId);
          if (!cancelled) {
            setStrategy(savedStrategy);
          }
        } catch {
          // 404 is expected if the creator hasn't generated a strategy yet
        }
      }

      // Optionally load live Instagram summary if configured
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/analytics/instagram/summary?limit=10`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = await res.json();
          const summary = data?.summary;
          if (!cancelled && summary) {
            setIgOverview({
              postsRetrieved: summary.posts_retrieved ?? 0,
              totalViews: summary.total_views ?? 0,
              avgEngagementRate:
                typeof summary.average_post_engagement_rate_percent === "number"
                  ? `${summary.average_post_engagement_rate_percent.toFixed(2)}%`
                  : "N/A",
            });
          }
        }
      } catch {
        // Instagram analytics optional on dashboard
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const creatorName = profile?.creatorName || "Creator";

  const nextScheduledDraft = useMemo(() => {
    const now = Date.now();
    const upcoming = drafts
      .filter(
        (d) =>
          d.scheduled_at &&
          d.status !== "published" &&
          !d.published_at &&
          new Date(d.scheduled_at).getTime() >= now - 86_400_000,
      )
      .sort(
        (a, b) =>
          new Date(a.scheduled_at!).getTime() -
          new Date(b.scheduled_at!).getTime(),
      );

    return upcoming[0] ?? null;
  }, [drafts]);

  const formattedNextPost = useMemo(() => {
    if (!nextScheduledDraft?.scheduled_at) return "None scheduled";
    const date = new Date(nextScheduledDraft.scheduled_at);
    if (Number.isNaN(date.getTime())) return "None scheduled";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  }, [nextScheduledDraft]);

  return (
    <AppShell
      creatorName={profile?.creatorName}
      instagramHandle={profile?.instagram}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Welcome Banner */}
        <section className="y2k-iridescent-border mb-8 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-[#CCFF00]" />
                <span>INSTAGRAM CREATOR COMMAND CENTER</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Welcome back,{" "}
                <span className="y2k-iridescent-text">{creatorName}</span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Orchestrate your Instagram content strategy, draft high-retention
                Reels &amp; Carousels, schedule posts, and review live Graph API
                performance from one workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/studio"
                className="y2k-cobalt-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition"
              >
                <WandSparkles className="h-4 w-4" />
                Create Instagram Draft
              </Link>

              <Link
                href="/onboarding"
                className="y2k-chrome-pill inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </section>

        {/* Live KPI Bento Cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Instagram Views (Last 10)"
            value={
              igOverview
                ? numberFormatter.format(igOverview.totalViews)
                : loading
                  ? "..."
                  : "—"
            }
            description={
              igOverview
                ? `Across ${igOverview.postsRetrieved} retrieved IG posts`
                : "Open IG Analytics to inspect live posts"
            }
            icon={Eye}
            badge="LIVE API"
          />

          <StatCard
            title="Avg Engagement Rate"
            value={
              igOverview
                ? igOverview.avgEngagementRate
                : loading
                  ? "..."
                  : "—"
            }
            description="Interactions divided by post reach"
            icon={TrendingUp}
            badge="GRAPH API"
          />

          <StatCard
            title="Saved Content Drafts"
            value={String(drafts.length)}
            description={
              drafts.length > 0
                ? `${drafts.filter((d) => d.status === "ready").length} ready · ${drafts.filter((d) => d.status === "published").length} published`
                : "Generate your first draft in Content Studio"
            }
            icon={FileText}
            badge="STUDIO"
          />

          <StatCard
            title="Next Scheduled Post"
            value={formattedNextPost}
            description={
              nextScheduledDraft
                ? `${nextScheduledDraft.content_format}: ${nextScheduledDraft.title}`
                : "Schedule a saved draft in Studio"
            }
            icon={CalendarDays}
            badge="CALENDAR"
          />
        </section>

        {/* Creator Profile Matrix */}
        <section className="y2k-chrome-card mb-8 rounded-2xl p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Creator Identity &amp; Instagram Calibration
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Used to ground your AI Strategy, Content Studio hooks, and AI Manager recommendations.
              </p>
            </div>

            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              Update calibration
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {profile ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <ProfileItem label="Creator Type" value={profile.creatorType} />
              <ProfileItem label="Instagram Niche" value={profile.niche} />
              <ProfileItem
                label="Instagram Handle"
                value={profile.instagram || "@creator"}
              />
              <ProfileItem
                label="Primary Formats"
                value={profile.contentFormats.join(", ")}
              />
              <ProfileItem
                label="Posting Cadence"
                value={profile.postingFrequency}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-black/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Your creator profile hasn&apos;t been set up yet.
              </p>
              <Link
                href="/onboarding"
                className="y2k-cobalt-button mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                Complete Creator Setup
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        {/* Main Bento Grid: AI Strategy + Goals */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* AI Strategy Panel */}
          <div className="y2k-chrome-card rounded-2xl p-6 lg:col-span-2">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Active Instagram Growth Strategy
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {strategy
                      ? "Loaded from your latest saved strategy version"
                      : "Generate your personalized content pillars and weekly plan"}
                  </p>
                </div>
              </div>

              <Link
                href="/strategy"
                className="y2k-chrome-pill inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                {strategy ? "Open Full Strategy" : "Generate Strategy"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {strategy ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">
                      {strategy.strategy_title}
                    </h3>
                    <span className="y2k-acid-badge rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold">
                      ACTIVE BLUEPRINT
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {strategy.overview}
                  </p>
                </div>

                <div>
                  <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Content Pillars ({strategy.content_pillars.length})
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {strategy.content_pillars.slice(0, 4).map((pillar) => (
                      <div
                        key={pillar.name}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-white">
                            {pillar.name}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#CCFF00]">
                            {pillar.percentage}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[#CCFF00]"
                            style={{ width: `${pillar.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-black/30 p-8 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-blue-400" />
                <h3 className="mt-4 font-bold text-white">
                  Generate your first AI Instagram strategy
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
                  AceCreator AI will analyze your creator profile, niche, goals,
                  and audience to build a 100% calibrated content pillar mix.
                </p>
                <Link
                  href="/strategy"
                  className="y2k-cobalt-button mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold"
                >
                  Open AI Strategy
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Goals & Audience Panel */}
          <div className="y2k-chrome-card flex flex-col justify-between rounded-2xl p-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Goals &amp; Audience
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Priority growth targets
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {profile?.goals?.length ? (
                  profile.goals.map((goal) => (
                    <div
                      key={goal}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#CCFF00]" />
                      <span className="text-xs font-semibold text-slate-200">
                        {goal}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Complete onboarding to select your growth goals.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                <Users className="h-3.5 w-3.5" />
                <span>Target Instagram Audience</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                {profile?.targetAudience ||
                  "Complete your creator profile to define the audience you want to reach."}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions Matrix */}
        <section className="y2k-chrome-card mt-6 rounded-2xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Instagram Growth Modules
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Jump directly to any stage of your workflow.
              </p>
            </div>

            <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground sm:inline-flex">
              <Camera className="h-3.5 w-3.5 text-[#CCFF00]" />
              Instagram-First Pipeline
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <QuickAction
              href="/strategy"
              title="AI Strategy"
              description="Content pillars & history"
              icon={Compass}
            />
            <QuickAction
              href="/studio"
              title="Content Studio"
              description="Draft & preview Reels"
              icon={Lightbulb}
            />
            <QuickAction
              href="/calendar"
              title="Content Calendar"
              description="Weekly schedule grid"
              icon={CalendarDays}
            />
            <QuickAction
              href="/analytics"
              title="IG Analytics"
              description="Graph API + Best times"
              icon={BarChart3}
            />
            <QuickAction
              href="/manager"
              title="AI Manager"
              description="Evidence-led next steps"
              icon={Brain}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-bold text-white">
        {value || "Not specified"}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}) {
  return (
    <div className="y2k-chrome-card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blue-400">
          {badge}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#CCFF00]">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-3 font-mono text-2xl font-extrabold tabular-nums text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-300">{title}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-blue-500/40 hover:bg-blue-600/10"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {description}
        </p>
      </div>

      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:text-[#CCFF00]" />
    </Link>
  );
}