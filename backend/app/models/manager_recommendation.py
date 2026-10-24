
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from backend.app.database import Base


class ManagerRecommendation(Base):
    __tablename__ = "manager_recommendations"

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

    title = Column(
        String(200),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=False,
    )

    reasoning = Column(
        Text,
        nullable=False,
    )

    evidence = Column(
        JSON,
        nullable=False,
        default=list,
    )

    priority = Column(
        String(20),
        nullable=False,
        default="medium",
        index=True,
    )

    category = Column(
        String(50),
        nullable=False,
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="new",
        index=True,
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

    __table_args__ = (
        Index(
            "ix_manager_recommendations_creator_created",
            "creator_id",
            "created_at",
        ),
    )

