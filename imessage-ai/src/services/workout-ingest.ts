import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { updateDailyRollup } from "./rollups.js";

interface ParsedWorkout {
  workoutLabel: string;
  exercises: { name: string; muscleGroups: string[]; sets?: number; reps?: number; weightLbs?: number }[];
  muscleGroups: string[];
  durationMin: number | null;
  caloriesBurned: number;
  summary: string;
}

const MUSCLE_GROUP_MAP: Record<string, string[]> = {
  // Push
  "bench press": ["chest", "triceps", "shoulders"],
  "push up": ["chest", "triceps", "shoulders"],
  "overhead press": ["shoulders", "triceps"],
  "shoulder press": ["shoulders", "triceps"],
  "tricep": ["triceps"],
  "chest fly": ["chest"],
  "dips": ["triceps", "chest"],
  // Pull
  "pull up": ["back", "biceps"],
  "chin up": ["back", "biceps"],
  "row": ["back", "biceps"],
  "lat pulldown": ["back", "biceps"],
  "deadlift": ["back", "hamstrings", "glutes"],
  "bicep curl": ["biceps"],
  // Legs
  "squat": ["quads", "glutes", "hamstrings"],
  "leg press": ["quads", "glutes"],
  "lunge": ["quads", "glutes", "hamstrings"],
  "leg curl": ["hamstrings"],
  "leg extension": ["quads"],
  "calf raise": ["calves"],
  "hip thrust": ["glutes"],
  // Cardio / full body
  "run": ["quads", "hamstrings", "calves"],
  "jog": ["quads", "hamstrings", "calves"],
  "sprint": ["quads", "hamstrings", "calves"],
  "bike": ["quads", "hamstrings", "calves"],
  "cycle": ["quads", "hamstrings", "calves"],
  "swim": ["back", "shoulders", "chest"],
  "plank": ["abs"],
  "crunch": ["abs"],
  "sit up": ["abs"],
  "ab workout": ["abs"],
  "abs workout": ["abs"],
  "core workout": ["abs"],
  "ab circuit": ["abs"],
};

function estimateMuscleGroups(label: string): string[] {
  const lower = label.toLowerCase();
  const hit = new Set<string>();

  if (/push\s*day/.test(lower) || /pushing/.test(lower)) {
    ["chest", "triceps", "shoulders"].forEach(m => hit.add(m));
  }
  if (/pull\s*day/.test(lower) || /pulling/.test(lower)) {
    ["back", "biceps"].forEach(m => hit.add(m));
  }
  if (/leg\s*day/.test(lower)) {
    ["quads", "hamstrings", "glutes", "calves"].forEach(m => hit.add(m));
  }

  for (const [key, muscles] of Object.entries(MUSCLE_GROUP_MAP)) {
    if (lower.includes(key)) {
      muscles.forEach(m => hit.add(m));
    }
  }

  return Array.from(hit);
}

// METs for calorie estimation: calories = MET * weight_kg * hours
const ACTIVITY_METS: Record<string, number> = {
  run: 9.8,
  jog: 7.0,
  sprint: 14.0,
  bike: 7.5,
  cycle: 7.5,
  swim: 8.0,
  walk: 3.5,
  "weight training": 5.0,
  "strength training": 5.0,
  hiit: 10.0,
  yoga: 2.5,
};

function estimateCaloriesBurned(
  label: string,
  durationMin: number | null,
  weightKg: number | null,
  distanceMiles?: number | null,
): number {
  const lower = label.toLowerCase();
  const kg = weightKg ?? 80;
  const dur = durationMin ?? 45;

  // Running: ~70 kcal/mile * weight_factor
  if ((lower.includes("run") || lower.includes("jog")) && distanceMiles) {
    const factor = kg / 70;
    return Math.round(distanceMiles * 70 * factor);
  }

  // Look for matching MET
  for (const [key, met] of Object.entries(ACTIVITY_METS)) {
    if (lower.includes(key)) {
      return Math.round(met * kg * (dur / 60));
    }
  }

  // Default: moderate weight training
  return Math.round(5.0 * kg * (dur / 60));
}

async function parseWorkoutWithGPT(
  text: string,
  weightKg: number | null,
): Promise<ParsedWorkout | null> {
  if (!env.OPENAI_API_KEY) return null;

  const prompt = `You are a fitness parser. Extract workout details from this message and return ONLY valid JSON.

Message: "${text}"

Return this exact JSON structure:
{
  "workoutLabel": "short workout name e.g. Push Day, 3mi Run, Upper Body",
  "exercises": [
    { "name": "exercise name", "muscleGroups": ["chest","triceps"], "sets": 3, "reps": 10, "weightLbs": null }
  ],
  "muscleGroups": ["all unique muscle groups hit"],
  "durationMin": null,
  "distanceMiles": null,
  "isWorkout": true
}

Rules:
- For "push day": include bench, overhead press, tricep exercises
- For "pull day": include rows, pull-ups, bicep exercises  
- For runs: extract miles/km, convert to miles
- If not a workout message at all, set isWorkout: false
- muscleGroups must be from: chest, back, quads, hamstrings, shoulders, biceps, triceps, abs, glutes, calves, forearms
- durationMin: extract if mentioned (e.g. "30 min", "an hour" = 60)`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      isWorkout: boolean;
      workoutLabel: string;
      exercises: { name: string; muscleGroups: string[]; sets?: number; reps?: number; weightLbs?: number }[];
      muscleGroups: string[];
      durationMin: number | null;
      distanceMiles: number | null;
    };

    if (!parsed.isWorkout) return null;

    const caloriesBurned = estimateCaloriesBurned(
      parsed.workoutLabel + " " + text,
      parsed.durationMin,
      weightKg,
      parsed.distanceMiles,
    );

    const parts: string[] = [];
    if (parsed.durationMin) parts.push(`${parsed.durationMin} min`);
    if (parsed.distanceMiles) parts.push(`${parsed.distanceMiles} mi`);
    parts.push(`~${caloriesBurned} cal burned`);

    return {
      workoutLabel: parsed.workoutLabel,
      exercises: parsed.exercises ?? [],
      muscleGroups: parsed.muscleGroups?.length ? parsed.muscleGroups : estimateMuscleGroups(parsed.workoutLabel),
      durationMin: parsed.durationMin,
      caloriesBurned,
      summary: parts.join(" · "),
    };
  } catch {
    return null;
  }
}

function fallbackParse(text: string, weightKg: number | null): ParsedWorkout | null {
  const lower = text.toLowerCase();
  const isPush = /push\s*(day)?/.test(lower);
  const isPull = /pull\s*(day)?/.test(lower);
  const isLeg = /leg\s*(day)?/.test(lower);
  const runMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mile|mi)\s*run/);
  const isCardio = /\b(ran|run|jog|bike|cycle|swim|walked)\b/.test(lower);
  const isAbCore =
    /\b(ab|abs|core)\s+(workout|circuit|routine)\b/.test(lower) ||
    /\b\d+\s*(?:min|minutes?)\s+(?:of\s+)?(?:ab|abs|core)(?:\s+workout)?\b/.test(lower) ||
    (/\b(?:did|done|crushed|finished)\b/.test(lower) &&
      /\b(ab|abs|core)\b/.test(lower) &&
      /\b(workout|circuit|routine|session)\b/.test(lower));

  if (!isPush && !isPull && !isLeg && !runMatch && !isCardio && !isAbCore) return null;

  let label = "Workout";
  let muscleGroups: string[] = [];

  if (isPush) { label = "Push Day"; muscleGroups = ["chest", "triceps", "shoulders"]; }
  else if (isPull) { label = "Pull Day"; muscleGroups = ["back", "biceps"]; }
  else if (isLeg) { label = "Leg Day"; muscleGroups = ["quads", "hamstrings", "glutes", "calves"]; }
  else if (runMatch) { label = `${runMatch[1]}mi Run`; muscleGroups = ["quads", "hamstrings", "calves"]; }
  else if (isCardio) { label = "Cardio"; muscleGroups = ["quads", "hamstrings", "calves"]; }
  else if (isAbCore) { label = "Ab Workout"; muscleGroups = ["abs"]; }

  const miles = runMatch ? parseFloat(runMatch[1]) : null;
  const durMatch = lower.match(/(\d+)\s*(?:min|minute)/);
  const durationMin = durMatch ? parseInt(durMatch[1]) : null;
  const caloriesBurned = estimateCaloriesBurned(label + " " + text, durationMin, weightKg, miles);

  const parts: string[] = [];
  if (durationMin) parts.push(`${durationMin} min`);
  if (miles) parts.push(`${miles} mi`);
  parts.push(`~${caloriesBurned} cal burned`);

  return {
    workoutLabel: label,
    exercises: [],
    muscleGroups,
    durationMin,
    caloriesBurned,
    summary: parts.join(" · "),
  };
}

export async function ingestWorkoutMessage(input: {
  userId: string;
  text: string;
}): Promise<{ handled: boolean; replyText?: string }> {
  const profile = await prisma.profile.findUnique({ where: { userId: input.userId } });
  const weightKg = profile?.currentWeightKg ?? null;

  const parsed =
    (await parseWorkoutWithGPT(input.text, weightKg)) ??
    fallbackParse(input.text, weightKg);

  if (!parsed) return { handled: false };

  await prisma.workoutEvent.create({
    data: {
      userId: input.userId,
      rawText: input.text,
      workoutLabel: parsed.workoutLabel,
      exercises: parsed.exercises.length ? parsed.exercises : undefined,
      muscleGroups: parsed.muscleGroups,
      durationMin: parsed.durationMin,
      caloriesBurned: parsed.caloriesBurned,
    },
  });

  await updateDailyRollup(input.userId);

  const goal = await prisma.goal.findFirst({
    where: { userId: input.userId, active: true },
    orderBy: { createdAt: "desc" },
  });

  const rollup = await prisma.dailyRollup.findUnique({
    where: {
      userId_dayDate: {
        userId: input.userId,
        dayDate: startOfDay(new Date()),
      },
    },
  });

  const netCalories = rollup
    ? Math.round(rollup.calories - rollup.caloriesBurned)
    : null;

  const calTarget = goal?.targetCalories;
  const remainingNet = calTarget && netCalories !== null ? calTarget - netCalories : null;

  const muscles = parsed.muscleGroups.slice(0, 3).join(", ");
  let reply = `logged ${parsed.workoutLabel} 💪 ${parsed.summary}`;
  if (muscles) reply += ` · hitting ${muscles}`;
  if (remainingNet !== null && remainingNet > 0) {
    reply += `. you've got ~${remainingNet} cal left net today — good time to refuel with protein`;
  } else if (remainingNet !== null && remainingNet <= 0) {
    reply += `. you're at your calorie target for today — solid work`;
  }

  return { handled: true, replyText: reply };
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
