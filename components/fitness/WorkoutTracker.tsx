"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format, startOfWeek, addDays, subDays, isToday, startOfDay } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import {
    X, Flame, Dumbbell, Trophy, ChevronDown, ChevronLeft, ChevronRight,
    Plus, Minus, Clock, History, Check, Activity, ArrowUp, ArrowDown, Timer,
} from "lucide-react"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import { RestTimer } from "./RestTimer"
import { PlateCalculator } from "./PlateCalculator"

// ── Types ──────────────────────────────────────────────────────────────────

interface SetData {
    weight: number
    reps: number
    isPR: boolean
}

interface ExerciseData {
    name: string
    sets: SetData[]
}

interface WorkoutLog {
    id: string
    workout: string
    date: string
    isPR: boolean
    duration?: number | null
    notes?: string | null
    exercises?: ExerciseData[] | null
}

interface SetEntry {
    weight: string
    reps: string
    isPR: boolean
}

interface ExerciseEntry {
    uid: string
    name: string
    sets: SetEntry[]
}

interface GhostSession {
    sets: Array<{ weight: number; reps: number; isPR: boolean }>
    date: string
}

interface WorkoutTrackerProps {
    onDataChange?: (logs: WorkoutLog[]) => void
}

// ── Category detection ─────────────────────────────────────────────────────

type WorkoutCategory = "strength" | "cardio" | null

const STRENGTH_KEYWORDS = [
    "squat", "bench", "deadlift", "press", "curl", "row", "pull", "push", "lift",
    "barbell", "dumbbell", "kettlebell", "cable", "machine", "resistance",
    "overhead", "ohp", "incline", "decline", "fly", "extension", "pulldown", "dip",
    "lunge", "leg press", "rdl", "romanian", "sumo", "clean", "snatch", "jerk",
    "thruster", "pushup", "push-up", "pullup", "pull-up", "chinup", "chin-up",
    "situp", "sit-up", "crunch", "plank", "leg raise", "shrug", "raise",
    "tricep", "bicep", "shoulder", "chest", "back day", "glute", "hip thrust",
    "farmer", "sled", "nordic", "good morning", "hyperextension", "face pull",
    "upright row", "skull", "ab wheel", "russian twist",
]

const CARDIO_KEYWORDS = [
    "run", "jog", "walk", "sprint", "hike", "trek", "5k", "10k", "marathon",
    "bike", "cycle", "cycling", "spin", "peloton", "elliptical", "treadmill", "stairmaster",
    "swim", "swimming", "pool", "laps",
    "cardio", "hiit", "interval", "circuit", "wod", "amrap", "emom",
    "soccer", "football", "basketball", "tennis", "volleyball", "baseball", "softball",
    "hockey", "lacrosse", "rugby", "cricket", "badminton", "pickleball",
    "ping pong", "squash", "racquetball", "handball",
    "boxing", "mma", "wrestling", "judo", "jiu-jitsu", "bjj", "muay thai",
    "karate", "taekwondo", "kickboxing", "sparring",
    "kayak", "paddle", "surf", "rowing machine",
    "ski", "snowboard", "skating", "ice skating", "rollerblading",
    "dance", "zumba", "aerobics", "jump rope", "skipping",
    "yoga", "pilates", "mobility", "stretching",
    "crossfit",
]

// Exercises that use a standard barbell (show plate calculator)
const BARBELL_KEYWORDS = [
    "squat", "bench", "deadlift", "press", "barbell", "row", "clean",
    "snatch", "jerk", "rdl", "romanian", "sumo", "good morning", "hack squat",
]

function detectCategory(name: string): WorkoutCategory {
    if (!name.trim()) return null
    const lower = name.toLowerCase()
    if (STRENGTH_KEYWORDS.some(k => lower.includes(k))) return "strength"
    if (CARDIO_KEYWORDS.some(k => lower.includes(k))) return "cardio"
    return null
}

function isBarbellExercise(name: string): boolean {
    const lower = name.toLowerCase()
    return BARBELL_KEYWORDS.some(k => lower.includes(k))
}

// ── Set comparison (ghost mode) ────────────────────────────────────────────

type SetResult = "better" | "matched" | "worse"

function compareSet(live: SetEntry, ghost: { weight: number; reps: number }): SetResult | null {
    const lw = parseFloat(live.weight) || 0
    const lr = parseInt(live.reps) || 0
    if (!lw || !lr) return null
    const lVol = lw * lr
    const gVol = ghost.weight * ghost.reps
    if (lVol > gVol) return "better"
    if (lVol < gVol) return "worse"
    return "matched"
}

// ── Helpers ────────────────────────────────────────────────────────────────

function computeStreak(logs: WorkoutLog[]): number {
    if (!logs.length) return 0
    const uniqueDays = Array.from(
        new Set(logs.map(l => format(startOfDay(new Date(l.date)), "yyyy-MM-dd")))
    ).sort().reverse()
    let streak = 0
    let cursor = startOfDay(new Date())
    for (const day of uniqueDays) {
        const dayDate = new Date(day)
        const diff = Math.round((cursor.getTime() - dayDate.getTime()) / 86400000)
        if (diff <= 1) { streak++; cursor = dayDate } else break
    }
    return streak
}

let uidCounter = 0
const uid = () => String(++uidCounter)
const emptySet = (): SetEntry => ({ weight: "", reps: "", isPR: false })
const emptyExercise = (): ExerciseEntry => ({ uid: uid(), name: "", sets: [emptySet()] })

// ── ExercisePanel ──────────────────────────────────────────────────────────

function ExercisePanel({
    exercises,
    onChange,
    getLastSession,
    exerciseNames,
}: {
    exercises: ExerciseEntry[]
    onChange: (exs: ExerciseEntry[]) => void
    getLastSession: (name: string) => GhostSession | null
    exerciseNames: string[]
}) {
    const [ghosts, setGhosts] = useState<Record<string, GhostSession | null>>({})
    const [activePlateCalc, setActivePlateCalc] = useState<string | null>(null)
    const autoPRd = useRef(new Set<string>())

    const updateSet = (exIdx: number, setIdx: number, patch: Partial<SetEntry>) => {
        let exs = exercises.map((ex, i) => {
            if (i !== exIdx) return ex
            return { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, ...patch } : s) }
        })

        // Ghost auto-PR check
        const ghost = ghosts[exercises[exIdx].uid]
        const updatedSet = { ...exercises[exIdx].sets[setIdx], ...patch }
        const key = `${exercises[exIdx].uid}-${setIdx}`

        if (ghost?.sets[setIdx] && !autoPRd.current.has(key)) {
            const result = compareSet(updatedSet, ghost.sets[setIdx])
            if (result === "better") {
                autoPRd.current.add(key)
                exs = exs.map((ex, i) => {
                    if (i !== exIdx) return ex
                    return { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, isPR: true } : s) }
                })
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ["#f59e0b", "#fbbf24", "#fff"] })
                if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200)
            }
        }

        // Manual PR toggle (when not already auto-triggered)
        if (patch.isPR === true && !exercises[exIdx].sets[setIdx].isPR && !autoPRd.current.has(key)) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#f59e0b", "#fbbf24", "#fff"] })
            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200)
        }

        onChange(exs)
    }

    const updateExercise = (idx: number, patch: Partial<ExerciseEntry>) =>
        onChange(exercises.map((ex, i) => i === idx ? { ...ex, ...patch } : ex))

    const addSet = (exIdx: number) => {
        const lastWeight = exercises[exIdx].sets.at(-1)?.weight ?? ""
        onChange(exercises.map((ex, i) =>
            i !== exIdx ? ex : { ...ex, sets: [...ex.sets, { weight: lastWeight, reps: "", isPR: false }] }
        ))
    }

    const removeSet = (exIdx: number, setIdx: number) => {
        onChange(exercises.map((ex, i) => {
            if (i !== exIdx) return ex
            const sets = ex.sets.filter((_, j) => j !== setIdx)
            return { ...ex, sets: sets.length ? sets : [emptySet()] }
        }))
    }

    const removeExercise = (idx: number) =>
        onChange(exercises.filter((_, i) => i !== idx))

    const handleNameBlur = (idx: number, name: string) => {
        const exUid = exercises[idx].uid
        if (!name.trim()) {
            setGhosts(g => ({ ...g, [exUid]: null }))
            return
        }
        const session = getLastSession(name.trim())
        setGhosts(g => ({ ...g, [exUid]: session }))
        if (session) {
            onChange(exercises.map((ex, i) => {
                if (i !== idx) return ex
                return {
                    ...ex,
                    sets: ex.sets.map((s, setIdx) =>
                        s.weight ? s : { ...s, weight: session.sets[setIdx] ? String(session.sets[setIdx].weight) : "" }
                    ),
                }
            }))
        }
    }

    return (
        <div className="space-y-3 pt-2">
            <datalist id="exercise-names">
                {exerciseNames.map(n => <option key={n} value={n} />)}
            </datalist>

            {exercises.map((ex, exIdx) => {
                const ghost = ghosts[ex.uid]
                const isBarbell = isBarbellExercise(ex.name)

                return (
                    <motion.div
                        key={ex.uid}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-3 space-y-2"
                    >
                        {/* Exercise header */}
                        <div className="flex items-center gap-2">
                            <Dumbbell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <Input
                                list="exercise-names"
                                value={ex.name}
                                onChange={e => updateExercise(exIdx, { name: e.target.value })}
                                onBlur={e => handleNameBlur(exIdx, e.target.value)}
                                placeholder="Exercise (e.g. Bench Press)"
                                className="h-7 text-sm flex-1 bg-transparent border-0 border-b border-border/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary/50"
                            />
                            <button type="button" onClick={() => removeExercise(exIdx)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Ghost row */}
                        {ghost && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="flex items-center gap-2 py-1 px-2 rounded-lg bg-primary/5 border border-primary/10 overflow-hidden"
                            >
                                <History className="h-3 w-3 text-primary/50 shrink-0" />
                                <span className="text-[10px] text-primary/60 font-medium whitespace-nowrap">
                                    {format(new Date(ghost.date), "MMM d")}:
                                </span>
                                <div className="flex gap-1 flex-wrap">
                                    {ghost.sets.map((s, i) => (
                                        <span key={i} className="text-[10px] text-primary/50 bg-primary/8 px-1.5 py-0.5 rounded font-mono">
                                            {s.weight}×{s.reps}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 px-0.5">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Weight (lbs)</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Reps</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">PR</span>
                            <span className="w-5" />
                        </div>

                        {/* Set rows */}
                        {ex.sets.map((s, setIdx) => {
                            const ghostSet = ghost?.sets[setIdx]
                            const result = ghostSet ? compareSet(s, ghostSet) : null

                            return (
                                <div key={setIdx}>
                                    <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
                                        {/* Weight with comparison indicator & steppers */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = (parseFloat(s.weight) || 0) - 2.5
                                                    updateSet(exIdx, setIdx, { weight: String(Math.max(0, val)) })
                                                }}
                                                className="h-9 w-7 sm:hidden bg-muted/40 rounded-lg flex items-center justify-center hover:bg-muted/60"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <div className="relative flex-1">
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    min={0}
                                                    value={s.weight}
                                                    onChange={e => updateSet(exIdx, setIdx, { weight: e.target.value })}
                                                    placeholder="—"
                                                    className={cn(
                                                        "h-9 sm:h-7 text-sm bg-muted/40 text-center font-semibold",
                                                        result === "better" && "ring-1 ring-emerald-500/50",
                                                        result === "worse" && "ring-1 ring-rose-500/30",
                                                    )}
                                                />
                                                {result && (
                                                    <span className={cn(
                                                        "absolute -right-1 -top-1 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm",
                                                        result === "better" ? "bg-emerald-500" :
                                                        result === "worse" ? "bg-rose-500/80" : "bg-muted-foreground/50"
                                                    )}>
                                                        {result === "better"
                                                            ? <ArrowUp className="h-2 w-2 text-white" />
                                                            : result === "worse"
                                                                ? <ArrowDown className="h-2 w-2 text-white" />
                                                                : <span className="text-white text-[8px] font-bold leading-none">=</span>
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = (parseFloat(s.weight) || 0) + 2.5
                                                    updateSet(exIdx, setIdx, { weight: String(val) })
                                                }}
                                                className="h-9 w-7 sm:hidden bg-muted/40 rounded-lg flex items-center justify-center hover:bg-muted/60"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = (parseInt(s.reps) || 0) - 1
                                                    updateSet(exIdx, setIdx, { reps: String(Math.max(0, val)) })
                                                }}
                                                className="h-9 w-7 sm:hidden bg-muted/40 rounded-lg flex items-center justify-center hover:bg-muted/60"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <Input
                                                type="number"
                                                inputMode="numeric"
                                                min={0}
                                                value={s.reps}
                                                onChange={e => updateSet(exIdx, setIdx, { reps: e.target.value })}
                                                placeholder="—"
                                                className="h-9 sm:h-7 text-sm bg-muted/40 text-center font-semibold flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = (parseInt(s.reps) || 0) + 1
                                                    updateSet(exIdx, setIdx, { reps: String(val) })
                                                }}
                                                className="h-9 w-7 sm:hidden bg-muted/40 rounded-lg flex items-center justify-center hover:bg-muted/60"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* PR toggle */}
                                            <button
                                                type="button"
                                                onClick={() => updateSet(exIdx, setIdx, { isPR: !s.isPR })}
                                                className={cn(
                                                    "flex items-center justify-center h-9 w-9 sm:h-7 sm:w-7 rounded-lg ring-1 transition-all",
                                                    s.isPR
                                                        ? "bg-amber-500/20 text-amber-500 ring-amber-400/40"
                                                        : "bg-muted/30 text-muted-foreground/40 ring-border/30 hover:text-amber-500"
                                                )}
                                                title={s.isPR ? "Remove PR" : "Mark as PR"}
                                            >
                                                <Trophy className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                                            </button>

                                            {/* Plate calculator (barbell only) */}
                                            {isBarbell && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const k = `${exIdx}-${setIdx}`
                                                        setActivePlateCalc(activePlateCalc === k ? null : k)
                                                    }}
                                                    className={cn(
                                                        "flex items-center justify-center h-9 w-9 sm:h-7 sm:w-7 rounded-lg ring-1 transition-all text-[10px] sm:text-[9px] font-bold",
                                                        activePlateCalc === `${exIdx}-${setIdx}`
                                                            ? "bg-primary/20 text-primary ring-primary/40"
                                                            : "bg-muted/30 text-muted-foreground/40 ring-border/30 hover:text-primary"
                                                    )}
                                                    title="Plate Calculator"
                                                >
                                                    45
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeSet(exIdx, setIdx)}
                                            className="text-muted-foreground/40 hover:text-destructive transition-colors p-2.5 sm:p-1 rounded"
                                        >
                                            <Minus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {activePlateCalc === `${exIdx}-${setIdx}` && s.weight && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden mb-2"
                                            >
                                                <PlateCalculator weight={parseFloat(s.weight)} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}

                        <button type="button" onClick={() => addSet(exIdx)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
                            <Plus className="h-3 w-3" /> Add set
                        </button>
                    </motion.div>
                )
            })}

            <button
                type="button"
                onClick={() => onChange([...exercises, emptyExercise()])}
                className="flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors font-medium"
            >
                <Plus className="h-3.5 w-3.5" /> Add exercise
            </button>
        </div>
    )
}

// ── LogItem ────────────────────────────────────────────────────────────────

function LogItem({ log, onTogglePR, onDelete }: {
    log: WorkoutLog
    onTogglePR: (id: string, current: boolean) => void
    onDelete: (id: string) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const cat = detectCategory(log.workout)
    const catStyle = cat === "strength"
        ? { label: "Strength", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" }
        : cat === "cardio"
            ? { label: "Cardio", color: "bg-sky-500/15 text-sky-600 dark:text-sky-400" }
            : { label: "Training", color: "bg-primary/10 text-primary" }
    const hasExercises = !!(log.exercises && log.exercises.length > 0)

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors overflow-hidden"
        >
            <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-start gap-3 min-w-0">
                    <Dumbbell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{log.workout}</p>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">{format(new Date(log.date), "MMM dd, yyyy")}</p>
                            {log.duration && (
                                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5" />{log.duration}m
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {log.isPR && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <Trophy className="h-3 w-3" /> PR
                        </span>
                    )}
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", catStyle.color)}>{catStyle.label}</span>
                    {hasExercises && (
                        <button onClick={() => setExpanded(v => !v)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                        </button>
                    )}
                    <button onClick={() => onTogglePR(log.id, log.isPR)}
                        className="text-muted-foreground/40 hover:text-amber-500 transition-colors p-2.5 sm:p-1 rounded">
                        <Trophy className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    </button>
                    <button onClick={() => onDelete(log.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-2.5 sm:p-1 rounded">
                        <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {expanded && hasExercises && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border/20 px-3 pb-3 pt-2 space-y-2.5"
                    >
                        {log.notes && (
                            <p className="text-xs text-muted-foreground italic border-b border-border/10 pb-2">{log.notes}</p>
                        )}
                        {log.exercises!.map((ex, i) => (
                            <div key={i}>
                                <p className="text-xs font-semibold text-foreground/80 mb-1">{ex.name}</p>
                                <div className="space-y-1">
                                    {ex.sets.map((s, j) => (
                                        <div key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="w-10 text-center rounded bg-muted/40 py-0.5 font-mono">{j + 1}</span>
                                            <span>{s.weight} lbs</span>
                                            <span className="text-muted-foreground/40">×</span>
                                            <span>{s.reps} reps</span>
                                            {s.isPR && (
                                                <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                                                    <Trophy className="h-2.5 w-2.5" /> PR
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ── Main component ─────────────────────────────────────────────────────────

export function WorkoutTracker({ onDataChange }: WorkoutTrackerProps) {
    const [workout, setWorkout] = useState("")
    const [detectedCategory, setDetectedCategory] = useState<WorkoutCategory>(null)
    const [manualCategory, setManualCategory] = useState<WorkoutCategory>(null)
    const [exercises, setExercises] = useState<ExerciseEntry[]>([emptyExercise()])
    const [duration, setDuration] = useState("")
    const [notes, setNotes] = useState("")
    const [isPR, setIsPR] = useState(false)
    const [data, setData] = useState<WorkoutLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [restActive, setRestActive] = useState(false)
    const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"))

    const effectiveCategory = manualCategory ?? detectedCategory

    // Debounced category detection (400ms) — also pre-fills first exercise name
    useEffect(() => {
        if (manualCategory !== null) return
        const timer = setTimeout(() => {
            const cat = detectCategory(workout)
            setDetectedCategory(cat)
            if (cat === "strength" && workout.trim()) {
                setExercises(prev => {
                    // Only pre-fill if the panel just opened (single empty entry)
                    if (prev.length === 1 && !prev[0].name.trim()) {
                        return [{ ...prev[0], name: workout.trim() }]
                    }
                    return prev
                })
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [workout, manualCategory])

    // Reset form state when name is cleared
    useEffect(() => {
        if (!workout.trim()) {
            setManualCategory(null)
            setDetectedCategory(null)
            setExercises([emptyExercise()])
        }
    }, [workout])

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/fitness/workout")
            if (res.ok) {
                const logs = await res.json()
                setData(logs)
                onDataChange?.(logs)
            } else {
                if (res.status === 401) setError("Please login to save data")
            }
        } catch {
            setError("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }, [onDataChange])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Draft Persistence ──
    const isFirstRun = useRef(true)
    useEffect(() => {
        const saved = localStorage.getItem("workout_draft")
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setWorkout(parsed.workout || "")
                if (parsed.exercises) setExercises(parsed.exercises)
                setDuration(parsed.duration || "")
                setNotes(parsed.notes || "")
            } catch (e) { console.error("Draft restore failed", e) }
        }
        isFirstRun.current = false
    }, [])

    useEffect(() => {
        if (isFirstRun.current) return
        const draft = { workout, exercises, duration, notes }
        if (workout || exercises.some(ex => ex.name || ex.sets.some(s => s.weight || s.reps))) {
            localStorage.setItem("workout_draft", JSON.stringify(draft))
        } else {
            localStorage.removeItem("workout_draft")
        }
    }, [workout, exercises, duration, notes])

    // Unique exercise names for autocomplete datalist
    const allExerciseNames = useMemo(() => {
        const names = new Set<string>()
        data.forEach(log => log.exercises?.forEach(ex => names.add(ex.name)))
        return Array.from(names).sort()
    }, [data])

    // Get the last logged session for a given exercise (data is newest-first)
    const getLastSession = useCallback((name: string): GhostSession | null => {
        const lower = name.toLowerCase()
        for (const log of data) {
            const match = log.exercises?.find(e => e.name.toLowerCase() === lower)
            if (match?.sets?.length) return { sets: match.sets, date: log.date }
        }
        return null
    }, [data])

    const resetForm = () => {
        setWorkout("")
        setDetectedCategory(null)
        setManualCategory(null)
        setExercises([emptyExercise()])
        setDuration("")
        setNotes("")
        setIsPR(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!workout.trim()) return
        setError("")

        let exercisesPayload: ExerciseData[] | undefined
        let durationPayload: number | undefined
        let notesPayload: string | undefined

        if (effectiveCategory === "strength") {
            const filled = exercises
                .filter(ex => ex.name.trim())
                .map(ex => ({
                    name: ex.name.trim(),
                    sets: ex.sets
                        .filter(s => s.reps || s.weight)
                        .map(s => ({
                            weight: parseFloat(s.weight) || 0,
                            reps: parseInt(s.reps) || 0,
                            isPR: s.isPR,
                        })),
                }))
                .filter(ex => ex.sets.length > 0)
            if (filled.length > 0) exercisesPayload = filled
        } else if (effectiveCategory === "cardio") {
            const d = parseInt(duration)
            if (!isNaN(d) && d > 0) durationPayload = d
            if (notes.trim()) notesPayload = notes.trim()
        }

        const hasAnyPR = exercisesPayload?.some(ex => ex.sets.some(s => s.isPR)) ?? isPR

        try {
            const res = await fetch("/api/fitness/workout", {
                method: "POST",
                body: JSON.stringify({
                    workout: workout.trim(),
                    date: new Date(selectedDate + "T12:00:00"),
                    isPR: hasAnyPR,
                    exercises: exercisesPayload,
                    duration: durationPayload,
                    notes: notesPayload,
                }),
                headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) {
                setError(res.status === 401 ? "Please login to save data" : "Failed to save")
                return
            }
            resetForm()
            localStorage.removeItem("workout_draft")
            fetchData()
            // Success Haptic
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate([100, 30, 100])
            }
        } catch {
            setError("Failed to save")
        }
    }

    const togglePR = async (id: string, current: boolean) => {
        setData(prev => prev.map(l => l.id === id ? { ...l, isPR: !current } : l))
        try {
            await fetch("/api/fitness/workout", {
                method: "PUT",
                body: JSON.stringify({ id, isPR: !current }),
                headers: { "Content-Type": "application/json" },
            })
        } catch { fetchData() }
    }

    const deleteLog = async (id: string) => {
        try {
            const res = await fetch(`/api/fitness/workout?id=${id}`, { method: "DELETE" })
            if (res.ok) fetchData()
            else setError("Failed to delete")
        } catch { setError("Failed to delete") }
    }

    const streak = computeStreak(data)
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const loggedDates = data.map(l => format(startOfDay(new Date(l.date)), "yyyy-MM-dd"))

    const todayStr = format(new Date(), "yyyy-MM-dd")
    const isOnToday = selectedDate === todayStr
    const filteredLogs = data.filter(l => format(startOfDay(new Date(l.date)), "yyyy-MM-dd") === selectedDate)

    return (
        <div className="space-y-6">
            {/* Streak + week dots */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-semibold">{streak} day streak</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {weekDays.map(day => {
                        const key = format(day, "yyyy-MM-dd")
                        const active = loggedDates.includes(key)
                        const today = isToday(day)
                        const selected = selectedDate === key
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedDate(key)}
                                className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium transition-all",
                                    selected && "ring-2 ring-offset-1 ring-offset-background ring-primary/70",
                                    active ? "bg-primary text-primary-foreground"
                                        : today ? "bg-muted/60 text-foreground ring-1 ring-primary/40"
                                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                {format(day, "EEEEE")}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Unified form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Workout name */}
                <div>
                    <label htmlFor="workout" className="text-xs text-muted-foreground mb-1.5 block">What did you do?</label>
                    <Input
                        id="workout"
                        value={workout}
                        onChange={e => setWorkout(e.target.value)}
                        placeholder="e.g. Bench Press, Morning Run, Basketball..."
                        className="h-9"
                    />
                </div>

                {/* Category pills (appear when name is typed) */}
                <AnimatePresence>
                    {workout.trim() && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="flex items-center gap-2"
                        >
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Type:</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = effectiveCategory === "strength" ? null : "strength"
                                    setManualCategory(next)
                                    if (next === "strength" && workout.trim()) {
                                        setExercises(prev =>
                                            prev.length === 1 && !prev[0].name.trim()
                                                ? [{ ...prev[0], name: workout.trim() }]
                                                : prev
                                        )
                                    }
                                }}
                                className={cn(
                                    "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 transition-all",
                                    effectiveCategory === "strength"
                                        ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 ring-violet-400/40"
                                        : "ring-border/40 text-muted-foreground hover:text-foreground bg-muted/20"
                                )}
                            >
                                <Dumbbell className="h-3 w-3" /> Strength
                            </button>
                            <button
                                type="button"
                                onClick={() => setManualCategory(effectiveCategory === "cardio" ? null : "cardio")}
                                className={cn(
                                    "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 transition-all",
                                    effectiveCategory === "cardio"
                                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-sky-400/40"
                                        : "ring-border/40 text-muted-foreground hover:text-foreground bg-muted/20"
                                )}
                            >
                                <Activity className="h-3 w-3" /> Cardio
                            </button>
                            {manualCategory
                                ? <span className="text-[9px] text-muted-foreground/50">manual</span>
                                : detectedCategory
                                    ? <span className="text-[9px] text-muted-foreground/50">auto-detected</span>
                                    : null
                            }
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Strength panel */}
                <AnimatePresence>
                    {effectiveCategory === "strength" && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="rounded-xl border border-border/30 bg-card/40 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-muted-foreground font-medium">Sets & Reps</p>
                                    <button
                                        type="button"
                                        onClick={() => setRestActive(v => !v)}
                                        className={cn(
                                            "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg ring-1 transition-all",
                                            restActive
                                                ? "bg-primary/15 text-primary ring-primary/30"
                                                : "ring-border/40 text-muted-foreground hover:text-foreground bg-muted/20"
                                        )}
                                    >
                                        <Timer className="h-3 w-3" /> Rest Timer
                                    </button>
                                </div>
                                <ExercisePanel
                                    exercises={exercises}
                                    onChange={setExercises}
                                    getLastSession={getLastSession}
                                    exerciseNames={allExerciseNames}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Cardio panel */}
                <AnimatePresence>
                    {effectiveCategory === "cardio" && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="rounded-xl border border-border/30 bg-card/40 p-3 space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1.5 block">
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Duration (minutes)</span>
                                    </label>
                                    <Input
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        value={duration}
                                        onChange={e => setDuration(e.target.value)}
                                        placeholder="e.g. 45"
                                        className="h-10 sm:h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1.5 block">Notes (optional)</label>
                                    <Input
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="e.g. 5km, avg HR 155, felt strong..."
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom row: PR toggle + submit */}
                <div className="flex items-center justify-between pt-1">
                    <button
                        type="button"
                        onClick={() => setIsPR(v => !v)}
                        className={cn(
                            "inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full ring-1 transition-all",
                            isPR
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-400/40"
                                : "ring-border/40 text-muted-foreground hover:text-foreground bg-muted/20"
                        )}
                    >
                        <Trophy className="h-3 w-3" /> PR session
                    </button>
                    <div className="flex items-center gap-2">
                        {!isOnToday && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                                Logging for {format(new Date(selectedDate + "T12:00:00"), "MMM d")}
                            </span>
                        )}
                        <Button type="submit" size="sm" className="h-8 px-5 gap-2">
                            <Check className="h-3.5 w-3.5" />
                            Finish & Log
                        </Button>
                    </div>
                </div>
            </form>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Day navigator + log list */}
            <div className="space-y-3">
                {/* Date navigator */}
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setSelectedDate(d => format(subDays(new Date(d), 1), "yyyy-MM-dd"))}
                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                            {isOnToday ? "Today" : format(new Date(selectedDate + "T12:00:00"), "EEE, MMM d")}
                        </span>
                        {!isOnToday && (
                            <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                className="text-[11px] text-primary hover:underline"
                            >
                                Today
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedDate(d => format(addDays(new Date(d), 1), "yyyy-MM-dd"))}
                        disabled={isOnToday}
                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Filtered log */}
                {isLoading ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
                ) : filteredLogs.length > 0 ? (
                    <div className="space-y-2 max-h-[360px] scroll-contained pr-1">
                        <AnimatePresence mode="popLayout">
                            {filteredLogs.map(log => (
                                <LogItem
                                    key={log.id}
                                    log={log}
                                    onTogglePR={togglePR}
                                    onDelete={deleteLog}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground py-6 text-center">
                        {data.length === 0 ? "No workouts logged yet" : "No workouts on this day"}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {restActive && <RestTimer onClose={() => setRestActive(false)} />}
            </AnimatePresence>
        </div>
    )
}
