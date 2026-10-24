from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


Platform = Literal["Instagram"]

ContentFormat = Literal[
    "Reel",
    "Carousel",
    "Story",
    "Static Post",
]

DraftStatus = Literal[
    "draft",
    "ready",
    "scheduled",
    "published",
]


class ContentDraftBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    topic: str = Field(min_length=3, max_length=300)
    hook: str = Field(min_length=1)
    caption: str
    call_to_action: str
    hashtags: list[str] = Field(default_factory=list)
    content_format: ContentFormat
    platform: Platform = "Instagram"
    visual_direction: str = ""
    rationale: str = ""
    status: DraftStatus = "draft"

    scheduled_at: datetime | None = None

    @field_validator("title", "topic", "hook")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be empty.")

        return value


class ContentDraftCreate(ContentDraftBase):
    pass


class ContentDraftUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    topic: str | None = Field(default=None, min_length=3, max_length=300)
    hook: str | None = None
    caption: str | None = None
    call_to_action: str | None = None
    hashtags: list[str] | None = None
    content_format: ContentFormat | None = None
    platform: Platform | None = None
    visual_direction: str | None = None
    rationale: str | None = None
    status: DraftStatus | None = None

    scheduled_at: datetime | None = None
    published_at: datetime | None = None

    @field_validator("title", "topic", "hook")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip()

        if not value:
            raise ValueError("This field cannot be empty.")

        return value


class ContentDraftResponse(ContentDraftBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    creator_id: UUID
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime