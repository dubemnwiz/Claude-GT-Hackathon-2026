"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format } from "date-fns"
import { TrendingUp, TrendingDown, Minus, X, Target } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface WeightLog {
    id: string
    weight: number
    date: string
    fullDate: string
}

interface WeightTrackerProps {
    onDataChange?: (logs: WeightLog[]) => void
}

export function WeightTracker({ onDataChange }: WeightTrackerProps) {
    const [weight, setWeight] = useState("")
    const [data, setData] = useState<WeightLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [goalWeight, setGoalWeight] = useState<number | null>(null)
    const [goalInput, setGoalInput] = useState("")
    const [showGoalInput, setShowGoalInput] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem("weightGoal")
        if (saved) {
            const parsed = parseFloat(saved)
            if (!isNaN(parsed)) {
                setGoalWeight(parsed)
                setGoalInput(parsed.toString())
            }
        }
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch("/api/fitness/weight")
            if (res.ok) {
                const logs = await res.json()
                const chartData = logs.map((log: any) => ({
                    id: log.id,
                    date: format(new Date(log.date), 'MM/dd'),
                    weight: log.weight,
                    fullDate: log.date,
                })).reverse()
                setData(chartData)
                onDataChange?.(chartData)
            } else {
                if (res.status === 401) setError("Please login to save data")
            }
        } catch {
            setError("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!weight) return
        setError("")
        try {
            const res = await fetch("/api/fitness/weight", {
                method: "POST",
                body: JSON.stringify({ weight: parseFloat(weight), date: new Date() }),
                headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) {
                setError(res.status === 401 ? "Please login to save data" : "Failed to save")
                return
            }
            setWeight("")
            fetchData()
        } catch {
            setError("Failed to save")
        }
    }

    const deleteLog = async (id: string) => {
        try {
            const res = await fetch(`/api/fitness/weight?id=${id}`, { method: "DELETE" })
            if (res.ok) fetchData()
            else setError("Failed to delete")
        } catch {
            setError("Failed to delete")
        }
    }

    const saveGoal = () => {
        const val = parseFloat(goalInput)
        if (!isNaN(val) && val > 0) {
            setGoalWeight(val)
            localStorage.setItem("weightGoal", val.toString())
        } else {
            setGoalWeight(null)
            localStorage.removeItem("weightGoal")
        }
        setShowGoalInput(false)
    }

    const clearGoal = () => {
        setGoalWeight(null)
        setGoalInput("")
        localStorage.removeItem("weightGoal")
        setShowGoalInput(false)
    }

    // Stats
    const weights = data.map(d => d.weight)
    const latest = weights[weights.length - 1]
    const prev = weights[weights.length - 2]
    const trend = latest != null && prev != null ? latest - prev : null
    const high = weights.length ? Math.max(...weights) : null
    const low = weights.length ? Math.min(...weights) : null
    const avg = weights.length ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : null

    const goalProgress = goalWeight && latest
        ? Math.max(0, Math.min(100, ((data[0]?.weight - latest) / (data[0]?.weight - goalWeight)) * 100))
        : null

    return (
        <div className="space-y-6">
            {/* Stats row */}
            {!isLoading && data.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: "Current", value: latest ? `${latest} lbs` : "—" },
                        { label: "High",    value: high ? `${high} lbs` : "—" },
                        { label: "Low",     value: low ? `${low} lbs` : "—" },
                        { label: "Avg",     value: avg ? `${avg} lbs` : "—" },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-muted/40 rounded-xl p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className="text-sm font-semibold">{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Trend + goal row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                {trend !== null && (
                    <div className="flex items-center gap-2 text-sm">
                        {trend < 0 ? (
                            <span className="flex items-center gap-1 text-emerald-500"><TrendingDown className="h-4 w-4" />{Math.abs(trend).toFixed(1)} lbs since last log</span>
                        ) : trend > 0 ? (
                            <span className="flex items-center gap-1 text-rose-500"><TrendingUp className="h-4 w-4" />+{trend.toFixed(1)} lbs since last log</span>
                        ) : (
                            <span className="flex items-center gap-1 text-muted-foreground"><Minus className="h-4 w-4" />No change since last log</span>
                        )}
                    </div>
                )}

                {/* Goal badge / setter */}
                <div className="flex items-center gap-2">
                    {goalWeight && !showGoalInput && (
                        <button
                            onClick={() => setShowGoalInput(true)}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent ring-1 ring-accent/30 hover:bg-accent/20 transition-colors"
                        >
                            <Target className="h-3 w-3" />
                            Goal: {goalWeight} lbs
                            {goalProgress !== null && ` · ${Math.round(goalProgress)}%`}
                        </button>
                    )}
                    {!goalWeight && !showGoalInput && (
                        <button
                            onClick={() => setShowGoalInput(true)}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 ring-border/40 text-muted-foreground hover:text-foreground bg-muted/20 transition-colors"
                        >
                            <Target className="h-3 w-3" />
                            Set goal weight
                        </button>
                    )}
                    <AnimatePresence>
                        {showGoalInput && (
                            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
                                className="flex items-center gap-1.5">
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={goalInput}
                                    onChange={e => setGoalInput(e.target.value)}
                                    placeholder="Target lbs"
                                    className="h-7 w-28 text-xs"
                                    autoFocus
                                    onKeyDown={e => e.key === "Enter" && saveGoal()}
                                />
                                <Button size="sm" className="h-7 px-3 text-xs" onClick={saveGoal}>Set</Button>
                                {goalWeight && <button onClick={clearGoal} className="text-xs text-muted-foreground hover:text-destructive">Clear</button>}
                                <button onClick={() => setShowGoalInput(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[240px] w-full">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '10px',
                                    border: '1px solid hsl(var(--border))',
                                    fontSize: '13px',
                                    color: 'hsl(var(--card-foreground))'
                                }}
                                itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                                formatter={(val: any) => [`${val} lbs`, 'Weight']}
                            />
                            {goalWeight && (
                                <ReferenceLine
                                    y={goalWeight}
                                    stroke="hsl(var(--accent))"
                                    strokeDasharray="5 4"
                                    strokeWidth={1.5}
                                    label={{ value: `Goal ${goalWeight}`, fill: 'hsl(var(--accent))', fontSize: 10, position: 'insideTopRight' }}
                                />
                            )}
                            <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#weightGradient)"
                                dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                                activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <p className="text-sm">No weight logs yet</p>
                        <p className="text-xs">Add your first entry below</p>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                <div className="flex-1">
                    <label htmlFor="weight" className="text-xs text-muted-foreground mb-1.5 block">Log weight (lbs)</label>
                    <Input id="weight" type="number" step="0.1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 175.5" className="h-9" />
                </div>
                <Button type="submit" size="sm" className="h-9 px-5">Add</Button>
            </form>
            {error && <p className="text-xs text-destructive">{error}</p>}

            {/* Log list */}
            {data.length > 0 && (
                <div className="space-y-1.5 max-h-[180px] scroll-contained pr-1">
                    <AnimatePresence>
                        {data.slice().reverse().map((log) => (
                            <motion.div key={log.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-sm">{log.weight} lbs</span>
                                    <span className="text-xs text-muted-foreground">{format(new Date(log.fullDate), 'MMM dd, yyyy')}</span>
                                </div>
                                <button onClick={() => deleteLog(log.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
