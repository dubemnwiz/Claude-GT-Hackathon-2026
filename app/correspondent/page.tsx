"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Target, Zap, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  Send, Upload, Loader2, User, Dumbbell, Flame, Beef, Wheat, Droplets,
  ChevronDown, ChevronUp, Activity, Clock,
} from "lucide-react"
import { MuscleMap } from "@/components/correspondent/MuscleMap"
import { getMusclesFromExercise, MuscleGroup } from "@/lib/muscle-mapping"
import { format, startOfDay } from "date-fns"

const DEMO_PHONE = process.env.NEXT_PUBLIC_DEMO_PHONE ?? "+15555550123"
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:3001"
const POLL_INTERVAL = 4000

// ── Types ──────────────────────────────────────────────────────────────────────

interface MealItem {
  name: string
  calories: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

interface TodayMeal {
  id: string
  mealTime: string | null
  loggingState: string
  items: MealItem[]
  totalCalories: number
  totalProteinG: number
}

interface Rollup {
  dayDate: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  mealsLogged: number
}

interface AgentWorkout {
  id: string
  workoutLabel: string
  muscleGroups: string[] | null
  exercises: { name: string; muscleGroups: string[]; sets?: number; reps?: number; weightLbs?: number }[] | null
  durationMin: number | null
  caloriesBurned: number | null
  workoutDate: string
}

interface DashboardData {
  profile: {
    firstName: string | null
    sex: string | null
    heightCm: number | null
    currentWeightKg: number | null
    startWeightKg: number | null
    activityLevel: string | null
    exerciseDaysPerWeek: number | null
    dietaryPreferences: string[] | null
    allergies: string[] | null
  } | null
  goal: {
    goalType: "LOSE" | "MAINTAIN" | "GAIN"
    targetCalories: number | null
    targetProteinG: number | null
    targetCarbsG: number | null
    targetFatG: number | null
    targetWeightKg: number | null
  } | null
  todayRollup: {
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    mealsLogged: number
    caloriesBurned: number
    workoutsLogged: number
  } | null
  weekRollups: Rollup[]
  todayMeals: TodayMeal[]
  recentWorkouts: AgentWorkout[]
}


interface CoachSuggestion {
  name: string
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

// ── Macro Ring ─────────────────────────────────────────────────────────────────

function MacroRing({
  label, value, target, unit, color, icon: Icon,
}: {
  label: string
  value: number
  target: number | null
  unit: string
  color: string
  icon: React.ElementType
}) {
  const pct = target ? Math.min(1, value / target) : 0
  const r = 32
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="40" cy="40" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-3 h-3 mb-0.5" style={{ color }} />
          <span className="text-[11px] font-bold leading-none" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        {target && (
          <p className="text-[9px] text-muted-foreground/50">{target}{unit}</p>
        )}
      </div>
    </div>
  )
}

// ── Insight Card ───────────────────────────────────────────────────────────────

function InsightCard({
  type, label, detail,
}: { type: "win" | "warn"; label: string; detail: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
      type === "win"
        ? "bg-primary/5 border-primary/20"
        : "bg-muted border-border"
    }`}>
      {type === "win"
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
      }
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className={`text-[11px] mt-0.5 leading-snug ${
          type === "win" ? "text-primary" : "text-muted-foreground"
        }`}>{detail}</p>
      </div>
    </div>
  )
}

// ── Meal Card ──────────────────────────────────────────────────────────────────

function MealCard({ meal }: { meal: TodayMeal }) {
  const [open, setOpen] = useState(false)
  const time = meal.mealTime ? format(new Date(meal.mealTime), "h:mm a") : "just now"

  return (
    <div className="rounded-xl bg-muted border border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <p className="text-xs font-semibold text-foreground">
            {meal.items[0]?.name ?? "Meal"}
            {meal.items.length > 1 && ` + ${meal.items.length - 1} more`}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{time}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-foreground">{Math.round(meal.totalCalories)}</span>
            <span className="text-[10px] text-muted-foreground"> cal</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-primary">{Math.round(meal.totalProteinG)}</span>
            <span className="text-[10px] text-muted-foreground">g</span>
          </div>
          {open ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1 border-t border-border pt-2">
              {meal.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground truncate max-w-[60%]">{item.name}</span>
                  <span className="text-muted-foreground/70">
                    {item.calories ?? "–"} cal · {item.proteinG ?? "–"}g P
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CorrespondentPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [workouts, setWorkouts] = useState<AgentWorkout[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "sam"; text: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanSuggestions, setScanSuggestions] = useState<CoachSuggestion[]>([])
  const [scanDescription, setScanDescription] = useState("")
  const [agentError, setAgentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Poll agent dashboard
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/correspondent/dashboard?phone=${encodeURIComponent(DEMO_PHONE)}`)
      if (!res.ok) {
        const err = await res.json()
        setAgentError(err.error ?? "Agent unreachable")
        return
      }
      const json = await res.json()
      setData(json)
      setWorkouts(json.recentWorkouts ?? [])
      setAgentError(null)
    } catch {
      setAgentError("Cannot reach agent — is it running on port 3001?")
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    const id = setInterval(fetchDashboard, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchDashboard])

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // ── Computed insights ──────────────────────────────────────────────────────

  const insights = (() => {
    if (!data?.weekRollups?.length || !data?.goal) return { wins: [], warns: [] }
    const g = data.goal
    const rollups = data.weekRollups.filter(r => r.mealsLogged > 0)
    if (!rollups.length) return { wins: [], warns: [] }

    const avg = (key: keyof Rollup) =>
      rollups.reduce((s, r) => s + (r[key] as number), 0) / rollups.length

    const avgCal = avg("calories")
    const avgPro = avg("proteinG")
    const avgCarb = avg("carbsG")
    const avgFat = avg("fatG")
    const avgMeals = avg("mealsLogged")

    const wins: { label: string; detail: string }[] = []
    const warns: { label: string; detail: string }[] = []

    const check = (
      actual: number, target: number | null, label: string, unit: string
    ) => {
      if (!target) return
      const ratio = actual / target
      if (ratio >= 0.85 && ratio <= 1.2) {
        wins.push({ label: `${label} on track`, detail: `Averaging ${Math.round(actual)}${unit}/day vs ${target}${unit} target` })
      } else if (ratio < 0.7) {
        const gap = Math.round(target - actual)
        warns.push({ label: `${label} consistently low`, detail: `Averaging ${gap}${unit} short per day this week` })
      } else if (ratio > 1.25) {
        warns.push({ label: `${label} over target`, detail: `Averaging ${Math.round(actual - target)}${unit} over daily target` })
      }
    }

    check(avgCal, g.targetCalories, "Calories", " cal")
    check(avgPro, g.targetProteinG, "Protein", "g")
    check(avgCarb, g.targetCarbsG, "Carbs", "g")
    check(avgFat, g.targetFatG, "Fat", "g")

    if (avgMeals >= 2.5) {
      wins.push({ label: "Consistent logging", detail: `${avgMeals.toFixed(1)} meals logged per day on average` })
    } else if (avgMeals < 1.5) {
      warns.push({ label: "Low logging frequency", detail: "Less than 2 meals tracked per day — harder to hit targets" })
    }

    return { wins, warns }
  })()

  // ── Muscle map from workouts ───────────────────────────────────────────────

  const muscleHeat = (() => {
    const heat: Record<MuscleGroup, number> = {
      chest: 0, back: 0, quads: 0, hamstrings: 0, shoulders: 0,
      biceps: 0, triceps: 0, abs: 0, glutes: 0, calves: 0, forearms: 0,
    }
    const now = startOfDay(new Date())
    workouts.forEach(log => {
      const logDate = startOfDay(new Date(log.workoutDate))
      const diffDays = Math.floor((now.getTime() - logDate.getTime()) / 86400000)
      if (diffDays > 14) return
      const intensity = Math.max(0, 1 - diffDays / 14)
      // Use muscleGroups array from agent
      const muscles = (log.muscleGroups ?? []) as MuscleGroup[]
      muscles.forEach(m => {
        if (m in heat) heat[m] = Math.min(1, heat[m] + intensity * 0.8)
      })
      // Also parse exercise names if available
      log.exercises?.forEach(ex => {
        getMusclesFromExercise(ex.name).forEach(m => {
          heat[m] = Math.min(1, heat[m] + intensity * 0.5)
        })
      })
    })
    return heat
  })()

  // ── Chat send ──────────────────────────────────────────────────────────────

  const sendChat = async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatInput("")
    setChatMessages(m => [...m, { role: "user", text }])
    setChatLoading(true)
    try {
      const res = await fetch(`${AGENT_URL}/simulate/sms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: DEMO_PHONE, body: text }),
      })
      const json = (await res.json()) as { replyText?: string }
      setChatMessages(m => [...m, { role: "sam", text: json.replyText ?? "…" }])
    } catch {
      setChatMessages(m => [...m, { role: "sam", text: "couldn't reach agent" }])
    } finally {
      setChatLoading(false)
    }
  }

  // ── Photo scan ─────────────────────────────────────────────────────────────

  const handleScan = async (file: File) => {
    setScanLoading(true)
    setScanSuggestions([])
    setScanDescription("")
    try {
      const form = new FormData()
      form.append("image", file)
      form.append("context", "fridge or menu photo")
      form.append("caloriesLeft", String(
        data?.goal?.targetCalories && data?.todayRollup
          ? Math.max(0, data.goal.targetCalories - data.todayRollup.calories)
          : data?.goal?.targetCalories ?? ""
      ))
      form.append("proteinLeft", String(
        data?.goal?.targetProteinG && data?.todayRollup
          ? Math.max(0, data.goal.targetProteinG - data.todayRollup.proteinG)
          : data?.goal?.targetProteinG ?? ""
      ))
      form.append("goalType", data?.goal?.goalType?.toLowerCase() ?? "maintain")

      const res = await fetch("/api/coach", { method: "POST", body: form })
      const json = await res.json()
      setScanSuggestions(json.suggestions ?? [])
      setScanDescription(json.imageDescription ?? "")
    } catch {
      setScanDescription("Failed to analyze image.")
    } finally {
      setScanLoading(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith("image/")) handleScan(file)
  }

  const goalColors = {
    LOSE: { bg: "bg-muted", text: "text-foreground", border: "border-border", label: "Lose Fat" },
    MAINTAIN: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", label: "Maintain" },
    GAIN: { bg: "bg-muted", text: "text-foreground", border: "border-border", label: "Build Muscle" },
  }

  const gc = data?.goal ? goalColors[data.goal.goalType] : goalColors.MAINTAIN

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Field Coach</h1>
            <p className="text-sm text-muted-foreground">Real-time health companion for correspondents on the go</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${agentError ? "bg-destructive" : "bg-primary"} animate-pulse`} />
            <span className="text-xs text-muted-foreground">{agentError ? "Agent offline" : "Live"}</span>
          </div>
        </div>

        {agentError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {agentError}
          </div>
        )}

        {/* ── Zone 1: Profile strip ── */}
        {data && (
          <div className="rounded-2xl bg-card border border-border p-5">
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {data.profile?.firstName ?? "Correspondent"}
                  </p>
                  <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${gc.bg} ${gc.text} ${gc.border}`}>
                    <Target className="w-2.5 h-2.5" />
                    {gc.label}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {data.profile?.currentWeightKg && (
                  <div>
                    <span className="text-muted-foreground/60 uppercase text-[9px] tracking-wide block">Weight</span>
                    <span className="font-semibold text-foreground">
                      {Math.round(data.profile.currentWeightKg * 2.205)} lbs
                    </span>
                    {data.profile.startWeightKg && data.profile.currentWeightKg !== data.profile.startWeightKg && (
                      <span className={`ml-1 text-[10px] ${data.profile.currentWeightKg < data.profile.startWeightKg ? "text-primary" : "text-muted-foreground"}`}>
                        ({data.profile.currentWeightKg < data.profile.startWeightKg ? "−" : "+"}{Math.abs(Math.round((data.profile.currentWeightKg - data.profile.startWeightKg) * 2.205))} lbs)
                      </span>
                    )}
                  </div>
                )}
                {data.profile?.exerciseDaysPerWeek && (
                  <div>
                    <span className="text-muted-foreground/60 uppercase text-[9px] tracking-wide block">Active</span>
                    <span className="font-semibold text-foreground">{data.profile.exerciseDaysPerWeek}×/week</span>
                  </div>
                )}
                {data.goal?.targetCalories && (
                  <div>
                    <span className="text-muted-foreground/60 uppercase text-[9px] tracking-wide block">Cal Target</span>
                    <span className="font-semibold text-foreground">{data.goal.targetCalories}</span>
                  </div>
                )}
                {data.goal?.targetProteinG && (
                  <div>
                    <span className="text-muted-foreground/60 uppercase text-[9px] tracking-wide block">Protein Target</span>
                    <span className="font-semibold text-foreground">{data.goal.targetProteinG}g</span>
                  </div>
                )}
                {data.profile?.dietaryPreferences && (data.profile.dietaryPreferences as string[]).length > 0 && (
                  <div>
                    <span className="text-muted-foreground/60 uppercase text-[9px] tracking-wide block">Diet</span>
                    <span className="font-semibold text-foreground capitalize">
                      {(data.profile.dietaryPreferences as string[]).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Zone 2: Today's nutrition ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Macro rings */}
          <div className="rounded-2xl bg-card border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's Nutrition</h2>
              {data?.todayRollup && (
                <span className="ml-auto text-[10px] text-muted-foreground/60">
                  {data.todayRollup.mealsLogged} meal{data.todayRollup.mealsLogged !== 1 ? "s" : ""} logged
                </span>
              )}
            </div>
            <div className="flex items-center justify-around">
              <MacroRing
                label="Calories" value={data?.todayRollup?.calories ?? 0}
                target={data?.goal?.targetCalories ?? null}
                unit="" color="#f97316" icon={Flame}
              />
              <MacroRing
                label="Protein" value={data?.todayRollup?.proteinG ?? 0}
                target={data?.goal?.targetProteinG ?? null}
                unit="g" color="#3b82f6" icon={Beef}
              />
              <MacroRing
                label="Carbs" value={data?.todayRollup?.carbsG ?? 0}
                target={data?.goal?.targetCarbsG ?? null}
                unit="g" color="#a855f7" icon={Wheat}
              />
              <MacroRing
                label="Fat" value={data?.todayRollup?.fatG ?? 0}
                target={data?.goal?.targetFatG ?? null}
                unit="g" color="#eab308" icon={Droplets}
              />
            </div>
            {(data?.todayRollup?.caloriesBurned ?? 0) > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-orange-500/8 border border-orange-500/20 px-4 py-2">
                <TrendingDown className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs text-orange-400 font-semibold">
                  {data!.todayRollup!.caloriesBurned} cal burned today
                </span>
                {data?.goal?.targetCalories && (
                  <span className="text-[10px] text-muted-foreground/60">
                    · {Math.max(0, data.goal.targetCalories - (data.todayRollup?.calories ?? 0) + data.todayRollup!.caloriesBurned)} net remaining
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Meal feed */}
          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's Log</h2>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-48">
              {data?.todayMeals?.length ? (
                data.todayMeals.map(meal => <MealCard key={meal.id} meal={meal} />)
              ) : (
                <p className="text-xs text-muted-foreground/50 text-center py-8">
                  No meals logged yet — text Sam to get started
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Zone 3: Coaching insights + scanner ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Insights + chat */}
          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">This Week</h2>
            </div>

            <div className="space-y-2">
              {insights.wins.map((w, i) => (
                <InsightCard key={i} type="win" label={w.label} detail={w.detail} />
              ))}
              {insights.warns.map((w, i) => (
                <InsightCard key={i} type="warn" label={w.label} detail={w.detail} />
              ))}
              {!insights.wins.length && !insights.warns.length && (
                <p className="text-xs text-muted-foreground/50 text-center py-4">
                  Log a few more meals for weekly insights
                </p>
              )}
            </div>

            {/* Chat */}
            <div className="mt-auto space-y-2">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-foreground"
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/40 rounded-xl px-3 py-2">
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl bg-muted/30 border border-border/40 px-3 py-2 text-xs outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                  placeholder="Ask Sam anything or log a meal…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="rounded-xl bg-primary px-3 py-2 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Fridge scanner */}
          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fridge / Menu Scanner</h2>
            </div>

            <div
              className={`shrink-0 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/70"
              } p-6 flex flex-col items-center justify-center gap-3`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {scanLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground text-center">
                    Drop a fridge or menu photo<br />
                    <span className="text-muted-foreground/50">GPT-4 Vision suggests what to eat</span>
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleScan(file)
                }}
              />
            </div>

            {scanDescription && (
              <p className="text-[11px] text-muted-foreground italic">{scanDescription}</p>
            )}

            <div className="space-y-2 overflow-y-auto flex-1">
              {scanSuggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl bg-muted/20 border border-border/30 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{s.name}</p>
                    <div className="flex gap-2 shrink-0 text-[10px] text-muted-foreground">
                      <span className="text-primary font-bold">{s.calories} cal</span>
                      <span>{s.proteinG}g P</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{s.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

          {/* ── Zone 4: Muscle map + workouts ── */}
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center gap-2 mb-6">
            <Dumbbell className="w-4 h-4 text-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Training — Last 14 Days</h2>
            {workouts.length === 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground/50">Text Sam a workout to log it</span>
            )}
          </div>

          <div className="flex flex-col items-center">
            <MuscleMap heatMap={muscleHeat} className="max-w-sm" />
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-primary" /> Recently trained
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/20" /> Rested
              </div>
            </div>
          </div>

          {workouts.length > 0 && (
            <>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Sessions", value: workouts.length, icon: Dumbbell, color: "text-foreground" },
                  {
                    label: "Cal burned",
                    value: workouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0),
                    icon: TrendingUp,
                    color: "text-orange-500",
                  },
                  {
                    label: "This week",
                    value: workouts.filter(w => {
                      const d = new Date(w.workoutDate)
                      const weekAgo = new Date(Date.now() - 7 * 86400000)
                      return d >= weekAgo
                    }).length,
                    icon: Activity,
                    color: "text-primary",
                  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl bg-muted/20 border border-border/30 px-4 py-3 text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <p className="text-lg font-bold">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {workouts.slice(0, 4).map(w => (
                  <div key={w.id} className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/30 px-4 py-2.5">
                    <div>
                      <p className="text-xs font-semibold">{w.workoutLabel}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(w.workoutDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {w.durationMin ? ` · ${w.durationMin} min` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      {w.caloriesBurned ? (
                        <p className="text-xs font-bold text-orange-500">−{w.caloriesBurned} cal</p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground/60">
                        {(w.muscleGroups ?? []).slice(0, 2).join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
