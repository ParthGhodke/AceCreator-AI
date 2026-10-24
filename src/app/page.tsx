"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CalendarDays,
  Camera,
  CheckCircle2,
  Compass,
  Menu,
  Sparkles,
  TrendingUp,
  WandSparkles,
  X,
} from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* Navigation */}
      <nav className="y2k-glass-panel sticky top-0 z-50 border-b border-border">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="y2k-cobalt-button flex h-9 w-9 items-center justify-center rounded-xl">
              <Sparkles size={17} />
            </div>

            <div className="leading-none">
              <span className="text-sm font-bold tracking-tight text-white">
                AceCreator
              </span>
              <span className="y2k-iridescent-text ml-1 text-sm font-extrabold">
                AI
              </span>
            </div>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              Workflow
            </a>

            <a
              href="#creators"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              For Instagram Creators
            </a>
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              Workspace
            </Link>

            <Link
              href="/onboarding"
              className="y2k-cobalt-button flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            >
              Build Strategy
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl p-2 hover:bg-muted md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-border px-6 py-5 md:hidden">
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-muted-foreground"
              >
                Features
              </a>

              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-muted-foreground"
              >
                Workflow
              </a>

              <a
                href="#creators"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-muted-foreground"
              >
                For Instagram Creators
              </a>

              <div className="flex gap-2 border-t border-border pt-4">
                <Link
                  href="/dashboard"
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium"
                >
                  Workspace
                </Link>

                <Link
                  href="/onboarding"
                  className="y2k-cobalt-button flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                >
                  Get Started
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="y2k-grid-bg relative">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-8 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[130px]" />
          <div className="absolute right-1/4 top-24 h-[280px] w-[420px] rounded-full bg-purple-600/15 blur-[110px]" />
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="y2k-chrome-pill mb-7 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-200">
              <Camera size={13} className="text-[#CCFF00]" />
              <span>INSTAGRAM-FIRST AI CREATOR MANAGEMENT OS</span>
              <span className="y2k-acid-badge rounded-full px-2 py-0.5 font-mono text-[10px]">
                v0.4
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-balance text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              <span className="y2k-chrome-text">Create sharper Reels.</span>
              <br />
              <span className="y2k-iridescent-text">
                Grow on Instagram with evidence.
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              AceCreator AI connects your Instagram creator identity, content
              pillars, Reel &amp; Carousel drafting, publishing calendar, real
              Instagram Graph API analytics, and AI Manager recommendations in
              one unified studio.
            </p>

            {/* CTA */}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="y2k-cobalt-button flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition sm:w-auto"
              >
                Build my Instagram strategy
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/dashboard"
                className="y2k-chrome-pill w-full rounded-xl px-6 py-3.5 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/10 sm:w-auto"
              >
                Enter Creator Command Center
              </Link>
            </div>

            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Built for Musicians · Photographers · Video Editors · Designers · Independent Creators
            </p>
          </div>

          {/* Interactive-Looking Y2K Chrome Studio Preview */}
          <div className="relative mx-auto mt-16 max-w-6xl">
            <div className="y2k-iridescent-border overflow-hidden rounded-3xl">
              {/* Window Top Bar */}
              <div className="flex h-11 items-center justify-between border-b border-white/10 bg-black/50 px-4">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-1 font-mono text-[11px] text-slate-300">
                  acecreator.ai // instagram-growth-loop
                </div>

                <span className="y2k-acid-badge rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold">
                  LIVE GRAPH API + GROQ
                </span>
              </div>

              {/* Preview Grid */}
              <div className="grid gap-5 p-6 lg:grid-cols-3">
                <div className="y2k-chrome-card rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-blue-400">
                      01 / Strategy Pillars
                    </span>
                    <Compass className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="mt-3 text-base font-bold text-white">
                    100% Calibrated Content Mix
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Versioned Instagram content pillars with weekly execution plans tailored to your niche.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Behind the Craft (Reels)</span>
                      <span className="font-mono text-[#CCFF00]">45%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-blue-500 to-[#CCFF00]" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Portfolio Breakdowns (Carousels)</span>
                      <span className="font-mono text-blue-400">35%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[35%] rounded-full bg-blue-500" />
                    </div>
                  </div>
                </div>

                <div className="y2k-chrome-card rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-purple-400">
                      02 / Content Studio
                    </span>
                    <WandSparkles className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="mt-3 text-base font-bold text-white">
                    Hooks, Captions, CTAs &amp; 9:16 Preview
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Draft Instagram Reels, Carousels, Stories, and Static Posts with persisted status &amp; scheduling.
                  </p>
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
                    <p className="font-mono text-[10px] text-[#CCFF00]">HOOK PREVIEW</p>
                    <p className="mt-1 font-medium text-slate-200">
                      &ldquo;3 layering decisions that changed the entire mix on this track...&rdquo;
                    </p>
                  </div>
                </div>

                <div className="y2k-chrome-card rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-[#CCFF00]">
                      03 / AI Manager &amp; Insights
                    </span>
                    <Brain className="h-4 w-4 text-[#CCFF00]" />
                  </div>
                  <p className="mt-3 text-base font-bold text-white">
                    Evidence-Backed Next Actions
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Analyzes real Instagram post reach, views, and timestamps to recommend your next Reel draft.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>1-Click Draft Generation from Recommendations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator types */}
      <section id="creators" className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span className="text-slate-300">✦ Musicians &amp; Artists</span>
            <span>✦ Photographers</span>
            <span className="text-slate-300">✦ Video Editors &amp; Cinematographers</span>
            <span>✦ Visual Designers</span>
            <span className="text-slate-300">✦ Independent Creators</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#CCFF00]">
            Closed-Loop Instagram Architecture
          </p>

          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Every step of your Instagram workflow, connected.
          </h2>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Instead of disconnected prompt boxes, AceCreator AI links your
            creator profile, versioned strategy, content library, calendar,
            live Instagram metrics, and AI Manager into one continuous loop.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Compass}
            href="/strategy"
            title="AI Instagram Strategy"
            description="Generate and compare saved strategy versions with validated 100% content pillar allocations and weekly action plans."
          />

          <FeatureCard
            icon={WandSparkles}
            href="/studio"
            title="Content Studio & Library"
            description="Draft Instagram Reels, Carousels, Stories, and Static Posts with live 9:16 preview, search, status filters, and persistence."
          />

          <FeatureCard
            icon={CalendarDays}
            href="/calendar"
            title="Publishing Calendar"
            description="Organize your weekly Instagram publishing slots and track Draft, Ready, Scheduled, and Published items."
          />

          <FeatureCard
            icon={BarChart3}
            href="/analytics"
            title="Real Instagram Analytics"
            description="Inspect live views, reach, likes, comments, shares, and saves from the Instagram Graph API with honest coverage metrics."
          />

          <FeatureCard
            icon={TrendingUp}
            href="/analytics"
            title="Posting-Time & AI Insights"
            description="Rank historical weekday/time windows in your timezone and generate evidence-based content experiments."
          />

          <FeatureCard
            icon={Brain}
            href="/manager"
            title="AI Creator Manager"
            description="Turn your profile, saved strategy, recent drafts, and Instagram analytics into prioritized actions—and generate drafts in one click."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              How It Works
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Research → Strategy → Creation → Analysis
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Step
              number="01"
              title="Calibrate your creator identity"
              description="Define your creator type, niche, Instagram handle, preferred formats (Reels, Carousels, Stories, Static Posts), and audience."
            />

            <Step
              number="02"
              title="Generate strategy & drafts"
              description="Build a structured Instagram strategy, then create and schedule complete content packages in Content Studio."
            />

            <Step
              number="03"
              title="Measure & iterate with AI Manager"
              description="Review live Instagram post performance and let your AI Manager turn real evidence into your next Reel draft."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center lg:px-8">
        <div className="y2k-iridescent-border rounded-3xl px-6 py-16 sm:px-12">
          <Sparkles className="mx-auto text-[#CCFF00]" size={26} />

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to launch your Instagram growth workspace?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Set up your creator profile in under two minutes or jump straight
            into the Command Center.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="y2k-cobalt-button inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition"
            >
              Start Creator Onboarding
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/dashboard"
              className="y2k-chrome-pill inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-blue-400" />
            <span className="font-semibold text-foreground">AceCreator AI</span>
            <span className="font-mono text-[11px]">· Instagram Creator Management Platform</span>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/strategy" className="hover:text-foreground">
              Strategy
            </Link>
            <Link href="/studio" className="hover:text-foreground">
              Studio
            </Link>
            <Link href="/analytics" className="hover:text-foreground">
              Analytics
            </Link>
            <Link href="/manager" className="hover:text-foreground">
              AI Manager
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  href,
  title,
  description,
}: {
  icon: React.ElementType;
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="y2k-chrome-card group block rounded-2xl p-6 transition hover:-translate-y-0.5 hover:border-blue-500/40"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">
        <Icon size={18} />
      </div>

      <h3 className="mt-5 font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="y2k-chrome-card rounded-2xl p-6">
      <p className="font-mono text-xs font-bold text-[#CCFF00]">{number}</p>

      <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}