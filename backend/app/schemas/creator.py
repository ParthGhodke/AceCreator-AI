from pydantic import BaseModel, Field, field_validator


class CreatorProfile(BaseModel):
    creatorName: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    creatorType: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    bio: str = Field(
        ...,
        min_length=10,
        max_length=1000,
    )

    instagram: str = Field(default="", max_length=255)

    # Retained with empty defaults so existing database records and payloads remain compatible.
    youtube: str = Field(default="", max_length=255)
    tiktok: str = Field(default="", max_length=255)
    otherPlatform: str = Field(default="", max_length=255)

    goals: list[str] = Field(
        default_factory=list,
        min_length=1,
    )

    niche: str = Field(
        ...,
        min_length=2,
        max_length=200,
    )

    contentFormats: list[str] = Field(
        default_factory=list,
        min_length=1,
    )

    postingFrequency: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    targetAudience: str = Field(
        ...,
        min_length=5,
        max_length=500,
    )

    @field_validator("creatorName", "creatorType", "bio", "niche", "postingFrequency", "targetAudience")
    @classmethod
    def strip_required_fields(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be blank.")
        return cleaned


class CreatorProfileResponse(CreatorProfile):
    id: str