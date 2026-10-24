"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bookmark,
  CalendarClock,
  Camera,
  Check,
  Copy,
  FileText,
  Heart,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  Video,
  WandSparkles,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { API_BASE_URL, getAuthHeaders, getLatestCreator } from "@/lib/api";

const PAGE_SIZE = 6;

const FORMATS = ["Reel", "Carousel", "Story", "Static Post"] as const;

type ContentFormat = (typeof FORMATS)[number];
type Platform = "Instagram";
type DraftStatus = "draft" | "ready" | "scheduled" | "published";

type GeneratedContent = {
  title: string;
  hook: string;
  caption: string;
  call_to_action: string;
  hashtags: string[];
  content_format: string;
  visual_direction: string;
  rationale: string;
};

type PostingRecommendation = {
  day: string;
  window: string;
};

type ContentDraft = GeneratedContent & {
  id: string;
  creator_id: string;
  topic: string;
  platform: Platform;
  status: DraftStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-blue-400">
        <Icon className="size-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
}

function toUtcIsoString(value: string): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Choose a valid scheduling date and time.");
  }

  return date.toISOString();
}

function getDisplayStatus(draft: ContentDraft): string {
  if (draft.status === "published" || draft.published_at) {
    return "Published";
  }

  if (draft.scheduled_at) return "Scheduled";
  if (draft.status === "ready") return "Ready";

  return "Draft";
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Published":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    case "Ready":
      return "border-blue-500/40 bg-blue-500/15 text-blue-300";
    case "Scheduled":
      return "border-purple-500/40 bg-purple-500/15 text-purple-300";
    default:
      return "border-white/15 bg-white/[0.05] text-slate-300";
  }
}

export default function StudioPage() {
  const [creatorName, setCreatorName] = useState<string | undefined>();
  const [instagramHandle, setInstagramHandle] = useState<string | undefined>();

  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<ContentFormat>("Reel");

  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const handledDraftId = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [draftPendingDelete, setDraftPendingDelete] =
    useState<ContentDraft | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [postingRecommendation, setPostingRecommendation] =
    useState<PostingRecommendation | null>(null);

  const filteredDrafts = drafts.filter((draft) => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !query ||
      draft.title.toLowerCase().includes(query) ||
      draft.topic.toLowerCase().includes(query) ||
      draft.caption.toLowerCase().includes(query);

    const matchesFormat =
      formatFilter === "All" || draft.content_format === formatFilter;

    const matchesStatus =
      statusFilter === "All" || getDisplayStatus(draft) === statusFilter;

    return matchesSearch && matchesFormat && matchesStatus;
  });

  const totalPages = Math.ceil(filteredDrafts.length / PAGE_SIZE);

  const safeCurrentPage =
    totalPages === 0 ? 1 : Math.min(currentPage, totalPages);

  const paginatedDrafts = filteredDrafts.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  const activeDraft = drafts.find((draft) => draft.id === activeDraftId);

  const activeDisplayStatus = activeDraft
    ? getDisplayStatus(activeDraft)
    : "Draft";

  async function loadDrafts() {
    setLibraryLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/content-drafts?limit=100`,
        { credentials: "include", headers: getAuthHeaders(), cache: "no-store" },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to load saved drafts.",
        );
      }

      setDrafts(Array.isArray(data) ? (data as ContentDraft[]) : []);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Make sure FastAPI is running on port 8000."
          : err instanceof Error
            ? err.message
            : "Unable to load saved drafts.",
      );
    } finally {
      setLibraryLoading(false);
    }
  }

  useEffect(() => {
    void loadDrafts();
    getLatestCreator()
      .then((creator) => {
        setCreatorName(creator.creatorName);
        setInstagramHandle(creator.instagram);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const day = params.get("postingDay");
    const windowName = params.get("postingWindow");

    const validDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const validWindows = [
      "Early morning",
      "Morning",
      "Afternoon",
      "Evening",
      "Night",
    ];

    if (
      day &&
      windowName &&
      validDays.includes(day) &&
      validWindows.includes(windowName)
    ) {
      setPostingRecommendation({
        day,
        window: windowName,
      });
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, formatFilter, statusFilter]);

  async function saveDraft() {
    if (!content) return;

    if (topic.trim().length < 3) {
      setError("Enter a topic with at least 3 characters before saving.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...content,
      topic: topic.trim(),
      platform: "Instagram" as const,
      content_format: format,
      ...(!activeDraftId ? { status: "draft" as const } : {}),
    };

    try {
      const isUpdating = Boolean(activeDraftId);

      const response = await fetch(
        isUpdating
          ? `${API_BASE_URL}/api/content-drafts/${activeDraftId}`
          : `${API_BASE_URL}/api/content-drafts`,
        {
          method: isUpdating ? "PATCH" : "POST",
          credentials: "include", headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to save this draft. Please try again.",
        );
      }

      const savedDraft = data as ContentDraft;

      setActiveDraftId(savedDraft.id);
      setScheduledAt(toLocalDateTimeInput(savedDraft.scheduled_at));
      setNotice(
        isUpdating
          ? "Content changes saved."
          : "Draft saved to your library.",
      );

      await loadDrafts();
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Make sure FastAPI is running on port 8000."
          : err instanceof Error
            ? err.message
            : "Unable to save this draft.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openDraft(draft: ContentDraft) {
    setActiveDraftId(draft.id);
    setScheduledAt(toLocalDateTimeInput(draft.scheduled_at));
    setTopic(draft.topic);
    setFormat(
      FORMATS.includes(draft.content_format as ContentFormat)
        ? (draft.content_format as ContentFormat)
        : "Reel",
    );

    setContent({
      title: draft.title,
      hook: draft.hook,
      caption: draft.caption,
      call_to_action: draft.call_to_action,
      hashtags: draft.hashtags,
      content_format: draft.content_format,
      visual_direction: draft.visual_direction,
      rationale: draft.rationale,
    });

    setError("");
    setNotice(`Loaded "${draft.title}".`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (libraryLoading) return;

    const params = new URLSearchParams(window.location.search);
    const requestedDraftId = params.get("draftId");

    if (!requestedDraftId || handledDraftId.current === requestedDraftId) {
      return;
    }

    const requestedDraft = drafts.find(
      (draft) => draft.id === requestedDraftId,
    );

    handledDraftId.current = requestedDraftId;

    if (!requestedDraft) {
      setError(
        "The requested draft could not be found. Refresh the content library and try again.",
      );
      return;
    }

    setActiveDraftId(requestedDraft.id);
    setScheduledAt(toLocalDateTimeInput(requestedDraft.scheduled_at));
    setTopic(requestedDraft.topic);
    setFormat(
      FORMATS.includes(requestedDraft.content_format as ContentFormat)
        ? (requestedDraft.content_format as ContentFormat)
        : "Reel",
    );

    setContent({
      title: requestedDraft.title,
      hook: requestedDraft.hook,
      caption: requestedDraft.caption,
      call_to_action: requestedDraft.call_to_action,
      hashtags: requestedDraft.hashtags,
      content_format: requestedDraft.content_format,
      visual_direction: requestedDraft.visual_direction,
      rationale: requestedDraft.rationale,
    });

    setError("");
    setNotice(`Opened "${requestedDraft.title}".`);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [libraryLoading, drafts]);

  async function updateDraftStatus(nextStatus: DraftStatus) {
    if (!activeDraftId) {
      setError("Save this content before changing its status.");
      return;
    }

    const currentDraft = drafts.find((draft) => draft.id === activeDraftId);

    if (currentDraft?.status === nextStatus) {
      setError("");
      setNotice(`Content is already marked ${nextStatus}.`);
      return;
    }

    setStatusSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/content-drafts/${activeDraftId}`,
        {
          method: "PATCH",
          credentials: "include", headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to update the content status.",
        );
      }

      const updatedDraft = data as ContentDraft;

      setDrafts((current) =>
        current.map((draft) =>
          draft.id === updatedDraft.id ? updatedDraft : draft,
        ),
      );

      setNotice(
        nextStatus === "published"
          ? "Content marked as published."
          : `Content status changed to ${nextStatus}.`,
      );

      await loadDrafts();
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Make sure FastAPI is running."
          : err instanceof Error
            ? err.message
            : "Unable to update the content status.",
      );
    } finally {
      setStatusSaving(false);
    }
  }

  async function saveSchedule() {
    if (!activeDraftId) {
      setError("Save the draft first before scheduling it.");
      return;
    }

    setScheduleSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/content-drafts/${activeDraftId}`,
        {
          method: "PATCH",
          credentials: "include", headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            scheduled_at: toUtcIsoString(scheduledAt),
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to save the schedule. Please try again.",
        );
      }

      const updatedDraft = data as ContentDraft;

      setScheduledAt(toLocalDateTimeInput(updatedDraft.scheduled_at));
      setNotice(
        updatedDraft.scheduled_at
          ? "Schedule saved successfully."
          : "Schedule removed successfully.",
      );

      await loadDrafts();
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Make sure FastAPI is running."
          : err instanceof Error
            ? err.message
            : "Unable to save the schedule.",
      );
    } finally {
      setScheduleSaving(false);
    }
  }

  async function confirmDeleteDraft() {
    if (!draftPendingDelete) return;

    const draft = draftPendingDelete;
    setDeletingDraftId(draft.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/content-drafts/${draft.id}`,
        { method: "DELETE", credentials: "include", headers: getAuthHeaders() },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to delete this draft.",
        );
      }

      setDrafts((current) =>
        current.filter((item) => item.id !== draft.id),
      );

      if (activeDraftId === draft.id) {
        setActiveDraftId(null);
        setContent(null);
        setScheduledAt("");
      }

      setDraftPendingDelete(null);
      setNotice("Content deleted.");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Make sure FastAPI is running."
          : err instanceof Error
            ? err.message
            : "Unable to delete this draft.",
      );
    } finally {
      setDeletingDraftId(null);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (topic.trim().length < 3) {
      setError("Enter a topic with at least 3 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    setActiveDraftId(null);
    setScheduledAt("");
    setContent(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/content-studio/generate`,
        {
          method: "POST",
          credentials: "include", headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            topic: topic.trim(),
            platform: "Instagram",
            content_format: format,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to generate content. Please try again.",
        );
      }

      if (!data?.content || typeof data.content !== "object") {
        throw new Error("The server returned an invalid content response.");
      }

      setContent(data.content as GeneratedContent);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Make sure FastAPI is running on port 8000."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyText(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);

      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? "" : current));
      }, 1800);
    } catch {
      setError("Clipboard access failed. Select the text and copy it manually.");
    }
  }

  function updateContent<K extends keyof GeneratedContent>(
    field: K,
    value: GeneratedContent[K],
  ) {
    setContent((current) =>
      current ? { ...current, [field]: value } : current,
    );
  }

  const completePackage = content
    ? [
        content.title,
        "",
        `HOOK\n${content.hook}`,
        "",
        `CAPTION\n${content.caption}`,
        "",
        `CALL TO ACTION\n${content.call_to_action}`,
        "",
        `HASHTAGS\n${content.hashtags.join(" ")}`,
        "",
        `VISUAL DIRECTION\n${content.visual_direction}`,
      ].join("\n")
    : "";

  return (
    <AppShell creatorName={creatorName} instagramHandle={instagramHandle}>
      <ConfirmDialog
        open={Boolean(draftPendingDelete)}
        title={`Delete "${draftPendingDelete?.title ?? "draft"}"?`}
        description="This action permanently removes the draft from your PostgreSQL content library and cannot be undone."
        loading={Boolean(deletingDraftId)}
        onConfirm={() => void confirmDeleteDraft()}
        onCancel={() => setDraftPendingDelete(null)}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Studio Header */}
        <section className="y2k-iridescent-border relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="y2k-chrome-pill mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-slate-200">
                <WandSparkles className="size-3.5 text-[#CCFF00]" />
                <span>INSTAGRAM CONTENT STUDIO &amp; LIBRARY</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Draft, preview &amp; schedule{" "}
                <span className="y2k-iridescent-text">Instagram content</span>
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Generate Instagram Reels, Carousels, Stories, and Static Posts
                personalized to your creator profile, then preview your hook
                inside a neutral dark studio frame.
              </p>
            </div>

            <div className="y2k-acid-badge inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold">
              <span className="size-2 rounded-full bg-[#CCFF00]" />
              GROQ STUDIO ENGINE READY
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            aria-live="polite"
            className={`mt-5 rounded-xl border p-3.5 text-sm ${
              error
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {error || notice}
          </div>
        )}

        {postingRecommendation && (
          <section className="y2k-chrome-card mt-5 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-[#CCFF00]">
                <Sparkles className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-white">
                  Recommended Instagram Posting Window
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  Your Instagram analytics identified{" "}
                  <span className="font-bold text-[#CCFF00]">
                    {postingRecommendation.day} · {postingRecommendation.window}
                  </span>{" "}
                  as a historically high-performing window.
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Save your draft first, then pick a specific date and time in
                  Publishing Schedule below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPostingRecommendation(null)}
                aria-label="Dismiss posting recommendation"
                className="rounded-lg border border-border px-2.5 py-1 text-muted-foreground hover:bg-muted"
              >
                ×
              </button>
            </div>
          </section>
        )}

        {/* Main Studio Workspace Grid */}
        <div className="mt-7 grid items-start gap-6 xl:grid-cols-[360px_1fr_320px]">
          {/* Column 1: Prompt & Format Controls */}
          <section className="y2k-chrome-card rounded-2xl p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">
                1. Configure Instagram Draft
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Describe the concept and select your target Instagram format.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label
                  htmlFor="topic"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Topic / Creative Angle
                </label>

                <textarea
                  id="topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  minLength={3}
                  maxLength={300}
                  required
                  rows={4}
                  placeholder="e.g. Behind the scenes of layering vocals and synths on my new track..."
                  className="w-full resize-y rounded-xl border border-input bg-black/50 px-3.5 py-3 text-sm text-white outline-none focus-visible:border-blue-500"
                />

                <div className="mt-1.5 flex justify-between gap-3 font-mono text-[11px] text-muted-foreground">
                  <span>Min 3 chars</span>
                  <span>{topic.length}/300</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Instagram Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FORMATS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFormat(item)}
                      aria-pressed={format === item}
                      className={`rounded-xl border px-3 py-3 text-xs font-semibold transition-all ${
                        format === item
                          ? "y2k-iridescent-border text-[#CCFF00]"
                          : "border-white/10 bg-black/40 text-slate-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 size-4 shrink-0 text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-white">
                      Profile-Grounded Generation
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Tailored to your creator niche, goals, and target audience
                      without inventing fake metrics.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || topic.trim().length < 3}
                className="y2k-cobalt-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Synthesizing draft...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Instagram Package
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Column 2: Editable Content Package */}
          <section className="y2k-chrome-card min-w-0 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div>
                <h2 className="text-lg font-bold text-white">
                  2. Content Package Editor
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {content
                    ? "Refine every component and save to your library."
                    : "Generate a draft or open an item from your library below."}
                </p>
              </div>

              {content && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void saveDraft()}
                    disabled={saving}
                    className="y2k-cobalt-button inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    {saving ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    {saving
                      ? "Saving..."
                      : activeDraftId
                        ? "Save changes"
                        : "Save draft"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void copyText("all", completePackage)}
                    className="y2k-chrome-pill inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                  >
                    {copiedField === "all" ? (
                      <Check className="size-3.5 text-[#CCFF00]" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copiedField === "all" ? "Copied" : "Copy all"}
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
                <LoaderCircle className="size-8 animate-spin text-blue-400" />
                <p className="mt-5 font-bold text-white">
                  Building your Instagram package
                </p>
                <p className="mt-2 max-w-xs text-xs leading-6 text-muted-foreground">
                  Crafting hook, caption, CTA, hashtags, and visual filming direction...
                </p>
              </div>
            ) : content ? (
              <div className="space-y-6 pt-6">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1">
                      <Camera className="size-3 text-[#CCFF00]" />
                      Instagram
                    </span>
                    <span className="y2k-acid-badge rounded-full px-2.5 py-1">
                      {content.content_format}
                    </span>
                  </div>

                  <label
                    htmlFor="content-title"
                    className="mb-2 mt-4 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    Working Title
                  </label>
                  <input
                    id="content-title"
                    value={content.title}
                    maxLength={120}
                    onChange={(event) =>
                      updateContent("title", event.target.value)
                    }
                    className="w-full rounded-lg border border-input bg-black/50 px-3 py-2 text-sm font-bold text-white outline-none focus-visible:border-blue-500"
                  />
                </div>

                <div>
                  <SectionHeading
                    icon={Video}
                    title="Opening Hook (0–3s)"
                    description="The visual or spoken line that stops the scroll."
                  />
                  <textarea
                    aria-label="Edit hook"
                    value={content.hook}
                    onChange={(event) =>
                      updateContent("hook", event.target.value)
                    }
                    rows={3}
                    maxLength={500}
                    className="w-full resize-y rounded-xl border border-input bg-black/50 px-3.5 py-3 text-sm leading-6 text-white outline-none focus-visible:border-blue-500"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void copyText("hook", content.hook)}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copiedField === "hook" ? (
                        <Check className="size-3.5 text-[#CCFF00]" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copiedField === "hook" ? "Copied" : "Copy hook"}
                    </button>
                  </div>
                </div>

                <div>
                  <SectionHeading
                    icon={FileText}
                    title="Instagram Caption"
                    description="Main body copy formatted for readability."
                  />
                  <textarea
                    aria-label="Edit caption"
                    value={content.caption}
                    onChange={(event) =>
                      updateContent("caption", event.target.value)
                    }
                    rows={6}
                    maxLength={3000}
                    className="w-full resize-y rounded-xl border border-input bg-black/50 px-3.5 py-3 text-sm leading-6 text-white outline-none focus-visible:border-blue-500"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {content.caption.length}/2200 IG limit
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyText("caption", content.caption)}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copiedField === "caption" ? (
                        <Check className="size-3.5 text-[#CCFF00]" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copiedField === "caption" ? "Copied" : "Copy caption"}
                    </button>
                  </div>
                </div>

                <div>
                  <SectionHeading
                    icon={MessageSquare}
                    title="Call to Action (CTA)"
                    description="Prompt saves, shares, comments, or profile visits."
                  />
                  <textarea
                    aria-label="Edit call to action"
                    value={content.call_to_action}
                    onChange={(event) =>
                      updateContent("call_to_action", event.target.value)
                    }
                    rows={2}
                    maxLength={300}
                    className="w-full resize-y rounded-xl border border-input bg-black/50 px-3.5 py-3 text-sm leading-6 text-white outline-none focus-visible:border-blue-500"
                  />
                </div>

                <div>
                  <SectionHeading
                    icon={Sparkles}
                    title="Hashtags"
                    description="3 to 15 targeted niche tags."
                  />
                  <textarea
                    aria-label="Edit hashtags"
                    value={content.hashtags.join(" ")}
                    onChange={(event) =>
                      updateContent(
                        "hashtags",
                        event.target.value.split(/\s+/).filter(Boolean),
                      )
                    }
                    rows={2}
                    className="w-full resize-y rounded-xl border border-input bg-black/50 px-3.5 py-3 font-mono text-xs leading-6 text-blue-300 outline-none focus-visible:border-blue-500"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <SectionHeading
                    icon={Video}
                    title="Visual & Filming Direction"
                    description="Camera framing, pacing, or slide layout notes."
                  />
                  <textarea
                    aria-label="Edit visual direction"
                    value={content.visual_direction}
                    onChange={(event) =>
                      updateContent("visual_direction", event.target.value)
                    }
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-y rounded-lg border border-input bg-black/50 px-3 py-2.5 text-sm leading-6 text-slate-200 outline-none focus-visible:border-blue-500"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <SectionHeading
                    icon={Lightbulb}
                    title="Strategic Rationale"
                    description="Why this concept aligns with your creator profile."
                  />
                  <p className="text-xs leading-6 text-slate-300">
                    {content.rationale}
                  </p>
                </div>

                {/* Status & Scheduling Controls */}
                <div className="grid gap-4 pt-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <SectionHeading
                      icon={Check}
                      title="Lifecycle Status"
                      description="Track readiness and publication."
                    />

                    {activeDraftId ? (
                      <>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Current:
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${statusBadgeClass(activeDisplayStatus)}`}
                          >
                            {activeDisplayStatus}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void updateDraftStatus("draft")}
                            disabled={statusSaving || saving}
                            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium hover:bg-white/10 disabled:opacity-50"
                          >
                            Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateDraftStatus("ready")}
                            disabled={statusSaving || saving}
                            className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
                          >
                            Ready
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateDraftStatus("published")}
                            disabled={statusSaving || saving}
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            Published
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Save draft first to unlock status transitions.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <SectionHeading
                      icon={CalendarClock}
                      title="Publishing Schedule"
                      description="Assign a calendar slot."
                    />

                    <input
                      id="scheduled-at"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      className="w-full rounded-lg border border-input bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveSchedule()}
                        disabled={!activeDraftId || scheduleSaving || saving}
                        className="y2k-cobalt-button inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        <CalendarClock className="size-3.5" />
                        {scheduleSaving ? "Saving..." : "Save Slot"}
                      </button>

                      {scheduledAt && (
                        <button
                          type="button"
                          onClick={() => setScheduledAt("")}
                          className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[440px] flex-col items-center justify-center px-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-blue-400">
                  <WandSparkles className="size-7" />
                </div>
                <h3 className="mt-5 text-base font-bold text-white">
                  Your Instagram Studio Canvas
                </h3>
                <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                  Enter a topic on the left and click Generate to synthesize a
                  complete hook, caption, CTA, hashtag set, and visual storyboard.
                </p>
              </div>
            )}
          </section>

          {/* Column 3: Neutral Dark 9:16 Instagram Live Preview Frame */}
          <section className="y2k-chrome-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-[#CCFF00]" />
                <h2 className="text-sm font-bold text-white">
                  Live IG Frame Preview
                </h2>
              </div>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {format === "Reel" || format === "Story" ? "9:16 REEL" : "4:5 POST"}
              </span>
            </div>

            {/* Neutral Obsidian Matte Phone Mockup */}
            <div className="mx-auto max-w-[280px] overflow-hidden rounded-[28px] border-2 border-white/15 bg-[#090A0F] shadow-2xl">
              {/* Top Phone Bar */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px]">
                <span className="font-semibold text-white">
                  {instagramHandle || "@creator.studio"}
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-[#CCFF00]">
                  {format}
                </span>
              </div>

              {/* Visual Canvas Area */}
              <div className="relative flex min-h-[260px] flex-col justify-between bg-gradient-to-b from-[#121521] via-[#0B0D14] to-[#08090E] p-4">
                <div className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-[10px] text-slate-300">
                  {content?.visual_direction
                    ? `🎬 ${content.visual_direction.slice(0, 95)}${content.visual_direction.length > 95 ? "..." : ""}`
                    : "🎬 Visual filming direction will preview here..."}
                </div>

                {/* On-Screen Hook Overlay */}
                <div className="my-4 rounded-xl border border-white/20 bg-black/75 p-3 text-center shadow-lg backdrop-blur-md">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#CCFF00]">
                    ON-SCREEN HOOK
                  </p>
                  <p className="mt-1 text-xs font-bold leading-snug text-white">
                    {content?.hook ||
                      "Your opening 3-second hook will appear right here."}
                  </p>
                </div>

                {/* IG Interaction Rail */}
                <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-slate-300">
                  <div className="flex items-center gap-3">
                    <Heart className="size-4 text-rose-400" />
                    <MessageCircle className="size-4" />
                    <Send className="size-4" />
                  </div>
                  <Bookmark className="size-4 text-[#CCFF00]" />
                </div>
              </div>

              {/* Caption & Hashtag Preview */}
              <div className="space-y-2 border-t border-white/10 bg-[#07080C] p-3.5 text-[11px] leading-relaxed">
                <p className="line-clamp-4 text-slate-200">
                  <span className="mr-1.5 font-bold text-white">
                    {instagramHandle?.replace(/^@/, "") || "creator"}
                  </span>
                  {content?.caption ||
                    "Your generated Instagram caption and storytelling body will preview here."}
                </p>

                {content?.call_to_action && (
                  <p className="font-semibold text-[#CCFF00]">
                    → {content.call_to_action}
                  </p>
                )}

                {content?.hashtags?.length ? (
                  <p className="line-clamp-2 font-mono text-[10px] text-blue-400">
                    {content.hashtags.join(" ")}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        {/* Content Library Section */}
        <section className="y2k-chrome-card mt-8 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Persisted Instagram Content Library
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Search, filter by format or status, and reopen any saved draft.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadDrafts()}
              disabled={libraryLoading}
              className="y2k-chrome-pill inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50"
            >
              <LoaderCircle
                className={`size-3.5 ${libraryLoading ? "animate-spin" : ""}`}
              />
              Refresh library
            </button>
          </div>

          <div className="grid gap-3 pt-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label
                htmlFor="draft-search"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Search library
              </label>
              <input
                id="draft-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, topic, or caption..."
                className="w-full rounded-xl border border-input bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none focus-visible:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="format-filter"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Format
              </label>
              <select
                id="format-filter"
                value={formatFilter}
                onChange={(event) => setFormatFilter(event.target.value)}
                className="w-full rounded-xl border border-input bg-black/60 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="All">All Instagram formats</option>
                {FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-filter"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-input bg-black/60 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="All">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Published">Published</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFormatFilter("All");
                  setStatusFilter("All");
                }}
                className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                Clear filters
              </button>
            </div>

            <p className="font-mono text-xs text-muted-foreground sm:col-span-3">
              Showing {filteredDrafts.length} of {drafts.length} saved drafts
            </p>
          </div>

          {libraryLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading saved content...
            </p>
          ) : drafts.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-bold text-white">
                No saved drafts yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate content above and click Save draft to build your library.
              </p>
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-bold text-white">
                No matching drafts found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try another search term or reset your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
                {paginatedDrafts.map((draft) => {
                  const displayStatus = getDisplayStatus(draft);

                  return (
                    <article
                      key={draft.id}
                      className="flex min-w-0 flex-col justify-between rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-blue-500/40"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-white">
                              {draft.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {draft.topic}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${statusBadgeClass(displayStatus)}`}
                          >
                            {displayStatus}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px]">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-slate-300">
                            Instagram
                          </span>
                          <span className="y2k-acid-badge rounded-full px-2.5 py-0.5">
                            {draft.content_format}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-300">
                          {draft.caption}
                        </p>

                        {draft.scheduled_at &&
                          draft.status !== "published" &&
                          !draft.published_at && (
                            <p className="mt-3 font-mono text-[11px] text-purple-300">
                              Scheduled:{" "}
                              {new Date(draft.scheduled_at).toLocaleString()}
                            </p>
                          )}

                        {draft.published_at && (
                          <p className="mt-2 font-mono text-[11px] text-emerald-300">
                            Published:{" "}
                            {new Date(draft.published_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          onClick={() => openDraft(draft)}
                          className="y2k-cobalt-button flex-1 rounded-xl px-3 py-2 text-xs font-semibold"
                        >
                          Open in Editor
                        </button>

                        <button
                          type="button"
                          aria-label={`Delete ${draft.title}`}
                          title="Delete content"
                          onClick={() => setDraftPendingDelete(draft)}
                          disabled={deletingDraftId === draft.id}
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-white/15 text-muted-foreground transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <p className="font-mono text-xs text-muted-foreground">
                    Page {safeCurrentPage} of {totalPages} ·{" "}
                    {filteredDrafts.length} results
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage(Math.max(1, safeCurrentPage - 1))
                      }
                      disabled={safeCurrentPage === 1}
                      className="y2k-chrome-pill rounded-xl px-4 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          Math.min(totalPages, safeCurrentPage + 1),
                        )
                      }
                      disabled={safeCurrentPage === totalPages}
                      className="y2k-chrome-pill rounded-xl px-4 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}