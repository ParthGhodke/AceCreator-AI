# AceCreator AI — Instagram Creator Intelligence & Content Studio

[](https://acecreator-ai.vercel.app)
[](https://acecreator-ai.vercel.app/studio)
[](https://nextjs.org/)
[](https://react.dev/)
[](https://fastapi.tiangolo.com/)
[](https://www.postgresql.org/)
[](https://groq.com/)

**Live Application:** [https://acecreator-ai.vercel.app](https://acecreator-ai.vercel.app)  
**Direct Content Studio Workspace:** [https://acecreator-ai.vercel.app/studio](https://acecreator-ai.vercel.app/studio)  
**GitHub Repository:** [https://github.com/ParthGhodke/AceCreator-AI](https://github.com/ParthGhodke/AceCreator-AI)

AceCreator AI is a full-stack, Instagram-first AI creator management platform built for **musicians, photographers, video editors, cinematographers, visual designers, and independent creators**.

Rather than offering disconnected prompt boxes, AceCreator AI connects the entire Instagram creator growth loop in one structured workspace:
**Creator Calibration → Versioned AI Strategy → Content Studio & 9:16 Live Preview → Persisted Content Library → Weekly Publishing Calendar → Real Instagram Graph API Telemetry → AI Manager Recommendations → 1-Click Reel Draft Generation.**

## 1. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                         FRONTEND: Next.js 16 + React 19                           |
|  TypeScript 5 + Tailwind CSS 4 + shadcn/ui + Lucide React + Recharts 3            |
|  Live Deployment: https://acecreator-ai.vercel.app                                |
|                                                                                   |
|  [/] Landing --> [/login | /register] --> [/onboarding] --> [/dashboard]          |
|                                                               |-- [/strategy]     |
|                                                               |-- [/studio]       |
|                                                               |-- [/calendar]     |
|                                                               |-- [/analytics]    |
|                                                               +-- [/manager]      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | Typed REST Client (src/lib/api.ts)
                                          | HttpOnly Cookies + Bearer Auth
                                          v
+-----------------------------------------------------------------------------------+
|                         BACKEND: Python FastAPI (v0.5.0)                          |
|  Pydantic v2 Schema Validation + SQLAlchemy 2.0 ORM + Dependency Injection        |
|                                                                                   |
|  Core Services (`backend/app/services/`):                                         |
|  - auth_service.py              (Salted scrypt + HS256 JWT + SHA-256 Refresh)     |
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
|  - users (unique email, scrypt hash)   | |  - Groq API (openai/gpt-oss-20b)       |
|  - refresh_sessions (SHA-256 rotated)  | |  - Meta Instagram Graph API (/me/media |
|  - creators (user_id FK + timestamps)  | |    & /{media_id}/insights)             |
|  - creator_strategies (immutable hist) | |                                        |
|  - content_drafts (status & schedule)  | |                                        |
|  - manager_recommendations             | |                                        |
+----------------------------------------+ +----------------------------------------+
```

## 2. Core Engineering Highlights

* **Closed-Loop Creator Workflow:** Connects creator identity (`Creator`), versioned strategy blueprints (`CreatorStrategyRecord`), structured content packages (`ContentDraft`), and AI Manager guidance (`ManagerRecommendation`) so every AI generation step is grounded in persisted user data.
* **Schema-Validated AI Orchestration & Self-Correction:** All 4 Groq AI services (`strategy_service.py`, `content_studio_service.py`, `ai_performance_service.py`, `manager_service.py`) validate LLM JSON responses against strict Pydantic v2 models. `strategy_service.py` enforces mathematical invariants (`sum(pillar.percentage) == 100`) and automatically feeds validation errors back into a retry prompt (`MAX_ATTEMPTS = 2`).
* **Real Instagram Graph API Telemetry & 60s TTL Caching:** Retrieves real post metrics (`views`, `reach`, `likes`, `comments`, `shares`, `saved`, `total_interactions`) from `graph.instagram.com`. Missing metrics remain `null` rather than `0` so unavailable insights are never mistaken for zero performance, and a 60-second in-memory TTL cache prevents redundant upstream Graph API bursts across parallel analytics widgets.
* **Deterministic Timezone-Aware Posting Recommendations:** `posting_time_service.py` groups historical post timestamps into `(weekday, time_window)` buckets in the creator's local IANA timezone (`zoneinfo.ZoneInfo`) and requires a minimum sample threshold (`MIN_POSTS_PER_SLOT = 2`) before ranking slots.
* **Authentication, Refresh-Session Rotation & Per-User Isolation:** Uses salted `scrypt` password hashing (`secrets.compare_digest`), 15-minute `HS256` access tokens, and 7-day PostgreSQL `refresh_sessions` stored as SHA-256 hashes with automatic token rotation, replay detection, sliding-window rate limiting (`HTTP 429`), and strict per-user ownership checks (`403 Forbidden`).

## 3. Feature Inventory & Routes

| Route | Module | Key Capabilities |
| :--- | :--- | :--- |
| `/` | **Landing Page** | Overview of the Instagram-first creator growth loop with direct navigation to Studio, Onboarding, and Authentication. |
| `/login` & `/register` | **Authentication** | Salted `scrypt` account registration and login issuing `HttpOnly` cookies + `Bearer` session tokens. |
| `/onboarding` | **Creator Calibration** | 5-step Instagram creator setup validating creator type, bio (`10..1000` chars), handle, goals, formats (`Reel`, `Carousel`, `Story`, `Static Post`), posting frequency, and audience. |
| `/dashboard` | **Command Center** | Displays live saved draft counts, next scheduled Instagram post, active AI Strategy pillars, and live Instagram Graph API telemetry. |
| `/strategy` | **AI Strategy & History** | Generates personalized Instagram content pillars summing to `100%`, weekly action plans, and browsable immutable version history. |
| `/studio` | **Content Studio & Library** | Generates Hooks, Captions, CTAs, Hashtags, and Visual Directions with a **Live 9:16 Instagram Phone Preview Frame**, status lifecycle (`draft`, `ready`, `scheduled`, `published`), datetime scheduler, search, filters, and pagination. |
| `/calendar` | **Content Calendar** | 7-day weekly publishing grid (`Mon–Sun`) with format/status filters and deep links back into the Content Studio editor. |
| `/analytics` | **IG Analytics & Insights** | Interactive `Recharts` post view comparisons, interaction breakdowns, top-performing posts, deterministic Best Times to Post, and evidence-led AI Performance Insights. |
| `/manager` | **AI Creator Manager** | Synthesizes profile, strategy, recent drafts, and Instagram analytics into prioritized action cards with status tracking and **1-Click Reel Draft Generation**. |

## 4. API Endpoints Overview (`backend/app/main.py`)

| Method & Path | Description |
| :--- | :--- |
| `GET /api/health` & `GET /api/db-health` | Service liveness and PostgreSQL connectivity health checks. |
| `POST /api/auth/register` | Register a new creator account, hash password with `scrypt`, and issue session tokens. |
| `POST /api/auth/login` | Verify credentials with rate-limit protection and issue access + rotated refresh tokens. |
| `POST /api/auth/refresh` & `POST /api/auth/logout` | Rotate SHA-256 refresh session in PostgreSQL or revoke session on sign-out. |
| `GET /api/auth/me` | Return the authenticated user's profile. |
| `POST /api/creators` & `GET /api/creators/latest` | Create or retrieve the active creator profile (scoped to the authenticated user). |
| `GET /api/creators/{id}/strategy` | Retrieve the newest saved Instagram strategy without consuming AI tokens. |
| `POST /api/creators/{id}/strategy/regenerate` | Generate and persist a new validated strategy version via Groq. |
| `GET /api/creators/{id}/strategies` & `.../{strategy_id}` | Paginate and inspect immutable historical strategy versions. |
| `POST /api/content-studio/generate` | Generate a structured Instagram content package (`Reel`, `Carousel`, `Story`, `Static Post`). |
| `GET / POST / PATCH / DELETE /api/content-drafts` | Full CRUD, lifecycle status management (`published_at` auto-timestamping), scheduling, and filtering for persisted drafts. |
| `GET /api/analytics/instagram` & `.../summary` | Fetch live Instagram Graph API post metrics and aggregated KPI summaries. |
| `GET /api/analytics/instagram/posting-times` | Rank historical weekday/time-window slots in the requested IANA timezone. |
| `GET /api/analytics/instagram/ai-analysis` | Generate evidence-grounded AI findings, content experiments, and limitations. |
| `POST / GET / PATCH /api/creators/{id}/manager/recommendations` | Generate, paginate, filter, and update AI Manager recommendations. |
| `POST .../recommendations/{rec_id}/generate-draft` | Convert a manager recommendation directly into a persisted Instagram draft. |

## 5. Local Development Setup (Windows PowerShell)

### Prerequisites
* **Node.js** 18+ and `npm`
* **Python** 3.11+
* **PostgreSQL** 15+ with two databases created: `acecreator_db` (development) and `acecreator_test_db` (isolated automated tests)

### 1. Clone & Configure Environment Variables
```powershell
git clone https://github.com/ParthGhodke/AceCreator-AI.git
cd AceCreator-AI

Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
```
Fill in `DATABASE_URL`, `GROQ_API_KEY`, `INSTAGRAM_ACCESS_TOKEN`, and `JWT_SECRET_KEY` in `.env` (and point `DATABASE_URL` in `.env.test` to `acecreator_test_db`).

### 2. Start the FastAPI Backend
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

uvicorn backend.app.main:app --reload --port 8000
```

### 3. Start the Next.js 16 Frontend
```powershell
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## 6. Testing & Verification

The automated `pytest` suite runs against an isolated PostgreSQL test database (`acecreator_test_db`, strictly enforced by `tests/conftest.py`) and uses deterministic mocks for AI and Graph API calls.

```powershell
# Run the full automated backend test suite (50 tests across 6 test modules)
.\.venv\Scripts\Activate.ps1
pytest tests/ -v

# Verify TypeScript types and production Next.js build
npm run build
```

## 7. Honest Current Limitations & Roadmap

* **Instagram Graph API Scope:** Live analytics currently use the server-configured `INSTAGRAM_ACCESS_TOKEN` for single-account creator telemetry; per-user Meta OAuth 2.0 account linking is architected as the next integration boundary.
* **Manual Instagram Publishing:** Marking a draft `Scheduled` or `Published` tracks its lifecycle inside AceCreator AI's database and calendar; direct media container publishing to Instagram is planned for future releases.
* **Statistical Caveats:** Historical posting-time rankings and AI performance insights describe observed correlations across retrieved posts (`limit <= 25`) and explicitly disclose sample-size limitations rather than claiming guaranteed virality.
