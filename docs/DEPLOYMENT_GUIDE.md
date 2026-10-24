# AceCreator AI — Production Deployment Guide (`docs/DEPLOYMENT_GUIDE.md`)

This guide walks you step-by-step through pushing your new AceCreator AI repository to GitHub and deploying the three production tiers for **Rs. 0 / $0 (100% Free Tier)**:

1. **Database Tier (PostgreSQL):** **Neon** (Serverless PostgreSQL) or **Supabase**
2. **Backend Tier (FastAPI):** **Render** (using our included `render.yaml` / `Dockerfile`) or **Railway**
3. **Frontend Tier (Next.js 16):** **Vercel**

## Step 1: Push Your Clean Folder to a New GitHub Repository

Open your **VS Code PowerShell terminal** inside `C:\Users\Admin\Desktop\Projects\AceCreator y2k`:

```powershell
# Working directory: C:\Users\Admin\Desktop\Projects\AceCreator y2k

# 1. Verify .env and .env.test are ignored by Git (should NOT appear in status)
git init
git status

# 2. Stage all project files and create your initial commit
git add .
git commit -m "feat: AceCreator AI Y2K Chrome Instagram Creator Platform (v0.5.0)"
git branch -M main
```

Next, create a new empty repository on [GitHub](https://github.com/new) (for example, `AceCreator-AI-v2` or push to your existing `AceCreator-AI` repo) and run:

```powershell
# Replace with your GitHub repository URL:
git remote add origin https://github.com/ParthGhodke/AceCreator-AI.git
git push -u origin main
```

Once pushed, the included **GitHub Actions CI workflow (`.github/workflows/ci.yml`)** will automatically spin up a PostgreSQL 16 test container, run your `pytest tests/ -v` suite, and verify `npm run build` on every push!

## Step 2: Provision Managed PostgreSQL on Neon (Free Tier)

1. Sign in to [Neon](https://neon.tech/) (or [Supabase](https://supabase.com/)) and click **Create Project** (name it `acecreator-prod`).
2. Copy the **Connection String** from the Neon dashboard. It will look like:
   ```text
   postgresql://neondb_owner:your_password@ep-cool-darkness-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   *(Note: Our updated `backend/app/database.py` automatically normalizes `postgres://` and `postgresql://` URLs to `postgresql+psycopg2://` so you can paste Neon's URL directly!)*

## Step 3: Deploy the FastAPI Backend on Render (Free Tier)

1. Sign in to [Render](https://dashboard.render.com/) and click **New + → Web Service**.
2. Connect your GitHub repository (`ParthGhodke/AceCreator-AI`).
3. Configure the service settings:
   * **Runtime:** `Python 3` (or `Docker`—both `render.yaml` and `Dockerfile` are included in the root!)
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Under **Environment Variables**, add the following keys:

| Key | Value |
| :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` |
| `DATABASE_URL` | Your Neon PostgreSQL connection string (`?sslmode=require`) |
| `GROQ_API_KEY` | Your Groq API key |
| `INSTAGRAM_ACCESS_TOKEN` | Your Instagram Graph API token |
| `JWT_SECRET_KEY` | Any long random string (e.g., generate with `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `none` |
| `CORS_ORIGINS` | `http://localhost:3000` *(you will append your Vercel URL here in Step 4)* |

5. Click **Create Web Service**.
   * On first boot, FastAPI's `lifespan` hook (`Base.metadata.create_all(bind=engine)` + `_ensure_creator_columns()`) will automatically create the `users`, `refresh_sessions`, `creators`, `creator_strategies`, `content_drafts`, and `manager_recommendations` tables in your Neon database!
6. Copy your live Render backend URL (e.g., `https://acecreator-ai-api.onrender.com`) and verify it by opening:
   * `https://acecreator-ai-api.onrender.com/api/health` → `{"status": "healthy", "service": "acecreator-api"}`
   * `https://acecreator-ai-api.onrender.com/api/db-health` → `{"status": "healthy", "database": "connected"}`

## Step 4: Deploy the Next.js 16 Frontend on Vercel (Free Tier)

1. Sign in to [Vercel](https://vercel.com/new) and import your `ParthGhodke/AceCreator-AI` GitHub repository.
2. Framework Preset will auto-detect **Next.js**.
3. Expand **Environment Variables** and add:

| Key | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Your live Render URL with no trailing slash (e.g., `https://acecreator-ai-api.onrender.com`) |

4. Click **Deploy**.
5. Once Vercel finishes building and gives you your production domain (e.g., `https://acecreator-ai.vercel.app`):
   * Go back to your **Render Backend → Environment** tab.
   * Update `CORS_ORIGINS` to include your Vercel domain:
     ```text
     https://acecreator-ai.vercel.app,http://localhost:3000
     ```
   * Save changes so Render restarts with your Vercel origin whitelisted.

## Step 5: Post-Deployment Verification Checklist

1. Open `https://acecreator-ai.vercel.app/register` and create your creator account.
2. Complete the 5-step Instagram Onboarding wizard (`/onboarding`).
3. Generate your first **AI Instagram Strategy** (`/strategy`) and verify that the 100% content pillar mix saves to Neon PostgreSQL.
4. Open **Content Studio** (`/studio`), generate a Reel package, verify the **9:16 Live Preview Frame**, save the draft, and schedule a date.
5. Open **Content Calendar** (`/calendar`) and **Instagram Analytics** (`/analytics`) to verify live Graph API metrics and best posting times.
6. Open **AI Manager** (`/manager`), generate recommendations, and click **Generate Reel Draft** to test the complete closed loop in production!
