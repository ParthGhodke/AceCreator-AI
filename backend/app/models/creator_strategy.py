
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


class CreatorStrategyRecord(Base):
    __tablename__ = "creator_strategies"

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

    strategy_title = Column(
        String(150),
        nullable=False,
    )

    overview = Column(
        Text,
        nullable=False,
    )

    primary_goal = Column(
        String(150),
        nullable=False,
    )

    target_audience = Column(
        Text,
        nullable=False,
    )

    content_pillars = Column(
        JSON,
        nullable=False,
    )

    weekly_actions = Column(
        JSON,
        nullable=False,
    )

    growth_recommendations = Column(
        JSON,
        nullable=False,
    )

    success_metrics = Column(
        JSON,
        nullable=False,
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
