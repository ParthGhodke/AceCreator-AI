import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID

from backend.app.database import Base


class Creator(Base):
    __tablename__ = "creators"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    creatorName = Column(
        String(100),
        nullable=False,
    )

    creatorType = Column(
        String(100),
        nullable=False,
    )

    bio = Column(
        Text,
        nullable=False,
    )

    instagram = Column(
        String(255),
        nullable=False,
        default="",
    )

    # Legacy multi-platform columns preserved for backward-compatible DB storage.
    youtube = Column(
        String(255),
        nullable=False,
        default="",
    )

    tiktok = Column(
        String(255),
        nullable=False,
        default="",
    )

    otherPlatform = Column(
        String(255),
        nullable=False,
        default="",
    )

    goals = Column(
        ARRAY(String),
        nullable=False,
        default=list,
    )

    niche = Column(
        String(200),
        nullable=False,
    )

    contentFormats = Column(
        ARRAY(String),
        nullable=False,
        default=list,
    )

    postingFrequency = Column(
        String(100),
        nullable=False,
    )

    targetAudience = Column(
        String(500),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
