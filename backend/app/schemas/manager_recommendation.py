
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


RecommendationPriority = Literal["low", "medium", "high"]

RecommendationCategory = Literal[
    "content",
    "engagement",
    "consistency",
    "analytics",
    "strategy",
    "audience",
]

RecommendationStatus = Literal[
    "new",
    "in_progress",
    "completed",
    "dismissed",
]


class ManagerRecommendationCreate(BaseModel):
    """Validated recommendation content produced by the AI service."""

    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=10, max_length=3000)
    reasoning: str = Field(min_length=10, max_length=3000)

    evidence: list[str] = Field(default_factory=list, max_length=10)

    priority: RecommendationPriority = "medium"
    category: RecommendationCategory

    @field_validator("title", "description", "reasoning")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be blank.")

        return value

    @field_validator("evidence")
    @classmethod
    def clean_evidence(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item.strip()]

        if any(len(item) > 1000 for item in cleaned):
            raise ValueError("Each evidence item must be at most 1000 characters.")

        return cleaned


class ManagerRecommendationUpdate(BaseModel):
    """Fields a creator is allowed to update."""

    status: RecommendationStatus


class ManagerRecommendationResponse(BaseModel):
    """Recommendation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    creator_id: UUID
    title: str
    description: str
    reasoning: str
    evidence: list[str]
    priority: RecommendationPriority
    category: RecommendationCategory
    status: RecommendationStatus
    created_at: datetime
    updated_at: datetime


class ManagerRecommendationListResponse(BaseModel):
    """Paginated recommendation list."""

    items: list[ManagerRecommendationResponse]
    total: int
    limit: int
    offset: int
