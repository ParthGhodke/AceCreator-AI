import type { CreatorProfile } from "@/lib/creator-profile";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const ACCESS_TOKEN_STORAGE_KEY = "acecreator_access_token";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getStoredAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function readApiResponse<T>(
  response: Response,
  fallbackMessage = "The request failed. Please try again.",
): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (Array.isArray(data?.detail)) {
      const messages = data.detail
        .map((error: { loc?: string[]; msg?: string }) => {
          const field = error.loc?.[error.loc.length - 1];
          return field
            ? `${field}: ${error.msg || "Invalid value"}`
            : error.msg || "Invalid value";
        })
        .join(", ");

      throw new Error(messages || fallbackMessage);
    }

    throw new Error(
      typeof data?.detail === "string" ? data.detail : fallbackMessage,
    );
  }

  return data as T;
}

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
};

export type AuthSession = {
  user: AuthUser;
  access_token: string;
  token_type: string;
  expires_in: number;
};

export async function registerUser(payload: {
  email: string;
  full_name: string;
  password: string;
}): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const session = await readApiResponse<AuthSession>(
    response,
    "Unable to create account.",
  );
  setStoredAccessToken(session.access_token);
  return session;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const session = await readApiResponse<AuthSession>(
    response,
    "Invalid email or password.",
  );
  setStoredAccessToken(session.access_token);
  return session;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
  } finally {
    setStoredAccessToken(null);
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}

export async function createCreator(
  profile: CreatorProfile,
): Promise<CreatorProfile & { id: string }> {
  const response = await fetch(`${API_BASE_URL}/api/creators`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(profile),
  });

  return readApiResponse<CreatorProfile & { id: string }>(
    response,
    "Failed to create creator profile.",
  );
}

export async function getLatestCreator(): Promise<
  CreatorProfile & { id: string }
> {
  const response = await fetch(`${API_BASE_URL}/api/creators/latest`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  return readApiResponse<CreatorProfile & { id: string }>(
    response,
    "Failed to load creator profile.",
  );
}

export type ContentPillar = {
  name: string;
  description: string;
  percentage: number;
  example_ideas: string[];
};

export type WeeklyAction = {
  day: string;
  action: string;
  content_format: string;
};

export type CreatorStrategy = {
  id?: string;
  creator_id: string;
  strategy_title: string;
  overview: string;
  primary_goal: string;
  target_audience: string;
  content_pillars: ContentPillar[];
  weekly_actions: WeeklyAction[];
  growth_recommendations: string[];
  success_metrics: string[];
  created_at?: string;
  updated_at?: string;
};

export type StrategyHistoryItem = {
  id: string;
  creator_id: string;
  strategy_title: string;
  primary_goal: string;
  created_at: string;
  updated_at: string;
};

export async function getCreatorStrategy(
  creatorId: string,
): Promise<CreatorStrategy> {
  const response = await fetch(
    `${API_BASE_URL}/api/creators/${creatorId}/strategy`,
    {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return readApiResponse<CreatorStrategy>(
    response,
    "Failed to load creator strategy.",
  );
}

export async function regenerateCreatorStrategy(
  creatorId: string,
): Promise<CreatorStrategy> {
  const response = await fetch(
    `${API_BASE_URL}/api/creators/${creatorId}/strategy/regenerate`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return readApiResponse<CreatorStrategy>(
    response,
    "Unable to regenerate your strategy. Please try again.",
  );
}

export async function getCreatorStrategyHistory(
  creatorId: string,
  limit = 20,
  offset = 0,
): Promise<StrategyHistoryItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/creators/${creatorId}/strategies?limit=${limit}&offset=${offset}`,
    {
      credentials: "include",
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return readApiResponse<StrategyHistoryItem[]>(
    response,
    "Unable to load strategy history.",
  );
}

export async function getCreatorStrategyVersion(
  creatorId: string,
  strategyId: string,
): Promise<CreatorStrategy> {
  const response = await fetch(
    `${API_BASE_URL}/api/creators/${creatorId}/strategies/${strategyId}`,
    {
      credentials: "include",
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return readApiResponse<CreatorStrategy>(
    response,
    "Unable to load this saved strategy version.",
  );
}

export type InstagramFormat = "Reel" | "Carousel" | "Story" | "Static Post";
export type DraftStatus = "draft" | "ready" | "scheduled" | "published";

export type GeneratedContentDraft = {
  id: string;
  creator_id: string;
  title: string;
  topic: string;
  hook: string;
  caption: string;
  call_to_action: string;
  hashtags: string[];
  content_format: InstagramFormat;
  platform: "Instagram";
  visual_direction: string;
  rationale: string;
  status: DraftStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getContentDrafts(options: {
  limit?: number;
  offset?: number;
  statusFilter?: DraftStatus;
} = {}): Promise<GeneratedContentDraft[]> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 100),
    offset: String(options.offset ?? 0),
  });

  if (options.statusFilter) {
    params.set("status_filter", options.statusFilter);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/content-drafts?${params.toString()}`,
    {
      credentials: "include",
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return readApiResponse<GeneratedContentDraft[]>(
    response,
    "Unable to load saved content drafts.",
  );
}

export type RecommendationPriority = "low" | "medium" | "high";

export type RecommendationCategory =
  | "content"
  | "engagement"
  | "consistency"
  | "analytics"
  | "strategy"
  | "audience";

export type RecommendationStatus =
  | "new"
  | "in_progress"
  | "completed"
  | "dismissed";

export type ManagerRecommendation = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  reasoning: string;
  evidence: string[];
  priority: RecommendationPriority;
  category: RecommendationCategory;
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
};

export type ManagerRecommendationList = {
  items: ManagerRecommendation[];
  total: number;
  limit: number;
  offset: number;
};

export async function getManagerRecommendations(
  creatorId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: RecommendationStatus | "all";
  } = {},
): Promise<ManagerRecommendationList> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 10),
    offset: String(options.offset ?? 0),
  });

  if (options.status && options.status !== "all") {
    params.set("status_filter", options.status);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/creators/${creatorId}/manager/recommendations?${params}`,
    {
      credentials: "include",
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return readApiResponse<ManagerRecommendationList>(
    response,
    "Unable to load recommendations.",
  );
}

export async function generateManagerRecommendations(
  creatorId: string,
): Promise<ManagerRecommendation[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/creators/${creatorId}/manager/recommendations/generate`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
    },
  );

  return readApiResponse<ManagerRecommendation[]>(
    response,
    "Unable to generate recommendations.",
  );
}

export async function updateManagerRecommendationStatus(
  creatorId: string,
  recommendationId: string,
  status: RecommendationStatus,
): Promise<ManagerRecommendation> {
  const response = await fetch(
    `${API_BASE_URL}/api/creators/${creatorId}/manager/recommendations/${recommendationId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status }),
    },
  );

  return readApiResponse<ManagerRecommendation>(
    response,
    "Unable to update recommendation status.",
  );
}

export async function generateDraftFromRecommendation(
  creatorId: string,
  recommendationId: string,
  options: {
    topic: string;
    contentFormat: InstagramFormat;
    platform?: "Instagram";
  },
): Promise<GeneratedContentDraft> {
  const response = await fetch(
    `${API_BASE_URL}/api/creators/${creatorId}/manager/recommendations/${recommendationId}/generate-draft`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        topic: options.topic,
        content_format: options.contentFormat,
        platform: options.platform ?? "Instagram",
      }),
    },
  );

  return readApiResponse<GeneratedContentDraft>(
    response,
    "Unable to generate a draft from this recommendation.",
  );
}
