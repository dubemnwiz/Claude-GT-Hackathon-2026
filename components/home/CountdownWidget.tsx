"use client"

import { useState, useEffect } from "react"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { Timer, Plus, X, CalendarCheck2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface Countdown {
    id: string
    title: string
    date: string
}

function daysUntil(dateStr: string) {
    return differenceInCalendarDays(parseISO(dateStr.split("T")[0]), new Date())
}

export function CountdownWidget() {
    const [countdowns, setCountdowns] = useState<Countdown[]>([])
    const [adding, setAdding] = useState(false)
    const [title, setTitle] = useState("")
    const [date, setDate] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetch("/api/countdowns")
            .then(r => r.json())
            .then(data => setCountdowns(data))
            .catch(() => {})
    }, [])

    const handleAdd = async () => {
        if (!title.trim() || !date) return
        setSaving(true)
        try {
            const res = await fetch("/api/countdowns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: title.trim(), date }),
            })
            const created = await res.json()
            setCountdowns(prev => [...prev, created].sort(
                (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
            ))
            setTitle("")
            setDate("")
            setAdding(false)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        setCountdowns(prev => prev.filter(c => c.id !== id))
        await fetch(`/api/countdowns?id=${id}`, { method: "DELETE" })
    }

    const upcoming = countdowns.filter(c => daysUntil(c.date) >= 0)
    const past     = countdowns.filter(c => daysUntil(c.date) < 0)

    return (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Timer className="h-4 w-4 text-primary" />
                    Countdowns
                </div>
                <button
                    onClick={() => setAdding(v => !v)}
                    className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            <AnimatePresence>
                {adding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col gap-2 pt-1">
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Event name…"
                                className="w-full text-sm px-3 py-2 rounded-xl bg-muted border border-border outline-none focus:border-primary placeholder:text-muted-foreground"
                            />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full text-sm px-3 py-2 rounded-xl bg-muted border border-border outline-none focus:border-primary text-foreground"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAdd}
                                    disabled={saving || !title.trim() || !date}
                                    className="flex-1 text-xs font-semibold py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
                                >
                                    {saving ? "Saving…" : "Add"}
                                </button>
                                <button
                                    onClick={() => { setAdding(false); setTitle(""); setDate("") }}
                                    className="px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {countdowns.length === 0 && !adding ? (
                <p className="text-xs text-muted-foreground italic">No countdowns yet. Add one above.</p>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {upcoming.map(c => {
                            const days = daysUntil(c.date)
                            return (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 8 }}
                                    className="flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={cn(
                                            "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                                            days === 0 ? "bg-primary text-primary-foreground" :
                                            days <= 7  ? "bg-muted text-foreground" :
                                            days <= 30 ? "bg-muted text-foreground" :
                                                         "bg-muted text-foreground"
                                        )}>
                                            {days === 0 ? "🎉" : days}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{c.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {days === 0 ? "Today!" : `${days} day${days === 1 ? "" : "s"} · ${format(parseISO(c.date.split("T")[0]), "MMM d, yyyy")}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-destructive transition-all"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>

                    {past.length > 0 && (
                        <details className="group">
                            <summary className="text-xs text-muted-foreground cursor-pointer select-none list-none flex items-center gap-1 pt-1">
                                <CalendarCheck2 className="h-3 w-3" />
                                {past.length} past event{past.length > 1 ? "s" : ""}
                            </summary>
                            <div className="mt-1.5 space-y-1.5">
                                {past.map(c => (
                                    <div key={c.id} className="flex items-center justify-between group/past opacity-50">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="shrink-0 w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center text-xs text-muted-foreground">
                                                ✓
                                            </div>
                                            <p className="text-xs truncate line-through text-muted-foreground">{c.title}</p>
                                        </div>
                                        <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover/past:opacity-100 p-1 rounded hover:text-destructive transition-all">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            )}
        </div>
    )
}
