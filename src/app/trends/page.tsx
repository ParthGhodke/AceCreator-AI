import Link from "next/link";
import { Sparkles, WandSparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell";

export default function TrendsPage() {
  return (
    <AppShell>
      <div className="flex min-h-[75vh] items-center justify-center px-6">
        <div className="y2k-chrome-card max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-[#CCFF00]">
            <Sparkles className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-white">
            Instagram Trend Radar
          </h1>

          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Use AI Manager and Content Studio to turn your real Instagram post
            performance into high-retention Reels and Carousels.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/studio"
              className="y2k-cobalt-button inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold"
            >
              <WandSparkles className="h-4 w-4" />
              Open Content Studio
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}