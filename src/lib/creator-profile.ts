export type CreatorProfile = {
  creatorName: string;
  creatorType: string;
  bio: string;

  instagram: string;

  goals: string[];

  niche: string;
  contentFormats: string[];
  postingFrequency: string;
  targetAudience: string;

  completedAt?: string;
};

export const CREATOR_PROFILE_KEY = "acecreator_creator_profile";

export function saveCreatorProfile(profile: CreatorProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    CREATOR_PROFILE_KEY,
    JSON.stringify(profile)
  );
}

export function getCreatorProfile(): CreatorProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedProfile = localStorage.getItem(
    CREATOR_PROFILE_KEY
  );

  if (!savedProfile) {
    return null;
  }

  try {
    return JSON.parse(savedProfile) as CreatorProfile;
  } catch {
    console.error("Failed to parse creator profile.");
    return null;
  }
}

export function deleteCreatorProfile(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(CREATOR_PROFILE_KEY);
}