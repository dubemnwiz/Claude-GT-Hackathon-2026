"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { WeightTracker } from "@/components/fitness/WeightTracker"
import { WorkoutTracker } from "@/components/fitness/WorkoutTracker"
import { Card, CardContent } from "@/components/ui/card"
import { Scale, Dumbbell, Trophy, CalendarCheck, Sparkles, X, ChevronRight } from "lucide-react"
import { format, startOfWeek } from "date-fns"
import { FitnessAnalytics } from "@/components/fitness/FitnessAnalytics"
import { PRBoard } from "@/components/fitness/PRBoard"
import { AnimatePresence, motion } from "framer-motion"

interface WeightLog {
    id: string
    weight: number
    date: string
    fullDate: string
}

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

const TABS = ["Weight", "Workouts", "PRs"] as const
type Tab = (typeof TABS)[number]

function FitnessPageInner() {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get("tab") as Tab | null
    const initialTab: Tab = tabParam && (TABS as readonly string[]).includes(tabParam) ? tabParam : "Weight"
    const [activeTab, setActiveTab] = useState<Tab>(initialTab)
    const [weightData, setWeightData] = useState<WeightLog[]>([])
    const [workoutData, setWorkoutData] = useState<WorkoutLog[]>([])
    const [showAnalytics, setShowAnalytics] = useState(false)

    const latestWeight = weightData.length ? weightData[weightData.length - 1].weight : null
    const prevWeight = weightData.length > 1 ? weightData[weightData.length - 2].weight : null
    const weightDelta = latestWeight != null && prevWeight != null ? latestWeight - prevWeight : null

    const totalWorkouts = workoutData.length
    const totalPRs = workoutData.filter(l => l.isPR).length

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const loggedDates = workoutData.map(l => format(new Date(l.date), 'yyyy-MM-dd'))
    const thisWeekWorkouts = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        return format(d, 'yyyy-MM-dd')
    }).filter(d => loggedDates.includes(d)).length

    const stats = [
        {
            icon: Scale,
            label: "Current Weight",
            value: latestWeight ? `${latestWeight} lbs` : "—",
            sub: weightDelta != null
                ? weightDelta < 0 ? `↓ ${Math.abs(weightDelta).toFixed(1)} from last` : weightDelta > 0 ? `↑ ${weightDelta.toFixed(1)} from last` : "No change"
                : "No data yet",
            subColor: weightDelta != null ? (weightDelta < 0 ? "text-emerald-500" : weightDelta > 0 ? "text-rose-500" : "text-muted-foreground") : "text-muted-foreground",
        },
        {
            icon: Trophy,
            label: "PRs Logged",
            value: totalPRs > 0 ? `${totalPRs}` : "—",
            sub: "All time",
            subColor: totalPRs > 0 ? "text-amber-500" : "text-muted-foreground",
        },
        {
            icon: Dumbbell,
            label: "Total Workouts",
            value: totalWorkouts > 0 ? `${totalWorkouts}` : "—",
            sub: "All time",
            subColor: "text-muted-foreground",
        },
        {
            icon: CalendarCheck,
            label: "This Week",
            value: `${thisWeekWorkouts} / 7`,
            sub: "Days active",
            subColor: "text-muted-foreground",
        },
    ]

    return (
        <div className="space-y-5 md:space-y-8 relative pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Fitness Tracker</h1>
                    <p className="text-muted-foreground">Track your weight and workouts over time.</p>
                </div>
                <button
                    onClick={() => setShowAnalytics(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:brightness-110 transition-all font-semibold text-sm"
                >
                    <Sparkles className="h-4 w-4" />
                    <span>Insights</span>
                </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map(({ icon: Icon, label, value, sub, subColor }) => (
                    <Card key={label} className="glass-card">
                        <CardContent className="pt-5 pb-4 px-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                    <Icon className="h-3.5 w-3.5 text-primary" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold tracking-tight">{value}</p>
                            <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div>
                <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit mb-6">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                ${activeTab === tab
                                    ? "bg-card shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <Card className="glass-card">
                    <CardContent className="pt-6">
                        {activeTab === "Weight" && (
                            <WeightTracker onDataChange={setWeightData} />
                        )}
                        {activeTab === "Workouts" && (
                            <WorkoutTracker onDataChange={setWorkoutData} />
                        )}
                        {activeTab === "PRs" && (
                            <PRBoard logs={workoutData} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Analytics Drawer Overlay */}
            <AnimatePresence>
                {showAnalytics && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAnalytics(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-background border-l border-border/40 shadow-2xl z-[70] overflow-y-auto"
                        >
                            <div className="p-6 sticky top-0 bg-background/80 backdrop-blur-md z-10 flex items-center justify-between border-b border-border/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Fitness Insights</h2>
                                        <p className="text-xs text-muted-foreground">Detailed analytics & muscle map</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAnalytics(false)}
                                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="px-6 pb-safe">
                                <FitnessAnalytics logs={workoutData} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function FitnessPage() {
    return (
        <Suspense fallback={null}>
            <FitnessPageInner />
        </Suspense>
    )
}
