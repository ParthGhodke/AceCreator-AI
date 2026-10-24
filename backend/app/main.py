import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import UUID

from fastapi import Cookie, Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.database import Base, SessionLocal, engine, get_db
from backend.app.models.content_draft import ContentDraft
from backend.app.models.creator import Creator
from backend.app.models.creator_strategy import CreatorStrategyRecord
from backend.app.models.manager_recommendation import ManagerRecommendation
from backend.app.models.user import RefreshSession, User
from backend.app.schemas.auth import (
    AuthSessionResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from backend.app.schemas.content_draft import (
    ContentDraftCreate,
    ContentDraftResponse,
    ContentDraftUpdate,
)
from backend.app.schemas.content_studio import ContentGenerationRequest
from backend.app.schemas.creator import (
    CreatorProfile,
    CreatorProfileResponse,
)
from backend.app.schemas.manager_recommendation import (
    ManagerRecommendationListResponse,
    ManagerRecommendationResponse,
    ManagerRecommendationUpdate,
    RecommendationStatus,
)
from backend.app.services.ai_performance_service import (
    generate_performance_analysis,
)
from backend.app.services.analytics_summary_service import (
    build_analytics_summary,
)
from backend.app.services.auth_service import (
    ACCESS_TOKEN_EXPIRE_SECONDS,
    REFRESH_COOKIE_NAME,
    check_auth_rate_limit,
    clear_auth_cookies,
    create_access_token,
    create_refresh_session,
    get_current_user,
    get_optional_current_user,
    hash_password,
    hash_refresh_token,
    rotate_refresh_session,
    set_auth_cookies,
    verify_password,
)
from backend.app.services.content_studio_service import generate_content_package
from backend.app.services.instagram_service import (
    InstagramAPIError,
    get_recent_post_analytics,
)
from backend.app.services.manager_service import (
    generate_and_save_recommendations,
)
from backend.app.services.posting_time_service import (
    recommend_posting_times,
)
from backend.app.services.strategy_service import (
    generate_creator_strategy,
)

logger = logging.getLogger(__name__)


def _ensure_creator_columns() -> None:
    """
    Non-destructively ensure the `creators` table has `created_at`, `updated_at`,
    and `user_id` columns on existing PostgreSQL databases.
    """
    db = SessionLocal()
    try:
        db.execute(
            text(
                "ALTER TABLE creators "
                "ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            )
        )
        db.execute(
            text(
                "ALTER TABLE creators "
                "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            )
        )
        db.execute(
            text(
                "ALTER TABLE creators "
                "ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE"
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.debug("Skipped creators column check.")
    finally:
        db.close()


def _query_latest_creator(
    db: Session,
    current_user: User | None = None,
) -> Creator | None:
    """
    Return the most recently created creator profile for the authenticated user,
    or the latest unowned development profile when unauthenticated.
    """
    query = db.query(Creator)
    if current_user is not None:
        query = query.filter(Creator.user_id == current_user.id)
    else:
        query = query.filter(Creator.user_id.is_(None))

    return query.order_by(Creator.created_at.desc(), Creator.id.desc()).first()


def _verify_creator_access(
    db: Session,
    creator_id: UUID,
    current_user: User | None,
) -> Creator:
    """
    Load a Creator by ID and enforce strict ownership:
    - If a Creator belongs to a user (`creator.user_id is not None`), only that
      authenticated user can access it (otherwise raise 403).
    - If a user is authenticated, they cannot access another user's Creator.
    """
    creator = db.query(Creator).filter(Creator.id == creator_id).first()
    if not creator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Creator profile not found.",
        )

    if creator.user_id is not None:
        if current_user is None or creator.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this creator profile.",
            )
    elif current_user is not None:
        # Authenticated user accessing an unowned creator record: claim or forbid
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This creator profile does not belong to your account.",
        )

    return creator


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables and safe column additions when the API starts."""
    Base.metadata.create_all(bind=engine)
    _ensure_creator_columns()
    yield


app = FastAPI(
    title="AceCreator AI API",
    description="Backend API for the AceCreator AI Instagram creator platform",
    version="0.5.0",
    lifespan=lifespan,
)


cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "AceCreator AI API is running",
        "version": "0.5.0",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "acecreator-api",
    }


@app.get("/api/db-health")
def database_health(db: Session = Depends(get_db)):
    """Check database connectivity without exposing internal errors."""
    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
        }

    except Exception:
        logger.exception("Database health check failed")

        raise HTTPException(
            status_code=503,
            detail="Database is currently unavailable.",
        ) from None


# ==========================================================================
# AUTHENTICATION & SESSION MANAGEMENT ENDPOINTS
# ==========================================================================


@app.post(
    "/api/auth/register",
    response_model=AuthSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    payload: UserRegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Register a new user account and establish an authenticated session."""
    check_auth_rate_limit(request)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    try:
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_session(db, user.id)
        set_auth_cookies(response, access_token, refresh_token)

        return {
            "user": user,
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_SECONDS,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("User registration failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create your account right now.",
        ) from None


@app.post(
    "/api/auth/login",
    response_model=AuthSessionResponse,
)
def login_user(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate with email and password and issue access + refresh tokens."""
    check_auth_rate_limit(request)

    user = (
        db.query(User)
        .filter(User.email == payload.email, User.is_active.is_(True))
        .first()
    )

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_session(db, user.id)
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "user": user,
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_SECONDS,
    }


@app.post(
    "/api/auth/refresh",
    response_model=AuthSessionResponse,
)
def refresh_user_session(
    request: Request,
    response: Response,
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    """Rotate the refresh session and issue a new short-lived access token."""
    check_auth_rate_limit(request)

    if not refresh_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing.",
        )

    user, new_refresh_token = rotate_refresh_session(db, refresh_cookie)
    new_access_token = create_access_token(user.id)
    set_auth_cookies(response, new_access_token, new_refresh_token)

    return {
        "user": user,
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_SECONDS,
    }


@app.post("/api/auth/logout")
def logout_user(
    response: Response,
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    """Revoke the active refresh session and clear authentication cookies."""
    if refresh_cookie:
        token_hash = hash_refresh_token(refresh_cookie)
        session_record = (
            db.query(RefreshSession)
            .filter(RefreshSession.token_hash == token_hash)
            .first()
        )
        if session_record and session_record.revoked_at is None:
            session_record.revoked_at = datetime.now(timezone.utc)
            db.commit()

    clear_auth_cookies(response)
    return {"message": "Signed out successfully."}


@app.get(
    "/api/auth/me",
    response_model=UserResponse,
)
def get_authenticated_user(
    current_user: User = Depends(get_current_user),
):
    """Return the currently authenticated user's profile."""
    return current_user


# ==========================================================================
# CREATOR PROFILE & STRATEGY ENDPOINTS
# ==========================================================================


@app.post(
    "/api/creators",
    response_model=CreatorProfileResponse,
)
def create_creator(
    profile: CreatorProfile,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    try:
        creator = Creator(
            user_id=current_user.id if current_user else None,
            **profile.model_dump(),
        )

        db.add(creator)
        db.commit()
        db.refresh(creator)

        return {
            "id": str(creator.id),
            **profile.model_dump(),
        }

    except Exception:
        db.rollback()
        raise


@app.get(
    "/api/creators/latest",
    response_model=CreatorProfileResponse,
)
def get_latest_creator(
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    creator = _query_latest_creator(db, current_user)

    if not creator:
        raise HTTPException(
            status_code=404,
            detail="No creator profile found.",
        )

    return {
        "id": str(creator.id),
        "creatorName": creator.creatorName,
        "creatorType": creator.creatorType,
        "bio": creator.bio,
        "instagram": creator.instagram,
        "youtube": creator.youtube,
        "tiktok": creator.tiktok,
        "otherPlatform": creator.otherPlatform,
        "goals": creator.goals,
        "niche": creator.niche,
        "contentFormats": creator.contentFormats,
        "postingFrequency": creator.postingFrequency,
        "targetAudience": creator.targetAudience,
    }


@app.get("/api/creators/{creator_id}/strategy")
def get_creator_strategy(
    creator_id: UUID,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the latest saved strategy without generating a new one."""
    _verify_creator_access(db, creator_id, current_user)

    saved_strategy = (
        db.query(CreatorStrategyRecord)
        .filter(
            CreatorStrategyRecord.creator_id == creator_id
        )
        .order_by(
            CreatorStrategyRecord.created_at.desc(),
            CreatorStrategyRecord.id.desc(),
        )
        .first()
    )

    if not saved_strategy:
        raise HTTPException(
            status_code=404,
            detail=(
                "No saved strategy found. "
                "Generate your first strategy using the regenerate endpoint."
            ),
        )

    return {
        "id": str(saved_strategy.id),
        "creator_id": str(saved_strategy.creator_id),
        "strategy_title": saved_strategy.strategy_title,
        "overview": saved_strategy.overview,
        "primary_goal": saved_strategy.primary_goal,
        "target_audience": saved_strategy.target_audience,
        "content_pillars": saved_strategy.content_pillars,
        "weekly_actions": saved_strategy.weekly_actions,
        "growth_recommendations": (
            saved_strategy.growth_recommendations
        ),
        "success_metrics": saved_strategy.success_metrics,
        "created_at": saved_strategy.created_at,
        "updated_at": saved_strategy.updated_at,
    }


@app.post("/api/creators/{creator_id}/strategy/regenerate")
def regenerate_creator_strategy(
    creator_id: UUID,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Generate a fresh strategy and save it as a new version."""
    try:
        creator = _verify_creator_access(db, creator_id, current_user)

        try:
            strategy = generate_creator_strategy(creator)
        except RuntimeError:
            logger.exception(
                "Strategy generation failed for creator %s",
                creator_id,
            )
            raise HTTPException(
                status_code=502,
                detail=(
                    "Strategy generation is temporarily unavailable. "
                    "Please try again."
                ),
            ) from None

        strategy_data = strategy.model_dump()

        saved_strategy = CreatorStrategyRecord(
            creator_id=creator.id,
            strategy_title=strategy_data["strategy_title"],
            overview=strategy_data["overview"],
            primary_goal=strategy_data["primary_goal"],
            target_audience=strategy_data["target_audience"],
            content_pillars=strategy_data["content_pillars"],
            weekly_actions=strategy_data["weekly_actions"],
            growth_recommendations=(
                strategy_data["growth_recommendations"]
            ),
            success_metrics=strategy_data["success_metrics"],
        )

        db.add(saved_strategy)
        db.commit()
        db.refresh(saved_strategy)

        return {
            "id": str(saved_strategy.id),
            **strategy_data,
            "created_at": saved_strategy.created_at,
            "updated_at": saved_strategy.updated_at,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        logger.exception(
            "Unable to save strategy for creator %s",
            creator_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to save the creator strategy.",
        ) from None


@app.get("/api/creators/{creator_id}/strategies")
def get_creator_strategy_history(
    creator_id: UUID,
    limit: int = 20,
    offset: int = 0,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Return saved strategy versions, newest first."""

    if not 1 <= limit <= 100:
        raise HTTPException(
            status_code=422,
            detail="Limit must be between 1 and 100.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=422,
            detail="Offset cannot be negative.",
        )

    _verify_creator_access(db, creator_id, current_user)

    strategies = (
        db.query(CreatorStrategyRecord)
        .filter(
            CreatorStrategyRecord.creator_id == creator_id
        )
        .order_by(
            CreatorStrategyRecord.created_at.desc(),
            CreatorStrategyRecord.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(strategy.id),
            "creator_id": str(strategy.creator_id),
            "strategy_title": strategy.strategy_title,
            "primary_goal": strategy.primary_goal,
            "created_at": strategy.created_at,
            "updated_at": strategy.updated_at,
        }
        for strategy in strategies
    ]


@app.get(
    "/api/creators/{creator_id}/strategies/{strategy_id}"
)
def get_creator_strategy_version(
    creator_id: UUID,
    strategy_id: UUID,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve one specific saved strategy version."""
    _verify_creator_access(db, creator_id, current_user)

    strategy = (
        db.query(CreatorStrategyRecord)
        .filter(
            CreatorStrategyRecord.id == strategy_id,
            CreatorStrategyRecord.creator_id == creator_id,
        )
        .first()
    )

    if not strategy:
        raise HTTPException(
            status_code=404,
            detail="Saved strategy version not found.",
        )

    return {
        "id": str(strategy.id),
        "creator_id": str(strategy.creator_id),
        "strategy_title": strategy.strategy_title,
        "overview": strategy.overview,
        "primary_goal": strategy.primary_goal,
        "target_audience": strategy.target_audience,
        "content_pillars": strategy.content_pillars,
        "weekly_actions": strategy.weekly_actions,
        "growth_recommendations": (
            strategy.growth_recommendations
        ),
        "success_metrics": strategy.success_metrics,
        "created_at": strategy.created_at,
        "updated_at": strategy.updated_at,
    }


@app.get("/api/analytics/instagram")
def get_instagram_analytics(limit: int = 10):
    """Return recent Instagram posts and their available insights."""
    if not 1 <= limit <= 25:
        raise HTTPException(
            status_code=422,
            detail="Limit must be between 1 and 25.",
        )

    try:
        return get_recent_post_analytics(limit=limit)

    except InstagramAPIError:
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to retrieve Instagram analytics. "
                "Check the Instagram connection and permissions."
            ),
        ) from None


@app.get("/api/analytics/instagram/summary")
def get_instagram_analytics_summary(limit: int = 10):
    """Return calculated performance summaries for recent posts."""
    if not 1 <= limit <= 25:
        raise HTTPException(
            status_code=422,
            detail="Limit must be between 1 and 25.",
        )

    try:
        analytics = get_recent_post_analytics(limit=limit)
        return build_analytics_summary(analytics)

    except InstagramAPIError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve Instagram analytics.",
        ) from None


@app.get("/api/analytics/instagram/posting-times")
def get_instagram_posting_time_recommendations(
    limit: int = 10,
    timezone_name: str = "Asia/Kolkata",
):
    """Recommend posting windows based on historical post performance."""
    if not 1 <= limit <= 25:
        raise HTTPException(
            status_code=422,
            detail="Limit must be between 1 and 25.",
        )

    try:
        analytics = get_recent_post_analytics(limit=limit)

        return recommend_posting_times(
            posts=analytics.get("posts", []),
            timezone_name=timezone_name,
        )

    except InstagramAPIError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve Instagram analytics.",
        ) from None

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from None


@app.get("/api/analytics/instagram/ai-analysis")
def get_instagram_ai_analysis(
    limit: int = 10,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate evidence-based AI recommendations from recent Instagram posts.
    """
    if not 1 <= limit <= 25:
        raise HTTPException(
            status_code=422,
            detail="Limit must be between 1 and 25.",
        )

    try:
        analytics = get_recent_post_analytics(limit=limit)
    except InstagramAPIError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve Instagram analytics.",
        ) from None

    try:
        analytics_summary = build_analytics_summary(analytics)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to summarize Instagram analytics.",
        ) from None

    try:
        creator = _query_latest_creator(db, current_user)

        if creator:
            creator_context = {
                "creator_name": creator.creatorName,
                "creator_type": creator.creatorType,
                "bio": creator.bio,
                "niche": creator.niche,
                "goals": creator.goals or [],
                "content_formats": creator.contentFormats or [],
                "posting_frequency": creator.postingFrequency,
                "target_audience": creator.targetAudience,
            }
        else:
            creator_context = {}

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to load creator profile.",
        ) from None

    try:
        return generate_performance_analysis(
            analytics_summary=analytics_summary,
            creator_context=creator_context,
        )

    except RuntimeError:
        raise HTTPException(
            status_code=502,
            detail=(
                "AI performance analysis is temporarily unavailable. "
                "Please try again later."
            ),
        ) from None


@app.post("/api/content-studio/generate")
def generate_studio_content(
    request: ContentGenerationRequest,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Generate a content package personalized to the latest creator profile."""
    creator = _query_latest_creator(db, current_user)

    if not creator:
        raise HTTPException(
            status_code=404,
            detail="Create a creator profile before generating content.",
        )

    creator_context = {
        "creator_name": creator.creatorName,
        "creator_type": creator.creatorType,
        "bio": creator.bio,
        "niche": creator.niche,
        "goals": creator.goals or [],
        "content_formats": creator.contentFormats or [],
        "target_audience": creator.targetAudience,
    }

    try:
        generated_content = generate_content_package(
            topic=request.topic,
            content_format=request.content_format,
            platform=request.platform,
            creator_context=creator_context,
        )

        return {"success": True, "content": generated_content}

    except RuntimeError:
        raise HTTPException(
            status_code=502,
            detail=(
                "Content generation is temporarily unavailable. "
                "Please try again."
            ),
        ) from None


@app.post(
    "/api/creators/{creator_id}/manager/recommendations/generate",
    response_model=list[ManagerRecommendationResponse],
    status_code=status.HTTP_201_CREATED,
)
def generate_manager_recommendations(
    creator_id: UUID,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Generate and persist personalized recommendations."""
    creator = _verify_creator_access(db, creator_id, current_user)

    analytics_summary = None

    try:
        analytics = get_recent_post_analytics(limit=10)
        analytics_summary = build_analytics_summary(analytics)
    except InstagramAPIError:
        logger.info(
            "Instagram analytics unavailable; generating "
            "recommendations without analytics."
        )
    except Exception:
        logger.warning(
            "Could not summarize Instagram analytics; "
            "continuing without analytics.",
            exc_info=True,
        )

    try:
        return generate_and_save_recommendations(
            db=db,
            creator=creator,
            analytics_summary=analytics_summary,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from None


@app.get(
    "/api/creators/{creator_id}/manager/recommendations",
    response_model=ManagerRecommendationListResponse,
)
def list_manager_recommendations(
    creator_id: UUID,
    limit: int = 10,
    offset: int = 0,
    status_filter: RecommendationStatus | None = None,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """List saved recommendations with pagination and an optional status filter."""
    if not 1 <= limit <= 100:
        raise HTTPException(
            status_code=422,
            detail="Limit must be between 1 and 100.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=422,
            detail="Offset cannot be negative.",
        )

    _verify_creator_access(db, creator_id, current_user)

    query = db.query(ManagerRecommendation).filter(
        ManagerRecommendation.creator_id == creator_id
    )

    if status_filter is not None:
        query = query.filter(
            ManagerRecommendation.status == status_filter
        )

    total = query.count()

    items = (
        query.order_by(
            ManagerRecommendation.created_at.desc(),
            ManagerRecommendation.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get(
    "/api/creators/{creator_id}/manager/recommendations/{recommendation_id}",
    response_model=ManagerRecommendationResponse,
)
def get_manager_recommendation(
    creator_id: UUID,
    recommendation_id: UUID,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve one recommendation belonging to the specified creator."""
    _verify_creator_access(db, creator_id, current_user)

    recommendation = (
        db.query(ManagerRecommendation)
        .filter(
            ManagerRecommendation.id == recommendation_id,
            ManagerRecommendation.creator_id == creator_id,
        )
        .first()
    )

    if not recommendation:
        raise HTTPException(
            status_code=404,
            detail="Recommendation not found.",
        )

    return recommendation


@app.post(
    "/api/creators/{creator_id}/manager/recommendations/"
    "{recommendation_id}/generate-draft",
    response_model=ContentDraftResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_draft_from_manager_recommendation(
    creator_id: UUID,
    recommendation_id: UUID,
    request: ContentGenerationRequest,
    current_user: User | None = Depends(get_optional_current_user),
):
    """Generate and save a content draft from a manager recommendation."""
    db: Session = SessionLocal()

    try:
        creator = _verify_creator_access(db, creator_id, current_user)

        recommendation = (
            db.query(ManagerRecommendation)
            .filter(
                ManagerRecommendation.id == recommendation_id,
                ManagerRecommendation.creator_id == creator_id,
            )
            .first()
        )

        if recommendation is None:
            raise HTTPException(
                status_code=404,
                detail="Recommendation not found.",
            )

        creator_context = {
            "creator_name": creator.creatorName,
            "creator_type": creator.creatorType,
            "bio": creator.bio or "",
            "niche": creator.niche or "",
            "goals": creator.goals or [],
            "content_formats": creator.contentFormats or [],
            "target_audience": creator.targetAudience or "",
        }

        recommendation_context = (
            f"\n\nSelected AI Manager recommendation: "
            f"{recommendation.title}\n"
            f"Recommendation details: {recommendation.description}\n"
            f"Reasoning: {recommendation.reasoning}"
        )

        creator_context["bio"] = (
            f"{creator_context['bio']}{recommendation_context}"
        )

        db.close()

        try:
            generated_content = generate_content_package(
                topic=request.topic,
                content_format=request.content_format,
                platform=request.platform,
                creator_context=creator_context,
            )
        except RuntimeError as exc:
            logger.warning(
                "Content generation failed for recommendation %s: %s",
                recommendation_id,
                exc,
            )
            raise HTTPException(
                status_code=502,
                detail="Unable to generate content right now. Please try again.",
            ) from exc

        db = SessionLocal()

        _verify_creator_access(db, creator_id, current_user)

        recommendation_exists = (
            db.query(ManagerRecommendation.id)
            .filter(
                ManagerRecommendation.id == recommendation_id,
                ManagerRecommendation.creator_id == creator_id,
            )
            .first()
        )

        if recommendation_exists is None:
            raise HTTPException(
                status_code=404,
                detail="Recommendation not found.",
            )

        draft = ContentDraft(
            creator_id=creator_id,
            title=generated_content["title"],
            topic=request.topic,
            hook=generated_content["hook"],
            caption=generated_content["caption"],
            call_to_action=generated_content["call_to_action"],
            hashtags=generated_content["hashtags"],
            content_format=request.content_format,
            platform=request.platform,
            visual_direction=generated_content["visual_direction"],
            rationale=generated_content["rationale"],
            status="draft",
        )

        db.add(draft)
        db.commit()
        db.refresh(draft)

        return draft

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to create a draft from recommendation %s",
            recommendation_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Unable to save the generated content draft.",
        )
    finally:
        db.close()


@app.patch(
    "/api/creators/{creator_id}/manager/recommendations/{recommendation_id}",
    response_model=ManagerRecommendationResponse,
)
def update_manager_recommendation(
    creator_id: UUID,
    recommendation_id: UUID,
    update_data: ManagerRecommendationUpdate,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Update the status of a saved recommendation."""
    try:
        _verify_creator_access(db, creator_id, current_user)

        recommendation = (
            db.query(ManagerRecommendation)
            .filter(
                ManagerRecommendation.id == recommendation_id,
                ManagerRecommendation.creator_id == creator_id,
            )
            .first()
        )

        if not recommendation:
            raise HTTPException(
                status_code=404,
                detail="Recommendation not found.",
            )

        recommendation.status = update_data.status
        db.commit()
        db.refresh(recommendation)

        return recommendation

    except Exception:
        db.rollback()
        raise


@app.post(
    "/api/content-drafts",
    response_model=ContentDraftResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_content_draft(
    draft_data: ContentDraftCreate,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Save a new content draft for the active creator profile."""
    try:
        creator = _query_latest_creator(db, current_user)

        if not creator:
            raise HTTPException(
                status_code=404,
                detail="Create a creator profile before saving drafts.",
            )

        draft = ContentDraft(
            creator_id=creator.id,
            **draft_data.model_dump(),
        )

        db.add(draft)
        db.commit()
        db.refresh(draft)

        return draft

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the content draft.",
        ) from None


@app.get(
    "/api/content-drafts",
    response_model=list[ContentDraftResponse],
)
def list_content_drafts(
    limit: int = 10,
    offset: int = 0,
    platform: str | None = None,
    status_filter: str | None = None,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Return paginated drafts for the active creator profile."""
    if not 1 <= limit <= 100:
        raise HTTPException(
            status_code=422,
            detail="Limit must be between 1 and 100.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=422,
            detail="Offset cannot be negative.",
        )

    allowed_platforms = {"Instagram"}
    allowed_statuses = {"draft", "ready", "scheduled", "published"}

    if platform is not None and platform not in allowed_platforms:
        raise HTTPException(
            status_code=422,
            detail="Invalid platform filter. Only Instagram is supported.",
        )

    if status_filter is not None and status_filter not in allowed_statuses:
        raise HTTPException(
            status_code=422,
            detail="Invalid status filter.",
        )

    creator = _query_latest_creator(db, current_user)

    if not creator:
        return []

    query = db.query(ContentDraft).filter(
        ContentDraft.creator_id == creator.id
    )

    if platform is not None:
        query = query.filter(ContentDraft.platform == platform)

    if status_filter is not None:
        query = query.filter(ContentDraft.status == status_filter)

    drafts = (
        query
        .order_by(ContentDraft.updated_at.desc(), ContentDraft.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return drafts


def _verify_draft_access(
    db: Session,
    draft_id: UUID,
    current_user: User | None,
) -> ContentDraft:
    """Ensure the requested ContentDraft exists and belongs to the caller."""
    draft = (
        db.query(ContentDraft)
        .filter(ContentDraft.id == draft_id)
        .first()
    )

    if not draft:
        raise HTTPException(
            status_code=404,
            detail="Content draft not found.",
        )

    _verify_creator_access(db, draft.creator_id, current_user)
    return draft


@app.get(
    "/api/content-drafts/{draft_id}",
    response_model=ContentDraftResponse,
)
def get_content_draft(
    draft_id: UUID,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve one saved draft."""
    return _verify_draft_access(db, draft_id, current_user)


@app.patch(
    "/api/content-drafts/{draft_id}",
    response_model=ContentDraftResponse,
)
def update_content_draft(
    draft_id: UUID,
    updates: ContentDraftUpdate,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Update a draft and maintain its publication record."""
    try:
        draft = _verify_draft_access(db, draft_id, current_user)

        changes = updates.model_dump(exclude_unset=True)
        changes.pop("published_at", None)

        if changes.get("status") == "published":
            if (
                draft.status != "published"
                or draft.published_at is None
            ):
                draft.published_at = datetime.now(timezone.utc)

        elif changes.get("status") in {"draft", "ready", "scheduled"}:
            draft.published_at = None

        for field, value in changes.items():
            setattr(draft, field, value)

        db.commit()
        db.refresh(draft)

        return draft

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update the content draft.",
        ) from None


@app.delete(
    "/api/content-drafts/{draft_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_content_draft(
    draft_id: UUID,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete a saved draft."""
    try:
        draft = _verify_draft_access(db, draft_id, current_user)

        db.delete(draft)
        db.commit()

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete the content draft.",
        ) from None
