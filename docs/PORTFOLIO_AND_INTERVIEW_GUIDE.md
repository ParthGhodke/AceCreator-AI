# AceCreator AI — Portfolio Case Study, Resume Bullets & Technical Interview Guide

## 1. High-Impact Resume Bullets (Verified Implementation)

* **Full-Stack AI Creator Management Platform (AceCreator AI):** Architected an Instagram-first SaaS platform using **Next.js 16, React 19, TypeScript, Tailwind CSS 4, FastAPI, PostgreSQL, and SQLAlchemy 2.0**, connecting creator onboarding, versioned AI strategy generation, a 9:16 Content Studio, a publishing calendar, live Instagram Graph API telemetry, and an AI Manager action engine.
* **Structured LLM Output Validation & Self-Correction:** Engineered 4 deterministic Groq AI services (`openai/gpt-oss-20b`) with **Pydantic v2 schema validation**, self-correcting retry loops enforcing mathematical invariants (e.g., content pillar allocations summing strictly to `100%`), hashtag normalization, and prompt-injection isolation.
* **Authentication, Refresh-Session Rotation & Multi-Tenant Isolation:** Implemented salted `scrypt` password hashing, short-lived `HS256` access tokens, and PostgreSQL-persisted **SHA-256 hashed refresh sessions** with automatic token rotation, replay detection, sliding-window rate limiting (`HTTP 429`), and strict per-user resource ownership (`403 Forbidden`).
* **Instagram Graph API Telemetry & Caching:** Integrated live Meta Graph API post & insight retrieval (`/me/media` and `/{media_id}/insights`) with a 60-second TTL cache (eliminating 3x redundant upstream requests across parallel dashboard widgets) and a timezone-aware (`zoneinfo`) historical posting-window ranker.
* **Automated Verification Suite:** Built **50 automated `pytest` tests** against an isolated `acecreator_test_db` PostgreSQL instance covering CRUD lifecycles, pagination, LLM failure fallbacks (`HTTP 502`), refresh token rotation, and cross-user authorization boundaries.

## 2. Technical Interview Talking Points & Trade-Off Explanations

### Q1: "Walk me through the architecture of AceCreator AI."
* **Answer Framework:**
  1. **Product Loop:** AceCreator AI is designed around a closed feedback loop for Instagram creators rather than isolated AI text generators: *Profile Calibration → Versioned Strategy → Content Studio & Library → Weekly Calendar → Live Instagram Graph API Analytics → AI Manager Recommendations → 1-Click Reel Draft Generation*.
  2. **Frontend Layer:** Next.js 16 App Router with a custom **Structured Y2K Chrome** design system (`src/app/globals.css`). Why dark matte `#0E1017` inner canvases with metallic 1px borders? Because visual creators (photographers, filmmakers, musicians) need neutral dark surfaces so their 9:16 Reel previews don't suffer from color cast, while the chrome/cobalt/lime accents give the app a distinctive creative studio identity.
  3. **Backend Layer:** FastAPI (`v0.5.0`) with SQLAlchemy 2.0 and PostgreSQL. Route handlers use FastAPI dependency injection (`Depends(get_db)`, `Depends(get_optional_current_user)`) and delegate business logic to modular services in `backend/app/services/`.

### Q2: "How do you prevent the LLM from hallucinating metrics or returning broken JSON?"
* **Answer Framework:**
  1. **Schema-First Validation:** Every AI service (`strategy_service.py`, `content_studio_service.py`, `ai_performance_service.py`, `manager_service.py`) parses raw model output into strict Pydantic v2 models (`CreatorStrategy`, `GeneratedContent`, `PerformanceAnalysis`, `ManagerRecommendationCreate`).
  2. **Domain Invariants + Self-Correction Loop:** In `strategy_service.py` and `manager_service.py`, if the LLM returns content pillars that don't sum to `100%` or duplicate recommendation titles, the service catches the `ValueError`, appends the exact validation error to the prompt, and retries automatically (`MAX_ATTEMPTS = 2`). If it still fails, the API returns a clean `HTTP 502 Bad Gateway` rather than saving corrupt data.
  3. **Prompt Injection & Anti-Hallucination Guardrails:** Creator bios and Instagram captions are serialized as JSON data blocks with explicit system instructions to treat user strings strictly as data, never as instructions, and missing Instagram metrics are passed as `null` rather than `0` so the model never mistakes unavailable insights for zero engagement.

### Q3: "Why did you pair short-lived JWT access tokens with a PostgreSQL `refresh_sessions` table?"
* **Answer Framework:**
  * Stateless JWTs alone cannot be revoked if a user logs out or a token is compromised before expiration.
  * By keeping the JWT access token short-lived (15 minutes, stored in an `HttpOnly; SameSite=Lax` cookie) and pairing it with a 7-day opaque refresh token whose **SHA-256 hash** is stored in `refresh_sessions`, we get fast stateless verification on normal API calls **plus** instant server-side revocation on `/api/auth/logout` and automatic rotation on `/api/auth/refresh`.

### Q4: "What was a subtle bug you discovered and fixed while building the project?"
* **Answer Framework (Great story for interviews!):**
  * **Bug 1 — UUIDv4 Ordering:** Initially, `Creator` primary keys used `uuid.uuid4()`, and `/api/creators/latest` ran `ORDER BY Creator.id DESC`. Because `UUIDv4` is randomly generated, sorting by `id` returned a random creator profile whenever multiple profiles existed. We fixed this non-destructively by adding indexed `created_at` / `updated_at` timestamps and sorting deterministically by `(created_at DESC, id DESC)`.
  * **Bug 2 — N+1 Instagram API Burst:** Opening `/analytics` fired 3 parallel requests (`/instagram`, `/posting-times`, `/ai-analysis`), each making `1 + 10 = 11` live HTTP requests to `graph.instagram.com` (33 sequential calls). Adding a 60-second in-memory TTL cache in `instagram_service.py` cut page-load Graph API traffic by 66%.
