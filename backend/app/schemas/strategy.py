from pydantic import BaseModel, Field


class ContentPillar(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=10, max_length=500)
    percentage: int = Field(..., ge=0, le=100)
    example_ideas: list[str] = Field(
        default_factory=list,
        max_length=10,
    )


class WeeklyAction(BaseModel):
    day: str = Field(..., min_length=2, max_length=20)
    action: str = Field(..., min_length=5, max_length=300)
    content_format: str = Field(..., min_length=2, max_length=50)


class CreatorStrategy(BaseModel):
    creator_id: str
    strategy_title: str = Field(..., min_length=5, max_length=150)
    overview: str = Field(..., min_length=20, max_length=1000)

    primary_goal: str = Field(..., min_length=2, max_length=150)
    target_audience: str = Field(..., min_length=5, max_length=500)

    content_pillars: list[ContentPillar] = Field(
        ...,
        min_length=1,
        max_length=8,
    )

    weekly_actions: list[WeeklyAction] = Field(
        ...,
        min_length=1,
        max_length=14,
    )

    growth_recommendations: list[str] = Field(
        ...,
        min_length=1,
        max_length=10,
    )

    success_metrics: list[str] = Field(
        ...,
        min_length=1,
        max_length=10,
    )