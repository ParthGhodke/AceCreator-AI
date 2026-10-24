
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from backend.app.database import Base


class ContentDraft(Base):
    __tablename__ = "content_drafts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    creator_id = Column(
        UUID(as_uuid=True),
        ForeignKey("creators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(200), nullable=False)
    topic = Column(String(300), nullable=False)

    hook = Column(Text, nullable=False)
    caption = Column(Text, nullable=False)
    call_to_action = Column(Text, nullable=False)

    hashtags = Column(
        JSON,
        nullable=False,
        default=list,
    )

    content_format = Column(String(50), nullable=False)
    platform = Column(String(50), nullable=False)

    visual_direction = Column(Text, nullable=False, default="")
    rationale = Column(Text, nullable=False, default="")

    status = Column(
        String(30),
        nullable=False,
        default="draft",
        index=True,
    )

    scheduled_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    published_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )