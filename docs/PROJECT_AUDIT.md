# AceCreator AI — Comprehensive Repository Audit (`docs/PROJECT_AUDIT.md`)

**Audit Date:** October 23, 2026  
**Audited Baseline:** `AceCreator-AI-master.zip` (FastAPI `0.3.0` + Next.js `16.3.5` / React `19.2.8`)  
**Target Aesthetic Direction:** Direction 1 — Futuristic Y2K Chrome & Iridescence ("Structured Y2K Chrome")  
**Target Product Scope:** Instagram-First AI Creator Management Platform

## 1. Executive Summary & Verification Transparency

All 36 files inside `AceCreator-AI-master.zip` were directly extracted and inspected line-by-line in the isolated audit environment.

* **What Was Verified Directly (Code & Static Analysis):** Every frontend route (`src/app/**`), shared utility (`src/lib/**`), UI primitive (`src/components/**`), backend entrypoint (`backend/app/main.py`), SQLAlchemy ORM model (`backend/app/models/**`), Pydantic schema (`backend/app/schemas/**`), service module (`backend/app/services/**`), automated test suite (`tests/**`), and configuration file (`package.json`, `requirements.txt`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`).
* **Runtime Execution Limitations (Honest Disclosure):** Because this cloud inspection sandbox has no outbound network access, no pre-installed `node_modules`, no Python `fastapi`/`sqlalchemy`/`pytest` packages in the global VM image, and no running PostgreSQL server (`acecreator_test_db`), live `pytest` execution and `npm run build` cannot run inside the sandbox VM. Instead, every phase will include exact Windows PowerShell verification commands for you to run in your local VS Code terminal, and we will only mark tests/builds as **Verified** once you confirm the terminal output.

## 2. Section A — Project Structure Audit

### A.1 Frontend Folders & Routes (`src/`)
| Path | Role & Current Implementation | Styling System Used |
| :--- | :--- | :--- |
| `src/app/layout.tsx` | Root HTML shell loading `globals.css`. Does not load custom Google Fonts (`Syne`/`Space Grotesk`/`JetBrains Mono`) or a shared app navigation shell. | Base CSS variables |
| `src/app/globals.css` | Tailwind CSS 4 `@import "tailwindcss"`, `tw-animate-css`, `shadcn/tailwind.css` with default monochrome `oklch()` light/dark variables. | Tailwind v4 + `oklch` tokens |
| `src/app/page.tsx` | Marketing landing page with Hero, static CSS wireframe mockup, feature grid, and 3-step explainer. **Gap:** "Sign in", "Get started", and "Build my creator strategy" buttons are unlinked `<button>` elements with no `href` or `onClick` handlers. | Semantic tokens (`bg-background`) |
| `src/app/onboarding/page.tsx` | 5-step wizard (*About You → Platforms → Goals → Content → Review*). Saves to `POST /api/creators` and `localStorage`, then redirects via `window.location.href = "/dashboard"`. | Semantic tokens (`bg-background`, `text-primary`) |
| `src/app/dashboard/page.tsx` | Creator command center loading `/api/creators/latest` (with `localStorage` fallback). **Gap:** Uses hardcoded light-mode colors (`bg-slate-50`, `bg-white`, `text-violet-600`) and displays 4 hardcoded placeholder stat cards (`Followers: 0`, `Engagement: 0%`, `Content Ideas: 0`, `Next Post: —`). | Hardcoded light Slate/Violet |
| `src/app/strategy/page.tsx` | Displays latest strategy (`GET /api/creators/{id}/strategy`), regenerates (`POST .../regenerate`), and browses immutable strategy version history (`GET .../strategies`). | Semantic tokens (`bg-background`, `bg-card`) |
| `src/app/studio/page.tsx` | Split-pane AI Content Studio (`POST /api/content-studio/generate`), editable fields (Title, Hook, Caption, CTA, Hashtags, Visual Direction), status lifecycle (`draft`, `ready`, `published`), datetime scheduler (`scheduled_at`), and client-side searched/filtered/paginated Content Library. | Semantic tokens (`bg-background`, `bg-card`) |
| `src/app/calendar/page.tsx` | 7-day weekly calendar grid (`Mon–Sun`) + 5 summary KPI cards + status overview list powered by `GET /api/content-drafts` (`limit=10` default!). | Mixed semantic + light-only badge classes |
| `src/app/analytics/page.tsx` | Live Instagram post metrics (`Recharts` bar chart, engagement progress bars, top 3 posts), deterministic Best Times to Post (`posting-times`), and AI Performance Insights (`ai-analysis`). | Semantic tokens (`bg-background`, `bg-card`) |
| `src/app/manager/page.tsx` | AI Manager recommendation feed with server-side pagination, status filter (`new`, `in_progress`, `completed`, `dismissed`), status updates (`PATCH`), and 1-click "Generate Reel draft" (`POST .../generate-draft`). | Hardcoded light Slate/Violet (`bg-slate-50`, `bg-white`) |
| `src/app/trends/page.tsx` | Static placeholder page ("Trend discovery and AI-powered content adaptation will live here"). Not linked from Dashboard Quick Actions. | Semantic tokens |
| `src/components/ui/button.tsx` | Single `shadcn/ui` (`base-vega` style) button component. Unused across most pages (pages use raw `<button>` tags). | `class-variance-authority` |
| `src/lib/api.ts` | Typed fetch helpers for `createCreator`, `getLatestCreator`, `getCreatorStrategy`, and `manager` endpoints. Note: `studio`, `calendar`, `analytics`, and parts of `strategy` call `fetch()` directly in page components rather than going through `src/lib/api.ts`. | TypeScript |
| `src/lib/creator-profile.ts` | `localStorage` read/write/delete wrapper under key `acecreator_creator_profile`. | TypeScript |

### A.2 Backend Modules & Services (`backend/app/`)
| Module | Responsibility | Key Observations |
| :--- | :--- | :--- |
| `backend/app/main.py` | Monolithic FastAPI router (1,286 lines) defining 20 endpoints, CORS middleware, and `lifespan` table creation (`Base.metadata.create_all(bind=engine)`). | Instantiates `db = SessionLocal()` manually inside every route instead of using FastAPI `Depends(get_db)`. |
| `backend/app/database.py` | SQLAlchemy 2.0 `engine` (`pool_pre_ping=True`), `SessionLocal`, `Base`, and `get_db()` generator. | `get_db()` is defined but never injected into route handlers. |
| `backend/app/services/groq_service.py` | Initializes singleton `Groq(api_key=...)` client at import time. | Crashes test collection or app boot immediately if `GROQ_API_KEY` is missing in environment. |
| `backend/app/services/strategy_service.py` | Calls Groq (`openai/gpt-oss-20b`, `temp=0.3`, `max_tokens=4000`) with 2-attempt self-correcting validation loop (`sum(pillar.percentage) == 100`). | Strong validation logic; injects profile JSON directly into prompt string. |
| `backend/app/services/content_studio_service.py` | Calls Groq (`openai/gpt-oss-20b`, `temp=0.7`, `max_tokens=1800`), strips Markdown fences via regex, normalizes `#hashtags`, enforces 3–15 unique tags. | Clean validation; does not have retry loop like `strategy_service` or `manager_service`. |
| `backend/app/services/instagram_service.py` | Queries `https://graph.instagram.com/me/media` + per-post `/{media_id}/insights` using `INSTAGRAM_ACCESS_TOKEN` Bearer header (`timeout=20s`). | Uses `1 + N` synchronous HTTP calls (`requests.get`) inside a synchronous route. |
| `backend/app/services/analytics_summary_service.py` | Pure Python aggregation of views, reach, interactions, engagement rate (`interactions / reach * 100`), top 3 posts, hashtag frequency, and caption theme heuristics. | Uses pure Python (`collections.Counter`) — **Pandas/NumPy are not installed or used**, and Caption Themes contain hardcoded creator-specific strings (`"marathi"`, `"hindi"`, `"mumbai"`, `"sadshayari"`, `"mixtape"`). |
| `backend/app/services/posting_time_service.py` | Pure Python timezone-aware (`zoneinfo.ZoneInfo`) grouping of historical posts into `(weekday, time_window)` buckets requiring `MIN_POSTS_PER_SLOT = 2`. | Well-tested deterministic logic with honest statistical caveats. |
| `backend/app/services/ai_performance_service.py` | Calls Groq (`openai/gpt-oss-20b`, `temp=0.1`, `response_format={"type": "json_object"}` with fallback retry) to produce `PerformanceAnalysis`. | Well-structured prompt with strict anti-hallucination rules. |
| `backend/app/services/manager_service.py` | Combines `Creator`, latest `CreatorStrategyRecord`, 10 `ContentDraft` rows, and optional `analytics_summary` to generate 3–5 unique `ManagerRecommendation` rows. | Has 2-attempt validation retry and atomic `db.add_all(records)` persistence. |

### A.3 Database Models & Relationships (`backend/app/models/`)
1. **`Creator` (`creators` table):**
   * Primary Key: `id` (`UUID`, `default=uuid.uuid4`)
   * Columns: `creatorName` (`String(100)`), `creatorType` (`String(100)`), `bio` (`Text`), `instagram` (`String(255)`), `youtube` (`String(255)`), `tiktok` (`String(255)`), `otherPlatform` (`String(255)`), `goals` (`ARRAY(String)`), `niche` (`String(200)`), `contentFormats` (`ARRAY(String)`), `postingFrequency` (`String(100)`), `targetAudience` (`String(500)`).
   * **Critical Bug Found:** `Creator` has **no `created_at` or `updated_at` timestamp column**, yet `main.py` (lines 176, 513, 557, 1066, 1117) runs `db.query(Creator).order_by(Creator.id.desc()).first()` assuming UUIDv4 sorts chronologically! Because `uuid.uuid4()` is completely random, `ORDER BY id DESC` returns a **random creator profile** whenever 2+ profiles exist in the database.
2. **`CreatorStrategyRecord` (`creator_strategies` table):**
   * PK: `id` (`UUID`), FK: `creator_id` (`UUID`, `ForeignKey("creators.id", ondelete="CASCADE")`, indexed).
   * JSON columns: `content_pillars`, `weekly_actions`, `growth_recommendations`, `success_metrics`. Timestamps: `created_at`, `updated_at`.
3. **`ContentDraft` (`content_drafts` table):**
   * PK: `id` (`UUID`), FK: `creator_id` (`UUID`, `ForeignKey("creators.id", ondelete="CASCADE")`, indexed).
   * Fields: `title`, `topic`, `hook`, `caption`, `call_to_action`, `hashtags` (`JSON`), `content_format` (`String(50)`), `platform` (`String(50)`), `visual_direction`, `rationale`, `status` (indexed), `scheduled_at` (indexed), `published_at`, `created_at`, `updated_at`.
4. **`ManagerRecommendation` (`manager_recommendations` table):**
   * PK: `id` (`UUID`), FK: `creator_id` (`UUID`, `ForeignKey("creators.id", ondelete="CASCADE")`, indexed).
   * Fields: `title`, `description`, `reasoning`, `evidence` (`JSON`), `priority` (indexed), `category` (indexed), `status` (indexed), `created_at` (indexed), `updated_at`, composite index `ix_manager_recommendations_creator_created`.

### A.4 Schemas & Validation (`backend/app/schemas/`)
* `creator.py`: Validates `creatorName`, `creatorType`, `bio` (`10..1000` chars — note: `onboarding/page.tsx` step 1 only checks `!formData.bio.trim()`, so a 1–9 character bio passes step 1 in the UI and then fails at Step 5 submission with a backend 422!), `goals` (`min_length=1`), `niche`, `contentFormats` (`min_length=1`), `postingFrequency`, `targetAudience` (`5..500` chars).
* `content_draft.py` & `content_studio.py`: Enforces `Platform = Literal["Instagram", "YouTube", "TikTok"]` and `ContentFormat = Literal["Reel", "Carousel", "Story", "Static Post", "YouTube Short", "YouTube Video"]`.
* `strategy.py`: Validates `ContentPillar`, `WeeklyAction`, and `CreatorStrategy`.
* `manager_recommendation.py`: Validates `ManagerRecommendationCreate`, `ManagerRecommendationUpdate`, and paginated `ManagerRecommendationListResponse`.

### A.5 Tests, Root Scripts & Environment Configuration
* **Automated Pytest Suite (`tests/`):** 36 test functions across 4 files (`test_health.py` [3], `test_creator_strategies.py` [6], `test_content_drafts.py` [13], `test_manager_recommendations.py` [14]).
* **Root Manual Scripts:** 5 ad-hoc scripts (`test_gemini.py`, `test_instagram.py`, `test_instagram_insights.py`, `test_analytics_summary.py`, `test_ai_performance.py`) sitting in the project root.
* **Encoding Defect in `requirements.txt`:** `requirements.txt` is encoded as **UTF-16 Little Endian (`FF FE` BOM)** with null bytes between every character, and contains bleeding-edge/non-standard version pins (`fastapi==0.141.1`, `uvicorn==0.53.0`, `cryptography==50.0.2`, `google-genai==2.29.0` which is unused). Standard `pip` or CI tools on Linux/Docker frequently choke on UTF-16 `requirements.txt` files.
* **Missing `.env.example` & `.env.test.example`:** `.gitignore` explicitly allows `!.env.example` and `!.env.*.example`, but neither template file exists in the repository.

## 3. Section B — Feature Inventory

| Feature | Status | Evidence & Notes |
| :--- | :--- | :--- |
| **Landing Page (`/`)** | **Partially Implemented** | Visually complete wireframe layout, but "Sign in", "Get started", and "Build my creator strategy" buttons have no links/actions. |
| **Creator Onboarding (`/onboarding`)** | **Implemented** | 5-step wizard saves to `POST /api/creators` and `localStorage`. Minor bug: client validation allows <10 char `bio` on Step 1, which fails backend validation on Step 5. |
| **Creator Dashboard (`/dashboard`)** | **Partially Implemented** | Displays profile, goals, and quick links, but **4 KPI StatCards are hardcoded to `0` / `0%` / `—`**, and AI Strategy card always shows "Generate your first AI strategy" even when a strategy already exists. |
| **AI Creator Strategy (`/strategy`)** | **Implemented** | Generates strategy via Groq, validates 100% pillar sum, saves immutable versions, and allows browsing version history. |
| **Content Studio (`/studio`)** | **Implemented** | Generates structured content packages, edits fields, copies to clipboard, manages status (`draft`/`ready`/`published`), and schedules `scheduled_at`. |
| **Content Library (`/studio` bottom)** | **Partially Implemented** | Search, platform filter, status filter, and 6-item pagination work on the client, **but `loadDrafts()` fetches `GET /api/content-drafts` with default `limit=10`**, silently hiding any drafts beyond the 10 most recent! |
| **Content Calendar (`/calendar`)** | **Partially Implemented** | Weekly grid and status overview work, **but `loadDrafts()` also fetches `GET /api/content-drafts` with default `limit=10`**, and scheduled items whose `status` was changed to `"ready"` disappear from the calendar grid (`item.calendarStatus === "Scheduled"` is true before checking `status === "ready"`, which works, but `DraftStatus` type in `calendar/page.tsx` omits `"scheduled"`). |
| **Instagram Analytics (`/analytics`)** | **Implemented** | Real Graph API integration (`me/media` + `insights`), `Recharts` views chart, interaction bars, top 3 posts, and data coverage bar. |
| **Best Posting Times (`/analytics`)** | **Implemented** | Deterministic timezone-aware slot ranking (`posting_time_service.py`) with deep-link to `/studio?postingDay=...&postingWindow=...`. |
| **AI Performance Insights (`/analytics`)** | **Implemented** | Evidence-based Groq analysis (`ai_performance_service.py`) with findings, experiments, weekly actions, and limitations. |
| **AI Manager (`/manager`)** | **Implemented** | Generates 3–5 grounded recommendations, filters/paginates server-side, updates status, and generates Reel drafts in 1 click. |
| **Trends (`/trends`)** | **Planned / Placeholder** | Currently renders a static placeholder screen. |
| **Authentication & User Isolation** | **Planned / Not Implemented** | Zero auth endpoints, no `User` model, no JWT/session cookies, and `GET /api/creators/latest` is shared globally. |

## 4. Section C — Architecture Analysis

1. **Frontend-to-Backend Request Flow:**
   * Next.js client components (`"use client"`) call FastAPI directly at `NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"`.
   * **Inconsistent API Client Usage:** `onboarding`, `dashboard`, `manager`, and `strategy` (partially) use `src/lib/api.ts`, while `studio`, `calendar`, `analytics`, and `strategy` (history/regenerate) write raw `fetch()` calls with duplicated `API_BASE_URL` constants.
2. **Database Access & Session Lifecycle:**
   * Every endpoint in `backend/app/main.py` manually opens `db: Session = SessionLocal()` in a `try ... finally: db.close()` block instead of using FastAPI's `Depends(get_db)`. This makes dependency overrides in tests harder and bloats `main.py`.
3. **AI Provider Integration (Groq):**
   * All 4 AI services (`strategy_service`, `content_studio_service`, `ai_performance_service`, `manager_service`) share `backend/app/services/groq_service.py` and call model `"openai/gpt-oss-20b"`.
   * Prompts include explicit instructions to treat creator profiles and captions as data rather than instructions, and outputs are validated through Pydantic models (`CreatorStrategy`, `GeneratedContent`, `PerformanceAnalysis`, `ManagerRecommendationCreate`).
4. **Instagram API Integration:**
   * Uses a single global `INSTAGRAM_ACCESS_TOKEN` from `.env` against `https://graph.instagram.com`.
   * **Redundant Live API Calls on `/analytics` Load:** When a user opens `/analytics`, the frontend fires **three parallel requests** (`/api/analytics/instagram`, `/api/analytics/instagram/ai-analysis`, and `/api/analytics/instagram/posting-times`). Each of those 3 endpoints independently calls `get_recent_post_analytics(limit=10)`, which makes `1 + 10 = 11` HTTP requests to Meta's Graph API—resulting in **33 sequential HTTP calls to Instagram** on a single page load! Adding a short in-memory TTL cache (e.g., 60–120 seconds) or unified snapshot will make `/analytics` 3x faster and prevent Meta rate-limiting.

## 5. Section D — Engineering Quality & Risk Audit

### D.1 Security & Data Ownership Concerns
* **No Authentication or Authorization:** Any caller can read, modify, or delete any `ContentDraft` (`GET/PATCH/DELETE /api/content-drafts/{draft_id}`) without even passing a `creator_id`.
* **Broken "Latest Creator" Resolution (`ORDER BY Creator.id DESC`):** Because `Creator.id` is a random `UUIDv4`, `db.query(Creator).order_by(Creator.id.desc()).first()` does **not** return the most recently created creator! If a second creator profile is created whose random UUID happens to be lexicographically smaller than the first creator's UUID, `get_latest_creator()`, `create_content_draft()`, `list_content_drafts()`, and `generate_studio_content()` will silently bind to the wrong creator profile.
* **Prompt Injection Surface in `main.py` (Lines 854–863):** In `generate_draft_from_manager_recommendation`, the route concatenates `recommendation.title`, `recommendation.description`, and `recommendation.reasoning` directly onto `creator_context["bio"]` instead of passing `recommendation_context` as a separate structured field to `generate_content_package()`.

### D.2 Input Validation & Error Handling
* **Missing Automated Tests for Analytics, Posting Times, Content Studio & AI Analysis:** While strategies, drafts, health, and manager recommendations have 36 tests, `analytics_summary_service.py`, `posting_time_service.py`, `content_studio_service.py`, `ai_performance_service.py`, and `instagram_service.py` have **zero automated pytest unit tests** (only manual root scripts).
* **Domain Bias in `analytics_summary_service.py`:** Lines 145–189 hardcode Marathi/Hindi music phrases (`"marathi"`, `"hindi"`, `"mumbai"`, `"sadshayari"`, `"mixtape"`, `"fav bar"`). For photographers, video editors, or designers, `caption_theme_counts` will always return empty.

### D.3 Frontend Consistency, UX & Accessibility
* **Split Visual Personality:** `dashboard/page.tsx` and `manager/page.tsx` hardcode light-mode classes (`bg-slate-50`, `bg-white`, `text-slate-900`), while `analytics`, `strategy`, `studio`, `calendar`, and `onboarding` use CSS variables (`bg-background`, `bg-card`).
* **No Persistent App Navigation:** Every inner page only has a `← Back to dashboard` link. Switching from `Content Studio` to `Calendar` or `AI Manager` requires navigating back to `/dashboard` first.
* **`window.confirm` in Content Studio:** Deleting a draft uses browser-native `window.confirm()`, which blocks the main thread and breaks custom UI immersion.

## 6. Section E — Complete Multi-Platform Reference Inventory (Instagram-Only Scope Prep)

Before we execute Phase 2 (Instagram-Only Product Scope), every reference to `YouTube`, `TikTok`, and `otherPlatform` was located:

| Layer | File & Lines | Current Multi-Platform Behavior | Safe Cleanup Strategy |
| :--- | :--- | :--- | :--- |
| **Database Model** | `backend/app/models/creator.py` (Lines 40–56) | Columns `youtube`, `tiktok`, `otherPlatform` (`String(255)`, `default=""`). | **PRESERVE** columns and defaults in SQLAlchemy model so zero destructive DB migration is required. |
| **Pydantic Schemas** | `backend/app/schemas/creator.py` (Lines 24–26) | Optional defaults `youtube: str = ""`, `tiktok: str = ""`, `otherPlatform: str = ""`. | Keep defaulted optional fields on `CreatorProfile` or deprecate cleanly so existing DB rows serialize without error. |
| **Pydantic Schemas** | `backend/app/schemas/content_studio.py` (Lines 8–22) & `content_draft.py` (Lines 9–18) | `Platform = Literal["Instagram", "YouTube", "TikTok"]`; `ContentFormat` includes `"YouTube Short"`, `"YouTube Video"`. | Restrict active `Platform` to `Literal["Instagram"]` and `ContentFormat` to Instagram formats (`"Reel"`, `"Carousel"`, `"Story"`, `"Static Post"`). |
| **FastAPI Routes** | `backend/app/main.py` (Line 1104) | `allowed_platforms = {"Instagram", "YouTube", "TikTok"}` in `GET /api/content-drafts`. | Restrict `allowed_platforms = {"Instagram"}` (defaulting to `"Instagram"`). |
| **AI Services** | `strategy_service.py` (Lines 84–88) & `manager_service.py` (Lines 104–109) | Passes `"youtube"`, `"tiktok"`, `"other"` in `platforms` dict to Groq prompts; prompts say "social media growth". | Pass only `"instagram": creator.instagram` and sharpen prompts specifically for Instagram Reels, Carousels, Stories, and Static Posts. |
| **Frontend State & Types** | `src/lib/creator-profile.ts`, `onboarding/page.tsx`, `dashboard/page.tsx`, `studio/page.tsx`, `calendar/page.tsx` | UI inputs/filters for YouTube, TikTok, Other Platform, YouTube Short, YouTube Video. | Remove YouTube/TikTok/Other inputs and filters from Onboarding, Dashboard, Studio, and Calendar; focus Step 2 of Onboarding on Instagram handle & account positioning. |
| **Automated Tests** | `tests/test_content_drafts.py`, `test_creator_strategies.py`, `test_manager_recommendations.py` | Test payloads pass `"youtube": ""` and test platform filter validation. | Update test fixtures and assertions to verify Instagram-only validation (`YouTube`/`TikTok` rejected with `422`). |
