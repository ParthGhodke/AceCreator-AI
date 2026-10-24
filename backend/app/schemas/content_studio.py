from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ContentGenerationRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=300)
    content_format: Literal[
        "Reel",
        "Carousel",
        "Story",
        "Static Post",
    ]
    platform: Literal["Instagram"] = "Instagram"

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 3:
            raise ValueError("Topic must contain at least 3 characters.")

        return value