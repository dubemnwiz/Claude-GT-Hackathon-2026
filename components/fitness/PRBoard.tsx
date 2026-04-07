"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { Trophy, Dumbbell } from "lucide-react"
import { motion } from "framer-motion"

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
    exercises?: ExerciseData[] | null
}

interface PRRecord {
    exercise: string
    weight: number
    reps: number
    date: string
    e1rm: number
}

// Brzycki estimated 1RM
function calcE1RM(weight: number, reps: number): number {
    if (reps <= 1) return weight
    return Math.round(weight * (36 / (37 - Math.min(reps, 36))))
}

export function PRBoard({ logs }: { logs: WorkoutLog[] }) {
    const records = useMemo<PRRecord[]>(() => {
        const best: Record<string, PRRecord> = {}

        // logs are newest-first — scan all, keep best set per exercise.
        // "Best" = highest weight; ties broken by reps.
        logs.forEach(log => {
            log.exercises?.forEach(ex => {
                const name = ex.name
                if (!name.trim()) return
                ex.sets.forEach(set => {
                    if (!set.weight) return
                    const existing = best[name]
                    const isBetter =
                        !existing ||
                        set.weight > existing.weight ||
                        (set.weight === existing.weight && set.reps > existing.reps)
                    if (isBetter) {
                        best[name] = {
                            exercise: name,
                            weight: set.weight,
                            reps: set.reps,
                            date: log.date,
                            e1rm: calcE1RM(set.weight, set.reps),
                        }
                    }
                })
            })
        })

        return Object.values(best).sort((a, b) => b.weight - a.weight)
    }, [logs])

    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-amber-500/10">
                    <Trophy className="h-7 w-7 text-amber-500/40" />
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">No records yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                        Log workouts with sets & reps to track your bests
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <p className="text-xs text-muted-foreground/60 pb-1">
                Your all-time best set per exercise. Updates automatically when you log a heavier lift.
            </p>
            {records.map((pr, i) => (
                <motion.div
                    key={pr.exercise}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 shrink-0">
                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{pr.exercise}</p>
                            <p className="text-xs text-muted-foreground">
                                {format(new Date(pr.date), "MMM d, yyyy")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                        {pr.reps > 1 && (
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wide">e1RM</p>
                                <p className="text-xs text-muted-foreground font-mono">≈ {pr.e1rm} lbs</p>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-sm font-bold tabular-nums">{pr.weight} lbs</p>
                            <p className="text-xs text-muted-foreground">× {pr.reps} rep{pr.reps !== 1 ? "s" : ""}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
