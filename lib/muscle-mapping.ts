
export type MuscleGroup =
  | "chest"
  | "back"
  | "quads"
  | "hamstrings"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "abs"
  | "glutes"
  | "calves";

export const MUSCLE_MAPPING: Record<string, MuscleGroup[]> = {
  // ── Chest ───────────────────────────────────────────────────────────────
  "bench press":        ["chest", "triceps"],
  "chest press":        ["chest", "triceps"],
  "incline bench":      ["chest", "shoulders"],
  "incline press":      ["chest", "shoulders"],
  "decline bench":      ["chest", "triceps"],
  "decline press":      ["chest", "triceps"],
  "pushup":             ["chest", "triceps"],
  "push-up":            ["chest", "triceps"],
  "dumbbell fly":       ["chest"],
  "cable fly":          ["chest"],
  "cable crossover":    ["chest"],
  "pec dec":            ["chest"],
  "chest fly":          ["chest"],
  "dip":                ["chest", "triceps"],

  // ── Back ────────────────────────────────────────────────────────────────
  "pullup":             ["back", "biceps"],
  "pull-up":            ["back", "biceps"],
  "chin-up":            ["back", "biceps"],
  "chinup":             ["back", "biceps"],
  "lat pulldown":       ["back", "biceps"],
  "row":                ["back", "biceps"],
  "t-bar row":          ["back", "biceps"],
  "cable row":          ["back", "biceps"],
  "seated row":         ["back", "biceps"],
  "chest supported row":["back", "biceps"],
  "deadlift":           ["back", "hamstrings", "glutes"],
  "romanian deadlift":  ["hamstrings", "glutes"],
  "rdl":                ["hamstrings", "glutes"],
  "sumo deadlift":      ["back", "hamstrings", "glutes"],
  "shrug":              ["back", "shoulders"],
  "face pull":          ["shoulders", "back"],
  "good morning":       ["hamstrings", "back"],
  "hyperextension":     ["hamstrings", "back", "glutes"],
  "back extension":     ["hamstrings", "back", "glutes"],

  // ── Shoulders ───────────────────────────────────────────────────────────
  "shoulder press":     ["shoulders", "triceps"],
  "military press":     ["shoulders", "triceps"],
  "overhead press":     ["shoulders", "triceps"],
  "ohp":                ["shoulders", "triceps"],
  "lateral raise":      ["shoulders"],
  "side raise":         ["shoulders"],
  "front raise":        ["shoulders"],
  "rear delt":          ["shoulders"],
  "arnold press":       ["shoulders"],
  "upright row":        ["shoulders", "biceps"],

  // ── Legs ────────────────────────────────────────────────────────────────
  "squat":              ["quads", "glutes", "hamstrings"],
  "front squat":        ["quads", "glutes"],
  "goblet squat":       ["quads", "glutes"],
  "hack squat":         ["quads", "glutes"],
  "split squat":        ["quads", "glutes"],
  "bulgarian":          ["quads", "glutes"],
  "step up":            ["quads", "glutes"],
  "lunge":              ["quads", "glutes"],
  "leg press":          ["quads", "glutes"],
  "leg extension":      ["quads"],
  "leg curl":           ["hamstrings"],
  "hamstring curl":     ["hamstrings"],
  "nordic curl":        ["hamstrings"],
  "hip thrust":         ["glutes"],
  "glute bridge":       ["glutes"],
  "calf raise":         ["calves"],
  "seated calf":        ["calves"],

  // ── Arms ────────────────────────────────────────────────────────────────
  "bicep curl":         ["biceps"],
  "biceps curl":        ["biceps"],
  "hammer curl":        ["biceps"],
  "preacher curl":      ["biceps"],
  "concentration curl": ["biceps"],
  "cable curl":         ["biceps"],
  "zz curl":            ["biceps"],
  "ez bar curl":        ["biceps"],
  "tricep extension":   ["triceps"],
  "triceps extension":  ["triceps"],
  "skullcrusher":       ["triceps"],
  "skull crusher":      ["triceps"],
  "tricep pushdown":    ["triceps"],
  "triceps pushdown":   ["triceps"],
  "overhead tricep":    ["triceps"],
  "close grip bench":   ["triceps", "chest"],
  "diamond pushup":     ["triceps", "chest"],

  // ── Core ────────────────────────────────────────────────────────────────
  "crunch":             ["abs"],
  "sit-up":             ["abs"],
  "situp":              ["abs"],
  "plank":              ["abs"],
  "leg raise":          ["abs"],
  "hanging leg raise":  ["abs"],
  "cable crunch":       ["abs"],
  "ab wheel":           ["abs"],
  "russian twist":      ["abs"],
  "mountain climber":   ["abs"],
  "v-up":               ["abs"],
  "toe touch":          ["abs"],
  "flutter kick":       ["abs"],
  "hollow hold":        ["abs"],

  // ── Olympic / Power ─────────────────────────────────────────────────────
  "clean":              ["back", "shoulders", "quads", "glutes"],
  "power clean":        ["back", "shoulders", "quads", "glutes"],
  "snatch":             ["back", "shoulders", "quads", "glutes"],
  "jerk":               ["shoulders", "quads", "triceps"],
  "thruster":           ["quads", "glutes", "shoulders", "triceps"],
  "kettlebell swing":   ["glutes", "hamstrings", "back"],
  "turkish get up":     ["shoulders", "abs", "glutes"],
  "farmer":             ["back", "abs"],
  "sled":               ["quads", "glutes"],

  // ── Sports (broad muscle group targets) ─────────────────────────────────
  "boxing":             ["shoulders", "abs", "biceps"],
  "kickboxing":         ["shoulders", "abs", "quads"],
  "muay thai":          ["shoulders", "abs", "quads", "calves"],
  "wrestling":          ["back", "shoulders", "abs", "quads"],
  "judo":               ["back", "shoulders", "abs"],
  "jiu-jitsu":          ["back", "shoulders", "abs"],
  "bjj":                ["back", "shoulders", "abs"],
  "soccer":             ["quads", "hamstrings", "calves", "glutes"],
  "football":           ["quads", "hamstrings", "shoulders", "glutes"],
  "basketball":         ["quads", "calves", "shoulders"],
  "tennis":             ["shoulders", "abs", "calves"],
  "volleyball":         ["shoulders", "quads", "calves"],
  "swimming":           ["back", "shoulders", "chest", "abs"],
  "rowing":             ["back", "shoulders", "abs", "quads"],
};

export function getMusclesFromExercise(exerciseName: string): MuscleGroup[] {
  const lower = exerciseName.toLowerCase();

  // Exact match first
  if (MUSCLE_MAPPING[lower]) return MUSCLE_MAPPING[lower];

  // Keyword search — longest key wins to avoid "row" matching "rowing machine"
  const muscles = new Set<MuscleGroup>();
  const sortedKeys = Object.keys(MUSCLE_MAPPING).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      MUSCLE_MAPPING[key].forEach(g => muscles.add(g));
    }
  }

  return Array.from(muscles);
}
