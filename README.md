# AceCreator AI — Instagram Creator Intelligence & Content Studio

AceCreator AI is a full-stack, Instagram-first AI creator management platform built for **musicians, photographers, video editors, cinematographers, visual designers, and independent creators**.

Instead of offering disconnected prompt boxes, AceCreator AI connects the complete creator growth loop in one structured workspace:
**Creator Calibration → Versioned AI Strategy → Content Studio & 9:16 Live Preview → Content Library → Weekly Publishing Calendar → Real Instagram Graph API Analytics → AI Manager Recommendations → 1-Click Reel Draft Generation.**

## 1. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                         FRONTEND: Next.js 16 + React 19                           |
|  Tailwind CSS 4 ("Structured Y2K Chrome" Design System) + Lucide + Recharts       |
|                                                                                   |
|  [/] Landing  --> [/onboarding] --> [/dashboard] (Command Center)                 |
|                                         |-- [/strategy]  (Pillars + History)      |
|                                         |-- [/studio]    (Drafts + 9:16 Preview)  |
|                                         |-- [/calendar]  (Weekly Slot Grid)       |
|                                         |-- [/analytics] (Graph API + Best Times) |
|                                         +-- [/manager]   (Actions -> 1-Click Reel)|
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | Typed REST API (src/lib/api.ts)
                                          v
+-----------------------------------------------------------------------------------+
|                         BACKEND: Python FastAPI (v0.4.0)                          |
|  Pydantic v2 Schema Validation + SQLAlchemy 2.0 ORM + Dependency Injection        |
|                                                                                   |
|  Services (`backend/app/services/`):                                              |
|  - strategy_service.py          (Groq JSON + 100% Pillar Sum Retry Loop)          |
|  - content_studio_service.py    (Groq JSON + Hashtag Deduplication & Bounds)      |
|  - instagram_service.py         (Instagram Graph API + 60s In-Memory TTL Cache)   |
|  - analytics_summary_service.py (Deterministic KPI & Caption Theme Aggregation)   |
|  - posting_time_service.py      (Timezone-Aware Historical Slot Ranking)          |
|  - ai_performance_service.py    (Evidence-Grounded Groq Performance Analysis)     |
|  - manager_service.py           (Multi-Source Context Synthesis & Persistence)    |
+--------------------+-----------------------------------------+--------------------+
                     |                                         |
                     v                                         v
+----------------------------------------+ +----------------------------------------+
|      PostgreSQL Relational DB          | |       External API Integrations        |
|  - creators                            | |  - Groq API (openai/gpt-oss-20b)       |
|  - creator_strategies (immutable hist) | |  - Meta Instagram Graph API (/me/media |
|  - content_drafts (status & schedule)  | |    & /{media_id}/insights)             |
|  - manager_recommendations             | |                                        |
+----------------------------------------+ +----------------------------------------+
```

## 2. Technology Stack

* **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, `shadcn/ui` primitives, Lucide React icons, Recharts 3.
* **Visual Identity:** **Structured Y2K Chrome & Iridescence** — Deep Obsidian Matte canvases (`#06070B` / `#0E1017`) that preserve 100% color accuracy for creator media, paired with 1px Liquid Chrome specular borders, Electric Cobalt (`#2563EB`), Acid Cyber Lime (`#CCFF00`), and tabular monospace telemetry.
* **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, `psycopg2-binary`.
* **AI Engineering:** Groq API (`openai/gpt-oss-20b`) with strict Pydantic output validation, self-correcting retry prompts, and anti-hallucination guardrails.
* **Analytics & Telemetry:** Live Meta Instagram Graph API integration with 60-second in-memory TTL caching and deterministic timezone-aware (`zoneinfo`) posting-window analysis.

## 3. Implemented Features & Verification Status

| Module | Status | Key Engineering Details |
| :--- | :--- | :--- |
| **Creator Onboarding (`/onboarding`)** | **Implemented** | 5-step Instagram creator calibration with upfront field validation matching backend Pydantic bounds (`CreatorProfile`). |
| **Creator Command Center (`/dashboard`)** | **Implemented** | Aggregates live saved draft counts, next scheduled post, active AI Strategy summary, and live Instagram Graph API telemetry. |
| **AI Instagram Strategy (`/strategy`)** | **Implemented** | Generates 3–5 content pillars whose percentages are strictly validated to sum to `100%`, with immutable version history browsing. |
| **Content Studio & Library (`/studio`)** | **Implemented** | Generates Hooks, Captions, CTAs, Hashtags, and Visual Directions for Instagram `Reel`, `Carousel`, `Story`, and `Static Post` formats, with a live 9:16 phone preview frame, lifecycle status (`draft`, `ready`, `scheduled`, `published`), and custom delete confirmation modal. |
| **Content Calendar (`/calendar`)** | **Implemented** | 7-day weekly publishing grid (`Mon–Sun`) with format/status filters and deep links back into the Content Studio editor. |
| **Instagram Analytics (`/analytics`)** | **Implemented** | Retrieves live `views`, `reach`, `likes`, `comments`, `shares`, `saved`, and `total_interactions` from `graph.instagram.com`, renders `Recharts` visualizations, ranks historical posting windows (`posting_time_service.py`), and produces evidence-grounded AI findings (`ai_performance_service.py`). |
| **AI Creator Manager (`/manager`)** | **Implemented** | Synthesizes creator profile, latest strategy, recent drafts, and optional Instagram analytics into 3–5 unique, prioritized recommendations—with 1-click Reel draft generation (`POST .../generate-draft`). |

## 4. Local Setup & Running Instructions (Windows PowerShell)

### Prerequisites
* **Node.js** 18+ and `npm`
* **Python** 3.11+
* **PostgreSQL** 15+ running locally with two databases created:
  * Development database: `acecreator_db`
  * Isolated test database: `acecreator_test_db`

### Step 1: Configure Environment Variables
In your project root, copy `.env.example` to `.env` and `.env.test.example` to `.env.test`:

```powershell
# Working directory: AceCreator-AI root
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
```
Open `.env` and `.env.test` in VS Code and set your PostgreSQL password, `GROQ_API_KEY`, and `INSTAGRAM_ACCESS_TOKEN`.

### Step 2: Set Up Python Virtual Environment & Backend
```powershell
# Working directory: AceCreator-AI root
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Start the FastAPI server on http://127.0.0.1:8000
uvicorn backend.app.main:app --reload --port 8000
```

### Step 3: Install Frontend Dependencies & Start Next.js
Open a second PowerShell terminal in the project root:
```powershell
# Working directory: AceCreator-AI root
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## 5. Running Automated Tests & Production Build

The backend test suite uses an isolated PostgreSQL database (`acecreator_test_db`, enforced by `tests/conftest.py`) and deterministic mocks for AI services so tests never consume live Groq credits.

```powershell
# Working directory: AceCreator-AI root
# 1. Run all 41 automated backend tests
.\.venv\Scripts\Activate.ps1
pytest -v

# 2. Verify TypeScript compilation and Next.js production build
npm run build
```

## 6. Known Limitations & Next Architectural Milestones

* **Single-Account Development Mode (Pre-Auth Baseline):** The current baseline stores multiple creator profiles in PostgreSQL and resolves the active workspace using the chronologically newest `Creator` record (`ORDER BY created_at DESC, id DESC`). Full multi-tenant Email/Password authentication and per-user data isolation are designed for Phase 5.
* **Single Instagram Token:** Instagram analytics currently authenticate via the server's `INSTAGRAM_ACCESS_TOKEN` environment variable rather than per-user Meta OAuth.
* **Manual Publishing:** Scheduling a draft or marking it `Published` records its lifecycle state in AceCreator AI's calendar and database; it does not auto-publish media files directly to Instagram.
