"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO, differenceInDays } from "date-fns"
import { PenLine, BookOpen, ChevronRight, Search, Flame, CalendarDays, BarChart2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { DiaryCalendar } from "@/components/diary/DiaryCalendar"
import { Input } from "@/components/ui/input"

interface EntryMeta {
    date: string
    rating: string | null
    excerpt: string
}

function RatingBadge({ rating }: { rating: string | null }) {
    if (!rating) return null
    const config = {
        GOOD: { label: "Good", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/30" },
        MID:  { label: "Mid",  cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-400/30" },
        BAD:  { label: "Bad",  cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-400/30" },
    }
    const c = config[rating as keyof typeof config]
    if (!c) return null
    return (
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", c.cls)}>
            {c.label}
        </span>
    )
}

function calcStreak(entries: EntryMeta[]): number {
    if (!entries.length) return 0
    const sorted = [...entries].map(e => e.date).sort().reverse()
    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
    // streak must start from today or yesterday
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0
    let streak = 0
    let cursor = sorted[0]
    for (const date of sorted) {
        const diff = differenceInDays(parseISO(cursor), parseISO(date))
        if (diff <= 1) {
            streak++
            cursor = date
        } else break
    }
    return streak
}

export default function DiaryPage() {
    const router = useRouter()
    const [entries, setEntries] = useState<EntryMeta[]>([])
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [ratingFilter, setRatingFilter] = useState<"ALL" | "GOOD" | "MID" | "BAD">("ALL")

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const res = await fetch("/api/diary")
                if (res.ok) {
                    const data: EntryMeta[] = await res.json()
                    data.sort((a, b) => b.date.localeCompare(a.date))
                    setEntries(data)
                }
            } finally {
                setLoading(false)
            }
        }
        fetch_()
    }, [])

    const handleSelectDate = (date: Date, dateStr: string) => {
        setSelectedDate(date)
        router.push(`/diary/${dateStr}`)
    }

    const handleWriteToday = () => {
        router.push(`/diary/${format(new Date(), "yyyy-MM-dd")}`)
    }

    // Stats
    const streak = calcStreak(entries)
    const thisMonth = format(new Date(), 'yyyy-MM')
    const thisMonthCount = entries.filter(e => e.date.startsWith(thisMonth)).length
    const thisYear = format(new Date(), 'yyyy')
    const thisYearCount = entries.filter(e => e.date.startsWith(thisYear)).length

    // Rating breakdown for stats
    const goodCount = entries.filter(e => e.rating === "GOOD").length
    const midCount  = entries.filter(e => e.rating === "MID").length
    const badCount  = entries.filter(e => e.rating === "BAD").length

    // Filtered entries for search + rating
    const filtered = entries.filter(e => {
        const matchesSearch = !search.trim() ||
            e.excerpt?.toLowerCase().includes(search.toLowerCase()) ||
            format(parseISO(e.date), 'EEEE MMMM d yyyy').toLowerCase().includes(search.toLowerCase())
        const matchesRating = ratingFilter === "ALL" || e.rating === ratingFilter
        return matchesSearch && matchesRating
    })

    return (
        <div className="relative min-h-full py-6">
            <div className="fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute inset-0 opacity-40" style={{
                    background: `
                        radial-gradient(ellipse 70% 50% at 10% 20%, hsla(25,80%,60%,0.15) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 40% at 90% 70%, hsla(170,70%,45%,0.12) 0%, transparent 55%)
                    `,
                }} />
            </div>

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                            <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
                            <p className="text-sm text-muted-foreground">
                                {entries.length} {entries.length === 1 ? "entry" : "entries"} recorded
                            </p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleWriteToday}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
                    >
                        <PenLine className="h-4 w-4" />
                        Write Today
                    </motion.button>
                </div>

                {/* Stats bar */}
                {!loading && entries.length > 0 && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-card/50 border border-border/30 backdrop-blur-md p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                    <Flame className="h-4 w-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{streak}</p>
                                    <p className="text-xs text-muted-foreground">Day streak</p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-card/50 border border-border/30 backdrop-blur-md p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{thisMonthCount}</p>
                                    <p className="text-xs text-muted-foreground">This month</p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-card/50 border border-border/30 backdrop-blur-md p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-accent/10">
                                    <BarChart2 className="h-4 w-4 text-accent" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{thisYearCount}</p>
                                    <p className="text-xs text-muted-foreground">This year</p>
                                </div>
                            </div>
                        </div>

                        {/* Mood breakdown */}
                        {(goodCount + midCount + badCount) > 0 && (
                            <div className="flex gap-2 flex-wrap">
                                {(["ALL", "GOOD", "MID", "BAD"] as const).map(r => {
                                    const count = r === "ALL" ? entries.length : r === "GOOD" ? goodCount : r === "MID" ? midCount : badCount
                                    const label = r === "ALL" ? "All" : r === "GOOD" ? "Good" : r === "MID" ? "Mid" : "Bad"
                                    const colors = {
                                        ALL:  ratingFilter === "ALL"  ? "bg-foreground text-background" : "bg-card/50 text-muted-foreground hover:bg-card/80",
                                        GOOD: ratingFilter === "GOOD" ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
                                        MID:  ratingFilter === "MID"  ? "bg-amber-500 text-white"   : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
                                        BAD:  ratingFilter === "BAD"  ? "bg-rose-500 text-white"    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20",
                                    }
                                    return (
                                        <button
                                            key={r}
                                            onClick={() => setRatingFilter(r)}
                                            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border/30 transition-all duration-150", colors[r])}
                                        >
                                            {label}
                                            <span className="opacity-70">{count}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Main two-column layout */}
                <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 items-start">

                    {/* Left: Calendar (sticky on desktop, below entries on mobile) */}
                    <div className="order-2 md:order-1 md:sticky md:top-6">
                        <DiaryCalendar
                            entries={entries}
                            selectedDate={selectedDate}
                            onSelectDate={handleSelectDate}
                        />
                    </div>

                    {/* Right: Search + entry stream (first on mobile) */}
                    <div className="order-1 md:order-2 space-y-3">
                        {/* Search */}
                        {!loading && entries.length > 2 && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search entries..."
                                    inputMode="search"
                                    className="pl-9 h-9 bg-card/50 border-border/30 text-sm"
                                />
                            </div>
                        )}

                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-24 rounded-2xl bg-card/50 border border-border/30 animate-pulse" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                        <PenLine className="h-7 w-7 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-1">No entries yet</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">Start writing to build your personal record of days.</p>
                                    <button onClick={handleWriteToday} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                                        Write your first entry
                                    </button>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground py-8 text-center">No entries match "{search}"</div>
                            )
                        ) : (
                            <AnimatePresence>
                                {filtered.map((entry, i) => {
                                    const date = parseISO(entry.date)
                                    return (
                                        <motion.button
                                            key={entry.date}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(i * 0.04, 0.3) }}
                                            onClick={() => handleSelectDate(date, entry.date)}
                                            className="w-full text-left group"
                                        >
                                            <div className={cn(
                                                "rounded-2xl border border-border/30 bg-card/50 backdrop-blur-md p-4",
                                                "hover:bg-card/70 hover:border-border/60 hover:shadow-lg",
                                                "transition-all duration-200",
                                                selectedDate && format(selectedDate, "yyyy-MM-dd") === entry.date ? "border-primary/40 bg-primary/5" : ""
                                            )}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-sm font-semibold text-foreground">{format(date, "EEEE, MMM d")}</span>
                                                        <span className="text-xs text-muted-foreground">{format(date, "yyyy")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RatingBadge rating={entry.rating} />
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-150" />
                                                    </div>
                                                </div>
                                                {entry.excerpt ? (
                                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                                        {entry.excerpt}{entry.excerpt.length >= 140 ? "…" : ""}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground/50 italic">No content</p>
                                                )}
                                            </div>
                                        </motion.button>
                                    )
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
