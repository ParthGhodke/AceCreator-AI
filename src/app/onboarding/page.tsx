"use client";

import { createCreator } from "@/lib/api";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Music2,
  User,
  Target,
  Sparkles,
  AlertCircle,
  Camera,
} from "lucide-react";

import {
  saveCreatorProfile,
  type CreatorProfile,
} from "@/lib/creator-profile";


const steps = [
  {
    number: 1,
    title: "About You",
    icon: User,
  },
  {
    number: 2,
    title: "Instagram",
    icon: Camera,
  },
  {
    number: 3,
    title: "Goals",
    icon: Target,
  },
  {
    number: 4,
    title: "Content",
    icon: Music2,
  },
  {
    number: 5,
    title: "Review",
    icon: Check,
  },
];

const creatorTypes = [
  "Musician",
  "Artist",
  "Cinematographer",
  "Video Editor",
  "Influencer",
  "Photographer",
  "Designer",
  "Content Creator",
  "Other",
];

const goals = [
  "Grow Followers",
  "Increase Engagement",
  "Get More Views",
  "Build Personal Brand",
  "Generate Income",
];

const contentFormats = [
  "Reel",
  "Carousel",
  "Story",
  "Static Post",
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    creatorName: "",
    creatorType: "",
    bio: "",

    instagram: "",

    goals: [] as string[],

    niche: "",
    contentFormats: [] as string[],
    postingFrequency: "",
    targetAudience: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setError("");
  };

  const toggleArrayValue = (
    field: "goals" | "contentFormats",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));

    setError("");
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (formData.creatorName.trim().length < 2) {
        setError("Please enter your creator or brand name (at least 2 characters).");
        return false;
      }

      if (!formData.creatorType) {
        setError("Please select your creator type.");
        return false;
      }

      if (formData.bio.trim().length < 10) {
        setError("Please write at least 10 characters about your content.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (formData.goals.length === 0) {
        setError("Please select at least one goal.");
        return false;
      }
    }

    if (currentStep === 4) {
      if (formData.niche.trim().length < 2) {
        setError("Please enter your main niche or content category.");
        return false;
      }

      if (formData.contentFormats.length === 0) {
        setError("Please select at least one Instagram content format.");
        return false;
      }

      if (!formData.postingFrequency) {
        setError("Please select your posting frequency.");
        return false;
      }

      if (formData.targetAudience.trim().length < 5) {
        setError("Please describe your target audience (at least 5 characters).");
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    setError("");

    if (!validateStep()) {
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const previousStep = () => {
    setError("");

    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCreateStrategy = async () => {
    const isValid = validateStep();

    if (!isValid || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    const creatorProfile: CreatorProfile = {
      ...formData,
      completedAt: new Date().toISOString(),
    };

    try {
      await createCreator(creatorProfile);

      saveCreatorProfile(creatorProfile);

      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating your profile."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>

            <span className="text-lg font-bold tracking-tight">
              AceCreator AI
            </span>
          </div>

          <span className="text-sm text-muted-foreground">
            Instagram Creator Setup
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                Step {currentStep} of 5
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Build your Instagram creator profile
              </h1>
            </div>

            <p className="text-sm text-muted-foreground">
              {Math.round((currentStep / 5) * 100)}% complete
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${(currentStep / 5) * 100}%`,
              }}
            />
          </div>

          <div className="mt-6 grid grid-cols-5 gap-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const active = currentStep === step.number;
              const completed = currentStep > step.number;

              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => {
                    if (step.number <= currentStep) {
                      setError("");
                      setCurrentStep(step.number);
                    }
                  }}
                  className="group text-left"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition ${
                        completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>

                    <span
                      className={`hidden text-xs font-medium md:block ${
                        active
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-4xl rounded-3xl border bg-card p-6 shadow-sm md:p-10">
          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <p className="mb-2 text-sm font-medium text-primary">
                  Let&apos;s start with the basics
                </p>

                <h2 className="text-3xl font-bold tracking-tight">
                  Tell us about yourself
                </h2>

                <p className="mt-2 text-muted-foreground">
                  This helps AceCreator understand who you are and what kind
                  of Instagram creator you are.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Creator / Brand Name
                  </label>

                  <input
                    value={formData.creatorName}
                    onChange={(e) =>
                      updateField("creatorName", e.target.value)
                    }
                    placeholder="e.g. Parth Ghodke"
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium">
                    What type of creator are you?
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {creatorTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField("creatorType", type)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                          formData.creatorType === type
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:border-primary/40 hover:bg-muted/50"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tell us about your content
                  </label>

                  <textarea
                    value={formData.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="What do you create on Instagram? What makes your style or voice distinct?"
                    rows={5}
                    className="w-full resize-none rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />

                  <p className="mt-2 text-xs text-muted-foreground">
                    Write at least 10 characters. AceCreator will use this to personalize your strategy and hooks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <p className="mb-2 text-sm font-medium text-primary">
                  Instagram presence
                </p>

                <h2 className="text-3xl font-bold tracking-tight">
                  Your Instagram account
                </h2>

                <p className="mt-2 text-muted-foreground">
                  AceCreator AI is purpose-built for Instagram growth—helping you plan Reels, Carousels, Stories, and Static Posts.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Camera className="h-4 w-4" />
                    Instagram Handle (optional)
                  </label>

                  <input
                    value={formData.instagram}
                    onChange={(e) =>
                      updateField("instagram", e.target.value)
                    }
                    placeholder="@yourusername"
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Used to label your workspace and personalize Instagram strategy recommendations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <p className="mb-2 text-sm font-medium text-primary">
                  Your objectives
                </p>

                <h2 className="text-3xl font-bold tracking-tight">
                  What do you want to achieve on Instagram?
                </h2>

                <p className="mt-2 text-muted-foreground">
                  Select all goals that matter to you.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {goals.map((goal) => {
                  const selected = formData.goals.includes(goal);

                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleArrayValue("goals", goal)}
                      className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-medium">{goal}</span>

                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {selected && <Check className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8">
              <div>
                <p className="mb-2 text-sm font-medium text-primary">
                  Your content strategy
                </p>

                <h2 className="text-3xl font-bold tracking-tight">
                  Help us understand your Instagram content
                </h2>

                <p className="mt-2 text-muted-foreground">
                  The more context you provide, the better your AI strategy
                  becomes.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Main niche / category
                  </label>

                  <input
                    value={formData.niche}
                    onChange={(e) => updateField("niche", e.target.value)}
                    placeholder="e.g. Hip-Hop Music, Street Photography, Color Grading"
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium">
                    Which Instagram formats do you create?
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {contentFormats.map((format) => {
                      const selected =
                        formData.contentFormats.includes(format);

                      return (
                        <button
                          key={format}
                          type="button"
                          onClick={() =>
                            toggleArrayValue("contentFormats", format)
                          }
                          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            {format}

                            {selected && (
                              <Check className="h-4 w-4" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    How often do you currently post?
                  </label>

                  <select
                    value={formData.postingFrequency}
                    onChange={(e) =>
                      updateField("postingFrequency", e.target.value)
                    }
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select frequency</option>
                    <option value="Daily">Daily</option>
                    <option value="3-5 times a week">
                      3–5 times a week
                    </option>
                    <option value="1-2 times a week">
                      1–2 times a week
                    </option>
                    <option value="A few times a month">
                      A few times a month
                    </option>
                    <option value="Rarely">Rarely</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Who is your target audience?
                  </label>

                  <textarea
                    value={formData.targetAudience}
                    onChange={(e) =>
                      updateField("targetAudience", e.target.value)
                    }
                    placeholder="Describe the people you want your Instagram content to reach..."
                    rows={4}
                    className="w-full resize-none rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-8">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>

                <h2 className="text-3xl font-bold tracking-tight">
                  Your creator profile is ready
                </h2>

                <p className="mt-2 text-muted-foreground">
                  Review your information before we build your personalized
                  Instagram strategy.
                </p>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border p-5">
                  <h3 className="mb-4 font-semibold">About You</h3>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      {formData.creatorName || "Not provided"}
                    </p>

                    <p>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      {formData.creatorType || "Not provided"}
                    </p>

                    <p>
                      <span className="text-muted-foreground">Bio:</span>{" "}
                      {formData.bio || "Not provided"}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border p-5">
                  <h3 className="mb-4 font-semibold">Instagram Account</h3>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">
                        Instagram:
                      </span>{" "}
                      {formData.instagram || "Not provided"}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border p-5">
                  <h3 className="mb-4 font-semibold">Goals</h3>

                  <div className="flex flex-wrap gap-2">
                    {formData.goals.length > 0 ? (
                      formData.goals.map((goal) => (
                        <span
                          key={goal}
                          className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                        >
                          {goal}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No goals selected
                      </span>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border p-5">
                  <h3 className="mb-4 font-semibold">Content</h3>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Niche:</span>{" "}
                      {formData.niche || "Not provided"}
                    </p>

                    <p>
                      <span className="text-muted-foreground">
                        Instagram Formats:
                      </span>{" "}
                      {formData.contentFormats.length > 0
                        ? formData.contentFormats.join(", ")
                        : "Not provided"}
                    </p>

                    <p>
                      <span className="text-muted-foreground">
                        Posting:
                      </span>{" "}
                      {formData.postingFrequency || "Not provided"}
                    </p>

                    <p>
                      <span className="text-muted-foreground">
                        Audience:
                      </span>{" "}
                      {formData.targetAudience || "Not provided"}
                    </p>
                  </div>
                </section>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

                  <div>
                    <p className="font-semibold">
                      Next: AI Instagram Strategy
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      AceCreator will use this profile to generate personalized
                      Instagram content strategies, Reel ideas, hooks, captions, and growth
                      recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t pt-6">
            <button
              type="button"
              onClick={previousStep}
              disabled={currentStep === 1 || submitting}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreateStrategy}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Saving Profile..." : "Create My Strategy"}
                <Sparkles className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}