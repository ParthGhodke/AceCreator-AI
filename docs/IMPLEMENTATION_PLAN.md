# AceCreator AI — Phased Implementation Plan (`docs/IMPLEMENTATION_PLAN.md`)

**Date:** October 23, 2026

**Target Aesthetic:** Futuristic Y2K Chrome & Iridescence ("Structured Y2K Chrome")

**Workflow Philosophy:** Small, verifiable, non-destructive increments verified via `pytest` and `npm run build` in Windows PowerShell.

## 1. Prioritized Findings & Architectural Decisions

1. **Fix Critical Backend Correctness & Stability Bugs First (Low Risk, High Impact):**

   * Fix `requirements.txt` UTF-16 encoding and clean up unused dependencies.

   * Fix `Creator` ordering bug (`ORDER BY Creator.id DESC` on random UUIDv4) by adding `created_at` / `updated_at` with safe non-destructive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` startup handling and refactoring routes to use `Depends(get_db)`.

   * Add a short-TTL (60s) in-memory cache in `instagram_service.py` so opening `/analytics` doesn't fire 33 sequential requests to Meta's Graph API.

   * Generalize `analytics_summary_service.py` caption theme heuristics so they work for all creator types (Musicians, Photographers, Video Editors, Designers, Influencers).

2. **Enforce Instagram-Only Product Scope (Phase 2):**

   * Remove active YouTube, TikTok, and Other Platform inputs, filters, and formats (`YouTube Short`, `YouTube Video`) from Onboarding, Dashboard, Studio, Calendar, Pydantic schemas, and AI prompts while **preserving existing `Creator` database columns** (`youtube`, `tiktok`, `otherPlatform`) with empty string defaults so zero data is lost.

3. **Implement Futuristic Y2K Chrome Design System & Unified App Shell (Phase 3 & 4):**

   * Configure `Syne` (Display), `Plus Jakarta Sans` / `Inter` (UI), and `JetBrains Mono` (Tabular Metrics) in `src/app/layout.tsx`.

   * Define the **Structured Y2K Chrome** token system in `src/app/globals.css` (`#06070B` Void Canvas, `#0E1017` Obsidian Matte cards, `#2563EB` Electric Cobalt, `#CCFF00` Acid Cyber Lime, liquid chrome 1px borders, and iridescent active states).

   * Build a persistent glassmorphic **App Sidebar / Mobile Dock (`src/components/app-shell.tsx`)** so creators can jump directly between Dashboard, Strategy, Studio, Calendar, Analytics, and AI Manager without clicking "Back to dashboard" every time.

   * Upgrade the Dashboard to show **real live metrics** (saved strategy status, draft counts, scheduled next post, and live Instagram reach/engagement when available) instead of hardcoded `0`s.

4. **Implement Production-Grade Email/Password Authentication & Resource Ownership (Phase 5):**

   * Design and review the `User` + `RefreshSession` architecture (Argon2id/bcrypt password hashing, short-lived access tokens, hashed refresh tokens with rotation & revocation, and `creator.user_id` ownership checks) **before** writing auth code.

## 2. Recommended Phased Implementation Sequence

### Phase 1: Repository Audit & Baseline Verification (Current Phase)

* **Objective:** Inspect full codebase, document architecture and risks in `docs/PROJECT_AUDIT.md` and `docs/IMPLEMENTATION_PLAN.md`, and verify your local PowerShell `pytest` and `npm run build` baseline.

* **Deliverables:** `docs/PROJECT_AUDIT.md`, `docs/IMPLEMENTATION_PLAN.md`.

* **Acceptance Criteria:**

  * Both audit documents added to `docs/`.

  * Local baseline `pytest` and `npm run build` results confirmed in PowerShell.

### Phase 2: Backend Foundation, Bug Fixes & Instagram-Only Scope

* **Objective:** Scope active schemas, services, and UI to Instagram-only (preserving DB columns), fix the random UUIDv4 `Creator` ordering bug non-destructively, fix the `/studio` and `/calendar` 10-draft truncation limit, add 60s Instagram API caching, generalize caption themes, and normalize `requirements.txt` to UTF-8.

* **Files Involved:**

  * `requirements.txt`, `.env.example`, `.env.test.example`

  * `backend/app/models/creator.py`

  * `backend/app/schemas/content_studio.py`, `backend/app/schemas/content_draft.py`, `backend/app/schemas/creator.py`

  * `backend/app/services/strategy_service.py`, `backend/app/services/manager_service.py`, `backend/app/services/content_studio_service.py`, `backend/app/services/instagram_service.py`, `backend/app/services/analytics_summary_service.py`

  * `backend/app/main.py`

  * `src/lib/creator-profile.ts`, `src/lib/api.ts`

  * `src/app/onboarding/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/studio/page.tsx`, `src/app/calendar/page.tsx`

  * `tests/test_content_drafts.py`, `tests/test_creator_strategies.py`, `tests/test_manager_recommendations.py`, plus new unit tests in `tests/test_analytics_and_posting_times.py`.

* **Risks & Mitigations:**

  * *Risk:* Existing `creators` table in PostgreSQL may not have `created_at` column yet since `Base.metadata.create_all()` does not add columns to existing tables.

  * *Mitigation:* Add a safe, idempotent `ALTER TABLE creators ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` check inside `lifespan` in `main.py` so existing dev and test databases upgrade automatically with zero data loss.

* **Acceptance Criteria:**

  * Zero active YouTube/TikTok options in UI or active draft/studio schemas; existing DB columns preserved.

  * All existing + new backend tests pass (`pytest`).

  * Frontend production build succeeds (`npm run build`).

### Phase 3: Futuristic Y2K Chrome Design System & Persistent App Shell

* **Objective:** Implement the approved **Futuristic Y2K Chrome & Iridescence** design tokens, typography (`Syne`, `Plus Jakarta Sans`, `JetBrains Mono`), reusable Y2K Chrome UI primitives (Liquid Chrome cards, Iridescent badges, Specular buttons, custom modal dialog to replace `window.confirm`), and the persistent glassmorphic navigation shell.

* **Files Involved:**

  * `src/app/layout.tsx`, `src/app/globals.css`

  * `src/components/app-shell.tsx`, `src/components/ui/chrome-card.tsx`, `src/components/ui/confirm-dialog.tsx`, `src/components/ui/button.tsx`

* **Acceptance Criteria:**

  * WCAG AA (`>= 4.5:1`) text contrast verified across all tokens.

  * Keyboard focus rings (`2px` Electric Cobalt) and `prefers-reduced-motion` support active.

  * `npm run build` succeeds with zero TypeScript or ESLint errors.

### Phase 4: Core Frontend Transformation (Landing, Onboarding, Dashboard, Strategy, Studio, Calendar, Analytics, AI Manager)

* **Objective:** Apply the Y2K Chrome design system and persistent navigation shell across all pages, connect the Dashboard KPI cards and Strategy preview to real backend data, add a realistic 9:16 Instagram Reel / 4:5 Post preview frame in Content Studio, and unify all API calls through `src/lib/api.ts`.

* **Sub-phases (Incremental Delivery):**

  * **Phase 4A:** Landing Page (`/`) + Onboarding (`/onboarding`) + Real-Data Creator Dashboard (`/dashboard`).

  * **Phase 4B:** AI Strategy (`/strategy`) + Content Studio & 9:16 Instagram Preview + Content Library (`/studio`).

  * **Phase 4C:** Content Calendar (`/calendar`) + Instagram Analytics (`Recharts` Y2K Chrome styling) (`/analytics`) + AI Manager (`/manager`).

* **Acceptance Criteria:**

  * Every button on `/` links to a working route.

  * Dashboard displays real draft counts, next scheduled post, strategy summary, and Instagram metrics.

  * `npm run build` succeeds after each sub-phase.

### Phase 5: Authentication, Session Management & Per-User Data Isolation

* **Objective:** Propose and, after your approval of the database migration and session strategy (HttpOnly Secure Cookie vs. Memory+Refresh Cookie), implement Email/Password authentication (`Argon2`/`bcrypt`), short-lived access tokens, rotated hashed refresh sessions in PostgreSQL, rate limiting on auth routes, and strict per-user authorization on every creator, strategy, draft, and recommendation endpoint.

* **Acceptance Criteria:**

  * Comprehensive auth & cross-user authorization tests in `tests/test_auth.py` (verifying User A cannot read/patch/delete User B's resources).

  * Frontend login/register pages and protected route handling working end-to-end.

### Phase 6: Documentation, Architecture Diagrams & Interview Portfolio Polish

* **Objective:** Replace the default `create-next-app` `README.md` with a comprehensive portfolio-grade engineering document (system architecture diagram, data model, AI validation & anti-hallucination design, security model, local setup, testing guide, honest limitations, and interview talking points).

* **Acceptance Criteria:**

  * Accurate, evidence-backed documentation in `README.md`, `docs/PROJECT_AUDIT.md`, and `docs/IMPLEMENTATION_PLAN.md`.