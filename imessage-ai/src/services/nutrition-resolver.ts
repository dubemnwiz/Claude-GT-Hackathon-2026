import { formatClarificationReply } from "../lib/coach-voice.js";
import { matchFatSecretNutrition } from "../lib/fatsecret.js";
import { createJsonResponse } from "../lib/openai.js";
import { matchUsdaNutrition } from "../lib/usda.js";
import { getRecentConversationText } from "./conversation-context.js";

type NutritionEstimateInput = {
  userId: string;
  text: string;
  imageUrls: string[];
};

type MealItemEstimate = {
  name: string;
  quantity: number;
  unit: string;
  gramsEstimated: number;
  foodSource: "LLM_ESTIMATE" | "USDA" | "BRANDED";
  foodSourceRef?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sourceReason?: string;
};

type ExtractedMeal = {
  needs_clarification: boolean;
  clarification_question: string | null;
  confidence_score: number;
  meal_label: string;
  items: Array<{
    name: string;
    search_query: string;
    quantity: number | null;
    unit: string | null;
    grams_estimated: number | null;
    estimated_calories: number;
    estimated_protein_g: number;
    estimated_carbs_g: number;
    estimated_fat_g: number;
    estimated_fiber_g: number;
  }>;
};

export async function resolveNutritionEstimate(input: NutritionEstimateInput) {
  const trimmed = input.text.trim();

  if (!trimmed && input.imageUrls.length === 0) {
    return {
      needsClarification: true,
      confidenceScore: 0.2,
      mealLabel: "",
      items: [] as MealItemEstimate[],
      totals: {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
      },
      replyText: "tell me what you ate and i’ll log it.",
    };
  }

  if (!trimmed && input.imageUrls.length > 0) {
    return {
      needsClarification: true,
      confidenceScore: 0.35,
      mealLabel: "",
      items: [] as MealItemEstimate[],
      totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
      replyText: "got the photo! are you logging what you ate, or do you want suggestions on what to make? just say \"log\" or \"what should i eat\"",
    };
  }

  const extracted = await extractMeal({
    userId: input.userId,
    text: trimmed,
    imageUrls: input.imageUrls,
  });

  const normalizedExtracted = normalizeExtractedMeal(extracted);

  if (normalizedExtracted.needs_clarification || normalizedExtracted.items.length === 0) {
    return {
      needsClarification: true,
      confidenceScore: normalizedExtracted.confidence_score,
      mealLabel: normalizedExtracted.meal_label,
      items: [] as MealItemEstimate[],
      totals: {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
      },
      replyText: formatClarificationReply(
        normalizedExtracted.clarification_question ?? "quick check: what exactly was in that meal?",
      ),
    };
  }

  const items: MealItemEstimate[] = [];

  for (const item of normalizedExtracted.items) {
    const gramsEstimated = item.grams_estimated ?? inferGrams(item.quantity, item.unit);
    let fatSecretMatch = null;
    let usdaMatch = null;

    try {
      fatSecretMatch = await matchFatSecretNutrition(item.search_query, gramsEstimated);
    } catch {
      fatSecretMatch = null;
    }

    try {
      usdaMatch = await matchUsdaNutrition(item.search_query, gramsEstimated);
    } catch {
      usdaMatch = null;
    }

    const selectedSource = pickBestSource({
      query: item.search_query,
      llm: {
        calories: item.estimated_calories,
        proteinG: item.estimated_protein_g,
        carbsG: item.estimated_carbs_g,
        fatG: item.estimated_fat_g,
        fiberG: item.estimated_fiber_g,
      },
      fatSecret: fatSecretMatch,
      usda: usdaMatch,
    });

    items.push({
      name: selectedSource.name ?? item.name,
      quantity: item.quantity ?? 1,
      unit: item.unit ?? "serving",
      gramsEstimated,
      foodSource: selectedSource.foodSource,
      foodSourceRef: selectedSource.foodSourceRef,
      calories: selectedSource.calories,
      proteinG: selectedSource.proteinG,
      carbsG: selectedSource.carbsG,
      fatG: selectedSource.fatG,
      fiberG: selectedSource.fiberG,
      sourceReason: selectedSource.reason,
    });
  }

  const totals = items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.proteinG += item.proteinG;
      acc.carbsG += item.carbsG;
      acc.fatG += item.fatG;
      acc.fiberG += item.fiberG;
      return acc;
    },
    {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    },
  );

  return {
    needsClarification: false,
    confidenceScore: normalizedExtracted.confidence_score,
    mealLabel: normalizedExtracted.meal_label || trimmed,
    items,
    totals: {
      calories: roundOne(totals.calories),
      proteinG: roundOne(totals.proteinG),
      carbsG: roundOne(totals.carbsG),
      fatG: roundOne(totals.fatG),
      fiberG: roundOne(totals.fiberG),
    },
    replyText: "",
  };
}

function pickBestSource(input: {
  query: string;
  llm: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  fatSecret: {
    canonicalName: string;
    foodSourceRef: string;
    foodSource: "BRANDED";
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    matchScore: number;
  } | null;
  usda: {
    canonicalName: string;
    foodSourceRef: string;
    foodSource: "USDA";
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    matchScore: number;
  } | null;
}) {
  const restaurantLike = isRestaurantLikeQuery(input.query);
  const bestExternal = input.fatSecret && input.fatSecret.matchScore >= 0.5
    ? input.fatSecret
    : input.usda && input.usda.matchScore >= 0.6
      ? input.usda
      : null;

  if (!bestExternal) {
    return {
      name: input.query,
      foodSource: "LLM_ESTIMATE" as const,
      foodSourceRef: undefined,
      calories: input.llm.calories,
      proteinG: input.llm.proteinG,
      carbsG: input.llm.carbsG,
      fatG: input.llm.fatG,
      fiberG: input.llm.fiberG,
      reason: "no reliable db match",
    };
  }

  if (restaurantLike && bestExternal.proteinG < input.llm.proteinG * 0.7) {
    return {
      name: input.query,
      foodSource: "LLM_ESTIMATE" as const,
      foodSourceRef: undefined,
      calories: input.llm.calories,
      proteinG: input.llm.proteinG,
      carbsG: input.llm.carbsG,
      fatG: input.llm.fatG,
      fiberG: input.llm.fiberG,
      reason: "db match looked too low vs meal context",
    };
  }

  return {
    name: bestExternal.canonicalName,
    foodSource: bestExternal.foodSource === "BRANDED" ? "BRANDED" as const : "USDA" as const,
    foodSourceRef: bestExternal.foodSourceRef,
    calories: bestExternal.calories,
    proteinG: bestExternal.proteinG,
    carbsG: bestExternal.carbsG,
    fatG: bestExternal.fatG,
    fiberG: bestExternal.fiberG,
    reason: bestExternal.foodSource === "BRANDED" ? "fatsecret match" : "usda match",
  };
}

function isRestaurantLikeQuery(query: string) {
  const lower = query.toLowerCase();
  const keywords = [
    "chipotle",
    "cava",
    "sweetgreen",
    "chick",
    "mcdonald",
    "subway",
    "starbucks",
    "panera",
    "shake shack",
    "taco bell",
    "bowl",
    "burrito",
    "sandwich",
    "wrap",
  ];

  return keywords.some((keyword) => lower.includes(keyword));
}

async function extractMeal(input: { userId: string; text: string; imageUrls: string[] }) {
  const conversation = await getRecentConversationText(input.userId);
  const content = [
    {
      type: "input_text" as const,
      text: `recent conversation:\n${conversation}\n\nuser message: ${input.text}`,
    },
    ...input.imageUrls.map((imageUrl) => ({
      type: "input_image" as const,
      image_url: imageUrl,
    })),
  ];

  try {
    return await createJsonResponse<ExtractedMeal>({
      instructions:
        "you are extracting meal logs for a nutrition coach. identify foods, estimate grams, and estimate macros per item. if the meal is too ambiguous to log responsibly, set needs_clarification true and ask exactly one short question. prefer being useful over perfect. very important: if the user names a single branded or restaurant menu item, keep it as one item and do not break it into bun, chicken, cheese, sauce, or toppings unless the user explicitly lists separate add-ons or multiple menu items. branded or restaurant items should keep their identifying words in search_query.",
      content,
      schemaName: "meal_extraction",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          needs_clarification: { type: "boolean" },
          clarification_question: { type: ["string", "null"] },
          confidence_score: { type: "number" },
          meal_label: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                search_query: { type: "string" },
                quantity: { type: ["number", "null"] },
                unit: { type: ["string", "null"] },
                grams_estimated: { type: ["number", "null"] },
                estimated_calories: { type: "number" },
                estimated_protein_g: { type: "number" },
                estimated_carbs_g: { type: "number" },
                estimated_fat_g: { type: "number" },
                estimated_fiber_g: { type: "number" },
              },
              required: [
                "name",
                "search_query",
                "quantity",
                "unit",
                "grams_estimated",
                "estimated_calories",
                "estimated_protein_g",
                "estimated_carbs_g",
                "estimated_fat_g",
                "estimated_fiber_g",
              ],
            },
          },
        },
        required: [
          "needs_clarification",
          "clarification_question",
          "confidence_score",
          "meal_label",
          "items",
        ],
      },
    });
  } catch {
    return fallbackExtractMeal(input.text);
  }
}

function inferGrams(quantity: number | null, unit: string | null) {
  if (!quantity) {
    return 100;
  }

  const normalizedUnit = unit?.toLowerCase() ?? "";

  if (normalizedUnit.includes("cup")) {
    return quantity * 240;
  }

  if (normalizedUnit.includes("oz")) {
    return quantity * 28.35;
  }

  if (normalizedUnit.includes("tbsp")) {
    return quantity * 15;
  }

  if (normalizedUnit.includes("tsp")) {
    return quantity * 5;
  }

  return quantity * 100;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function fallbackExtractMeal(text: string): ExtractedMeal {
  const parts = text
    .split(/,| and /i)
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    needs_clarification: false,
    clarification_question: null,
    confidence_score: 0.45,
    meal_label: text,
    items: parts.map((part) => ({
      name: part,
      search_query: part,
      quantity: 1,
      unit: "serving",
      grams_estimated: 180,
      estimated_calories: 350,
      estimated_protein_g: 18,
      estimated_carbs_g: 30,
      estimated_fat_g: 14,
      estimated_fiber_g: 4,
    })),
  };
}

function normalizeExtractedMeal(extracted: ExtractedMeal): ExtractedMeal {
  if (extracted.items.length <= 1) {
    return extracted;
  }

  const lowerMealLabel = extracted.meal_label.toLowerCase();
  const looksLikeSingleBrandedItem =
    extracted.items.length > 1 &&
    isRestaurantLikeQuery(lowerMealLabel) &&
    !/\band\b|,/.test(lowerMealLabel);

  if (!looksLikeSingleBrandedItem) {
    return {
      ...extracted,
      items: dedupeNearDuplicateItems(extracted.items),
    };
  }

  const merged = mergeItemsIntoSingleMenuItem(extracted);

  return {
    ...extracted,
    items: [merged],
  };
}

function dedupeNearDuplicateItems(items: ExtractedMeal["items"]) {
  const kept: ExtractedMeal["items"] = [];

  for (const item of items) {
    const normalizedName = normalizeItemKey(item.name);
    const hasSimilar = kept.some((existing) => similarityScore(normalizeItemKey(existing.name), normalizedName) >= 0.8);

    if (!hasSimilar) {
      kept.push(item);
    }
  }

  return kept;
}

function mergeItemsIntoSingleMenuItem(extracted: ExtractedMeal) {
  const total = extracted.items.reduce(
    (acc, item) => {
      acc.estimated_calories += item.estimated_calories;
      acc.estimated_protein_g += item.estimated_protein_g;
      acc.estimated_carbs_g += item.estimated_carbs_g;
      acc.estimated_fat_g += item.estimated_fat_g;
      acc.estimated_fiber_g += item.estimated_fiber_g;
      acc.grams_estimated += item.grams_estimated ?? 0;
      return acc;
    },
    {
      estimated_calories: 0,
      estimated_protein_g: 0,
      estimated_carbs_g: 0,
      estimated_fat_g: 0,
      estimated_fiber_g: 0,
      grams_estimated: 0,
    },
  );

  return {
    name: extracted.meal_label,
    search_query: extracted.meal_label,
    quantity: 1,
    unit: "item",
    grams_estimated: total.grams_estimated || null,
    estimated_calories: total.estimated_calories,
    estimated_protein_g: total.estimated_protein_g,
    estimated_carbs_g: total.estimated_carbs_g,
    estimated_fat_g: total.estimated_fat_g,
    estimated_fiber_g: total.estimated_fiber_g,
  };
}

function normalizeItemKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(chick|fil|chick-fil-a|a)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(left: string, right: string) {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}
