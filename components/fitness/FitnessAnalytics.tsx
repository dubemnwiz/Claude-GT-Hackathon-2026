"use client"

import { useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts"
import { format, subDays, startOfDay, startOfWeek, addDays } from "date-fns"
import { MuscleMap } from "./MuscleMap"
import { getMusclesFromExercise, MuscleGroup } from "@/lib/muscle-mapping"
import { Activity, TrendingUp, Info, Clock } from "lucide-react"

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

export function FitnessAnalytics({ logs }: { logs: WorkoutLog[] }) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  // 1. Muscle Heat Map (last 14 days) — timezone-safe, no dead vars
  const muscleHeat = useMemo(() => {
    const heat: Record<MuscleGroup, number> = {
      chest: 0, back: 0, quads: 0, hamstrings: 0, shoulders: 0,
      biceps: 0, triceps: 0, abs: 0, glutes: 0, calves: 0,
    }
    const nowLocal = startOfDay(new Date())

    logs.forEach(log => {
      // Split date string to avoid timezone shifts during parsing
      const [y, m, d] = log.date.split('T')[0].split('-').map(Number)
      const logLocal = startOfDay(new Date(y, m - 1, d))
      const diffDays = Math.floor((nowLocal.getTime() - logLocal.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > 14) return

      const intensity = Math.max(0, 1 - (diffDays / 14))

      log.exercises?.forEach(ex => {
        const muscles = getMusclesFromExercise(ex.name)
        muscles.forEach(m => {
          // Increase multiplier to 0.8 for better visual pop on mobile
          heat[m] = Math.min(1, heat[m] + intensity * 0.8)
        })
      })
    })

    return heat
  }, [logs])

  // 2. Volume chart (last 30 days) — date comparison uses format() which is local-tz safe
  const volumeData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) =>
      format(subDays(new Date(), 29 - i), "yyyy-MM-dd")
    )

    return last30Days.map(day => {
      const dayLogs = logs.filter(l => format(startOfDay(new Date(l.date)), "yyyy-MM-dd") === day)
      const totalVolume = dayLogs.reduce((sum, l) => {
        const vol = l.exercises?.reduce((s, ex) =>
          s + ex.sets.reduce((ss, set) => ss + set.weight * set.reps, 0), 0) || 0
        return sum + vol
      }, 0)
      return { date: format(new Date(day), "MMM d"), volume: totalVolume }
    })
  }, [logs])

  // 3. Exercise progression — sort before mapping so date labels are always in order
  const availableExercises = useMemo(() => {
    const names = new Set<string>()
    logs.forEach(l => l.exercises?.forEach(ex => names.add(ex.name)))
    return Array.from(names).sort()
  }, [logs])

  const exerciseProgressData = useMemo(() => {
    if (!selectedExercise) return []
    return logs
      .filter(l => l.exercises?.some(ex => ex.name === selectedExercise))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(l => {
        const ex = l.exercises!.find(e => e.name === selectedExercise)!
        const bestSet = ex.sets.reduce((best, s) => {
          if (s.reps <= 0 || s.weight <= 0) return best
          const e1rm = s.weight * (36 / (37 - Math.min(s.reps, 36)))
          return Math.max(best, e1rm)
        }, 0)
        return {
          date: format(new Date(l.date), "MMM d"),
          e1rm: Math.round(bestSet),
          actual: Math.max(...ex.sets.map(s => s.weight)),
        }
      })
  }, [logs, selectedExercise])

  // 4. Cardio trends — weekly total minutes over last 8 weeks
  const cardioData = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 7)
      const weekMins = logs
        .filter(l => {
          const d = startOfDay(new Date(l.date))
          return d >= weekStart && d < weekEnd && l.duration
        })
        .reduce((sum, l) => sum + (l.duration || 0), 0)
      return { week: format(weekStart, "MMM d"), minutes: weekMins }
    }).reverse()
  }, [logs])

  const hasCardioData = cardioData.some(d => d.minutes > 0)

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border) / 0.4)",
      borderRadius: "12px",
      fontSize: "12px",
    },
  }

  return (
    <div className="space-y-8 py-4">
      {/* Muscle Map */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Muscle Map</h3>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-0.5 ml-6">Which muscles you've hit in the last 14 days — brighter means more recent.</p>
        </div>
        <div className="bg-muted/20 rounded-2xl p-6 border border-border/40">
          <MuscleMap heatMap={muscleHeat} className="max-w-md mx-auto" />
          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-emerald-500" /> Recently trained
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/20" /> Rested
            </div>
          </div>
        </div>
      </section>

      {/* Volume Chart */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Strength Volume</h3>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-0.5 ml-6">Total weight moved per day (sets × reps × weight) over the last 30 days.</p>
        </div>
        <div className="h-56 bg-muted/20 rounded-2xl p-4 border border-border/40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeData}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} interval={4} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip {...tooltipStyle} itemStyle={{ color: "#10b981" }} formatter={(v: number) => [`${v.toLocaleString()} lbs`, "Volume"]} />
              <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Cardio Trends */}
      {hasCardioData && (
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cardio Minutes</h3>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-0.5 ml-6">Total cardio time logged per week over the last 8 weeks.</p>
          </div>
          <div className="h-48 bg-muted/20 rounded-2xl p-4 border border-border/40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cardioData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `${v}m`} />
                <Tooltip {...tooltipStyle} itemStyle={{ color: "#38bdf8" }} formatter={(v: number) => [`${v} min`, "Cardio"]} />
                <Bar dataKey="minutes" fill="#38bdf8" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Exercise Progression */}
      <section className="space-y-4 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Progression History</h3>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-0.5 ml-6">Estimated 1-rep max (Brzycki formula) over time — pick an exercise to see your strength curve.</p>
          </div>
          <select
            className="text-xs bg-muted/40 border-0 rounded-lg px-2 py-1 outline-none"
            onChange={e => setSelectedExercise(e.target.value || null)}
            defaultValue=""
          >
            <option value="">Select exercise</option>
            {availableExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
          </select>
        </div>

        {selectedExercise ? (
          exerciseProgressData.length > 0 ? (
            <div className="h-56 bg-muted/20 rounded-2xl p-4 border border-border/40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exerciseProgressData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [
                    `${v} lbs`,
                    name === "e1rm" ? "Est. 1RM" : "Max Weight"
                  ]} />
                  <Line type="monotone" dataKey="e1rm" name="e1rm" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="actual" name="actual" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 bg-muted/10 rounded-2xl border border-dashed border-border/30 flex flex-col items-center justify-center gap-2">
              <Info className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No set data logged for this exercise yet.</p>
            </div>
          )
        ) : (
          <div className="h-56 bg-muted/10 rounded-2xl border border-dashed border-border/30 flex flex-col items-center justify-center gap-2">
            <Info className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Select an exercise to track strength progress.</p>
          </div>
        )}
      </section>
    </div>
  )
}
