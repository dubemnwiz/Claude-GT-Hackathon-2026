import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";

export async function fridgeScanFromMessage(input: {
  userId: string;
  messageId: string;
  text: string;
}): Promise<{ handled: boolean; replyText: string }> {
  const assets = await prisma.mediaAsset.findMany({
    where: { messageId: input.messageId },
  });

  // Prefer the uploaded storage URL; fall back to the raw provider URL so
  // attachments work even before the async storage upload completes.
  const imageUrls = assets
    .map((a) => a.storageKey ?? a.providerMediaUrl ?? null)
    .filter((v): v is string => Boolean(v));

  if (!imageUrls.length) return { handled: false, replyText: "" };

  const [goal, rollup, profile] = await Promise.all([
    prisma.goal.findFirst({
      where: { userId: input.userId, active: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dailyRollup.findUnique({
      where: {
        userId_dayDate: {
          userId: input.userId,
          dayDate: startOfDay(new Date()),
        },
      },
    }),
    prisma.profile.findUnique({ where: { userId: input.userId } }),
  ]);

  const caloriesLeft =
    goal?.targetCalories && rollup
      ? Math.max(0, goal.targetCalories - rollup.calories)
      : goal?.targetCalories ?? null;

  const proteinLeft =
    goal?.targetProteinG && rollup
      ? Math.max(0, goal.targetProteinG - rollup.proteinG)
      : goal?.targetProteinG ?? null;

  const goalLabel =
    goal?.goalType === "LOSE"
      ? "losing fat"
      : goal?.goalType === "GAIN"
        ? "building muscle"
        : "maintaining weight";

  const dietPrefs = Array.isArray(profile?.dietaryPreferences)
    ? (profile.dietaryPreferences as string[]).join(", ")
    : null;

  const allergies = Array.isArray(profile?.allergies)
    ? (profile.allergies as string[]).join(", ")
    : null;

  const contextLines = [
    `Goal: ${goalLabel}`,
    caloriesLeft !== null ? `Calories remaining today: ~${Math.round(caloriesLeft)}` : null,
    proteinLeft !== null ? `Protein remaining today: ~${Math.round(proteinLeft)}g` : null,
    dietPrefs ? `Diet prefs: ${dietPrefs}` : null,
    allergies ? `Avoid: ${allergies}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (!env.OPENAI_API_KEY) {
    return {
      handled: true,
      replyText:
        "i can see the image but i need an OpenAI key to analyze it — try describing what's in there and i'll suggest something!",
    };
  }

  try {
    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    }));

    const userText = input.text.trim()
      ? `User said: "${input.text.trim()}"`
      : "What meals can I make or order from what you see?";

    const messages = [
      {
        role: "system" as const,
        content: `You are Sam, a direct nutrition coach. The user sent a photo — fridge/pantry, ingredients on a counter, a restaurant menu, or takeout.

User context:
${contextLines}

Your job: use ONLY what you can see. Do not invent foods that are not plausibly in the image (no "lean beef" or "brown rice" unless visible or clearly packaged). Do not hedge with apologies, "I can't see clearly", "general suggestions", or "common fridge items". Do not use vague phrasing in How lines: ban "if available", "any visible", "assorted", "protein source".

Output structure (exactly this order):
1) First line only: Visible: comma-separated list of specific foods you recognize (max 12). For a menu photo, list dish names you read. If something is unclear, name the category you see (e.g. "green herbs in a pot") — never skip straight to generic recipes.
2) Blank line.
3) 2-3 meal blocks in this exact format:

🍳 **Meal name** (~Xcal, Yg P)
How: one sentence; every ingredient you mention must be on the Visible line or obviously the same item
Why: one short reason tied to their goal and what's in the photo

Rules:
- Menus: suggest specific items to order; use readable menu text
- Fridge/produce-heavy shots: lean on eggs, dairy, legumes, etc. only if they appear; otherwise be honest that protein is light and stack what is there
- Prioritise their protein target without blowing calories when the photo supports it
- No sign-off, no extra paragraphs after the last Why`,
      },
      {
        role: "user" as const,
        content: [
          ...imageContent,
          { type: "text" as const, text: userText },
        ],
      },
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 450,
        temperature: 0.25,
      }),
    });

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) throw new Error("empty response");

    return { handled: true, replyText: reply };
  } catch {
    return {
      handled: true,
      replyText:
        "got the photo but couldn't analyze it right now — describe what's in there and i'll suggest something based on your remaining macros!",
    };
  }
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
